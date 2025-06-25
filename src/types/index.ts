/**
 * Auth Library Types
 * Based on thepia.com React implementation
 */

// User types
export interface User {
  id: string;
  email: string;
  name?: string;
  picture?: string;
  emailVerified: boolean;
  createdAt: string;
  lastLoginAt?: string;
  metadata?: Record<string, any>;
}

// Authentication states (legacy - kept for backward compatibility)
export type AuthState = 'idle' | 'loading' | 'authenticated' | 'unauthenticated' | 'error';

// Enhanced authentication states with email verification
export type EnhancedAuthState =
  | 'unauthenticated'
  | 'authenticated-unconfirmed'  // Has passkey but email not verified
  | 'authenticated-confirmed'    // Full access after email verification
  | 'loading'
  | 'error';

export type AuthMethod = 'passkey' | 'password' | 'magic-link' | 'social';

// Sign-in flow states (legacy - kept for backward compatibility)
export type SignInStep = 'email' | 'passkey' | 'password' | 'magic-link' | 'loading' | 'success' | 'error';

// Registration flow states
export type RegistrationStep =
  | 'email-entry'
  | 'terms-of-service'
  | 'webauthn-register'
  | 'registration-success'
  | 'email-verification-required'
  | 'email-verification-complete'
  | 'error';

// State Machine Types - Based on documented authentication state machine
export type AuthMachineState =
  | 'checkingSession'
  | 'sessionValid'
  | 'sessionInvalid'
  | 'combinedAuth'
  | 'conditionalMediation'
  | 'autofillPasskeys'
  | 'waitForExplicit'
  | 'explicitAuth'
  | 'auth0UserLookup'
  | 'directWebAuthnAuth'
  | 'passkeyRegistration'
  | 'newUserRegistration'
  | 'webauthnRegister'           // Registration with passkey
  | 'authenticated-unconfirmed'  // Logged in but email not verified
  | 'authenticated-confirmed'    // Full access after email verification
  | 'biometricPrompt'
  | 'auth0WebAuthnVerify'
  | 'passkeyError'
  | 'errorHandling'
  | 'credentialNotFound'
  | 'userCancellation'
  | 'credentialMismatch'
  | 'auth0TokenExchange'
  | 'sessionCreated'
  | 'loadingApp'
  | 'appLoaded';

export type AuthMachineEvent = 
  | { type: 'CHECK_SESSION' }
  | { type: 'VALID_SESSION'; session: SessionData }
  | { type: 'INVALID_SESSION' }
  | { type: 'USER_CLICKS_NEXT' }
  | { type: 'EMAIL_TYPED'; email: string }
  | { type: 'CONTINUE_CLICKED' }
  | { type: 'PASSKEY_SELECTED'; credential: any }
  | { type: 'USER_EXISTS'; hasPasskey: boolean }
  | { type: 'USER_NOT_FOUND' }
  | { type: 'WEBAUTHN_SUCCESS'; response: any }
  | { type: 'WEBAUTHN_ERROR'; error: AuthError; timing: number }
  | { type: 'TOKEN_EXCHANGE_SUCCESS'; tokens: any }
  | { type: 'RESET_TO_COMBINED_AUTH' };

export interface AuthMachineContext {
  email: string | null;
  user: User | null;
  error: AuthError | null;
  startTime: number;
  retryCount: number;
  sessionData: SessionData | null;
  challengeId: string | null;
}

export interface SessionData {
  accessToken: string;
  refreshToken?: string;
  expiresIn?: number;
  user: User;
}

// Authentication configuration
export interface AuthConfig {
  apiBaseUrl: string;
  clientId: string;
  domain: string;
  enablePasskeys: boolean;
  enableMagicLinks: boolean;
  enableSocialLogin: boolean;
  enablePasswordLogin: boolean;
  redirectUri?: string;
  socialProviders?: SocialProvider[];
  branding?: AuthBranding;
  errorReporting?: ErrorReportingConfig;
  auth0?: Auth0Config;
}

// Auth0 configuration
export interface Auth0Config {
  domain: string;
  clientId: string;
  audience?: string;
  redirectUri?: string;
}

// Error reporting configuration
export interface ErrorReportingConfig {
  enabled: boolean;
  endpoint?: string;
  apiKey?: string;
  debug?: boolean;
  maxRetries?: number;
  retryDelay?: number;
}

// Branding configuration
export interface AuthBranding {
  companyName: string;
  logoUrl?: string;
  primaryColor?: string;
  secondaryColor?: string;
  showPoweredBy?: boolean;
  customCSS?: string;
}

// Social providers
export interface SocialProvider {
  id: string;
  name: string;
  iconUrl?: string;
  enabled: boolean;
}

// API request/response types
export interface SignInRequest {
  email: string;
  method?: AuthMethod;
  redirectUri?: string;
}

export interface SignInResponse {
  user?: User;
  accessToken?: string;
  refreshToken?: string;
  expiresIn?: number;
  requiresPasskey?: boolean;
  requiresPassword?: boolean;
  magicLinkSent?: boolean;
  challengeId?: string;
  step: SignInStep;
}

export interface PasskeyRequest {
  email: string;
  challengeId: string;
  credential: any; // WebAuthn credential
}

