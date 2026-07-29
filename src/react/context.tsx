/**
 * React context for the auth store
 *
 * Mirrors the Svelte context + store pattern (`src/svelte/auth-context.ts`,
 * ADR 0004): `<AuthProvider>` creates a single `ComposedAuthStore` instance
 * scoped to the component tree and makes it available to any descendant via
 * `useAuthStore()` (prop-first / context-fallback, see `src/react/hooks/useAuthStore.ts`).
 *
 * Imports reach `src/core/**` via relative paths rather than the
 * `@thepia/flows-auth` package self-reference that `src/svelte/auth-context.ts`
 * uses, because this file is bundled by `tsup` (see `tsup.react.config.ts`):
 * esbuild does not resolve a package's self-reference to itself the way
 * Node's runtime resolver or `svelte-package`'s type-checker do, so a
 * self-reference import here would fail to bundle.
 */

import type { ReactNode } from 'react';
import { createContext, useEffect, useRef } from 'react';
import type { AuthApiClient } from '../core/api/auth-api.js';
import type { ComposedAuthStore } from '../core/stores/auth-store.js';
import { createAuthStore } from '../core/stores/auth-store.js';
import type { AuthConfig } from '../core/types/index.js';

/**
 * Holds the `ComposedAuthStore` for the component tree beneath `<AuthProvider>`.
 * `null` when no provider is mounted — components should not read this
 * directly; use `useAuthStore()` instead, which throws a clear error in that case.
 */
export const AuthStoreContext = createContext<ComposedAuthStore | null>(null);

export interface AuthProviderProps {
  /** Auth configuration used to create the store (see `AuthConfig`). */
  config: AuthConfig;
  /** Optional API client override, primarily for testing/dependency injection. */
  apiClient?: AuthApiClient;
  children: ReactNode;
}

/**
 * Creates a `ComposedAuthStore` once (lazily, via `useRef`) and provides it to
 * descendants through `AuthStoreContext`. The store is destroyed automatically
 * when the provider unmounts.
 */
export function AuthProvider({ config, apiClient, children }: AuthProviderProps) {
  const storeRef = useRef<ComposedAuthStore | null>(null);
  if (storeRef.current === null) {
    storeRef.current = createAuthStore(config, apiClient);
  }
  const store = storeRef.current;

  useEffect(() => {
    return () => {
      store.destroy();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store]);

  return <AuthStoreContext.Provider value={store}>{children}</AuthStoreContext.Provider>;
}
