/**
 * @thepia/flows-auth
 *
 * A comprehensive Svelte authentication library with WebAuthn/passkey support
 * for whitelabel applications and Flow app projects.
 */

// Main components
export { default as SignInForm } from './components/SignInForm.svelte';
export { default as RegistrationForm } from './components/RegistrationForm.svelte';
export { default as EmailVerificationBanner } from './components/EmailVerificationBanner.svelte';
export { default as EmailVerificationPrompt } from './components/EmailVerificationPrompt.svelte';

// Stores
export { 
  createAuthDerivedStores, 
  createAuthStore
} from './stores/auth-store';

// State Machine
export { AuthStateMachine, AuthGuards, AuthActions } from './stores/auth-state-machine';

// API client
export { AuthApiClient } from './api/auth-api';
export { SyncApiClient } from './api/sync-api';

// Utilities
export * from './utils/webauthn';
export * from './utils/local-storage';
export * from './utils/service-worker';
export * from './utils/errorReporter';
export type { FlowsSessionData } from './utils/sessionManager';
export { 
  getSession,
  saveSession, 
  clearSession,
  isSessionValid,
  isAuthenticated as isAuthenticatedFromSession,
  getCurrentUser as getCurrentUserFromSession,
  getAccessToken as getAccessTokenFromSession
} from './utils/sessionManager';

// Types
export type * from './types';

// Version
export const VERSION = '1.0.0';

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
