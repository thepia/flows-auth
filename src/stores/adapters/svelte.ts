/**
 * Svelte adapter for Zustand auth stores
 * Converts Zustand stores to Svelte readable stores for reactive usage
 */

import { derived, readable, writable } from 'svelte/store';
import type { Readable, Unsubscriber, Writable } from 'svelte/store';
import type { StoreApi } from 'zustand';
import type { AuthStore } from '../../types';
import type { CompleteAuthStore } from '../../types/svelte';
import type { ComposedAuthStore } from '../auth-store';

/**
 * Convert a Zustand store to a Svelte readable store
 */
export function toReadable<T>(zustandStore: StoreApi<T>): Readable<T> {
  return readable(zustandStore.getState(), (set) => {
    const unsubscribe = zustandStore.subscribe((state) => {
      set(state);
    });

    return unsubscribe;
  });
}

/**
 * Convert a Zustand store to a Svelte writable store
 * Note: This creates a writable interface, but updates go through Zustand
 */
export function toWritable<T>(zustandStore: StoreApi<T>): Writable<T> {
  const { subscribe } = toReadable(zustandStore);

  return {
    subscribe,
    set: (value: T) => {
      // Zustand stores typically don't have a direct set method
      // This would need to be implemented per store based on actions
      console.warn('Direct set not supported on Zustand stores. Use store actions instead.');
    },
    update: (updater: (value: T) => T) => {
      const currentState = zustandStore.getState();
      const newState = updater(currentState);
      // Same limitation as set - would need store-specific implementation
      console.warn('Direct update not supported on Zustand stores. Use store actions instead.');
    }
  };
}

/**
 * Create a derived store from a Zustand store property
 */
export function derivedProperty<T, K extends keyof T>(
  zustandStore: StoreApi<T>,
  property: K
): Readable<T[K]> {
  const svelteStore = toReadable(zustandStore);
  return derived(svelteStore, (state) => state[property]);
}

/**
 * Create a derived store with a custom selector
 */
export function derivedSelector<T, U>(
  zustandStore: StoreApi<T>,
  selector: (state: T) => U
): Readable<U> {
  const svelteStore = toReadable(zustandStore);
  return derived(svelteStore, selector);
}

/**
 * Create multiple derived stores from a Zustand store
 */
export function createDerivedStores<T>(zustandStore: StoreApi<T>) {
  const baseStore = toReadable(zustandStore);

  return {
    base: baseStore,

    /**
     * Create a derived store for a specific property
     */
    property: <K extends keyof T>(property: K) => derived(baseStore, (state) => state[property]),

    /**
     * Create a derived store with a custom selector
     */
    selector: <U>(selector: (state: T) => U) => derived(baseStore, selector),

    /**
     * Create multiple derived stores at once
     */
    properties: <K extends keyof T>(...properties: K[]) => {
      const stores: { [P in K]: Readable<T[P]> } = {} as any;

      for (const property of properties) {
        stores[property] = derived(baseStore, (state) => state[property]);
      }

      return stores;
    }
  };
}

/**
 * Create a Svelte store that combines multiple Zustand stores
 */
export function combineZustandStores<T extends Record<string, unknown>>(
  stores: { [K in keyof T]: StoreApi<T[K]> }
): Readable<T> {
  const svelteStores = Object.fromEntries(
    Object.entries(stores).map(([key, store]) => [key, toReadable(store as StoreApi<unknown>)])
  ) as { [K in keyof T]: Readable<T[K]> };

  return derived(Object.values(svelteStores), (values) => {
    const combined = {} as T;
    const keys = Object.keys(stores) as (keyof T)[];

    keys.forEach((key, index) => {
      combined[key] = values[index] as T[typeof key];
    });

    return combined;
  });
}

/**
 * Create an action dispatcher for Zustand store actions
 * This provides a Svelte-friendly way to call store actions
 */
export function createActionDispatcher<
  T,
  A extends Record<string, (...args: unknown[]) => unknown>
