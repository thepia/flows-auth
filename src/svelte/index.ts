/**
 * @thepia/flows-auth/svelte — Svelte UI + Svelte-runtime helpers
 *
 * Everything here touches the Svelte runtime (components, the Zustand→Svelte
 * store adapter, the auth context helpers, and the Paraglide/Svelte i18n glue).
 * Framework-agnostic logic (stores, api, utils, types) is the package root `.`
 * and is imported from here via the package name (self-reference).
 *
 * Flow-visualization components (SessionStateMachineFlow, SignInStateMachineFlow,
 * TestFlow) are intentionally NOT re-exported here — they pull in @xyflow/svelte.
 * They are compiled by svelte-package and can be imported directly if needed.
 */

// Svelte store adapter (Zustand -> Svelte readable/writable)
export { makeSvelteCompatible } from './adapters/svelte.js';
// Auth Context Utilities (Svelte-specific helpers)
export {
  assertAuthConfig,
  createAuthContext,
  getAuthStoreFromContext,
  resetGlobalAuthStore,
  setupAuthContext
} from './auth-context.js';
// Main components
export { default as AccountCreationForm } from './components/AccountCreationForm.svelte';
// Core granular components
export {
  AuthButton,
  AuthStateMessage,
  EmailInput,
  PolicyViewer,
  SignInCore
} from './components/core/index.js';
export { default as EmailVerificationBanner } from './components/EmailVerificationBanner.svelte';
export { default as EmailVerificationPrompt } from './components/EmailVerificationPrompt.svelte';
export { default as ErrorReportingStatus } from './components/ErrorReportingStatus.svelte';
// Icon system
export { default as Icon } from './components/icons/Icon.svelte';
export type { IconProps, IconSize, IconVariant, IconWeight } from './components/icons/types.js';
export { default as SignInForm } from './components/SignInForm.svelte';

// Paraglide/Svelte i18n glue
export { createParaglideI18n } from './paraglide-i18n.js';
