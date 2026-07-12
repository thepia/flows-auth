/**
 * Authentication Methods Store Modules
 *
 * Exports authentication method stores for tree-shaking
 */

export {
  createEmailAuthStore,
  type EmailAuthActions,
  type EmailAuthState,
  type EmailAuthStore,
  getEmailAuthCapabilities,
  isEmailOperationInProgress
} from './email-auth';
export {
  createPasskeyStore,
  getPasskeyReadiness,
  isPasskeyAvailableForUser,
  type PasskeyActions,
  type PasskeyState,
  type PasskeyStore
} from './passkey';
