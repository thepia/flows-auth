/**
 * Session Migration Utilities
 * Provides secure migration of session data between storage types
 */

import type { SessionMigrationResult, StorageType, StorageConfigurationUpdate } from '../types';
import { getSession, saveSession, clearSession, isSessionValid, type FlowsSessionData } from './sessionManager';

/**
 * Session migration class for handling secure data transfers between storage types
 */
export class SessionMigrator {
  private static instance: SessionMigrator | null = null;
  private isInBrowser: boolean;

  constructor() {
    this.isInBrowser = typeof window !== 'undefined';
  }

  /**
   * Get singleton instance
   */
  static getInstance(): SessionMigrator {
    if (!SessionMigrator.instance) {
      SessionMigrator.instance = new SessionMigrator();
    }
    return SessionMigrator.instance;
  }

  /**
   * Migrate session data between storage types
   */
  async migrate(fromType: StorageType, toType: StorageType, options: {
    preserveTokens?: boolean;
    validateTokens?: boolean;
    performSecurityChecks?: boolean;
  } = {}): Promise<SessionMigrationResult> {
    const startTime = Date.now();
    
    const {
      preserveTokens = true,
      validateTokens = true,
      performSecurityChecks = true
    } = options;

    if (!this.isInBrowser) {
      return this.createFailureResult(fromType, toType, 'Not in browser environment');
    }

    // Short-circuit if no migration needed
    if (fromType === toType) {
      return {
        success: true,
        fromStorage: fromType,
        toStorage: toType,
        dataPreserved: true,
        tokensPreserved: true
      };
    }

    try {
      // Step 1: Get current session data
      const currentSession = getSession();
      if (!currentSession) {
        return this.createFailureResult(fromType, toType, 'No active session to migrate');
      }

      // Step 2: Validate tokens if requested
      if (validateTokens && !isSessionValid(currentSession)) {
        return this.createFailureResult(fromType, toType, 'Expired tokens cannot be migrated');
      }

      // Step 3: Security checks
      if (performSecurityChecks) {
        const securityResult = this.performSecurityChecks(currentSession, fromType, toType);
        if (!securityResult.allowed) {
          return this.createFailureResult(fromType, toType, securityResult.reason || 'Security check failed');
        }
      }

      // Step 4: Perform migration
      const migrationResult = await this.performMigration(currentSession, fromType, toType, preserveTokens);
      
      // Step 5: Performance check
      const duration = Date.now() - startTime;
      if (duration > 500) {
        console.warn(`⚠️ Session migration took ${duration}ms (requirement: <500ms)`);
      }

      // Step 6: Log successful migration
      this.logMigration(fromType, toType, true, duration);

      return {
        success: true,
        fromStorage: fromType,
        toStorage: toType,
        dataPreserved: true,
        tokensPreserved: preserveTokens,
        duration
      };
    } catch (error) {
      console.error('❌ Session migration failed:', error);
      
      // Cleanup on failure
      try {
        clearSession();
      } catch (clearError) {
        console.error('Failed to clear session after migration failure:', clearError);
      }

      const duration = Date.now() - startTime;
      this.logMigration(fromType, toType, false, duration, error instanceof Error ? error.message : 'Unknown error');

      return this.createFailureResult(
        fromType, 
        toType, 
        error instanceof Error ? error.message : 'Migration failed, sensitive data cleared'
      );
    }
  }

  /**
   * Perform security checks before migration
   */
  private performSecurityChecks(session: FlowsSessionData, fromType: StorageType, toType: StorageType): {
    allowed: boolean;
    reason?: string;
  } {
    const userRole = session.user.preferences?.role;

    // Prevent admin downgrades
    if (userRole === 'admin' && fromType === 'localStorage' && toType === 'sessionStorage') {
      return {
        allowed: false,
        reason: 'Admin sessions cannot be downgraded to sessionStorage'
      };
    }

    // Prevent suspicious role escalations
    if (toType === 'localStorage' && fromType === 'sessionStorage') {
      // This is generally allowed for employee upgrades, but log for audit
      console.log('🔒 Security check: Upgrading from sessionStorage to localStorage', {
        userRole,
        timestamp: new Date().toISOString()
      });
    }

    return { allowed: true };
  }

