/**
 * React hook for consuming a ComposedAuthStore.
 *
 * Prop-first / context-fallback, mirroring the convention documented at
 * `src/svelte/auth-context.ts:getAuthStoreFromContext()` (and used by
 * `SignInForm.svelte`): an explicit `store` argument always wins; otherwise
 * the nearest `<AuthProvider>` from context is used; if neither is available
 * this throws, matching the tone of `getAuthStoreFromContext()`'s error.
 *
 * Built on `useSyncExternalStore(subscribe, getSnapshot)` rather than porting
 * Svelte's ref-counted shared-subscription trick (`makeSvelteCompatible`):
 * that trick exists only because Svelte's `readable()` has no built-in
 * subscriber dedup. `useSyncExternalStore` doesn't need it — each
 * `useAuthStore()` call subscribes independently, matching React's expected
 * contract (and how `zustand/react`'s own binding works). `getState()` is
 * cheap (it just reads 3 already-materialized sub-stores), so redundant
 * snapshot computation across call sites isn't a real cost.
 */

import { useCallback, useContext, useSyncExternalStore } from 'react';
import {
  getComposedAuthSnapshot,
  subscribeToComposedAuthStore
} from '../../core/stores/adapters/react.js';
import type { ComposedAuthStore } from '../../core/stores/auth-store.js';
import type { AuthStore, AuthStoreFunctions } from '../../core/types/index.js';
import { AuthStoreContext } from '../context.js';

/**
 * Return shape of `useAuthStore()`: the live flattened auth snapshot
 * (`email`, `loading`, `signInState`, ...) merged with the store's action
 * methods (`signInWithPasskey`, `checkUser`, `signOut`, ...), so components
 * can do `const { signInWithPasskey, email, loading } = useAuthStore()`.
 * `store` gives access to the full `ComposedAuthStore` (sub-stores, `api`
 * client, `destroy()`, etc.) for anything not covered by the flattened shape.
 */
export type UseAuthStoreResult = AuthStore &
  AuthStoreFunctions & {
    store: ComposedAuthStore;
  };

/**
 * Subscribe to a `ComposedAuthStore` and get back its live flattened state
 * plus its action methods. Pass `store` explicitly to bypass context (e.g. in
 * tests, or when a component intentionally uses a non-default store);
 * otherwise the nearest `<AuthProvider>`'s store is used.
 *
 * @throws if neither `storeProp` nor a context store is available.
 */
export function useAuthStore(storeProp?: ComposedAuthStore): UseAuthStoreResult {
  const contextStore = useContext(AuthStoreContext);
  const store = storeProp ?? contextStore;

  if (!store) {
    throw new Error(
      'Auth store not found. Pass a store explicitly to useAuthStore(store) or wrap your component tree in <AuthProvider>.'
    );
  }

  const subscribe = useCallback(
    (onStoreChange: () => void) => subscribeToComposedAuthStore(store, onStoreChange),
    [store]
  );
  const getSnapshot = useCallback(() => getComposedAuthSnapshot(store), [store]);

  const snapshot = useSyncExternalStore(subscribe, getSnapshot);

  return {
    // Store methods first (signInWithPasskey, checkUser, getState, ...) --
    // note this also spreads the raw sub-store objects (store.email, store.ui,
    // etc.) as extra runtime properties not reflected in UseAuthStoreResult's
    // type; `snapshot` below intentionally overrides the one colliding key
    // (`email`: the sub-store vs. the current email string) so destructuring
    // `email` always yields the flattened string, not the zustand sub-store.
    ...store,
    ...snapshot,
    store
  };
}
