/**
 * @thepia/flows-auth
 *
 * A comprehensive Svelte authentication library with WebAuthn/passkey support
 * for whitelabel applications and Flow app projects.
 */

// API client
export { AuthApiClient } from './api/auth-api';
export { SyncApiClient } from './api/sync-api';
export { default as AccountCreationForm } from './components/AccountCreationForm.svelte';
export { default as EmailVerificationBanner } from './components/EmailVerificationBanner.svelte';
export { default as EmailVerificationPrompt } from './components/EmailVerificationPrompt.svelte';
// Main components
export { default as SignInForm } from './components/SignInForm.svelte';

// State Machine
export { AuthActions, AuthGuards, AuthStateMachine } from './stores/auth-state-machine';
// Stores
export {
  createAuthDerivedStores,
  createAuthStore,
} from './stores/auth-store';
// Types
export type * from './types';
export type { StorageConfig } from './types';
// Enhanced auth store interface types
export type {
  AuthFlowResult,
  EnhancedUserCheck,
  InvitationAuthOptions,
} from './types/enhanced-auth';
export type { ApiServerConfig, ApiServerInfo } from './utils/api-detection';
// API Detection
export { DEFAULT_API_CONFIG, detectApiServer } from './utils/api-detection';
export * from './utils/errorReporter';
export type { InvitationProcessingResult } from './utils/invitation-processing';
// Invitation Processing Utilities
export {
  extractRegistrationDataFromToken,
  processInvitationToken,
} from './utils/invitation-processing';
export type { InvitationTokenData, TokenValidationResult } from './utils/invitation-tokens';
// Invitation Token Utilities
export {
  decodeInvitationToken,
  extractRegistrationData,
  hashInvitationToken,
  validateInvitationToken,
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
  shouldMigrateSession,
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
  supportsPersistentSessions,
} from './utils/sessionManager';
// Utilities
export * from './utils/webauthn';

// Version
export const VERSION = '1.0.4';

// Default configuration factory
export function createDefaultConfig(
  overrides: Partial<import('./types').AuthConfig> = {}
): import('./types').AuthConfig {
  const defaults = {
    apiBaseUrl: '',
    clientId: '',
    domain: '',
    enablePasskeys: true,
    enableMagicLinks: true,
    enablePasswordLogin: true,
    enableSocialLogin: false,
    branding: {
      companyName: 'Your Company',
      showPoweredBy: true,
    },
  };

  return {
    ...defaults,
    ...overrides,
    branding: {
      ...defaults.branding,
      ...overrides.branding,
    },
  };
}
