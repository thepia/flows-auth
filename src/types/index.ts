/**
 * Auth Library Types
 * Based on thepia.com React implementation
 */

import type { AuthApiClient } from '../api/auth-api';
import type { AuthFlowResult, EnhancedUserCheck } from './enhanced-auth';
// SignIn state types (keeping only the types, removed the class)
import type {
  SignInContext,
  SignInError,
  SignInEvent,
  SignInState,
  WebAuthnError
} from './signin-state-machine';
export type { SignInEvent, SignInState, SignInContext, SignInError, WebAuthnError };

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

// Authentication states - simplified with email verification support
export type AuthState =
  | 'unauthenticated'
  | 'authenticated-unconfirmed' // Has passkey but email not verified
  | 'authenticated-confirmed' // Full access after email verification
  | 'authenticated' // Generic authenticated state for backward compatibility
  | 'error';

export type AuthMethod = 'passkey' | 'magic-link' | 'email-code';

// Sign-in flow states - passwordless only
export type SignInStep =
  | 'email'
  | 'passkey'
  | 'magic-link'
  | 'email-code'
  | 'loading'
  | 'success'
  | 'error';

// Registration flow states
export type RegistrationStep =
  | 'email-entry'
  | 'terms-of-service'
  | 'webauthn-register'
  | 'email-verification-required'
  | 'email-verification-complete'
  | 'error';
/**
 * Sign-in authentication data
 *
 * Unified type used throughout the authentication flow:
 * - API response from server after successful authentication
 * - Session data stored in client storage
 * - State machine event payload (PIN_VERIFIED, PASSKEY_AUTHENTICATED, etc.)
 * - Current auth state in the client store
 *
 * Design principles:
 * - Matches server API response structure (nested tokens)
 * - Contains all data needed for client-side session management
 * - No unnecessary transformations between API and storage
 * - Uses numeric timestamps for expiration (timezone-independent)
 * - Uses ISO string dates for user-facing fields (timezone-aware)
 */
export interface SignInData {
  /** User information - combines server data with client-side fields */
  user: {
    id: string;
    email: string;
    name: string;
    emailVerified?: boolean; // From server (optional for legacy data)
    isNewUser?: boolean; // From server
    metadata?: Record<string, any>; // From server
    // Client-side fields
    initials: string; // Generated from name
    avatar?: string; // From user profile or generated
    preferences?: Record<string, any>; // Client-side preferences
  };

  /** Authentication tokens (nested structure matching server API) */
  tokens: {
    access_token: string;
    refresh_token: string;
    expires_in?: number; // Server provides duration in seconds
    expiresAt: number; // Absolute timestamp in milliseconds
  };

  /** Authentication method used */
  authMethod: 'passkey' | 'password' | 'email-code' | 'magic-link';

  /** Client-side session management */
  lastActivity: number; // Timestamp of last activity (milliseconds)
}

// Storage configuration
export interface StorageConfig {
  type: 'sessionStorage' | 'localStorage';
  sessionTimeout?: number; // in milliseconds, only applies to sessionStorage
  persistentSessions?: boolean; // if true, use localStorage for long-running sessions
  userRole?: 'employee' | 'guest' | 'admin'; // determines storage strategy
  migrateExistingSession?: boolean; // if true, migrate current session to new storage type
}

// New interfaces for dynamic role configuration
export interface ApplicationContext {
  // Domain-based hints
  domain?: string; // e.g., 'internal.company.com' suggests all users are employees

  // URL-based hints
  urlPath?: string; // e.g., '/admin/login' suggests admin users

  // Application-level hints
  userType?: 'all_employees' | 'all_guests' | 'mixed'; // Corporate intranet vs public site

  // Security override
  forceGuestMode?: boolean; // Always start with guest settings for security
}

export interface StorageConfigurationUpdate {
  type: 'sessionStorage' | 'localStorage';
  userRole: 'employee' | 'guest' | 'admin';
  sessionTimeout: number;
  migrateExistingSession: boolean;
  preserveTokens: boolean;
}

