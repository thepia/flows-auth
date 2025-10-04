/**
 * Event System Store
 *
 * Handles auth event emission and subscription:
 * - Event type definitions
 * - Event listener management
 * - Cross-store communication
 * - Event debugging and logging
 */

import { devtools, subscribeWithSelector } from 'zustand/middleware';
import { createStore } from 'zustand/vanilla';
import type { AuthEvents } from '../../types';
import type {
  AuthEventData,
  AuthEventHandler,
  AuthEventType,
  EventState,
  EventStore,
  StoreOptions
} from '../types';

/**
 * Initial state for the event store
 */
const initialState: EventState = {
  listeners: new Map()
};

/**
 * Create the event system store
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

      if (!listeners.has(type)) {
        listeners.set(type, []);
      }

      listeners.get(type)!.push(handler);

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
      handlers.forEach((handler) => {
        try {
          handler(data as AuthEventData);
        } catch (error) {
          console.error(`Error in event handler for ${type}:`, error);
        }
      });
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

/**
 * Type-safe event listener functions
 */
export function createTypedEventListeners(eventStore: ReturnType<typeof createEventStore>) {
  const { on } = eventStore.getState();

  return {
    onSignInStarted: (handler: (data: AuthEvents['sign_in_started']) => void) =>
      on('sign_in_started', handler as AuthEventHandler),

    onSignInSuccess: (handler: (data: AuthEvents['sign_in_success']) => void) =>
      on('sign_in_success', handler as AuthEventHandler),

    onSignInError: (handler: (data: AuthEvents['sign_in_error']) => void) =>
      on('sign_in_error', handler as AuthEventHandler),

    onSignOut: (handler: (data: AuthEvents['sign_out']) => void) =>
      on('sign_out', handler as AuthEventHandler),

    onTokenRefreshed: (handler: (data: AuthEvents['token_refreshed']) => void) =>
      on('token_refreshed', handler as AuthEventHandler),

    onSessionExpired: (handler: (data: AuthEvents['session_expired']) => void) =>
      on('session_expired', handler as AuthEventHandler),

    onPasskeyUsed: (handler: (data: AuthEvents['passkey_used']) => void) =>
      on('passkey_used', handler as AuthEventHandler),

    onRegistrationStarted: (handler: (data: AuthEvents['registration_started']) => void) =>
      on('registration_started', handler as AuthEventHandler),

    onRegistrationSuccess: (handler: (data: AuthEvents['registration_success']) => void) =>
      on('registration_success', handler as AuthEventHandler),

    onRegistrationError: (handler: (data: AuthEvents['registration_error']) => void) =>
      on('registration_error', handler as AuthEventHandler)
  };
}

/**
 * Event debugging utilities
 */
export const eventDebug = {
  /**
   * Log all events for debugging
   */
  logAllEvents: (eventStore: ReturnType<typeof createEventStore>) => {
    const allEventTypes: AuthEventType[] = [
      'sign_in_started',
      'sign_in_success',
      'sign_in_error',
      'sign_out',
      'token_refreshed',
      'session_expired',
      'passkey_used',
      'registration_started',
      'registration_success',
      'registration_error'
    ];

    const unsubscribes = allEventTypes.map((eventType) =>
      eventStore.getState().on(eventType, (data) => {
        console.log(`🎯 Auth Event: ${eventType}`, data);
      })
    );

    // Return cleanup function
    return () => {
      unsubscribes.forEach((unsub) => unsub());
    };
  },

  /**
   * Count event emissions
   */
  createEventCounter: (eventStore: ReturnType<typeof createEventStore>) => {
    const counts = new Map<AuthEventType, number>();

    const allEventTypes: AuthEventType[] = [
      'sign_in_started',
      'sign_in_success',
      'sign_in_error',
      'sign_out',
      'token_refreshed',
      'session_expired',
      'passkey_used',
      'registration_started',
      'registration_success',
      'registration_error'
    ];

    const unsubscribes = allEventTypes.map((eventType) =>
      eventStore.getState().on(eventType, () => {
        counts.set(eventType, (counts.get(eventType) || 0) + 1);
      })
    );

    return {
      getCounts: () => Object.fromEntries(counts),
      getCount: (eventType: AuthEventType) => counts.get(eventType) || 0,
      reset: () => counts.clear(),
      destroy: () => unsubscribes.forEach((unsub) => unsub())
    };
  }
};

/**
 * Helper to create a scoped event emitter
 */
export function createScopedEventEmitter(
  eventStore: ReturnType<typeof createEventStore>,
  scope: string
) {
  const { emit } = eventStore.getState();

  return {
    emit: (type: AuthEventType, data: AuthEventData = {}) => {
      const scopedData = { ...data, scope };
      emit(type as keyof AuthEvents, scopedData as any);
    }
  };
}

/**
 * Event middleware for cross-store communication
 */
export function createEventMiddleware(eventStore: ReturnType<typeof createEventStore>) {
  return {
    /**
     * Bridge events between stores
     */
    bridge: <T>(fromEvent: AuthEventType, toCallback: (data: AuthEventData) => T) => {
      return eventStore.getState().on(fromEvent, (data) => {
        try {
          toCallback(data);
        } catch (error) {
          console.error(`Error in event bridge for ${fromEvent}:`, error);
        }
      });
    },

    /**
     * Transform events
     */
    transform: (
      fromEvent: AuthEventType,
      toEvent: AuthEventType,
      transformer: (data: AuthEventData) => AuthEventData
    ) => {
      return eventStore.getState().on(fromEvent, (data) => {
        try {
          const transformedData = transformer(data);
          eventStore.getState().emit(toEvent as keyof AuthEvents, transformedData as any);
        } catch (error) {
          console.error(`Error in event transform ${fromEvent} -> ${toEvent}:`, error);
        }
      });
    }
  };
}
