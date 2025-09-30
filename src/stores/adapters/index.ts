/**
 * Framework Adapters
 *
 * Exports framework adapters for tree-shaking
 */

export { createVanillaAdapter } from './vanilla';
export { toReadable as createSvelteAdapter } from './svelte';
export { createAstroAuthStore, getAstroApiUrl } from './astro';

// Re-export types
export type * from '../types';
