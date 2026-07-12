/**
 * Auth Context Utilities for Svelte Components
 *
 * Implements the context + store pattern recommended in ADR 0004.
 * Provides SSR-safe auth store access with explicit component dependencies.
 *
 * 📋 AUTHORITY: ADR 0004 - Global Svelte Store Architecture
 * 📖 Complete guide: docs/adr/0004-global-svelte-store-architecture.md
 *
 * Usage for Pure Svelte Apps:
 * 1. Call setupAuthContext(config) in root layout during initialization
 * 2. Use getGlobalAuthStore() in any child component to access the store
 *
 * Usage for SvelteKit Apps:
 * - Consider explicit prop passing (see ADR 0004) for maximum reliability
 * - Use context only when synchronous initialization is guaranteed
 */

import { getContext, setContext } from 'svelte';
import { AUTH_CONTEXT_KEY } from '../constants/context-keys';
import { makeSvelteCompatible } from '../stores/adapters/svelte';
import { createAuthStore } from '../stores/auth-store';
import type { AuthConfig } from '../types';
import type { SvelteAuthStore } from '../types/svelte';

// Module-level fallback for Svelte 5 HMR: getContext throws lifecycle_outside_component
// inside HMR branch effects, so getAuthStoreFromContext falls back to this reference.
let _hmrFallbackStore: SvelteAuthStore | null = null;

/**
 * Reset the global auth store (useful for testing)
 */
export function resetGlobalAuthStore(): void {
  const store = getContext<SvelteAuthStore>(AUTH_CONTEXT_KEY);
  if (store) {
    store.destroy();
  }
  setContext(AUTH_CONTEXT_KEY, null);
  console.log('🔄 Global auth store reset');
}

/**
 * Update the global auth configuration
 *
 * ⚠️ WARNING: This will reinitialize the auth store, clearing current session
 */
export function updateGlobalAuthConfig(config: AuthConfig): SvelteAuthStore {
  const store = getContext<SvelteAuthStore>(AUTH_CONTEXT_KEY);
  if (store) {
    store.updateConfig(config);
  }
  return store;
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
 * Get auth store from Svelte context using the library's Svelte runtime
 *
 * This works in both app components and library components because it uses
 * the library's Svelte import for getContext.
 *
 * Usage in any component:
 * ```svelte
 * import { getAuthStoreFromContext } from '@thepia/flows-auth/stores/global-auth-store';
 *
 * const authStore = getAuthStoreFromContext();
 * ```
 *
 * @returns The auth store from context
 * @throws Error if not available
 */
export function getAuthStoreFromContext(): SvelteAuthStore {
  const store = getContext<SvelteAuthStore>(AUTH_CONTEXT_KEY);
  if (store) return store;

  if (_hmrFallbackStore) return _hmrFallbackStore;

  throw new Error(
    'Auth store not found in context. Call setupAuthContext(config) in your root layout component.'
  );
}

/**
 * Create an auth store without registering it in Svelte context.
 *
 * Call this at the top of +layout.svelte, then call setContext(AUTH_CONTEXT_KEY, store)
 * immediately after — keeping setContext in the component's own script so Svelte 5
 * can track it during component initialization (avoids lifecycle_outside_component in HMR).
 *
 * @param config - Auth configuration
 * @returns The created auth store (not yet in context)
 */
export function createAuthContext(config: AuthConfig): SvelteAuthStore {
  assertAuthConfig(config);
  return makeSvelteCompatible(createAuthStore(config));
}

/**
 * Set the auth store in Svelte context (call in +layout.svelte)
 *
 * Creates a new auth store instance scoped to the component tree.
 * This is the preferred pattern per ADR 0004.
 *
 * Prefer calling createAuthContext() + setContext(AUTH_CONTEXT_KEY, store) directly
 * in your +layout.svelte — that keeps setContext in the component's own script and
 * avoids lifecycle_outside_component errors in Svelte 5 HMR.
 *
 * @param config - Auth configuration
 * @returns The created auth store
 */
export function setupAuthContext(config: AuthConfig): SvelteAuthStore {
  assertAuthConfig(config);

  const authStore = makeSvelteCompatible(createAuthStore(config));
  _hmrFallbackStore = authStore;
  setContext(AUTH_CONTEXT_KEY, authStore);

  return authStore;
}