export interface SessionMigrationResult {
  success: boolean;
  fromStorage: 'sessionStorage' | 'localStorage';
  toStorage: 'sessionStorage' | 'localStorage';
  dataPreserved: boolean;
  tokensPreserved: boolean;
  error?: string;
  duration?: number;
}

export type StorageType = 'sessionStorage' | 'localStorage';

// Authentication configuration
export interface AuthConfig {
  apiBaseUrl: string;
  clientId: string;
  domain: string;
  enablePasskeys: boolean;
  enableMagicLinks: boolean;
  redirectUri?: string;
  branding?: AuthBranding;
  errorReporting?: ErrorReportingConfig;
  auth0?: Auth0Config;
  storage?: StorageConfig; // Optional storage configuration
  applicationContext?: ApplicationContext; // Optional application context for role hints
  appCode?: string | boolean; // App code for app-specific endpoints (use 'app' for new integrations, true for default 'app', false/null for legacy endpoints)

  invitationToken?: string; // Optional invitation token for account creation permission

  // Authentication flow configuration
  signInMode?: 'login-only' | 'login-or-register'; // How to handle new users
  emailCodeLength?: number; // Length of email verification codes (default: 6)

  // Token refresh configuration
  refreshBefore?: number; // Seconds before token expiry to trigger auto-refresh (default: 300 = 5 minutes, minimum: 60 = 1 minute)

  // Internationalization configuration
  language?: string; // ISO 639-1 language code (en, es, fr, etc.) or locale (en-US, es-ES)
  fallbackLanguage?: string; // Fallback language (defaults to 'en')

  // Development configuration
  enableDevtools?: boolean; // Enable Zustand devtools integration
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

// API request/response types
export interface SignInRequest {
  email: string;
  method?: AuthMethod;
  redirectUri?: string;
}

export interface SignInResponse {
  user?: User;
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  requiresPasskey?: boolean;
  magicLinkSent?: boolean;
  challengeId?: string;
  step: SignInStep;
  emailVerifiedViaInvitation?: boolean; // True if email was verified via invitation token
}

export interface PasskeyRequest {
  email: string; // Changed to email for consistency with other methods
  credential: PasskeyCredential; // Properly typed WebAuthn credential
  challengeId?: string; // Optional challenge ID for verification
}

export interface MagicLinkRequest {
  email: string;
  redirectUri?: string;
}

export interface RefreshTokenRequest {
  refresh_token: string;
}

export interface LogoutRequest {
  access_token: string;
  refresh_token?: string;
}

// Registration types
export interface RegistrationRequest {
  email: string;
  firstName?: string;
  lastName?: string;
  company?: string;
  phone?: string;
  jobTitle?: string;
  acceptedTerms: boolean;
  acceptedPrivacy: boolean;
  marketingConsent?: boolean;
  invitationToken?: string; // Optional invitation token for email verification proof
}

export interface RegistrationResponse {
  user?: User;
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  step: RegistrationStep;
  emailVerificationRequired?: boolean;
  welcomeEmailSent?: boolean;
  emailVerifiedViaInvitation?: boolean; // True if email was verified via invitation token
}

// Invitation token data for prefilling registration forms
export interface InvitationTokenData {
  email: string;
  firstName?: string;
  lastName?: string;
  company?: string;
  phone?: string;
  jobTitle?: string;
  expires?: Date;
  message?: string;
  readOnlyFields?: string[];
}

// Configuration for additional business fields in registration forms
export type AdditionalField = 'company' | 'phone' | 'jobTitle';

// RegistrationForm component props - consolidated
export interface RegistrationFormProps {
  config: AuthConfig;
  showLogo?: boolean;
  compact?: boolean;
  className?: string;
  initialEmail?: string;
  invitationTokenData?: InvitationTokenData | null;
  invitationToken?: string | null; // Original JWT token string
  additionalFields?: AdditionalField[];
  readOnlyFields?: string[];
  onSuccess?: (data: AuthEventData) => void;
  onError?: (error: AuthError) => void;
  onStateChange?: (state: RegistrationStep) => void;
  onSwitchToSignIn?: () => void;
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

// Passkey management types
export interface UserPasskey {
  id: string;
  name?: string;
  createdAt: string;
  lastUsedAt?: string;
  type?: string;
}

// User profile type
export interface UserProfile extends User {
  passkeys?: UserPasskey[];
  mfaEnabled?: boolean;
  organizations?: string[];
}

// WebAuthn registration types
export interface WebAuthnRegistrationOptions {
  challenge: string;
  rp: {
    name: string;
    id: string;
  };
  user: {
    id: string;
    name: string;
    displayName: string;
  };
  pubKeyCredParams: PublicKeyCredentialParameters[];
  authenticatorSelection?: AuthenticatorSelectionCriteria;
  timeout?: number;
  attestation?: AttestationConveyancePreference;
}

export interface WebAuthnRegistrationResponse {
  id: string;
  rawId: ArrayBuffer;
  response: AuthenticatorAttestationResponse;
  type: 'public-key';
}

export interface WebAuthnVerificationResult {
  success: boolean;
  error?: string;
  tokens?: {
    access_token: string;
    refresh_token?: string;
    expiresAt: number;
  };
}

// Error types
export interface AuthError {
  code: string;
  message: string;
  details?: any;
  timestamp?: string;
}

// New ApiError interface for centralized error management
export interface ApiError {
  code: AuthErrorCode; // Translation key for the error message
  message: string; // Technical error message for debugging
  retryable: boolean; // Whether the error can be retried
  timestamp: number; // When the error occurred
  context?: {
    method?: string; // Which API method failed
    email?: string; // Email context if relevant
    attempt?: number; // Retry attempt number
  };
}

export type AuthErrorCode =
  | 'error.userNotFound'
  | 'error.serviceUnavailable'
  | 'error.authCancelled'
  | 'error.authFailed'
  | 'error.network'
  | 'error.rateLimited'
  | 'error.invalidInput'
  | 'error.invalidCode'
  | 'error.unknown';

/**
 * User check data structure - aligned with actual API server implementation
 * Based on checkUser function in thepia.com/src/api/workos.ts:234-265
 */
export interface UserCheckData {
  // Core response (always present)
  exists: boolean;
  hasWebAuthn: boolean; // Note: API uses hasWebAuthn, not hasPasskey

