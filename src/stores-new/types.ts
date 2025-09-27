/**
 * Core TypeScript interfaces for the new Zustand-based auth store
 * These types are framework-agnostic and shared across all store modules
 */

import type { AuthConfig, User, ApiError, SignInState } from '../types';

// Re-export core types for convenience
export type { AuthConfig, User, ApiError, SignInState };

/**
 * Core authentication store state
 */
export interface AuthCoreState {
  // Authentication state
  state: 'authenticated' | 'unauthenticated';
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  expiresAt: number | null;
  
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
    accessToken: string;
    refreshToken?: string;
    expiresAt?: number;
  }) => void;
  
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
  saveSession: (data: any) => void;
  clearSession: () => void;
  isSessionValid: () => boolean;
  updateLastActivity: () => void;
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
  apiError: ApiError | null;
  lastFailedRequest: { method: string; args: unknown[] } | null;
}

/**
 * Error store actions
 */
export interface ErrorActions {
  setApiError: (error: unknown, context?: { method?: string; email?: string }) => void;
  clearApiError: () => void;
  retryLastRequest: () => Promise<boolean>;
}

/**
 * Combined error store interface
 */
export interface ErrorStore extends ErrorState, ErrorActions {}

/**
 * Event system types
 */
export type AuthEventType = 
  | 'sign_in_started'
  | 'sign_in_success'
  | 'sign_in_error'
  | 'sign_out'
  | 'token_refreshed'
  | 'session_expired'
  | 'passkey_used'
  | 'registration_started'
  | 'registration_success'
  | 'registration_error';

export interface AuthEventData {
  [key: string]: any;
}

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
  emit: (type: AuthEventType, data?: AuthEventData) => void;
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
}

/**
 * Combined UI store interface
 */
export interface UIStore extends UIState, UIActions {}

/**
 * Complete auth store interface (composition of all stores)
 */
export interface CompleteAuthStore extends 
  AuthCoreStore,
  SessionStore,
  ErrorStore,
  EventStore,
  UIStore {
  // Store management
  destroy: () => void;
}

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
}