/**
 * @thepia/flows-auth
 *
 * A comprehensive Svelte authentication library with WebAuthn/passkey support
 * for whitelabel applications and Flow app projects.
 */

// API client
export { AuthApiClient } from './api/auth-api.js';
export { SyncApiClient } from './api/sync-api.js';
// Main components
export { default as AccountCreationForm } from './components/AccountCreationForm.svelte';
export { default as EmailVerificationBanner } from './components/EmailVerificationBanner.svelte';
export { default as EmailVerificationPrompt } from './components/EmailVerificationPrompt.svelte';
// Development components
export { default as ErrorReportingStatus } from './components/ErrorReportingStatus.svelte';
export { default as SignInForm } from './components/SignInForm.svelte';
// Context constants for consistency across components
export { AUTH_CONTEXT_KEY, CONTEXT_KEYS } from './constants/context-keys.js';
// Note: Flow visualization components (SessionStateMachineFlow, SignInStateMachineFlow, TestFlow)
// are NOT exported from main index to avoid pulling in @xyflow/svelte dependency
// Import them directly if needed: import { SessionStateMachineFlow } from '@thepia/flows-auth/src/components/...'

// Core granular components
export {
  AuthButton,
  AuthStateMessage,
  EmailInput,
  PolicyViewer,
  SignInCore
} from './components/core/index.js';

// Icon system
export { default as Icon } from './components/icons/Icon.svelte';
export type { IconProps, IconSize, IconVariant, IconWeight } from './components/icons/types.js';

// State Machine

// Svelte Adapter
export { makeSvelteCompatible } from './stores/adapters/svelte.js';
// New Modular Stores (Zustand-based)
export {
  type ComposedAuthStore,
  createAuthStore
} from './stores/auth-store.js';
export { createNativeAppSessionAdapter, isThepiaApp } from './stores/index.js';
// Enhanced auth store interface types
export type {
  AuthFlowResult,
  EnhancedUserCheck,
  InvitationAuthOptions
} from './types/enhanced-auth.js';
// Types
export type * from './types/index.js';
export type { SignInData, StorageConfig } from './types/index.js';
// Metadata Schema (unified for Auth0 and WorkOS)
export {
  getFieldCount,
  getFieldsInUse,
  type UserMetadata,
  UserMetadataSchema,
  validateFieldLimit
} from './types/metadata-schema.js';
// Svelte Store Types
export type { SvelteAuthStore } from './types/svelte.js';
export type { ApiServerConfig, ApiServerInfo } from './utils/api-detection.js';
// API Detection
export { DEFAULT_API_CONFIG, detectApiServer } from './utils/api-detection.js';
// Auth Context Utilities (Svelte-specific helpers)
export {
  assertAuthConfig,
  createAuthContext,
  getAuthStoreFromContext,
  resetGlobalAuthStore,
  setupAuthContext
} from './utils/auth-context.js';
// Date Helper Utilities
export {
  daysSince,
  formatDate,
  formatDateTime,
  isOlderThan,
  isWithin,
  millisecondsSince,
  nowISO
} from './utils/date-helpers.js';
export * from './utils/i18n.js';
export type { InvitationProcessingResult } from './utils/invitation-processing.js';
// Invitation Processing Utilities
export {
  extractRegistrationDataFromToken,
  processInvitationToken
} from './utils/invitation-processing.js';
export type { InvitationTokenData, TokenValidationResult } from './utils/invitation-tokens.js';
// Invitation Token Utilities
export {
  decodeInvitationToken,
  extractRegistrationData,
  hashInvitationToken,
  validateInvitationToken
} from './utils/invitation-tokens.js';
export * from './utils/local-storage.js';
// Paraglide JS Internationalization
export { createParaglideI18n } from './utils/paraglide-i18n.js';
// Session Migration Utilities
export {
  getRoleBasedStorageConfig,
  migrateForRole,
  migrateSessionSafely,
  SessionMigrator,
  sessionMigrator,
  shouldMigrateSession
} from './utils/session-migrator.js';
export {
  configureSessionStorage,
  getAccessToken as getAccessTokenFromSession,
  getCurrentUser as getCurrentUserFromSession,
  getOptimalSessionConfig,
  getStorageConfig,
  isAuthenticated as isAuthenticatedFromSession,
  isSessionValid,
  supportsPersistentSessions
} from './utils/sessionManager.js';
export type {
  ApiErrorEvent,
  AuthStateEvent,
  ErrorReportEvent,
  WebAuthnErrorEvent
} from './utils/telemetry.js';
// Telemetry
export {
  flushTelemetry,
  getTelemetryQueueSize,
  initializeTelemetry,
  reportApiError,
  // Enhanced auth-specific telemetry functions
  reportAuthEvent,
  reportAuthState,
  reportRefreshEvent,
  reportSessionEvent,
  reportWebAuthnError
} from './utils/telemetry.js';
// WebAuthn utilities - exported individually to avoid static import issues
export {
  authenticateWithPasskey,
  createCredential,
  createPasskey,
  generatePasskeyName,
  isConditionalMediationSupported,
  isPlatformAuthenticatorAvailable,
  isWebAuthnSupported,
  serializeCredential
} from './utils/webauthn.js';

// Version
export const VERSION = '1.1.0';

// Default Configuration Utilities (NEW - eliminates app-level duplication)
export {
  createDefaultAuthConfig,
  detectDefaultApiServer,
  getCachedDefaultConfig,
  isDevelopmentEnvironment,
  quickAuthSetup,
  resetConfigCache
} from './utils/default-config.js';

// Legacy default configuration factory (DEPRECATED)
export function createDefaultConfig(
  overrides: Partial<import('./types/index.js').AuthConfig> = {}
): import('./types/index.js').AuthConfig {
  console.warn('createDefaultConfig is deprecated. Use createDefaultAuthConfig instead.');

  const defaults = {
    apiBaseUrl: '',
    clientId: '',
    domain: '',
    appCode: 'app',
    enablePasskeys: true,
    enableMagicLinks: false,
    branding: {
      companyName: 'Your Company',
      showPoweredBy: true
    }
  };

  return {
    ...defaults,
    ...overrides,
    appCode: overrides.appCode || defaults.appCode,
    branding: {
      ...defaults.branding,
      ...overrides.branding
    }
  };
}