  // Optional fields (only present if user exists)
  userId?: string; // WorkOS user ID
  emailVerified?: boolean; // From WorkOS user profile

  // Pin validation fields (from user metadata)
  lastPinExpiry?: string; // ISO string from user.metadata.lastPinExpiry
  lastPinSentAt?: string; // ISO string from user.metadata.lastPinSentAt

  // Invitation system
  invitationTokenHash?: string; // For invitation token validation

  // Organization context (added by check-user.ts:60-67)
  organization?: {
    code: string; // App code (e.g., "demo")
    name: string; // Organization name
    provider: string; // "workos"
    features?: {
      webauthn?: boolean;
      sso?: boolean;
    };
  };
}

// Events
export interface AuthEventData {
  user?: User;
  error?: AuthError;
  method?: AuthMethod;
  step?: SignInStep;
  email?: string;
  appCode?: string;
  success?: boolean;
  timestamp?: number;
  requiresVerification?: boolean;
  tokens?: {
    access_token: string;
    refresh_token?: string;
    expiresAt?: number;
  };
}

export type AuthEventType =
  | 'sign_in_started'
  | 'sign_in_success'
  | 'sign_in_error'
  | 'sign_out'
  | 'token_refreshed'
  | 'session_expired'
  | 'passkey_created'
  | 'passkey_used'
  | 'registration_started'
  | 'registration_success'
  | 'registration_error'
  | 'email_verification_sent'
  | 'email_verification_success'
  | 'email_verification_error'
  | 'terms_accepted'
  | 'welcome_email_sent'
  | 'app_email_started'
  | 'app_email_sent'
  | 'app_email_error'
  | 'app_email_verify_started'
  | 'app_email_verify_success'
  | 'app_email_verify_error';

/**
 * Typed event data for each auth event type
 * This provides type-safe event emission and handling
 */
export interface AuthEvents {
  sign_in_started: {
    method: 'passkey' | 'magic-link' | 'email-code';
    email?: string;
  };

