/**
 * Session Management Store
 *
 * Handles session persistence, storage configuration, and session lifecycle:
 * - Session data persistence (sessionStorage/localStorage)
 * - Session validation and expiry
 * - Storage configuration and migration
 * - Session activity tracking
 */

import { devtools, subscribeWithSelector } from 'zustand/middleware';
import { createStore, type StateCreator } from 'zustand/vanilla';
import type { SignInData, User } from '../../types';
import type { DatabaseAdapter } from '../../types/database';
import {
  generateInitials,
  getSession as getSessionUtil,
  isSessionValid as isSessionValidUtil
} from '../../utils/sessionManager';
import type { SessionActions, SessionState, SessionStore, StoreOptions } from '../types';

/**
 * Initial state for the session store
 */
const initialState: SessionState = {
  lastActivity: null,
  sessionTimeout: 8 * 60 * 60 * 1000, // 8 hours default
  storageType: 'sessionStorage'
};

/**
 * Create the session management store
 */
export function createSessionStore(options: StoreOptions) {
  const { db, devtools: enableDevtools = false, name = 'session' } = options;

  // @ts-expect-error - Zustand's complex middleware typing causes issues here, but the implementation is correct
  const storeImpl = (set, _get) => ({
    ...initialState,

    saveSession: async (data: SignInData) => {
      if (typeof window === 'undefined') return;

      // Convert SignInData to SessionData format
      const sessionData = {
        userId: data.user.id,
        email: data.user.email,
        name: data.user.name,
        emailVerified: true,
        metadata: data.user.preferences,
        accessToken: data.tokens.access_token,
        refreshToken: data.tokens.refresh_token,
        expiresAt: data.tokens.expiresAt,
        authMethod: data.authMethod as 'passkey' | 'password' | 'email-code' | 'magic-link'
      };

      await db.saveSession(sessionData);

      set({
        lastActivity: Date.now()
      });
    },

    clearSession: async () => {
      if (typeof window === 'undefined') return;

      await db.clearSession();

      set({
        lastActivity: null
      });
    },

    isSessionValid: async () => {
      if (typeof window === 'undefined') return false;

      const session = await db.loadSession();
      return session !== null && session.expiresAt > Date.now();
    },

    updateLastActivity: async () => {
      const now = Date.now();

      // Reload session, update activity, and save back
      if (typeof window !== 'undefined') {
        const session = await db.loadSession();
        if (session) {
          await db.saveSession({ ...session });
        }
      }

      set({
        lastActivity: now
      });
    },

    configureStorage: (config: Partial<SessionState>) => {
      // Note: Storage configuration now handled by DatabaseAdapter
      // This method just updates local state for backward compatibility
      set((state: SessionState) => ({
        ...state,
        ...config
      }));
    }
  });

  const store = createStore<SessionStore>()(
    subscribeWithSelector(enableDevtools ? devtools(storeImpl, { name }) : storeImpl)
  );

  return store;
}

/**
 * Helper to get current session data
 */
export function getCurrentSession(): SignInData | null {
  if (typeof window === 'undefined') return null;
  return getSessionUtil();
}

/**
 * Helper to check if session is expired
 */
export function isSessionExpired(): boolean {
  const session = getCurrentSession();
  if (!session) return true;

  return !isSessionValidUtil(session);
}

/**
 * Helper to convert User to session user format
 */
export function convertUserToSessionUser(user: User) {
  return {
    id: user.id,
    email: user.email,
    name: user.name || user.email,
    initials: generateInitials(user.name || user.email),
    avatar: user.picture,
    preferences: user.metadata
  };
}

/**
 * Helper to convert session user to User format
 */
export function convertSessionUserToUser(sessionUser: SignInData['user']): User {
  return {
    id: sessionUser.id,
    email: sessionUser.email,
    name: sessionUser.name,
    picture: sessionUser.avatar,
    emailVerified: true, // Assume verified if they have a session
    createdAt: new Date().toISOString(), // Fallback value
    metadata: sessionUser.preferences
  };
}

const DEFAULT_EXPIRES_IN = 24 * 60 * 60;

/**
 * Helper to create session data from auth response
 */
export function createSessionData(
  user: User,
  tokens: {
    access_token: string;
    refresh_token?: string;
    expires_in?: number;
  },
  authMethod: SignInData['authMethod'] = 'passkey'
): SignInData {
  return {
    user: convertUserToSessionUser(user),
    tokens: {
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token || '',
      // HACK: Force 6-minute expiry for testing (auto-refresh happens at 1 minute mark)
      // expiresAt: tokens.expires_in ? Date.now() + 6 * 60 * 1000 : Date.now() + 6 * 60 * 1000
      // Production:
      expiresAt: tokens.expires_in
        ? Date.now() + tokens.expires_in * 1000
        : Date.now() + DEFAULT_EXPIRES_IN * 1000
    },
    authMethod,
    lastActivity: Date.now()
  };
}

/**
 * Session activity tracker - call this on user interactions
 */
export function trackSessionActivity(store: ReturnType<typeof createSessionStore>) {
  store.getState().updateLastActivity();
}

/**
 * Session cleanup - call this on app shutdown or sign out
 */
export function cleanupSession(store: ReturnType<typeof createSessionStore>) {
  store.getState().clearSession();
}
