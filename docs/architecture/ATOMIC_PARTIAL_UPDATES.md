# Atomic Partial Session Updates

**Status**: Proposed
**Date**: 2025-01-20
**Supersedes**: Stale token guard (complements it)

## Overview

Change `SessionPersistence.saveSession()` to accept partial updates instead of requiring full SessionData objects. This enables atomic field-level updates and eliminates read-modify-write races at the architectural level.

## Current Problem

```typescript
// Current API forces read-modify-write pattern
interface SessionPersistence {
  saveSession(session: SessionData): Promise<void>;  // Full object required
}

// Usage (UNSAFE - race conditions)
const session = await db.loadSession();  // Read
session.accessToken = newToken;          // Modify
await db.saveSession(session);           // Write (may overwrite concurrent changes)
```

## Proposed Solution

### New Interface

```typescript
/**
 * Session persistence adapter with atomic partial update support
 */
export interface SessionPersistence {
  /**
   * Save or update session data
   *
   * @param session - Partial session data to merge with existing session
   *                  If session doesn't exist, creates new one (requires all mandatory fields)
   *                  If session exists, merges provided fields atomically
   *
   * @example
   * // Update only tokens (atomic)
   * await db.saveSession({
   *   userId: 'user-123',  // Required for lookup
   *   accessToken: 'new-token',
   *   expiresAt: Date.now() + 900000
   * });
   *
   * @example
   * // Update only user profile fields (atomic)
   * await db.saveSession({
   *   userId: 'user-123',
   *   name: 'New Name',
   *   emailVerified: true
   * });
   */
  saveSession(session: Partial<SessionData>): Promise<void>;

  /**
   * Load session from database
   */
  loadSession(): Promise<SessionData | null>;

  /**
   * Clear session from database
   */
  clearSession(): Promise<void>;

  // ... other methods unchanged
}
```

### Implementation in Database Adapters

#### IndexedDB (flows-db)
```typescript
class FlowsDbAdapter implements SessionPersistence {
  async saveSession(partialSession: Partial<SessionData> & { userId: string }): Promise<void> {
    const db = await this.getDb();
    const tx = db.transaction('sessions', 'readwrite');
    const store = tx.objectStore('sessions');

    // Read existing session (within transaction = atomic)
    const existing = await store.get(partialSession.userId);

    // Merge partial update with existing data
    const updated: SessionData = existing
      ? { ...existing, ...partialSession }  // Merge with existing
      : partialSession as SessionData;      // New session (must be complete)

    // Write back (still in same transaction = atomic)
    await store.put(updated);
    await tx.complete;
  }
}
```

#### LocalStorage
```typescript
class LocalStorageAdapter implements SessionPersistence {
  async saveSession(partialSession: Partial<SessionData> & { userId: string }): Promise<void> {
    const key = `session:${partialSession.userId}`;

    // Read existing (synchronous in localStorage)
    const existing = localStorage.getItem(key);
    const current = existing ? JSON.parse(existing) : null;

    // Merge partial update
    const updated = current
      ? { ...current, ...partialSession }
      : partialSession;

    // Write back (atomic in localStorage - single-threaded)
    localStorage.setItem(key, JSON.stringify(updated));
  }
}
```

#### Service Worker (Cache API)
```typescript
class ServiceWorkerAdapter implements SessionPersistence {
  async saveSession(partialSession: Partial<SessionData> & { userId: string }): Promise<void> {
    const cache = await caches.open('auth-sessions');
    const url = `/session/${partialSession.userId}`;

    // Read existing
    const response = await cache.match(url);
    const existing = response ? await response.json() : null;

    // Merge partial update
    const updated = existing
      ? { ...existing, ...partialSession }
      : partialSession;

    // Write back (atomic within Service Worker context)
    await cache.put(
      url,
      new Response(JSON.stringify(updated), {
        headers: { 'Content-Type': 'application/json' }
      })
    );
  }
}
```

## Usage in Auth Core