>(zustandStore: StoreApi<T>, actions: A): A {
  const dispatcher = {} as A;

  for (const [actionName, actionFn] of Object.entries(actions)) {
    dispatcher[actionName as keyof A] = ((...args: unknown[]) => {
      const state = zustandStore.getState();
      return actionFn.call(state, ...args);
    }) as A[keyof A];
  }

  return dispatcher;
}

/**
 * Create a reactive form store that syncs with Zustand
 */
export function createReactiveForm<T extends Record<string, unknown>>(
  zustandStore: StoreApi<T>,
  formFields: (keyof T)[],
  updateAction: (updates: Partial<T>) => void
) {
  const formStore = writable<Partial<T>>({});
  const zustandReadable = toReadable(zustandStore);

  // Sync from Zustand to form store
  const unsubscribeZustand = zustandReadable.subscribe((state) => {
    const formData: Partial<T> = {};
    formFields.forEach((field) => {
      formData[field] = state[field];
    });
    formStore.set(formData);
  });

  return {
    subscribe: formStore.subscribe,

    /**
     * Update a single field
     */
    updateField: <K extends keyof T>(field: K, value: T[K]) => {
      updateAction({ [field]: value } as Partial<T>);
    },

    /**
     * Update multiple fields
     */
    updateFields: (updates: Partial<T>) => {
      updateAction(updates);
    },

    /**
     * Reset form to current Zustand state
     */
    reset: () => {
      const currentState = zustandStore.getState();
      const formData: Partial<T> = {};
      formFields.forEach((field) => {
        formData[field] = currentState[field];
      });
      formStore.set(formData);
    },

    /**
     * Cleanup subscriptions
     */
    destroy: () => {
      unsubscribeZustand();
    }
  };
}

/**
 * Helper to create computed stores with automatic cleanup
 */
export function createComputedStore<T, U>(
  zustandStore: StoreApi<T>,
  compute: (state: T) => U,
  equals?: (a: U, b: U) => boolean
): Readable<U> {
  let lastValue: U;
  let hasValue = false;

  return readable<U>(undefined as U, (set) => {
    const unsubscribe = zustandStore.subscribe((state) => {
      const newValue = compute(state);

      if (!hasValue || !equals || !equals(lastValue, newValue)) {
        lastValue = newValue;
        hasValue = true;
        set(newValue);
      }
    });

    // Set initial value
    const initialValue = compute(zustandStore.getState());
    lastValue = initialValue;
    hasValue = true;
    set(initialValue);

    return unsubscribe;
  });
}

/**
 * Make a ComposedAuthStore compatible with Svelte's store contract
 * Returns CompleteAuthStore with proper Readable<AuthStore> contract
 */
export function makeSvelteCompatible(store: ComposedAuthStore): CompleteAuthStore {
  const subscribers = new Set<(value: AuthStore) => void>();
  let cleanup: (() => void) | null = null;

  // Create the Svelte-compatible store that implements CompleteAuthStore
  const svelteStore: CompleteAuthStore = {
    // All methods from the composed store preserved as-is
    ...store,

    // Svelte store contract - subscribe with AuthStore as value type
    subscribe(subscriber: (value: AuthStore) => void): () => void {
      // Initialize subscription system on first subscriber
      if (subscribers.size === 0) {
        const notify = () => {
          // Get combined state and pass to subscribers
          const currentState = store.getState();
          for (const sub of subscribers) {
            sub(currentState);
          }
        };

        // Subscribe to all sub-stores for changes
        const unsubscribes = [
          store.core.subscribe(notify),
          store.ui.subscribe(notify),
          store.session.subscribe(notify),
          store.error.subscribe(notify),
          store.events.subscribe(notify),
          store.passkey.subscribe(notify),
          store.email.subscribe(notify)
        ];

        cleanup = () => {
          for (const unsub of unsubscribes) {
            unsub();
          }
        };
      }

      // Call immediately with current combined state (Svelte requirement)
      const initialState = store.getState();
      subscriber(initialState);
      subscribers.add(subscriber);

      // Return unsubscribe function
      return () => {
        subscribers.delete(subscriber);
        if (subscribers.size === 0 && cleanup) {
          cleanup();
          cleanup = null;
        }
      };
    }
  };

  return svelteStore;
}
