/**
 * Framework Adapters
 *
 * Exports framework adapters for tree-shaking
 */

// Re-export types
export type * from '../types';
export { createAstroAuthStore, getAstroApiUrl } from './astro';
export { toReadable as createSvelteAdapter } from './svelte';
export { createVanillaAdapter } from './vanilla';
