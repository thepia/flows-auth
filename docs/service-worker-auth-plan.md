# Service Worker Auth Architecture Plan

## Overview

This document outlines the plan for transitioning from client-side sessionStorage/localStorage auth management to a **Service Worker-controlled authentication system** with **IndexedDB** for secure, persistent session management.

## Current Architecture vs. Proposed Architecture

### Current (Singleton Store)
```
Browser Tab → Singleton Auth Store → sessionStorage/localStorage → API Server
     ↑                                       ↓
     └─────────── Direct API calls ──────────┘
```

### Proposed (Service Worker + IndexedDB)
```
Browser Tab → Message Channel → Service Worker → IndexedDB
     ↑                                ↓
     └─────── Intercepted Fetch ──────┘
                     ↓
               API Server (with token injection)
```

## Benefits of Service Worker Architecture

### 1. **Cross-Tab Consistency**
- **Current Issue**: Multiple tabs can have inconsistent auth state
- **Solution**: Service Worker manages single source of truth in IndexedDB
- **Benefit**: Real-time auth state synchronization across all tabs

### 2. **Automatic Token Management**
- **Current Issue**: Each request requires manual token injection
- **Solution**: Service Worker intercepts all API calls and automatically injects tokens
- **Benefit**: Zero client-side token management required

### 3. **Background Refresh**
- **Current Issue**: Token refresh only happens during active user interaction
- **Solution**: Service Worker can refresh tokens in background before expiration
- **Benefit**: Seamless user experience with no auth interruptions

### 4. **Offline Capability**
- **Current Issue**: No authentication possible when offline
- **Solution**: Service Worker can cache authentication state and provide offline auth checking
- **Benefit**: App remains partially functional offline

### 5. **Enhanced Security**
- **Current Issue**: Tokens accessible to any script on the page
- **Solution**: IndexedDB with restricted access patterns, tokens never exposed to main thread
- **Benefit**: Reduced XSS attack surface

## Implementation Plan

### Phase 1: Service Worker Foundation

#### 1.1 Create Service Worker Infrastructure
```typescript
// src/workers/auth-service-worker.ts
class AuthServiceWorker {
  private indexedDB: AuthIndexedDB;
  private messageChannel: MessageChannel;
  
  async handleAuthMessage(message: AuthMessage): Promise<AuthResponse> {
    // Handle auth operations from main thread
  }
  
  async interceptFetch(request: Request): Promise<Response> {
    // Auto-inject auth tokens into API requests
  }
}
```

#### 1.2 IndexedDB Schema Design
```typescript
// IndexedDB Schema
interface AuthDatabase {
  sessions: {
    id: 'current';
    accessToken: string;
    refreshToken: string;
    expiresAt: number;
    user: User;
    lastRefresh: number;
  };
  
  config: {
    id: 'current';
    apiBaseUrl: string;
    clientId: string;
    domain: string;
    enablePasskeys: boolean;
    enableMagicLinks: boolean;
  };
  
  // Encrypted storage for sensitive data
  credentials: {
    id: string;
    encryptedData: string;
    salt: string;
    iv: string;
  };
}
```

#### 1.3 Message Protocol Design
```typescript
// Communication protocol between main thread and service worker
type AuthMessage = 
  | { type: 'INITIALIZE'; config: AuthConfig }
  | { type: 'SIGN_IN'; email: string; method: AuthMethod }
  | { type: 'SIGN_OUT' }
  | { type: 'GET_SESSION' }
  | { type: 'REFRESH_TOKEN' }
  | { type: 'SUBSCRIBE_STATE_CHANGES' };

type AuthResponse = 
  | { type: 'AUTH_SUCCESS'; session: SessionData }
  | { type: 'AUTH_ERROR'; error: AuthError }
  | { type: 'STATE_CHANGE'; state: AuthState; user?: User };
```

### Phase 2: Client Integration

#### 2.1 Service Worker Client
```typescript
// src/utils/service-worker-client.ts
export class ServiceWorkerAuthClient {
  private worker: ServiceWorker;
  private messageChannel: MessageChannel;
  
  async initialize(config: AuthConfig): Promise<void> {
    // Register and initialize service worker
  }
  
  async signIn(email: string, method: AuthMethod): Promise<AuthResponse> {
    // Delegate to service worker
  }
  
  // Subscribe to auth state changes via message channel
  subscribeToAuthState(callback: (state: AuthState) => void): UnsubscribeFunction {
    // Real-time state updates from service worker
  }
}
```

#### 2.2 Updated Singleton Store
```typescript
// src/stores/service-worker-auth-store.ts
export function createServiceWorkerAuthStore(config: AuthConfig) {
  const swClient = new ServiceWorkerAuthClient();
  
  // Svelte store that proxies to service worker
  const { subscribe, set, update } = writable<AuthState>({
    state: 'loading',
    user: null,
    error: null
  });
  
  // Initialize service worker and sync state
  swClient.initialize(config).then(() => {
    swClient.subscribeToAuthState((state) => set(state));
  });
  
  return {
    subscribe,
    signIn: (email: string, method: AuthMethod) => swClient.signIn(email, method),
    signOut: () => swClient.signOut(),
    // All methods delegate to service worker
  };
}
```

### Phase 3: Advanced Features

