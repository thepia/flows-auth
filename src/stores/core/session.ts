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
import { type StateCreator, createStore } from 'zustand/vanilla';
import type { SignInData, User } from '../../types';
import type { SessionPersistence } from '../../types/database';
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

      // TODO Partial<Session> Partial<User>

      // Convert SignInData to UserData format for user profile persistence
      const userData = {
        userId: data.user.id,
        email: data.user.email,
        name: data.user.name,
        avatar: data.user.avatar,
        emailVerified: data.user.emailVerified,
        metadata: data.user.preferences,
        authMethod: data.authMethod as 'passkey' | 'password' | 'email-code' | 'magic-link'
      };

      // Convert SignInData to SessionData format for session persistence
      const sessionData = {
        ...userData,
        ...data.tokens
      };

      // Save both session (tokens) and user profile
      await Promise.all([db.saveSession(sessionData), db.saveUser(userData)]);

      set({
        lastActivity: Date.now()
      });
    },

    clearSession: async () => {
      if (typeof window === 'undefined') return;

      // Clear session (always) and optionally clear user (if adapter supports it)
      await db.clearSession();
      if (db.clearUser) {
        await db.clearUser();
      }

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

      // Update lastActivity in storage by reloading, modifying, and saving
      if (typeof window !== 'undefined') {
        const session = await db.loadSession();
        if (session) {
          // Note: lastActivity is stored in SignInData format internally
          // database.ts will set it when saving
          await db.saveSession({ ...session });
        }
      }

      set({
        lastActivity: now
      });
    },

    configureStorage: (config: Partial<SessionState>) => {
      // Note: Storage configuration now handled by SessionPersistence
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
    supabase_token?: string;
    supabase_expires_at?: number;
  },
  authMethod: SignInData['authMethod'] = 'passkey'
): SignInData {
  return {
    user: convertUserToSessionUser(user),
    tokens: {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token || '',
      refreshedAt: Date.now(),
      // HACK: Force 6-minute expiry for testing (auto-refresh happens at 1 minute mark)
      // expiresAt: tokens.expires_in ? Date.now() + 6 * 60 * 1000 : Date.now() + 6 * 60 * 1000
      // Production:
      expiresAt: tokens.expires_in
        ? Date.now() + tokens.expires_in * 1000
        : Date.now() + DEFAULT_EXPIRES_IN * 1000,
      supabaseToken: tokens.supabase_token,
      supabaseExpiresAt: tokens.supabase_expires_at
    },
    authMethod
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
