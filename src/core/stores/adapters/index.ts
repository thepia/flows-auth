/**
 * Framework Adapters
 *
 * Exports framework adapters for tree-shaking
 */

// Re-export types
export type * from '../types.js';
export { createAstroAuthStore, getAstroApiUrl } from './astro.js';
// The Svelte adapter moved to the ./svelte target (imports svelte/store).
export { createVanillaAdapter } from './vanilla.js';
