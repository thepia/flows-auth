/**
 * React adapter for Zustand-based auth stores
 *
 * Framework-agnostic plumbing consumed by `src/react/hooks/useAuthStore.ts` via
 * `useSyncExternalStore(subscribe, getSnapshot)`. Deliberately contains no
 * `import 'react'` — the "core must never pull in a framework runtime" invariant
 * (already enforced for Svelte via `tsup.config.ts`'s `external` list) applies
 * here too; the React runtime is only imported under `src/react/**`.
 *
 * Unlike `src/svelte/adapters/svelte.ts`'s `makeSvelteCompatible()` (which only
 * subscribes to 7 of the 8 sub-stores, omitting `onboarding` with no
 * explanation — likely an oversight), this adapter subscribes to all 8.
 */

import type { AuthStore } from '../../types/index.js';
import type { ComposedAuthStore } from '../auth-store.js';

/**
 * Subscribe to every sub-store on a ComposedAuthStore (core, session, error,
 * events, passkey, email, ui, onboarding), invoking `listener` on any change.
 *
 * Returns a single unsubscribe function that tears down all 8 subscriptions.
 * Intended as the `subscribe` half of React's `useSyncExternalStore` contract.
 */
export function subscribeToComposedAuthStore(
  store: ComposedAuthStore,
  listener: () => void
): () => void {
  const unsubscribes = [
    store.core.subscribe(listener),
    store.session.subscribe(listener),
    store.error.subscribe(listener),
    store.events.subscribe(listener),
    store.passkey.subscribe(listener),
    store.email.subscribe(listener),
    store.ui.subscribe(listener),
    store.onboarding.subscribe(listener)
  ];

  return () => {
    for (const unsubscribe of unsubscribes) {
      unsubscribe();
    }
  };
}

// `ComposedAuthStore.getState()` builds a brand-new object literal on every
// call (it reads 3 sub-stores and re-assembles a fresh `AuthStore`), unlike a
// single zustand store's own `getState()`, which returns a stable reference
// until the next `setState()`. `useSyncExternalStore` requires `getSnapshot`
// to return a referentially-stable value when nothing has actually changed --
// otherwise React sees a "new" snapshot on every render, re-renders, calls
// `getSnapshot` again, sees another "new" object, and so on forever ("Maximum
// update depth exceeded" / "The result of getSnapshot should be cached").
// Cache the last snapshot per store and only replace it when a shallow
// comparison finds an actual field change, so unrelated re-renders (or a
// sub-store notifying with no net change) reuse the previous reference.
const snapshotCache = new WeakMap<ComposedAuthStore, AuthStore>();

function shallowEqual(a: AuthStore, b: AuthStore): boolean {
  if (Object.is(a, b)) return true;
  const aKeys = Object.keys(a) as (keyof AuthStore)[];
  const bKeys = Object.keys(b) as (keyof AuthStore)[];
  if (aKeys.length !== bKeys.length) return false;
  for (const key of aKeys) {
    if (!Object.is(a[key], b[key])) return false;
  }
  return true;
}

/**
 * Wrapper over `store.getState()` — the flattened `AuthStore` snapshot --
 * that caches and shallow-compares so repeated calls between actual state
 * changes return the same object reference. Intended as the `getSnapshot`
 * half of React's `useSyncExternalStore` contract; see the comment above for
 * why the caching is required, not just an optimization.
 */
export function getComposedAuthSnapshot(store: ComposedAuthStore): AuthStore {
  const next = store.getState();
  const cached = snapshotCache.get(store);
  if (cached && shallowEqual(cached, next)) {
    return cached;
  }
  snapshotCache.set(store, next);
  return next;
}
