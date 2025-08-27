import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ConfigurableStorageManager, getOptimalStorageConfig } from '../../src/utils/storageManager';
import type { StorageConfig } from '../../src/types';

describe('ConfigurableStorageManager', () => {
  let mockLocalStorage: any;
  let mockSessionStorage: any;
  
  beforeEach(() => {
    // Mock localStorage
    mockLocalStorage = {
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn()
    };
    
    // Mock sessionStorage
    mockSessionStorage = {
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn()
    };
    
    // Replace global storage objects
    Object.defineProperty(window, 'localStorage', { value: mockLocalStorage, writable: true });
    Object.defineProperty(window, 'sessionStorage', { value: mockSessionStorage, writable: true });
    
    // Mock console to suppress logs in tests
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });
  
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Default Configuration', () => {
    it('should default to sessionStorage for security', () => {
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
      const manager = new ConfigurableStorageManager({ userRole: 'employee' });
      const config = manager.getConfig();
      
      expect(config.type).toBe('localStorage');
      expect(config.userRole).toBe('employee');
      expect(config.persistentSessions).toBe(true);
      expect(config.sessionTimeout).toBe(7 * 24 * 60 * 60 * 1000); // 7 days
    });

    it('should use localStorage adapter for employees', () => {
      const manager = new ConfigurableStorageManager({ userRole: 'employee' });
      
      manager.setItem('test', 'value');
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('test', 'value');
      expect(mockSessionStorage.setItem).not.toHaveBeenCalled();
    });
  });

  describe('Explicit Configuration', () => {
    it('should respect explicit localStorage configuration', () => {
      const config: StorageConfig = {
        type: 'localStorage',
        sessionTimeout: 24 * 60 * 60 * 1000,
        persistentSessions: false,
        userRole: 'guest'
      };
      
      const manager = new ConfigurableStorageManager(config);
      const resultConfig = manager.getConfig();
      
      expect(resultConfig.type).toBe('localStorage');
      expect(resultConfig.sessionTimeout).toBe(24 * 60 * 60 * 1000);
      expect(resultConfig.persistentSessions).toBe(false);
    });

    it('should respect explicit sessionStorage configuration', () => {
      const config: StorageConfig = {
        type: 'sessionStorage',
        userRole: 'employee' // Even with employee role, explicit type takes precedence
      };
      
      const manager = new ConfigurableStorageManager(config);
      const resultConfig = manager.getConfig();
      
      expect(resultConfig.type).toBe('sessionStorage');
      expect(resultConfig.userRole).toBe('employee');
    });
  });

  describe('Storage Operations', () => {
    it('should handle getItem operations', () => {
      const manager = new ConfigurableStorageManager();
      mockSessionStorage.getItem.mockReturnValue('stored-value');
      
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
      
      // Start with sessionStorage (default)
      manager.setItem('test1', 'value1');
      expect(mockSessionStorage.setItem).toHaveBeenCalledWith('test1', 'value1');
      
      // Switch to localStorage
      manager.updateConfig({ type: 'localStorage' });
      
      manager.setItem('test2', 'value2');
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('test2', 'value2');
    });

    it('should handle dynamic role changes from guest to employee', () => {
      const manager = new ConfigurableStorageManager({ userRole: 'guest' });
      
      // Start as guest with sessionStorage (default)
      expect(manager.getConfig().type).toBe('sessionStorage');
      expect(manager.getConfig().userRole).toBe('guest');
      
      // Upgrade to employee configuration
      // Note: updateConfig doesn't auto-upgrade storage type, only updates specified fields
      manager.updateConfig({ 
        userRole: 'employee',
        type: 'localStorage',
        persistentSessions: true,
        sessionTimeout: 7 * 24 * 60 * 60 * 1000
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
      expect(config.type).toBe('localStorage'); // Stays localStorage once upgraded
      expect(config.sessionTimeout).toBe(8 * 60 * 60 * 1000);
    });
  });

  describe('Utility Methods', () => {
    it('should correctly identify persistent session support', () => {
      const sessionManager = new ConfigurableStorageManager({ 
        type: 'sessionStorage',
        persistentSessions: false 
      });
      
      const localManager = new ConfigurableStorageManager({ 
        type: 'localStorage',
        persistentSessions: false 
      });
      
      expect(sessionManager.supportsPersistentSessions()).toBe(false);
      expect(localManager.supportsPersistentSessions()).toBe(true); // localStorage always supports persistent sessions
    });

    it('should return correct session timeout', () => {
      const manager = new ConfigurableStorageManager({ 
        sessionTimeout: 6 * 60 * 60 * 1000 
      });
      
      expect(manager.getSessionTimeout()).toBe(6 * 60 * 60 * 1000);
    });
  });
});

describe('getOptimalStorageConfig', () => {
  it('should return employee configuration for employee roles', () => {
    const config = getOptimalStorageConfig('employee');
    
    expect(config.type).toBe('localStorage');
    expect(config.persistentSessions).toBe(true);
    expect(config.sessionTimeout).toBe(7 * 24 * 60 * 60 * 1000);
    expect(config.userRole).toBe('employee');
  });

  it('should return employee configuration for staff roles', () => {
    const config = getOptimalStorageConfig('staff');
    
    expect(config.type).toBe('localStorage');
    expect(config.persistentSessions).toBe(true);
    expect(config.userRole).toBe('employee');
  });

  it('should return employee configuration for admin roles', () => {
    const config = getOptimalStorageConfig('admin');
    
    expect(config.type).toBe('localStorage');
    expect(config.persistentSessions).toBe(true);
    expect(config.userRole).toBe('employee');
  });

  it('should return guest configuration for unknown roles', () => {
    const config = getOptimalStorageConfig('visitor');
    
    expect(config.type).toBe('localStorage'); // Default is localStorage for persistence
    expect(config.persistentSessions).toBe(true);
    expect(config.sessionTimeout).toBe(8 * 60 * 60 * 1000);
    expect(config.userRole).toBe('guest');
  });

  it('should return guest configuration when no role provided', () => {
    const config = getOptimalStorageConfig();
    
    expect(config.type).toBe('localStorage'); // Default is localStorage for persistence
    expect(config.persistentSessions).toBe(true);
    expect(config.userRole).toBe('guest');
  });

  it('should handle thepia.com domain for employees', () => {
    const config = getOptimalStorageConfig('employee', 'thepia.com');
    
    expect(config.type).toBe('localStorage');
    expect(config.persistentSessions).toBe(true);
    expect(config.userRole).toBe('employee');
  });

  it('should handle thepia.net domain for guests', () => {
    const config = getOptimalStorageConfig('guest', 'thepia.net');
    
    expect(config.type).toBe('localStorage'); // Default is localStorage for persistence
    expect(config.persistentSessions).toBe(true);
    expect(config.userRole).toBe('guest');
  });
});