  /**
   * Perform the actual migration
   */
  private async performMigration(
    session: FlowsSessionData, 
    fromType: StorageType, 
    toType: StorageType,
    preserveTokens: boolean
  ): Promise<void> {
    // Create migrated session data
    const migratedSession: FlowsSessionData = {
      ...session,
      lastActivity: Date.now()
    };

    // Clear tokens if not preserving them
    if (!preserveTokens) {
      migratedSession.tokens = {
        accessToken: '',
        refreshToken: '',
        expiresAt: 0
      };
    }

    // Update storage configuration based on target type
    const { configureSessionStorage } = await import('./sessionManager');
    const newStorageConfig = {
      type: toType,
      userRole: session.user.preferences?.role || 'guest',
      sessionTimeout: toType === 'localStorage' ? 7 * 24 * 60 * 60 * 1000 : 8 * 60 * 60 * 1000,
      persistentSessions: toType === 'localStorage',
      migrateExistingSession: false // Prevent recursion
    };

    configureSessionStorage(newStorageConfig);

    // Save to new storage type
    saveSession(migratedSession);
  }

  /**
   * Create a failure result
   */
  private createFailureResult(
    fromType: StorageType, 
    toType: StorageType, 
    error: string
  ): SessionMigrationResult {
    return {
      success: false,
      fromStorage: fromType,
      toStorage: toType,
      dataPreserved: false,
      tokensPreserved: false,
      error
    };
  }

  /**
   * Log migration attempt
   */
  private logMigration(
    fromType: StorageType, 
    toType: StorageType, 
    success: boolean, 
    duration: number,
    error?: string
  ): void {
    const logLevel = success ? 'log' : 'error';
    const status = success ? 'SUCCESS' : 'FAILED';
    
    console[logLevel](`AUDIT: Session migration ${status}`, {
      timestamp: new Date().toISOString(),
      fromStorage: fromType,
      toStorage: toType,
      duration: `${duration}ms`,
      ...(error && { error })
    });
  }
}

/**
 * Utility function to get role-based storage configuration
 */
export function getRoleBasedStorageConfig(userRole: string): StorageConfigurationUpdate {
  const baseConfig = {
    migrateExistingSession: true,
    preserveTokens: true
  };

  switch (userRole) {
    case 'admin':
      return {
        ...baseConfig,
        type: 'localStorage',
        userRole: 'admin',
        sessionTimeout: 7 * 24 * 60 * 60 * 1000 // 7 days
      };
    
    case 'employee':
      return {
        ...baseConfig,
        type: 'localStorage',
        userRole: 'employee',
        sessionTimeout: 7 * 24 * 60 * 60 * 1000 // 7 days
      };
    
    case 'guest':
    default:
      return {
        ...baseConfig,
        type: 'sessionStorage',
        userRole: 'guest',
        sessionTimeout: 8 * 60 * 60 * 1000 // 8 hours
      };
  }
}

/**
 * Utility function to check if migration is needed
 */
export function shouldMigrateSession(currentRole: string, targetRole: string): boolean {
  const currentConfig = getRoleBasedStorageConfig(currentRole);
  const targetConfig = getRoleBasedStorageConfig(targetRole);
  
  return currentConfig.type !== targetConfig.type;
}

/**
 * Utility function to safely perform session migration
 */
export async function migrateSessionSafely(
  fromType: StorageType, 
  toType: StorageType,
  options?: {
    preserveTokens?: boolean;
    validateTokens?: boolean;
    performSecurityChecks?: boolean;
  }
): Promise<SessionMigrationResult> {
  const migrator = SessionMigrator.getInstance();
  return migrator.migrate(fromType, toType, options);
}

/**
 * Utility function for automatic role-based migration
 */
export async function migrateForRole(
  currentRole: string,
  targetRole: string,
  options?: {
    preserveTokens?: boolean;
    validateTokens?: boolean;
    performSecurityChecks?: boolean;
  }
): Promise<SessionMigrationResult> {
  if (!shouldMigrateSession(currentRole, targetRole)) {
    return {
      success: true,
      fromStorage: 'sessionStorage',
      toStorage: 'sessionStorage',
      dataPreserved: true,
      tokensPreserved: true
    };
  }

  const currentConfig = getRoleBasedStorageConfig(currentRole);
  const targetConfig = getRoleBasedStorageConfig(targetRole);
  
  return migrateSessionSafely(currentConfig.type, targetConfig.type, options);
}

// Export the main migrator for singleton access
export const sessionMigrator = SessionMigrator.getInstance();