/**
 * Session Manager for flows-auth
 *
 * This mirrors thepia.com/src/utils/sessionManager.ts but adds configurable storage support.
 *
 * Key principles:
 * - Configurable storage (localStorage by default, sessionStorage for enhanced security)
 * - Custom events for state synchronization
 * - No local state variables for authentication status
 * - Automatic expiration handling
 * - Role-based storage strategy
 */

import { getStorageManager, initializeStorageManager, getOptimalStorageConfig } from './storageManager';
import type { StorageConfig } from '../types';

export interface FlowsSessionData {
  user: {
    id: string;
    email: string;
    name: string;
    initials: string;
    avatar?: string;
    preferences?: Record<string, any>;
  };
  tokens: {
    accessToken: string;
    refreshToken: string;
    expiresAt: number;
  };
  authMethod: 'passkey' | 'password';
  lastActivity: number;
}

const SESSION_KEY = 'thepia_auth_session';
const LAST_USER_KEY = 'thepia_last_user';
const EMAIL_PREFILL_KEY = 'thepia_email_prefill';

interface LastUserData {
  email: string;
  name: string;
  authMethod: 'passkey' | 'password';
  lastLoginAt: number;
}

export function getSession(): FlowsSessionData | null {
  try {
    const storage = getStorageManager();
    const sessionData = storage.getItem(SESSION_KEY);
    if (!sessionData) return null;

    const session = JSON.parse(sessionData) as FlowsSessionData;

    // Check if session is expired
    if (session.tokens.expiresAt < Date.now()) {
      clearSession();
      return null;
    }

    // Check session timeout based on storage configuration
    const sessionTimeout = storage.getSessionTimeout();
    if (Date.now() - session.lastActivity > sessionTimeout) {
      clearSession();
      return null;
    }

    return session;
  } catch (error) {
    console.error('Failed to get session:', error);
    clearSession();
    return null;
  }
}

export function saveSession(sessionData: FlowsSessionData): void {
  try {
    const storage = getStorageManager();
    storage.setItem(SESSION_KEY, JSON.stringify(sessionData));

    // Also save last user data for future automatic authentication
    saveLastUser(sessionData);

    // Emit session update event
    if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
      window.dispatchEvent(
        new CustomEvent('sessionUpdate', {
          detail: { session: sessionData },
        })
      );
    }

    console.log('💾 Session saved to', storage.getConfig().type, 'for user:', sessionData.user.email);
  } catch (error) {
    console.error('Failed to save session:', error);
  }
}

export function clearSession(): void {
  try {
    const storage = getStorageManager();
    storage.removeItem(SESSION_KEY);

    // Emit session update event
    if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
      window.dispatchEvent(
        new CustomEvent('sessionUpdate', {
          detail: { session: null },
        })
      );
    }

    console.log('🗑️ Session cleared from', storage.getConfig().type);
  } catch (error) {
    console.error('Failed to clear session:', error);
  }
}

export function generateInitials(name: string): string {
  return name
    .split(' ')
    .map((part) => part.charAt(0).toUpperCase())
    .slice(0, 2)
    .join('');
}

export function isSessionValid(session: FlowsSessionData | null): boolean {
  if (!session) return false;

  // Check token expiration
  if (session.tokens.expiresAt < Date.now()) {
    return false;
  }

  // Check last activity using configurable timeout
  const storage = getStorageManager();
  const sessionTimeout = storage.getSessionTimeout();
  if (Date.now() - session.lastActivity > sessionTimeout) {
    return false;
  }

  return true;
}

export function updateLastActivity(): void {
  const session = getSession();
  if (session) {
    session.lastActivity = Date.now();
    saveSession(session);
  }
}

export function getLastUser(): LastUserData | null {
  try {
    const lastUserData = localStorage.getItem(LAST_USER_KEY);
    if (!lastUserData) return null;

    const lastUser = JSON.parse(lastUserData) as LastUserData;

    // Only return if the last login was within the last 30 days
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    if (lastUser.lastLoginAt < thirtyDaysAgo) {
      clearLastUser();
      return null;
    }

    return lastUser;
  } catch (error) {
    console.error('Failed to get last user:', error);
    clearLastUser();
    return null;
  }
}

export function saveLastUser(sessionData: FlowsSessionData): void {
  try {
    const lastUserData: LastUserData = {
      email: sessionData.user.email,
      name: sessionData.user.name,
      authMethod: sessionData.authMethod,
      lastLoginAt: Date.now(),
    };

    localStorage.setItem(LAST_USER_KEY, JSON.stringify(lastUserData));
  } catch (error) {
    console.error('Failed to save last user:', error);
  }
}

export function clearLastUser(): void {
  try {
    localStorage.removeItem(LAST_USER_KEY);
  } catch (error) {
    console.error('Failed to clear last user:', error);
  }
}

// Email prefill functions for session-based convenience
export function saveEmailPrefill(email: string): void {
  try {
    // Email prefill always uses sessionStorage for privacy
    sessionStorage.setItem(EMAIL_PREFILL_KEY, email);
  } catch (error) {
    console.error('Failed to save email prefill:', error);
  }
}

export function getEmailPrefill(): string | null {
  try {
    return sessionStorage.getItem(EMAIL_PREFILL_KEY);
  } catch (error) {
    console.error('Failed to get email prefill:', error);
    return null;
  }
}

export function clearEmailPrefill(): void {
  try {
    sessionStorage.removeItem(EMAIL_PREFILL_KEY);
  } catch (error) {
    console.error('Failed to clear email prefill:', error);
  }
}

/**
 * Check if user is authenticated by reading from sessionStorage
 * This is the proper way to check authentication state - no local variables
 */
export function isAuthenticated(): boolean {
  const session = getSession();
  return isSessionValid(session);
}

/**
 * Get current user from session
 */
export function getCurrentUser(): FlowsSessionData['user'] | null {
  const session = getSession();
  return session?.user || null;
}

/**
 * Get current access token from session
 */
export function getAccessToken(): string | null {
  const session = getSession();
  return isSessionValid(session) ? session?.tokens.accessToken || null : null;
}

/**
 * Configure session storage strategy
 */
export function configureSessionStorage(config: StorageConfig): void {
  initializeStorageManager(config);
  console.log('🔧 Session storage configured:', config);
}

/**
 * Get optimal storage configuration based on user role
 */
export function getOptimalSessionConfig(userRole?: string, domain?: string): StorageConfig {
  return getOptimalStorageConfig(userRole, domain);
}

/**
 * Get current storage configuration
 */
export function getStorageConfig(): StorageConfig {
  return getStorageManager().getConfig();
}

/**
 * Check if current storage supports persistent sessions
 */
export function supportsPersistentSessions(): boolean {
  return getStorageManager().supportsPersistentSessions();
}