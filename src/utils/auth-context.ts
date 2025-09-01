/**
 * Auth Context Utilities for Svelte Components
 * 
 * Provides easy access to the global auth store from any component
 * without needing to pass stores down through props.
 * 
 * This is the Svelte equivalent of React Context for auth state.
 */

import { getContext, setContext } from 'svelte';
import { getGlobalAuthStore, initializeAuth, assertAuthConfig, type GlobalAuthStore } from '../stores/global-auth-store';
import type { AuthConfig } from '../types';

const AUTH_CONTEXT_KEY = 'flows-auth-store';

/**
 * Set the auth store in Svelte context (usually in +layout.svelte)
 * 
 * @param config - Auth configuration
 * @returns The initialized auth store
 */
export function setAuthContext(config: AuthConfig): GlobalAuthStore {
  const authStore = initializeAuth(config);
  setContext(AUTH_CONTEXT_KEY, authStore);
  return authStore;
}

/**
 * Get the auth store from Svelte context
 * 
 * @returns The auth store or throws error if not available
 */
export function getAuthContext(): GlobalAuthStore {
  const authStore = getContext<GlobalAuthStore>(AUTH_CONTEXT_KEY);
  
  if (!authStore) {
    // Fallback to global store if context not available
    try {
      return getGlobalAuthStore();
    } catch {
      throw new Error(
        '🚨 Auth store not available in component context! ' +
        'Make sure to call setAuthContext(config) in your root layout component.'
      );
    }
  }
  
  return authStore;
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
 * Usage in component:
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