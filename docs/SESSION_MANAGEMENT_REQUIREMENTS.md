# Session Management Requirements

## Overview

This document defines the requirements for session management in flows-auth to ensure consistent authentication state across all components and applications.

### **🚨 Related Issue: Token Generation**

Session management works correctly, but the **tokens being stored are incorrect**. The API currently generates Machine-to-Machine tokens instead of proper user tokens. See [thepia.com/docs/auth/passwordless-migration-guide.md](../../thepia.com/docs/auth/passwordless-migration-guide.md) for resolution.

## Problem Statement

**Historical Issue** (RESOLVED): flows-auth previously had inconsistent session storage between components. This has been resolved through the SessionPersistence abstraction.

**Current Architecture**:
- `SessionPersistence` interface provides storage abstraction
- `createLocalStorageAdapter()` implements default storage using StorageManager
- All stores use SessionPersistence for session/user persistence
- sessionManager utilities are legacy internal helpers (being phased out)

## Requirements

### R1: Session Storage Consistency (CRITICAL)

**R1.1 Single Source of Truth**
- **MUST**: All authentication stores use SessionPersistence for session persistence
- **MUST**: No direct `localStorage` or `sessionStorage` access in stores
- **MUST**: All session reads/writes go through SessionPersistence methods

**R1.2 Unified Storage Key**
- **MUST**: Use single session key `'thepia_auth_session'` for all session data
- **MUST NOT**: Use legacy keys like `'auth_access_token'`, `'auth_user'`, `'auth_refresh_token'`

**R1.3 Store Integration**
- **MUST**: Auth stores use `db.loadSession()` and `db.saveSession()` from SessionPersistence
- **MUST**: Store initialization checks SessionPersistence, not storage directly
- **MUST**: session.ts and auth-core.ts use injected SessionPersistence instance

### R2: Storage Configuration (SHOULD)

**R2.1 Configurable Storage Type**
- **SHOULD**: Support both `sessionStorage` (default) and `localStorage` based on configuration
- **SHOULD**: Default to `sessionStorage` for security
- **SHOULD**: Allow `localStorage` for employee/long-running sessions

**R2.2 Role-Based Storage Strategy**
- **SHOULD**: Guest users → `sessionStorage` (8-hour timeout)
- **SHOULD**: Employee users → `localStorage` (7-day timeout)
- **SHOULD**: Admin users → `localStorage` (7-day timeout)

**R2.3 Runtime Configuration**
- **SHOULD**: Allow storage configuration at auth store creation
- **SHOULD**: Allow runtime storage reconfiguration
- **SHOULD**: Provide helper functions for optimal configuration

### R3: Session Validation (MUST)

**R3.1 Token Expiration**
- **MUST**: Check `tokens.expiresAt` against current time
- **MUST**: Clear expired sessions automatically
- **MUST**: Return `null` for expired sessions

**R3.3 Session Structure Validation**
- **MUST**: Validate session data structure on retrieval
- **MUST**: Handle corrupted session data gracefully
- **MUST**: Clear invalid session data

### R4: Legacy Migration (MUST)

**R4.1 Legacy Data Cleanup**
- **MUST**: Remove legacy localStorage keys on startup
- **MUST**: Clean up keys: `'auth_access_token'`, `'auth_user'`, `'auth_refresh_token'`, `'auth_expires_at'`
- **SHOULD**: Migrate valid legacy data to new format before cleanup

**R4.2 Backward Compatibility**
- **MUST**: Existing applications continue to work without code changes
- **MUST**: Graceful handling of missing configuration
- **MUST**: Default behavior matches current sessionStorage approach

### R5: Event System (MUST)

**R5.1 Session Events**
- **MUST**: Emit broadcast event on session save/clear
- **MUST**: Include session data in event detail
- **MUST**: Support cross-tab synchronization

**R5.2 Event Consistency**
- **MUST**: All session changes trigger events
- **MUST**: Events work across different storage types
- **MUST**: Event format remains consistent

### R6: Error Handling (MUST)

**R6.1 Storage Errors**
- **MUST**: Handle storage quota exceeded gracefully
- **MUST**: Handle storage access denied gracefully
- **MUST**: Log storage errors for debugging

**R6.2 Fallback Behavior**
- **MUST**: Fallback to in-memory storage if browser storage unavailable
- **MUST**: Graceful degradation in SSR environments
- **MUST**: Clear error states on recovery

### R7: Security Requirements (CRITICAL)

**R7.1 Default Security**
- **MUST**: Default to `sessionStorage` (cleared on tab close)
- **MUST**: Require explicit configuration for `localStorage`
- **MUST**: Validate user role before enabling persistent storage

