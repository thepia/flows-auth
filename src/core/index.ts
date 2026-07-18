/**
 * @thepia/flows-auth — framework-agnostic core
 *
 * Root (`.`) export: stores, api, utils, types, constants, and the Paraglide
 * message runtime. No Svelte (or any framework) runtime is imported here —
 * Svelte UI + Svelte store/context/i18n helpers live in `./svelte`. The Deno
 * server code (`src/server`) is a separate target, not part of this barrel.
 */

// API client
export { AuthApiClient } from './api/auth-api.js';
export { SyncApiClient } from './api/sync-api.js';

// Context constants for consistency across components
export { AUTH_CONTEXT_KEY, CONTEXT_KEYS } from './constants/context-keys.js';

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
// Svelte Store Types (type-only; describes the shape the ./svelte adapter produces)
export type { SvelteAuthStore } from './types/svelte.js';

export type { ApiServerConfig, ApiServerInfo } from './utils/api-detection.js';
// API Detection
export { DEFAULT_API_CONFIG, detectApiServer } from './utils/api-detection.js';
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
// i18n message proxy (m) + app-message override hook — framework-agnostic
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

// Paraglide message runtime — re-exported so the ./svelte target (paraglide-i18n)
// can reach the raw message namespace + locale controls via the package name
// (self-reference) rather than a cross-target relative path.
export * as paraglideMessages from './paraglide/messages.js';
export { getLocale, type Locale, setLocale } from './paraglide/runtime.js';

// Default Configuration Utilities (NEW - eliminates app-level duplication)
export {
  createDefaultAuthConfig,
  detectDefaultApiServer,
  getCachedDefaultConfig,
  isDevelopmentEnvironment,
  quickAuthSetup,
  resetConfigCache
} from './utils/default-config.js';

// Version — injected at build time from package.json (see the `define` in
// tsup.config.ts and vitest.config.ts) so it can never drift from the published
// version. `build-verification.test.ts` asserts VERSION === package.json version.
declare const __LIB_VERSION__: string;
export const VERSION: string = __LIB_VERSION__;

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
