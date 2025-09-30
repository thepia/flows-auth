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
  accessToken: null,
  refreshToken: null,
  expiresAt: null,
  passkeysEnabled: false
};

/**
 * Create the core authentication store
 */
export function createAuthCoreStore(options: StoreOptions) {
  const { config, devtools: enableDevtools = false, name = 'auth-core' } = options;

  // Initialize API client
  const api = new AuthApiClient(config);

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
        if (currentState.accessToken) {
          await api.signOut({
            accessToken: currentState.accessToken,
            refreshToken: currentState.refreshToken || undefined
          });
        }
      } catch (error) {
        console.warn('Server sign out failed:', error);
      } finally {
        // Always clear local state
        set({
          state: 'unauthenticated',
          user: null,
          accessToken: null,
          refreshToken: null,
          expiresAt: null
        });
      }
    },

    refreshTokens: async () => {
      const currentState = get();

      if (!currentState.refreshToken) {
        throw new Error('No refresh token available');
      }

      try {
        const response = await api.refreshToken({
          refreshToken: currentState.refreshToken
        });

        if (response.accessToken) {
          set({
            accessToken: response.accessToken,
            refreshToken: response.refreshToken || currentState.refreshToken,
            expiresAt: response.expiresIn ? Date.now() + response.expiresIn * 1000 : null
          });

          // Schedule next refresh
          scheduleTokenRefresh(get);
        }
      } catch (error) {
        console.warn('Token refresh failed:', error);
        // Force sign out on refresh failure
        await get().signOut();
        throw error;
      }
    },

    updateUser: (user: User) => {
      set({ user });
    },

    updateTokens: (tokens: {
      accessToken: string;
      refreshToken?: string;
      expiresAt?: number;
    }) => {
      set({
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken || get().refreshToken,
        expiresAt: tokens.expiresAt || get().expiresAt,
        state: 'authenticated'
      });

      // Schedule token refresh
      scheduleTokenRefresh(get);
    },

    // State helpers
    isAuthenticated: () => {
      const state = get();
      return (
        state.state === 'authenticated' &&
        !!state.accessToken &&
        (!state.expiresAt || state.expiresAt > Date.now())
      );
    },

    getAccessToken: () => {
      const state = get();
      // Check if we have a valid token
      if (state.state === 'authenticated' && state.accessToken) {
        // Check if token is not expired
        if (!state.expiresAt || state.expiresAt > Date.now()) {
          return state.accessToken;
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
 */
function scheduleTokenRefresh(getState: () => AuthCoreStore) {
  const state = getState();

  if (!state.expiresAt || !state.refreshToken) return;

  const timeUntilExpiry = state.expiresAt - Date.now();
  const refreshTime = Math.max(timeUntilExpiry - 5 * 60 * 1000, 1000); // 5 minutes before expiry

  setTimeout(async () => {
    try {
      await state.refreshTokens();
    } catch (error) {
      console.warn('Auto token refresh failed:', error);
    }
  }, refreshTime);
}

/**
 * Helper to authenticate user and update core state
 */
export function authenticateUser(
  store: ReturnType<typeof createAuthCoreStore>,
  user: User,
  tokens: {
    accessToken: string;
    refreshToken?: string;
    expiresAt?: number;
  }
) {
  const { updateUser, updateTokens } = store.getState();

  // Update user first
  updateUser(user);

  // Then update tokens (this will set state to 'authenticated')
  updateTokens({
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
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
