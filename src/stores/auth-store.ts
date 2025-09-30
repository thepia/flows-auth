/**
 * Auth Store
 * Svelte store for managing authentication state
 */

import { derived, get, writable } from 'svelte/store';

// Check if running in browser
const browser = typeof window !== 'undefined';
import { AuthApiClient } from '../api/auth-api';
import type {
  ApiError,
  ApplicationContext,
  AuthButtonMethod,
  AuthConfig,
  AuthError,
  AuthErrorCode,
  AuthEventData,
  AuthEventType,
  AuthMethod,
  AuthStore,
  ButtonConfig,
  CompleteAuthStore,
  ExplainerConfig,
  InvitationTokenData,
  RegistrationResponse,
  SessionData,
  SessionMigrationResult,
  SignInEvent,
  SignInResponse,
  SignInState,
  SingleButtonConfig,
  StateMessageConfig,
  StorageConfigurationUpdate,
  StorageType,
  User
} from '../types';
import {
  initializeErrorReporter,
  reportApiError,
  reportAuthState,
  reportWebAuthnError,
  updateErrorReporterConfig
} from '../utils/errorReporter';
import {
  type FlowsSessionData,
  clearSession,
  configureSessionStorage,
  generateInitials,
  getOptimalSessionConfig,
  getSession,
  isSessionValid,
  saveSession
} from '../utils/sessionManager';
import {
  authenticateWithPasskey,
  createCredential,
  isConditionalMediationSupported,
  isPlatformAuthenticatorAvailable,
  isWebAuthnSupported,
  serializeCredential
} from '../utils/webauthn';

// Legacy localStorage migration (remove old localStorage entries if they exist)
const LEGACY_STORAGE_KEYS = {
  ACCESS_TOKEN: 'auth_access_token',
  REFRESH_TOKEN: 'auth_refresh_token',
  EXPIRES_AT: 'auth_expires_at',
  USER: 'auth_user'
} as const;

/**
 * Classify technical errors into user-friendly ApiError objects
 */
function classifyError(error: unknown, context?: { method?: string; email?: string }): ApiError {
  const message = error instanceof Error ? error.message : String(error);
  const timestamp = Date.now();

  // Network and service availability errors
  if (
    message.includes('fetch') ||
    message.includes('network') ||
    message.includes('Failed to fetch')
  ) {
    return {
      code: 'error.network',
      message,
      retryable: true,
      timestamp,
      context
    };
  }

  // Service unavailable (API endpoints not found, server errors)
  if (
    message.includes('404') ||
    message.includes('endpoint') ||
    message.includes('not found') ||
    message.includes('500') ||
    message.includes('502') ||
    message.includes('503')
  ) {
    return {
      code: 'error.serviceUnavailable',
      message,
      retryable: true,
      timestamp,
      context
    };
  }

  // User not found errors
  if (
    message.includes('user not found') ||
    message.includes('User not found') ||
    (message.includes('404') && context?.method === 'checkUser')
  ) {
    return {
      code: 'error.userNotFound',
      message,
      retryable: false,
      timestamp,
      context
    };
  }

  // WebAuthn cancellation
  if (
    message.includes('NotAllowedError') ||
    message.includes('cancelled') ||
    message.includes('aborted')
  ) {
    return {
      code: 'error.authCancelled',
      message,
      retryable: true,
      timestamp,
      context
    };
  }

  // WebAuthn and passkey failures
  if (
    message.includes('webauthn') ||
    message.includes('passkey') ||
    message.includes('credential')
  ) {
    return {
      code: 'error.authFailed',
      message,
      retryable: true,
      timestamp,
      context
    };
  }

  // Rate limiting
  if (
    message.includes('rate limit') ||
    message.includes('too many requests') ||
    message.includes('429')
  ) {
    return {
      code: 'error.rateLimited',
      message,
      retryable: true,
      timestamp,
      context
    };
  }

  // Invalid input
  if (message.includes('invalid') || message.includes('validation') || message.includes('400')) {
    return {
      code: 'error.invalidInput',
      message,
      retryable: false,
      timestamp,
      context
    };
  }

  // Default unknown error
  return {
    code: 'error.unknown',
    message,
    retryable: true,
    timestamp,
    context
  };
}

