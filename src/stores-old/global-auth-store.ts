/**
 * Global Auth Store Singleton
 *
 * Ensures that only one auth store exists per application, preventing:
 * - Multiple auth instances with inconsistent state
 * - Duplicate API calls
 * - Memory leaks from multiple store subscriptions
 * - Race conditions between auth instances
 *
 * Usage:
 * - Call `initializeAuth(config)` once at app startup (usually in +layout.svelte)
 * - Use `getGlobalAuthStore()` everywhere else to access the singleton
 * - Components should never create their own auth stores
 */

import type { AuthConfig } from '../types';
import { createAuthStore } from './auth-store';

// Global singleton instance
let globalAuthStore: ReturnType<typeof createAuthStore> | null = null;
let globalConfig: AuthConfig | null = null;
let isInitialized = false;

/**
 * Initialize the global auth store - call this ONCE at app startup
 *
 * @param config - Auth configuration
 * @throws Error if already initialized with different config
 */
export function initializeAuth(config: AuthConfig): SvelteAuthStore {
  // Validate config at runtime for better TypeScript safety
  assertAuthConfig(config);
  if (typeof window === 'undefined') {
    throw new Error('Auth store can only be initialized in browser environment');
  }

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

  // Create the singleton instance
  globalAuthStore = createAuthStore(config);
  globalConfig = config;
  isInitialized = true;

  console.log('🔐 Global auth store initialized');

  return globalAuthStore;
}

/**
 * Get the global auth store instance
 *
 * @throws Error if not initialized
 */
export function getGlobalAuthStore(): SvelteAuthStore {
  if (!isInitialized || !globalAuthStore) {
    throw new Error(
      '🚨 Auth store not initialized! Call initializeAuth(config) first, ' +
        'typically in your root layout component (+layout.svelte).'
    );
  }

  return globalAuthStore;
}

/**
 * Check if the global auth store is initialized
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
 * Reset the global auth store (primarily for testing)
 *
 * ⚠️ WARNING: Only use this in tests or when completely reinitializing the app
 */
export function resetGlobalAuthStore(): void {
  if (globalAuthStore) {
    // Call reset method if available
    if ('reset' in globalAuthStore && typeof globalAuthStore.reset === 'function') {
      globalAuthStore.reset();
    }
  }

  globalAuthStore = null;
  globalConfig = null;
  isInitialized = false;

  console.log('🔄 Global auth store reset');
}

/**
 * Update the global auth configuration
 *
 * ⚠️ WARNING: This will reinitialize the auth store, clearing current session
 */
export function updateGlobalAuthConfig(config: AuthConfig): SvelteAuthStore {
  assertAuthConfig(config);
  console.log('🔄 Updating global auth config');

  resetGlobalAuthStore();
  return initializeAuth(config);
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

// Type-safe exports with explicit generic constraints
export type SvelteAuthStore = ReturnType<typeof createAuthStore>;
export type AuthStoreInitializer = typeof initializeAuth;
export type AuthStoreGetter = typeof getGlobalAuthStore;

// Strict type checking for config validation
export function assertAuthConfig(config: unknown): asserts config is AuthConfig {
  if (!config || typeof config !== 'object') {
    throw new TypeError('AuthConfig must be an object');
  }

  const c = config as Record<string, unknown>;

  if (typeof c.apiBaseUrl !== 'string') {
    throw new TypeError('AuthConfig.apiBaseUrl must be a string');
  }

  if (typeof c.clientId !== 'string') {
    throw new TypeError('AuthConfig.clientId must be a string');
  }

  if (typeof c.domain !== 'string') {
    throw new TypeError('AuthConfig.domain must be a string');
  }

  if (typeof c.enablePasskeys !== 'boolean') {
    throw new TypeError('AuthConfig.enablePasskeys must be a boolean');
  }

  if (typeof c.enableMagicLinks !== 'boolean') {
    throw new TypeError('AuthConfig.enableMagicLinks must be a boolean');
  }
}
