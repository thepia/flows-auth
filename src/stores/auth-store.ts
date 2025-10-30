/**
 * Main Auth Store Composition
 *
 * Composes all modular stores into a unified auth system:
 * - Creates and connects all individual stores
 * - Provides unified API similar to original auth store
 * - Handles cross-store communication and events
 * - Framework-agnostic with adapter support
 */

import type {
  ApplicationContext,
  AuthConfig,
  AuthEvents,
  AuthStoreFunctions,
  SessionData,
  SignInData,
  StorageConfigurationUpdate
} from '../types';
import type { AuthEventData, AuthEventType, StoreOptions } from './types';

// Core stores
import { authenticateUser, createAuthCoreStore } from './core/auth-core';
import { createLocalStorageAdapter } from './core/database';
import { createErrorStore } from './core/error';
import { createEventStore, createTypedEventEmitters } from './core/events';
import {
  convertSessionUserToUser,
  createSessionData,
  createSessionStore,
  getCurrentSession
} from './core/session';

// Feature stores
import { createEmailAuthStore, createPasskeyStore } from './auth-methods';
import { createOnboardingStore } from './onboarding-store';

// UI stores
import { createUIEventHandlers, createUIStore, signInStateTransitions } from './ui/ui-state';

// API client
import { AuthApiClient } from '../api/auth-api';

// Telemetry
import { initializeTelemetry, reportAuthState, reportSessionEvent } from '../utils/telemetry';

/**
 * Composed auth store interface - provides unified API
 */
export interface ComposedAuthStore extends AuthStoreFunctions {
  // Individual store access
  core: ReturnType<typeof createAuthCoreStore>;
  session: ReturnType<typeof createSessionStore>;
  error: ReturnType<typeof createErrorStore>;
  events: ReturnType<typeof createEventStore>;
  passkey: ReturnType<typeof createPasskeyStore>;
  email: ReturnType<typeof createEmailAuthStore>;
  ui: ReturnType<typeof createUIStore>;
  onboarding: ReturnType<typeof createOnboardingStore>;

  // API client access
  api: AuthApiClient;

  // Event methods
  emit: <K extends keyof AuthEvents>(type: K, data: AuthEvents[K]) => void;

  // Dynamic role configuration methods
  getApplicationContext: () => ApplicationContext | null;
  updateStorageConfiguration: (update: StorageConfigurationUpdate) => Promise<void>;

  // Cleanup
  destroy: () => void;
}

/**
 * Create the composed auth store system
 *
 * @param config - Auth configuration
 * @param apiClient - Optional API client for dependency injection (primarily for testing)
 */
