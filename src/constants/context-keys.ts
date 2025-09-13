/**
 * Svelte Context Keys
 * 
 * Central definition of all context keys used in flows-auth.
 * Import these constants to ensure consistency across components.
 */

export const CONTEXT_KEYS = {
  /**
   * Auth store context key used by:
   * - setAuthContext() in utils/auth-context.ts
   * - useAuth() in utils/auth-context.ts  
   * - Layout components setting auth store context
   * - Components accessing auth store via getContext()
   */
  AUTH_STORE: 'flows-auth-store'
} as const;

// Legacy export for backward compatibility
export const AUTH_CONTEXT_KEY = CONTEXT_KEYS.AUTH_STORE;