/**
 * Authentication Methods Store Modules
 * 
 * Exports authentication method stores for tree-shaking
 */

export { createPasskeyStore, isPasskeyAvailableForUser, getPasskeyReadiness } from './passkey';
export { createEmailAuthStore } from './email-auth';

// Re-export types
export type { PasskeyState, PasskeyActions, PasskeyStore } from './passkey';
export type * from '../types';