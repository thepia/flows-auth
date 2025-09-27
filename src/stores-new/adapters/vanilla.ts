/**
 * Vanilla JavaScript adapter for Zustand auth stores
 * Provides framework-agnostic access to auth stores
 */

import { subscribeWithSelector } from 'zustand/middleware';
import type { StoreApi } from 'zustand';

/**
 * Vanilla store subscription helper
 * Provides framework-agnostic subscription interface
 */
export function createVanillaAdapter<T>(store: StoreApi<T>) {
  return {
    /**
     * Get current state
     */
    getState: () => store.getState(),
    
    /**
     * Subscribe to store changes
     */
    subscribe: (listener: (state: T, prevState: T) => void) => {
      return store.subscribe(listener);
    },
    
    /**
     * Subscribe to specific property changes
     */
    subscribeToProperty: <K extends keyof T>(
      property: K,
      listener: (value: T[K], prevValue: T[K]) => void
    ) => {
      let prevValue = store.getState()[property];
      return store.subscribe((state) => {
        const currentValue = state[property];
        if (currentValue !== prevValue) {
          const oldValue = prevValue;
          prevValue = currentValue;
          listener(currentValue, oldValue);
        }
      });
    },
    
    /**
     * Subscribe with selector
     */
    subscribeWithSelector: <U>(
      selector: (state: T) => U,
      listener: (value: U, prevValue: U) => void,
      options?: {
        equalityFn?: (a: U, b: U) => boolean;
        fireImmediately?: boolean;
      }
    ) => {
      let prevValue = selector(store.getState());
      return store.subscribe((state) => {
        const currentValue = selector(state);
        const isEqual = options?.equalityFn ? options.equalityFn(currentValue, prevValue) : currentValue === prevValue;
        if (!isEqual) {
          const oldValue = prevValue;
          prevValue = currentValue;
          listener(currentValue, oldValue);
        }
      });
    },
    
    /**
     * Destroy store and cleanup
     */
    destroy: () => {
      // Vanilla stores don't have destroy method - cleanup handled by unsubscribe
    }
  };
}

/**
 * Create a simple event emitter for vanilla usage
 */
export function createEventEmitter() {
  const listeners = new Map<string, ((data: any) => void)[]>();
  
  return {
    on: (event: string, listener: (data: any) => void) => {
      if (!listeners.has(event)) {
        listeners.set(event, []);
      }
      listeners.get(event)!.push(listener);
      
      // Return unsubscribe function
      return () => {
        const eventListeners = listeners.get(event);
        if (eventListeners) {
          const index = eventListeners.indexOf(listener);
          if (index > -1) {
            eventListeners.splice(index, 1);
          }
        }
      };
    },
    
    emit: (event: string, data?: any) => {
      const eventListeners = listeners.get(event);
      if (eventListeners) {
        eventListeners.forEach(listener => listener(data));
      }
    },
    
    off: (event: string, listener?: (data: any) => void) => {
      if (!listener) {
        listeners.delete(event);
        return;
      }
      
      const eventListeners = listeners.get(event);
      if (eventListeners) {
        const index = eventListeners.indexOf(listener);
        if (index > -1) {
          eventListeners.splice(index, 1);
        }
      }
    },
    
    removeAllListeners: (event?: string) => {
      if (event) {
        listeners.delete(event);
      } else {
        listeners.clear();
      }
    }
  };
}

/**
 * Utility to combine multiple store subscriptions
 */
export function combineStoreSubscriptions<T extends Record<string, any>>(
  stores: { [K in keyof T]: StoreApi<T[K]> }
): {
  getState: () => T;
  subscribe: (listener: (state: T) => void) => () => void;
} {
  const getState = (): T => {
    const state = {} as T;
    for (const [key, store] of Object.entries(stores)) {
      (state as any)[key] = store.getState();
    }
    return state;
  };
  
  const subscribe = (listener: (state: T) => void) => {
    const unsubscribes: (() => void)[] = [];
    
    for (const store of Object.values(stores)) {
      const unsubscribe = (store as StoreApi<any>).subscribe(() => {
        listener(getState());
      });
      unsubscribes.push(unsubscribe);
    }
    
    // Return combined unsubscribe function
    return () => {
      unsubscribes.forEach(unsub => unsub());
    };
  };
  
  return { getState, subscribe };
}

/**
 * Debounce utility for store subscriptions
 */
export function debounceSubscription<T>(
  callback: (state: T) => void,
  delay: number = 100
): (state: T) => void {
  let timeoutId: NodeJS.Timeout | null = null;
  
  return (state: T) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    
    timeoutId = setTimeout(() => {
      callback(state);
      timeoutId = null;
    }, delay);
  };
}

/**
 * Throttle utility for store subscriptions
 */
export function throttleSubscription<T>(
  callback: (state: T) => void,
  delay: number = 100
): (state: T) => void {
  let lastRun = 0;
  let timeoutId: NodeJS.Timeout | null = null;
  
  return (state: T) => {
    const now = Date.now();
    
    if (now - lastRun >= delay) {
      callback(state);
      lastRun = now;
    } else {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      
      timeoutId = setTimeout(() => {
        callback(state);
        lastRun = Date.now();
        timeoutId = null;
      }, delay - (now - lastRun));
    }
  };
}