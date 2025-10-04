/**
 * Shared Auth Store for Astro Islands
 *
 * This singleton instance is shared across ALL Svelte islands in the Astro app.
 * Each island imports this same instance, ensuring state is synchronized.
 *
 * Key principles for Astro islands:
 * 1. Create ONE singleton store instance
 * 2. Import directly in each island (no providers needed)
 * 3. Use makeSvelteCompatible() for Svelte reactivity
 * 4. Islands hydrate independently but share the same store
 */

import { createAuthStore } from '@thepia/flows-auth';

// Detect API server based on environment
const getApiBaseUrl = (): string => {
  // In browser, use environment variable or default
  if (typeof window !== 'undefined') {
    return import.meta.env.PUBLIC_API_URL || 'https://api.thepia.com';
  }
  // Server-side fallback
  return 'https://api.thepia.com';
};

// Create singleton auth store instance
// This is the ONLY instance - all islands will share it
export const sharedAuthStore = createAuthStore({
  apiBaseUrl: getApiBaseUrl(),
  clientId: 'astro-demo',
  domain: 'thepia.net', // Use thepia.net for WebAuthn RP ID
  enablePasskeys: true,
  enableMagicLinks: false,
  signInMode: 'login-or-register',
  appCode: true, // Use app-based endpoints for PIN authentication
  enableDevtools: import.meta.env.DEV // Enable devtools in development
});

// Store is automatically initialized when first accessed
