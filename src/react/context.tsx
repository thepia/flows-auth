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
import { createContext, useRef } from 'react';
import type { AuthApiClient } from '../core/api/auth-api.js';
import type { ComposedAuthStore } from '../core/stores/auth-store.js';
import { createAuthStore } from '../core/stores/auth-store.js';
import type { AuthConfig } from '../core/types/index.js';
import { useLocale } from './hooks/useLocale.js';

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
 * descendants through `AuthStoreContext`, for the lifetime of the page.
 *
 * Deliberately does NOT destroy the store on unmount. `createAuthStore()` runs
 * in the render body (needed so `children` always has a store on their very
 * first render -- a useState+useEffect version would render one frame with no
 * store, which useAuthStore() treats as a hard error). React StrictMode's
 * dev-mode double-invoke only re-runs *effects*, not the render body, so a
 * destroy-in-cleanup here would tear down the only store instance that will
 * ever exist for this component, with nothing left to recreate it: `destroy()`
 * unsubscribes the internal cross-store event listeners
 * (events.removeAllListeners()), permanently breaking event-driven wiring like
 * sign_in_success -> signInState, while API-driven state (core.user,
 * core.state) keeps working -- so auth silently half-functions for the rest of
 * the page's life. A real full-page unmount (navigation, tab close) tears down
 * the whole JS context anyway, so not explicitly releasing the store's timer/
 * listeners there costs nothing.
 *
 * Also subscribes to the locale (useLocale()) purely so THIS component
 * re-renders on locale change -- React cascades that re-render to every
 * descendant automatically, so any `m['key']()` call anywhere under
 * `<AuthProvider>` picks up the new locale with no change needed at that call
 * site. The return value itself isn't used here; components that want the
 * current locale (e.g. a language switcher) call useLocale() themselves.
 */
export function AuthProvider({ config, apiClient, children }: AuthProviderProps) {
  useLocale();

  const storeRef = useRef<ComposedAuthStore | null>(null);
  if (storeRef.current === null) {
    storeRef.current = createAuthStore(config, apiClient);
  }
  const store = storeRef.current;

  return <AuthStoreContext.Provider value={store}>{children}</AuthStoreContext.Provider>;
}
