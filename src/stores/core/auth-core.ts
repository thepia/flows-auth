/**
 * Core Authentication Store
 *
 * Handles fundamental authentication state and operations:
 * - User authentication status
 * - User data and tokens
 * - Core auth actions (sign in, sign out, refresh)
 * - Token lifecycle management
 */

import { devtools, subscribeWithSelector } from 'zustand/middleware';
import { createStore } from 'zustand/vanilla';
import { AuthApiClient } from '../../api/auth-api';
import type { User } from '../../types';
import type { AuthCoreState, AuthCoreStore, StoreOptions } from '../types';

/**
 * Initial state for the auth core store
 */
const initialState: AuthCoreState = {
  state: 'unauthenticated',
  user: null,
  access_token: null,
  refresh_token: null,
  expiresAt: null,
  refreshedAt: null,
  passkeysEnabled: false
};

/**
 * Create the core authentication store
 */
export function createAuthCoreStore(options: StoreOptions) {
  const { config, api, db, devtools: enableDevtools = false, name = 'auth-core' } = options;

  // API client already provided in options (for testability)

  // Track in-flight refresh to prevent concurrent calls
  let refreshInProgress: Promise<void> | null = null;

  // Track scheduled refresh timeout so we can cancel it if needed
  const refreshTimeout = { current: null as ReturnType<typeof setTimeout> | null };

  // Determine passkey availability
  const determinePasskeysEnabled = (): boolean => {
    if (typeof window === 'undefined') return false;
    if (!config.enablePasskeys) return false;

    // Check for WebAuthn support
    return !!(window.PublicKeyCredential && navigator.credentials && navigator.credentials.create);
  };

  const storeImpl = (
    set: (
      partial: Partial<AuthCoreStore> | ((state: AuthCoreStore) => Partial<AuthCoreStore>)
    ) => void,
    get: () => AuthCoreStore
  ) => ({
    ...initialState,
    passkeysEnabled: determinePasskeysEnabled(),

    // Core authentication actions
    signOut: async () => {
      const currentState = get();

      try {
        // Attempt server-side sign out
        if (currentState.access_token) {
          await api.signOut({
            access_token: currentState.access_token,
            refresh_token: currentState.refresh_token || undefined
          });
        }
      } catch (error) {
        console.warn('Server sign out failed:', error);
      } finally {
        // Always clear local state
        set({
          state: 'unauthenticated',
          user: null,
          access_token: null,
          refresh_token: null,
          expiresAt: null
        });

        // Clear session from database adapter
        try {
          await db.clearSession();
        } catch (error) {
          console.warn('Failed to clear session from database:', error);
        }
      }
    },

    refreshTokens: async (sessionStore?: any) => {
      // Prevent concurrent refresh calls - reuse in-flight request
      if (refreshInProgress) {
        return refreshInProgress;
      }

      const currentState = get();

      if (!currentState.refresh_token) {
        throw new Error('No refresh token available');
      }

      // Create and track the refresh promise
      refreshInProgress = (async () => {
        try {
          const response = await api.refreshToken({
            refresh_token: currentState.refresh_token as string
          });

          if (response.access_token) {
            // CRITICAL: Use updateTokens() to ensure session is persisted to storage
            // This is essential for auto-refresh path (scheduleTokenRefresh) which calls core.refreshTokens() directly
            // Without this, auto-refresh updates tokens in memory but doesn't save to DatabaseAdapter
            await get().updateTokens({
              access_token: response.access_token,
              refresh_token: (response.refresh_token || currentState.refresh_token) ?? undefined,
              // Use actual expires_in from server response
              expiresAt: response.expires_in ? Date.now() + response.expires_in * 1000 : undefined
            });

            // Note: updateTokens() already schedules next refresh via scheduleTokenRefresh
          }
        } catch (error: any) {
          console.warn('Token refresh failed:', error);

          // Check if this is an "already exchanged" error from WorkOS
          const isAlreadyExchanged =
            error?.message?.includes('already exchanged') ||
            error?.message?.includes('invalid_grant');

          if (isAlreadyExchanged) {
            console.warn(
              'Refresh token already exchanged - clearing stale refresh token from store AND localStorage'
            );
            // Clear the stale refresh token from both store and localStorage
            set({ refresh_token: null });

            // CRITICAL: Must clear from localStorage too, otherwise it will retry on next page load
            if (sessionStore && currentState.user) {
              const { getSession, saveSession } = await import('../../utils/sessionManager');
              const currentSession = getSession();
              if (currentSession) {
                currentSession.tokens.refresh_token = ''; // Clear the stale token
                saveSession(currentSession);
                console.log('✅ Cleared stale refresh token from localStorage');
              }
            }

            // Session remains valid until expiresAt with current access token
            return;
          }

          // DO NOT auto-signout - session is still valid until expiresAt
          // User can continue with current token or manually sign out if needed
          // Common failures: network issues, API temporarily down
          throw error;
        } finally {
          // Clear the lock after completion
          refreshInProgress = null;
        }
      })();

      return refreshInProgress;
    },

    updateUser: (user: User) => {
      set({ user });
    },

    updateTokens: async (tokens: {
      access_token: string;
      refresh_token?: string;
      expiresAt?: number;
    }) => {
      const now = Date.now();
      set({
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token || get().refresh_token,
        expiresAt: tokens.expiresAt || get().expiresAt,
        refreshedAt: now, // Track when tokens were last refreshed
        state: 'authenticated'
      });

      // Save session to database adapter
      const currentState = get();
      if (currentState.user && currentState.access_token) {
        try {
          await db.saveSession({
            userId: currentState.user.id,
            email: currentState.user.email,
            name: currentState.user.name,
            emailVerified: currentState.user.emailVerified,
            metadata: currentState.user.metadata,
            accessToken: currentState.access_token,
            refreshToken: currentState.refresh_token || '',
            expiresAt: currentState.expiresAt || 0,
            refreshedAt: Date.now(), // Track when tokens were last refreshed
            authMethod: 'email-code' // TODO: track actual auth method
          });
        } catch (error) {
          console.warn('Failed to save session to database:', error);
        }
      }

      // Schedule token refresh
      scheduleTokenRefresh(get, refreshTimeout, config.refreshBefore);
    },

    // State helpers
    isAuthenticated: () => {
      const state = get();
      return (
        state.state === 'authenticated' &&
        !!state.access_token &&
        (!state.expiresAt || state.expiresAt > Date.now())
      );
    },

    getAccessToken: () => {
      const state = get();
      // Check if we have a valid token
      if (state.state === 'authenticated' && state.access_token) {
        // Check if token is not expired
        if (!state.expiresAt || state.expiresAt > Date.now()) {
          return state.access_token;
        }
      }
      return null;
    },

    reset: () => {
      set(initialState);
    }
  });

  const store = createStore<AuthCoreStore>()(
    subscribeWithSelector(enableDevtools ? devtools(storeImpl, { name }) : storeImpl)
  );

  return store;
}

