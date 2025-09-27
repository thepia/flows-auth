/**
 * @thepia/flows-auth
 *
 * A comprehensive Svelte authentication library with WebAuthn/passkey support
 * for whitelabel applications and Flow app projects.
 */

// Context constants for consistency across components
export { CONTEXT_KEYS, AUTH_CONTEXT_KEY } from './constants/context-keys';

// API client
export { AuthApiClient } from './api/auth-api';
export { SyncApiClient } from './api/sync-api';

// Main components
export { default as AccountCreationForm } from './components/AccountCreationForm.svelte';
export { default as EmailVerificationBanner } from './components/EmailVerificationBanner.svelte';
export { default as EmailVerificationPrompt } from './components/EmailVerificationPrompt.svelte';
export { default as SignInForm } from './components/SignInForm.svelte';

// Development components
export { default as ErrorReportingStatus } from './components/ErrorReportingStatus.svelte';
export { default as SessionStateMachineFlow } from './components/SessionStateMachineFlow.svelte'; // AuthState visualization
export { default as SignInStateMachineFlow } from './components/SignInStateMachineFlow.svelte'; // SignInState visualization
export { default as TestFlow } from './components/TestFlow.svelte'; // Simple test component

// Core granular components
export {
  EmailInput,
  AuthButton,
  AuthStateMessage,
  SignInCore
} from './components/core';

// Icon system
export { default as Icon } from './components/icons/Icon.svelte';
export type { IconProps, IconVariant, IconSize, IconWeight } from './components/icons/types';

// State Machine

// New Modular Stores (Zustand-based)
export {
  createAuthStore,
  createAuthCoreStore,
  createSessionStore,
  createErrorStore,
  createEventStore,
  createPasskeyStore,
  createEmailAuthStore,
  createUIStore,
  createVanillaAdapter,
  createSvelteAdapter
} from './stores-new';

// Legacy Store (for backward compatibility during transition)
export {
  createAuthDerivedStores,
  createAuthStore as createLegacyAuthStore
} from './stores/auth-store';

// Global Auth Store Singleton (recommended approach)
export {
  initializeAuth,
  getGlobalAuthStore,
  isAuthStoreInitialized,
  getGlobalAuthConfig,
  resetGlobalAuthStore,
  updateGlobalAuthConfig,
  getOrInitializeAuth,
  isGlobalAuthStore,
  assertAuthConfig,
  type GlobalAuthStore,
  type AuthStoreInitializer,
  type AuthStoreGetter
} from './stores/global-auth-store';

// Auth Context Utilities (Svelte-specific helpers)
export {
  setAuthContext,
  getAuthContext,
  tryGetAuthContext,
  hasAuthContext,
  useAuth,
  useAuthSafe,
  createAuthStateStore,
  useOptionalAuth
} from './utils/auth-context';

// Types
export type * from './types';
export type { StorageConfig } from './types';

// Enhanced auth store interface types
export type {
  AuthFlowResult,
  EnhancedUserCheck,
  InvitationAuthOptions
} from './types/enhanced-auth';

export type { ApiServerConfig, ApiServerInfo } from './utils/api-detection';
// API Detection
export { DEFAULT_API_CONFIG, detectApiServer } from './utils/api-detection';

// Paraglide JS Internationalization
export { createParaglideI18n } from './utils/paraglide-i18n';

export * from './utils/i18n';

export * from './utils/errorReporter';

export type { InvitationProcessingResult } from './utils/invitation-processing';
// Invitation Processing Utilities
export {
  extractRegistrationDataFromToken,
  processInvitationToken
} from './utils/invitation-processing';

export type { InvitationTokenData, TokenValidationResult } from './utils/invitation-tokens';
// Invitation Token Utilities
export {
  decodeInvitationToken,
  extractRegistrationData,
  hashInvitationToken,
  validateInvitationToken
} from './utils/invitation-tokens';

export * from './utils/local-storage';
export * from './utils/service-worker';

// Session Migration Utilities
export {
  getRoleBasedStorageConfig,
  migrateForRole,
  migrateSessionSafely,
  SessionMigrator,
  sessionMigrator,
  shouldMigrateSession
} from './utils/session-migrator';

export type { FlowsSessionData } from './utils/sessionManager';
export {
  clearSession,
  configureSessionStorage,
  getAccessToken as getAccessTokenFromSession,
  getCurrentUser as getCurrentUserFromSession,
  getOptimalSessionConfig,
  getSession,
  getStorageConfig,
  isAuthenticated as isAuthenticatedFromSession,
  isSessionValid,
  saveSession,
  supportsPersistentSessions
} from './utils/sessionManager';
// WebAuthn utilities - exported individually to avoid static import issues
export {
  isWebAuthnSupported,
  isPlatformAuthenticatorAvailable,
  createPasskey,
  createCredential,
  isConditionalMediationSupported,
  authenticateWithPasskey,
  serializeCredential,
  generatePasskeyName
} from './utils/webauthn';

// Version
export const VERSION = '1.0.4';

// Default Configuration Utilities (NEW - eliminates app-level duplication)
export {
  detectDefaultApiServer,
  isDevelopmentEnvironment,
  createDefaultAuthConfig,
  quickAuthSetup,
  getCachedDefaultConfig,
  resetConfigCache
} from './utils/default-config';

// Legacy default configuration factory (DEPRECATED)
export function createDefaultConfig(
  overrides: Partial<import('./types').AuthConfig> = {}
): import('./types').AuthConfig {
  console.warn('createDefaultConfig is deprecated. Use createDefaultAuthConfig instead.');

  const defaults = {
    apiBaseUrl: '',
    clientId: '',
    domain: '',
    enablePasskeys: true,
    enableMagicLinks: true,
    branding: {
      companyName: 'Your Company',
      showPoweredBy: true
    }
  };

  return {
    ...defaults,
    ...overrides,
    branding: {
      ...defaults.branding,
      ...overrides.branding
    }
  };
}
