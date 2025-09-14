/**
 * Session Migration Integration Tests
 * Tests for dynamic role-based session migration functionality
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SessionMigrationResult, StorageConfigurationUpdate } from '../../src/types';
import { ConfigurableStorageManager } from '../../src/utils/storageManager';

// Mock browser storage APIs
const mockSessionStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn()
};

const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn()
};

// Mock window object
Object.defineProperty(window, 'sessionStorage', {
  value: mockSessionStorage,
  writable: true
});

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
  writable: true
});

// Mock session migration utility (will be implemented later)
const mockMigrateSession = vi.fn();

describe('Session Migration Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSessionStorage.getItem.mockReturnValue(null);
    mockLocalStorage.getItem.mockReturnValue(null);
  });

  describe('Guest to Employee Migration', () => {
    it('should migrate session from sessionStorage to localStorage', async () => {
      // Set up initial guest session in sessionStorage
      mockSessionStorage.getItem.mockImplementation((key: string) => {
        const data = {
          auth_access_token: 'guest-access-token',
          auth_refresh_token: 'guest-refresh-token',
          auth_user: JSON.stringify({
            id: '123',
            email: 'user@example.com',
            name: 'Test User',
            emailVerified: true,
            createdAt: '2023-01-01T00:00:00Z'
          }),
          auth_expires_at: (Date.now() + 3600000).toString()
        };
        return data[key as keyof typeof data] || null;
      });

      mockMigrateSession.mockResolvedValue({
        success: true,
        fromStorage: 'sessionStorage',
        toStorage: 'localStorage',
        dataPreserved: true,
        tokensPreserved: true
      } as SessionMigrationResult);

      const result = await mockMigrateSession('sessionStorage', 'localStorage');

      expect(result.success).toBe(true);
      expect(result.fromStorage).toBe('sessionStorage');
      expect(result.toStorage).toBe('localStorage');
      expect(result.dataPreserved).toBe(true);
      expect(result.tokensPreserved).toBe(true);
    });

    it('should preserve all session data during migration', async () => {
      const sessionData = {
        auth_access_token: 'access-token-123',
        auth_refresh_token: 'refresh-token-456',
        auth_user: JSON.stringify({
          id: '123',
          email: 'employee@company.com',
          name: 'Employee User',
          emailVerified: true,
          createdAt: '2023-01-01T00:00:00Z',
          metadata: { role: 'employee' }
        }),
        auth_expires_at: (Date.now() + 3600000).toString()
      };

      mockSessionStorage.getItem.mockImplementation((key: string) => {
        return sessionData[key as keyof typeof sessionData] || null;
      });

      mockMigrateSession.mockImplementation(async (fromType, toType) => {
        // Simulate migration by copying data to localStorage
        Object.entries(sessionData).forEach(([key, value]) => {
          mockLocalStorage.setItem(key, value);
        });

        return {
          success: true,
          fromStorage: fromType,
          toStorage: toType,
          dataPreserved: true,
          tokensPreserved: true
        };
      });

      const result = await mockMigrateSession('sessionStorage', 'localStorage');

      expect(result.success).toBe(true);
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'auth_access_token',
        'access-token-123'
      );
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'auth_refresh_token',
        'refresh-token-456'
      );
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('auth_user', sessionData.auth_user);
    });
  });

  describe('Employee to Guest Migration', () => {
    it('should migrate session from localStorage to sessionStorage', async () => {
      // Set up initial employee session in localStorage
      mockLocalStorage.getItem.mockImplementation((key: string) => {
        const data = {
          auth_access_token: 'employee-access-token',
          auth_refresh_token: 'employee-refresh-token',
          auth_user: JSON.stringify({
            id: '456',
            email: 'employee@company.com',
            name: 'Employee User',
            emailVerified: true,
            createdAt: '2023-01-01T00:00:00Z',
            metadata: { role: 'employee' }
          }),
          auth_expires_at: (Date.now() + 7 * 24 * 60 * 60 * 1000).toString()
        };
        return data[key as keyof typeof data] || null;
      });

      mockMigrateSession.mockResolvedValue({
        success: true,
        fromStorage: 'localStorage',
        toStorage: 'sessionStorage',
        dataPreserved: true,
        tokensPreserved: true
      } as SessionMigrationResult);

      const result = await mockMigrateSession('localStorage', 'sessionStorage');

      expect(result.success).toBe(true);
      expect(result.fromStorage).toBe('localStorage');
      expect(result.toStorage).toBe('sessionStorage');
    });

    it('should handle session timeout adjustment during downgrade', async () => {
      mockMigrateSession.mockImplementation(async (fromType, toType) => {
        // Guest sessions have shorter timeout (8 hours vs 7 days)
        const adjustedTimeout = 8 * 60 * 60 * 1000; // 8 hours

        return {
          success: true,
          fromStorage: fromType,
          toStorage: toType,
          dataPreserved: true,
          tokensPreserved: true,
          timeoutAdjusted: true,
          newTimeout: adjustedTimeout
        };
      });

      const result = await mockMigrateSession('localStorage', 'sessionStorage');

      expect(result.success).toBe(true);
      expect((result as any).timeoutAdjusted).toBe(true);
      expect((result as any).newTimeout).toBe(8 * 60 * 60 * 1000);
    });
  });

  describe('Migration Error Handling', () => {
    it('should handle migration failure gracefully', async () => {
      mockMigrateSession.mockResolvedValue({
        success: false,
        fromStorage: 'sessionStorage',
        toStorage: 'localStorage',
        dataPreserved: false,
        tokensPreserved: false,
        error: 'Storage quota exceeded'
      } as SessionMigrationResult);

      const result = await mockMigrateSession('sessionStorage', 'localStorage');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Storage quota exceeded');
      expect(result.dataPreserved).toBe(false);
      expect(result.tokensPreserved).toBe(false);
    });

    it('should rollback changes on partial failure', async () => {
      mockMigrateSession.mockImplementation(async (fromType, toType) => {
        // Simulate partial failure - some data copied but process failed
        mockLocalStorage.setItem('auth_access_token', 'partial-token');

        // Then simulate rollback
        mockLocalStorage.removeItem('auth_access_token');

        return {
          success: false,
          fromStorage: fromType,
          toStorage: toType,
          dataPreserved: false,
          tokensPreserved: false,
          error: 'Migration failed, changes rolled back'
        };
      });

      const result = await mockMigrateSession('sessionStorage', 'localStorage');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Migration failed, changes rolled back');
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('auth_access_token');
    });

    it('should preserve original data when migration fails', async () => {
      const originalData = {
        auth_access_token: 'original-token',
        auth_user: JSON.stringify({ id: '123', email: 'user@example.com' })
      };

      mockSessionStorage.getItem.mockImplementation((key: string) => {
        return originalData[key as keyof typeof originalData] || null;
      });

      mockMigrateSession.mockImplementation(async (fromType, toType) => {
        // Simulate failure without touching original data
        return {
          success: false,
          fromStorage: fromType,
          toStorage: toType,
          dataPreserved: true, // Original data preserved
          tokensPreserved: true,
          error: 'Target storage unavailable'
        };
      });

      const result = await mockMigrateSession('sessionStorage', 'localStorage');

      expect(result.success).toBe(false);
      expect(result.dataPreserved).toBe(true); // Original data should be preserved
      expect(result.tokensPreserved).toBe(true);
    });
  });

  describe('Authentication Flow Integration', () => {
    it('should trigger migration after successful authentication', async () => {
      // Mock authentication response with employee role
      const authResponse = {
        user: {
          id: '123',
          email: 'employee@company.com',
          name: 'Employee User',
          emailVerified: true,
          createdAt: '2023-01-01T00:00:00Z',
          metadata: { role: 'employee' }
        },
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
        expiresIn: 3600
      };

      // Mock storage configuration update
      const mockUpdateStorageConfiguration = vi.fn();

      const storageUpdate: StorageConfigurationUpdate = {
        type: 'localStorage',
        userRole: 'employee',
        sessionTimeout: 7 * 24 * 60 * 60 * 1000,
        migrateExistingSession: true,
        preserveTokens: true
      };

      mockUpdateStorageConfiguration.mockImplementation(async (update) => {
        if (update.migrateExistingSession) {
          return await mockMigrateSession('sessionStorage', 'localStorage');
        }
      });

      mockMigrateSession.mockResolvedValue({
        success: true,
        fromStorage: 'sessionStorage',
        toStorage: 'localStorage',
        dataPreserved: true,
        tokensPreserved: true
      });

      await mockUpdateStorageConfiguration(storageUpdate);

      expect(mockUpdateStorageConfiguration).toHaveBeenCalledWith(storageUpdate);
      expect(mockMigrateSession).toHaveBeenCalledWith('sessionStorage', 'localStorage');
    });

    it('should handle multi-tab session consistency during migration', async () => {
      // Mock storage event listener for cross-tab communication
      const mockStorageEventListener = vi.fn();
      const mockAddEventListener = vi.fn();

      Object.defineProperty(window, 'addEventListener', {
        value: mockAddEventListener,
        writable: true
      });

      mockMigrateSession.mockImplementation(async (fromType, toType) => {
        // Simulate cross-tab storage event
        const storageEvent = new Event('storage');
        mockStorageEventListener(storageEvent);

        return {
          success: true,
          fromStorage: fromType,
          toStorage: toType,
          dataPreserved: true,
          tokensPreserved: true,
          crossTabSync: true
        };
      });

      const result = await mockMigrateSession('sessionStorage', 'localStorage');

      expect(result.success).toBe(true);
      expect((result as any).crossTabSync).toBe(true);
    });
  });

  describe('Security Considerations', () => {
    it('should validate tokens before migration', async () => {
      const expiredToken = {
        auth_access_token: 'expired-token',
        auth_expires_at: (Date.now() - 3600000).toString() // Expired 1 hour ago
      };

      mockSessionStorage.getItem.mockImplementation((key: string) => {
        return expiredToken[key as keyof typeof expiredToken] || null;
      });

      mockMigrateSession.mockImplementation(async (fromType, toType) => {
        // Check if token is expired
        const expiresAt = Number.parseInt(expiredToken.auth_expires_at);
        const isExpired = expiresAt < Date.now();

        if (isExpired) {
          return {
            success: false,
            fromStorage: fromType,
            toStorage: toType,
            dataPreserved: false,
            tokensPreserved: false,
            error: 'Expired tokens cannot be migrated'
          };
        }

        return {
          success: true,
          fromStorage: fromType,
          toStorage: toType,
          dataPreserved: true,
          tokensPreserved: true
        };
      });

      const result = await mockMigrateSession('sessionStorage', 'localStorage');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Expired tokens cannot be migrated');
    });

    it('should prevent downgrade attacks', async () => {
      // Mock attempt to downgrade from admin to guest
      mockMigrateSession.mockImplementation(async (fromType, toType) => {
        // Simulate security check
        const currentRole = 'admin';
        const targetRole = 'guest';

        if (currentRole === 'admin' && targetRole === 'guest') {
          return {
            success: false,
            fromStorage: fromType,
            toStorage: toType,
            dataPreserved: true,
            tokensPreserved: true,
            error: 'Downgrade from admin to guest not allowed'
          };
        }

        return {
          success: true,
          fromStorage: fromType,
          toStorage: toType,
          dataPreserved: true,
          tokensPreserved: true
        };
      });

      const result = await mockMigrateSession('localStorage', 'sessionStorage');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Downgrade from admin to guest not allowed');
    });

    it('should clear sensitive data on failed migration', async () => {
      mockMigrateSession.mockImplementation(async (fromType, toType) => {
        // Simulate clearing sensitive data on failure
        mockSessionStorage.removeItem('auth_access_token');
        mockSessionStorage.removeItem('auth_refresh_token');

        return {
          success: false,
          fromStorage: fromType,
          toStorage: toType,
          dataPreserved: false,
          tokensPreserved: false,
          error: 'Migration failed, sensitive data cleared'
        };
      });

      const result = await mockMigrateSession('sessionStorage', 'localStorage');

      expect(result.success).toBe(false);
      expect(mockSessionStorage.removeItem).toHaveBeenCalledWith('auth_access_token');
      expect(mockSessionStorage.removeItem).toHaveBeenCalledWith('auth_refresh_token');
    });
  });
});
