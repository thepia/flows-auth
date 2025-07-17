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
import { AuthStateMachine } from './auth-state-machine';
import type {
  AuthConfig,
  AuthStore,
  AuthError,
  SignInResponse,
  AuthMethod,
  AuthEventType,
  AuthEventData,
  AuthMachineState,
  AuthMachineContext
} from '../types';

// Legacy localStorage migration (remove old localStorage entries if they exist)
const LEGACY_STORAGE_KEYS = {
  ACCESS_TOKEN: 'auth_access_token',
  REFRESH_TOKEN: 'auth_refresh_token',
  EXPIRES_AT: 'auth_expires_at',
  USER: 'auth_user'
} as const;

// Create auth store with state machine integration
function createAuthStore(config: AuthConfig) {
  // Initialize error reporting if configured
  if (browser && config.errorReporting) {
    initializeErrorReporter(config.errorReporting);
  }

  // Configure session storage based on config or optimal defaults
  if (browser) {
    const storageConfig = config.storage || getOptimalSessionConfig();
    configureSessionStorage(storageConfig);
  }

  // Initialize API client and state machine
  const api = new AuthApiClient(config);
  const stateMachine = new AuthStateMachine(api, config);

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
    user: isValidSession ? convertSessionUserToAuthUser(existingSession.user) : null,
    accessToken: isValidSession ? existingSession.tokens.accessToken : null,
    refreshToken: isValidSession ? existingSession.tokens.refreshToken : null,
    expiresAt: isValidSession ? existingSession.tokens.expiresAt : null,
    error: null
  };

  const store = writable<AuthStore>(initialState);
  
  // Create state machine store
  const stateMachineStore = writable({
    state: stateMachine.currentState,
    context: stateMachine.currentContext
  });

  // Subscribe to state machine changes
  const unsubscribeStateMachine = stateMachine.onTransition((state, context) => {
    stateMachineStore.set({ state, context });
    
    // Update legacy store based on state machine state
    updateLegacyStoreFromStateMachine(state, context);
  });

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
   * Save authentication session to sessionStorage
   */
  function saveAuthSession(response: SignInResponse, authMethod: 'passkey' | 'password' = 'passkey') {
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
    } catch (error) {
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
      } catch (error) {
        console.warn('Auto token refresh failed:', error);
      }
    }, refreshTime);
  }

  /**
   * Initiate sign-in flow
   */
  async function signIn(email: string, method?: AuthMethod): Promise<SignInResponse> {
    updateState({ state: 'loading', error: null });
    emit('sign_in_started', { method });

    try {
      const response = await api.signIn({ email, method });
      
      if (response.step === 'success' && response.user && response.accessToken) {
        saveAuthSession(response, method === 'passkey' ? 'passkey' : 'password');
        updateState({
          state: 'authenticated',
          user: response.user,
          accessToken: response.accessToken,
          refreshToken: response.refreshToken,
          expiresAt: response.expiresIn ? Date.now() + (response.expiresIn * 1000) : null,
          error: null
        });
        scheduleTokenRefresh();
        emit('sign_in_success', { user: response.user, method });
      }

      return response;
    } catch (error: any) {
      const authError: AuthError = {
        code: error.code || 'unknown_error',
        message: error.message || 'Sign in failed'
      };
      
      updateState({ state: 'error', error: authError });
      emit('sign_in_error', { error: authError, method });
      throw authError;
    }
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
        userId: userCheck.userId,
        authResponse: serializedCredential
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
    } catch (error: any) {
      const authError: AuthError = {
        code: error.code || 'passkey_failed',
        message: error.message || 'Passkey authentication failed'
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
      throw authError;
    }
  }

  /**
   * Sign in with password
   */
  async function signInWithPassword(email: string, password: string): Promise<SignInResponse> {
    updateState({ state: 'loading', error: null });
    emit('sign_in_started', { method: 'password' });

    try {
      const response = await api.signInWithPassword({ email, password });

      if (response.step === 'success' && response.user && response.accessToken) {
        saveAuthSession(response, 'password');
        updateState({
          state: 'authenticated',
          user: response.user,
          accessToken: response.accessToken,
          refreshToken: response.refreshToken,
          expiresAt: response.expiresIn ? Date.now() + (response.expiresIn * 1000) : null,
          error: null
        });
        scheduleTokenRefresh();
        emit('sign_in_success', { user: response.user, method: 'password' });
      }

      return response;
    } catch (error: any) {
      const authError: AuthError = {
        code: error.code || 'invalid_credentials',
        message: error.message || 'Invalid email or password'
      };
      
      updateState({ state: 'error', error: authError });
      emit('sign_in_error', { error: authError, method: 'password' });
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
    } catch (error: any) {
      const authError: AuthError = {
        code: error.code || 'unknown_error',
        message: error.message || 'Magic link request failed'
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
    } catch (error) {
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
    } catch (error) {
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
      return {
        exists: result.exists,
        hasWebAuthn: result.hasPasskey,
        userId: result.userId,
        invitationTokenHash: result.invitationTokenHash
      };
    } catch (error) {
      console.error('Error checking user:', error);
      return { exists: false, hasWebAuthn: false };
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
  }): Promise<SignInResponse> {
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
    } catch (error: any) {
      const authError: AuthError = {
        code: error.code || 'registration_failed',
        message: error.message || 'User registration failed'
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
  }): Promise<SignInResponse> {
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
      console.log('🔄 Step 3: Creating WebAuthn credential...');
      const webauthnUtils = await import('../utils/webauthn');
      const credential = await webauthnUtils.createCredential(registrationOptions);

      console.log('✅ WebAuthn credential created');

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

      // Step 5: Complete authentication with tokens
      if (registrationResponse.accessToken) {
        saveAuthSession(registrationResponse, 'passkey');
        updateState({
          state: 'authenticated',
          user: user,
          accessToken: registrationResponse.accessToken,
          refreshToken: registrationResponse.refreshToken,
          expiresAt: registrationResponse.expiresIn ? Date.now() + (registrationResponse.expiresIn * 1000) : null,
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
            deviceLinked: true
          }
        });

        console.log('✅ Account creation completed with WebAuthn device registration');
        return registrationResponse;
      }

      return registrationResponse;
    } catch (error: any) {
      const authError: AuthError = {
        code: error.code || 'account_creation_failed',
        message: error.message || 'Account creation failed'
      };

      // Enhanced error handling for WebAuthn-specific errors
      if (error.name === 'NotAllowedError') {
        authError.message = 'Passkey creation was cancelled. Please try again and allow the passkey creation when prompted.';
      } else if (error.name === 'NotSupportedError') {
        authError.message = 'Passkey authentication is not supported on this device. Please use a device with biometric authentication.';
      } else if (error.name === 'SecurityError') {
        authError.message = 'Security error during passkey creation. Please ensure you are using HTTPS and try again.';
      } else if (error.name === 'InvalidStateError') {
        authError.message = 'A passkey for this account may already exist. Please try signing in instead.';
      }

      reportAuthState({
        event: 'registration-failure',
        email: userData.email,
        error: authError.message,
        duration: Date.now() - startTime,
        context: { 
          operation: 'createAccount',
          errorName: error.name,
          errorCode: error.code
        }
      });

      updateState({ state: 'error', error: authError });
      emit('registration_error', { error: authError });
      throw authError;
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
        userId: userCheck.userId,
        authResponse: serializedCredential
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
    } catch (error: any) {
      // Conditional auth should fail silently for most errors
      console.log('⚠️ Conditional authentication failed (this is expected if no passkeys exist):', error.message);

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
    // Start the state machine - it will handle session checking
    stateMachine.start();
  }

  // Auto-initialize when store is created
  if (browser) {
    initialize();
  }

  return {
    // Legacy store interface (backward compatibility)
    subscribe: store.subscribe,
    signIn,
    signInWithPasskey,
    signInWithPassword,
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
    on,
    api,
    
    // State machine interface
    stateMachine: {
      subscribe: stateMachineStore.subscribe,
      send: (event: any) => stateMachine.send(event),
      matches: (state: AuthMachineState) => stateMachine.matches(state),
      currentState: () => stateMachine.currentState,
      currentContext: () => stateMachine.currentContext
    },
    
    // State machine event senders (convenience methods)
    checkSession: () => stateMachine.send({ type: 'CHECK_SESSION' }),
    typeEmail: (email: string) => stateMachine.send({ type: 'EMAIL_TYPED', email }),
    clickContinue: () => stateMachine.send({ type: 'CONTINUE_CLICKED' }),
    clickNext: () => stateMachine.send({ type: 'USER_CLICKS_NEXT' }),
    resetToAuth: () => stateMachine.send({ type: 'RESET_TO_COMBINED_AUTH' }),
    
    // Cleanup
    destroy: unsubscribeStateMachine
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
    
    // State machine derived stores
    currentStep: derived(authStore.stateMachine, $sm => $sm.state),
    machineContext: derived(authStore.stateMachine, $sm => $sm.context),
    isInState: (state: AuthMachineState) => derived(authStore.stateMachine, $sm => $sm.state === state),
    
    // Convenience derived stores for common states
    isCheckingSession: derived(authStore.stateMachine, $sm => $sm.state === 'checkingSession'),
    isCombinedAuth: derived(authStore.stateMachine, $sm => $sm.state === 'combinedAuth'),
    isConditionalAuth: derived(authStore.stateMachine, $sm => $sm.state === 'conditionalMediation'),
    isBiometricPrompt: derived(authStore.stateMachine, $sm => $sm.state === 'biometricPrompt'),
    hasError: derived(authStore.stateMachine, $sm => 
      ['passkeyError', 'credentialNotFound', 'userCancellation', 'credentialMismatch'].includes($sm.state)
    )
  };
}