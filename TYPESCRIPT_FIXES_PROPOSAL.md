# TypeScript Errors - Fix Proposals

## Error 1: `EmailCodeSendResponse` timestamp mismatch
**Location**: `src/stores/auth-methods/email-auth.ts:367`

**Problem**: 
- `sendCode()` returns `Promise<EmailCodeSendResponse | { success: boolean; message: string; timestamp: number }>`
- But `EmailAuthActions.sendCode` is typed as `Promise<{ success: boolean; message: string; timestamp: number }>`
- `EmailCodeSendResponse.timestamp` is optional (`timestamp?: number`), causing type incompatibility

**Root Cause**: `EmailCodeSendResponse` has optional `timestamp` field, but the action interface requires it to be required.

**Fix Options**:

### Option A: Make timestamp required in EmailCodeSendResponse (RECOMMENDED)
```typescript
// src/types/index.ts - line 375
export interface EmailCodeSendResponse {
  success: boolean;
  step: 'code_sent' | 'email-sent';
  message: string;
  email?: string;
  userExists?: boolean;
  expiresAt?: string;
  timestamp: number;  // ← Change from `timestamp?: number` to `timestamp: number`
  config?: { ... };
}
```

**Rationale**: Timestamps should always be present for audit/logging purposes. This is more consistent with the action interface.

---

---

## Error 3: `expiresAt` possibly undefined in session tokens
**Locations**:
- `src/utils/sessionManager.ts:34` - line 111
- `src/utils/sessionManager.ts:111`

**Problem**: 
```typescript
if (session.tokens.expiresAt < Date.now() && !session.tokens.refreshToken)
```
- `TokenData.expiresAt` is optional (`expiresAt?: number`)
- Comparing undefined with Date.now() causes type error

**Root Cause**: `TokenData` type has optional `expiresAt`, but code assumes it's always present.

**Fix**: Add null-coalescing check
```typescript
// src/utils/sessionManager.ts - lines 34 and 111
if ((session.tokens.expiresAt ?? 0) < Date.now() && !session.tokens.refreshToken) {
  // Token is expired and no refresh token available
}
```

**Rationale**: If `expiresAt` is missing, treat token as already expired (safest assumption).

---

## Error 4: Onboarding store clients metadata type mismatch
**Location**: `src/stores/onboarding-store.ts:174`

**Problem**: 
- `clients` object has optional properties in some values
- `updateMetadata()` expects all properties to be required

**Root Cause**: Type narrowing issue - some client entries have optional `status`, `first_seen`, `last_seen`.

**Fix**: Ensure all client entries have required fields
```typescript
// src/stores/onboarding-store.ts - around line 160-174
const updated = {
  ...currentMetadata,
  clients: {
    ...currentMetadata.clients,
    [clientId]: {
      status: status as "needs_invite" | "invited" | "connected",  // ← Ensure required
      first_seen: status.first_seen || new Date().toISOString(),   // ← Ensure required
      last_seen: status.last_seen || new Date().toISOString(),     // ← Ensure required
      progress: status.progress,
      steps: status.steps
    }
  }
};
```

---

## Summary of Changes

| Error | File | Fix | Priority |
|-------|------|-----|----------|
| EmailCodeSendResponse timestamp | `src/types/index.ts` | Make `timestamp` required | HIGH |
| Missing `picture` on User | `src/types/index.ts` | Add `picture?: string` | HIGH |
| `expiresAt` undefined | `src/utils/sessionManager.ts` | Use null-coalescing `?? 0` | HIGH |
| Clients metadata type | `src/stores/onboarding-store.ts` | Ensure required fields | MEDIUM |

All fixes are backward compatible and don't require API changes.

