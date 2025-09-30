/**
 * Global Auth Store Wrapper
 *
 * Provides a Svelte-compatible wrapper around the ComposedAuthStore for
 * backward compatibility with existing code that expects global store patterns.
 *
 * This uses makeSvelteCompatible to create the proper Svelte store interface
 * while maintaining the same API as the original auth-store.
 */

import type { AuthConfig, AuthStore } from '../types';
import type { SvelteAuthStore } from '../types/svelte';
import { makeSvelteCompatible } from './adapters/svelte';
import { createAuthStore } from './auth-store';

/**
 * Type alias for backward compatibility
 */
export type GlobalAuthStore = SvelteAuthStore;
export type AuthStoreInitializer = (config: AuthConfig) => GlobalAuthStore;
export type AuthStoreGetter = () => GlobalAuthStore;

/**
 * Global store instance (for backward compatibility)
 */
let globalAuthStore: GlobalAuthStore | null = null;
let globalConfig: AuthConfig | null = null;
let isInitialized = false;

/**
 * Initialize the global auth store
 *
 * @param config - Auth configuration
 * @returns Svelte-compatible auth store
 */
export function initializeAuth(config: AuthConfig): GlobalAuthStore {
  assertAuthConfig(config);

  // If already initialized, validate config consistency
  if (isInitialized && globalAuthStore) {
    if (!areConfigsEqual(globalConfig!, config)) {
      console.warn(
        '⚠️ Auth store already initialized with different config. Using existing config.'
      );
      console.warn('Previous config:', globalConfig);
      console.warn('New config:', config);
    }
    return globalAuthStore;
  }

  const composedStore = createAuthStore(config);
  globalAuthStore = makeSvelteCompatible(composedStore);
  globalConfig = config;
  isInitialized = true;

  console.log('🔐 Global auth store initialized');
  return globalAuthStore;
}

/**
 * Get the global auth store instance
 *
 * @returns The global auth store
 * @throws Error if not initialized
 */
export function getGlobalAuthStore(): GlobalAuthStore {
  if (!globalAuthStore) {
    throw new Error('Global auth store not initialized. Call initializeAuth(config) first.');
  }
  return globalAuthStore;
}

/**
 * Reset the global auth store (useful for testing)
 */
export function resetGlobalAuthStore(): void {
  if (globalAuthStore) {
    globalAuthStore.destroy();
  }

  globalAuthStore = null;
  globalConfig = null;
  isInitialized = false;

  console.log('🔄 Global auth store reset');
}

/**
 * Check if the global auth store is initialized
 */
export function isGlobalAuthStoreInitialized(): boolean {
  return globalAuthStore !== null;
}

/**
 * Check if the global auth store is initialized (legacy name)
 */
export function isAuthStoreInitialized(): boolean {
  return isInitialized && globalAuthStore !== null;
}

/**
 * Get the current auth configuration
 *
 * @throws Error if not initialized
 */
export function getGlobalAuthConfig(): AuthConfig {
  if (!globalConfig) {
    throw new Error('Auth store not initialized');
  }
  return globalConfig;
}

/**
 * Update the global auth configuration
 *
 * ⚠️ WARNING: This will reinitialize the auth store, clearing current session
 */
export function updateGlobalAuthConfig(config: AuthConfig): GlobalAuthStore {
  assertAuthConfig(config);
  console.log('🔄 Updating global auth config');

  resetGlobalAuthStore();
  return initializeAuth(config);
}

/**
 * Convenience function that safely gets the auth store or initializes it
 *
 * This is useful for components that might be loaded before the auth store is initialized
 *
 * @param fallbackConfig - Config to use if auth store isn't initialized
 */
export function getOrInitializeAuth(fallbackConfig?: AuthConfig): GlobalAuthStore | null {
  if (fallbackConfig) {
    assertAuthConfig(fallbackConfig);
  }
  try {
    return getGlobalAuthStore();
  } catch (error) {
    if (fallbackConfig) {
      console.warn('⚠️ Auth store not initialized, using fallback config');
      return initializeAuth(fallbackConfig);
    }

    console.error('❌ Auth store not initialized and no fallback config provided');
    return null;
  }
}

/**
 * Type guard to check if a value is a global auth store
 */
export function isGlobalAuthStore(value: unknown): value is GlobalAuthStore {
  return (
    value !== null &&
    typeof value === 'object' &&
    'subscribe' in value &&
    typeof (value as any).subscribe === 'function' &&
    'signInWithPasskey' in value &&
    typeof (value as any).signInWithPasskey === 'function' &&
    'getState' in value &&
    typeof (value as any).getState === 'function'
  );
}

/**
 * Assert that a config is valid for auth store
 */
export function assertAuthConfig(config: unknown): asserts config is AuthConfig {
  if (!config || typeof config !== 'object') {
    throw new Error('Auth config must be an object');
  }

  const c = config as any;

  if (!c.apiBaseUrl || typeof c.apiBaseUrl !== 'string') {
    throw new Error('Auth config must have apiBaseUrl string');
  }

  if (!c.clientId || typeof c.clientId !== 'string') {
    throw new Error('Auth config must have clientId string');
  }

  if (!c.domain || typeof c.domain !== 'string') {
    throw new Error('Auth config must have domain string');
  }

  // Additional validation could be added here
}

/**
 * Factory function to create a new auth store (for context-based usage)
 */
export function createGlobalAuthStore(config: AuthConfig): GlobalAuthStore {
  assertAuthConfig(config);
  const composedStore = createAuthStore(config);
  return makeSvelteCompatible(composedStore);
}

/**
 * Compare two auth configurations for equality
 */
function areConfigsEqual(config1: AuthConfig, config2: AuthConfig): boolean {
  return (
    config1.apiBaseUrl === config2.apiBaseUrl &&
    config1.clientId === config2.clientId &&
    config1.domain === config2.domain &&
    config1.enablePasskeys === config2.enablePasskeys &&
    config1.enableMagicLinks === config2.enableMagicLinks
  );
}

/**
 * Backward compatibility exports
 */
export { initializeAuth as createAuthStore, getGlobalAuthStore as getAuthStore };
