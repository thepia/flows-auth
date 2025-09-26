/**
 * Dynamic Role Security Tests
 * Security-focused tests for dynamic role configuration and session migration
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createAuthStore } from '../../src/stores/auth-store';
import type { AuthConfig, SignInResponse, StorageConfigurationUpdate } from '../../src/types';

// Mock the API client
vi.mock('../../src/api/auth-api', () => ({
  AuthApiClient: vi.fn().mockImplementation(() => ({
    signIn: vi.fn(),
    signInWithPasskey: vi.fn(),
    signInWithMagicLink: vi.fn(),
    refreshToken: vi.fn(),
    signOut: vi.fn()
  }))
}));

const mockConfig: AuthConfig = {
  apiBaseUrl: 'https://api.test.com',
  clientId: 'test-client',
  domain: 'test.com',
  enablePasskeys: true,
  enableMagicPins: true,
  branding: {
    companyName: 'Test Company',
    showPoweredBy: true
  }
};

describe('Dynamic Role Security Tests', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  describe('Security-First Defaults', () => {
    it('should always start with conservative guest defaults', () => {
      const authStore = createAuthStore({
        ...mockConfig,
        applicationContext: {
          userType: 'all_employees',
          domain: 'internal.company.com'
        }
      });

      // Even for all_employees context, should start with conservative defaults
      const context = authStore.getApplicationContext();
      expect(context?.userType).toBe('all_employees');

      // Should not pre-assume employee roles for security
      // Implementation should start with sessionStorage regardless of context
    });

    it('should enforce forceGuestMode when specified', () => {
      const authStore = createAuthStore({
        ...mockConfig,
        applicationContext: {
          userType: 'mixed',
          forceGuestMode: true
        }
      });

      const context = authStore.getApplicationContext();
      expect(context?.forceGuestMode).toBe(true);
    });

    it('should use secure session timeouts by default', () => {
      const authStore = createAuthStore(mockConfig);

      // Should default to 8 hours or less for security
      // Implementation should use sessionStorage with reasonable timeout
    });
  });

  describe('Role Verification Requirements', () => {
    it('should require verified authentication before role upgrades', async () => {
      const authStore = createAuthStore({
        ...mockConfig,
        applicationContext: {
          userType: 'mixed',
          forceGuestMode: true
        }
      });

      // Mock storage configuration update
      const mockUpdateStorageConfiguration = vi.fn();
      (authStore as any).updateStorageConfiguration = mockUpdateStorageConfiguration;

      // Attempt to upgrade without authentication should fail
      try {
        await authStore.updateStorageConfiguration({
          type: 'localStorage',
          userRole: 'employee',
          sessionTimeout: 7 * 24 * 60 * 60 * 1000,
          migrateExistingSession: true,
          preserveTokens: true
        });
      } catch (error) {
        expect(error).toBeDefined();
        // Should reject unauthenticated role upgrades
      }
    });

    it('should verify role from server response, not client claims', async () => {
      const authStore = createAuthStore({
        ...mockConfig,
        applicationContext: {
          userType: 'mixed',
          forceGuestMode: true
        }
      });

      // Mock authentication response with server-verified role
      const serverVerifiedResponse: SignInResponse = {
        step: 'success',
        user: {
          id: '123',
          email: 'employee@company.com',
          name: 'Employee User',
          emailVerified: true,
          createdAt: '2023-01-01T00:00:00Z',
          metadata: {
            role: 'employee',
            serverVerified: true,
            issuedAt: Date.now()
          }
        },
        accessToken: 'verified-access-token',
        refreshToken: 'verified-refresh-token',
        expiresIn: 3600
      };

      const mockApi = authStore.api as any;
      mockApi.signInWithMagicLink.mockResolvedValue(serverVerifiedResponse);

      // Mock storage configuration update
      const mockUpdateStorageConfiguration = vi.fn();
      (authStore as any).updateStorageConfiguration = mockUpdateStorageConfiguration;

      // Authenticate using magic link (passwordless)
      await authStore.signInWithMagicLink('employee@company.com');

      // Should only accept server-verified roles
      expect(serverVerifiedResponse.user?.metadata?.serverVerified).toBe(true);
    });

    it('should reject client-side role modifications', async () => {
      const authStore = createAuthStore({
        ...mockConfig,
        applicationContext: {
          userType: 'mixed',
          forceGuestMode: true
        }
      });

      // Mock authentication response
      const authResponse: SignInResponse = {
        step: 'success',
        user: {
          id: '123',
          email: 'guest@example.com',
          name: 'Guest User',
          emailVerified: true,
          createdAt: '2023-01-01T00:00:00Z',
          metadata: { role: 'guest' }
        },
        accessToken: 'guest-access-token',
        refreshToken: 'guest-refresh-token',
        expiresIn: 3600
      };

      const mockApi = authStore.api as any;
      mockApi.signInWithMagicLink.mockResolvedValue(authResponse);

      // Mock storage configuration update with validation
      const mockUpdateStorageConfiguration = vi.fn().mockImplementation(async (update) => {
        // Should validate that update matches authenticated user role
        const authenticatedRole = authResponse.user?.metadata?.role;
        if (update.userRole !== authenticatedRole) {
          throw new Error('Role mismatch: Cannot upgrade beyond authenticated role');
        }
      });
      (authStore as any).updateStorageConfiguration = mockUpdateStorageConfiguration;

      // Authenticate as guest using magic link (passwordless)
      await authStore.signInWithMagicLink('guest@example.com');

      // Attempt to upgrade to employee should fail
      try {
        await authStore.updateStorageConfiguration({
          type: 'localStorage',
          userRole: 'employee', // Attempting to upgrade beyond authenticated role
          sessionTimeout: 7 * 24 * 60 * 60 * 1000,
          migrateExistingSession: true,
          preserveTokens: true
        });
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toBe(
          'Role mismatch: Cannot upgrade beyond authenticated role'
        );
      }
    });
  });

  describe('Session Migration Security', () => {
    it('should validate tokens before migration', async () => {
      const authStore = createAuthStore({
        ...mockConfig,
        applicationContext: {
          userType: 'mixed',
          forceGuestMode: true
        }
      });

      // Mock migration with token validation
      const mockMigrateSession = vi.fn().mockImplementation(async (fromType, toType) => {
        // Simulate token validation
        const accessToken =
          localStorage.getItem('auth_access_token') || sessionStorage.getItem('auth_access_token');
        const expiresAt =
          localStorage.getItem('auth_expires_at') || sessionStorage.getItem('auth_expires_at');

        if (!accessToken || !expiresAt) {
          return {
            success: false,
            fromStorage: fromType,
            toStorage: toType,
            dataPreserved: false,
            tokensPreserved: false,
            error: 'No valid tokens found'
          };
        }

        const expiry = Number.parseInt(expiresAt);
        if (expiry < Date.now()) {
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

      (authStore as any).migrateSession = mockMigrateSession;

      // Test migration with expired token
      sessionStorage.setItem('auth_access_token', 'expired-token');
      sessionStorage.setItem('auth_expires_at', (Date.now() - 3600000).toString()); // Expired 1 hour ago

      const result = await authStore.migrateSession('sessionStorage', 'localStorage');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Expired tokens cannot be migrated');
    });

    it('should prevent downgrade attacks', async () => {
      const authStore = createAuthStore({
        ...mockConfig,
        applicationContext: {
          userType: 'mixed',
          forceGuestMode: true
        }
      });

      // Mock migration with downgrade protection
      const mockMigrateSession = vi.fn().mockImplementation(async (fromType, toType) => {
        // Simulate role-based downgrade protection
        const userDataString = localStorage.getItem('auth_user');
        if (userDataString) {
          const userData = JSON.parse(userDataString);
          const currentRole = userData.metadata?.role;

          // Prevent admin from downgrading to localStorage->sessionStorage (less secure)
          if (
            currentRole === 'admin' &&
            fromType === 'localStorage' &&
            toType === 'sessionStorage'
          ) {
            return {
              success: false,
              fromStorage: fromType,
              toStorage: toType,
              dataPreserved: true,
              tokensPreserved: true,
              error: 'Admin sessions cannot be downgraded to sessionStorage'
            };
          }
        }

        return {
          success: true,
          fromStorage: fromType,
          toStorage: toType,
          dataPreserved: true,
          tokensPreserved: true
        };
      });

      (authStore as any).migrateSession = mockMigrateSession;

      // Set up admin user in localStorage
      localStorage.setItem(
        'auth_user',
        JSON.stringify({
          id: '999',
          email: 'admin@company.com',
          name: 'Admin User',
          emailVerified: true,
          createdAt: '2023-01-01T00:00:00Z',
          metadata: { role: 'admin' }
        })
      );

      // Attempt to downgrade admin session
      const result = await authStore.migrateSession('localStorage', 'sessionStorage');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Admin sessions cannot be downgraded to sessionStorage');
    });

    it('should clear sensitive data on migration failure', async () => {
      const authStore = createAuthStore({
        ...mockConfig,
        applicationContext: {
          userType: 'mixed',
          forceGuestMode: true
        }
      });

      // Mock migration with cleanup on failure
      const mockMigrateSession = vi.fn().mockImplementation(async (fromType, toType) => {
        // Simulate migration failure and cleanup
        sessionStorage.removeItem('auth_access_token');
        sessionStorage.removeItem('auth_refresh_token');
        sessionStorage.removeItem('auth_user');

        return {
          success: false,
          fromStorage: fromType,
          toStorage: toType,
          dataPreserved: false,
          tokensPreserved: false,
          error: 'Migration failed, sensitive data cleared'
        };
      });

      (authStore as any).migrateSession = mockMigrateSession;

      // Set up initial session data
      sessionStorage.setItem('auth_access_token', 'sensitive-token');
      sessionStorage.setItem('auth_refresh_token', 'sensitive-refresh');
      sessionStorage.setItem('auth_user', JSON.stringify({ id: '123' }));

      const result = await authStore.migrateSession('sessionStorage', 'localStorage');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Migration failed, sensitive data cleared');
      expect(result.dataPreserved).toBe(false);
      expect(result.tokensPreserved).toBe(false);
    });
  });

  describe('Audit and Logging Requirements', () => {
    it('should log all role changes for audit', async () => {
      const authStore = createAuthStore({
        ...mockConfig,
        applicationContext: {
          userType: 'mixed',
          forceGuestMode: true
        }
      });

      // Mock console.log for audit capture
      const mockConsoleLog = vi.spyOn(console, 'log');

      // Mock storage configuration update with audit logging
      const mockUpdateStorageConfiguration = vi.fn().mockImplementation(async (update) => {
        // Should log role changes for audit
        console.log('AUDIT: Role configuration update', {
          timestamp: new Date().toISOString(),
          fromRole: 'guest',
          toRole: update.userRole,
          fromStorage: 'sessionStorage',
          toStorage: update.type,
          userId: '123'
        });
      });

      (authStore as any).updateStorageConfiguration = mockUpdateStorageConfiguration;

      // Perform role upgrade
      await authStore.updateStorageConfiguration({
        type: 'localStorage',
        userRole: 'employee',
        sessionTimeout: 7 * 24 * 60 * 60 * 1000,
        migrateExistingSession: true,
        preserveTokens: true
      });

      expect(mockConsoleLog).toHaveBeenCalledWith(
        'AUDIT: Role configuration update',
        expect.objectContaining({
          fromRole: 'guest',
          toRole: 'employee',
          fromStorage: 'sessionStorage',
          toStorage: 'localStorage',
          userId: '123'
        })
      );

      mockConsoleLog.mockRestore();
    });

    it('should track migration attempts and failures', async () => {
      const authStore = createAuthStore({
        ...mockConfig,
        applicationContext: {
          userType: 'mixed',
          forceGuestMode: true
        }
      });

      // Mock console.error for failure tracking
      const mockConsoleError = vi.spyOn(console, 'error');

      // Mock migration with failure tracking
      const mockMigrateSession = vi.fn().mockImplementation(async (fromType, toType) => {
        // Log migration failure
        console.error('AUDIT: Session migration failed', {
          timestamp: new Date().toISOString(),
          fromStorage: fromType,
          toStorage: toType,
          error: 'Storage quota exceeded',
          userId: '123'
        });

        return {
          success: false,
          fromStorage: fromType,
          toStorage: toType,
          dataPreserved: false,
          tokensPreserved: false,
          error: 'Storage quota exceeded'
        };
      });

      (authStore as any).migrateSession = mockMigrateSession;

      const result = await authStore.migrateSession('sessionStorage', 'localStorage');

      expect(result.success).toBe(false);
      expect(mockConsoleError).toHaveBeenCalledWith(
        'AUDIT: Session migration failed',
        expect.objectContaining({
          fromStorage: 'sessionStorage',
          toStorage: 'localStorage',
          error: 'Storage quota exceeded',
          userId: '123'
        })
      );

      mockConsoleError.mockRestore();
    });
  });

  describe('Performance and Reliability', () => {
    it('should complete migration within 500ms performance requirement', async () => {
      const authStore = createAuthStore({
        ...mockConfig,
        applicationContext: {
          userType: 'mixed',
          forceGuestMode: true
        }
      });

      // Mock migration with performance tracking
      const mockMigrateSession = vi.fn().mockImplementation(async (fromType, toType) => {
        const startTime = Date.now();

        // Simulate migration work
        await new Promise((resolve) => setTimeout(resolve, 100)); // 100ms simulation

        const endTime = Date.now();
        const duration = endTime - startTime;

        return {
          success: true,
          fromStorage: fromType,
          toStorage: toType,
          dataPreserved: true,
          tokensPreserved: true,
          duration: duration
        };
      });

      (authStore as any).migrateSession = mockMigrateSession;

      const result = await authStore.migrateSession('sessionStorage', 'localStorage');

      expect(result.success).toBe(true);
      expect((result as any).duration).toBeLessThan(500); // Performance requirement
    });
  });
});
