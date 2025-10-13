/**
 * Database Adapter Interface for Session Persistence
 * Allows flows-auth to integrate with any database system (flows-db, localStorage, etc.)
 */

export interface SessionData {
  userId: string;
  email: string;
  name?: string;
  emailVerified?: boolean;
  metadata?: Record<string, unknown>;
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  refreshedAt: number; // Timestamp when token was last refreshed (prevents spam refreshes)
  authMethod: 'passkey' | 'password' | 'email-code' | 'magic-link';
}

/**
 * Database adapter for session persistence
 * Implement this interface to integrate with any database system
 */
export interface DatabaseAdapter {
  /**
   * Save session to database
   * Called automatically when user signs in
   */
  saveSession(session: SessionData): Promise<void>;

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
}
