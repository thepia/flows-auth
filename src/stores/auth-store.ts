/**
 * Auth Store
 * Svelte store for managing authentication state
 */

import { writable, derived, get } from 'svelte/store';

// Check if running in browser
const browser = typeof window !== 'undefined';
import { AuthApiClient } from '../api/auth-api';
import { authenticateWithPasskey, serializeCredential, isWebAuthnSupported, isConditionalMediationSupported } from '../utils/webauthn';
import { initializeErrorReporter, reportAuthState, reportWebAuthnError, reportApiError, updateErrorReporterConfig } from '../utils/errorReporter';
import {
  saveSession,
  clearSession,
  getSession,
  isSessionValid,
  generateInitials,
  configureSessionStorage,
  getOptimalSessionConfig,
  type FlowsSessionData
} from '../utils/sessionManager';
import type {
  AuthConfig,
  AuthStore,
  CompleteAuthStore,
  AuthError,
  SignInResponse,
  RegistrationResponse,
  AuthMethod,
  AuthEventType,
  AuthEventData,
  AuthMachineState,
  AuthMachineContext,
  ApplicationContext,
  StorageConfigurationUpdate,
  SessionMigrationResult,
  StorageType,
  User,
  InvitationTokenData,
  SignInState,
  SignInEvent
} from '../types';

// Legacy localStorage migration (remove old localStorage entries if they exist)
const LEGACY_STORAGE_KEYS = {
  ACCESS_TOKEN: 'auth_access_token',
  REFRESH_TOKEN: 'auth_refresh_token',
  EXPIRES_AT: 'auth_expires_at',
  USER: 'auth_user'
} as const;

