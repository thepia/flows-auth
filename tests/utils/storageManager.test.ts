/**
 * Storage Manager Tests
 * Tests for configurable storage functionality
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ConfigurableStorageManager, getOptimalStorageConfig } from '../../src/utils/storageManager';
import type { StorageConfig } from '../../src/types';

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

describe('ConfigurableStorageManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Default Configuration', () => {
    it('should default to localStorage for better UX', () => {
      const manager = new ConfigurableStorageManager();
      const config = manager.getConfig();
      
      expect(config.type).toBe('localStorage');
      expect(config.userRole).toBe('guest');
      expect(config.persistentSessions).toBe(true);
    });

    it('should use localStorage adapter by default', () => {
      const manager = new ConfigurableStorageManager();
      
      manager.setItem('test', 'value');
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('test', 'value');
      expect(mockSessionStorage.setItem).not.toHaveBeenCalled();
    });
  });

  describe('Employee Configuration', () => {
    it('should auto-configure localStorage for employees', () => {
      const config: StorageConfig = {
        userRole: 'employee'
      };
      
      const manager = new ConfigurableStorageManager(config);
      const finalConfig = manager.getConfig();
      
      expect(finalConfig.type).toBe('localStorage');
      expect(finalConfig.persistentSessions).toBe(true);
      expect(finalConfig.sessionTimeout).toBe(7 * 24 * 60 * 60 * 1000); // 7 days
    });

    it('should use localStorage adapter for employees', () => {
      const config: StorageConfig = {
        userRole: 'employee'
      };
      
      const manager = new ConfigurableStorageManager(config);
      
      manager.setItem('test', 'value');
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('test', 'value');
      expect(mockSessionStorage.setItem).not.toHaveBeenCalled();
    });
  });

  describe('Explicit Configuration', () => {
    it('should respect explicit localStorage configuration', () => {
      const config: StorageConfig = {
        type: 'localStorage',
        sessionTimeout: 24 * 60 * 60 * 1000, // 24 hours
        userRole: 'guest'
      };
      
      const manager = new ConfigurableStorageManager(config);
      
      manager.setItem('test', 'value');
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('test', 'value');
    });

    it('should respect explicit sessionStorage configuration', () => {
      const config: StorageConfig = {
        type: 'sessionStorage',
        userRole: 'employee' // Even employees can use sessionStorage if explicit
      };
      
      const manager = new ConfigurableStorageManager(config);
      
      manager.setItem('test', 'value');
      expect(mockSessionStorage.setItem).toHaveBeenCalledWith('test', 'value');
    });
  });

  describe('Storage Operations', () => {
    it('should handle getItem operations', () => {
      mockLocalStorage.getItem.mockReturnValue('stored-value');
      
      const manager = new ConfigurableStorageManager();
      const result = manager.getItem('test-key');
      
      expect(mockLocalStorage.getItem).toHaveBeenCalledWith('test-key');
      expect(result).toBe('stored-value');
    });

    it('should handle removeItem operations', () => {
      const manager = new ConfigurableStorageManager();
      manager.removeItem('test-key');
      
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('test-key');
    });

    it('should handle clear operations', () => {
      const manager = new ConfigurableStorageManager();
      manager.clear();
      
      expect(mockLocalStorage.clear).toHaveBeenCalled();
    });
  });

  describe('Configuration Updates', () => {
    it('should update configuration without changing adapter if type unchanged', () => {
      const manager = new ConfigurableStorageManager();
      
      manager.updateConfig({ sessionTimeout: 12 * 60 * 60 * 1000 });
      
      const config = manager.getConfig();
      expect(config.sessionTimeout).toBe(12 * 60 * 60 * 1000);
      expect(config.type).toBe('localStorage');
    });

    it('should create new adapter when storage type changes', () => {
      const manager = new ConfigurableStorageManager();
      
      // Start with localStorage (new default)
      manager.setItem('test1', 'value1');
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('test1', 'value1');
      
      // Switch to sessionStorage
      manager.updateConfig({ type: 'sessionStorage' });
      manager.setItem('test2', 'value2');
      expect(mockSessionStorage.setItem).toHaveBeenCalledWith('test2', 'value2');
    });

    it('should handle dynamic role changes from guest to employee', () => {
      const manager = new ConfigurableStorageManager();
      
      // Start as guest with localStorage (new default)
      expect(manager.getConfig().type).toBe('localStorage');
      expect(manager.getConfig().userRole).toBe('guest');
      
      // Upgrade to employee configuration with explicit timeout
      manager.updateConfig({ 
        userRole: 'employee',
        sessionTimeout: 7 * 24 * 60 * 60 * 1000 // 7 days for employees
      });
      
      const config = manager.getConfig();
      expect(config.userRole).toBe('employee');
      expect(config.type).toBe('localStorage');
      expect(config.persistentSessions).toBe(true);
      expect(config.sessionTimeout).toBe(7 * 24 * 60 * 60 * 1000);
    });

    it('should handle dynamic role changes from employee to guest', () => {
      const manager = new ConfigurableStorageManager({ userRole: 'employee' });
      
      // Start as employee with localStorage
      expect(manager.getConfig().type).toBe('localStorage');
      expect(manager.getConfig().userRole).toBe('employee');
      
      // Downgrade to guest configuration (but keep localStorage for UX)
      manager.updateConfig({ 
        userRole: 'guest',
        sessionTimeout: 8 * 60 * 60 * 1000 // 8 hours for guests
      });
      
      const config = manager.getConfig();
      expect(config.userRole).toBe('guest');
      expect(config.type).toBe('localStorage'); // Still localStorage for UX
      expect(config.persistentSessions).toBe(true);
      expect(config.sessionTimeout).toBe(8 * 60 * 60 * 1000);
    });
  });

  describe('Utility Methods', () => {
    it('should correctly identify persistent session support', () => {
      const sessionManager = new ConfigurableStorageManager({ 
        type: 'sessionStorage',
        persistentSessions: false 
      });
      const localManager = new ConfigurableStorageManager({ type: 'localStorage' });
      
      expect(sessionManager.supportsPersistentSessions()).toBe(false);
      expect(localManager.supportsPersistentSessions()).toBe(true);
    });

    it('should return correct session timeout', () => {
      const customTimeout = 6 * 60 * 60 * 1000; // 6 hours
      const manager = new ConfigurableStorageManager({ sessionTimeout: customTimeout });
      
      expect(manager.getSessionTimeout()).toBe(customTimeout);
    });
  });
});

describe('getOptimalStorageConfig', () => {
  it('should return localStorage config for employees', () => {
    const config = getOptimalStorageConfig('employee');

    expect(config.type).toBe('localStorage');
    expect(config.persistentSessions).toBe(true);
    expect(config.userRole).toBe('employee');
    expect(config.sessionTimeout).toBe(7 * 24 * 60 * 60 * 1000);
  });

  it('should return localStorage config for staff', () => {
    const config = getOptimalStorageConfig('staff');

    expect(config.type).toBe('localStorage');
    expect(config.persistentSessions).toBe(true);
    expect(config.userRole).toBe('employee');
  });

  it('should return localStorage config for admin', () => {
    const config = getOptimalStorageConfig('admin');

    expect(config.type).toBe('localStorage');
    expect(config.persistentSessions).toBe(true);
    expect(config.userRole).toBe('employee');
  });

  it('should return localStorage config for guests (improved UX)', () => {
    const config = getOptimalStorageConfig('guest');

    expect(config.type).toBe('localStorage');
    expect(config.persistentSessions).toBe(true);
    expect(config.userRole).toBe('guest');
    expect(config.sessionTimeout).toBe(8 * 60 * 60 * 1000);
  });

  it('should default to guest config for unknown roles', () => {
    const config = getOptimalStorageConfig('unknown-role');

    expect(config.type).toBe('localStorage');
    expect(config.userRole).toBe('guest');
  });

  it('should default to guest config when no role provided', () => {
    const config = getOptimalStorageConfig();

    expect(config.type).toBe('localStorage');
    expect(config.userRole).toBe('guest');
  });

  describe('Security Requirements', () => {
    it('should enforce secure defaults', () => {
      const defaultConfig = getOptimalStorageConfig();

      // UX improvement: Default to localStorage for better user experience
      expect(defaultConfig.type).toBe('localStorage');
      expect(defaultConfig.persistentSessions).toBe(true);

      // Security requirement: Reasonable timeout (8 hours)
      expect(defaultConfig.sessionTimeout).toBeLessThanOrEqual(8 * 60 * 60 * 1000);
    });

    it('should provide longer sessions only for trusted roles', () => {
      const guestConfig = getOptimalStorageConfig('guest');
      const employeeConfig = getOptimalStorageConfig('employee');

      // Security requirement: Guests get shorter sessions
      expect(guestConfig.sessionTimeout).toBeLessThan(employeeConfig.sessionTimeout!);

      // UX improvement: Both get persistent storage, but employees get longer sessions
      expect(guestConfig.persistentSessions).toBe(true);
      expect(employeeConfig.persistentSessions).toBe(true);
    });
  });
});
