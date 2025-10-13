import type { AuthConfig, DatabaseAdapter, SessionData } from '../../types';
import {
  clearSession as clearSessionUtil,
  configureSessionStorage,
  getOptimalSessionConfig,
  getSession,
  isSessionValid,
  saveSession as saveSessionUtil
} from '../../utils/sessionManager';

/**
 * Default localStorage/sessionStorage adapter
 * Uses the existing sessionManager utilities
 *
 * @param config - Optional auth configuration for storage setup. If not provided, uses optimal defaults.
 */
export function createLocalStorageAdapter(config?: AuthConfig): DatabaseAdapter {
  // Configure session storage based on config or optimal defaults
  if (typeof window !== 'undefined') {
    const storageConfig = config?.storage || getOptimalSessionConfig();
    configureSessionStorage(storageConfig);
  }

  return {
    async saveSession(session: SessionData): Promise<void> {
      // Convert DatabaseAdapter SessionData to internal SignInData format
      const signInData = {
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
          expiresAt: session.expiresAt
        },
        authMethod: session.authMethod,
        lastActivity: Date.now()
      };

      saveSessionUtil(signInData);
    },

    async loadSession(): Promise<SessionData | null> {
      const signInData = getSession();

      if (!signInData || !isSessionValid(signInData)) {
        return null;
      }

      // Convert internal SignInData to DatabaseAdapter SessionData format
      return {
        userId: signInData.user.id,
        email: signInData.user.email,
        name: signInData.user.name,
        emailVerified: true,
        metadata: signInData.user.preferences,
        accessToken: signInData.tokens.access_token,
        refreshToken: signInData.tokens.refresh_token,
        expiresAt: signInData.tokens.expiresAt,
        authMethod: signInData.authMethod
      };
    },

    async clearSession(): Promise<void> {
      clearSessionUtil();
    }
  };
}
