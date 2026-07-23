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
import type { User } from '../../types/index.js';
import { reportRefreshEvent } from '../../utils/telemetry.js';
import type { AuthCoreState, AuthCoreStore, StoreOptions } from '../types.js';

/**
 * GLOBAL token refresh lock - shared across ALL auth store instances
 *
 * CRITICAL: This prevents concurrent refresh calls even when:
 * - Multiple auth store instances exist
 * - Components re-render and recreate stores
 * - Auto-refresh and manual refresh happen simultaneously
 *
 * WorkOS uses single-use refresh tokens. If two requests use the same token,
 * the second fails with "Refresh token already exchanged" error.
 */
let globalRefreshInProgress: Promise<void> | null = null;

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
  supabase_token: null,
  supabase_expires_at: null,
  passkeysEnabled: false
};

/**
 * Create the core authentication store
 */
export function createAuthCoreStore(options: StoreOptions) {
  const { config, api, db, devtools: enableDevtools = false, name = 'auth-core' } = options;

  // API client already provided in options (for testability)

  // Track scheduled refresh timeout so we can cancel it if needed
  const refreshTimeout = { current: null as ReturnType<typeof setTimeout> | null };

  // Track retry attempts for failed refresh operations
  const refreshRetryState = {
    attempts: 0,
    maxAttempts: 3,
    baseDelayMs: 60 * 1000, // 1 minute base delay
    resetTimeout: null as ReturnType<typeof setTimeout> | null
  };

  // Determine passkey availability
  const determinePasskeysEnabled = (): boolean => {
    if (typeof window === 'undefined') return false;
    if (!config.enablePasskeys) return false;

    // Check for WebAuthn support
    return !!(window.PublicKeyCredential && navigator.credentials?.create);
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
          expiresAt: null,
          supabase_token: null,
          supabase_expires_at: null
        });

        // Clear session from database adapter
        try {
          await db.clearSession();
        } catch (error) {
          console.warn('Failed to clear session from database:', error);
        }
      }
    },

    refreshTokens: async () => {
      // Check GLOBAL refresh lock first (prevents cross-instance races)
      if (globalRefreshInProgress) {
        reportRefreshEvent('CONCURRENCY_DETECTED', {
          message: 'Reusing in-flight refresh request (GLOBAL lock)',
          tabId: typeof window !== 'undefined' ? window.name || 'unnamed' : 'unknown'
        });
        return globalRefreshInProgress;
      }

      const currentState = get();

      if (!currentState.refresh_token) {
        throw new Error('No refresh token available');
      }

      // Log refresh attempt with token info for debugging "already exchanged" errors
      reportRefreshEvent('START', {
        refreshTokenPrefix: `${currentState.refresh_token.substring(0, 8)}...`,
        refreshTokenLength: currentState.refresh_token.length,
        expiresAt: currentState.expiresAt ? new Date(currentState.expiresAt).toISOString() : 'none',
        timeSinceLastRefresh: currentState.refreshedAt
          ? Date.now() - new Date(currentState.refreshedAt).getTime()
          : 'never',
        tabId: typeof window !== 'undefined' ? window.name || 'unnamed' : 'unknown'
      });

      // Create and track the refresh promise in GLOBAL lock
      globalRefreshInProgress = (async () => {
        try {
          const response = await api.refreshToken({
            refresh_token: currentState.refresh_token as string
          });

          if (response.access_token) {
            // Log refresh response for debugging
            console.log('🔄 Token refresh response received:', {
              hasAccessToken: !!response.access_token,
              hasRefreshToken: !!response.refresh_token,
              refreshTokenValue: response.refresh_token
                ? `${response.refresh_token.substring(0, 8)}...`
                : 'none',
              expiresIn: response.expires_in,
              hasSupabaseToken: !!response.supabase_token
            });

            // CRITICAL: Use updateTokens() to ensure session is persisted to storage
            // This is essential for auto-refresh path (scheduleTokenRefresh) which calls core.refreshTokens() directly
            // Without this, auto-refresh updates tokens in memory but doesn't save to SessionPersistence
            await get().updateTokens({
              access_token: response.access_token,
              // CRITICAL: Only use new refresh_token if explicitly provided
              // Don't fall back to old token - that causes "already exchanged" errors
              refresh_token: response.refresh_token ? response.refresh_token : undefined,
              // Convert expires_in (seconds) to ISO string timestamp
              // If missing, explicitly set to null (not undefined) to clear old value
              expiresAt: response.expires_in
                ? new Date(Date.now() + response.expires_in * 1000).toISOString()
                : null,
              supabase_token: response.supabase_token,
              // Convert supabase_expires_at (milliseconds) to ISO string
              supabase_expires_at: response.supabase_expires_at
                ? new Date(response.supabase_expires_at).toISOString()
                : undefined
            });

            console.log(
              '✅ Tokens updated successfully, new refresh token saved:',
              response.refresh_token ? `${response.refresh_token.substring(0, 8)}...` : 'none'
            );

            // Success - reset retry counter
            refreshRetryState.attempts = 0;

            // Note: updateTokens() already schedules next refresh via scheduleTokenRefresh
          }
        } catch (error: any) {
          console.warn('Token refresh failed:', error);

          // Check if this is an "already exchanged" error from WorkOS
          const isAlreadyExchanged =
            error?.message?.includes('already exchanged') ||
            error?.message?.includes('invalid_grant');

          if (isAlreadyExchanged) {
            reportRefreshEvent('ALREADY_EXCHANGED_ERROR', {
              errorMessage: error.message,
              refreshTokenPrefix: currentState.refresh_token
                ? `${currentState.refresh_token.substring(0, 8)}...`
                : 'none',
              lastRefreshTime: currentState.refreshedAt ? currentState.refreshedAt : 'never',
              timeSinceLastRefresh: currentState.refreshedAt
                ? Date.now() - new Date(currentState.refreshedAt).getTime()
                : 'never',
              tabId: typeof window !== 'undefined' ? window.name || 'unnamed' : 'unknown',
              possibleCauses: [
                'Multiple browser tabs with same user',
                'Page reload during refresh',
                'Session restoration with stale token',
                'Concurrent refresh from different components'
              ]
            });
            // Clear the stale refresh token from both store and database adapter
            set({ refresh_token: null });

            // CRITICAL: Must clear from storage too, otherwise it will retry on next page load
            if (currentState.user) {
              try {
                // Save back to database adapter
                await db.saveSession({ refreshToken: '' });
                console.log('✅ Cleared stale refresh token from storage via SessionPersistence');
              } catch (error) {
                console.error('Failed to clear stale refresh token from storage:', error);
              }
            }

            // Reset retry counter for permanent failures
            refreshRetryState.attempts = 0;

            // Session remains valid until expiresAt with current access token
            return;
          }

          // Check if this is a permanent failure (400 Bad Request with specific errors)
          const isPermanentFailure =
            error?.status === 400 ||
            error?.code === 'token_refresh_failed' || // 5xx from refresh endpoint — token is bad, not the server
            error?.message?.includes('invalid_token') ||
            error?.message?.includes('token_expired') ||
            error?.message?.includes('malformed');

          if (isPermanentFailure) {
            console.warn('🔴 Permanent refresh token failure - resetting retry counter');
            refreshRetryState.attempts = 0;
            throw error;
          }

          // Transient failure (network, 503, etc.) - implement retry logic
          refreshRetryState.attempts++;

          if (refreshRetryState.attempts <= refreshRetryState.maxAttempts) {
            // Calculate exponential backoff: 1min, 5min, 15min
            const delayMultiplier = 5 ** (refreshRetryState.attempts - 1);
            const retryDelayMs = refreshRetryState.baseDelayMs * delayMultiplier;

            console.warn(
              `⚠️ Token refresh failed (attempt ${refreshRetryState.attempts}/${refreshRetryState.maxAttempts}) - retrying in ${Math.floor(retryDelayMs / 1000)}s`,
              error
            );

            // Schedule retry with exponential backoff
            if (refreshTimeout.current) {
              clearTimeout(refreshTimeout.current);
            }

            refreshTimeout.current = setTimeout(async () => {
              console.log(
                `🔄 Retrying token refresh (attempt ${refreshRetryState.attempts}/${refreshRetryState.maxAttempts})`
              );
              // Call refreshTokens() recursively - it will handle success/failure and counter reset
              // The counter is reset in the success path (after updateTokens) not here
              try {
                await get().refreshTokens();
              } catch (_retryError) {
                // Errors are already logged and handled by refreshTokens()
                // This catch prevents unhandled promise rejection
              }
            }, retryDelayMs);

            // Auto-reset retry counter after 1 hour of successful operation
            if (refreshRetryState.resetTimeout) {
              clearTimeout(refreshRetryState.resetTimeout);
            }
            refreshRetryState.resetTimeout = setTimeout(
              () => {
                console.log('🔄 Resetting refresh retry counter after successful period');
                refreshRetryState.attempts = 0;
              },
              60 * 60 * 1000
            ); // 1 hour

            return; // Don't throw - we're retrying
          }

          console.error(
            `🔴 Token refresh failed after ${refreshRetryState.maxAttempts} attempts - giving up`,
            error
          );
          refreshRetryState.attempts = 0;

          // DO NOT auto-signout - session is still valid until expiresAt
          // User can continue with current token or manually sign out if needed
          throw error;
        } finally {
          // Clear the GLOBAL lock after completion
          globalRefreshInProgress = null;
        }
      })();

      return globalRefreshInProgress;
    },

    updateUser: (user: User) => {
      set({ user });
    },

    updateTokens: async (tokens: {
      access_token: string;
      refresh_token?: string;
      expiresAt: string | number | null; // ISO 8601 timestamp string OR numeric milliseconds (for migration)
      supabase_token?: string;
      supabase_expires_at?: string | number; // ISO 8601 timestamp string OR numeric milliseconds (for migration)
    }) => {
      const now = Date.now();
      const currentStateBefore = get();

      // Convert timestamps to ISO strings (handles both ISO strings and numeric milliseconds for migration)
      const expiresAtIso = tokens.expiresAt
        ? typeof tokens.expiresAt === 'number'
          ? new Date(tokens.expiresAt).toISOString()
          : tokens.expiresAt
        : null;
      const supabaseExpiresAtIso = tokens.supabase_expires_at
        ? typeof tokens.supabase_expires_at === 'number'
          ? new Date(tokens.supabase_expires_at).toISOString()
          : tokens.supabase_expires_at
        : undefined;

      // GUARD: Prevent overwriting newer tokens with stale ones (multi-tab race protection)
      // This prevents scenarios where Tab A refreshes successfully but Tab B with stale tokens
      // tries to overwrite the fresh tokens from Tab A
      if (expiresAtIso && currentStateBefore.expiresAt) {
        const incomingExpiresAtMs = new Date(expiresAtIso).getTime();
        const currentExpiresAtMs = new Date(currentStateBefore.expiresAt).getTime();
        if (incomingExpiresAtMs < currentExpiresAtMs) {
          console.warn(
            '[Auth Core] Rejecting token update - incoming tokens expire earlier than current tokens',
            {
              currentExpiresAt: currentStateBefore.expiresAt,
              incomingExpiresAt: expiresAtIso,
              tabId: typeof window !== 'undefined' ? window.name || 'unnamed' : 'unknown'
            }
          );
          return; // Skip this update - current tokens are fresher
        }
      }

      // Log token update for debugging refresh token rotation
      reportRefreshEvent('UPDATE_TOKENS', {
        newRefreshToken: tokens.refresh_token
          ? `${tokens.refresh_token.substring(0, 8)}...`
          : 'none',
        oldRefreshToken: currentStateBefore.refresh_token
          ? `${currentStateBefore.refresh_token.substring(0, 8)}...`
          : 'none',
        refreshTokenChanged: tokens.refresh_token !== currentStateBefore.refresh_token,
        expiresAt: expiresAtIso || 'none',
        tabId: typeof window !== 'undefined' ? window.name || 'unnamed' : 'unknown'
      });

      set({
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token ?? get().refresh_token,
        // null means no expiry known (graceful degradation when server doesn't provide expires_in)
        expiresAt: expiresAtIso,
        refreshedAt: new Date(now).toISOString(), // Track when tokens were last refreshed
        supabase_token: tokens.supabase_token,
        supabase_expires_at: supabaseExpiresAtIso,
        state: 'authenticated'
      });

      // Save session to database adapter
      const currentState = get();
      if (currentState.user && currentState.access_token) {
        try {
          // Save session (tokens)
          await db.saveSession({
            userId: currentState.user.id,
            email: currentState.user.email,
            name: currentState.user.name,
            emailVerified: currentState.user.emailVerified,
            metadata: currentState.user.metadata,
            accessToken: currentState.access_token,
            refreshToken: currentState.refresh_token || '',
            expiresAt: currentState.expiresAt || new Date(now).toISOString(),
            refreshedAt: new Date(now).toISOString(), // Track when tokens were last refreshed
            authMethod: 'email-code', // TODO: track actual auth method
            supabaseToken: currentState.supabase_token || undefined,
            supabaseExpiresAt: currentState.supabase_expires_at || undefined
          });

          // Save user profile
          await db.saveUser({
            userId: currentState.user.id,
            email: currentState.user.email,
            name: currentState.user.name,
            emailVerified: currentState.user.emailVerified,
            createdAt: currentState.user.createdAt,
            lastLoginAt: currentState.user.lastLoginAt,
            metadata: currentState.user.metadata,
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
      // expiresAt is now an ISO string, parse it for comparison
      const expiresAtMs = state.expiresAt ? new Date(state.expiresAt).getTime() : null;
      return (
        state.state === 'authenticated' &&
        !!state.access_token &&
        (!expiresAtMs || expiresAtMs > Date.now())
      );
    },

    getAccessToken: () => {
      const state = get();
      // Check if we have a valid token
      if (state.state === 'authenticated' && state.access_token) {
        // Check if token is not expired
        // expiresAt is now an ISO string, parse it for comparison
        const expiresAtMs = state.expiresAt ? new Date(state.expiresAt).getTime() : null;
        if (!expiresAtMs || expiresAtMs > Date.now()) {
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
  const refreshedAtMs = state.refreshedAt ? new Date(state.refreshedAt).getTime() : null;
  const timeSinceLastRefresh = refreshedAtMs
    ? Date.now() - refreshedAtMs
    : Number.POSITIVE_INFINITY;
  if (timeSinceLastRefresh < MINIMUM_REFRESH_INTERVAL_MS) {
    const waitTime = MINIMUM_REFRESH_INTERVAL_MS - timeSinceLastRefresh;
    console.warn(
      `⚠️ Token was refreshed ${Math.floor(timeSinceLastRefresh / 1000)}s ago - waiting ${Math.floor(waitTime / 1000)}s before scheduling next refresh`
    );

    // Schedule refresh after the minimum interval has passed
    refreshTimeout.current = setTimeout(() => {
      // Recursively call scheduleTokenRefresh after waiting
      scheduleTokenRefresh(getState, refreshTimeout, refreshBeforeSeconds);
    }, waitTime);
    return;
  }

  const expiresAtMs = new Date(state.expiresAt).getTime();
  const timeUntilExpiry = expiresAtMs - Date.now();
  const refreshBeforeMs = refreshBeforeSeconds * 1000;

  // Calculate when to refresh: (expiry - refreshBefore), but enforce minimum interval
  let refreshTime = Math.max(timeUntilExpiry - refreshBeforeMs, MINIMUM_REFRESH_INTERVAL_MS);

  // Additional safety: if token expires sooner than minimum interval, wait until closer to expiry
  // but still maintain a reasonable buffer (e.g., refresh when 80% through token lifetime)
  if (timeUntilExpiry < MINIMUM_REFRESH_INTERVAL_MS) {
    refreshTime = Math.max(Math.floor(timeUntilExpiry * 0.8), 1000); // Use 80% of remaining time, min 1 second
    console.warn(
      `⚠️ Token expires in ${Math.floor(timeUntilExpiry / 1000)}s - scheduling refresh sooner than normal interval`
    );
  }

  console.log(
    `🔄 Scheduling token refresh in ${Math.floor(refreshTime / 1000)}s (token expires in ${Math.floor(timeUntilExpiry / 1000)}s, last refreshed ${state.refreshedAt ? `${Math.floor((Date.now() - new Date(state.refreshedAt).getTime()) / 1000)}s ago` : 'never'})`
  );

  refreshTimeout.current = setTimeout(async () => {
    try {
      await state.refreshTokens();
      // refreshTokens() handles its own retry logic internally
      // If it succeeds (or returns without throwing after retries), we don't need to do anything
      // The updateTokens() call inside refreshTokens() will schedule the next refresh
    } catch (error) {
      // If refreshTokens() throws after exhausting retries, log and give up
      console.warn('❌ Auto token refresh failed after all retry attempts:', error);
      // Don't schedule another refresh - let the session expire naturally
      // User will need to sign in again when they try to use the app
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
    expiresAt: string | null; // ISO 8601 timestamp string
    supabase_token?: string;
    supabase_expires_at?: string; // ISO 8601 timestamp string
  }
) {
  const { updateUser, updateTokens } = store.getState();

  // Update user first
  updateUser(user);

  // Then update tokens (this will set state to 'authenticated')
  await updateTokens(tokens);
}

/**
 * Helper to check if token is expired
 */
export function isTokenExpired(store: ReturnType<typeof createAuthCoreStore>): boolean {
  const state = store.getState();

  if (!state.expiresAt) return false; // No expiry set

  const expiresAtMs = new Date(state.expiresAt).getTime();
  return Date.now() >= expiresAtMs;
}

/**
 * Type guard to check if user is authenticated
 */
export function isUserAuthenticated(
  store: ReturnType<typeof createAuthCoreStore>
): store is ReturnType<typeof createAuthCoreStore> & { user: User } {
  return store.getState().isAuthenticated();
}
