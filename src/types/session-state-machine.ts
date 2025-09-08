/**
 * Session State Machine Types
 * 
 * Handles application-level authentication status and session management
 */

export type SessionState = 
  | 'initializing'      // App starting up, checking for existing session
  | 'unauthenticated'   // No valid session exists
  | 'authenticated'     // Valid session exists, user is logged in
  | 'expired'           // Session expired, needs refresh or re-auth
  | 'refreshing'        // Attempting to refresh tokens
  | 'error';           // Session management error occurred

export type SessionEvent = 
  | { type: 'INIT' }                                     // Start session check
  | { type: 'SESSION_FOUND'; session: SessionData }     // Valid session discovered
  | { type: 'SESSION_INVALID' }                         // No session or invalid
  | { type: 'AUTHENTICATE'; session: SessionData }      // New authentication completed
  | { type: 'EXPIRE' }                                  // Session expired
  | { type: 'REFRESH_SUCCESS'; session: SessionData }   // Token refresh succeeded
  | { type: 'REFRESH_FAILED' }                          // Token refresh failed
  | { type: 'LOGOUT' }                                  // User initiated logout
  | { type: 'ERROR'; error: SessionError };             // Session error occurred

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

export interface SessionError {
  code: string;
  message: string;
  type: 'network' | 'validation' | 'expired' | 'unknown';
}

export interface SessionContext {
  session: SessionData | null;
  error: SessionError | null;
  retryCount: number;
  lastRefreshAttempt: number | null;
}

/**
 * Session State Machine Transitions
 * 
 * initializing -> authenticated (SESSION_FOUND)
 * initializing -> unauthenticated (SESSION_INVALID)
 * initializing -> error (ERROR)
 * 
 * unauthenticated -> authenticated (AUTHENTICATE)
 * unauthenticated -> error (ERROR)
 * 
 * authenticated -> expired (EXPIRE)
 * authenticated -> unauthenticated (LOGOUT)
 * authenticated -> error (ERROR)
 * 
 * expired -> refreshing (automatic)
 * expired -> unauthenticated (LOGOUT)
 * 
 * refreshing -> authenticated (REFRESH_SUCCESS)
 * refreshing -> unauthenticated (REFRESH_FAILED)
 * refreshing -> error (ERROR)
 * 
 * error -> initializing (INIT - retry)
 * error -> unauthenticated (LOGOUT - give up)
 */