// Create auth store with state machine integration
function createAuthStore(config: AuthConfig, apiClient?: AuthApiClient): CompleteAuthStore {
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

  // Initialize API client (use injected client for testing, or create new one)
  const api = apiClient || new AuthApiClient(config);

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

  // Determine passkey availability centrally
  const determinePasskeysEnabled = (): boolean => {
    if (!browser) return false;
    if (!config.enablePasskeys) return false;
    return isWebAuthnSupported();
  };

  const resetSignInState: Partial<AuthStore> = {
    signInState: 'emailEntry',
    apiError: null,

    // UI State
    email: '',
    loading: false,
    emailCodeSent: false,
    fullName: '',

    // User Discovery State
    userExists: null,
    hasPasskeys: false,
    hasValidPin: false,
    pinRemainingMinutes: 0,

    // WebAuthn State
    conditionalAuthActive: false,
    platformAuthenticatorAvailable: false
  };

  const initialState: AuthStore = {
    state: isValidSession ? 'authenticated' : 'unauthenticated',
    signInState: isValidSession ? 'signedIn' : 'emailEntry', // signedIn if already authenticated
    user: isValidSession ? convertSessionUserToAuthUser(existingSession.user) : null,
    accessToken: isValidSession ? existingSession.tokens.accessToken : null,
    refreshToken: isValidSession ? existingSession.tokens.refreshToken : null,
    expiresAt: isValidSession ? existingSession.tokens.expiresAt : null,
    passkeysEnabled: determinePasskeysEnabled(),

    apiError: null,

    // UI State
    email: '',
    loading: false,
    emailCodeSent: false,
    fullName: '',

    // User Discovery State
    userExists: null,
    hasPasskeys: false,
    hasValidPin: false,
    pinRemainingMinutes: 0,

    // WebAuthn State
    conditionalAuthActive: false,
    platformAuthenticatorAvailable: false
  };

  const store = writable<AuthStore>(initialState);

  // Internal state update function for actions
  const updateStore = (updater: (state: AuthStore) => AuthStore) => {
    store.update(updater);
  };

  // Event handlers
  const eventHandlers = new Map<AuthEventType, ((data: AuthEventData) => void)[]>();

  /**
   * Emit auth event
   */
  function emit(type: AuthEventType, data: AuthEventData = {}) {
    const handlers = eventHandlers.get(type) || [];
    handlers.forEach((handler) => handler(data));
  }

  // Error management state
  let lastFailedRequest: { method: string; args: unknown[] } | null = null;

  /**
   * Set API error in the store
   */
  function setApiError(error: unknown, context?: { method?: string; email?: string }) {
    const apiError = classifyError(error, context);
    updateStore((s) => ({ ...s, apiError }));

    // Store the failed request for retry capability
    if (context?.method) {
      lastFailedRequest = { method: context.method, args: [] };
    }
  }

  /**
   * Clear API error from the store
   */
  function clearApiError() {
    updateStore((s) => ({ ...s, apiError: null }));
    lastFailedRequest = null;
  }

  /**
   * Retry the last failed request if available and retryable
   */
  async function retryLastFailedRequest(): Promise<boolean> {
    const currentState = get(store);
    if (!currentState.apiError || !currentState.apiError.retryable || !lastFailedRequest) {
      return false;
    }

    clearApiError();

    try {
      // This would need to be implemented based on the specific method
      // For now, just clear the error and return true
      console.log('Retrying last failed request:', lastFailedRequest.method);
      return true;
    } catch (error) {
      setApiError(error, { method: lastFailedRequest.method });
      return false;
    }
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
    return store.update((state) => ({ ...state, ...updates }));
  }

  /**
   * Process SignInEvent and transition signInState
   */
  function processSignInTransition(currentState: SignInState, event: SignInEvent): SignInState {
    switch (currentState) {
      case 'emailEntry':
        if (event.type === 'USER_CHECKED') {
          // Transition to userChecked - passkey handling should be at UI level
          return 'userChecked';
        }
        break;

      case 'userChecked':
        if (event.type === 'SENT_PIN_EMAIL') return 'pinEntry'; // Transition to PIN entry after email sent
        if (event.type === 'RESET') return 'emailEntry';
        break;

      case 'passkeyPrompt':
        if (event.type === 'PASSKEY_SUCCESS') return 'signedIn';
        if (event.type === 'PASSKEY_FAILED') return 'generalError';
        break;

      case 'pinEntry':
        if (event.type === 'PIN_VERIFIED') return 'signedIn';
        if (event.type === 'EMAIL_VERIFICATION_REQUIRED') return 'emailVerification';
        if (event.type === 'RESET') return 'emailEntry';
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
   * Returns the new signInState after processing
   */
  function sendSignInEvent(event: SignInEvent): SignInState {
    let newSignInState: SignInState = 'emailEntry'; // Initialize with default
    store.update((s) => {
      newSignInState = processSignInTransition(s.signInState, event);
      let updatedStore = { ...s, signInState: newSignInState };

      // Update store state based on event data
      switch (event.type) {
        case 'USER_CHECKED':
          updatedStore = {
            ...updatedStore,
            email: event.email,
            userExists: event.exists,
            hasPasskeys: event.hasPasskey,
            hasValidPin: event.hasValidPin || false,
            pinRemainingMinutes: event.pinRemainingMinutes || 0
          };
          break;
        case 'EMAIL_CODE_ENTERED':
          // emailCode is now handled as transient input in components
          // No store update needed
          break;
        case 'SENT_PIN_EMAIL':
          updatedStore = {
            ...updatedStore,
            emailCodeSent: true
          };
          break;
        case 'RESET':
          // Reset UI state to initial values
          clearAuthSession();
          updatedStore = {
            ...updatedStore,
            state: 'unauthenticated',
            ...resetSignInState,
            accessToken: null,
            refreshToken: null,
            expiresAt: null
          };
          break;
      }

      return updatedStore;
    });
    return newSignInState;
  }

  /**
   * Update signInState directly
   */
  function updateSignInState(newSignInState: SignInState) {
    store.update((s) => ({ ...s, signInState: newSignInState }));
  }

  /**
   * Save authentication session to sessionStorage
   */
  function saveAuthSession(
    response: SignInResponse,
    authMethod: 'passkey' | 'password' | 'email-code' = 'passkey'
  ) {
    if (!browser || !response.user || !response.accessToken) return;

    const sessionData: FlowsSessionData = {
      user: {
        id: response.user.id,
        email: response.user.email,
        name: response.user.name || response.user.email,
        initials: generateInitials(response.user.name || response.user.email),
        avatar:
          ((response.user as unknown as Record<string, unknown>).avatar as string) ||
          ((response.user as unknown as Record<string, unknown>).picture as string),
        preferences:
          ((response.user as unknown as Record<string, unknown>).preferences as Record<
            string,
            any
          >) ||
          ((response.user as unknown as Record<string, unknown>).metadata as Record<string, any>) ||
          undefined
      },
      tokens: {
        accessToken: response.accessToken,
        refreshToken: response.refreshToken || '',
        expiresAt: response.expiresIn
          ? Date.now() + response.expiresIn * 1000
          : Date.now() + 24 * 60 * 60 * 1000
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
    const refreshTime = Math.max(timeUntilExpiry - 5 * 60 * 1000, 1000); // 5 minutes before expiry

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
      clearApiError(); // Clear errors but don't change state
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
        const responseWithTokens = response as Record<string, unknown> & {
          step?: string;
          accessToken?: string;
          refreshToken?: string;
          tokens?: Record<string, unknown>;
        };
        const isSuccess = response.step === 'success' || responseWithTokens.success;
        const accessToken =
          response.accessToken || (responseWithTokens.tokens?.accessToken as string);
        const refreshToken =
          response.refreshToken || (responseWithTokens.tokens?.refreshToken as string);
        const expiresAt = responseWithTokens.tokens?.expiresAt;

        console.log('🔍 DEBUG: Processing signInWithPasskey response:', {
          responseKeys: Object.keys(response),
          hasStep: 'step' in response,
          stepValue: response.step,
          hasSuccess: 'success' in response,
          successValue: responseWithTokens.success,
          isSuccess,
          hasUser: !!response.user,
          hasAccessToken: !!accessToken,
          hasTokensObject: !!responseWithTokens.tokens,
          tokensKeys: responseWithTokens.tokens ? Object.keys(responseWithTokens.tokens) : null,
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
            expiresIn: expiresAt
              ? Math.floor(((expiresAt as number) - Date.now()) / 1000)
              : undefined
          };

          saveAuthSession(normalizedResponse, 'passkey');
          updateState({
            state: 'authenticated',
            user: response.user,
            accessToken,
            refreshToken,
            expiresAt:
              (expiresAt as number) ||
              (normalizedResponse.expiresIn
                ? Date.now() + normalizedResponse.expiresIn * 1000
                : Date.now() + 24 * 60 * 60 * 1000),
            apiError: null
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
      const errorWithCode = error as Error & { code?: string };

      // Set API error using new error management
      setApiError(error, { method: 'signInWithPasskey', email });

      reportAuthState({
        event: 'webauthn-failure',
        email,
        authMethod: 'passkey',
        error: errorWithCode?.message || 'Passkey authentication failed',
        duration: Date.now() - startTime,
        context: { conditional }
      });

      if (!conditional) {
        const currentState = get(store);
        emit('sign_in_error', {
          error: currentState.apiError
            ? {
                code: currentState.apiError.code,
                message: currentState.apiError.message
              }
            : undefined,
          method: 'passkey'
        });
      }

      // Send SignInEvent for passkey failure
      sendSignInEvent({
        type: 'PASSKEY_FAILED',
        error: {
          name: errorWithCode?.name || 'PasskeyError',
          message: errorWithCode?.message || 'Passkey authentication failed',
          timing: Date.now() - startTime,
          type: 'credential-not-found'
        }
      });

      throw error;
    }
  }

  /**
   * Sign in with magic link
   */
  async function signInWithMagicLink(email: string): Promise<SignInResponse> {
    const startTime = Date.now();

    clearApiError(); // Clear errors but don't change state
    emit('sign_in_started', { method: 'magic-link' });

    reportAuthState({
      event: 'magic-link-request',
      email,
      authMethod: 'email'
    });

    try {
      const response = await api.signInWithMagicLink({ email });

      updateState({ state: 'unauthenticated', apiError: null });

      reportAuthState({
        event: 'magic-link-sent',
        email,
        authMethod: 'email',
        duration: Date.now() - startTime
      });

      return response;
    } catch (error: unknown) {
      const apiError = classifyError(error as Error, {
        method: 'signInWithMagicLink',
        email
      });

      setApiError(apiError);

      reportAuthState({
        event: 'magic-link-failure',
        email,
        authMethod: 'email',
        error: apiError.message,
        duration: Date.now() - startTime
      });

      emit('sign_in_error', {
        error: { code: apiError.code, message: apiError.message },
        method: 'magic-link'
      });

      // Return empty response instead of throwing
      return { step: 'error' } as SignInResponse;
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
        signInState: 'emailEntry', // Reset signInState when signing out
        user: null,
        accessToken: null,
        refreshToken: null,
        expiresAt: null,
        apiError: null
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
          session.tokens.expiresAt = response.expiresIn
            ? Date.now() + response.expiresIn * 1000
            : session.tokens.expiresAt;
          session.lastActivity = Date.now();
          saveSession(session);
        }

        updateState({
          accessToken: response.accessToken,
          refreshToken: response.refreshToken || currentState.refreshToken,
          expiresAt: response.expiresIn ? Date.now() + response.expiresIn * 1000 : null,
          apiError: null
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
      ...resetSignInState,
      accessToken: null,
      refreshToken: null,
      expiresAt: null
    });
  }

  // async function checkUserIfNeeded(email: string) {
  //   try {
  //     const result = await api.checkEmail(email);
  //   } catch (error: unknown) {
  //     console.error('Error checking user:', error);
  //     return { exists: false, hasWebAuthn: false, emailVerified: false };
  //   }
  // }

  /**
   * Check if user exists and has WebAuthn credentials
   */
  async function checkUser(email: string) {
    // Validate email before making API call
    if (!email || !email.trim()) {
      console.log('🔍 checkUser: Empty email, resetting to emailEntry state');
      // Reset to emailEntry state when email is empty
      updateStore((s) => ({
        ...s,
        signInState: 'emailEntry',
        userExists: null,
        hasPasskeys: false,
        hasValidPin: false,
        pinRemainingMinutes: 0
      }));
      return { exists: false, hasWebAuthn: false, emailVerified: false };
    }

    // Basic email pattern validation (must contain @ and .)
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(email.trim())) {
      console.log(
        '🔍 checkUser: Invalid email pattern, resetting to emailEntry state:',
        email.trim()
      );
      // Reset to emailEntry state when email is invalid
      updateStore((s) => ({
        ...s,
        signInState: 'emailEntry',
        userExists: null,
        hasPasskeys: false,
        hasValidPin: false,
        pinRemainingMinutes: 0
      }));
      return { exists: false, hasWebAuthn: false, emailVerified: false };
    }

    try {
      updateStore((s) => ({ ...s, loading: true }));
      const result = await api.checkEmail(email);
      const userData = result; // UserCheckData is already in the correct format
      updateStore((s) => ({ ...s, loading: false }));

      // Send USER_CHECKED event with user data
      sendSignInEvent({
        type: 'USER_CHECKED',
        email,
        exists: result.exists,
        hasPasskey: !!result.hasWebAuthn,
        hasValidPin: checkForValidPin(userData),
        pinRemainingMinutes: getRemainingPinMinutes(userData)
      });

      console.log('🔍 Reactive pin check result:', {
        email: email.trim(),
        hasValidPin: checkForValidPin(userData),
        lastPinExpiry: userData.lastPinExpiry,
        userExists: userData.exists,
        hasPasskeys: userData.hasWebAuthn
      });

      return userData;
    } catch (error: unknown) {
      updateStore((s) => ({ ...s, loading: false }));
      console.error('Error checking user:', error);

      // Set API error for user not found or service unavailable
      setApiError(error, { method: 'checkUser', email });

      return { exists: false, hasWebAuthn: false, emailVerified: false };
    }
  }

  // Pin validation helper
  function checkForValidPin(userCheck: any): boolean {
    if (!userCheck || !userCheck.lastPinExpiry) return false;

    try {
      const expiryTime = new Date(userCheck.lastPinExpiry);
      const now = new Date();

      // Debug logging for time zone issues
      console.log('🕐 Pin validation time check:', {
        lastPinExpiry: userCheck.lastPinExpiry,
        expiryTimeUTC: expiryTime.toISOString(),
        expiryTimeLocal: expiryTime.toString(),
        nowUTC: now.toISOString(),
        nowLocal: now.toString(),
        expiryMs: expiryTime.getTime(),
        nowMs: now.getTime(),
        isValid: expiryTime > now,
        diffMinutes: Math.floor((expiryTime.getTime() - now.getTime()) / (1000 * 60))
      });

      return expiryTime > now; // Pin is still valid if expiry is in the future
    } catch (error) {
      console.error('Error parsing pin expiry time:', error);
      return false;
    }
  }

  // Calculate remaining minutes for valid pin
  function getRemainingPinMinutes(userCheck: any): number {
    if (!userCheck || !userCheck.lastPinExpiry) return 0;

    try {
      const expiryTime = new Date(userCheck.lastPinExpiry);
      const now = new Date();
      const remainingMs = expiryTime.getTime() - now.getTime();
      // Handle NaN case from invalid dates
      if (Number.isNaN(remainingMs)) return 0;
      return Math.max(0, Math.ceil(remainingMs / (1000 * 60))); // Convert to minutes
    } catch (error) {
      console.error('Error calculating pin remaining time:', error);
      return 0;
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
          expiresAt: response.expiresIn ? Date.now() + response.expiresIn * 1000 : null,
          apiError: null
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
      const errorWithCode = error as Error & { code?: string };
      const authError: AuthError = {
        code: errorWithCode?.code || 'registration_failed',
        message: errorWithCode?.message || 'User registration failed'
      };

      reportAuthState({
        event: 'registration-failure',
        email: userData.email,
        error: authError.message,
        duration: Date.now() - startTime,
        context: { operation: 'registerUser' }
      });

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
    emit('registration_started', { email: userData.email });

    try {
      console.log('🔄 Creating user account...');
      const registrationResponse = await api.registerUser(userData);

      if (registrationResponse.step !== 'success' || !registrationResponse.user) {
        throw new Error('Failed to create user account');
      }

      console.log('✅ User account created:', registrationResponse.user.id);

      const magicLinkResponse = await api.startPasswordlessAuthentication(userData.email);

      if (!magicLinkResponse.success) {
        throw new Error('Failed to send verification email');
      }

      console.log('✅ Verification email sent');

      updateState({
        state: 'unauthenticated', // Not authenticated until email clicked
        user: null, // Not authenticated until email clicked
        apiError: null
      });

      return {
        success: true,
        user: registrationResponse.user,
        verificationRequired: true,
        message:
          'Registration successful! Check your email and click the verification link to complete setup.'
      };
    } catch (error: unknown) {
      console.error('❌ Individual user registration failed:', error);
      throw error;
    }
  }

  /**
   * Create account without passkey - Simple registration flow
   * Creates user account and sends email verification, no immediate authentication
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

    emit('registration_started', { email: userData.email });

    try {
      reportAuthState({
        event: 'registration-start',
        email: userData.email,
        context: {
          operation: 'createAccount',
          hasInvitationToken: !!userData.invitationToken,
          webauthnRequired: false
        }
      });

      // Create user account via API
      console.log('🔄 Creating user account without passkey...');
      const registrationResponse = await api.registerUser(userData);

      if (registrationResponse.step !== 'success' || !registrationResponse.user) {
        throw new Error('Failed to create user account');
      }

      console.log('✅ User account created:', registrationResponse.user.id);

      // Don't authenticate immediately, return the response for further processing
      // The calling component will handle the next steps (e.g., email verification)

      reportAuthState({
        event: 'registration-success',
        email: userData.email,
        userId: registrationResponse.user.id,
        duration: Date.now() - startTime,
        context: {
          operation: 'createAccount',
          authenticated: false,
          requiresEmailVerification: true
        }
      });

      emit('registration_success', {
        user: registrationResponse.user,
        requiresVerification: true
      });

      return registrationResponse;
    } catch (error: unknown) {
      const errorWithCode = error as Error & { code?: string };
      const authError: AuthError = {
        code: errorWithCode?.code || 'account_creation_failed',
        message: errorWithCode?.message || 'Failed to create user account'
      };

      reportAuthState({
        event: 'registration-failure',
        email: userData.email,
        error: authError.message,
        duration: Date.now() - startTime,
        context: {
          operation: 'createAccount',
          errorCode: errorWithCode?.code
        }
      });

      emit('registration_error', { error: authError });
      throw authError;
    }
  }

  /**
   * BROKEN: Create account with passkey - Enhanced registration flow
   * For now, this is an enhanced version of registerUser with better error handling
   * TODO: Implement full WebAuthn integration when API endpoints are confirmed
   */
  // biome-ignore lint/correctness/noUnusedVariables: Broken function kept for reference
  async function createAccountBroken(userData: {
    email: string;
    firstName?: string;
    lastName?: string;
    acceptedTerms: boolean;
    acceptedPrivacy: boolean;
    invitationToken?: string;
  }): Promise<SignInResponse & { emailVerifiedViaInvitation?: boolean }> {
    const startTime = Date.now();

    emit('registration_started', { email: userData.email });

    try {
      // Check WebAuthn support first
      if (!isWebAuthnSupported()) {
        throw new Error(
          'Passkey authentication is not supported on this device. Please use a device with biometric authentication.'
        );
      }

      const platformAvailable = browser
        ? await isPlatformAuthenticatorAvailable()
        : false;
      if (!platformAvailable) {
        throw new Error(
          'No biometric authentication available. Please ensure Touch ID, Face ID, or Windows Hello is set up on your device.'
        );
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
      const credential = await createCredential(registrationOptions);

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
          apiError: null
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

        console.log(
          '✅ Account creation completed with WebAuthn device registration and session saved'
        );
      } else {
        console.warn(
          '⚠️ Account creation completed but no accessToken from WebAuthn verification - session not saved'
        );
        // Still update state but without authentication
        updateState({
          state: 'unauthenticated',
          user: null,
          accessToken: null,
          refreshToken: null,
          expiresAt: null,
          apiError: null
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
      const errorWithCode = error as Error & { code?: string; name?: string };
      const authError: AuthError = {
        code: errorWithCode?.code || 'account_creation_failed',
        message: errorWithCode?.message || 'Account creation failed'
      };

      // Enhanced error handling for WebAuthn-specific errors
      if (errorWithCode?.name === 'NotAllowedError') {
        authError.message =
          'Passkey creation was cancelled. Please try again and allow the passkey creation when prompted.';
      } else if (errorWithCode?.name === 'NotSupportedError') {
        authError.message =
          'Passkey authentication is not supported on this device. Please use a device with biometric authentication.';
      } else if (errorWithCode?.name === 'SecurityError') {
        authError.message =
          'Security error during passkey creation. Please ensure you are using HTTPS and try again.';
      } else if (errorWithCode?.name === 'InvalidStateError') {
        authError.message =
          'A passkey for this account may already exist. Please try signing in instead.';
      }

      reportAuthState({
        event: 'registration-failure',
        email: userData.email,
        error: authError.message,
        duration: Date.now() - startTime,
        context: {
          operation: 'createAccount',
          errorName: errorWithCode?.name,
          errorCode: errorWithCode?.code
        }
      });

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
    invitationOptions?: {
      token: string;
      tokenData?: InvitationTokenData;
      skipTokenValidation?: boolean;
    }
  ) {
    try {
      const result = await api.checkEmail(email);

      // Base user check result
      const userCheck = {
        exists: result.exists,
        hasPasskey: result.hasWebAuthn,
        hasWebAuthn: result.hasWebAuthn,
        userId: result.userId,
        requiresPasskeySetup: false,
        registrationMode: 'sign_in' as const
      };

      // If no invitation token, return basic result
      if (!invitationOptions?.token) {
        return userCheck;
      }

      // If user exists but no passkey, and invitation token is provided
      if (result.exists && !result.hasWebAuthn && invitationOptions.token) {
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
      const { decodeInvitationToken, validateInvitationToken, extractRegistrationData } =
        await import('../utils/invitation-tokens');

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
      const userCheck = await checkUserWithInvitation(
        email,
        invitationToken
          ? {
              token: invitationToken,
              tokenData: tokenData || undefined,
              skipTokenValidation: false
            }
          : undefined
      );

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
            message:
              'Your account exists but needs a passkey for secure access. Please create your passkey.'
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
      if (!(await isConditionalMediationSupported())) {
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
          expiresAt: response.expiresIn ? Date.now() + response.expiresIn * 1000 : null,
          apiError: null
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
      const errorWithMessage = error as Error;
      console.log(
        '⚠️ Conditional authentication failed (this is expected if no passkeys exist):',
        errorWithMessage?.message
      );

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
    return (
      config.applicationContext || {
        userType: 'mixed',
        forceGuestMode: true
      }
    );
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

      // Update storage configuration
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
  async function migrateSession(
    fromType: StorageType,
    toType: StorageType
  ): Promise<SessionMigrationResult> {
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

      // Update storage configuration for migration
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

    clearApiError(); // Clear errors but don't change state
    emit('app_email_started', { email, appCode: getEffectiveAppCode() });

    try {
      console.log('📧 Starting app email sign-in:', {
        email,
        appCode: getEffectiveAppCode(),
        apiBaseUrl: config.apiBaseUrl
      });

      const response = await api.sendAppEmailCode(email);

      // Handle case where response is undefined (testing scenarios)
      if (!response) {
        throw new Error('No response received from email code API');
      }

      emit('app_email_sent', {
        email,
        success: response.success,
        timestamp: response.timestamp
      });

      updateState({ state: 'unauthenticated', apiError: null });

      return response;
    } catch (error: unknown) {
      console.error('App email sign-in failed:', error);

      const errorWithCode = error as Error & { code?: string };
      const authError: AuthError = {
        code:
          error instanceof Error && 'code' in error
            ? errorWithCode.code || 'UNKNOWN_ERROR'
            : 'UNKNOWN_ERROR',
        message: error instanceof Error ? error.message : 'Failed to send email code',
        timestamp: new Date().toISOString()
      };

      emit('app_email_error', { error: authError, email });
      reportApiError(`/${getEffectiveAppCode()}/send-email`, 'POST', 0, authError.message, {
        email,
        appCode: getEffectiveAppCode()
      });

      throw error;
    }
  }

  /**
   * Verify email code using organization-based authentication
   * Uses /{appCode}/verify-email endpoint for unified registration/login
   */
  async function verifyAppEmailCode(code: string): Promise<SignInResponse> {
    // If appCode is not configured, this shouldn't be called since sendEmailCode would use magic link
    if (!getEffectiveAppCode()) {
      throw new Error(
        'Email code verification is only available with organization configuration. This email uses magic link authentication instead.'
      );
    }

    const currentState = get(store);
    emit('app_email_verify_started', { email: currentState.email, appCode: getEffectiveAppCode() });

    try {
      console.log('🔍 Verifying app email code:', {
        email: currentState.email,
        appCode: getEffectiveAppCode(),
        hasCode: !!code
      });

      const response = await api.verifyAppEmailCode(currentState.email, code);

      if (response.step === 'success' && response.user && response.accessToken) {
        saveAuthSession(response, 'email-code');
        updateState({
          state: 'authenticated',
          user: response.user,
          accessToken: response.accessToken,
          refreshToken: response.refreshToken,
          expiresAt: response.expiresIn ? Date.now() + response.expiresIn * 1000 : null,
          apiError: null
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
          expiresAt: response.expiresIn
            ? Date.now() + response.expiresIn * 1000
            : Date.now() + 24 * 60 * 60 * 1000, // Default 24h
          lastActivity: Date.now()
        };
        sendSignInEvent({ type: 'PIN_VERIFIED', session: sessionData });

        return response;
      }
      throw new Error('Invalid response from email code verification');
    } catch (error: unknown) {
      console.error('Organization email code verification failed:', error);

      const errorWithCode = error as Error & { code?: string };
      const authError: AuthError = {
        code:
          error instanceof Error && 'code' in error
            ? errorWithCode.code || 'VERIFICATION_FAILED'
            : 'VERIFICATION_FAILED',
        message: error instanceof Error ? error.message : 'Failed to verify email code',
        timestamp: new Date().toISOString()
      };

      emit('app_email_verify_error', { error: authError, email: currentState.email });
      reportApiError(`/${getEffectiveAppCode()}/verify-email`, 'POST', 0, authError.message, {
        email: currentState.email,
        appCode: getEffectiveAppCode(),
        code: '***'
      });

      throw error;
    }
  }

  // Auto-initialize when store is created
  if (browser) {
    initialize();
  }

  function getPinEntryButtonConfig(loading: boolean): ButtonConfig {
    const pinEntryConfig = {
      primary: {
        method: 'email-code' as const,
        textKey: 'code.verify',
        loadingTextKey: 'code.verifying',
        disabled: loading, // Component will handle emailCode validation
        supportsWebAuthn: false
      },
      secondary: {
        method: 'generic' as const,
        textKey: 'action.useDifferentEmail',
        loadingTextKey: '',
        disabled: loading,
        supportsWebAuthn: false
      }
    };
    console.log('🔘 Button config - pinEntry state:', {
      loading,
      primaryDisabled: pinEntryConfig.primary.disabled,
      secondaryDisabled: pinEntryConfig.secondary?.disabled
    });
    return pinEntryConfig;
  }

  function getEmailCodeOnlyButtonConfig({
    email,
    loading,
    signInState,
    userExists,
    fullName
  }: AuthStore): ButtonConfig {
    // Button disabled state logic
    let isDisabled = !email || !email?.trim() /* || loading*/;
    console.log('🔘 Button disabled - initial check:', {
      loading,
      signInState,
      initialDisabled: isDisabled
    });

    switch (signInState) {
      case 'emailEntry':
        isDisabled = true;
        console.log('🔘 Button disabled - emailEntry state: always disabled');
        break;
      case 'userChecked':
        if (config.signInMode === 'login-only') {
          isDisabled = !userExists;
        } else {
          isDisabled = userExists ? false : !fullName || fullName.trim().length < 3;
        }
        console.log('🔘 Button disabled - userChecked state:', {
          fullName,
          fullNameTrimmed: fullName?.trim(),
          fullNameLength: fullName?.trim().length,
          disabled: isDisabled
        });
        break;
      default:
        console.log('🔘 Button disabled - other state:', { signInState, disabled: isDisabled });
    }

    const emailCodeOnlyConfig = {
      primary: {
        method: 'email-code' as const,
        textKey: 'auth.sendPinByEmail',
        loadingTextKey: 'auth.sendingPin',
        disabled: isDisabled || loading,
        supportsWebAuthn: false
      },
      secondary: null
    };
    console.log('🔘 Button config - emailCodeOnly state:', {
      loading,
      primaryDisabled: emailCodeOnlyConfig.primary.disabled
    });
    return emailCodeOnlyConfig;
  }

  function getPasskeyButtonConfig(
    config: AuthConfig,
    { email, signInState, fullName, loading, userExists }: AuthStore
  ): ButtonConfig {
    const isDisabled = !email || !email?.trim() || loading || !userExists;

    let secondary: SingleButtonConfig | undefined;
    if (config.enableMagicLinks) {
      secondary = {
        method: 'magic-link',
        textKey: 'auth.sendMagicLink',
        loadingTextKey: 'auth.sendingMagicLink',
        supportsWebAuthn: true,
        disabled: isDisabled
      };
    } else {
      secondary = {
        method: 'email-code',
        textKey: 'auth.sendPinByEmail',
        loadingTextKey: 'auth.sendingPin',
        supportsWebAuthn: true,
        disabled: isDisabled
      };
    }

    const buttonConfig: ButtonConfig = {
      primary: {
        method: 'passkey',
        textKey: 'auth.signInWithPasskey',
        loadingTextKey: 'auth.authenticating',
        supportsWebAuthn: true,
        disabled: isDisabled
      },
      secondary
    };
    console.log('🔘 Button config - final result:', {
      signInState,
      email,
      fullName,
      loading,
      primaryMethod: buttonConfig.primary.method,
      primaryTextKey: buttonConfig.primary.textKey,
      primaryDisabled: buttonConfig.primary.disabled,
      secondaryDisabled: buttonConfig.secondary?.disabled,
      hasSecondary: !!buttonConfig.secondary
    });

    return buttonConfig;
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
    notifyPinSent: () => {
      // Consolidate all PIN sent logic here
      updateState({ emailCodeSent: true });
      return sendSignInEvent({ type: 'SENT_PIN_EMAIL' });
    },
    sendSignInEvent, // Expose for components to send custom events

    // Email-based authentication methods (transparently uses app endpoints if configured)
    sendEmailCode: signInWithAppEmail,
    verifyEmailCode: verifyAppEmailCode,

    // Dynamic role configuration methods
    getApplicationContext,
    updateStorageConfiguration,
    migrateSession,

    // Configuration access
    getConfig: () => config,
    updateConfig: (updates: Partial<AuthConfig>) => {
      // Update the config object
      Object.assign(config, updates);
      console.log('⚙️ Auth config updated:', { updates, newConfig: config });
    },

    // UI Configuration (state-aware)
    getButtonConfig: (): ButtonConfig => {
      const currentState = get(store);
      const { loading, userExists, hasPasskeys, passkeysEnabled, signInState } = currentState;

      // Handle pinEntry state with specific button configs
      // Note: emailCode validation is handled at component level since it's transient input
      if (signInState === 'pinEntry') {
        return getPinEntryButtonConfig(loading);
      }

      // Smart button logic based on user state
      if (userExists && hasPasskeys && passkeysEnabled) {
        return getPasskeyButtonConfig(config, currentState);
      }
      return getEmailCodeOnlyButtonConfig(currentState);
    },

    // State message configuration (state-aware)
    getStateMessageConfig: (): StateMessageConfig | null => {
      const currentState = get(store);
      const { signInState, userExists, emailCodeSent, hasValidPin } = currentState;
      const signInMode = config.signInMode || 'login-or-register';

      switch (signInState) {
        case 'userChecked':
          if (!userExists && signInMode === 'login-only') {
            return {
              type: 'info',
              textKey: 'auth.onlyRegisteredUsers',
              showIcon: true
            };
          }
          return null;

        case 'pinEntry':
          if (emailCodeSent && !hasValidPin) {
            return {
              type: 'success',
              textKey: 'status.emailSent',
              showIcon: true
            };
          }
          if (hasValidPin) {
            return {
              type: 'info',
              textKey: 'status.pinDetected',
              showIcon: true
            };
          }
          return null;

        case 'emailVerification':
          return {
            type: 'info',
            textKey: 'registration.required',
            showIcon: true
          };

        default:
          return null;
      }
    },

    // Explainer configuration (state-aware)
    getExplainerConfig: (explainFeatures = true): ExplainerConfig | null => {
      const currentState = get(store);
      const { signInState, userExists, hasPasskeys, hasValidPin } = currentState;

      // Only show explainer during email entry and user checked states
      if (signInState !== 'emailEntry' && signInState !== 'userChecked') {
        return null;
      }

      // Determine if we should show features list or paragraph
      const shouldShowFeatures =
        explainFeatures !== undefined
          ? explainFeatures
          : userExists === true && (hasPasskeys || hasValidPin);

      if (shouldShowFeatures) {
        // Show features list when user exists and has advanced auth methods
        const features = [];

        if (hasPasskeys) {
          features.push({
            iconName: 'Lock',
            textKey: 'explainer.features.securePasskey',
            iconWeight: 'duotone' as const
          });
        }

        features.push({
          iconName: 'Shield',
          textKey: 'explainer.features.privacyCompliant',
          iconWeight: 'duotone' as const
        });

        if (config.branding?.companyName) {
          features.push({
            iconName: 'BadgeCheck',
            textKey: 'explainer.features.employeeVerification',
            iconWeight: 'duotone' as const
          });
        } else {
          features.push({
            iconName: 'UserCheck',
            textKey: 'explainer.features.userVerification',
            iconWeight: 'duotone' as const
          });
        }

        return {
          type: 'features',
          features,
          className: 'explainer-features-list'
        };
      }
      // Show paragraph for new users or simple auth scenarios
      let textKey: string;

      if (config.branding?.companyName) {
        if (config.appCode) {
          textKey = 'security.passwordlessWithPin';
        } else {
          textKey = 'security.passwordlessExplanation';
        }
      } else {
        if (config.appCode) {
          textKey = 'security.passwordlessWithPinGeneric';
        } else {
          textKey = 'security.passwordlessGeneric';
        }
      }

      return {
        type: 'paragraph',
        textKey,
        iconName: 'Lock',
        iconWeight: 'duotone' as const,
        useCompanyName: !!config.branding?.companyName,
        companyName: config.branding?.companyName,
        className: 'explainer-paragraph'
      };
    },

    // Direct UI state setters
    setEmail: (email: string) => {
      store.update((state) => {
        // Reset user discovery state when email changes
        const emailChanged = state.email !== email;
        if (emailChanged) {
          return {
            ...state,
            email,
            // Reset user discovery state only
            userExists: null,
            hasPasskeys: false,
            hasValidPin: false,
            pinRemainingMinutes: 0,
            // Only reset sign-in state to emailEntry if we were in userChecked
            // Other states (like pinEntry) should remain unchanged
            signInState: state.signInState === 'userChecked' ? 'emailEntry' : state.signInState
          };
        }
        return { ...state, email };
      });
    },

    setFullName: (name: string) => {
      store.update((s) => ({ ...s, fullName: name }));
    },

    setLoading: (loading: boolean) => {
      store.update((s) => ({ ...s, loading }));
    },

    setConditionalAuthActive: (active: boolean) => {
      store.update((s) => ({ ...s, conditionalAuthActive: active }));
    },

    setEmailCodeSent: (sent: boolean) => {
      store.update((s) => ({ ...s, emailCodeSent: sent }));
    },

    // Error management methods
    setApiError,
    clearApiError,
    retryLastFailedRequest,

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
    user: derived(authStore, ($auth) => $auth.user),
    isAuthenticated: derived(authStore, ($auth) => $auth.state === 'authenticated'),
    isLoading: derived(authStore, () => false), // No loading state exists
    apiError: derived(authStore, ($auth) => $auth.apiError),

    // Sign-in state derived stores
    signInState: derived(authStore, ($auth) => $auth.signInState),
    isEmailEntry: derived(authStore, ($auth) => $auth.signInState === 'emailEntry'),
    isUserChecked: derived(authStore, ($auth) => $auth.signInState === 'userChecked'),
    isPasskeyPrompt: derived(authStore, ($auth) => $auth.signInState === 'passkeyPrompt'),
    isPinEntry: derived(authStore, ($auth) => $auth.signInState === 'pinEntry'),
    isSignedIn: derived(authStore, ($auth) => $auth.signInState === 'signedIn'),
    hasSignInError: derived(authStore, ($auth) => $auth.signInState === 'generalError')
  };
}
