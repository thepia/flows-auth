/**
 * Sign-In State Machine Types
 * 
 * Handles sign-in form UI flow and authentication process
 */

export type SignInState = 
  | 'emailEntry'              // User entering/editing email (includes lookup spinner)
  | 'userChecked'             // Email validated, user data retrieved
  | 'passkeyPrompt'           // WebAuthn conditional UI active
  | 'pinEntry'                // Magic PIN/code entry
  | 'passkeyRegistration'     // Setting up new passkey (only from signedIn)
  | 'emailVerification'       // Email verification required
  | 'signedIn'                // User successfully signed in with user info
  | 'generalError';           // API server 500 errors from any server call

export type SignInEvent = 
  | { type: 'EMAIL_ENTERED'; email: string }            // User typed email
  | { type: 'EMAIL_SUBMITTED'; email: string }          // User submitted email
  | { type: 'USER_EXISTS'; hasPasskey: boolean }        // User lookup result
  | { type: 'USER_NOT_FOUND' }                          // New user detected
  | { type: 'PASSKEY_AVAILABLE' }                       // WebAuthn credentials found
  | { type: 'PASSKEY_SELECTED' }                        // User chose passkey auth
  | { type: 'PASSKEY_SUCCESS'; credential: any }        // WebAuthn authentication succeeded
  | { type: 'PASSKEY_FAILED'; error: WebAuthnError }    // WebAuthn authentication failed
  | { type: 'PIN_REQUESTED' }                           // Magic PIN flow started
  | { type: 'PIN_ENTERED'; pin: string }                // User entered PIN
  | { type: 'PIN_VERIFIED'; session: SessionData }      // PIN verification succeeded
  | { type: 'REGISTER_PASSKEY' }                        // Start passkey registration
  | { type: 'PASSKEY_REGISTERED'; session: SessionData }// Passkey registration complete
  | { type: 'EMAIL_VERIFICATION_REQUIRED' }             // Email needs verification
  | { type: 'EMAIL_SENT' }                             // Email with PIN sent
  | { type: 'EMAIL_VERIFIED'; session: SessionData }    // Email verification complete
  | { type: 'RETRY' }                                   // User wants to retry
  | { type: 'RESET' }                                   // Reset to initial state
  | { type: 'ERROR'; error: SignInError };              // Generic error occurred

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

// Import and re-export SessionData from session state machine for consistency
import type { SessionData } from './session-state-machine';
export type { SessionData };

/**
 * Sign-In State Machine Transitions
 * 
 * emailEntry -> userChecked (EMAIL_SUBMITTED, after lookup)
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
 * All error states -> emailEntry (RETRY)
 * All states -> emailEntry (RESET)
 */