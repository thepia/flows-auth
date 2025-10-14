/**
 * Core TypeScript interfaces for the new Zustand-based auth store
 * These types are framework-agnostic and shared across all store modules
 */

import type { AuthApiClient } from '../api/auth-api';
import type {
  ApiError,
  AuthConfig,
  AuthEventData,
  AuthEventType,
  AuthEvents,
  ButtonConfig,
  ExplainerConfig,
  SessionPersistence,
  SignInData,
  SignInEvent,
  SignInState,
  StateMessageConfig,
  User
} from '../types';

// Re-export core types for convenience
export type { AuthConfig, User, ApiError, SignInState };

/**
 * Core authentication store state
 */
export interface AuthCoreState {
  // Authentication state
  state: 'authenticated' | 'unauthenticated';
  user: User | null;
  access_token: string | null;
  refresh_token: string | null;
  expiresAt: number | null;
  refreshedAt: number | null; // Timestamp when token was last refreshed (spam protection)
  supabase_token: string | null; // Supabase JWT for database access with RLS
  supabase_expires_at: number | null; // Supabase token expiration timestamp

  // Capabilities
  passkeysEnabled: boolean;
}

/**
 * Core authentication store actions
 */
export interface AuthCoreActions {
  // Core auth methods
  signOut: () => Promise<void>;
  refreshTokens: () => Promise<void>;
  updateUser: (user: User) => void;
  updateTokens: (tokens: {
    access_token: string;
    refresh_token?: string;
    expiresAt: number | null;
    supabase_token?: string;
    supabase_expires_at?: number;
  }) => Promise<void>;

  // State helpers
  isAuthenticated: () => boolean;
  getAccessToken: () => string | null;
  reset: () => void;
}

/**
 * Combined core store interface
 */
export interface AuthCoreStore extends AuthCoreState, AuthCoreActions {}

/**
 * Session store state
 */
export interface SessionState {
  lastActivity: number | null;
  sessionTimeout: number;
  storageType: 'sessionStorage' | 'localStorage';
}

/**
 * Session store actions
 */
export interface SessionActions {
  saveSession: (data: SignInData) => Promise<void>;
  clearSession: () => Promise<void>;
  isSessionValid: () => Promise<boolean>;
  updateLastActivity: () => Promise<void>;
  configureStorage: (config: Partial<SessionState>) => void;
}

/**
 * Combined session store interface
 */
export interface SessionStore extends SessionState, SessionActions {}

/**
 * Error store state
 */
export interface ErrorState {
  apiError: ApiError | null; // Raw API error for debugging/logging
  uiError: ApiError | null; // Error to display in UI (can be cleared independently)
  lastFailedRequest: { method: string; args: unknown[] } | null;
}

/**
 * Error store actions
 */
export interface ErrorActions {
  setApiError: (error: unknown, context?: { method?: string; email?: string }) => void;
  clearApiError: () => void;
  clearUiError: () => void; // Clear only UI error, keep apiError for debugging
  retryLastRequest: () => Promise<boolean>;
}

/**
 * Combined error store interface
 */
export interface ErrorStore extends ErrorState, ErrorActions {}

// Re-export event types from canonical location
export type { AuthEventType, AuthEventData } from '../types';

// Event handler types for stores
export type AuthEventHandler<T = AuthEventData> = (data: T) => void;

/**
 * Event store state
 */
export interface EventState {
  listeners: Map<AuthEventType, AuthEventHandler[]>;
}

/**
 * Event store actions
 */
export interface EventActions {
  on: (type: AuthEventType, handler: AuthEventHandler) => () => void;
  emit: <K extends keyof AuthEvents>(type: K, data: AuthEvents[K]) => void;
  off: (type: AuthEventType, handler: AuthEventHandler) => void;
  removeAllListeners: (type?: AuthEventType) => void;
}

/**
 * Combined event store interface
 */
export interface EventStore extends EventState, EventActions {}

/**
 * UI State interfaces
 */
export interface UIState {
  // Input state
  email: string;
  fullName: string;
  emailCode: string; // PIN/verification code
  loading: boolean;

  // Flow state
  signInState: SignInState;
  emailCodeSent: boolean;

  // Discovery state
  userExists: boolean | null;
  hasPasskeys: boolean;
  hasValidPin: boolean;
  pinRemainingMinutes: number;

  // WebAuthn state
  conditionalAuthActive: boolean;
  platformAuthenticatorAvailable: boolean;
}

/**
 * UI Actions
 */
export interface UIActions {
  // Input setters
  setEmail: (email: string) => void;
  setFullName: (name: string) => void;
  setEmailCode: (code: string) => void;
  setLoading: (loading: boolean) => void;

  // State setters
  setSignInState: (state: SignInState) => void;
  setEmailCodeSent: (sent: boolean) => void;
  setConditionalAuthActive: (active: boolean) => void;

  // Discovery setters
  setUserExists: (exists: boolean | null) => void;
  setHasPasskeys: (hasPasskeys: boolean) => void;
  setHasValidPin: (hasValidPin: boolean) => void;
  setPinRemainingMinutes: (minutes: number) => void;

  // Reset
  resetUIState: () => void;

  // Event-based actions for state machine
  userChecked: (userData: {
    email: string;
    exists: boolean;
    hasPasskey: boolean;
    hasValidPin: boolean;
    pinRemainingMinutes?: number;
  }) => void;
  pinEmailSent: () => void;
  reset: () => void;
  authSuccess: (method: 'passkey' | 'email-code' | 'magic-link') => void;
  authError: () => void;

  // UI Configuration methods
  getStateMessageConfig: () => StateMessageConfig | null;
  getButtonConfig: () => ButtonConfig;
  getExplainerConfig: (explainFeatures?: boolean) => ExplainerConfig | null;
}

/**
 * Combined UI store interface
 */
export interface UIStore extends UIState, UIActions {}

/**
 * Framework adapter interfaces
 */
export interface SvelteAdapter<T> {
  subscribe: (callback: (value: T) => void) => () => void;
  set?: (value: T) => void;
  update?: (updater: (value: T) => T) => void;
}

export interface ReactAdapter<T> {
  (): T;
  subscribe: (callback: (value: T) => void) => () => void;
  getState: () => T;
}

/**
 * Store creation options
 */
export interface StoreOptions {
  config: AuthConfig;
  devtools?: boolean;
  name?: string;
  api: AuthApiClient;
  db: SessionPersistence;
}
