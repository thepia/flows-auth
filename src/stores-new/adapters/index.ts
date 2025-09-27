/**
 * Framework Adapters
 * 
 * Exports framework adapters for tree-shaking
 */

export { createVanillaAdapter } from './vanilla';
export { toReadable as createSvelteAdapter } from './svelte';

// Re-export types
export type * from '../types';