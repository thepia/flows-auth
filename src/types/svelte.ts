import type {
  ApplicationContext,
  AuthStore,
  AuthStoreFunctions,
  SignInResponse,
  StorageConfigurationUpdate
} from '.';
import type { AuthApiClient } from '../api/auth-api';
import type { ComposedAuthStore } from '../stores/auth-store';

// Svelte store types
export type Unsubscriber = () => void;
export type Subscriber<T> = (value: T) => void;
export type Readable<T> = {
  subscribe: (run: Subscriber<T>) => Unsubscriber;
};

/**
 * Svelte-compatible auth store returned by makeSvelteCompatible()
 *
 * This type represents the proper Svelte store contract:
 * - Implements Readable<AuthStore> for reactive state subscriptions ($store.signInState, etc.)
 * - Includes all methods from ComposedAuthStore for actions (store.checkUser(), etc.)
 *
 * Usage pattern:
 * ```svelte
 * const store = getContext<Writable<SvelteAuthStore | null>>(AUTH_CONTEXT_KEY);
 *
 * // Access state reactively
 * $: signInState = $store?.signInState;
 *
 * // Call methods directly
 * await $store?.checkUser(email);
 * const config = $store?.getConfig();
 * ```
 */
export interface SvelteAuthStore extends Readable<AuthStore>, ComposedAuthStore {
  // Inherits:
  // - subscribe() from Readable<AuthStore> - for Svelte reactivity
  // - All methods from ComposedAuthStore - for actions and state access
}
