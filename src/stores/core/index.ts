/**
 * Core Store Modules
 * 
 * Exports core authentication stores for tree-shaking
 */

export { createAuthCoreStore, authenticateUser, isTokenExpired, isUserAuthenticated } from './auth-core';
export { createSessionStore, createSessionData } from './session';
export { createErrorStore } from './error';
export { createEventStore, createTypedEventEmitters } from './events';

// Re-export types
export type * from '../types';