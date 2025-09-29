import type {
  ApplicationContext,
  AuthStore,
  AuthStoreFunctions,
  SignInResponse,
  StorageConfigurationUpdate
} from '.';
import type { AuthApiClient } from '../api/auth-api';

// Svelte store types
export type Unsubscriber = () => void;
export type Subscriber<T> = (value: T) => void;
export type Readable<T> = {
  subscribe: (run: Subscriber<T>) => Unsubscriber;
};

// Complete auth store type with all methods
export interface CompleteAuthStore extends Readable<AuthStore>, AuthStoreFunctions {
  api: AuthApiClient;

  // Dynamic role configuration methods
  getApplicationContext: () => ApplicationContext | null;
  updateStorageConfiguration: (update: StorageConfigurationUpdate) => Promise<void>;

  // Direct state access
  getState: () => AuthStore;

  // Cleanup
  destroy: () => void;
}
