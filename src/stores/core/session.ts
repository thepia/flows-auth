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
import { createStore } from 'zustand/vanilla';
import type { SignInData, User } from '../../types';
import {
  clearSession as clearSessionUtil,
  configureSessionStorage,
  generateInitials,
  getOptimalSessionConfig,
  getSession as getSessionUtil,
  isSessionValid as isSessionValidUtil,
  saveSession as saveSessionUtil
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
  const { config, devtools: enableDevtools = false, name = 'session' } = options;

  // Configure session storage based on config or optimal defaults
  if (typeof window !== 'undefined') {
    const storageConfig = config.storage || getOptimalSessionConfig();
    configureSessionStorage(storageConfig);
  }

  const store = createStore<SessionStore>()(
    subscribeWithSelector(
      enableDevtools
        ? devtools(
            (set, get) => ({
              ...initialState,

              saveSession: (data: SignInData) => {
                if (typeof window === 'undefined') return;

                const sessionData: SignInData = {
                  user: {
                    id: data.user.id,
                    email: data.user.email,
                    name: data.user.name,
                    initials: data.user.initials || generateInitials(data.user.name),
                    avatar: data.user.avatar,
                    preferences: data.user.preferences
                  },
                  tokens: {
                    accessToken: data.tokens.accessToken,
                    refreshToken: data.tokens.refreshToken,
                    expiresAt: data.tokens.expiresAt
                  },
                  authMethod: data.authMethod,
                  lastActivity: Date.now()
                };

                saveSessionUtil(sessionData);

                set({
                  lastActivity: Date.now()
                });
              },

              clearSession: () => {
                if (typeof window === 'undefined') return;

                clearSessionUtil();

                set({
                  lastActivity: null
                });
              },

              isSessionValid: () => {
                if (typeof window === 'undefined') return false;

                const session = getSessionUtil();
                return isSessionValidUtil(session);
              },

              updateLastActivity: () => {
                const now = Date.now();

                // Update session last activity if session exists
                if (typeof window !== 'undefined') {
                  const session = getSessionUtil();
                  if (session) {
                    session.lastActivity = now;
                    saveSessionUtil(session);
                  }
                }

                set({
                  lastActivity: now
                });
              },

              configureStorage: (config) => {
                set((state) => ({
                  ...state,
                  ...config
                }));

                // Apply configuration to session storage utility
                if (typeof window !== 'undefined') {
                  configureSessionStorage({
                    type: config.storageType || get().storageType,
                    sessionTimeout: config.sessionTimeout || get().sessionTimeout,
                    persistentSessions: config.storageType === 'localStorage',
                    userRole: 'guest', // Default role
                    migrateExistingSession: false
                  });
                }
              }
            }),
            { name }
          )
        : (set, get) => ({
            ...initialState,

            saveSession: (data: SignInData) => {
              if (typeof window === 'undefined') return;

              const sessionData: SignInData = {
                user: {
                  id: data.user.id,
                  email: data.user.email,
                  name: data.user.name,
                  initials: data.user.initials || generateInitials(data.user.name),
                  avatar: data.user.avatar,
                  preferences: data.user.preferences
                },
                tokens: {
                  accessToken: data.tokens.accessToken,
                  refreshToken: data.tokens.refreshToken,
                  expiresAt: data.tokens.expiresAt
                },
                authMethod: data.authMethod,
                lastActivity: Date.now()
              };

              saveSessionUtil(sessionData);

              set({
                lastActivity: Date.now()
              });
            },

            clearSession: () => {
              if (typeof window === 'undefined') return;

              clearSessionUtil();

              set({
                lastActivity: null
              });
            },

            isSessionValid: () => {
              if (typeof window === 'undefined') return false;

              const session = getSessionUtil();
              return isSessionValidUtil(session);
            },

            updateLastActivity: () => {
              const now = Date.now();

              // Update session last activity if session exists
              if (typeof window !== 'undefined') {
                const session = getSessionUtil();
                if (session) {
                  session.lastActivity = now;
                  saveSessionUtil(session);
                }
              }

              set({
                lastActivity: now
              });
            },

            configureStorage: (config) => {
              set((state) => ({
                ...state,
                ...config
              }));

              // Apply configuration to session storage utility
              if (typeof window !== 'undefined') {
                configureSessionStorage({
                  type: config.storageType || get().storageType,
                  sessionTimeout: config.sessionTimeout || get().sessionTimeout,
                  persistentSessions: config.storageType === 'localStorage',
                  userRole: 'guest', // Default role
                  migrateExistingSession: false
                });
              }
            }
          })
    )
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

/**
 * Helper to create session data from auth response
 */
export function createSessionData(
  user: User,
  tokens: {
    accessToken: string;
    refreshToken?: string;
    expiresIn?: number;
  },
  authMethod: SignInData['authMethod'] = 'passkey'
): SignInData {
  return {
    user: convertUserToSessionUser(user),
    tokens: {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken || '',
      expiresAt: tokens.expiresIn
        ? Date.now() + tokens.expiresIn * 1000
        : Date.now() + 24 * 60 * 60 * 1000 // Default 24h
    },
    authMethod,
    lastActivity: Date.now()
  };
}

/**
 * Helper to initialize session store with existing session
 */
export function initializeSessionStore(store: ReturnType<typeof createSessionStore>) {
  if (typeof window === 'undefined') return null;

  const existingSession = getCurrentSession();
  if (!existingSession || !isSessionValidUtil(existingSession)) {
    return null;
  }

  // Update last activity
  store.getState().updateLastActivity();

  return {
    user: convertSessionUserToUser(existingSession.user),
    tokens: existingSession.tokens,
    authMethod: existingSession.authMethod
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
