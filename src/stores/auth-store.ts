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

// Storage keys
const STORAGE_KEYS = {
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

  // Initialize API client and state machine
  const api = new AuthApiClient(config);
  const stateMachine = new AuthStateMachine(api, config);

  // Initialize with stored values (legacy support)
  const storedUser = browser ? localStorage.getItem(STORAGE_KEYS.USER) : null;
  const storedAccessToken = browser ? localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN) : null;
  const storedRefreshToken = browser ? localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN) : null;
  const storedExpiresAt = browser ? localStorage.getItem(STORAGE_KEYS.EXPIRES_AT) : null;

  const initialState: AuthStore = {
    state: storedAccessToken && storedUser ? 'authenticated' : 'unauthenticated',
    user: storedUser ? JSON.parse(storedUser) : null,
    accessToken: storedAccessToken,
    refreshToken: storedRefreshToken,
    expiresAt: storedExpiresAt ? parseInt(storedExpiresAt) : null,
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
   * Save tokens to localStorage
   */
  function saveTokens(response: SignInResponse) {
    if (!browser) return;

    if (response.accessToken) {
      localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, response.accessToken);
    }
    
    if (response.refreshToken) {
      localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, response.refreshToken);
    }
    
    if (response.expiresIn) {
      const expiresAt = Date.now() + (response.expiresIn * 1000);
      localStorage.setItem(STORAGE_KEYS.EXPIRES_AT, expiresAt.toString());
    }
    
    if (response.user) {
      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(response.user));
    }
  }

  /**
   * Clear stored tokens
   */
  function clearTokens() {
    if (!browser) return;

    localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.EXPIRES_AT);
    localStorage.removeItem(STORAGE_KEYS.USER);
  }

  /**
   * Check if token is expired
   */
  function isTokenExpired(): boolean {
    const currentState = get(store);
    if (!currentState.expiresAt) return true;
    return Date.now() >= currentState.expiresAt;
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
        saveTokens(response);
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
      // Get challenge from server
      const challenge = await api.getPasskeyChallenge(email);

      // Authenticate with passkey
      const credential = await authenticateWithPasskey(challenge, conditional);
      const serializedCredential = serializeCredential(credential);

      // Complete authentication
      const response = await api.signInWithPasskey({
        email,
        challengeId: challenge.challenge,
        credential: serializedCredential
      });

      if (response.step === 'success' && response.user && response.accessToken) {
        saveTokens(response);
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
          event: 'webauthn-success',
          email,
          userId: response.user.id,
          authMethod: 'passkey',
          duration: Date.now() - startTime,
          context: { conditional }
        });
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
        saveTokens(response);
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
      clearTokens();
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
        saveTokens(response);
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
   * Check if user is authenticated
   */
  function isAuthenticated(): boolean {
    const currentState = get(store);
    return currentState.state === 'authenticated' && 
           !!currentState.accessToken && 
           !isTokenExpired();
  }

  /**
   * Get current access token
   */
  function getAccessToken(): string | null {
    const currentState = get(store);
    return isAuthenticated() ? currentState.accessToken : null;
  }

  /**
   * Reset store to initial state
   */
  function reset(): void {
    clearTokens();
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
        userId: undefined // API client doesn't return userId yet
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
  }): Promise<SignInResponse> {
    const startTime = Date.now();

    updateState({ state: 'loading', error: null });
    emit('registration_started', { email: userData.email });

    try {
      reportAuthState({
        event: 'registration-start',
        email: userData.email,
        context: { operation: 'registerUser' }
      });

      const response = await api.registerUser(userData);

      if (response.step === 'success' && response.user && response.accessToken) {
        saveTokens(response);
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

      // Complete authentication with server
      const response = await api.signInWithPasskey({
        email,
        challengeId: challenge.challenge,
        credential: serializedCredential
      });

      if (response.step === 'success' && response.user && response.accessToken) {
        console.log('✅ Conditional WebAuthn authentication successful');

        // Update auth state
        saveTokens(response);
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