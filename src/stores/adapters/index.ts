/**
 * Framework Adapters
 *
 * Exports framework adapters for tree-shaking
 */

// Re-export types
export type * from '../types.js';
export { createAstroAuthStore, getAstroApiUrl } from './astro.js';
export { toReadable as createSvelteAdapter } from './svelte.js';
export { createVanillaAdapter } from './vanilla.js';