/**
 * Auto-refresh token before expiry
 * @param getState - Function to get current auth state
 * @param refreshBeforeSeconds - Seconds before expiry to trigger refresh (default: 300 = 5 minutes, minimum: 60 = 1 minute)
 */
function scheduleTokenRefresh(
  getState: () => AuthCoreStore,
  refreshTimeout: { current: ReturnType<typeof setTimeout> | null },
  refreshBeforeSeconds = 300
) {
  const state = getState();

  if (!state.expiresAt || !state.refresh_token) {
    return;
  }

  // Cancel any existing scheduled refresh
  if (refreshTimeout.current) {
    clearTimeout(refreshTimeout.current);
    refreshTimeout.current = null;
  }

  // CRITICAL: Enforce minimum wait time between refreshes to prevent spam loops
  // This protects against misconfiguration where refreshBefore > token lifetime
  const MINIMUM_REFRESH_INTERVAL_MS = 60 * 1000; // 1 minute minimum between refreshes

  // Additional spam protection: never refresh more frequently than once per minute
  // Check time since last refresh (refreshedAt)
  const timeSinceLastRefresh = state.refreshedAt ? Date.now() - state.refreshedAt : Infinity;
  if (timeSinceLastRefresh < MINIMUM_REFRESH_INTERVAL_MS) {
    const waitTime = MINIMUM_REFRESH_INTERVAL_MS - timeSinceLastRefresh;
    console.warn(`⚠️ Token was refreshed ${Math.floor(timeSinceLastRefresh / 1000)}s ago - waiting ${Math.floor(waitTime / 1000)}s before scheduling next refresh`);

    // Schedule refresh after the minimum interval has passed
    refreshTimeout.current = setTimeout(() => {
      // Recursively call scheduleTokenRefresh after waiting
      scheduleTokenRefresh(getState, refreshTimeout, refreshBeforeSeconds);
    }, waitTime);
    return;
  }

  const timeUntilExpiry = state.expiresAt - Date.now();
  const refreshBeforeMs = refreshBeforeSeconds * 1000;

  // Calculate when to refresh: (expiry - refreshBefore), but enforce minimum interval
  let refreshTime = Math.max(timeUntilExpiry - refreshBeforeMs, MINIMUM_REFRESH_INTERVAL_MS);

  // Additional safety: if token expires sooner than minimum interval, wait until closer to expiry
  // but still maintain a reasonable buffer (e.g., refresh when 80% through token lifetime)
  if (timeUntilExpiry < MINIMUM_REFRESH_INTERVAL_MS) {
    refreshTime = Math.max(Math.floor(timeUntilExpiry * 0.8), 1000); // Use 80% of remaining time, min 1 second
    console.warn(`⚠️ Token expires in ${Math.floor(timeUntilExpiry / 1000)}s - scheduling refresh sooner than normal interval`);
  }

  console.log(`🔄 Scheduling token refresh in ${Math.floor(refreshTime / 1000)}s (token expires in ${Math.floor(timeUntilExpiry / 1000)}s, last refreshed ${state.refreshedAt ? Math.floor((Date.now() - state.refreshedAt) / 1000) + 's ago' : 'never'})`);

  refreshTimeout.current = setTimeout(async () => {
    try {
      await state.refreshTokens();
    } catch (error) {
      console.warn('❌ Auto token refresh failed:', error);
    }
  }, refreshTime);
}

/**
 * Helper to authenticate user and update core state
 */
export async function authenticateUser(
  store: ReturnType<typeof createAuthCoreStore>,
  user: User,
  tokens: {
    access_token: string;
    refresh_token?: string;
    expiresAt?: number;
  }
) {
  const { updateUser, updateTokens } = store.getState();

  // Update user first
  updateUser(user);

  // Then update tokens (this will set state to 'authenticated')
  await updateTokens({
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    expiresAt: tokens.expiresAt
  });
}

/**
 * Helper to check if token is expired
 */
export function isTokenExpired(store: ReturnType<typeof createAuthCoreStore>): boolean {
  const state = store.getState();

  if (!state.expiresAt) return false; // No expiry set

  return Date.now() >= state.expiresAt;
}

/**
 * Type guard to check if user is authenticated
 */
export function isUserAuthenticated(
  store: ReturnType<typeof createAuthCoreStore>
): store is ReturnType<typeof createAuthCoreStore> & { user: User } {
  return store.getState().isAuthenticated();
}