export function createAuthStore(config: AuthConfig, apiClient?: AuthApiClient): ComposedAuthStore {
  // Create shared API client - use injected one or create new
  const api = apiClient || new AuthApiClient(config);

  // Create database adapter - use provided or default to localStorage
  const db = config.database || createLocalStorageAdapter(config);

  const storeOptions: StoreOptions = {
    api,
    config,
    db,
    devtools: config.enableDevtools || false
  };

  const core = createAuthCoreStore({ ...storeOptions, name: 'auth-core' });
  const session = createSessionStore({ ...storeOptions, name: 'session' });
  const error = createErrorStore({ ...storeOptions, name: 'error' });
  const events = createEventStore({ ...storeOptions, name: 'events' });
  const passkey = createPasskeyStore({ ...storeOptions, name: 'passkey' });
  const email = createEmailAuthStore({ ...storeOptions, name: 'email-auth' });
  const ui = createUIStore({ ...storeOptions, name: 'ui' });
  const onboarding = createOnboardingStore({ ...storeOptions, name: 'onboarding' });

  // Create event emitters for type-safe events
  const eventEmitters = createTypedEventEmitters(events);

  // Create UI event handlers that coordinate between stores
  const uiHandlers = createUIEventHandlers(ui, {
    emailStore: email,
    passkeyStore: passkey,
    eventStore: events
  });

  // Initialize telemetry
  initializeTelemetry(api, config);

  // Trigger async session initialization directly using db adapter
  // Store remains synchronous, but session restoration happens asynchronously
  db.loadSession()
    .then(async (sessionData) => {
      if (!sessionData) {
        console.log('ℹ️ No existing session found');
        return;
      }

      const isExpired = sessionData.expiresAt <= Date.now();
      const hasRefreshToken = !!sessionData.refreshToken;

      // Log session restoration details for debugging "already exchanged" errors
      reportSessionEvent('RESTORE', {
        userId: sessionData.userId,
        refreshTokenPrefix: sessionData.refreshToken
          ? `${sessionData.refreshToken.substring(0, 8)}...`
          : 'none',
        isExpired,
        hasRefreshToken,
        expiresAt: new Date(sessionData.expiresAt).toISOString(),
        refreshedAt: sessionData.refreshedAt
          ? new Date(sessionData.refreshedAt).toISOString()
          : 'never',
        timeSinceLastRefresh: sessionData.refreshedAt
          ? Date.now() - sessionData.refreshedAt
          : 'never',
        tabId: typeof window !== 'undefined' ? window.name || 'unnamed' : 'unknown'
      });

      if (!isExpired) {
        // Access token is still valid - restore session normally
        reportSessionEvent('RESTORE_VALID', { userId: sessionData.userId });

        // Convert SessionData to User format
        const user = {
          id: sessionData.userId,
          email: sessionData.email,
          name: sessionData.name,
          picture: undefined,
          emailVerified: sessionData.emailVerified ?? true,
          createdAt: new Date().toISOString(),
          metadata: sessionData.metadata
        };

        const tokens = {
          access_token: sessionData.accessToken,
          refresh_token: sessionData.refreshToken,
          expiresAt: sessionData.expiresAt,
          supabase_token: sessionData.supabaseToken,
          supabase_expires_at: sessionData.supabaseExpiresAt
        };

        authenticateUser(core, user, tokens);
        signInStateTransitions.authenticationSuccess(ui);
        session.getState().updateLastActivity();
      } else if (hasRefreshToken) {
        // Access token expired but we have a refresh token - restore and refresh
        console.log('🔄 Restoring expired session with refresh token, triggering refresh...');

        // First restore the session with expired token
        const user = {
          id: sessionData.userId,
          email: sessionData.email,
          name: sessionData.name,
          picture: undefined,
          emailVerified: sessionData.emailVerified ?? true,
          createdAt: new Date().toISOString(),
          metadata: sessionData.metadata
        };

        const tokens = {
          access_token: sessionData.accessToken,
          refresh_token: sessionData.refreshToken,
          expiresAt: sessionData.expiresAt,
          supabase_token: sessionData.supabaseToken,
          supabase_expires_at: sessionData.supabaseExpiresAt
        };

        authenticateUser(core, user, tokens);
        signInStateTransitions.authenticationSuccess(ui);
        session.getState().updateLastActivity();

        // Immediately trigger token refresh
        try {
          await core.getState().refreshTokens();
          console.log('✅ Token refresh successful after session restore');
        } catch (error) {
          console.error('❌ Token refresh failed after session restore:', error);
          // If refresh fails, sign out
          core.getState().signOut();
        }
      } else {
        console.log('ℹ️ Session expired with no refresh token - clearing');
        await db.clearSession();
      }
    })
    .catch((error) => {
      console.error('❌ Session initialization failed:', error);
    });

  // Set up cross-store communication
  setupCrossStoreIntegration();

  function setupCrossStoreIntegration() {
    console.log('🔗 Setting up cross-store integration...');

    // Listen for authentication success events
    events.getState().on('sign_in_success', (data) => {
      console.log('🎯 Sign-in success event received:', data);

      // Update UI state
      signInStateTransitions.authenticationSuccess(ui);

      // Save session if we have user and tokens
      if (data.user && data.tokens) {
        const sessionData = createSessionData(data.user, data.tokens, data.method || 'passkey');
        session.getState().saveSession(sessionData);
      }
    });

    // Listen for sign-out events
    events.getState().on('sign_out', () => {
      console.log('🎯 Sign-out event received');

      // Report sign-out event
      reportAuthState({
        event: 'sign-out'
      });

      // Clear all stores
      core.getState().reset(); // Reset core auth state
      session.getState().clearSession();
      ui.getState().resetUIState();
      error.getState().clearApiError();
      passkey.getState().reset();
      email.getState().reset();
      onboarding.getState().reset();
    });

    // Listen for errors and update error store
    events.getState().on('sign_in_error', (data) => {
      console.log('🎯 Sign-in error event received:', data);

      if (data.error) {
        error.getState().setApiError(data.error, {
          method: data.method,
          email: ui.getState().email
        });
      }
    });

    console.log('✅ Cross-store integration setup complete');
  }

  // Create the composed store object
  const composedStore: ComposedAuthStore = {
    core,
    session,
    error,
    events,
    passkey,
    email,
    ui,
    onboarding,
    api,

    // Core authentication methods (moved from api wrapper)
    signInWithPasskey: async (emailAddress: string, conditional = false) => {
      try {
        eventEmitters.signInStarted({ method: 'passkey', email: emailAddress });

        // TODO set loading, and clear it upon completion
        const signInData = await passkey.getState().signIn(emailAddress, conditional);

        // Save session directly - already in SignInData format
        session.getState().saveSession(signInData);

        // Update core auth state from session data
        authenticateUser(core, convertSessionUserToUser(signInData.user), {
          access_token: signInData.tokens.accessToken as string,
          refresh_token: signInData.tokens.refreshToken,
          expiresAt: signInData.tokens.expiresAt as number | null,
          supabase_token: signInData.tokens.supabaseToken,
          supabase_expires_at: signInData.tokens.supabaseExpiresAt
        });

        // Emit success event
        eventEmitters.signInSuccess({
          user: convertSessionUserToUser(signInData.user),
          method: 'passkey'
        });

        return signInData;
      } catch (err) {
        eventEmitters.signInError({
          error: { code: 'passkey_failed', message: (err as Error).message },
          method: 'passkey'
        });
        throw err;
      }
    },

    signInWithMagicLink: async (emailAddress: string) => {
      try {
        eventEmitters.signInStarted({ method: 'magic-link', email: emailAddress });

        // TODO set loading, and clear it upon completion
        // Send magic link (returns null - user needs to click link)
        await email.getState().sendMagicLink(emailAddress);

        signInStateTransitions.emailCodeSent(ui); // Do this for now. TODO consider magicLinkSent()

        // Magic link doesn't return auth data immediately
        // User needs to click the link in their email
        return null;
      } catch (err) {
        eventEmitters.signInError({
          error: { code: 'magic_link_failed', message: (err as Error).message },
          method: 'magic-link'
        });
        throw err;
      }
    },

    sendEmailCode: async (emailAddress: string) => {
      try {
        eventEmitters.signInStarted({ method: 'email-code', email: emailAddress });

        // TODO set loading, and clear it upon completion
        const response = await email.getState().sendCode(emailAddress);

        if (response.success) {
          signInStateTransitions.emailCodeSent(ui);
        }

        return {
          success: response.success,
          message: response.message || 'Email code sent',
          timestamp: Date.now()
        };
      } catch (err) {
        eventEmitters.signInError({
          error: { code: 'email_failed', message: (err as Error).message },
          method: 'email-code'
        });
        throw err;
      }
    },

    verifyEmailCode: async (code: string) => {
      // Clear UI error before attempting verification (keeps apiError for debugging)
      error.getState().clearUiError();
      ui.getState().setLoading(true);
      try {
        const emailAddress = ui.getState().email;
        const signInData = await email.getState().verifyCode(emailAddress, code);

        // Update core auth state - authenticateUser will save the session via updateTokens()
        authenticateUser(core, convertSessionUserToUser(signInData.user), {
          access_token: signInData.tokens.accessToken as string,
          refresh_token: signInData.tokens.refreshToken,
          expiresAt: signInData.tokens.expiresAt as number | null,
          supabase_token: signInData.tokens.supabaseToken,
          supabase_expires_at: signInData.tokens.supabaseExpiresAt
        });

        eventEmitters.signInSuccess({
          user: convertSessionUserToUser(signInData.user),
          method: 'email-code'
        });

        ui.getState().setLoading(false);
        return signInData;
      } catch (err) {
        ui.getState().setLoading(false);

        // Set API error for display in UI
        error.getState().setApiError(err, {
          method: 'verifyEmailCode',
          email: ui.getState().email
        });

        // Extract message from error (handle both Error instances and plain objects)
        const errorMessage =
          err instanceof Error
            ? err.message
            : err && typeof err === 'object' && 'message' in err
              ? String((err as any).message)
              : String(err);

        eventEmitters.signInError({
          error: { code: 'verification_failed', message: errorMessage },
          method: 'email-code'
        });
        throw err;
      }
    },

    signOut: async () => {
      await core.getState().signOut();
      eventEmitters.signOut({ reason: 'user_action' });
    },

    refreshTokens: async () => {
      // CRITICAL: Load session data from database first to ensure we use the latest refresh token
      // In multi-tab scenarios, the in-memory refresh token might be stale
      let sessionDataFromDb: SessionData | null = null;
      try {
        sessionDataFromDb = await db.loadSession();
      } catch (error) {
        console.warn('Failed to load session from database before refresh:', error);
      }

      // If we have fresh session data from DB, use its refresh token and related expiry info
      if (sessionDataFromDb?.refreshToken) {
        const coreState = core.getState();
        // Update core store with the latest refresh token from DB before attempting refresh
        // Use direct state update to avoid triggering side effects like scheduling refresh
        if (coreState.refresh_token !== sessionDataFromDb.refreshToken) {
          console.log('📥 Using refresh token from database (more recent than in-memory)');
          core.setState({
            refresh_token: sessionDataFromDb.refreshToken,
            access_token: sessionDataFromDb.accessToken,
            expiresAt: sessionDataFromDb.expiresAt,
            refreshedAt: sessionDataFromDb.refreshedAt,
            supabase_token: sessionDataFromDb.supabaseToken,
            supabase_expires_at: sessionDataFromDb.supabaseExpiresAt
          });
        }
      }

      await core.getState().refreshTokens();

      // CRITICAL: Save new refresh token to localStorage to prevent "already exchanged" errors
      // After token refresh, we must persist the new tokens to avoid reusing old refresh token
      const coreState = core.getState();
      if (coreState.user && coreState.access_token) {
        // Get existing session to preserve authMethod
        const existingSessionData = typeof window !== 'undefined' ? getCurrentSession() : null;

        const sessionData = {
          user: {
            id: coreState.user.id,
            email: coreState.user.email,
            name: coreState.user.name || coreState.user.email,
            initials: coreState.user.name
              ? coreState.user.name.charAt(0).toUpperCase()
              : coreState.user.email.charAt(0).toUpperCase(),
            preferences: coreState.user.metadata
          },
          tokens: {
            accessToken: coreState.access_token,
            refreshToken: coreState.refresh_token || '',
            refreshedAt: Date.now(),
            expiresAt: coreState.expiresAt || Date.now() + 24 * 60 * 60 * 1000,
            supabaseToken: coreState.supabase_token || undefined,
            supabaseExpiresAt: coreState.supabase_expires_at || undefined
          },
          authMethod: existingSessionData?.authMethod || ('passkey' as const)
        };

        session.getState().saveSession(sessionData);
      }
    },

    startConditionalAuthentication: async (emailAddress: string) => {
      // TODO: Implement conditional authentication
      console.warn('startConditionalAuthentication not yet implemented');
      return false;
    },

    // User management
    checkUser: async (emailAddress: string) => {
      const result = await email.getState().checkUser(emailAddress);

      ui.getState().userChecked({
        email: emailAddress,
        exists: result.exists,
        hasPasskey: result.hasWebAuthn,
        hasValidPin: result.hasValidPin || false,
        pinRemainingMinutes: result.pinRemainingMinutes || 0
      });

      return result;
    },

    checkUserWithInvitation: async (emailAddress: string, invitationOptions) => {
      // For now, delegate to regular checkUser and extend result
      const basicCheck = await email.getState().checkUser(emailAddress);

      // Enhanced result with invitation-specific properties
      return {
        ...basicCheck,
        hasPasskey: basicCheck.hasWebAuthn, // Alias for consistency
        invitationValid: true, // Stub implementation
        invitationTokenData: invitationOptions?.tokenData || null,
        requiresTermsAcceptance: !basicCheck.exists
      };
    },

    determineAuthFlow: async (emailAddress: string, invitationToken?: string) => {
      // Determine the appropriate authentication flow based on user state and invitation
      const userCheck = invitationToken
        ? await email.getState().checkUser(emailAddress) // Use basic check for now
        : await email.getState().checkUser(emailAddress);

      // Determine mode based on user state
      let mode: 'sign_in' | 'register' | 'complete_passkey';
      if (userCheck.exists) {
        mode = userCheck.hasWebAuthn ? 'sign_in' : 'complete_passkey';
      } else {
        mode = 'register';
      }

      return {
        flow: userCheck.exists ? 'sign-in' : 'register',
        mode,
        userExists: userCheck.exists,
        hasPasskeys: userCheck.hasWebAuthn || false,
        requiresInvitation: !!invitationToken,
        invitationValid: invitationToken ? true : undefined // Stub
      };
    },

    registerUser: async (userData: {
      email: string;
      firstName?: string;
      lastName?: string;
      acceptedTerms: boolean;
      acceptedPrivacy: boolean;
      invitationToken?: string;
    }) => {
      try {
        eventEmitters.registrationStarted({
          email: userData.email,
          method: 'passkey'
        });

        const response = await api.registerUser(userData);

        if (response.step === 'success' && response.user && response.access_token) {
          authenticateUser(core, response.user, {
            access_token: response.access_token,
            refresh_token: response.refresh_token,
            expiresAt: response.expires_in ? Date.now() + response.expires_in * 1000 : null,
            supabase_token: response.supabase_token,
            supabase_expires_at: response.supabase_expires_at
          });

          const sessionData = createSessionData(
            response.user,
            {
              access_token: response.access_token,
              refresh_token: response.refresh_token,
              expires_in: response.expires_in,
              supabase_token: response.supabase_token,
              supabase_expires_at: response.supabase_expires_at
            },
            'passkey'
          );
          session.getState().saveSession(sessionData);

          eventEmitters.registrationSuccess({
            user: response.user,
            requiresVerification: false
          });
        }

        return response;
      } catch (err) {
        eventEmitters.registrationError({
          error: { code: 'registration_failed', message: (err as Error).message }
        });
        throw err;
      }
    },

    createAccount: async (userData: {
      email: string;
      firstName?: string;
      lastName?: string;
      acceptedTerms: boolean;
      acceptedPrivacy: boolean;
      invitationToken?: string;
    }) => {
      try {
        eventEmitters.registrationStarted({
          email: userData.email,
          method: 'email-code'
        });

        const response = await api.registerUser(userData);

        if (response.step === 'success' && response.user) {
          eventEmitters.registrationSuccess({
            user: response.user,
            requiresVerification: true
          });
        }

        return response;
      } catch (err) {
        eventEmitters.registrationError({
          error: { code: 'registration_failed', message: (err as Error).message }
        });
        throw err;
      }
    },

    registerIndividualUser: async (userData: {
      email: string;
      firstName?: string;
      lastName?: string;
      acceptedTerms: boolean;
      acceptedPrivacy: boolean;
    }) => {
      // TODO: Implement individual user registration
      throw new Error('registerIndividualUser not yet implemented');
    },

    // State management
    initialize: () => {
      // Already initialized in createAuthStore
    },

    reset: () => uiHandlers.handleReset(),

    isAuthenticated: () => core.getState().isAuthenticated(),
    getAccessToken: () => core.getState().getAccessToken(),

    getState: () => {
      const coreState = core.getState();
      const uiState = ui.getState();
      const errorState = error.getState();

      return {
        state: coreState.state,
        signInState: uiState.signInState,
        user: coreState.user,
        access_token: coreState.access_token,
        refresh_token: coreState.refresh_token,
        expiresAt: coreState.expiresAt,
        supabase_token: coreState.supabase_token,
        supabase_expires_at: coreState.supabase_expires_at,
        apiError: errorState.apiError,
        passkeysEnabled: coreState.passkeysEnabled,
        email: uiState.email,
        emailCode: uiState.emailCode,
        loading: uiState.loading,
        emailCodeSent: uiState.emailCodeSent,
        fullName: uiState.fullName,
        userExists: uiState.userExists,
        hasPasskeys: uiState.hasPasskeys,
        hasValidPin: uiState.hasValidPin,
        pinRemainingMinutes: uiState.pinRemainingMinutes,
        conditionalAuthActive: uiState.conditionalAuthActive,
        platformAuthenticatorAvailable: uiState.platformAuthenticatorAvailable
      };
    },

    // UI state setters
    setEmail: (email: string) => uiHandlers.handleEmailChange(email),
    setFullName: (name: string) => ui.getState().setFullName(name),
    setEmailCode: (code: string) => {
      // Clear UI error when user starts typing again (keeps apiError for debugging)
      if (error.getState().uiError) {
        error.getState().clearUiError();
      }
      ui.getState().setEmailCode(code);
    },
    setLoading: (loading: boolean) => ui.getState().setLoading(loading),
    setConditionalAuthActive: (active: boolean) => ui.getState().setConditionalAuthActive(active),
    setEmailCodeSent: (sent: boolean) => ui.getState().setEmailCodeSent(sent),

    // Error management
    setApiError: (err: unknown, context?: { method?: string; email?: string }) =>
      error.getState().setApiError(err, context),
    clearApiError: () => error.getState().clearApiError(),
    clearUiError: () => error.getState().clearUiError(),
    retryLastFailedRequest: () => error.getState().retryLastRequest(),

    // Events
    on: (event: AuthEventType, handler: (data: AuthEventData) => void) =>
      events.getState().on(event, handler),
    emit: <K extends keyof AuthEvents>(type: K, data: AuthEvents[K]) =>
      events.getState().emit(type, data),

    // Configuration access
    getConfig: () => config,
    updateConfig: (updates: Partial<AuthConfig>) => {
      // Update config object (shallow merge)
      Object.assign(config, updates);
      console.log('🔧 Config updated:', updates);
    },

    // Dynamic role configuration
    getApplicationContext: () => {
      return (
        config.applicationContext || {
          userType: 'mixed',
          forceGuestMode: true
        }
      );
    },

    updateStorageConfiguration: async (update) => {
      // Security check: require authentication for role upgrades
      if (!core.getState().isAuthenticated()) {
        throw new Error('Cannot update storage configuration: User not authenticated');
      }

      const currentState = core.getState();
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
        fromStorage: 'sessionStorage',
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

        console.log('✅ Storage configuration updated successfully');
      } catch (error: unknown) {
        console.error('❌ Storage configuration update failed:', error);
        throw error;
      }
    },

    // SignIn flow control methods
    notifyPinSent: () => {
      const uiState = ui.getState();
      uiState.setSignInState('pinEntry');
      uiState.setEmailCodeSent(true);

      // updateState({ emailCodeSent: true });
      // return uiState.sendSignInEvent({ type: 'SENT_PIN_EMAIL' });

      return 'pinEntry';
    },

    notifyPinVerified: (signInData: SignInData) => {
      // Update core auth state - authenticateUser will save the session via updateTokens()
      authenticateUser(core, convertSessionUserToUser(signInData.user), {
        access_token: signInData.tokens.accessToken as string,
        refresh_token: signInData.tokens.refreshToken,
        expiresAt: signInData.tokens.expiresAt as number | null,
        supabase_token: signInData.tokens.supabaseToken,
        supabase_expires_at: signInData.tokens.supabaseExpiresAt
      });

      // Update UI state
      signInStateTransitions.authenticationSuccess(ui);

      console.log('✅ PIN verification notification processed');
    },

    // Legacy event system for backward compatibility
    sendSignInEvent: (event: any) => {
      console.log('🔄 Processing legacy signin event:', event.type);
      const { signInState } = ui.getState();

      switch (event.type) {
        case 'USER_CHECKED':
          ui.getState().setUserExists(event.exists);
          ui.getState().setHasPasskeys(event.hasPasskey || false);
          ui.getState().setHasValidPin(event.hasValidPin || false);
          ui.getState().setPinRemainingMinutes(event.pinRemainingMinutes || 0);
          ui.getState().setSignInState('userChecked');
          break;
        case 'SENT_PIN_EMAIL':
          ui.getState().setSignInState('pinEntry');
          ui.getState().setEmailCodeSent(true);
          break;
        case 'RESET':
          signInStateTransitions.reset(ui);
          break;
        case 'SET_EMAIL':
          if (event.email) {
            ui.getState().setEmail(event.email);
          }
          break;
        case 'SET_FULL_NAME':
          if (event.fullName) {
            ui.getState().setFullName(event.fullName);
          }
          break;
        case 'PASSKEY_SUCCESS':
          signInStateTransitions.authenticationSuccess(ui);
          break;
        case 'PIN_VERIFIED':
          if (signInState === 'pinEntry') {
            signInStateTransitions.authenticationSuccess(ui);
          }
          break;
        case 'EMAIL_VERIFIED':
          signInStateTransitions.authenticationSuccess(ui);
          break;
        case 'PASSKEY_FAILED':
          ui.getState().setSignInState('generalError');
          break;
        default:
          console.warn('Unknown sign-in event:', event.type);
      }

      return ui.getState().signInState;
    },

    // UI Configuration methods
    getButtonConfig: () => ui.getState().getButtonConfig(),
    getStateMessageConfig: () => {
      // Message priority logic:
      // 1. UI errors take highest priority (shown immediately, can be dismissed)
      // 2. State-based messages (success, info, warnings)
      // Note: apiError is kept for debugging but not shown in UI

      const uiError = error.getState().uiError;
      const uiState = ui.getState();
      const stateMessage = uiState.getStateMessageConfig();

      // If there's a UI error, override any state message with error
      if (uiError) {
        return {
          type: 'error' as const,
          textKey: uiError.code, // e.g., 'error.invalidCode', 'error.network'
          showIcon: true
        };
      }

      // Otherwise, return state-based message (success, info, warning)
      return stateMessage;
    },
    getExplainerConfig: (explainFeatures = true) =>
      ui.getState().getExplainerConfig(explainFeatures),

    destroy: () => {
      console.log('🧹 Destroying auth store...');

      core.getState().reset();
      session.getState().clearSession();
      error.getState().clearApiError();
      events.getState().removeAllListeners();
      passkey.getState().reset();
      email.getState().reset();
      ui.getState().resetUIState();
      onboarding.getState().reset();

      console.log('✅ Auth store destroyed');
    }
  };

  console.log('🚀 Composed auth store ready!');

  return composedStore;
}
