import type {
  AuthConfig,
  SessionData,
  SessionPersistence,
  SignInData,
  UserData
} from '../../types';
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

  return {
    async saveSession(session: SessionData): Promise<void> {
      if (typeof window === 'undefined') return;

      try {
        const storage = getStorageManager();

        // Convert SessionData to SignInData format for storage
        const signInData: SignInData = {
          user: {
            id: session.userId,
            email: session.email,
            name: session.name || session.email,
            initials: session.name
              ? session.name.charAt(0).toUpperCase()
              : session.email.charAt(0).toUpperCase(),
            avatar: undefined,
            preferences: session.metadata
          },
          tokens: {
            access_token: session.accessToken,
            refresh_token: session.refreshToken,
            refreshedAt: session.refreshedAt,
            expiresAt: session.expiresAt,
            supabase_token: session.supabaseToken,
            supabase_expires_at: session.supabaseExpiresAt
          },
          authMethod: session.authMethod,
          lastActivity: Date.now()
        };

        // Save directly to configured storage
        storage.setItem(SESSION_KEY, JSON.stringify(signInData));

        // Emit session update event
        if (typeof window.dispatchEvent === 'function') {
          window.dispatchEvent(
            new CustomEvent('sessionUpdate', {
              detail: { session: signInData }
            })
          );
        }

        console.log('💾 Session saved to', storage.getConfig().type, 'for user:', session.email);
      } catch (error) {
        console.error('Failed to save session:', error);
      }
    },

    async loadSession(): Promise<SessionData | null> {
      if (typeof window === 'undefined') return null;

      try {
        const storage = getStorageManager();
        const sessionData = storage.getItem(SESSION_KEY);
        if (!sessionData) return null;

        const signInData = JSON.parse(sessionData) as SignInData;

        // Check session timeout based on storage configuration
        const sessionTimeout = storage.getSessionTimeout();
        if (Date.now() - signInData.lastActivity > sessionTimeout) {
          console.log('🕐 Session expired due to inactivity');
          storage.removeItem(SESSION_KEY);
          return null;
        }

        // Check token expiration only if there's no refresh token
        if (signInData.tokens.expiresAt < Date.now() && !signInData.tokens.refresh_token) {
          console.log('🕐 Session expired: no refresh token and access token expired');
          storage.removeItem(SESSION_KEY);
          return null;
        }

        // Convert SignInData to SessionData format
        return {
          userId: signInData.user.id,
          email: signInData.user.email,
          name: signInData.user.name,
          emailVerified: true,
          metadata: signInData.user.preferences,
          accessToken: signInData.tokens.access_token,
          refreshToken: signInData.tokens.refresh_token,
          refreshedAt: signInData.tokens.refreshedAt,
          expiresAt: signInData.tokens.expiresAt,
          authMethod: signInData.authMethod,
          supabaseToken: signInData.tokens.supabase_token,
          supabaseExpiresAt: signInData.tokens.supabase_expires_at
        };
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

        // Emit session update event
        if (typeof window.dispatchEvent === 'function') {
          window.dispatchEvent(
            new CustomEvent('sessionUpdate', {
              detail: { session: null }
            })
          );
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
