/**
 * Configurable Storage Manager for flows-auth
 * 
 * Supports both sessionStorage and localStorage based on configuration.
 * Default is sessionStorage for security, but can be configured for 
 * long-running employee sessions.
 */

import type { StorageConfig } from '../types';

export interface StorageAdapter {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
  clear(): void;
}

class SessionStorageAdapter implements StorageAdapter {
  getItem(key: string): string | null {
    try {
      return sessionStorage.getItem(key);
    } catch (error) {
      console.warn('Failed to read from sessionStorage:', error);
      return null;
    }
  }

  setItem(key: string, value: string): void {
    try {
      sessionStorage.setItem(key, value);
    } catch (error) {
      console.warn('Failed to write to sessionStorage:', error);
    }
  }

  removeItem(key: string): void {
    try {
      sessionStorage.removeItem(key);
    } catch (error) {
      console.warn('Failed to remove from sessionStorage:', error);
    }
  }

  clear(): void {
    try {
      sessionStorage.clear();
    } catch (error) {
      console.warn('Failed to clear sessionStorage:', error);
    }
  }
}

class LocalStorageAdapter implements StorageAdapter {
  getItem(key: string): string | null {
    try {
      return localStorage.getItem(key);
    } catch (error) {
      console.warn('Failed to read from localStorage:', error);
      return null;
    }
  }

  setItem(key: string, value: string): void {
    try {
      localStorage.setItem(key, value);
    } catch (error) {
      console.warn('Failed to write to localStorage:', error);
    }
  }

  removeItem(key: string): void {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.warn('Failed to remove from localStorage:', error);
    }
  }

  clear(): void {
    try {
      localStorage.clear();
    } catch (error) {
      console.warn('Failed to clear localStorage:', error);
    }
  }
}

export class ConfigurableStorageManager {
  private adapter: StorageAdapter;
  private config: StorageConfig;

  constructor(config?: StorageConfig) {
    this.config = this.getDefaultConfig(config);
    this.adapter = this.createAdapter();
    
    console.log('🗄️ Storage manager initialized:', {
      type: this.config.type,
      sessionTimeout: this.config.sessionTimeout,
      persistentSessions: this.config.persistentSessions,
      userRole: this.config.userRole
    });
  }

  private getDefaultConfig(config?: StorageConfig): StorageConfig {
    const defaults: StorageConfig = {
      type: 'localStorage',
      sessionTimeout: 24 * 60 * 60 * 1000, // 24 hours
      persistentSessions: true,
      userRole: 'guest'
    };

    if (!config) return defaults;

    // Auto-configure based on user role if not explicitly set
    if (config.userRole === 'employee' && config.type === undefined) {
      return {
        ...defaults,
        ...config,
        type: 'localStorage', // Employees get persistent sessions by default
        persistentSessions: true,
        sessionTimeout: 7 * 24 * 60 * 60 * 1000 // 7 days for employees
      };
    }

    return { ...defaults, ...config };
  }

  private createAdapter(): StorageAdapter {
    if (typeof window === 'undefined') {
      // SSR fallback - return a no-op adapter
      return {
        getItem: () => null,
        setItem: () => {},
        removeItem: () => {},
        clear: () => {}
      };
    }

    switch (this.config.type) {
      case 'localStorage':
        return new LocalStorageAdapter();
      case 'sessionStorage':
      default:
        return new SessionStorageAdapter();
    }
  }

  /**
   * Get item from configured storage
   */
  getItem(key: string): string | null {
    return this.adapter.getItem(key);
  }

  /**
   * Set item in configured storage
   */
  setItem(key: string, value: string): void {
    this.adapter.setItem(key, value);
  }

  /**
   * Remove item from configured storage
   */
  removeItem(key: string): void {
    this.adapter.removeItem(key);
  }

  /**
   * Clear all items from configured storage
   */
  clear(): void {
    this.adapter.clear();
  }

  /**
   * Get storage configuration
   */
  getConfig(): StorageConfig {
    return { ...this.config };
  }

  /**
   * Update storage configuration (creates new adapter if type changed)
   */
  updateConfig(newConfig: Partial<StorageConfig>): void {
    const oldType = this.config.type;
    this.config = { ...this.config, ...newConfig };
    
    // If storage type changed, create new adapter
    if (this.config.type !== oldType) {
      this.adapter = this.createAdapter();
      console.log('🔄 Storage adapter changed:', oldType, '->', this.config.type);
    }
  }

  /**
   * Check if current storage supports persistent sessions
   */
  supportsPersistentSessions(): boolean {
    return this.config.type === 'localStorage' || this.config.persistentSessions === true;
  }

  /**
   * Get session timeout in milliseconds
   */
  getSessionTimeout(): number {
    return this.config.sessionTimeout || 24 * 60 * 60 * 1000;
  }
}

// Global storage manager instance
let globalStorageManager: ConfigurableStorageManager | null = null;

/**
 * Initialize global storage manager with configuration
 */
export function initializeStorageManager(config?: StorageConfig): ConfigurableStorageManager {
  globalStorageManager = new ConfigurableStorageManager(config);
  return globalStorageManager;
}

/**
 * Get global storage manager instance
 */
export function getStorageManager(): ConfigurableStorageManager {
  if (!globalStorageManager) {
    globalStorageManager = new ConfigurableStorageManager();
  }
  return globalStorageManager;
}

/**
 * Helper function to determine optimal storage config based on user context
 */
export function getOptimalStorageConfig(userRole?: string, domain?: string): StorageConfig {
  // Employee users get persistent sessions
  if (userRole === 'employee' || userRole === 'staff' || userRole === 'admin') {
    return {
      type: 'localStorage',
      persistentSessions: true,
      sessionTimeout: 7 * 24 * 60 * 60 * 1000, // 7 days
      userRole: 'employee'
    };
  }

  // Default to localStorage for better UX (users can open new tabs)
  // Note: This provides better user experience while maintaining security through timeouts
  return {
    type: 'localStorage',
    persistentSessions: true,
    sessionTimeout: 8 * 60 * 60 * 1000, // 8 hours
    userRole: 'guest'
  };
}
