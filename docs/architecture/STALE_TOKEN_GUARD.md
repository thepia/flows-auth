# Stale Token Overwrite Protection

**Status**: Implemented
**Date**: 2025-01-20
**Location**: [src/stores/core/auth-core.ts:336-351](../../src/stores/core/auth-core.ts#L336-L351)

## Overview

Added a simple guard in `updateTokens()` that prevents stale tokens from overwriting fresh tokens by comparing expiry times. This provides immediate protection against multi-tab race conditions while more comprehensive solutions are developed.

## The Problem

In multi-tab scenarios, race conditions can cause stale tokens to overwrite fresh ones:

```typescript
// Tab A and Tab B both have tokens expiring at T0

Tab A: Refreshes → gets tokens expiring at T1000
Tab A: saveSession() ✅

Tab B: Refresh fails (token already used)
Tab B: Still tries saveSession() with old tokens (expire at T0)
Tab B: Overwrites Tab A's fresh tokens ❌

Result: User has stale tokens, next refresh fails
```

## The Solution

Simple guard that compares expiry times before updating:

```typescript
updateTokens: async (tokens) => {
  const currentStateBefore = get();

  // GUARD: Prevent overwriting newer tokens with stale ones
  if (tokens.expiresAt && currentStateBefore.expiresAt) {
    if (tokens.expiresAt < currentStateBefore.expiresAt) {
      console.warn('[Auth Core] Rejecting stale token update');
      return; // Skip this update - current tokens are fresher
    }
  }

  // ... proceed with update
}
```

## What This Solves

✅ **Multi-tab concurrent refresh races**
- Tab A succeeds, Tab B fails → Tab B can't overwrite Tab A's tokens

✅ **Read-modify-write races with tokens**
- Whichever tab gets fresher tokens wins
- Stale updates are silently rejected

✅ **Delayed API response overwrites**
- Slow refresh response can't overwrite already-refreshed tokens

## What This Doesn't Solve

❌ **Non-token session field races**
- User profile updates (name, email) can still race
- Only token-related updates are protected

❌ **Redundant API calls**
- All tabs still attempt to refresh
- Only prevents bad writes, not bad requests

❌ **Cross-tab state sync**
- Tabs don't learn about other tabs' token updates
- Each tab maintains its own view until next operation

## Guard Behavior

### Accepted Updates

| Current Expiry | Incoming Expiry | Result | Reason |
|---------------|-----------------|--------|--------|
| T+10min | T+15min | ✅ Accept | Incoming is fresher |
| T+10min | T+10min | ✅ Accept | Same time (edge case) |
| `null` | T+15min | ✅ Accept | No comparison possible |
| T+10min | `null` | ✅ Accept | No comparison possible |

### Rejected Updates

| Current Expiry | Incoming Expiry | Result | Reason |
|---------------|-----------------|--------|--------|
| T+15min | T+10min | ❌ Reject | Incoming is stale |

## Edge Cases

### Both expiresAt are null
- **Behavior**: Accept update
- **Reason**: No way to determine staleness without expiry times
- **Impact**: Guard doesn't help, but also doesn't break anything

### Same expiry time
- **Behavior**: Accept update (uses `<` not `<=`)
- **Reason**: Not strictly stale, may be legitimate refresh
- **Risk**: Minimal - tokens are equally fresh

### Clock skew between tabs
- **Not an issue**: Uses same system clock (Date.now())
- Expiry times come from server, not client clocks

## Testing

See [tests/unit/stale-token-guard.test.ts](../../tests/unit/stale-token-guard.test.ts)

Tests cover:
- ✅ Accepting fresher tokens
- ✅ Rejecting stale tokens
- ✅ Same expiry edge case
- ✅ Null expiry handling
- ✅ Multi-tab race scenario
- ✅ Warning logs

Run tests:
```bash
pnpm test tests/unit/stale-token-guard.test.ts
```

## Performance Impact

- **Overhead**: Negligible (~2 numeric comparisons)
- **Network**: No change (doesn't prevent redundant requests)
- **Storage**: Fewer writes (stale updates skipped)

## Logging

When rejecting stale tokens, logs warning with details:

```javascript
console.warn(
  '[Auth Core] Rejecting token update - incoming tokens expire earlier than current tokens',
  {
    currentExpiresAt: '2025-01-20T12:15:00.000Z',
    incomingExpiresAt: '2025-01-20T12:10:00.000Z',
    tabId: 'tab-123'
  }
);
```

## Integration with Other Solutions

This guard is **complementary** to other synchronization strategies:

### With BroadcastChannel (Recommended Next)
- Guard prevents stale overwrites (defensive)
- BroadcastChannel syncs state proactively (offensive)
- Together: Complete protection

### With RefreshCoordinator (Full Solution)
- Guard is redundant but harmless
- Provides safety net if coordinator fails
- Defense in depth

### With Service Worker
- Guard still useful during SW startup/fallback
- No downside to keeping both

## Migration Path

**No breaking changes** - Guard is purely defensive:

1. ✅ **Already deployed** - No action needed
2. **Next step**: Add BroadcastChannel for cross-tab sync
3. **Future**: Add RefreshCoordinator for request coordination

## Related Documentation

- [SESSION_SYNC_STRATEGY.md](./SESSION_SYNC_STRATEGY.md) - Comprehensive synchronization strategy
- [FIXME.md](../FIXME.md) - Known issues tracker
- [API_CONTRACT_TESTING_POLICY.md](../testing/API_CONTRACT_TESTING_POLICY.md) - Testing approach

## Monitoring

To detect if guard is triggering in production:

```javascript
// Watch for warning logs
if (tokens.expiresAt < currentStateBefore.expiresAt) {
  // Log to error reporting service
  reportEvent('stale_token_rejected', {
    currentExpiry: currentStateBefore.expiresAt,
    incomingExpiry: tokens.expiresAt,
    timeDiff: currentStateBefore.expiresAt - tokens.expiresAt
  });
}
```

## Success Criteria

✅ **No stale token overwrites** in multi-tab scenarios
✅ **All tests passing**
✅ **Zero performance degradation**
✅ **Backward compatible** with existing code
✅ **Foundation for future enhancements**
