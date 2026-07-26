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

// Telemetry needs to reach astro-demo's OWN /api/telemetry route (which
// rate-limits and forwards to PostHog), not thepia.com's auth API base URL -
// so this must be a full absolute URL (see AuthApiClient.request()'s
// isAbsoluteUrl handling), not a path relative to apiBaseUrl.
const getTelemetryEndpoint = (): string | undefined => {
  if (typeof window === 'undefined') return undefined;
  return `${window.location.origin}/api/telemetry`;
};

// Create singleton auth store instance
// This is the ONLY instance - all islands will share it
export const sharedAuthStore = createAuthStore({
  apiBaseUrl: getApiBaseUrl(),
  clientId: 'astro-demo',
  domain: 'thepia.net', // Use thepia.net for WebAuthn RP ID
  enablePasskeys: true,
  signInMode: 'login-or-register',
  appCode: 'app', // Use app-based endpoints for PIN authentication
  enableDevtools: import.meta.env.DEV, // Enable devtools in development
  errorReporting: {
    enabled: true,
    endpoint: getTelemetryEndpoint(),
    debug: import.meta.env.DEV
  }
});

// Store is automatically initialized when first accessed