  sign_in_success: {
    user: User;
    method: 'passkey' | 'magic-link' | 'email-code';
    duration?: number;
  };

  sign_in_error: {
    error?: {
      code: string;
      message: string;
    };
    method: 'passkey' | 'magic-link' | 'email-code';
  };

  sign_out: {
    reason?: 'user_action' | 'session_expired' | 'token_refresh_failed';
  };

  token_refreshed: {
    expiresAt: number;
  };

  session_expired: {
    lastActivity: number;
  };

  passkey_used: {
    user: User;
    conditional?: boolean;
  };

  passkey_created: {
    user: User;
    credentialId?: string;
  };

  registration_started: {
    email: string;
    method?: 'passkey' | 'email-code';
  };

  registration_success: {
    user: User;
    requiresVerification?: boolean;
  };

  registration_error: {
    error: {
      code: string;
      message: string;
    };
  };

  email_verification_sent: {
    email: string;
  };

  email_verification_success: {
    user: User;
  };

  email_verification_error: {
    error: {
      code: string;
      message: string;
    };
  };

  terms_accepted: {
    user: User;
  };

  welcome_email_sent: {
    email: string;
  };

  app_email_started: {
    email: string;
    appCode: string;
  };

  app_email_sent: {
    email: string;
    appCode: string;
  };

  app_email_error: {
    error: {
      code: string;
      message: string;
    };
    appCode: string;
  };

  app_email_verify_started: {
    email: string;
    appCode: string;
  };

  app_email_verify_success: {
    email: string;
    appCode: string;
  };

  app_email_verify_error: {
    error: {
      code: string;
      message: string;
    };
    appCode: string;
  };
}

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

export interface MagicLinkStepProps {
  email: string;
  onBack: () => void;
  onResend?: () => void;
  loading?: boolean;
  error?: string;
  branding?: AuthBranding;
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
  signInState: SignInState; // Added: UI flow state for sign-in process
  user: User | null;
  access_token: string | null;
  refresh_token: string | null;
  expiresAt: number | null;
  apiError: ApiError | null; // Centralized API error management
  passkeysEnabled: boolean; // Added: Centralized passkey availability determination

  // UI State (moved from SignInCore)
  email: string; // Current email input value
  loading: boolean; // Component loading state
  emailCodeSent: boolean; // Whether email code was sent
  fullName: string; // Registration full name input

  // User Discovery State (moved from SignInCore)
  userExists: boolean | null; // Whether user exists (null = not checked)
  hasPasskeys: boolean; // Whether user has passkeys
  hasValidPin: boolean; // Whether user has valid pin
  pinRemainingMinutes: number; // Minutes remaining for valid pin

  // WebAuthn State (moved from SignInCore)
  conditionalAuthActive: boolean; // Whether conditional auth is active
  platformAuthenticatorAvailable: boolean; // Whether platform authenticator is available
}

export interface AuthStoreFunctions {
  // Core authentication
  signInWithPasskey: (email: string, conditional?: boolean) => Promise<SignInData>;
  signInWithMagicLink: (email: string) => Promise<SignInData | null>;
  signOut: () => Promise<void>;
  refreshTokens: () => Promise<void>;
  startConditionalAuthentication: (email: string) => Promise<boolean>;

  // Email authentication
  sendEmailCode: (email: string) => Promise<{
    success: boolean;
    message: string;
    timestamp: number;
  }>;
  verifyEmailCode: (code: string) => Promise<SignInData>;