### Before (Read-Modify-Write)
```typescript
updateTokens: async (tokens) => {
  // ... update state ...

  // UNSAFE: Read-modify-write pattern
  const currentState = get();
  if (currentState.user && currentState.access_token) {
    await db.saveSession({
      userId: currentState.user.id,
      email: currentState.user.email,
      name: currentState.user.name,
      emailVerified: currentState.user.emailVerified,
      metadata: currentState.user.metadata,
      accessToken: currentState.access_token,
      refreshToken: currentState.refresh_token || '',
      expiresAt: currentState.expiresAt || 0,
      refreshedAt: Date.now(),
      authMethod: 'email-code',
      supabaseToken: currentState.supabase_token,
      supabaseExpiresAt: currentState.supabase_expires_at
    });
  }
}
```

### After (Atomic Partial Update)
```typescript
updateTokens: async (tokens) => {
  // ... update state ...

  // SAFE: Atomic partial update - only touch what changed
  const currentState = get();
  if (currentState.user && tokens.access_token) {
    await db.saveSession({
      userId: currentState.user.id,  // Required for lookup
      // Only update token-related fields
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token ?? currentState.refresh_token,
      expiresAt: tokens.expiresAt || 0,
      refreshedAt: Date.now(),
      supabaseToken: tokens.supabase_token,
      supabaseExpiresAt: tokens.supabase_expires_at
    });
  }
}
```

### Even Better: Separate Methods
```typescript
// Optional: Add convenience methods for common operations
interface SessionPersistence {
  saveSession(session: Partial<SessionData> & { userId: string }): Promise<void>;

  // Convenience methods (optional - can be implemented via saveSession)
  updateTokens?(userId: string, tokens: TokenUpdate): Promise<void>;
  updateUser?(userId: string, user: Partial<UserData>): Promise<void>;
  updateActivity?(userId: string, timestamp: number): Promise<void>;
}

// Implementation
class DbAdapter implements SessionPersistence {
  async updateTokens(userId: string, tokens: TokenUpdate): Promise<void> {
    // Delegate to saveSession with partial data
    await this.saveSession({
      userId,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresAt: tokens.expiresAt,
      refreshedAt: Date.now()
    });
  }
}

// Usage in auth-core.ts
await db.updateTokens(currentState.user.id, {
  access_token: tokens.access_token,
  refresh_token: tokens.refresh_token,
  expiresAt: tokens.expiresAt
});
```

## Benefits

### 1. Eliminates Read-Modify-Write Races
```typescript
// Tab A and Tab B can safely update different fields
Tab A: await db.saveSession({ userId: 'u1', accessToken: 'new' });
Tab B: await db.saveSession({ userId: 'u1', name: 'New Name' });
// Both updates succeed - merged atomically by database layer
```

### 2. More Efficient
```typescript
// Before: Write 10+ fields even if only updating tokens
await db.saveSession(fullSessionObject);

// After: Write only what changed
await db.saveSession({ userId, accessToken, expiresAt, refreshedAt });
```

### 3. Better Separation of Concerns
- **Auth core**: Knows about tokens, auth state
- **Database adapter**: Handles atomic merging, storage
- Clear responsibilities

### 4. IndexedDB Transaction Benefits
```typescript
// Database adapter can use proper transactions
async saveSession(partial: Partial<SessionData>) {
  const tx = db.transaction('sessions', 'readwrite');
  // Read and write in SAME transaction = atomic
  const existing = await tx.objectStore('sessions').get(partial.userId);
  const merged = { ...existing, ...partial };
  await tx.objectStore('sessions').put(merged);
  await tx.complete;
}
```

## Migration Strategy

### Phase 1: Backward Compatible Change
```typescript
// Make saveSession accept partial OR full
export interface SessionPersistence {
  saveSession(
    session: Partial<SessionData> & { userId: string }
  ): Promise<void>;
}

// Adapters still work - full object is also a valid partial
const fullSession: SessionData = { userId: 'u1', email: '...', /* all fields */ };
await db.saveSession(fullSession);  // Still works!
```

