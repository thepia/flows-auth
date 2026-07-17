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

// Re-export adapters
export { makeSvelteCompatible, toReadable as createSvelteAdapter } from './adapters/svelte.js';

export type { ComposedAuthStore } from './auth-store.js';
export { createAuthStore } from './auth-store.js';
export {
  cleanupNativeAppBridge,
  createNativeAppSessionAdapter,
  isThepiaApp
} from './core/index.js';

// Re-export session adapters
export { createLocalStorageAdapter } from './core/database.js';
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
