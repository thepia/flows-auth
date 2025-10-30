/**
 * Database Adapter Interface for Session and User Persistence
 * Allows flows-auth to integrate with any database system (flows-db, localStorage, etc.)
 */

/**
 * Token data structure - used in SignInData.tokens
 * Contains only authentication token fields
 */
export interface TokenData {
  accessToken: string;
  refreshToken?: string; // Optional - sessions without refresh tokens expire permanently
  expiresAt: number;
  refreshedAt: number; // Timestamp when token was last refreshed (prevents spam refreshes)
  supabaseToken?: string; // Supabase JWT for database access with RLS
  supabaseExpiresAt?: number; // Supabase token expiration timestamp in milliseconds
}

/**
 * Complete session data - flat structure for database storage
 * Combines user info and token info for atomic persistence
 */
export interface SessionData {
  userId: string;
  email: string;
  name?: string;
  emailVerified?: boolean;
  metadata?: Record<string, unknown>;
  accessToken: string;
  refreshToken?: string; // Optional - sessions without refresh tokens expire permanently
  expiresAt: number;
  refreshedAt: number; // Timestamp when token was last refreshed (prevents spam refreshes)
  authMethod: 'passkey' | 'password' | 'email-code' | 'magic-link';
  supabaseToken?: string; // Supabase JWT for database access with RLS
  supabaseExpiresAt?: number; // Supabase token expiration timestamp in milliseconds
}

/**
 * User profile data for persistence
 * Separate from SessionData to allow independent storage strategies
 */
export interface UserData {
  userId: string; // Changed from 'id' to match SessionData naming convention
  email: string;
  name?: string;
  emailVerified?: boolean;
  createdAt?: string; // ISO date string
  lastLoginAt?: string; // ISO date string
  metadata?: Record<string, unknown>;
  authMethod?: 'passkey' | 'password' | 'email-code' | 'magic-link';
}

/**
 * Session persistence adapter for session and user data storage
 * Implement this interface to integrate with any storage system (IndexedDB, localStorage, etc.)
 *
 * @interface SessionPersistence
 */
export interface SessionPersistence {
  /**
   * Save session to database
   * Called automatically when user signs in or tokens refresh
   * Returns the complete merged session after saving
   */
  saveSession(session: Partial<SessionData>): Promise<SessionData>;

  /**
   * Load session from database
   * Called automatically on auth store initialization
   */
  loadSession(): Promise<SessionData | null>;

  /**
   * Clear session from database
   * Called automatically when user signs out
   */
  clearSession(): Promise<void>;

  /**
   * Save user profile to database
   * Called automatically when user signs in or profile updates
   */
  saveUser(user: UserData): Promise<void>;

  /**
   * Load user profile from database
   * Called automatically on auth store initialization
   */
  getUser(userId?: string): Promise<UserData | null>;

  /**
   * Clear user profile from database
   * Called automatically when user signs out (optional - may keep for convenience)
   */
  clearUser(userId?: string): Promise<void>;
}

/**
 * @deprecated Use SessionPersistence instead
 * Alias for backward compatibility
 */
export type DatabaseAdapter = SessionPersistence;
