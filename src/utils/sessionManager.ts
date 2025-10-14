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

import type { SignInData, StorageConfig, UserData } from '../types';
import {
  getOptimalStorageConfig,
  getStorageManager,
  initializeStorageManager
} from './storageManager';

const SESSION_KEY = 'thepia_auth_session';
const EMAIL_PREFILL_KEY = 'thepia_email_prefill';

export function getSession(): SignInData | null {
  try {
    const storage = getStorageManager();
    const sessionData = storage.getItem(SESSION_KEY);
    if (!sessionData) return null;

    const session = JSON.parse(sessionData) as SignInData;

    // Check session timeout based on storage configuration (primary validity check)
    const sessionTimeout = storage.getSessionTimeout();
    if (Date.now() - session.lastActivity > sessionTimeout) {
      console.log('🕐 Session expired due to inactivity');
      clearSession();
      return null;
    }

    // Check token expiration only if there's no refresh token
    // If we have a refresh token, the session remains valid even if access token expired
    if (session.tokens.expiresAt < Date.now() && !session.tokens.refresh_token) {
      console.log('🕐 Session expired: no refresh token and access token expired');
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

export function saveSession(sessionData: SignInData): void {
  try {
    const storage = getStorageManager();
    storage.setItem(SESSION_KEY, JSON.stringify(sessionData));

    // Emit session update event
    if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
      window.dispatchEvent(
        new CustomEvent('sessionUpdate', {
          detail: { session: sessionData }
        })
      );
    }

    console.log(
      '💾 Session saved to',
      storage.getConfig().type,
      'for user:',
      sessionData.user.email
    );
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
          detail: { session: null }
        })
      );
    }

    console.log('🗑️ Session cleared from', storage.getConfig().type);
  } catch (error) {
    console.error('Failed to clear session:', error);
  }
}

export function generateInitials(name: string): string {
  const words = name.split(' ').filter((word) => word.length > 0);

  if (words.length === 0) return '';
  if (words.length === 1) return words[0].charAt(0).toUpperCase();

  // Use first and last word for multiple names
  const firstInitial = words[0].charAt(0).toUpperCase();
  const lastInitial = words[words.length - 1].charAt(0).toUpperCase();

  return firstInitial + lastInitial;
}

export function isSessionValid(session: SignInData | null): boolean {
  if (!session) return false;

  // Check last activity using configurable timeout (primary session validity check)
  const storage = getStorageManager();
  const sessionTimeout = storage.getSessionTimeout();
  if (Date.now() - session.lastActivity > sessionTimeout) {
    return false;
  }

  // Check token expiration only if there's no refresh token
  // If we have a refresh token, the session can be refreshed even if access token expired
  if (session.tokens.expiresAt < Date.now() && !session.tokens.refresh_token) {
    return false;
  }

  return true;
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
export function getCurrentUser(): SignInData['user'] | null {
  const session = getSession();
  return session?.user || null;
}

/**
 * Get current access token from session
 */
export function getAccessToken(): string | null {
  const session = getSession();
  return isSessionValid(session) ? session?.tokens.access_token || null : null;
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
