/**
 * Astro Islands Integration Helpers
 * Simplifies using flows-auth with Astro's islands architecture
 */

import { createAuthStore } from '../auth-store';
import type { AuthConfig } from '../types';

/**
 * Creates a singleton auth store optimized for Astro islands
 * Handles browser-only initialization and environment detection
 */
export function createAstroAuthStore(config: AuthConfig) {
  // Browser-only guard
  if (typeof window === 'undefined') {
    throw new Error('createAstroAuthStore must be called in browser context');
  }

  const store = createAuthStore(config);

  return store;
}

/**
 * Helper to detect API base URL from Astro environment
 */
export function getAstroApiUrl(fallback = 'https://api.thepia.com'): string {
  if (typeof window === 'undefined') return fallback;
  return import.meta.env.PUBLIC_API_URL || fallback;
}
