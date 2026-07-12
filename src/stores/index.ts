// Core stores

// Feature stores
import { createEmailAuthStore, createPasskeyStore } from './auth-methods';
import { createAuthCoreStore } from './core/auth-core';
import { createErrorStore } from './core/error';
import { createEventStore } from './core/events';
import { createSessionStore } from './core/session';
import { createOnboardingStore } from './onboarding-store';

// UI stores
import { createUIStore } from './ui/ui-state';

// Re-export adapters
export { makeSvelteCompatible, toReadable as createSvelteAdapter } from './adapters/svelte';

export type { ComposedAuthStore } from './auth-store';
export { createAuthStore } from './auth-store';
export {
  cleanupNativeAppBridge,
  createNativeAppSessionAdapter,
  isThepiaApp
} from './core';

// Re-export session adapters
export { createLocalStorageAdapter } from './core/database';
// Re-export types
export type * from './types';
// Re-export individual store creators for advanced usage
export {
  createAuthCoreStore,
  createEmailAuthStore,
  createErrorStore,
  createEventStore,
  createOnboardingStore,
  createPasskeyStore,
  createSessionStore,
  createUIStore
};
