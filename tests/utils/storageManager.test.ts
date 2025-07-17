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
    it('should default to sessionStorage', () => {
      const manager = new ConfigurableStorageManager();
      const config = manager.getConfig();
      
      expect(config.type).toBe('sessionStorage');
      expect(config.userRole).toBe('guest');
      expect(config.persistentSessions).toBe(false);
    });

    it('should use sessionStorage adapter by default', () => {
      const manager = new ConfigurableStorageManager();
      
      manager.setItem('test', 'value');
      expect(mockSessionStorage.setItem).toHaveBeenCalledWith('test', 'value');
      expect(mockLocalStorage.setItem).not.toHaveBeenCalled();
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
      mockSessionStorage.getItem.mockReturnValue('stored-value');
      
      const manager = new ConfigurableStorageManager();
      const result = manager.getItem('test-key');
      
      expect(mockSessionStorage.getItem).toHaveBeenCalledWith('test-key');
      expect(result).toBe('stored-value');
    });

    it('should handle removeItem operations', () => {
      const manager = new ConfigurableStorageManager();
      manager.removeItem('test-key');
      
      expect(mockSessionStorage.removeItem).toHaveBeenCalledWith('test-key');
    });

    it('should handle clear operations', () => {
      const manager = new ConfigurableStorageManager();
      manager.clear();
      
      expect(mockSessionStorage.clear).toHaveBeenCalled();
    });
  });

  describe('Configuration Updates', () => {
    it('should update configuration without changing adapter if type unchanged', () => {
      const manager = new ConfigurableStorageManager();
      
      manager.updateConfig({ sessionTimeout: 12 * 60 * 60 * 1000 });
      
      const config = manager.getConfig();
      expect(config.sessionTimeout).toBe(12 * 60 * 60 * 1000);
      expect(config.type).toBe('sessionStorage');
    });

    it('should create new adapter when storage type changes', () => {
      const manager = new ConfigurableStorageManager();
      
      // Start with sessionStorage
      manager.setItem('test1', 'value1');
      expect(mockSessionStorage.setItem).toHaveBeenCalledWith('test1', 'value1');
      
      // Switch to localStorage
      manager.updateConfig({ type: 'localStorage' });
      manager.setItem('test2', 'value2');
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('test2', 'value2');
    });
  });

  describe('Utility Methods', () => {
    it('should correctly identify persistent session support', () => {
      const sessionManager = new ConfigurableStorageManager({ type: 'sessionStorage' });
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

  it('should return sessionStorage config for guests', () => {
    const config = getOptimalStorageConfig('guest');

    expect(config.type).toBe('sessionStorage');
    expect(config.persistentSessions).toBe(false);
    expect(config.userRole).toBe('guest');
    expect(config.sessionTimeout).toBe(8 * 60 * 60 * 1000);
  });

  it('should default to guest config for unknown roles', () => {
    const config = getOptimalStorageConfig('unknown-role');

    expect(config.type).toBe('sessionStorage');
    expect(config.userRole).toBe('guest');
  });

  it('should default to guest config when no role provided', () => {
    const config = getOptimalStorageConfig();

    expect(config.type).toBe('sessionStorage');
    expect(config.userRole).toBe('guest');
  });

  describe('Security Requirements', () => {
    it('should enforce secure defaults', () => {
      const defaultConfig = getOptimalStorageConfig();

      // Security requirement: Default to sessionStorage
      expect(defaultConfig.type).toBe('sessionStorage');
      expect(defaultConfig.persistentSessions).toBe(false);

      // Security requirement: Reasonable timeout
      expect(defaultConfig.sessionTimeout).toBeLessThanOrEqual(8 * 60 * 60 * 1000);
    });

    it('should provide longer sessions only for trusted roles', () => {
      const guestConfig = getOptimalStorageConfig('guest');
      const employeeConfig = getOptimalStorageConfig('employee');

      // Security requirement: Guests get shorter sessions
      expect(guestConfig.sessionTimeout).toBeLessThan(employeeConfig.sessionTimeout!);

      // Security requirement: Only employees get persistent storage
      expect(guestConfig.persistentSessions).toBe(false);
      expect(employeeConfig.persistentSessions).toBe(true);
    });
  });
});
