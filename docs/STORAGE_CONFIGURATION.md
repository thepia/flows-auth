# Storage Configuration

flows-auth supports configurable storage strategies to balance security and user experience based on user roles and requirements.

## Overview

By default, flows-auth uses `sessionStorage` for security - sessions are cleared when the browser tab is closed. However, for employee users or long-running applications, you can configure `localStorage` for persistent sessions.

## Configuration Options

### StorageConfig Interface

```typescript
interface StorageConfig {
  type: 'sessionStorage' | 'localStorage';
  sessionTimeout?: number; // in milliseconds
  persistentSessions?: boolean; // if true, use localStorage for long-running sessions
  userRole?: 'employee' | 'guest' | 'admin'; // determines storage strategy
}
```

### Default Behavior

- **Guest users**: `sessionStorage` with 8-hour timeout
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
  // storage config is optional - defaults to sessionStorage
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

### sessionStorage (Default)
- ✅ **More secure**: Sessions cleared when tab closes
- ✅ **Privacy-friendly**: No persistent tracking
- ❌ **Less convenient**: Users must re-authenticate frequently

### localStorage (Employee Mode)
- ✅ **More convenient**: Sessions persist across browser restarts
- ✅ **Better UX**: Fewer authentication prompts
- ❌ **Less secure**: Sessions persist until explicitly cleared
- ❌ **Privacy concerns**: Longer data retention

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

  // Default to secure sessionStorage for guests
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
    type: isDevelopment ? 'localStorage' : 'sessionStorage',
    sessionTimeout: isDevelopment ? 24 * 60 * 60 * 1000 : 8 * 60 * 60 * 1000,
    userRole: 'guest'
  }
});
```

### 3. Dynamic Configuration Based on User Context

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
3. **Backward compatible** - defaults to previous sessionStorage behavior

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
