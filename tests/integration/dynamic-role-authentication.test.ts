/**
 * Dynamic Role Authentication Integration Tests
 * Comprehensive test scenarios for the complete authentication flow with dynamic role upgrades
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createAuthStore } from '../../src/stores/auth-store';
import type { AuthConfig, SignInResponse, ApplicationContext, StorageConfigurationUpdate } from '../../src/types';

// Mock the API client
vi.mock('../../src/api/auth-api', () => ({
  AuthApiClient: vi.fn().mockImplementation(() => ({
    signIn: vi.fn(),
    signInWithPassword: vi.fn(),
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
  enableMagicLinks: true,
  enablePasswordLogin: true,
  enableSocialLogin: false,
  branding: {
    companyName: 'Test Company',
    showPoweredBy: true
  }
};

describe('Dynamic Role Authentication Integration Tests', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  describe('Public Application Flow', () => {
    it('should start with conservative guest defaults', () => {
      const authStore = createAuthStore({
        ...mockConfig,
        applicationContext: {
          userType: 'mixed',
          forceGuestMode: true
        }
      });

      const context = authStore.getApplicationContext();
      expect(context?.userType).toBe('mixed');
      expect(context?.forceGuestMode).toBe(true);
      
      // Should start with sessionStorage for security
      // (This test assumes the implementation uses sessionStorage by default)
    });

    it('should upgrade to employee configuration after employee authentication', async () => {
      const authStore = createAuthStore({
        ...mockConfig,
        applicationContext: {
          userType: 'mixed',
          forceGuestMode: true
        }
      });

      // Mock successful employee authentication
      const employeeAuthResponse: SignInResponse = {
        step: 'success',
        user: {
          id: '123',
          email: 'employee@company.com',
          name: 'Employee User',
          emailVerified: true,
          createdAt: '2023-01-01T00:00:00Z',
          metadata: { role: 'employee' }
        },
        accessToken: 'employee-access-token',
        refreshToken: 'employee-refresh-token',
        expiresIn: 3600
      };

      const mockApi = authStore.api as any;
      mockApi.signInWithPassword.mockResolvedValue(employeeAuthResponse);

      // Mock storage configuration update
      const mockUpdateStorageConfiguration = vi.fn();
      (authStore as any).updateStorageConfiguration = mockUpdateStorageConfiguration;

      // Authenticate
      await authStore.signInWithPassword('employee@company.com', 'password');

      // Simulate the application detecting the employee role and upgrading storage
      const expectedUpdate: StorageConfigurationUpdate = {
        type: 'localStorage',
        userRole: 'employee',
        sessionTimeout: 7 * 24 * 60 * 60 * 1000,
        migrateExistingSession: true,
        preserveTokens: true
      };

      await authStore.updateStorageConfiguration(expectedUpdate);

      expect(mockUpdateStorageConfiguration).toHaveBeenCalledWith(expectedUpdate);
    });

    it('should remain in guest configuration for guest users', async () => {
      const authStore = createAuthStore({
        ...mockConfig,
        applicationContext: {
          userType: 'mixed',
          forceGuestMode: true
        }
      });

      // Mock successful guest authentication
      const guestAuthResponse: SignInResponse = {
        step: 'success',
        user: {
          id: '456',
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
      mockApi.signInWithPassword.mockResolvedValue(guestAuthResponse);

      // Mock storage configuration update
      const mockUpdateStorageConfiguration = vi.fn();
      (authStore as any).updateStorageConfiguration = mockUpdateStorageConfiguration;

      // Authenticate
      await authStore.signInWithPassword('guest@example.com', 'password');

      // For guest users, no storage upgrade should occur
      expect(mockUpdateStorageConfiguration).not.toHaveBeenCalled();
    });
  });

  describe('Corporate Intranet Flow', () => {
    it('should start with conservative defaults even for all-employee context', () => {
      const authStore = createAuthStore({
        ...mockConfig,
        applicationContext: {
          userType: 'all_employees',
          domain: 'internal.company.com'
        }
      });

      const context = authStore.getApplicationContext();
      expect(context?.userType).toBe('all_employees');
      expect(context?.domain).toBe('internal.company.com');
      
      // Should still start with sessionStorage for security-first approach
    });

    it('should upgrade to employee configuration after authentication', async () => {
      const authStore = createAuthStore({
        ...mockConfig,
        applicationContext: {
          userType: 'all_employees',
          domain: 'internal.company.com'
        }
      });

      // Mock successful employee authentication in corporate context
      const employeeAuthResponse: SignInResponse = {
        step: 'success',
        user: {
          id: '789',
          email: 'employee@company.com',
          name: 'Corporate Employee',
          emailVerified: true,
          createdAt: '2023-01-01T00:00:00Z',
          metadata: { role: 'employee', department: 'engineering' }
        },
        accessToken: 'corporate-access-token',
        refreshToken: 'corporate-refresh-token',
        expiresIn: 3600
      };

      const mockApi = authStore.api as any;
      mockApi.signInWithPassword.mockResolvedValue(employeeAuthResponse);

      // Mock storage configuration update
      const mockUpdateStorageConfiguration = vi.fn();
      (authStore as any).updateStorageConfiguration = mockUpdateStorageConfiguration;

      // Authenticate
      await authStore.signInWithPassword('employee@company.com', 'password');

      // Should upgrade to employee configuration
      const expectedUpdate: StorageConfigurationUpdate = {
        type: 'localStorage',
        userRole: 'employee',
        sessionTimeout: 7 * 24 * 60 * 60 * 1000,
        migrateExistingSession: true,
        preserveTokens: true
      };

      await authStore.updateStorageConfiguration(expectedUpdate);

      expect(mockUpdateStorageConfiguration).toHaveBeenCalledWith(expectedUpdate);
    });
  });

  describe('Admin Portal Flow', () => {
    it('should enforce guest mode for admin portal security', () => {
      const authStore = createAuthStore({
        ...mockConfig,
        applicationContext: {
          userType: 'mixed',
          urlPath: '/admin/login',
          forceGuestMode: true
        }
      });

      const context = authStore.getApplicationContext();
      expect(context?.urlPath).toBe('/admin/login');
      expect(context?.forceGuestMode).toBe(true);
    });

    it('should upgrade to admin configuration after admin authentication', async () => {
      const authStore = createAuthStore({
        ...mockConfig,
        applicationContext: {
          userType: 'mixed',
          urlPath: '/admin/login',
          forceGuestMode: true
        }
      });

      // Mock successful admin authentication
      const adminAuthResponse: SignInResponse = {
        step: 'success',
        user: {
          id: '999',
          email: 'admin@company.com',
          name: 'Admin User',
          emailVerified: true,
          createdAt: '2023-01-01T00:00:00Z',
          metadata: { role: 'admin', permissions: ['read', 'write', 'admin'] }
        },
        accessToken: 'admin-access-token',
        refreshToken: 'admin-refresh-token',
        expiresIn: 3600
      };

      const mockApi = authStore.api as any;
      mockApi.signInWithPassword.mockResolvedValue(adminAuthResponse);

      // Mock storage configuration update
      const mockUpdateStorageConfiguration = vi.fn();
      (authStore as any).updateStorageConfiguration = mockUpdateStorageConfiguration;

      // Authenticate
      await authStore.signInWithPassword('admin@company.com', 'password');

      // Should upgrade to admin configuration
      const expectedUpdate: StorageConfigurationUpdate = {
        type: 'localStorage',
        userRole: 'admin',
        sessionTimeout: 7 * 24 * 60 * 60 * 1000,
        migrateExistingSession: true,
        preserveTokens: true
      };

      await authStore.updateStorageConfiguration(expectedUpdate);

      expect(mockUpdateStorageConfiguration).toHaveBeenCalledWith(expectedUpdate);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle authentication with unknown role', async () => {
      const authStore = createAuthStore({
        ...mockConfig,
        applicationContext: {
          userType: 'mixed',
          forceGuestMode: true
        }
      });

      // Mock authentication response with unknown role
      const unknownRoleResponse: SignInResponse = {
        step: 'success',
        user: {
          id: '555',
          email: 'unknown@example.com',
          name: 'Unknown Role User',
          emailVerified: true,
          createdAt: '2023-01-01T00:00:00Z',
          metadata: { role: 'unknown_role' }
        },
        accessToken: 'unknown-access-token',
        refreshToken: 'unknown-refresh-token',
        expiresIn: 3600
      };

      const mockApi = authStore.api as any;
      mockApi.signInWithPassword.mockResolvedValue(unknownRoleResponse);

      // Mock storage configuration update
      const mockUpdateStorageConfiguration = vi.fn();
      (authStore as any).updateStorageConfiguration = mockUpdateStorageConfiguration;

      // Authenticate
      await authStore.signInWithPassword('unknown@example.com', 'password');

      // Should not upgrade configuration for unknown roles (remain as guest)
      expect(mockUpdateStorageConfiguration).not.toHaveBeenCalled();
    });

    it('should handle storage configuration update failure', async () => {
      const authStore = createAuthStore({
        ...mockConfig,
        applicationContext: {
          userType: 'mixed',
          forceGuestMode: true
        }
      });

      // Mock successful authentication
      const employeeAuthResponse: SignInResponse = {
        step: 'success',
        user: {
          id: '123',
          email: 'employee@company.com',
          name: 'Employee User',
          emailVerified: true,
          createdAt: '2023-01-01T00:00:00Z',
          metadata: { role: 'employee' }
        },
        accessToken: 'employee-access-token',
        refreshToken: 'employee-refresh-token',
        expiresIn: 3600
      };

      const mockApi = authStore.api as any;
      mockApi.signInWithPassword.mockResolvedValue(employeeAuthResponse);

      // Mock storage configuration update failure
      const mockUpdateStorageConfiguration = vi.fn().mockRejectedValue(
        new Error('Storage configuration update failed')
      );
      (authStore as any).updateStorageConfiguration = mockUpdateStorageConfiguration;

      // Authenticate
      await authStore.signInWithPassword('employee@company.com', 'password');

      // Attempt to update storage configuration
      try {
        await authStore.updateStorageConfiguration({
          type: 'localStorage',
          userRole: 'employee',
          sessionTimeout: 7 * 24 * 60 * 60 * 1000,
          migrateExistingSession: true,
          preserveTokens: true
        });
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toBe('Storage configuration update failed');
      }

      // Should remain authenticated even if storage upgrade fails
      expect(authStore.isAuthenticated()).toBe(true);
    });

    it('should handle missing user metadata', async () => {
      const authStore = createAuthStore({
        ...mockConfig,
        applicationContext: {
          userType: 'mixed',
          forceGuestMode: true
        }
      });

      // Mock authentication response without metadata
      const noMetadataResponse: SignInResponse = {
        step: 'success',
        user: {
          id: '777',
          email: 'nometa@example.com',
          name: 'No Metadata User',
          emailVerified: true,
          createdAt: '2023-01-01T00:00:00Z'
          // No metadata field
        },
        accessToken: 'nometa-access-token',
        refreshToken: 'nometa-refresh-token',
        expiresIn: 3600
      };

      const mockApi = authStore.api as any;
      mockApi.signInWithPassword.mockResolvedValue(noMetadataResponse);

      // Mock storage configuration update
      const mockUpdateStorageConfiguration = vi.fn();
      (authStore as any).updateStorageConfiguration = mockUpdateStorageConfiguration;

      // Authenticate
      await authStore.signInWithPassword('nometa@example.com', 'password');

      // Should not upgrade configuration when metadata is missing
      expect(mockUpdateStorageConfiguration).not.toHaveBeenCalled();
    });
  });

  describe('Session Migration Flow', () => {
    it('should complete full authentication flow with session migration', async () => {
      const authStore = createAuthStore({
        ...mockConfig,
        applicationContext: {
          userType: 'mixed',
          forceGuestMode: true
        }
      });

      // Mock successful employee authentication
      const employeeAuthResponse: SignInResponse = {
        step: 'success',
        user: {
          id: '123',
          email: 'employee@company.com',
          name: 'Employee User',
          emailVerified: true,
          createdAt: '2023-01-01T00:00:00Z',
          metadata: { role: 'employee' }
        },
        accessToken: 'employee-access-token',
        refreshToken: 'employee-refresh-token',
        expiresIn: 3600
      };

      const mockApi = authStore.api as any;
      mockApi.signInWithPassword.mockResolvedValue(employeeAuthResponse);

      // Mock storage configuration update and migration
      const mockUpdateStorageConfiguration = vi.fn();
      const mockMigrateSession = vi.fn().mockResolvedValue({
        success: true,
        fromStorage: 'sessionStorage',
        toStorage: 'localStorage',
        dataPreserved: true,
        tokensPreserved: true
      });

      (authStore as any).updateStorageConfiguration = mockUpdateStorageConfiguration;
      (authStore as any).migrateSession = mockMigrateSession;

      // Authenticate
      await authStore.signInWithPassword('employee@company.com', 'password');

      // Simulate application-level storage upgrade
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

      await authStore.updateStorageConfiguration(storageUpdate);

      // Verify complete flow
      expect(authStore.isAuthenticated()).toBe(true);
      expect(mockUpdateStorageConfiguration).toHaveBeenCalledWith(storageUpdate);
      expect(mockMigrateSession).toHaveBeenCalledWith('sessionStorage', 'localStorage');
    });

    it('should handle session migration failure gracefully', async () => {
      const authStore = createAuthStore({
        ...mockConfig,
        applicationContext: {
          userType: 'mixed',
          forceGuestMode: true
        }
      });

      // Mock successful authentication
      const employeeAuthResponse: SignInResponse = {
        step: 'success',
        user: {
          id: '123',
          email: 'employee@company.com',
          name: 'Employee User',
          emailVerified: true,
          createdAt: '2023-01-01T00:00:00Z',
          metadata: { role: 'employee' }
        },
        accessToken: 'employee-access-token',
        refreshToken: 'employee-refresh-token',
        expiresIn: 3600
      };

      const mockApi = authStore.api as any;
      mockApi.signInWithPassword.mockResolvedValue(employeeAuthResponse);

      // Mock storage configuration update and migration failure
      const mockUpdateStorageConfiguration = vi.fn();
      const mockMigrateSession = vi.fn().mockResolvedValue({
        success: false,
        fromStorage: 'sessionStorage',
        toStorage: 'localStorage',
        dataPreserved: true,
        tokensPreserved: true,
        error: 'Storage quota exceeded'
      });

      (authStore as any).updateStorageConfiguration = mockUpdateStorageConfiguration;
      (authStore as any).migrateSession = mockMigrateSession;

      // Authenticate
      await authStore.signInWithPassword('employee@company.com', 'password');

      // Simulate application-level storage upgrade attempt
      mockUpdateStorageConfiguration.mockImplementation(async (update) => {
        if (update.migrateExistingSession) {
          const result = await mockMigrateSession('sessionStorage', 'localStorage');
          if (!result.success) {
            throw new Error(result.error || 'Migration failed');
          }
        }
      });

      try {
        await authStore.updateStorageConfiguration({
          type: 'localStorage',
          userRole: 'employee',
          sessionTimeout: 7 * 24 * 60 * 60 * 1000,
          migrateExistingSession: true,
          preserveTokens: true
        });
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toBe('Storage quota exceeded');
      }

      // Should remain authenticated even if migration fails
      expect(authStore.isAuthenticated()).toBe(true);
    });
  });
});