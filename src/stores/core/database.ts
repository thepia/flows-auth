import type { AuthConfig, SessionData, SessionPersistence, UserData } from '../../types';
import { isOlderThan } from '../../utils/date-helpers';
import { configureSessionStorage, getOptimalSessionConfig } from '../../utils/sessionManager';
import { getStorageManager } from '../../utils/storageManager';

const SESSION_KEY = 'thepia_auth_session';
const LAST_USER_KEY = 'thepia_last_user';

/**
 * Default localStorage/sessionStorage adapter
 *
 * Session data: Uses configurable storage (localStorage or sessionStorage)
 * User data: Uses localStorage directly (thepia_last_user key)
 *
 * @param config - Optional auth configuration for storage setup. If not provided, uses optimal defaults.
 */
export function createLocalStorageAdapter(config?: AuthConfig): SessionPersistence {
  // Configure session storage based on config or optimal defaults
  if (typeof window !== 'undefined') {
    const storageConfig = config?.storage || getOptimalSessionConfig();
    configureSessionStorage(storageConfig);
  }

  // BroadcastChannel for cross-tab session sync
  const broadcastChannel =
    typeof window !== 'undefined' ? new BroadcastChannel('thepia-auth-session') : null;

  return {
    async saveSession(partialSession: Partial<SessionData>): Promise<SessionData> {
      if (typeof window === 'undefined') {
        // Return session for SSR context (won't be persisted)
        return partialSession as SessionData;
      }

      try {
        const storage = getStorageManager();

        // CRITICAL: Read existing session BEFORE merging
        const existingData = storage.getItem(SESSION_KEY);
        let existingSession: SessionData | null = null;

        if (existingData) {
          try {
            const parsed = JSON.parse(existingData);
            // Handle both old SignInData format (nested) and new SessionData format (flat)
            if (parsed.user && parsed.tokens) {
              // Old format: convert to SessionData
              existingSession = {
                userId: parsed.user.id,
                email: parsed.user.email,
                name: parsed.user.name,
                emailVerified: parsed.user.emailVerified,
                metadata: parsed.user.preferences,
                accessToken: parsed.tokens.access_token || parsed.tokens.accessToken,
                refreshToken: parsed.tokens.refresh_token || parsed.tokens.refreshToken,
                expiresAt: parsed.tokens.expiresAt,
                refreshedAt: parsed.tokens.refreshedAt,
                authMethod: parsed.authMethod,
                supabaseToken: parsed.tokens.supabase_token || parsed.tokens.supabaseToken,
                supabaseExpiresAt:
                  parsed.tokens.supabase_expires_at || parsed.tokens.supabaseExpiresAt
              };
            } else {
              // New format: already SessionData
              existingSession = parsed as SessionData;
            }
          } catch (e) {
            console.warn('Failed to parse existing session:', e);
          }
        }

        // Merge partial update with existing session
        const mergedSession: SessionData = existingSession
          ? { ...existingSession, ...partialSession }
          : (partialSession as SessionData);

        // Convert SessionData to SignInData format for storage (nested structure with camelCase)
        const storageFormat = {
          user: {
            id: mergedSession.userId,
            email: mergedSession.email,
            name: mergedSession.name,
            emailVerified: mergedSession.emailVerified,
            preferences: mergedSession.metadata
          },
          tokens: {
            accessToken: mergedSession.accessToken,
            refreshToken: mergedSession.refreshToken,
            expiresAt: mergedSession.expiresAt,
            refreshedAt: mergedSession.refreshedAt,
            supabaseToken: mergedSession.supabaseToken,
            supabaseExpiresAt: mergedSession.supabaseExpiresAt
          },
          authMethod: mergedSession.authMethod
        };

        // Save in SignInData format
        storage.setItem(SESSION_KEY, JSON.stringify(storageFormat));

        // Broadcast session update to other tabs via BroadcastChannel
        if (broadcastChannel) {
          broadcastChannel.postMessage({
            type: 'SESSION_UPDATED',
            session: mergedSession,
            timestamp: Date.now()
          });
        }

        console.log(
          '💾 Session saved to',
          storage.getConfig().type,
          'for user:',
          mergedSession.email
        );

        // Return merged session so caller knows what was actually persisted
        return mergedSession;
      } catch (error) {
        console.error('Failed to save session:', error);
        throw error;
      }
    },

    async loadSession(): Promise<SessionData | null> {
      if (typeof window === 'undefined') return null;

      try {
        const storage = getStorageManager();
        const sessionData = storage.getItem(SESSION_KEY);
        if (!sessionData) return null;

        const parsed = JSON.parse(sessionData);

        // Convert from storage format (SignInData with nested structure) to SessionData (flat)
        let session: SessionData;
        if (parsed.user && parsed.tokens) {
          // Storage format: nested SignInData structure (uses camelCase)
          session = {
            userId: parsed.user.id,
            email: parsed.user.email,
            name: parsed.user.name,
            emailVerified: parsed.user.emailVerified,
            metadata: parsed.user.preferences,
            accessToken: parsed.tokens.accessToken,
            refreshToken: parsed.tokens.refreshToken,
            expiresAt: parsed.tokens.expiresAt,
            refreshedAt: parsed.tokens.refreshedAt,
            authMethod: parsed.authMethod,
            supabaseToken: parsed.tokens.supabaseToken,
            supabaseExpiresAt: parsed.tokens.supabaseExpiresAt
          };
        } else {
          // Already in SessionData format (shouldn't happen, but handle it)
          session = parsed as SessionData;
        }

        // Check token expiration only if there's no refresh token
        if (session.expiresAt < Date.now() && !session.refreshToken) {
          console.log('🕐 Session expired: no refresh token and access token expired');
          storage.removeItem(SESSION_KEY);
          return null;
        }

        return session;
      } catch (error) {
        console.error('Failed to load session:', error);
        return null;
      }
    },

    async clearSession(): Promise<void> {
      if (typeof window === 'undefined') return;

      try {
        const storage = getStorageManager();
        storage.removeItem(SESSION_KEY);

        // Broadcast session cleared to other tabs
        if (broadcastChannel) {
          broadcastChannel.postMessage({
            type: 'SESSION_CLEARED',
            timestamp: Date.now()
          });
        }

        console.log('🗑️ Session cleared from', storage.getConfig().type);
      } catch (error) {
        console.error('Failed to clear session:', error);
      }
    },

    async saveUser(user: UserData): Promise<void> {
      if (typeof window === 'undefined') return;

      try {
        // Save UserData directly to localStorage
        localStorage.setItem(LAST_USER_KEY, JSON.stringify(user));
      } catch (error) {
        console.error('Failed to save user to localStorage:', error);
      }
    },

    async getUser(userId?: string): Promise<UserData | null> {
      if (typeof window === 'undefined') return null;

      try {
        const lastUserData = localStorage.getItem(LAST_USER_KEY);
        if (!lastUserData) return null;

        const lastUser = JSON.parse(lastUserData) as UserData;

        // Only return if the last login was within the last 30 days
        if (lastUser.lastLoginAt && isOlderThan(lastUser.lastLoginAt, 30 * 24 * 60 * 60 * 1000)) {
          localStorage.removeItem(LAST_USER_KEY);
          return null;
        }

        return lastUser;
      } catch (error) {
        console.error('Failed to get user from localStorage:', error);
        return null;
      }
    },

    async clearUser(userId?: string): Promise<void> {
      if (typeof window === 'undefined') return;

      try {
        localStorage.removeItem(LAST_USER_KEY);
      } catch (error) {
        console.error('Failed to clear user from localStorage:', error);
      }
    }
  };
}