  // User management
  checkUser: (email: string) => Promise<{
    exists: boolean;
    hasWebAuthn: boolean;
    userId?: string;
    emailVerified?: boolean;
    invitationTokenHash?: string;
    lastPinExpiry?: string; // ISO date string from API
  }>;
  registerUser: (userData: {
    email: string;
    firstName?: string;
    lastName?: string;
    acceptedTerms: boolean;
    acceptedPrivacy: boolean;
    invitationToken?: string;
  }) => Promise<SignInResponse & { emailVerifiedViaInvitation?: boolean }>;
  createAccount: (userData: {
    email: string;
    firstName?: string;
    lastName?: string;
    acceptedTerms: boolean;
    acceptedPrivacy: boolean;
    invitationToken?: string;
  }) => Promise<SignInResponse & { emailVerifiedViaInvitation?: boolean }>;
  registerIndividualUser: (userData: {
    email: string;
    firstName?: string;
    lastName?: string;
    acceptedTerms: boolean;
    acceptedPrivacy: boolean;
  }) => Promise<{
    success: boolean;
    user: User;
    verificationRequired: boolean;
    message: string;
  }>;

  checkUserWithInvitation: (
    email: string,
    invitationOptions?: {
      token: string;
      tokenData?: InvitationTokenData;
      skipTokenValidation?: boolean;
    }
  ) => Promise<EnhancedUserCheck>;
  determineAuthFlow: (email: string, invitationToken?: string) => Promise<AuthFlowResult>;

  // State management
  initialize: () => void;
  reset: () => void;
  isAuthenticated: () => boolean;
  getAccessToken: () => string | null;
  getState: () => AuthStore;

  // UI state setters
  setEmail: (email: string) => void;
  setFullName: (name: string) => void;
  setEmailCode: (code: string) => void;
  setLoading: (loading: boolean) => void;
  setConditionalAuthActive: (active: boolean) => void;
  setEmailCodeSent: (sent: boolean) => void;

  // Error management
  setApiError: (error: unknown, context?: { method?: string; email?: string }) => void;
  clearApiError: () => void;
  clearUiError: () => void; // Clear only UI error, keep apiError for debugging
  retryLastFailedRequest: () => Promise<boolean>;

  // SignIn flow control methods
  notifyPinSent: () => void;
  notifyPinVerified: (signInData: SignInData) => void;
  sendSignInEvent: (event: SignInEvent) => SignInState;

  // Configuration access
  getConfig: () => AuthConfig;
  updateConfig: (updates: Partial<AuthConfig>) => void;

  // UI Configuration
  getButtonConfig: () => ButtonConfig;
  getStateMessageConfig: () => StateMessageConfig | null;
  getExplainerConfig: (explainFeatures: boolean) => ExplainerConfig | null;

  // Events
  on: (type: AuthEventType, handler: (data: AuthEventData) => void) => () => void;
}

// Button configuration types
export type AuthButtonMethod =
  | 'passkey'
  | 'email'
  | 'email-code'
  | 'magic-link'
  | 'generic'
  | 'continue-touchid'
  | 'continue-faceid'
  | 'continue-biometric';

export interface SingleButtonConfig {
  method: AuthButtonMethod;
  textKey: string;
  loadingTextKey: string;
  supportsWebAuthn: boolean;
  disabled: boolean;
}

export interface ButtonConfig {
  primary: SingleButtonConfig;
  secondary?: SingleButtonConfig | null;
}

// State message configuration types
export interface StateMessageConfig {
  type: 'info' | 'success' | 'warning' | 'error';
  textKey: string;
  showIcon?: boolean;
  className?: string;
}

// Explainer configuration types
export interface ExplainerFeature {
  iconName: string; // Phosphor icon name (e.g., 'Lock', 'Shield', 'BadgeCheck')
  textKey: string; // Translation key for the feature text
  iconWeight?: 'thin' | 'light' | 'regular' | 'bold' | 'fill' | 'duotone'; // Phosphor icon weight
}

export interface ExplainerConfig {
  type: 'paragraph' | 'features';
  // For paragraph type
  textKey?: string; // Translation key for paragraph text
  iconName?: string; // Optional icon for paragraph
  iconWeight?: 'thin' | 'light' | 'regular' | 'bold' | 'fill' | 'duotone';
  useCompanyName?: boolean; // Whether to pass companyName parameter for translation interpolation
  companyName?: string; // Company name to pass to translation function
  // For features type
  features?: ExplainerFeature[];
  className?: string;
}

// Re-export i18n utilities for convenience
export { m, setI18nMessages } from '../utils/i18n';
