// Core stores

// Feature stores
import { createEmailAuthStore, createPasskeyStore } from './auth-methods/index.js';
import { createAuthCoreStore } from './core/auth-core.js';
import { createErrorStore } from './core/error.js';
import { createEventStore } from './core/events.js';
import { createSessionStore } from './core/session.js';
import { createOnboardingStore } from './onboarding-store.js';

// UI stores
import { createUIStore } from './ui/ui-state.js';

// Note: the Svelte adapter (makeSvelteCompatible / createSvelteAdapter) lives in
// the ./svelte target now — it imports svelte/store and is not part of the
// framework-agnostic core surface.

export type { ComposedAuthStore } from './auth-store.js';
export { createAuthStore } from './auth-store.js';
// Re-export session adapters
export { createLocalStorageAdapter } from './core/database.js';
export {
  cleanupNativeAppBridge,
  createNativeAppSessionAdapter,
  isThepiaApp
} from './core/index.js';
// Re-export types
export type * from './types.js';
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