**R7.2 Session Timeouts**
- **MUST**: Enforce maximum session timeouts
- **MUST**: Guest sessions ≤ 8 hours
- **MUST**: Employee sessions ≤ 7 days

**R7.3 Data Protection**
- **MUST**: Store minimal session data
- **MUST**: No sensitive data in localStorage
- **MUST**: Clear sessions on sign out

### R8: Token Refresh Retry Logic (MUST)

**R8.1 Automatic Token Refresh**
- **MUST**: Automatically refresh tokens before expiration (default: 5 minutes before)
- **MUST**: Schedule refresh via `scheduleTokenRefresh()` after successful token update
- **MUST**: Use `refreshInProgress` lock to prevent concurrent refresh calls
- **MUST**: Clear session if refresh fails after all retries exhausted

**R8.2 Retry Strategy for Transient Failures**
- **MUST**: Retry transient errors with exponential backoff
- **MUST**: Max retry attempts: 3 (total 4 attempts including initial)
- **MUST**: Backoff schedule: 60s → 300s → 1500s (1min → 5min → 25min)
- **MUST**: Backoff formula: `60s × 5^(attempt-1)`

**R8.3 Error Classification**
- **MUST**: Classify errors as permanent or transient
- **MUST**: Permanent errors (no retry):
  - HTTP 400 Bad Request
  - Error messages containing: "invalid_token", "token_expired", "malformed", "already exchanged", "invalid_grant"
- **MUST**: Transient errors (retry with backoff):
  - Network errors and timeouts
  - HTTP 500 Internal Server Error
  - HTTP 503 Service Unavailable
  - HTTP 429 Rate Limiting
  - Any error not classified as permanent

**R8.4 Retry Counter Management**
- **MUST**: Reset retry counter to 0 after successful token refresh
- **MUST**: Reset retry counter to 0 for permanent failures
- **MUST**: Increment retry counter only on transient failures
- **MUST**: Auto-reset retry counter after 1 hour of successful operation

**R8.5 Session Behavior During Retries**
- **MUST**: Keep session valid with current access token while retries are pending
- **MUST NOT**: Auto-signout on refresh failure
- **MUST**: Allow user to continue with current token until `expiresAt`
- **MUST**: Let user manually sign out if needed

**R8.6 Implementation Location**
- Implementation: `src/stores/core/auth-core.ts:103-247` (`refreshTokens()` method)
- Tests: `tests/regression/token-refresh-retry-logic.test.ts`
- Related: `scheduleTokenRefresh()` calls `refreshTokens()` on scheduled intervals

## Implementation Priorities

### Phase 1: Critical Fixes (MUST)
1. Update auth-state-machine.ts to use sessionManager
2. Implement legacy data cleanup
3. Ensure session validation consistency
4. Add comprehensive test coverage

### Phase 2: Configuration (SHOULD)
1. Implement configurable storage manager
2. Add role-based storage configuration
3. Add runtime configuration functions
4. Update documentation and examples

### Phase 3: Enhancements (COULD)
1. Cross-tab session synchronization
2. Session analytics and monitoring
3. Advanced security features
4. Performance optimizations

## Acceptance Criteria

### Critical Success Criteria
- [ ] Users remain authenticated after page reload
- [ ] No localStorage/sessionStorage conflicts
- [ ] All tests pass with 100% coverage
- [ ] Backward compatibility maintained

### Configuration Success Criteria
- [ ] Employee users can have persistent sessions
- [ ] Guest users have secure session-only storage
- [ ] Runtime configuration works correctly
- [ ] Documentation is complete and accurate

## Testing Requirements

### Unit Tests (MUST)
- [ ] sessionManager functions
- [ ] Storage configuration
- [ ] Session validation logic
- [ ] Legacy migration

### Integration Tests (MUST)
- [ ] sessionManager + state machine consistency
- [ ] Storage type switching
- [ ] Event system functionality
- [ ] Error handling scenarios

### End-to-End Tests (SHOULD)
- [ ] Full authentication flow
- [ ] Page reload persistence
- [ ] Cross-tab synchronization
- [ ] Role-based configuration

## Documentation Requirements

### Technical Documentation (MUST)
- [ ] API reference for all functions
- [ ] Configuration options guide
- [ ] Migration guide from legacy
- [ ] Troubleshooting guide

### Usage Documentation (MUST)
- [ ] Quick start guide
- [ ] Configuration examples
- [ ] Best practices
- [ ] Security considerations

## Compliance

This specification ensures compliance with:
- **Security**: Default secure storage, configurable timeouts
- **Privacy**: Minimal data storage, clear session cleanup
- **Usability**: Consistent authentication state, role-based UX
- **Maintainability**: Single source of truth, comprehensive testing