// Create auth store with state machine integration
function createAuthStore(config: AuthConfig): CompleteAuthStore {
  // Initialize error reporting if configured
  if (browser && config.errorReporting) {
    initializeErrorReporter(config.errorReporting);
  }

  // Configure session storage based on config or optimal defaults
  if (browser) {
    const storageConfig = config.storage || getOptimalSessionConfig();
    configureSessionStorage(storageConfig);
  }

  // Helper function to get effective app code
  const getEffectiveAppCode = (): string | undefined => {
    // If appCode is explicitly set to false/null/undefined, use legacy endpoints
    if (config.appCode === false || config.appCode === null || config.appCode === undefined) {
      return undefined;
    }
    
    // If appCode is explicitly set to a string, use that
    if (typeof config.appCode === 'string') {
      return config.appCode;
    }
    
    // If appCode is set to true, use default 'app' appCode
    if (config.appCode === true) {
      return 'app';
    }
    
    // Default to undefined for backward compatibility
    return undefined;
  };

  // Initialize API client
  const api = new AuthApiClient(config);

  // Clean up any legacy localStorage data and migrate to sessionStorage if needed
  if (browser) {
    cleanupLegacyLocalStorage();
  }

  // Initialize with session data (proper sessionStorage approach)
  const existingSession = browser ? getSession() : null;
  const isValidSession = existingSession && isSessionValid(existingSession);

  // Convert session user to AuthStore User format
  const convertSessionUserToAuthUser = (sessionUser: FlowsSessionData['user']) => ({
    id: sessionUser.id,
    email: sessionUser.email,
    name: sessionUser.name,
    picture: sessionUser.avatar,
    emailVerified: true, // Assume verified if they have a session
    createdAt: new Date().toISOString(), // Fallback value
    metadata: sessionUser.preferences
  });

  const initialState: AuthStore = {
    state: isValidSession ? 'authenticated' : 'unauthenticated',
    signInState: 'emailEntry', // Start with email entry for sign-in flow
    user: isValidSession ? convertSessionUserToAuthUser(existingSession.user) : null,
    accessToken: isValidSession ? existingSession.tokens.accessToken : null,
    refreshToken: isValidSession ? existingSession.tokens.refreshToken : null,
    expiresAt: isValidSession ? existingSession.tokens.expiresAt : null,
    error: null
  };

  const store = writable<AuthStore>(initialState);
  
  // Note: Removed state machine store - now using direct signInState management

  // Event handlers
  const eventHandlers = new Map<AuthEventType, ((data: AuthEventData) => void)[]>();

  /**
   * Emit auth event
   */
  function emit(type: AuthEventType, data: AuthEventData = {}) {
    const handlers = eventHandlers.get(type) || [];
    handlers.forEach(handler => handler(data));
  }

  /**
   * Subscribe to auth events
   */
  function on(type: AuthEventType, handler: (data: AuthEventData) => void) {
    if (!eventHandlers.has(type)) {
      eventHandlers.set(type, []);
    }
    eventHandlers.get(type)!.push(handler);

    // Return unsubscribe function
    return () => {
      const handlers = eventHandlers.get(type);
      if (handlers) {
        const index = handlers.indexOf(handler);
        if (index > -1) {
          handlers.splice(index, 1);
        }
      }
    };
  }

  /**
   * Update store state
   */
  function updateState(updates: Partial<AuthStore>) {
    store.update(state => ({ ...state, ...updates }));
  }

  /**
   * Process SignInEvent and transition signInState
   */
  function processSignInTransition(currentState: SignInState, event: SignInEvent): SignInState {
    switch (currentState) {
      case 'emailEntry':
        if (event.type === 'EMAIL_SUBMITTED') return 'userChecked';
        if (event.type === 'PIN_VERIFIED') return 'signedIn'; // Direct PIN verification from email entry (app-based flow) (this is transitional to help buggy SignInCore)
        break;
      
      case 'userChecked':
        if (event.type === 'USER_EXISTS' && event.hasPasskey) return 'passkeyPrompt';
        if (event.type === 'USER_EXISTS' && !event.hasPasskey) return 'userChecked'; // Stay in userChecked until PIN sent
        if (event.type === 'USER_NOT_FOUND') return 'userChecked'; // Stay in userChecked until PIN sent  
        if (event.type === 'SENT_PIN_EMAIL') return 'pinEntry'; // Transition to PIN entry after email sent
        break;
        
      case 'passkeyPrompt':
        if (event.type === 'PASSKEY_SUCCESS') return 'signedIn';
        if (event.type === 'PASSKEY_FAILED') return 'generalError';
        break;
        
      case 'pinEntry':
        if (event.type === 'PIN_VERIFIED') return 'signedIn';
        if (event.type === 'EMAIL_VERIFICATION_REQUIRED') return 'emailVerification';
        break;
        
      case 'emailVerification':
        if (event.type === 'EMAIL_VERIFIED') return 'signedIn';
        break;
        
      case 'signedIn':
        if (event.type === 'REGISTER_PASSKEY') return 'passkeyRegistration';
        if (event.type === 'RESET') return 'emailEntry';
        break;
        
      case 'passkeyRegistration':
        if (event.type === 'PASSKEY_REGISTERED') return 'signedIn';
        if (event.type === 'RESET') return 'emailEntry';
        break;
        
      case 'generalError':
        if (event.type === 'RESET') return 'emailEntry';
        break;
    }
    return currentState; // No transition found, stay in current state
  }

  /**
   * Send SignInEvent and update signInState accordingly
   */
  function sendSignInEvent(event: SignInEvent) {
    store.update(s => {
      const newSignInState = processSignInTransition(s.signInState, event);
      console.log(`SignIn transition: ${s.signInState} -> ${newSignInState} (${event.type})`);
      return { ...s, signInState: newSignInState };
    });
  }

  /**
   * Update signInState directly
   */
  function updateSignInState(newSignInState: SignInState) {
    store.update(s => ({ ...s, signInState: newSignInState }));
  }

  /**
   * Save authentication session to sessionStorage
   */
  function saveAuthSession(response: SignInResponse, authMethod: 'passkey' | 'password' | 'email-code' = 'passkey') {
    if (!browser || !response.user || !response.accessToken) return;

    const sessionData: FlowsSessionData = {
      user: {
        id: response.user.id,
        email: response.user.email,
        name: response.user.name || response.user.email,
        initials: generateInitials(response.user.name || response.user.email),
        avatar: (response.user as any).avatar || (response.user as any).picture,
        preferences: (response.user as any).preferences || (response.user as any).metadata
      },
      tokens: {
        accessToken: response.accessToken,
        refreshToken: response.refreshToken || '',
        expiresAt: response.expiresIn ? Date.now() + (response.expiresIn * 1000) : Date.now() + (24 * 60 * 60 * 1000)
      },
      authMethod,
      lastActivity: Date.now()
    };

    saveSession(sessionData);
  }

  /**
   * Clear authentication session
   */
  function clearAuthSession() {
    if (!browser) return;
    clearSession();
  }

  /**
   * Clean up legacy localStorage entries (migration helper)
   */
  function cleanupLegacyLocalStorage() {
    if (!browser) return;

    try {
      // Check if we have legacy localStorage data but no sessionStorage data
      const hasLegacyData = localStorage.getItem(LEGACY_STORAGE_KEYS.ACCESS_TOKEN);
      const hasSessionData = getSession();

      if (hasLegacyData && !hasSessionData) {
        console.log('📦 Migrating legacy localStorage auth data to sessionStorage');

        // Migrate legacy data to sessionStorage format
        try {
          const legacyToken = localStorage.getItem(LEGACY_STORAGE_KEYS.ACCESS_TOKEN);
          const legacyUser = localStorage.getItem(LEGACY_STORAGE_KEYS.USER);
          const legacyRefreshToken = localStorage.getItem(LEGACY_STORAGE_KEYS.REFRESH_TOKEN);
          const legacyExpiresAt = localStorage.getItem(LEGACY_STORAGE_KEYS.EXPIRES_AT);

          if (legacyToken && legacyUser) {
            const user = JSON.parse(legacyUser);
            const sessionData: FlowsSessionData = {
              user: {
                id: user.id,
                email: user.email,
                name: user.name || user.email,
                initials: generateInitials(user.name || user.email),
                avatar: user.picture || user.avatar,
                preferences: user.metadata || user.preferences
              },
              tokens: {
                accessToken: legacyToken,
                refreshToken: legacyRefreshToken || '',
                expiresAt: legacyExpiresAt ? parseInt(legacyExpiresAt) : Date.now() + (24 * 60 * 60 * 1000)
              },
              authMethod: 'passkey', // Default assumption
              lastActivity: Date.now()
            };

            saveSession(sessionData);
            console.log('✅ Successfully migrated legacy auth data to sessionStorage');
          }
        } catch (migrationError) {
          console.warn('Failed to migrate legacy data:', migrationError);
        }
      }

      // Always clean up legacy localStorage entries
      Object.values(LEGACY_STORAGE_KEYS).forEach(key => {
        localStorage.removeItem(key);
      });

      console.log('🧹 Cleaned up legacy localStorage auth data');
    } catch (error: unknown) {
      console.warn('Failed to clean up legacy localStorage:', error);
    }
  }

  /**
   * Check if current session is expired
   */
  function isTokenExpired(): boolean {
    const session = getSession();
    return !isSessionValid(session);
  }

  /**
   * Auto-refresh token before expiry
   */
  function scheduleTokenRefresh() {
    const currentState = get(store);
    if (!currentState.expiresAt || !currentState.refreshToken) return;

    const timeUntilExpiry = currentState.expiresAt - Date.now();
    const refreshTime = Math.max(timeUntilExpiry - (5 * 60 * 1000), 1000); // 5 minutes before expiry

    setTimeout(async () => {
      try {
        await refreshTokens();
      } catch (error: unknown) {
        console.warn('Auto token refresh failed:', error);
      }
    }, refreshTime);
  }
  /**
   * Sign in with passkey
   */
  async function signInWithPasskey(email: string, conditional = false): Promise<SignInResponse> {
    const startTime = Date.now();
    
    console.log('🔍 auth-store signInWithPasskey called with:', { email, conditional });

    if (!isWebAuthnSupported()) {
      throw new Error('Passkeys are not supported on this device');
    }

    if (!conditional) {
      updateState({ state: 'loading', error: null });
      emit('sign_in_started', { method: 'passkey' });
      reportAuthState({
        event: 'webauthn-start',
        email,
        authMethod: 'passkey',
        context: { conditional: false }
      });
    }

    try {
      // First, get userId from email (mirrors thepia.com pattern)
      console.log('🔍 Getting userId from email...');
      const userCheck = await api.checkEmail(email);
      console.log('🔍 userCheck result:', userCheck);
      
      if (!userCheck.exists || !userCheck.userId) {
        throw new Error('User not found or missing userId');
      }

      // Get challenge from server
      console.log('🔍 Getting passkey challenge...');
      const challenge = await api.getPasskeyChallenge(email);
      console.log('🔍 Challenge received:', challenge);

      // Authenticate with passkey
      console.log('🔍 Authenticating with passkey...');
      const credential = await authenticateWithPasskey(challenge, conditional);
      const serializedCredential = serializeCredential(credential);
      console.log('🔍 Credential serialized');

      // Complete authentication with userId (not email)
      console.log('🔍 Calling api.signInWithPasskey with:', {
        userId: userCheck.userId,
        authResponse: 'serialized credential object'
      });
      
      const response = await api.signInWithPasskey({
        email: email,
        credential: serializedCredential,
        challengeId: challenge.challenge
      });

      console.log('🔍 DEBUG: API call completed, response received:', typeof response);
      console.log('🔍 DEBUG: Response keys:', Object.keys(response || {}));
      console.log('🔍 DEBUG: Got response from API, about to process...');

      try {
        // Handle both old format (step: 'success') and new format (success: true)
        const isSuccess = (response.step === 'success') || (response as any).success;
        const accessToken = response.accessToken || (response as any).tokens?.accessToken;
        const refreshToken = response.refreshToken || (response as any).tokens?.refreshToken;
        const expiresAt = (response as any).tokens?.expiresAt;

        console.log('🔍 DEBUG: Processing signInWithPasskey response:', {
          responseKeys: Object.keys(response),
          hasStep: 'step' in response,
          stepValue: response.step,
          hasSuccess: 'success' in response,
          successValue: (response as any).success,
          isSuccess,
          hasUser: !!response.user,
          hasAccessToken: !!accessToken,
          hasTokensObject: !!(response as any).tokens,
          tokensKeys: (response as any).tokens ? Object.keys((response as any).tokens) : null,
          fullResponse: response
        });

        if (isSuccess && response.user && accessToken) {
        console.log('💾 Processing successful passkey authentication');

        // Create normalized response in SignInResponse format
        const normalizedResponse: SignInResponse = {
          step: 'success',
          user: response.user,
          accessToken,
          refreshToken,
          expiresIn: expiresAt ? Math.floor((expiresAt - Date.now()) / 1000) : undefined
        };

        saveAuthSession(normalizedResponse, 'passkey');
        updateState({
          state: 'authenticated',
          user: response.user,
          accessToken,
          refreshToken,
          expiresAt: expiresAt || (normalizedResponse.expiresIn ? Date.now() + (normalizedResponse.expiresIn * 1000) : Date.now() + (24 * 60 * 60 * 1000)),
          error: null
        });
        scheduleTokenRefresh();
        emit('sign_in_success', { user: response.user, method: 'passkey' });
        emit('passkey_used', { user: response.user });
        
        // Send SignInEvent for state transition to 'signedIn'
        sendSignInEvent({ type: 'PASSKEY_SUCCESS', credential: credential });

        reportAuthState({
          event: 'webauthn-success',
          email,
          userId: response.user.id,
          authMethod: 'passkey',
          duration: Date.now() - startTime,
          context: { conditional }
        });
        } else {
          console.error('❌ Passkey authentication failed - missing required fields:', {
            isSuccess,
            hasUser: !!response.user,
            hasAccessToken: !!accessToken,
            response
          });
        }
      } catch (processingError) {
        console.error('❌ ERROR in response processing:', processingError);
        console.log('🔍 Raw response that caused error:', response);
      }

      return response;
    } catch (error: unknown) {
      const authError: AuthError = {
        code: (error as any)?.code || 'passkey_failed',
        message: (error as any)?.message || 'Passkey authentication failed'
      };

      reportAuthState({
        event: 'webauthn-failure',
        email,
        authMethod: 'passkey',
        error: authError.message,
        duration: Date.now() - startTime,
        context: { conditional }
      });

      if (!conditional) {
        updateState({ state: 'error', error: authError });
        emit('sign_in_error', { error: authError, method: 'passkey' });
      }
      
      // Send SignInEvent for passkey failure
      sendSignInEvent({ 
        type: 'PASSKEY_FAILED', 
        error: {
          name: (error as any)?.name || 'PasskeyError',
          message: authError.message,
          timing: Date.now() - startTime,
          type: 'credential-not-found'
        }
      });
      
      throw authError;
    }
  }


  /**
   * Sign in with magic link
   */
  async function signInWithMagicLink(email: string): Promise<SignInResponse> {
    const startTime = Date.now();
    
    updateState({ state: 'loading', error: null });
    emit('sign_in_started', { method: 'magic-link' });
    
    reportAuthState({
      event: 'magic-link-request',
      email,
      authMethod: 'email'
    });

    try {
      const response = await api.signInWithMagicLink({ email });
      
      updateState({ state: 'unauthenticated', error: null });
      
      reportAuthState({
        event: 'magic-link-sent',
        email,
        authMethod: 'email',
        duration: Date.now() - startTime
      });
      
      return response;
    } catch (error: unknown) {
      const authError: AuthError = {
        code: (error as any)?.code || 'unknown_error',
        message: (error as any)?.message || 'Magic link request failed'
      };
      
      reportAuthState({
        event: 'magic-link-failure',
        email,
        authMethod: 'email',
        error: authError.message,
        duration: Date.now() - startTime
      });
      
      updateState({ state: 'error', error: authError });
      emit('sign_in_error', { error: authError, method: 'magic-link' });
      throw authError;
    }
  }

  /**
   * Sign out
   */
  async function signOut(): Promise<void> {
    const currentState = get(store);
    
    try {
      if (currentState.accessToken) {
        await api.signOut({
          accessToken: currentState.accessToken,
          refreshToken: currentState.refreshToken || undefined
        });
      }
    } catch (error: unknown) {
      console.warn('Server sign out failed:', error);
    } finally {
      clearAuthSession();
      updateState({
        state: 'unauthenticated',
        user: null,
        accessToken: null,
        refreshToken: null,
        expiresAt: null,
        error: null
      });
      emit('sign_out');
    }
  }

  /**
   * Refresh tokens
   */
  async function refreshTokens(): Promise<void> {
    const currentState = get(store);
    if (!currentState.refreshToken) {
      throw new Error('No refresh token available');
    }

    try {
      const response = await api.refreshToken({ refreshToken: currentState.refreshToken });
      
      if (response.accessToken) {
        // Update session with new tokens
        const session = getSession();
        if (session) {
          session.tokens.accessToken = response.accessToken;
          session.tokens.refreshToken = response.refreshToken || session.tokens.refreshToken;
          session.tokens.expiresAt = response.expiresIn ? Date.now() + (response.expiresIn * 1000) : session.tokens.expiresAt;
          session.lastActivity = Date.now();
          saveSession(session);
        }
        
        updateState({
          accessToken: response.accessToken,
          refreshToken: response.refreshToken || currentState.refreshToken,
          expiresAt: response.expiresIn ? Date.now() + (response.expiresIn * 1000) : null,
          error: null
        });
        scheduleTokenRefresh();
        emit('token_refreshed');
      }
    } catch (error: unknown) {
      console.warn('Token refresh failed:', error);
      await signOut();
      throw error;
    }
  }

  /**
   * Check if user is authenticated (using sessionStorage)
   */
  function isAuthenticated(): boolean {
    const session = getSession();
    return isSessionValid(session);
  }

  /**
   * Get current access token (from sessionStorage)
   */
  function getAccessToken(): string | null {
    const session = getSession();
    return isSessionValid(session) ? session?.tokens.accessToken || null : null;
  }

  /**
   * Reset store to initial state
   */
  function reset(): void {
    clearAuthSession();
    updateState({
      state: 'unauthenticated',
      user: null,
      accessToken: null,
      refreshToken: null,
      expiresAt: null,
      error: null
    });
  }

  /**
   * Check if user exists and has WebAuthn credentials
   */
  async function checkUser(email: string) {
    try {
      const result = await api.checkEmail(email);
      const userData = {
        exists: result.exists,
        hasWebAuthn: result.hasPasskey,
        userId: result.userId,
        emailVerified: result.emailVerified,
        invitationTokenHash: result.invitationTokenHash,
        lastPinExpiry: result.lastPinExpiry as any
      };
      
      // Send SignInEvent based on user existence
      if (result.exists) {
        sendSignInEvent({ type: 'USER_EXISTS', hasPasskey: !!result.hasPasskey });
      } else {
        sendSignInEvent({ type: 'USER_NOT_FOUND' });
      }
      
      return userData;
    } catch (error: unknown) {
      console.error('Error checking user:', error);
      return { exists: false, hasWebAuthn: false, emailVerified: false };
    }
  }

  /**
   * Register new user
   */
  async function registerUser(userData: {
    email: string;
    firstName?: string;
    lastName?: string;
    acceptedTerms: boolean;
    acceptedPrivacy: boolean;
    invitationToken?: string; // NEW: Optional invitation token for email verification
  }): Promise<SignInResponse & { emailVerifiedViaInvitation?: boolean }> {
    const startTime = Date.now();

    updateState({ state: 'loading', error: null });
    emit('registration_started', { email: userData.email });

    try {
      reportAuthState({
        event: 'registration-start',
        email: userData.email,
        context: { 
          operation: 'registerUser',
          hasInvitationToken: !!userData.invitationToken
        }
      });

      const response = await api.registerUser(userData);

      if (response.step === 'success' && response.user && response.accessToken) {
        saveAuthSession(response, 'passkey');
        updateState({
          state: 'authenticated',
          user: response.user,
          accessToken: response.accessToken,
          refreshToken: response.refreshToken,
          expiresAt: response.expiresIn ? Date.now() + (response.expiresIn * 1000) : null,
          error: null
        });
        scheduleTokenRefresh();
        emit('registration_success', { user: response.user });

        reportAuthState({
          event: 'registration-success',
          email: userData.email,
          userId: response.user.id,
          duration: Date.now() - startTime,
          context: { operation: 'registerUser' }
        });
      }

      return response;
    } catch (error: unknown) {
      const authError: AuthError = {
        code: (error as any)?.code || 'registration_failed',
        message: (error as any)?.message || 'User registration failed'
      };

      reportAuthState({
        event: 'registration-failure',
        email: userData.email,
        error: authError.message,
        duration: Date.now() - startTime,
        context: { operation: 'registerUser' }
      });

      updateState({ state: 'error', error: authError });
      emit('registration_error', { error: authError });
      throw authError;
    }
  }

  /**
   * Register Individual User (Simple Same-Device Flow)
   * Creates user account and sends magic link email for verification.
   * User clicks email link on same device to authenticate, then can optionally set up passkey.
   */
  async function registerIndividualUser(userData: {
    email: string;
    firstName?: string;
    lastName?: string;
    acceptedTerms: boolean;
    acceptedPrivacy: boolean;
  }): Promise<{
    success: boolean;
    user: User;
    verificationRequired: boolean;
    message: string;
  }> {
    updateState({ state: 'loading', error: null });
    emit('registration_started', { email: userData.email });

    try {
      console.log('🔄 Creating user account...');
      const registrationResponse = await api.registerUser(userData);

      if (registrationResponse.step !== 'success' || !registrationResponse.user) {
        throw new Error('Failed to create user account');
      }

      console.log('✅ User account created:', registrationResponse.user.id);

      console.log('🔄 Sending verification email...');
      const magicLinkResponse = await api.startPasswordlessAuthentication(userData.email);
      
      if (!magicLinkResponse.success) {
        throw new Error('Failed to send verification email');
      }
      
      console.log('✅ Verification email sent');

      updateState({
        state: 'loading', // Use valid AuthState
        user: null, // Not authenticated until email clicked
        error: null
      });

      return {
        success: true,
        user: registrationResponse.user,
        verificationRequired: true,
        message: "Registration successful! Check your email and click the verification link to complete setup."
      };

    } catch (error: unknown) {
      console.error('❌ Individual user registration failed:', error);
      const authError = error instanceof Error ? error.message : 'Registration failed';
      updateState({ 
        state: 'error', 
        error: authError as any // Fix type issue
      });
      throw error;
    }
  }

  /**
   * Create account with passkey - Enhanced registration flow
   * For now, this is an enhanced version of registerUser with better error handling
   * TODO: Implement full WebAuthn integration when API endpoints are confirmed
   */
  async function createAccount(userData: {
    email: string;
    firstName?: string;
    lastName?: string;
    acceptedTerms: boolean;
    acceptedPrivacy: boolean;
    invitationToken?: string;
  }): Promise<SignInResponse & { emailVerifiedViaInvitation?: boolean }> {
    const startTime = Date.now();

    updateState({ state: 'loading', error: null });
    emit('registration_started', { email: userData.email });

    try {
      // Check WebAuthn support first
      if (!isWebAuthnSupported()) {
        throw new Error('Passkey authentication is not supported on this device. Please use a device with biometric authentication.');
      }

      const platformAvailable = await browser ? (await import('../utils/webauthn')).isPlatformAuthenticatorAvailable() : false;
      if (!platformAvailable) {
        throw new Error('No biometric authentication available. Please ensure Touch ID, Face ID, or Windows Hello is set up on your device.');
      }

      reportAuthState({
        event: 'registration-start',
        email: userData.email,
        context: { 
          operation: 'createAccount',
          hasInvitationToken: !!userData.invitationToken,
          webauthnSupported: true,
          platformAvailable
        }
      });

      // Step 1: Register user account in Auth0
      console.log('🔄 Step 1: Creating user account...');
      const registrationResponse = await api.registerUser(userData);

      if (registrationResponse.step !== 'success' || !registrationResponse.user) {
        throw new Error('Failed to create user account');
      }

      const user = registrationResponse.user;
      console.log('✅ User account created:', user.id);

      // Step 2: Get WebAuthn registration options
      console.log('🔄 Step 2: Getting WebAuthn registration options...');
      const registrationOptions = await api.getWebAuthnRegistrationOptions({
        email: userData.email,
        userId: user.id
      });

      console.log('✅ WebAuthn registration options received');

      // Step 3: Create WebAuthn credential using browser API
      console.log('🔄 Step 3: Creating WebAuthn authentication...');
      const webauthnUtils = await import('../utils/webauthn');
      const credential = await webauthnUtils.createCredential(registrationOptions);

      console.log('✅ WebAuthn authentication created');

      // Step 4: Verify WebAuthn registration with server
      console.log('🔄 Step 4: Verifying WebAuthn registration...');
      const verificationResult = await api.verifyWebAuthnRegistration({
        userId: user.id,
        registrationResponse: credential
      });

      if (!verificationResult.success) {
        throw new Error(verificationResult.error || 'Failed to verify WebAuthn registration');
      }

      console.log('✅ WebAuthn registration verified');

      // Step 5: Complete authentication and save session
      // Create complete auth response with user from step 1 and tokens from WebAuthn verification
      const completeAuthResponse = {
        step: 'success' as const,
        user: user,
        accessToken: verificationResult.tokens?.accessToken,
        refreshToken: verificationResult.tokens?.refreshToken,
        expiresAt: verificationResult.tokens?.expiresAt,
        emailVerifiedViaInvitation: registrationResponse.emailVerifiedViaInvitation
      };

      // Save session only if we have authentication tokens from WebAuthn verification
      if (verificationResult.tokens?.accessToken) {
        console.log('💾 Saving authentication session after complete WebAuthn flow');
        saveAuthSession(completeAuthResponse, 'passkey');
        updateState({
          state: 'authenticated',
          user: user,
          accessToken: verificationResult.tokens.accessToken,
          refreshToken: verificationResult.tokens.refreshToken,
          expiresAt: verificationResult.tokens.expiresAt,
          error: null
        });
        scheduleTokenRefresh();
        emit('registration_success', { user: user });

        reportAuthState({
          event: 'registration-success',
          email: userData.email,
          userId: user.id,
          duration: Date.now() - startTime,
          context: { 
            operation: 'createAccount',
            passkeyCreated: true,
            deviceLinked: true,
            sessionSaved: true
          }
        });

        console.log('✅ Account creation completed with WebAuthn device registration and session saved');
      } else {
        console.warn('⚠️ Account creation completed but no accessToken from WebAuthn verification - session not saved');
        // Still update state but without authentication
        updateState({
          state: 'unauthenticated',
          user: null,
          accessToken: null,
          refreshToken: null,
          expiresAt: null,
          error: null
        });
        emit('registration_success', { user: user });

        reportAuthState({
          event: 'registration-success',
          email: userData.email,
          userId: user.id,
          duration: Date.now() - startTime,
          context: { 
            operation: 'createAccount',
            passkeyCreated: true,
            deviceLinked: true,
            sessionSaved: false,
            reason: 'No accessToken in WebAuthn verification response'
          }
        });
      }

      return completeAuthResponse;
    } catch (error: unknown) {
      const authError: AuthError = {
        code: (error as any)?.code || 'account_creation_failed',
        message: (error as any)?.message || 'Account creation failed'
      };

      // Enhanced error handling for WebAuthn-specific errors
      if ((error as any)?.name === 'NotAllowedError') {
        authError.message = 'Passkey creation was cancelled. Please try again and allow the passkey creation when prompted.';
      } else if ((error as any)?.name === 'NotSupportedError') {
        authError.message = 'Passkey authentication is not supported on this device. Please use a device with biometric authentication.';
      } else if ((error as any)?.name === 'SecurityError') {
        authError.message = 'Security error during passkey creation. Please ensure you are using HTTPS and try again.';
      } else if ((error as any)?.name === 'InvalidStateError') {
        authError.message = 'A passkey for this account may already exist. Please try signing in instead.';
      }

      reportAuthState({
        event: 'registration-failure',
        email: userData.email,
        error: authError.message,
        duration: Date.now() - startTime,
        context: { 
          operation: 'createAccount',
          errorName: (error as any)?.name,
          errorCode: (error as any)?.code
        }
      });

      updateState({ state: 'error', error: authError });
      emit('registration_error', { error: authError });
      throw authError;
    }
  }

  /**
   * Enhanced user check that includes invitation token validation
   * This method extends the basic checkUser to support invitation workflows
   * @param email - User email to check
   * @param invitationOptions - Optional invitation token for validation
   * @returns Enhanced user check result with registration mode
   */
  async function checkUserWithInvitation(
    email: string,
    invitationOptions?: { token: string; tokenData?: InvitationTokenData; skipTokenValidation?: boolean }
  ) {
    try {
      const result = await api.checkEmail(email);
      
      // Base user check result
      const userCheck = {
        exists: result.exists,
        hasPasskey: result.hasPasskey,
        hasWebAuthn: result.hasPasskey, // Alias for compatibility
        invitationTokenHash: result.invitationTokenHash,
        userId: result.userId,
        requiresPasskeySetup: false,
        registrationMode: 'sign_in' as const
      };

      // If no invitation token, return basic result
      if (!invitationOptions?.token) {
        return userCheck;
      }

      // If user exists but no passkey, and invitation token is provided
      if (result.exists && !result.hasPasskey && invitationOptions.token) {
        // Verify token hash if available (security check)
        if (result.invitationTokenHash && !invitationOptions.skipTokenValidation) {
          const { hashInvitationToken } = await import('../utils/invitation-tokens');
          const currentTokenHash = await hashInvitationToken(invitationOptions.token);
          
          if (currentTokenHash !== result.invitationTokenHash) {
            console.warn('🔒 Token hash mismatch - token may not be valid for this user');
            return {
              ...userCheck,
              registrationMode: 'sign_in' as const // Force sign-in mode on token mismatch
            };
          }
        }
        
        return {
          ...userCheck,
          requiresPasskeySetup: true,
          registrationMode: 'complete_passkey' as const
        };
      }

      // If user doesn't exist and has valid invitation token
      if (!result.exists && invitationOptions.token) {
        return {
          ...userCheck,
          registrationMode: 'new_user' as const
        };
      }

      return userCheck;
    } catch (error: unknown) {
      console.error('Error in checkUserWithInvitation:', error);
      return {
        exists: false,
        hasPasskey: false,
        hasWebAuthn: false,
        registrationMode: 'new_user' as const
      };
    }
  }

  /**
   * Determines the appropriate authentication flow based on user status and invitation
   * @param email - User email
   * @param invitationToken - Optional invitation token
   * @returns Recommended auth flow and pre-filled data
   */
  async function determineAuthFlow(email: string, invitationToken?: string) {
    try {
      // Import utilities for token handling
      const { decodeInvitationToken, validateInvitationToken, extractRegistrationData } = await import('../utils/invitation-tokens');

      let tokenData = null;
      let prefillData = null;

      // Decode and validate invitation token if provided
      if (invitationToken) {
        try {
          tokenData = decodeInvitationToken(invitationToken);
          const validation = validateInvitationToken(invitationToken, tokenData);
          
          if (!validation.isValid) {
            console.warn('Invalid invitation token:', validation.reason);
            return {
              mode: 'sign_in' as const,
              message: 'Invalid or expired invitation token. Please sign in normally.'
            };
          }

          // Extract registration data from token
          prefillData = extractRegistrationData(tokenData);
        } catch (error: unknown) {
          console.warn('Failed to process invitation token:', error);
          return {
            mode: 'sign_in' as const,
            message: 'Invalid invitation token format. Please sign in normally.'
          };
        }
      }

      // Check user status with invitation context
      const userCheck = await checkUserWithInvitation(email, invitationToken ? {
        token: invitationToken,
        tokenData: tokenData || undefined,
        skipTokenValidation: false
      } : undefined);

      // Return appropriate flow based on user status
      switch (userCheck.registrationMode) {
        case 'new_user':
          return {
            mode: 'register' as const,
            prefillData: prefillData || undefined,
            message: 'Welcome! Please complete your registration.'
          };
        
        case 'complete_passkey':
          return {
            mode: 'complete_passkey' as const,
            prefillData: prefillData || undefined,
            message: 'Your account exists but needs a passkey for secure access. Please create your passkey.'
          };
        
        case 'sign_in':
        default:
          return {
            mode: 'sign_in' as const,
            message: userCheck.hasPasskey 
              ? 'Welcome back! Please sign in with your passkey.'
              : 'Please sign in to your account.'
          };
      }
    } catch (error: unknown) {
      console.error('Error determining auth flow:', error);
      return {
        mode: 'sign_in' as const,
        message: 'Unable to determine authentication flow. Please sign in normally.'
      };
    }
  }

  /**
   * Start conditional authentication - mirrors thepia.com auth0Service implementation
   * This enables non-intrusive passkey discovery that won't show popups if no passkeys exist
   * Uses proper conditional mediation with useBrowserAutofill for email field integration
   */
  async function startConditionalAuthentication(email: string): Promise<boolean> {
    const startTime = Date.now();

    if (!email.trim() || !isWebAuthnSupported()) return false;

    try {
      console.log('🔍 Starting conditional WebAuthn authentication for:', email);

      // Check if conditional mediation is supported
      if (!await isConditionalMediationSupported()) {
        console.log('⚠️ Conditional mediation not supported');
        return false;
      }

      console.log('✅ Conditional mediation supported, getting challenge...');

      // Get challenge from server - this will fail silently if user doesn't exist or has no passkeys
      const challenge = await api.getPasskeyChallenge(email);

      console.log('🔄 Starting conditional authentication with useBrowserAutofill...');

      reportAuthState({
        event: 'webauthn-start',
        email,
        authMethod: 'passkey',
        context: { conditional: true, operation: 'startConditionalAuthentication' }
      });

      // Use conditional authentication with proper browser autofill integration
      // This is the key difference - we need to use the authenticateWithPasskey function
      // with conditional=true which sets mediation: 'conditional'
      const credential = await authenticateWithPasskey(challenge, true);
      const serializedCredential = serializeCredential(credential);

      console.log('✅ Conditional authentication successful, verifying...');

      // Get userId from email first (mirrors thepia.com pattern)
      const userCheck = await api.checkEmail(email);
      if (!userCheck.exists || !userCheck.userId) {
        throw new Error('User not found or missing userId');
      }

      // Complete authentication with server using userId
      const response = await api.signInWithPasskey({
        email: email,
        credential: serializedCredential,
        challengeId: challenge.challenge
      });

      if (response.step === 'success' && response.user && response.accessToken) {
        console.log('✅ Conditional WebAuthn authentication successful');

        // Update auth state
        saveAuthSession(response, 'passkey');
        updateState({
          state: 'authenticated',
          user: response.user,
          accessToken: response.accessToken,
          refreshToken: response.refreshToken,
          expiresAt: response.expiresIn ? Date.now() + (response.expiresIn * 1000) : null,
          error: null
        });
        scheduleTokenRefresh();
        emit('sign_in_success', { user: response.user, method: 'passkey' });
        emit('passkey_used', { user: response.user });

        reportAuthState({
          event: 'login-success',
          email,
          userId: response.user.id,
          authMethod: 'passkey',
          duration: Date.now() - startTime,
          context: { conditional: true, operation: 'startConditionalAuthentication' }
        });

        return true;
      }

      return false;
    } catch (error: unknown) {
      // Conditional auth should fail silently for most errors
      console.log('⚠️ Conditional authentication failed (this is expected if no passkeys exist):', (error as any)?.message);

      reportAuthState({
        event: 'login-failure',
        email,
        authMethod: 'passkey',
        error: error instanceof Error ? error.message : String(error),
        duration: Date.now() - startTime,
        context: { conditional: true, operation: 'startConditionalAuthentication' }
      });

      return false;
    }
  }

  /**
   * Update legacy store based on state machine state
   */
  function updateLegacyStoreFromStateMachine(state: AuthMachineState, context: AuthMachineContext): void {
    const currentStore = get(store);
    
    switch (state) {
      case 'sessionValid':
      case 'appLoaded':
        if (context.sessionData) {
          updateState({
            state: 'authenticated',
            user: context.user,
            accessToken: context.sessionData.accessToken,
            refreshToken: context.sessionData.refreshToken || null,
            error: null
          });
        }
        break;
        
      case 'sessionInvalid':
      case 'combinedAuth':
        updateState({
          state: 'unauthenticated',
          user: null,
          accessToken: null,
          refreshToken: null,
          error: null
        });
        break;
        
      case 'checkingSession':
      case 'loadingApp':
        updateState({
          state: 'loading',
          error: null
        });
        break;
        
      case 'passkeyError':
      case 'credentialNotFound':
      case 'userCancellation':
      case 'credentialMismatch':
        updateState({
          state: 'error',
          error: context.error
        });
        break;
    }
  }

  /**
   * Initialize store (check for existing session)
   */
  function initialize(): void {
    // Note: Previously started state machine, now using direct signInState management
    // Session checking is handled by existing session initialization above
  }

  /**
   * Get current application context
   */
  function getApplicationContext(): ApplicationContext | null {
    return config.applicationContext || {
      userType: 'mixed',
      forceGuestMode: true
    };
  }

  /**
   * Update storage configuration dynamically
   */
  async function updateStorageConfiguration(update: StorageConfigurationUpdate): Promise<void> {
    if (!browser) return;

    // Security check: require authentication for role upgrades
    if (!isAuthenticated()) {
      throw new Error('Cannot update storage configuration: User not authenticated');
    }

    const currentState = get(store);
    const currentUserRole = currentState.user?.metadata?.role;

    // Security check: prevent role escalation beyond authenticated role
    if (currentUserRole && update.userRole !== currentUserRole) {
      if (update.userRole === 'admin' && currentUserRole !== 'admin') {
        throw new Error('Cannot upgrade to admin role without admin authentication');
      }
      if (update.userRole === 'employee' && currentUserRole === 'guest') {
        throw new Error('Cannot upgrade to employee role without employee authentication');
      }
    }

    // Log role change for audit
    console.log('AUDIT: Role configuration update', {
      timestamp: new Date().toISOString(),
      fromRole: currentUserRole || 'guest',
      toRole: update.userRole,
      fromStorage: 'sessionStorage', // Current default
      toStorage: update.type,
      userId: currentState.user?.id
    });

    try {
      // Update the session storage configuration
      const newStorageConfig = {
        type: update.type,
        userRole: update.userRole,
        sessionTimeout: update.sessionTimeout,
        persistentSessions: update.type === 'localStorage',
        migrateExistingSession: update.migrateExistingSession
      };

      // Import storage manager for dynamic configuration
      const { configureSessionStorage } = await import('../utils/sessionManager');
      configureSessionStorage(newStorageConfig);

      // Perform session migration if requested
      if (update.migrateExistingSession) {
        const fromStorage = 'sessionStorage' as StorageType;
        const toStorage = update.type as StorageType;
        
        if (fromStorage !== toStorage) {
          await migrateSession(fromStorage, toStorage);
        }
      }

      console.log('✅ Storage configuration updated successfully');
    } catch (error: unknown) {
      console.error('❌ Storage configuration update failed:', error);
      throw error;
    }
  }

  /**
   * Migrate session data between storage types
   */
  async function migrateSession(fromType: StorageType, toType: StorageType): Promise<SessionMigrationResult> {
    if (!browser) {
      return {
        success: false,
        fromStorage: fromType,
        toStorage: toType,
        dataPreserved: false,
        tokensPreserved: false,
        error: 'Not in browser environment'
      };
    }

    const startTime = Date.now();
    
    try {
      // Get current session data
      const currentSession = getSession();
      if (!currentSession) {
        return {
          success: false,
          fromStorage: fromType,
          toStorage: toType,
          dataPreserved: false,
          tokensPreserved: false,
          error: 'No active session to migrate'
        };
      }

      // Validate tokens before migration
      if (!isSessionValid(currentSession)) {
        return {
          success: false,
          fromStorage: fromType,
          toStorage: toType,
          dataPreserved: false,
          tokensPreserved: false,
          error: 'Expired tokens cannot be migrated'
        };
      }

      // Security check: prevent admin downgrades
      const userRole = currentSession.user.preferences?.role;
      if (userRole === 'admin' && fromType === 'localStorage' && toType === 'sessionStorage') {
        return {
          success: false,
          fromStorage: fromType,
          toStorage: toType,
          dataPreserved: true,
          tokensPreserved: true,
          error: 'Admin sessions cannot be downgraded to sessionStorage'
        };
      }

      // Perform migration by updating storage configuration
      const newStorageConfig = {
        type: toType,
        userRole: userRole || 'guest',
        sessionTimeout: toType === 'localStorage' ? 7 * 24 * 60 * 60 * 1000 : 8 * 60 * 60 * 1000,
        persistentSessions: toType === 'localStorage',
        migrateExistingSession: false // Prevent recursion
      };

      // Import storage manager for migration
      const { configureSessionStorage } = await import('../utils/sessionManager');
      configureSessionStorage(newStorageConfig);

      // Save session in new storage type
      saveSession(currentSession);

      const duration = Date.now() - startTime;
      
      // Performance check
      if (duration > 500) {
        console.warn(`⚠️ Session migration took ${duration}ms (requirement: <500ms)`);
      }

      console.log('✅ Session migration completed successfully', {
        fromStorage: fromType,
        toStorage: toType,
        duration: `${duration}ms`
      });

      return {
        success: true,
        fromStorage: fromType,
        toStorage: toType,
        dataPreserved: true,
        tokensPreserved: true
      };
    } catch (error: unknown) {
      console.error('❌ Session migration failed:', error);
      
      // Clear sensitive data on failure
      try {
        clearSession();
      } catch (clearError) {
        console.error('Failed to clear session after migration failure:', clearError);
      }

      return {
        success: false,
        fromStorage: fromType,
        toStorage: toType,
        dataPreserved: false,
        tokensPreserved: false,
        error: error instanceof Error ? error.message : 'Migration failed, sensitive data cleared'
      };
    }
  }

  /**
   * Send email code using organization-based authentication
   * Uses /{appCode}/send-email endpoint for unified registration/login
   */
  async function signInWithAppEmail(email: string): Promise<{
    success: boolean;
    message: string;
    timestamp: number;
  }> {
    // If appCode is configured, use app endpoints, otherwise fall back to magic link
    if (!getEffectiveAppCode()) {
      // Fall back to magic link authentication for backwards compatibility
      const result = await signInWithMagicLink(email);
      return {
        success: result.step === 'magic-link' || !!result.magicLinkSent,
        message: 'Magic link sent to your email',
        timestamp: Date.now()
      };
    }

    updateState({ state: 'loading', error: null });
    emit('app_email_started', { email, appCode: getEffectiveAppCode() });

    try {
      console.log('📧 Starting app email sign-in:', {
        email,
        appCode: getEffectiveAppCode(),
        apiBaseUrl: config.apiBaseUrl
      });

      const response = await api.sendAppEmailCode(email);
      
      emit('app_email_sent', { 
        email, 
        success: response.success,
        timestamp: response.timestamp 
      });
      
      updateState({ state: 'unauthenticated', error: null });
      
      return response;
    } catch (error: unknown) {
      console.error('App email sign-in failed:', error);
      
      const authError: AuthError = {
        code: error instanceof Error && 'code' in error ? (error as any).code : 'UNKNOWN_ERROR',
        message: error instanceof Error ? error.message : 'Failed to send email code',
        timestamp: new Date().toISOString()
      };
      
      updateState({ state: 'error', error: authError });
      emit('app_email_error', { error: authError, email });
      reportApiError(`/${getEffectiveAppCode()}/send-email`, 'POST', 0, authError.message, { email, appCode: getEffectiveAppCode() });
      
      throw error;
    }
  }

  /**
   * Verify email code using organization-based authentication
   * Uses /{appCode}/verify-email endpoint for unified registration/login
   */
  async function verifyAppEmailCode(email: string, code: string): Promise<SignInResponse> {
    // If appCode is not configured, this shouldn't be called since sendEmailCode would use magic link
    if (!getEffectiveAppCode()) {
      throw new Error('Email code verification is only available with organization configuration. This email uses magic link authentication instead.');
    }

    updateState({ state: 'loading', error: null });
    emit('app_email_verify_started', { email, appCode: getEffectiveAppCode() });

    try {
      console.log('🔍 Verifying app email code:', {
        email,
        appCode: getEffectiveAppCode(),
        hasCode: !!code
      });

      const response = await api.verifyAppEmailCode(email, code);
      
      if (response.step === 'success' && response.user && response.accessToken) {
        saveAuthSession(response, 'email-code');
        updateState({
          state: 'authenticated',
          user: response.user,
          accessToken: response.accessToken,
          refreshToken: response.refreshToken,
          expiresAt: response.expiresIn ? Date.now() + (response.expiresIn * 1000) : null,
          error: null
        });
        scheduleTokenRefresh();
        emit('app_email_verify_success', { 
          user: response.user, 
          method: 'email-code',
          appCode: getEffectiveAppCode() 
        });
        
        // Convert SignInResponse to SessionData format for EMAIL_VERIFIED event
        const sessionData = {
          accessToken: response.accessToken || '',
          refreshToken: response.refreshToken || '',
          user: {
            id: response.user.id,
            email: response.user.email,
            name: response.user.name || '',
            emailVerified: response.user.emailVerified || false
          },
          expiresAt: response.expiresIn ? Date.now() + (response.expiresIn * 1000) : Date.now() + (24 * 60 * 60 * 1000), // Default 24h
          lastActivity: Date.now()
        };
        sendSignInEvent({ type: 'EMAIL_VERIFIED', session: sessionData }); // Will transition to 'signedIn'
        
        return response;
      } else {
        throw new Error('Invalid response from email code verification');
      }
    } catch (error: unknown) {
      console.error('Organization email code verification failed:', error);
      
      const authError: AuthError = {
        code: error instanceof Error && 'code' in error ? (error as any).code : 'VERIFICATION_FAILED',
        message: error instanceof Error ? error.message : 'Failed to verify email code',
        timestamp: new Date().toISOString()
      };
      
      updateState({ state: 'error', error: authError });
      emit('app_email_verify_error', { error: authError, email });
      reportApiError(`/${getEffectiveAppCode()}/verify-email`, 'POST', 0, authError.message, { email, appCode: getEffectiveAppCode(), code: '***' });
      
      throw error;
    }
  }

  // Auto-initialize when store is created
  if (browser) {
    initialize();
  }

  return {
    // Legacy store interface (backward compatibility)
    subscribe: store.subscribe,
    signInWithPasskey,
    signInWithMagicLink,
    signOut,
    refreshTokens,
    isAuthenticated,
    getAccessToken,
    reset,
    initialize,
    startConditionalAuthentication,
    checkUser,
    registerUser,
    createAccount,
    registerIndividualUser,
    checkUserWithInvitation,
    determineAuthFlow,
    on,
    api,
    
    // SignIn flow control methods
    notifyPinSent: () => sendSignInEvent({ type: 'SENT_PIN_EMAIL' }),
    notifyPinVerified: (sessionData: any) => sendSignInEvent({ type: 'PIN_VERIFIED', session: sessionData }),
    
    // Email-based authentication methods (transparently uses app endpoints if configured)
    sendEmailCode: signInWithAppEmail,
    verifyEmailCode: verifyAppEmailCode,
    
    // Dynamic role configuration methods
    getApplicationContext,
    updateStorageConfiguration,
    migrateSession,
    
    // Note: Removed state machine interface - now using direct signInState management
    
    // Cleanup
    destroy: () => {
      // Note: No longer need to unsubscribe from state machine
    }
  };
}

// Export store creator
export { createAuthStore };

// Derived stores for common use cases
export function createAuthDerivedStores(authStore: ReturnType<typeof createAuthStore>) {
  return {
    // Legacy derived stores
    user: derived(authStore, $auth => $auth.user),
    isAuthenticated: derived(authStore, $auth => $auth.state === 'authenticated'),
    isLoading: derived(authStore, $auth => $auth.state === 'loading'),
    error: derived(authStore, $auth => $auth.error),
    
    // Sign-in state derived stores
    signInState: derived(authStore, $auth => $auth.signInState),
    isEmailEntry: derived(authStore, $auth => $auth.signInState === 'emailEntry'),
    isUserChecked: derived(authStore, $auth => $auth.signInState === 'userChecked'),
    isPasskeyPrompt: derived(authStore, $auth => $auth.signInState === 'passkeyPrompt'),
    isPinEntry: derived(authStore, $auth => $auth.signInState === 'pinEntry'),
    isSignedIn: derived(authStore, $auth => $auth.signInState === 'signedIn'),
    hasSignInError: derived(authStore, $auth => $auth.signInState === 'generalError')
  };
}