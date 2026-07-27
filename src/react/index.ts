/**
 * @thepia/flows-auth/react — React hook + context binding + UI component library
 *
 * The hook/context/adapter pieces touch the React runtime (context,
 * `useSyncExternalStore`). Framework-agnostic logic (stores, api, utils, types) lives at
 * the package root `.` and is imported from here via relative paths (see `context.tsx`
 * for why this target avoids the `@thepia/flows-auth` self-reference other targets use).
 *
 * Phase C added the UI component library itself -- a true peer of the Svelte target's
 * `src/svelte/components/**`, not just the headless hook. See
 * `docs/MULTI_FRAMEWORK_PACKAGING_PLAN.md`'s Phase 3 section for what's ported vs.
 * deliberately deferred (`AccountCreationForm`, `UserManagement`, `PolicyViewer`,
 * `EmailVerificationBanner`/`Prompt`, and the dev/debug flow-diagram components).
 *
 * Component styles are NOT bundled into this JS entry -- import
 * `@thepia/flows-auth/style.css` once (shared with the Svelte target; same class names,
 * same visual design). See `src/react/styles-entry.ts` for how that shared stylesheet is
 * built.
 */

// Re-exported so React consumers don't need a separate import from the
// package root `.` just to type their config/store/snapshot.
export type { AuthApiClient } from '../core/api/auth-api.js';
export type { ComposedAuthStore } from '../core/stores/auth-store.js';
export type {
  ApiError,
  AuthConfig,
  AuthError,
  AuthMethod,
  AuthStore,
  ButtonConfig,
  ExplainerConfig,
  SingleButtonConfig,
  StateMessageConfig,
  User
} from '../core/types/index.js';
// UI components (Phase C)
export type { AuthButtonProps } from './components/core/AuthButton.js';
export { AuthButton } from './components/core/AuthButton.js';
export type { AuthExplainerProps } from './components/core/AuthExplainer.js';
export { AuthExplainer } from './components/core/AuthExplainer.js';
export type { AuthNewUserInfoProps } from './components/core/AuthNewUserInfo.js';
export { AuthNewUserInfo } from './components/core/AuthNewUserInfo.js';
export type { AuthStateMessageProps } from './components/core/AuthStateMessage.js';
export { AuthStateMessage } from './components/core/AuthStateMessage.js';
export type { CodeInputProps } from './components/core/CodeInput.js';
export { CodeInput } from './components/core/CodeInput.js';
export type { EmailInputProps } from './components/core/EmailInput.js';
export { EmailInput } from './components/core/EmailInput.js';
export type { PinEntryStepProps } from './components/core/PinEntryStep.js';
export { PinEntryStep } from './components/core/PinEntryStep.js';
export type { SignInCoreProps } from './components/core/SignInCore.js';
export { SignInCore } from './components/core/SignInCore.js';
export type { SignInFormProps } from './components/SignInForm.js';
export { SignInForm } from './components/SignInForm.js';
export type { AuthProviderProps } from './context.js';
export { AuthProvider, AuthStoreContext } from './context.js';
export type { UseAuthStoreResult } from './hooks/useAuthStore.js';
export { useAuthStore } from './hooks/useAuthStore.js';
