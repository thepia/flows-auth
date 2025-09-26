/**
 * Sign-In State Machine Types
 *
 * Handles sign-in form UI flow and authentication process
 */

export type SignInState =
  | 'emailEntry' // User entering/editing email (includes lookup spinner)
  | 'userChecked' // Email validated, user data retrieved
  | 'passkeyPrompt' // WebAuthn conditional UI active
  | 'pinEntry' // Magic PIN/code entry
  | 'passkeyRegistration' // Setting up new passkey (only from signedIn)
  | 'emailVerification' // Email verification required
  | 'signedIn' // User successfully signed in with user info
  | 'generalError'; // API server 500 errors from any server call

export type SignInEvent =
  | {
      type: 'USER_CHECKED';
      email: string;
      exists: boolean;
      hasPasskey: boolean;
      hasValidPin?: boolean;
      pinRemainingMinutes?: number;
    } // User check completed with results
  | { type: 'EMAIL_ENTERED'; email: string } // User entered email - used by state machine
  | { type: 'SENT_PIN_EMAIL' } // PIN email sent successfully, transition to pin entry
  | { type: 'PIN_REQUESTED' } // PIN authentication requested - used by state machine
  | { type: 'PASSKEY_AVAILABLE' } // WebAuthn credentials found
  | { type: 'EMAIL_CODE_ENTERED'; code: string } // User entered email code
  | { type: 'PASSKEY_SELECTED' } // User chose passkey auth
  | { type: 'PASSKEY_SUCCESS'; credential: any } // WebAuthn authentication succeeded
  | { type: 'PASSKEY_FAILED'; error: WebAuthnError } // WebAuthn authentication failed
  | { type: 'PIN_VERIFIED'; session: SessionData } // PIN verification success from server
  | { type: 'REGISTER_PASSKEY' } // Start passkey registration
  | { type: 'PASSKEY_REGISTERED'; session: SessionData } // Passkey registration complete
  | { type: 'EMAIL_VERIFICATION_REQUIRED' } // Email needs verification
  | { type: 'EMAIL_SENT' } // Email with PIN sent
  | { type: 'EMAIL_VERIFIED'; session: SessionData } // Email verification complete(for newly created/registered user that never logged in with email)
  | { type: 'RESET' } // Reset to email entry
  | { type: 'ERROR'; error: SignInError }; // Generic error occurred

export interface WebAuthnError {
  name: string;
  message: string;
  timing: number;
  type: 'credential-not-found' | 'user-cancellation' | 'credential-mismatch' | 'unknown';
}

export interface SignInError {
  code: string;
  message: string;
  type: 'validation' | 'network' | 'webauthn' | 'authentication' | 'unknown';
  retryable: boolean;
}

export interface SignInContext {
  email: string | null;
  user: {
    exists: boolean;
    hasPasskey: boolean;
    emailVerified: boolean;
  } | null;
  signedInUser: {
    id: string;
    email: string;
    name: string;
    emailVerified: boolean;
    authMethod: 'passkey' | 'pin' | 'email-link';
  } | null;
  error: SignInError | null;
  retryCount: number;
  startTime: number | null;
  challengeId: string | null;
}

// SessionData type - moved here since session-state-machine was removed
export interface SessionData {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    name: string;
    emailVerified: boolean;
  };
  expiresAt: number;
  lastActivity: number;
}

/**
 * Sign-In State Machine Transitions
 *
 * emailEntry -> userChecked (USER_CHECKED, after lookup)
 * emailEntry -> userError (invalid email)
 * emailEntry -> networkError (lookup failed)
 *
 * userChecked -> passkeyPrompt (existing user + hasPasskey)
 * userChecked -> pinEntry (existing user + !hasPasskey)
 * userChecked -> pinEntry (new user, no passkey registration until authenticated)
 *
 * passkeyPrompt -> signedIn (PASSKEY_SUCCESS)
 * passkeyPrompt -> passkeyError (PASSKEY_FAILED)
 *
 * pinEntry -> emailVerification (PIN_ENTERED)
 *
 * emailVerification -> signedIn (EMAIL_VERIFIED)
 *
 * signedIn -> passkeyRegistration (user chooses to set up passkey)
 * passkeyRegistration -> signedIn (PASSKEY_SUCCESS)
 *
 * emailVerification -> signedIn (EMAIL_VERIFIED)
 * emailVerification -> generalError (verification failed)
 *
 * signedIn -> emailEntry (RESET)
 *
 * All states -> emailEntry (RESET)
 */