export interface PasswordRequest {
  email: string;
  password: string;
  challengeId?: string;
}

export interface MagicLinkRequest {
  email: string;
  redirectUri?: string;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface LogoutRequest {
  accessToken: string;
  refreshToken?: string;
}

// Registration types
export interface RegistrationRequest {
  email: string;
  firstName?: string;
  lastName?: string;
  acceptedTerms: boolean;
  acceptedPrivacy: boolean;
  marketingConsent?: boolean;
}

export interface RegistrationResponse {
  user?: User;
  accessToken?: string;
  refreshToken?: string;
  expiresIn?: number;
  step: RegistrationStep;
  emailVerificationRequired?: boolean;
  welcomeEmailSent?: boolean;
}

// Email verification types
export interface EmailVerificationRequest {
  email: string;
  token?: string;
}

export interface EmailVerificationResponse {
  success: boolean;
  message?: string;
  user?: User;
}

// WebAuthn types
export interface PasskeyChallenge {
  challenge: string;
  rpId: string;
  userHandle?: string;
  allowCredentials?: PublicKeyCredentialDescriptor[];
  timeout?: number;
}

export interface PasskeyCredential {
  id: string;
  rawId: ArrayBuffer;
  response: AuthenticatorAssertionResponse;
  type: 'public-key';
}

// Error types
export interface AuthError {
  code: string;
  message: string;
  details?: any;
}

export type AuthErrorCode = 
  | 'invalid_credentials'
  | 'user_not_found'
  | 'email_not_verified'
  | 'passkey_not_supported'
  | 'passkey_failed'
  | 'magic_link_expired'
  | 'rate_limited'
  | 'network_error'
  | 'unknown_error';

// Events
export interface AuthEventData {
  user?: User;
  error?: AuthError;
  method?: AuthMethod;
  step?: SignInStep;
  email?: string;
}

export type AuthEventType =
  | 'sign_in_started'
  | 'sign_in_success'
  | 'sign_in_error'
  | 'sign_out'
  | 'token_refreshed'
  | 'passkey_created'
  | 'passkey_used'
  | 'registration_started'
  | 'registration_success'
  | 'registration_error'
  | 'email_verification_sent'
  | 'email_verification_success'
  | 'email_verification_error'
  | 'terms_accepted'
  | 'welcome_email_sent';

// Component props
export interface SignInFormProps {
  config: AuthConfig;
  onSuccess?: (data: AuthEventData) => void;
  onError?: (error: AuthError) => void;
  onStateChange?: (state: AuthState) => void;
  className?: string;
  showLogo?: boolean;
  compact?: boolean;
}

export interface EmailStepProps {
  onSubmit: (email: string) => void;
  onBack?: () => void;
  loading?: boolean;
  error?: string;
  initialEmail?: string;
  branding?: AuthBranding;
}

export interface PasskeyStepProps {
  email: string;
  onSubmit: (credential: PasskeyCredential) => void;
  onBack: () => void;
  onFallback?: () => void;
  loading?: boolean;
  error?: string;
  branding?: AuthBranding;
}

export interface PasswordStepProps {
  email: string;
  onSubmit: (password: string) => void;
  onBack: () => void;
  onForgotPassword?: () => void;
  loading?: boolean;
  error?: string;
  branding?: AuthBranding;
}

export interface MagicLinkStepProps {
  email: string;
  onBack: () => void;
  onResend?: () => void;
  loading?: boolean;
  error?: string;
  branding?: AuthBranding;
}

// Registration component props
export interface RegistrationFormProps {
  config: AuthConfig;
  onSuccess?: (data: AuthEventData) => void;
  onError?: (error: AuthError) => void;
  onStateChange?: (state: RegistrationStep) => void;
  className?: string;
  showLogo?: boolean;
  compact?: boolean;
  initialEmail?: string;
}

export interface TermsOfServiceProps {
  onAccept: (accepted: { terms: boolean; privacy: boolean; marketing?: boolean }) => void;
  onBack?: () => void;
  loading?: boolean;
  error?: string;
  branding?: AuthBranding;
  termsUrl?: string;
  privacyUrl?: string;
  showMarketingConsent?: boolean;
}

export interface EmailVerificationBannerProps {
  email: string;
  onVerify?: () => void;
  onDismiss?: () => void;
  onResend?: () => void;
  className?: string;
}

export interface EmailVerificationPromptProps {
  email: string;
  featureName?: string;
  onVerify?: () => void;
  onResend?: () => void;
  onDismiss?: () => void;
  className?: string;
}

// Store state
export interface AuthStore {
  state: AuthState;
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  expiresAt: number | null;
  error: AuthError | null;
}

// Utility types
export type AuthStoreMethods = {
  signIn: (email: string, method?: AuthMethod) => Promise<SignInResponse>;
  signInWithPasskey: (email: string, credential: PasskeyCredential) => Promise<SignInResponse>;
  signInWithPassword: (email: string, password: string) => Promise<SignInResponse>;
  signInWithMagicLink: (email: string) => Promise<SignInResponse>;
  signOut: () => Promise<void>;
  refreshTokens: () => Promise<void>;
  isAuthenticated: () => boolean;
  getAccessToken: () => string | null;
  reset: () => void;
};