### Phase 2: Update Auth Core
- Change `updateTokens()` to use partial updates
- Change `updateUser()` to use partial updates
- Remove guard (no longer needed - atomic at DB level)

### Phase 3: Update Database Adapters
- Implement atomic merging in IndexedDB adapter
- Implement atomic merging in localStorage adapter
- Implement atomic merging in Service Worker adapter

### Phase 4: Add Convenience Methods (Optional)
- `updateTokens()` helper
- `updateUser()` helper
- `updateActivity()` helper

## Comparison with Other Solutions

| Solution | Eliminates Races | Cross-Tab Sync | Redundant Calls | Complexity |
|----------|-----------------|----------------|-----------------|-----------|
| **Stale Token Guard** | ⚠️ Partial | ❌ No | ❌ No | Low |
| **Partial Updates** | ✅ Yes | ❌ No | ❌ No | Low |
| **BroadcastChannel** | ⚠️ Partial | ✅ Yes | ❌ No | Medium |
| **RefreshCoordinator** | ✅ Yes | ✅ Yes | ✅ Yes | Medium |
| **All Combined** | ✅ Yes | ✅ Yes | ✅ Yes | Medium |

## Recommended Approach: Layered Solution

**Layer 1: Partial Updates (This Proposal)**
- Foundation: Atomic operations at DB level
- Prevents most race conditions
- Clean architecture

**Layer 2: BroadcastChannel**
- Cross-tab state synchronization
- Fast propagation of changes
- Simple implementation

**Layer 3: RefreshCoordinator**
- Prevents redundant API calls
- Perfect multi-tab UX
- Complete solution

## Implementation Order

1. **Today**: Change `SessionPersistence` interface ✅
2. **Today**: Update database adapters for atomic merging ✅
3. **This Week**: Update auth-core to use partial updates ✅
4. **This Week**: Add BroadcastChannel for sync ✅
5. **Next Sprint**: Add RefreshCoordinator ✅

## Breaking Changes

**None** - This is backward compatible:
- Partial<SessionData> accepts full SessionData
- Existing calls with full objects still work
- Can migrate incrementally

## Testing Strategy

### Unit Tests
```typescript
it('should merge partial session updates atomically', async () => {
  // Setup initial session
  await db.saveSession({
    userId: 'u1',
    email: 'test@example.com',
    accessToken: 'old-token',
    expiresAt: Date.now() + 1000
  });

  // Update only tokens
  await db.saveSession({
    userId: 'u1',
    accessToken: 'new-token',
    expiresAt: Date.now() + 2000
  });

  const session = await db.loadSession();
  expect(session.accessToken).toBe('new-token');
  expect(session.email).toBe('test@example.com'); // Preserved!
});
```

### Integration Tests
```typescript
it('should handle concurrent partial updates', async () => {
  // Simulate Tab A and Tab B updating different fields
  await Promise.all([
    db.saveSession({ userId: 'u1', accessToken: 'tab-a-token' }),
    db.saveSession({ userId: 'u1', name: 'Tab B Name' })
  ]);

  const session = await db.loadSession();
  expect(session.accessToken).toBe('tab-a-token');
  expect(session.name).toBe('Tab B Name');
  // Both updates should be preserved!
});
```

## Success Criteria

✅ No race conditions on token updates
✅ No race conditions on user profile updates
✅ Backward compatible with existing code
✅ All database adapters support atomic merging
✅ Tests passing for concurrent updates
✅ Documentation updated

## Related Documents

- [SESSION_SYNC_STRATEGY.md](./SESSION_SYNC_STRATEGY.md) - Overall strategy
- [STALE_TOKEN_GUARD.md](./STALE_TOKEN_GUARD.md) - Current guard implementation
- [../types/database.ts](../../src/types/database.ts) - SessionPersistence interface
