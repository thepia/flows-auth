// Core stores
import { createAuthCoreStore } from './core/auth-core';
import { createErrorStore } from './core/error';
import { createEventStore } from './core/events';
import { createSessionStore } from './core/session';

// Feature stores
import { createEmailAuthStore, createPasskeyStore } from './auth-methods';
import { createOnboardingStore } from './onboarding-store';

// UI stores
import { createUIStore } from './ui/ui-state';

export { createAuthStore } from './auth-store';
export { makeSvelteCompatible } from './adapters/svelte';

export type { ComposedAuthStore } from './auth-store';

// Re-export individual store creators for advanced usage
export {
  createAuthCoreStore,
  createSessionStore,
  createErrorStore,
  createEventStore,
  createPasskeyStore,
  createEmailAuthStore,
  createUIStore,
  createOnboardingStore
};

// Re-export adapters
export { toReadable as createSvelteAdapter } from './adapters/svelte';

// Re-export types
export type * from './types';
