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

// New dual state machine types
// Removed: session-state-machine types - SessionStateMachine removed
// Note: signin-state-machine types exported at top of file

export interface SessionData {
  accessToken: string;
  refreshToken?: string;
  expiresIn?: number;
  user: User;
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

  // Internationalization configuration
  language?: string; // ISO 639-1 language code (en, es, fr, etc.) or locale (en-US, es-ES)
  translations?: import('../utils/i18n').CustomTranslations; // Custom translation overrides
  fallbackLanguage?: string; // Fallback language (defaults to 'en')
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
  accessToken?: string;
  refreshToken?: string;
  expiresIn?: number;
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
  accessToken?: string;
  refreshToken?: string;
  expiresIn?: number;
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
    accessToken: string;
    refreshToken?: string;
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

export type AuthErrorCode =
  | 'user_not_found'
  | 'email_not_verified'
  | 'passkey_not_supported'
  | 'passkey_failed'
  | 'passkey_cancelled'
  | 'passkey_timeout'
  | 'magic_link_expired'
  | 'magic_link_failed'
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
  appCode?: string;
  success?: boolean;
  timestamp?: number;
  requiresVerification?: boolean;
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
  | 'welcome_email_sent'
  | 'app_email_started'
  | 'app_email_sent'
  | 'app_email_error'
  | 'app_email_verify_started'
  | 'app_email_verify_success'
  | 'app_email_verify_error';

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
  accessToken: string | null;
  refreshToken: string | null;
  expiresAt: number | null;
  error: AuthError | null;
  passkeysEnabled: boolean; // Added: Centralized passkey availability determination
}

// Svelte store types
export type Unsubscriber = () => void;
export type Subscriber<T> = (value: T) => void;
export type Readable<T> = {
  subscribe: (run: Subscriber<T>) => Unsubscriber;
};

// Complete auth store type with all methods
export interface CompleteAuthStore extends Readable<AuthStore> {
  signInWithPasskey: (email: string, conditional?: boolean) => Promise<SignInResponse>;
  signInWithMagicLink: (email: string) => Promise<SignInResponse>;
  signOut: () => Promise<void>;
  refreshTokens: () => Promise<void>;
  isAuthenticated: () => boolean;
  getAccessToken: () => string | null;
  reset: () => void;
  initialize: () => void;
  startConditionalAuthentication: (email: string) => Promise<boolean>;
  checkUser: (email: string) => Promise<{
    exists: boolean;
    hasWebAuthn: boolean;
    userId?: string;
    emailVerified?: boolean;
    invitationTokenHash?: string;
    lastPinExpiry?: number;
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
  on: (type: AuthEventType, handler: (data: AuthEventData) => void) => () => void;
  api: AuthApiClient;

  // Passkey capability
  getPasskeysEnabled: () => boolean;

  // SignIn flow control methods
  notifyPinSent: () => void;
  notifyPinVerified: (sessionData: any) => void;
  sendSignInEvent: (event: SignInEvent) => SignInState;

  // Email-based authentication methods
  sendEmailCode: (email: string) => Promise<{
    success: boolean;
    message: string;
    timestamp: number;
  }>;
  verifyEmailCode: (email: string, code: string) => Promise<SignInResponse>;

  // Dynamic role configuration methods
  getApplicationContext: () => ApplicationContext | null;
  updateStorageConfiguration: (update: StorageConfigurationUpdate) => Promise<void>;
  migrateSession: (fromType: StorageType, toType: StorageType) => Promise<SessionMigrationResult>;

  // Configuration access
  getConfig: () => AuthConfig;

  // Cleanup
  destroy: () => void;
}

// Re-export i18n types for convenience
export type {
  CustomTranslations,
  TranslationKey,
  SupportedLanguage
} from '../utils/i18n';