#### 3.1 Background Token Refresh
```typescript
// Service worker automatically refreshes tokens
class TokenManager {
  private refreshTimer: number;
  
  scheduleTokenRefresh(expiresAt: number): void {
    // Schedule refresh 5 minutes before expiration
    const refreshTime = expiresAt - (5 * 60 * 1000);
    
    this.refreshTimer = setTimeout(() => {
      this.refreshToken();
    }, refreshTime - Date.now());
  }
  
  async refreshToken(): Promise<void> {
    // Background refresh with retry logic
  }
}
```

#### 3.2 Cross-Tab State Sync
```typescript
// Service worker broadcasts state changes to all tabs
class StateBroadcaster {
  private clients: Set<WindowClient> = new Set();
  
  async broadcastStateChange(newState: AuthState): Promise<void> {
    const allClients = await self.clients.matchAll();
    
    for (const client of allClients) {
      client.postMessage({
        type: 'AUTH_STATE_CHANGE',
        state: newState
      });
    }
  }
}
```

#### 3.3 Offline Auth Checking
```typescript
// Service worker provides offline auth verification
class OfflineAuthManager {
  async isAuthenticated(): Promise<boolean> {
    const session = await this.indexedDB.getSession();
    
    if (!session) return false;
    
    // Check if token is expired (with some buffer)
    const now = Date.now();
    const bufferTime = 5 * 60 * 1000; // 5 minutes
    
    return session.expiresAt > (now + bufferTime);
  }
}
```

## Migration Strategy

### Step 1: Parallel Implementation
- Implement service worker alongside current singleton store
- Add feature flag to switch between implementations
- Test extensively in development

### Step 2: Gradual Rollout
- Start with new projects using service worker approach
- Migrate existing projects one by one
- Maintain backward compatibility

### Step 3: Full Migration
- Remove old localStorage/sessionStorage implementation
- Service worker becomes the default and only implementation
- Update all documentation

## API Changes Required

### New Public API
```typescript
// Enhanced singleton store with service worker
export function createServiceWorkerAuthStore(config: AuthConfig): ServiceWorkerAuthStore;

// Utility to check service worker support
export function isServiceWorkerSupported(): boolean;

// Migration utility
export function migrateToServiceWorker(config: AuthConfig): Promise<void>;

// Service worker registration
export function registerAuthServiceWorker(): Promise<ServiceWorkerRegistration>;
```

### Backward Compatibility
```typescript
// Keep existing API, but internally use service worker
export function initializeAuth(config: AuthConfig): SvelteAuthStore {
  if (isServiceWorkerSupported()) {
    return createServiceWorkerAuthStore(config);
  } else {
    // Fallback to current implementation
    return createAuthStore(config);
  }
}
```

## Security Considerations

### 1. IndexedDB Encryption
- Encrypt sensitive data before storing in IndexedDB
- Use Web Crypto API for encryption/decryption
- Derive encryption keys from user context (not stored)

### 2. Service Worker Security
- Strict Content Security Policy for service worker
- Validate all messages from main thread
- Implement request origin validation

### 3. Token Handling
- Never expose raw tokens to main thread
- Use opaque handles or encrypted tokens for client communication
- Implement secure token rotation

## Performance Considerations

### 1. Service Worker Startup
- Lazy load service worker only when needed
- Cache frequently used auth operations
- Minimize service worker bundle size

### 2. IndexedDB Performance
- Use efficient indexing for session lookups
- Implement data cleanup for old sessions
- Batch database operations when possible

### 3. Message Passing Overhead
- Use structured cloning efficiently
- Minimize message size
- Implement message queuing for reliability

## Testing Strategy

### 1. Service Worker Testing
- Mock service worker environment for unit tests
- Test message passing protocols
- Verify fetch interception

### 2. IndexedDB Testing
- Use fake-indexeddb for unit tests
- Test data persistence across sessions
- Verify encryption/decryption

### 3. Integration Testing
- Test cross-tab synchronization
- Verify offline functionality
- Test migration scenarios

## Timeline

### Phase 1: Foundation (2-3 weeks)
- [ ] Service worker infrastructure
- [ ] IndexedDB schema and operations
- [ ] Message protocol implementation

### Phase 2: Integration (2-3 weeks)
- [ ] Client-side service worker integration
- [ ] Updated singleton store implementation
- [ ] Basic auth operations working

### Phase 3: Advanced Features (3-4 weeks)
- [ ] Background token refresh
- [ ] Cross-tab synchronization
- [ ] Offline capabilities
- [ ] Security hardening

### Phase 4: Migration & Documentation (1-2 weeks)
- [ ] Migration utilities
- [ ] Updated documentation
- [ ] Examples and demos

## Future Enhancements

### 1. Push Notifications
- Service worker can handle auth-related push notifications
- Notify users of security events across all tabs

### 2. Advanced Caching
- Cache user profile data and preferences
- Smart cache invalidation based on auth state

### 3. Analytics Integration
- Track auth events without exposing tokens
- Better privacy compliance

### 4. Multi-Domain Support
- Service worker can handle auth across multiple domains
- Centralized session management for multi-app scenarios

## Conclusion

The service worker architecture represents a significant improvement over the current client-side approach:

- **Better UX**: Seamless cross-tab sync and background refresh
- **Enhanced Security**: Reduced token exposure and better isolation
- **Improved Reliability**: Offline capabilities and better error handling
- **Future-Proof**: Foundation for advanced features like push notifications

The migration can be done gradually with full backward compatibility, ensuring existing applications continue to work while new applications benefit from the improved architecture.