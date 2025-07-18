# Storage Configuration

flows-auth supports configurable storage strategies to balance security and user experience based on user roles and requirements.

## Overview

By default, flows-auth uses `localStorage` for better user experience - sessions persist across browser tabs and restarts. This provides improved UX while maintaining security through session timeouts. The system supports dynamic role-based configuration to upgrade to longer sessions for employee users.

## ⚠️ Architectural Update: Dynamic Role-Based Configuration

### **Problem: Chicken-and-Egg Role Assignment**

The original implementation had a logical flaw where user roles were predetermined before authentication:

```typescript
// ❌ PROBLEMATIC: How do we know they're an employee before auth?
configureSessionStorage({
  userRole: 'employee', // This requires prior knowledge
  sessionTimeout: 7 * 24 * 60 * 60 * 1000
});
```

### **Solution: Conservative Defaults with Dynamic Upgrades**

The new architecture follows a **security-first approach**:

1. **Start Conservative**: Always begin with guest-level security (8 hours, sessionStorage)
2. **Authenticate First**: Let the user prove their identity
3. **Extract Role**: Get the actual user role from the authentication response
4. **Upgrade Storage**: Migrate to appropriate storage configuration based on verified role
5. **Preserve Session**: Maintain session continuity during the upgrade

```typescript
// ✅ SECURE: Start with conservative defaults
configureSessionStorage({
  type: 'sessionStorage',
  userRole: 'guest',
  sessionTimeout: 8 * 60 * 60 * 1000 // 8 hours
});

// ✅ AFTER AUTHENTICATION: Upgrade based on verified role
authStore.subscribe(($auth) => {
  if ($auth.isAuthenticated && $auth.user) {
    const verifiedRole = $auth.user.metadata?.role;
    
    if (verifiedRole === 'employee') {
      // Upgrade to employee configuration with session migration
      authStore.updateStorageConfiguration({
        type: 'localStorage',
        userRole: 'employee',
        sessionTimeout: 7 * 24 * 60 * 60 * 1000,
        migrateExistingSession: true
      });
    }
  }
});
```

## Configuration Options

### StorageConfig Interface

```typescript
interface StorageConfig {
  type: 'sessionStorage' | 'localStorage';
  sessionTimeout?: number; // in milliseconds
  persistentSessions?: boolean; // if true, use localStorage for long-running sessions
  userRole?: 'employee' | 'guest' | 'admin'; // determines storage strategy
  migrateExistingSession?: boolean; // if true, migrate current session to new storage type
}
```

### ApplicationContext Interface (New)

```typescript
interface ApplicationContext {
  // Domain-based hints
  domain?: string; // e.g., 'internal.company.com' suggests all users are employees
  
  // URL-based hints  
  urlPath?: string; // e.g., '/admin/login' suggests admin users
  
  // Application-level hints
  userType?: 'all_employees' | 'all_guests' | 'mixed'; // Corporate intranet vs public site
  
  // Security override
  forceGuestMode?: boolean; // Always start with guest settings for security
}
```

### StorageConfigurationUpdate Interface (New)

```typescript
interface StorageConfigurationUpdate {
  type: 'sessionStorage' | 'localStorage';
  userRole: 'employee' | 'guest' | 'admin';
  sessionTimeout: number;
  migrateExistingSession: boolean;
  preserveTokens: boolean;
}
```

### Default Behavior

- **Guest users**: `localStorage` with 8-hour timeout (improved UX for cross-tab authentication)
- **Employee users**: `localStorage` with 7-day timeout
- **Admin users**: `localStorage` with 7-day timeout

## Usage Examples

### Basic Configuration

```typescript
import { createAuthStore } from '@thepia/flows-auth';

// Default configuration (sessionStorage)
const authStore = createAuthStore({
  apiBaseUrl: 'https://api.thepia.com',
  clientId: 'my-app',
  domain: 'thepia.net',
  enablePasskeys: true,
  enableMagicLinks: true,
  // storage config is optional - defaults to localStorage
});
```

### Employee Configuration (Persistent Sessions)

```typescript
const authStore = createAuthStore({
  apiBaseUrl: 'https://api.thepia.com',
  clientId: 'employee-portal',
  domain: 'thepia.net',
  enablePasskeys: true,
  enableMagicLinks: true,
  storage: {
    type: 'localStorage',
    sessionTimeout: 7 * 24 * 60 * 60 * 1000, // 7 days
    persistentSessions: true,
    userRole: 'employee'
  }
});
```

### Auto-Configuration by User Role

```typescript
import { getOptimalSessionConfig } from '@thepia/flows-auth';

// Automatically configure based on user role
const storageConfig = getOptimalSessionConfig('employee');

const authStore = createAuthStore({
  apiBaseUrl: 'https://api.thepia.com',
  clientId: 'my-app',
  domain: 'thepia.net',
  enablePasskeys: true,
  enableMagicLinks: true,
  storage: storageConfig
});
```

### Runtime Configuration

```typescript
import { configureSessionStorage, getStorageConfig } from '@thepia/flows-auth';

// Configure storage at runtime
configureSessionStorage({
  type: 'localStorage',
  sessionTimeout: 24 * 60 * 60 * 1000, // 24 hours
  userRole: 'employee'
});

// Check current configuration
const currentConfig = getStorageConfig();
console.log('Current storage:', currentConfig.type);
```

## Security Considerations

