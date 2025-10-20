/**
 * Common Mock for SessionPersistence Interface
 *
 * Provides a reusable mock implementation of the SessionPersistence interface
 * for use across all test files. This ensures consistency and reduces duplication.
 *
 * Usage:
 * ```typescript
 * import { createMockSessionPersistence } from './helpers/session-persistence-mock';
 *
 * const mockAdapter = createMockSessionPersistence();
 * const config = {
 *   apiBaseUrl: 'https://api.test.com',
 *   database: mockAdapter
 * };
 *
 * // Access spies for assertions
 * expect(mockAdapter.saveSession).toHaveBeenCalledWith(sessionData);
 * expect(mockAdapter.saveUser).toHaveBeenCalledWith(userData);
 * ```
 */

import { vi } from 'vitest';
import type { SessionData, SessionPersistence, UserData } from '../../src/types';

export interface MockSessionPersistence extends SessionPersistence {
  // Expose the vi.Mock types for easy spy assertions
  saveSession: ReturnType<typeof vi.fn> & ((session: Partial<SessionData>) => Promise<SessionData>);
  loadSession: ReturnType<typeof vi.fn> & (() => Promise<SessionData | null>);
  clearSession: ReturnType<typeof vi.fn> & (() => Promise<void>);
  saveUser: ReturnType<typeof vi.fn> & ((user: UserData) => Promise<void>);
  getUser: ReturnType<typeof vi.fn> & ((userId?: string) => Promise<UserData | null>);
  clearUser: ReturnType<typeof vi.fn> & ((userId?: string) => Promise<void>);
}

/**
 * Create a mock SessionPersistence adapter with all methods implemented
 *
 * @param options - Optional configuration for mock behavior
 * @returns Mock SessionPersistence with vitest spies
 */
export function createMockSessionPersistence(options?: {
  initialSession?: SessionData | null;
  initialUser?: UserData | null;
}): MockSessionPersistence {
  const { initialSession = null, initialUser = null } = options || {};

  // In-memory storage for stateful mocks
  let storedSession: SessionData | null = initialSession;
  const storedUsers: Map<string, UserData> = new Map();

  if (initialUser) {
    storedUsers.set(initialUser.userId, initialUser);
  }

  return {
    saveSession: vi.fn().mockImplementation(async (session: Partial<SessionData>) => {
      // Merge with existing session if present
      const merged = storedSession ? { ...storedSession, ...session } : (session as SessionData);
      storedSession = merged;
      return merged;
    }),

    loadSession: vi.fn().mockImplementation(async () => {
      return storedSession;
    }),

    clearSession: vi.fn().mockImplementation(async () => {
      storedSession = null;
    }),

    saveUser: vi.fn().mockImplementation(async (user: UserData) => {
      storedUsers.set(user.userId, user);
    }),

    getUser: vi.fn().mockImplementation(async (userId?: string) => {
      // If userId provided, get that specific user; otherwise return first/only user
      if (userId) {
        return storedUsers.get(userId) || null;
      }
      // Get first user if no userId specified
      const firstUser = storedUsers.values().next().value;
      return firstUser || null;
    }),

    clearUser: vi.fn().mockImplementation(async (userId?: string) => {
      if (userId) {
        // Clear specific user
        storedUsers.delete(userId);
      } else {
        // Clear all users
        storedUsers.clear();
      }
    })
  };
}

/**
 * Create a simple mock SessionPersistence adapter that just tracks calls
 * (no stateful behavior - all methods return null/undefined)
 *
 * Use this when you only need to verify method calls, not behavior.
 */
export function createSimpleMockSessionPersistence(): MockSessionPersistence {
  return {
    saveSession: vi.fn().mockResolvedValue({} as SessionData),
    loadSession: vi.fn().mockResolvedValue(null),
    clearSession: vi.fn().mockResolvedValue(undefined),
    saveUser: vi.fn().mockResolvedValue(undefined),
    getUser: vi.fn().mockResolvedValue(null),
    clearUser: vi.fn().mockResolvedValue(undefined)
  };
}

/**
 * Reset all spies on a mock SessionPersistence adapter
 */
export function resetMockSessionPersistence(mock: MockSessionPersistence): void {
  mock.saveSession.mockClear();
  mock.loadSession.mockClear();
  mock.clearSession.mockClear();
  mock.saveUser.mockClear();
  mock.getUser.mockClear();
  mock.clearUser.mockClear();
}
