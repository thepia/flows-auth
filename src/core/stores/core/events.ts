/**
 * Event System Store
 *
 * @deprecated Do not build new internal logic on this. It's a plain synchronous
 * pub/sub map (`Map<eventType, handler[]>`) with no persistence and no replay --
 * `emit()` never touches Zustand state, so if a call happens while zero listeners
 * are registered for that type, the event is silently gone with no trace anywhere
 * (no error, no queued-for-later, nothing to inspect). It was previously used for
 * *internal* cross-store orchestration too (an internal 'sign_in_success'/
 * 'sign_in_error' listener in auth-store.ts calling
 * signInStateTransitions.authenticationSuccess()/error.setApiError()) -- that
 * made the actual sign-in-completes-visually behavior dependent on this bus, and
 * a listener-wiping bug (React StrictMode double-invoking `AuthProvider`'s
 * cleanup, unrelated to this file) silently broke sign-in for an entire session
 * with no error anywhere in the chain. auth-store.ts now calls
 * `signInStateTransitions.*`/`error.getState().setApiError()` directly wherever
 * it already holds a reference to the target sub-store -- which is everywhere,
 * since auth-store.ts constructs all of them. Prefer that pattern for anything
 * new.
 *
 * What's left here backs the *external*-facing half: `ComposedAuthStore.on(...)`/
 * `.emit(...)` (auth-store.ts), themselves also `@deprecated` now. Checked: no
 * usage anywhere in this repo -- not in any example app, not as a real
 * consumer in any test (only tests of the mechanism itself), and the one
 * doc reference (docs/development/README.md) describes a store shape that
 * doesn't match the current API (a `signIn()` method that doesn't exist,
 * numeric `expiresAt` when it's been an ISO string), so it's stale, not
 * evidence of a real contract. Kept rather than removed only because an
 * out-of-repo consumer *might* depend on it and that can't be verified from
 * here -- not because it's confirmed to still be needed.
 *
 * Handles auth event emission and subscription:
 * - Event type definitions
 * - Event listener management
 * - Cross-store communication (deprecated -- see above)
 * - Event debugging and logging
 */

import { devtools, subscribeWithSelector } from 'zustand/middleware';
import { createStore } from 'zustand/vanilla';
import type { AuthEvents } from '../../types/index.js';
import type {
  AuthEventData,
  AuthEventHandler,
  AuthEventType,
  EventState,
  EventStore,
  StoreOptions
} from '../types.js';

/**
 * Initial state for the event store
 */
const initialState: EventState = {
  listeners: new Map()
};

/**
 * Create the event system store
 *
 * @deprecated See this file's header comment. Still required for
 * `ComposedAuthStore.on()`/`.emit()` (external consumers); do not add new
 * internal listeners against it.
 */
export function createEventStore(options: StoreOptions) {
  const { devtools: enableDevtools = false, name = 'events' } = options;
  type StoreType = EventStore;

  const storeImpl = (
    set: (partial: Partial<StoreType> | ((state: StoreType) => Partial<StoreType>)) => void,
    get: () => StoreType
  ) => ({
    ...initialState,

    on: (type: AuthEventType, handler: AuthEventHandler) => {
      const state = get();
      const listeners = new Map(state.listeners);

      let handlers = listeners.get(type);
      if (!handlers) {
        handlers = [];
        listeners.set(type, handlers);
      }

      handlers.push(handler);

      set({ listeners });

      // Return unsubscribe function
      return () => {
        get().off(type, handler);
      };
    },

    emit: <K extends keyof AuthEvents>(type: K, data: AuthEvents[K]) => {
      const state = get();
      const handlers = state.listeners.get(type) || [];

      // Call all handlers for this event type
      for (const handler of handlers) {
        try {
          handler(data as AuthEventData);
        } catch (error) {
          console.error(`Error in event handler for ${type}:`, error);
        }
      }
    },

    off: (type: AuthEventType, handler: AuthEventHandler) => {
      const state = get();
      const listeners = new Map(state.listeners);
      const handlers = listeners.get(type);

      if (handlers) {
        const index = handlers.indexOf(handler);
        if (index > -1) {
          handlers.splice(index, 1);
        }

        // Remove the event type if no handlers left
        if (handlers.length === 0) {
          listeners.delete(type);
        }
      }

      set({ listeners });
    },

    removeAllListeners: (type?: AuthEventType) => {
      const state = get();
      const listeners = new Map(state.listeners);

      if (type) {
        listeners.delete(type);
      } else {
        listeners.clear();
      }

      set({ listeners });
    }
  });

  const store = createStore<EventStore>()(
    subscribeWithSelector(enableDevtools ? devtools(storeImpl, { name }) : storeImpl)
  );

  return store;
}

/**
 * Re-export AuthEvents from types for convenience
 * The actual definition is in src/types/index.ts
 */
export type { AuthEvents };

/**
 * Type-safe event emitter functions
 *
 * @deprecated See this file's header comment. Kept for `signInStarted`/`signOut`/
 * `tokenRefreshed`/etc. notifications to external `store.on(...)` consumers.
 * Internal code should call the target sub-store directly instead of emitting
 * and hoping something is listening.
 */
export function createTypedEventEmitters(eventStore: ReturnType<typeof createEventStore>) {
  const { emit } = eventStore.getState();

  return {
    signInStarted: (data: AuthEvents['sign_in_started']) => emit('sign_in_started', data),

    signInSuccess: (data: AuthEvents['sign_in_success']) => emit('sign_in_success', data),

    signInError: (data: AuthEvents['sign_in_error']) => emit('sign_in_error', data),

    signOut: (data: AuthEvents['sign_out'] = {}) => emit('sign_out', data),

    tokenRefreshed: (data: AuthEvents['token_refreshed']) => emit('token_refreshed', data),

    sessionExpired: (data: AuthEvents['session_expired']) => emit('session_expired', data),

    passkeyUsed: (data: AuthEvents['passkey_used']) => emit('passkey_used', data),

    passkeyCreated: (data: AuthEvents['passkey_created']) => emit('passkey_created', data),

    registrationStarted: (data: AuthEvents['registration_started']) =>
      emit('registration_started', data),

    registrationSuccess: (data: AuthEvents['registration_success']) =>
      emit('registration_success', data),

    registrationError: (data: AuthEvents['registration_error']) => emit('registration_error', data)
  };
}

// createTypedEventListeners, eventDebug, createScopedEventEmitter, and
// createEventMiddleware were removed here (unused anywhere in this repo --
// no imports outside this file) rather than merely deprecated. See this
// file's header comment for what's still in use and why.
