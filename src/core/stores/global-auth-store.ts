/**
 * Global auth store singleton — an alternative to the Context/Provider pattern
 * (`src/react/context.tsx`'s `AuthProvider`, `src/svelte/auth-context.ts`) for
 * consumers who only ever need one, app-wide auth store.
 *
 * Framework-agnostic: call `initializeAuth(config)` once, synchronously, at app
 * startup — before any code that needs the store runs — then `getGlobalAuthStore()`
 * anywhere else. Because creation isn't tied to any component's render/mount
 * lifecycle, it can't be torn down and left unrecreated by React StrictMode's
 * dev-mode double-invoke (mount -> cleanup -> remount only re-runs effects, not
 * the render body that created the store) the way a `useRef` + `useEffect`
 * cleanup pattern can — see `src/react/context.tsx`'s header comment for that
 * failure mode in detail, and thepia.com's ADR 0004 ("Reactive Loop Prevention")
 * for the equivalent Svelte-side hazard (creating the store reactively inside
 * `onMount` without a guard).
 *
 * Consumers who need multiple independently-configured stores in the same page
 * (e.g. two differently-scoped auth widgets) should use `createAuthStore(config)`
 * directly instead — this module assumes exactly one.
 */
import type { AuthApiClient } from '../api/auth-api.js';
import type { AuthConfig } from '../types/index.js';
import { type ComposedAuthStore, createAuthStore } from './auth-store.js';

let globalAuthStore: ComposedAuthStore | null = null;
let globalConfig: AuthConfig | null = null;

function areConfigsEqual(a: AuthConfig, b: AuthConfig): boolean {
  return (
    a.apiBaseUrl === b.apiBaseUrl &&
    a.clientId === b.clientId &&
    a.domain === b.domain &&
    a.appCode === b.appCode &&
    a.enablePasskeys === b.enablePasskeys
  );
}

/**
 * Initialize the global auth store. Call once, synchronously, at app startup.
 * Calling again with an equivalent config is a no-op that returns the existing
 * instance; calling with a different config warns and still returns the
 * existing instance (call `resetGlobalAuthStore()` first to actually reconfigure).
 */
export function initializeAuth(config: AuthConfig, apiClient?: AuthApiClient): ComposedAuthStore {
  if (globalAuthStore) {
    if (globalConfig && !areConfigsEqual(globalConfig, config)) {
      console.warn(
        '⚠️ Global auth store already initialized with a different config -- returning the existing instance. Call resetGlobalAuthStore() first to reconfigure.'
      );
    }
    return globalAuthStore;
  }

  globalAuthStore = createAuthStore(config, apiClient);
  globalConfig = config;
  return globalAuthStore;
}

/** Get the global auth store. Throws if `initializeAuth()` hasn't been called yet. */
export function getGlobalAuthStore(): ComposedAuthStore {
  if (!globalAuthStore) {
    throw new Error(
      'Global auth store not initialized. Call initializeAuth(config) once at app startup before getGlobalAuthStore().'
    );
  }
  return globalAuthStore;
}

/** Whether `initializeAuth()` has already been called. */
export function isAuthStoreInitialized(): boolean {
  return globalAuthStore !== null;
}

/** Tear down and forget the global auth store (primarily for tests). */
export function resetGlobalAuthStore(): void {
  globalAuthStore?.destroy();
  globalAuthStore = null;
  globalConfig = null;
}
