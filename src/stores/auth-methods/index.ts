/**
 * Authentication Methods Store Modules
 *
 * Exports authentication method stores for tree-shaking
 */

export {
  createPasskeyStore,
  isPasskeyAvailableForUser,
  getPasskeyReadiness,
  type PasskeyState,
  type PasskeyActions,
  type PasskeyStore
} from './passkey';

export {
  createEmailAuthStore,
  getEmailAuthCapabilities,
  isEmailOperationInProgress,
  type EmailAuthState,
  type EmailAuthActions,
  type EmailAuthStore
} from './email-auth';