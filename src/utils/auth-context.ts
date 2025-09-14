/**
 * Auth Context Utilities for Svelte Components
 *
 * Implements the context + store pattern recommended in ADR 0004.
 * Provides SSR-safe auth store access with explicit component dependencies.
 *
 * Usage:
 * 1. Call setAuthContext(config) in root layout component
 * 2. Use useAuth() in any child component to access the store
 */

import { getContext, setContext } from 'svelte';
import { AUTH_CONTEXT_KEY } from '../constants/context-keys';
import { createAuthStore } from '../stores/auth-store';
import {
  type GlobalAuthStore,
  assertAuthConfig,
  getGlobalAuthStore,
  initializeAuth
} from '../stores/global-auth-store';
import type { AuthConfig } from '../types';

/**
 * Set the auth store in Svelte context (call in +layout.svelte)
 *
 * Creates a new auth store instance scoped to the component tree.
 * This is the preferred pattern per ADR 0004.
 *
 * @param config - Auth configuration
 * @returns The created auth store
 */
export function setAuthContext(config: AuthConfig): GlobalAuthStore {
  assertAuthConfig(config);

  // Create a new store instance for this context
  const authStore = createAuthStore(config);
  setContext(AUTH_CONTEXT_KEY, authStore);

  console.log('🔐 Auth context initialized');
  return authStore;
}

/**
 * Get the auth store from Svelte context
 *
 * Preferred method per ADR 0004 - provides explicit store dependencies.
 * Falls back to global store for backward compatibility during migration.
 *
 * @returns The auth store or throws error if not available
 */
export function getAuthContext(): GlobalAuthStore {
  const contextValue = getContext<GlobalAuthStore | any>(AUTH_CONTEXT_KEY);

  if (!contextValue) {
    // Temporary fallback to global store for migration compatibility
    // TODO: Remove this fallback in next major version
    try {
      console.warn(
        '⚠️ Using legacy global auth store. Migrate to setAuthContext() in layout component.'
      );
      return getGlobalAuthStore();
    } catch {
      throw new Error(
        '🚨 Auth store not available! ' +
          'Call setAuthContext(config) in your root layout component, or ' +
          'use the legacy initializeAuth(config) for backward compatibility.'
      );
    }
  }

  // Handle writable store pattern (auth-demo uses writable(authStore))
  if (
    contextValue &&
    typeof contextValue === 'object' &&
    'subscribe' in contextValue &&
    typeof contextValue.subscribe === 'function'
  ) {
    // This is a writable store containing the auth store - get current value
    let currentValue: GlobalAuthStore | null = null;
    const unsubscribe = contextValue.subscribe((value: GlobalAuthStore | null) => {
      currentValue = value;
    });
    unsubscribe();

    if (!currentValue) {
      throw new Error(
        'Auth store not yet initialized in context. Make sure auth store is created and set in the writable context.'
      );
    }

    return currentValue;
  }

  // Direct auth store (setAuthContext pattern)
  return contextValue as GlobalAuthStore;
}

/**
 * Safely get auth store from context with fallback
 *
 * @returns Auth store or null if not available
 */
export function tryGetAuthContext(): GlobalAuthStore | null {
  try {
    return getAuthContext();
  } catch {
    return null;
  }
}

/**
 * Check if auth store is available in current context
 */
export function hasAuthContext(): boolean {
  return tryGetAuthContext() !== null;
}

/**
 * Hook-like function for Svelte components to access auth store
 *
 * Recommended usage pattern per ADR 0004:
 * ```svelte
 * <script>
 *   import { useAuth } from '@thepia/flows-auth/utils/auth-context';
 *
 *   const auth = useAuth();
 *
 *   // Use auth.subscribe(), auth.signOut(), etc.
 * </script>
 * ```
 *
 * @throws {Error} If auth store is not initialized or available
 */
export function useAuth(): GlobalAuthStore {
  const authStore = getAuthContext();

  // Runtime type validation for extra safety
  if (!authStore || typeof authStore !== 'object') {
    throw new TypeError('Auth store is not a valid object');
  }

  if (!('subscribe' in authStore) || typeof authStore.subscribe !== 'function') {
    throw new TypeError('Auth store does not implement Svelte store interface');
  }

  return authStore;
}

/**
 * Hook-like function that safely returns auth store or null
 *
 * Useful for components that may render before auth is initialized
 */
export function useAuthSafe(): GlobalAuthStore | null {
  return tryGetAuthContext();
}

/**
 * Create a derived store that tracks auth state across the app
 *
 * This is useful for reactive UI that needs to update when auth state changes
 */
export function createAuthStateStore() {
  const auth = getAuthContext();

  return {
    subscribe: auth.subscribe,
    // Add common derived values
    isAuthenticated: auth.isAuthenticated
    // Note: user and loading state are available in the store's subscribe method
  };
}

/**
 * Utility for components that need auth but can work without it
 *
 * @param fallbackConfig - Optional config to initialize auth if not available
 */
export function useOptionalAuth(fallbackConfig?: AuthConfig): {
  auth: GlobalAuthStore | null;
  isAvailable: boolean;
  error: string | null;
} {
  // Type-safe config validation
  if (fallbackConfig) {
    try {
      assertAuthConfig(fallbackConfig);
    } catch (validationError) {
      return {
        auth: null,
        isAvailable: false,
        error: `Invalid fallback config: ${String(validationError)}`
      };
    }
  }
  try {
    const auth = getAuthContext();
    return {
      auth,
      isAvailable: true,
      error: null
    };
  } catch (contextError) {
    if (fallbackConfig) {
      try {
        const auth = initializeAuth(fallbackConfig);
        return {
          auth,
          isAvailable: true,
          error: null
        };
      } catch (initError) {
        return {
          auth: null,
          isAvailable: false,
          error: `Failed to initialize auth: ${String(initError)}`
        };
      }
    }

    return {
      auth: null,
      isAvailable: false,
      error: `Auth not available: ${String(contextError)}`
    };
  }
}