### localStorage (Default)
- ✅ **Better UX**: Sessions persist across browser tabs and restarts
- ✅ **Cross-tab authentication**: Users can open multiple tabs without re-authentication
- ✅ **Security through timeouts**: Sessions expire after configured timeouts (8 hours for guests, 7 days for employees)
- ❌ **Longer persistence**: Sessions persist until explicitly cleared or timeout

### sessionStorage (Optional)
- ✅ **More secure**: Sessions cleared when tab closes
- ✅ **Privacy-friendly**: No persistent tracking
- ❌ **Less convenient**: Users must re-authenticate frequently
- ❌ **No cross-tab support**: Each tab requires separate authentication

## Best Practices

### 1. Role-Based Configuration

```typescript
function getAuthConfig(userRole: string) {
  const baseConfig = {
    apiBaseUrl: 'https://api.thepia.com',
    clientId: 'my-app',
    domain: 'thepia.net',
    enablePasskeys: true,
    enableMagicLinks: true,
  };

  if (userRole === 'employee' || userRole === 'admin') {
    return {
      ...baseConfig,
      storage: {
        type: 'localStorage' as const,
        sessionTimeout: 7 * 24 * 60 * 60 * 1000, // 7 days
        persistentSessions: true,
        userRole: userRole as 'employee' | 'admin'
      }
    };
  }

  // Default to localStorage for better UX
  return baseConfig;
}
```

### 2. Environment-Based Configuration

```typescript
const isDevelopment = process.env.NODE_ENV === 'development';

const authStore = createAuthStore({
  apiBaseUrl: 'https://api.thepia.com',
  clientId: 'my-app',
  domain: 'thepia.net',
  enablePasskeys: true,
  enableMagicLinks: true,
  storage: {
    type: 'localStorage', // Default is now localStorage for better UX
    sessionTimeout: isDevelopment ? 24 * 60 * 60 * 1000 : 8 * 60 * 60 * 1000,
    userRole: 'guest'
  }
});
```

### 3. Session Migration Between Storage Types

When a user's role changes (e.g., guest authenticates as employee), the session data must be migrated to the appropriate storage type:

```typescript
// Example: Guest user authenticates as employee
authStore.subscribe(($auth) => {
  if ($auth.isAuthenticated && $auth.user) {
    const verifiedRole = $auth.user.metadata?.role;
    
    if (verifiedRole === 'employee') {
      // This will automatically migrate the session
      authStore.updateStorageConfiguration({
        type: 'localStorage',
        userRole: 'employee',
        sessionTimeout: 7 * 24 * 60 * 60 * 1000,
        migrateExistingSession: true, // Preserves current session
        preserveTokens: true // Maintains access tokens
      });
    }
  }
});
```

### 4. Application Context Hints

For applications that can provide hints about user types:

```typescript
import { createAuthStore } from '@thepia/flows-auth';

// Corporate intranet - all users are employees
const authStore = createAuthStore({
  // ... other config
  applicationContext: {
    userType: 'all_employees',
    domain: 'internal.company.com'
  }
});

// Public website - mixed user types
const authStore = createAuthStore({
  // ... other config  
  applicationContext: {
    userType: 'mixed',
    forceGuestMode: true // Always start conservative
  }
});
```

### 5. Dynamic Configuration Based on User Context

```typescript
// After user authentication, update storage strategy
authStore.subscribe(($auth) => {
  if ($auth.isAuthenticated && $auth.user) {
    const userRole = $auth.user.metadata?.role;
    
    if (userRole === 'employee') {
      configureSessionStorage({
        type: 'localStorage',
        sessionTimeout: 7 * 24 * 60 * 60 * 1000,
        persistentSessions: true,
        userRole: 'employee'
      });
    }
  }
});
```

## API Reference

### Configuration Functions

- `configureSessionStorage(config: StorageConfig)` - Configure storage strategy
- `getOptimalSessionConfig(userRole?: string, domain?: string)` - Get optimal config for user role
- `getStorageConfig()` - Get current storage configuration
- `supportsPersistentSessions()` - Check if current storage supports persistence

### New Auth Store Methods

- `updateStorageConfiguration(update: StorageConfigurationUpdate)` - Dynamically update storage configuration
- `migrateSession(fromType: StorageType, toType: StorageType)` - Migrate session between storage types
- `getApplicationContext()` - Get current application context hints

### Storage Types

- `sessionStorage` - Browser session storage (cleared on tab close)
- `localStorage` - Browser local storage (persists until cleared)

### Session Timeouts

- **Guest users**: 8 hours (default)
- **Employee users**: 7 days (recommended)
- **Custom**: Any value in milliseconds

## Migration Guide

If you're upgrading from a version that only supported sessionStorage:

1. **No breaking changes** - existing code continues to work
2. **Optional configuration** - storage config is entirely optional
3. **Improved UX** - defaults to localStorage for better user experience

```typescript
// Before (still works)
const authStore = createAuthStore({
  apiBaseUrl: 'https://api.thepia.com',
  clientId: 'my-app',
  // ... other config
});

// After (with new storage options)
const authStore = createAuthStore({
  apiBaseUrl: 'https://api.thepia.com',
  clientId: 'my-app',
  // ... other config
  storage: {
    type: 'localStorage', // NEW: configurable storage
    userRole: 'employee'  // NEW: role-based configuration
  }
});
```
