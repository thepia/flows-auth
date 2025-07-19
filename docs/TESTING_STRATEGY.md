# Testing Strategy for flows-auth

## Overview

This document outlines the comprehensive testing strategy for flows-auth, addressing critical regressions found during the migration process. The strategy emphasizes **real functionality testing** over excessive mocking.

## Critical Issues Identified

### 🚨 BLOCKER Issues
1. Component tests mock `registerUser` but component calls `createAccount`
2. No tests for `createAccount` method (the actual registration method)
3. No tests validating WebAuthn passkey creation
4. Integration tests don't test real registration flow
5. Auth store tests missing registration functionality entirely

## Testing Philosophy

### Minimal Mocking Principle
- **Mocking is a code smell** unless used surgically
- Mock only external dependencies (network, browser APIs)
- Test real business logic and state management
- Validate actual user flows, not implementation details

### Test Pyramid Structure
1. **Unit Tests (30%)**: Core business logic, utilities, pure functions
2. **Integration Tests (50%)**: Component + store interactions, real flows
3. **E2E Tests (20%)**: Full user journeys, cross-browser validation

## Test Categories

### 1. Core Functionality Tests (CRITICAL)

#### createAccount Method Tests
```typescript
// Test the actual registration method used by components
describe('createAccount', () => {
  it('should complete full WebAuthn registration flow')
  it('should handle invitation tokens correctly')
  it('should emit correct events for different user types')
  it('should handle WebAuthn errors gracefully')
  it('should validate email verification status')
})
```

#### WebAuthn Flow Tests
```typescript
// Test actual passkey creation and validation
describe('WebAuthn Registration Flow', () => {
  it('should create and store passkey credentials')
  it('should handle platform authenticator unavailable')
  it('should handle user cancellation')
  it('should validate credential creation options')
  it('should verify credential registration response')
})
```

### 2. Component Integration Tests

#### AccountCreationForm Component Tests
```typescript
// Test component with real auth store (minimal mocking)
describe('AccountCreationForm Integration', () => {
  it('should call createAccount with correct parameters')
  it('should handle successful registration flow')
  it('should display correct messages for invitation users')
  it('should emit appAccess event for verified users')
  it('should handle registration errors gracefully')
})
```

### 3. Email Verification Flow Tests

#### Invitation vs Standard Registration
```typescript
describe('Email Verification Flow', () => {
  it('should show verified message for invitation users')
  it('should show verification prompt for standard users')
  it('should emit correct events based on verification status')
  it('should handle missing emailVerifiedViaInvitation field')
})
```

### 4. Event Emission Tests

#### Critical Event Validation
```typescript
describe('Event Emission', () => {
  it('should emit appAccess for invitation users (auto-sign-in)')
  it('should emit success for standard users (show message)')
  it('should include correct event data')
  it('should not emit conflicting events')
})
```

### 5. Error Handling Tests

#### Comprehensive Error Scenarios
```typescript
describe('Error Handling', () => {
  it('should handle WebAuthn not supported')
  it('should handle network failures')
  it('should handle invalid invitation tokens')
  it('should handle API validation errors')
  it('should provide user-friendly error messages')
})
```

## Test Implementation Plan

### Phase 1: Fix Critical Test Regressions (URGENT)

#### 1.1 Update Component Tests
- [ ] Fix AccountCreationForm tests to mock `createAccount`
- [ ] Add comprehensive component integration tests
- [ ] Remove excessive mocking of business logic

#### 1.2 Add Core Method Tests
- [ ] Add `createAccount` method tests
- [ ] Add WebAuthn flow tests
- [ ] Add email verification tests

#### 1.3 Fix Integration Tests
- [ ] Update auth store comprehensive tests
- [ ] Add real flow validation tests
- [ ] Remove outdated `registerUser` tests

### Phase 2: Comprehensive Coverage

#### 2.1 Add Missing Test Categories
- [ ] Event emission validation tests
- [ ] Error handling scenario tests
- [ ] Cross-browser compatibility tests

#### 2.2 Real API Integration Tests
- [ ] Tests with real API calls (dev environment)
- [ ] WebAuthn credential validation
- [ ] End-to-end user journey tests

### Phase 3: Production Readiness

#### 3.1 Performance Tests
- [ ] WebAuthn operation timing tests
- [ ] Memory usage validation
- [ ] Mobile device performance

#### 3.2 Security Tests
- [ ] Credential storage validation
- [ ] Token handling security
- [ ] HTTPS requirement validation

## Test Configuration

### Test Environment Setup
```typescript
// Minimal mocking configuration
const testConfig = {
  // Mock only external dependencies
  mocks: {
    fetch: mockFetch,
    navigator: mockNavigator,
    localStorage: mockStorage
  },
  // Use real implementations
  realImplementations: {
    authStore: true,
    businessLogic: true,
    stateManagement: true
  }
}
```

### WebAuthn Test Mocking
```typescript
// Surgical mocking for WebAuthn APIs
const mockWebAuthn = {
  // Mock browser APIs that can't run in test environment
  'navigator.credentials.create': mockCredentialCreate,
  'navigator.credentials.get': mockCredentialGet,
  
  // Use real implementations for business logic
  credentialValidation: realImplementation,
  errorHandling: realImplementation,
  stateManagement: realImplementation
}
```

## Success Criteria

### Test Coverage Requirements
- [ ] 100% coverage for `createAccount` method
- [ ] 100% coverage for WebAuthn flow logic
- [ ] 100% coverage for email verification logic
- [ ] 90%+ coverage for component integration
- [ ] 80%+ coverage for error scenarios

### Functional Validation
- [ ] All tests pass with real auth store
- [ ] WebAuthn flow validated end-to-end
- [ ] Invitation flow validated end-to-end
- [ ] Error scenarios properly handled
- [ ] Events emitted correctly

### Performance Validation
- [ ] Test suite runs in <30 seconds
- [ ] No memory leaks in test environment
- [ ] Cross-browser test compatibility

## Monitoring and Maintenance

### Continuous Validation
- [ ] Tests run on every commit
- [ ] Integration tests run on every PR
- [ ] E2E tests run on every release

### Test Quality Metrics
- [ ] Test failure rate <1%
- [ ] Test execution time monitoring
- [ ] Coverage trend monitoring
- [ ] Flaky test identification

## Current Status and Critical Findings

### 🚨 CRITICAL REGRESSIONS DISCOVERED
During implementation of this testing strategy, we discovered **CRITICAL PRODUCTION-BLOCKING ISSUES**:

1. **Component tests mock `registerUser` but component calls `createAccount`**
   - **Impact**: Tests pass but don't validate actual functionality
   - **Status**: ❌ BLOCKER - Tests are validating wrong method

2. **No tests for `createAccount` method (the actual registration method)**
   - **Impact**: Core WebAuthn passkey creation flow completely untested
   - **Status**: ❌ BLOCKER - Primary functionality has zero test coverage

3. **Real flow test exposed multiple critical bugs**:
   - Base64 encoding errors in WebAuthn challenge handling
   - Missing input validation before API calls (security issue)
   - Error handling logic bugs masking real errors
   - Invitation token flow completely broken

4. **Documentation out of sync with implementation**
   - **Impact**: Developers following specs implement wrong behavior
   - **Status**: ❌ BLOCKER - Specs reference deprecated methods

### ✅ COMPREHENSIVE TEST STUBS CREATED
We've created complete test stubs for all missing functionality:

- `tests/critical/auth-store-registration.test.ts` - Core auth store tests
- `tests/critical/webauthn-flow-validation.test.ts` - WebAuthn passkey tests
- `tests/critical/registration-form-real-integration.test.ts` - Component integration
- `tests/critical/email-verification-flow.test.ts` - Email verification logic
- `tests/critical/event-emission-validation.test.ts` - Event emission validation
- `tests/critical/error-handling-scenarios.test.ts` - Comprehensive error handling
- `tests/critical/createAccount-real-flow.test.ts` - Real flow validation (exposes bugs)

## Immediate TODOs (CRITICAL)

### Phase 1: Fix Exposed Bugs (URGENT - PRODUCTION BLOCKERS)
- [ ] **Fix base64 encoding bug** in WebAuthn challenge handling
- [ ] **Add input validation** to `createAccount` method (security issue)
- [ ] **Fix error handling logic** to properly propagate network errors
- [ ] **Debug and fix invitation token flow** (completely broken)
- [ ] **Update all component tests** to mock `createAccount` instead of `registerUser`

### Phase 2: Implement Critical Test Stubs (HIGH PRIORITY)
- [ ] **Implement auth-store-registration.test.ts** - Test core `createAccount` method
- [ ] **Implement webauthn-flow-validation.test.ts** - Test actual passkey creation
- [ ] **Implement registration-form-real-integration.test.ts** - Test real component integration
- [ ] **Implement email-verification-flow.test.ts** - Test invitation vs standard flows
- [ ] **Implement event-emission-validation.test.ts** - Test event emission logic
- [ ] **Implement error-handling-scenarios.test.ts** - Test comprehensive error handling

### Phase 3: Documentation Synchronization (MEDIUM PRIORITY)
- [ ] **Update AccountCreationForm specification** to reflect `createAccount` usage
- [ ] **Update API documentation** to match current implementation
- [ ] **Update integration guides** with correct method calls
- [ ] **Update flows.thepia.net/MIGRATION_PROGRESS.md** with current status

### Phase 4: Production Readiness Validation (FINAL)
- [ ] **Run complete test suite** with real API integration
- [ ] **Validate WebAuthn passkey creation** end-to-end
- [ ] **Cross-browser compatibility testing** (Chrome, Safari, Firefox, Edge)
- [ ] **Mobile device testing** (iOS Safari, Android Chrome)
- [ ] **Security validation** of WebAuthn implementation

## Test Commands for Implementation

```bash
# Run failing real flow test to see current issues
pnpm test:real-flow

# Run all critical test stubs (shows what needs implementation)
pnpm test:critical-stubs

# Run individual test categories as they're implemented
pnpm test:auth-store-critical    # Auth store registration tests
pnpm test:webauthn              # WebAuthn flow tests
pnpm test:registration-form     # Registration form integration
pnpm test:email-verification    # Email verification flow
pnpm test:events                # Event emission validation
pnpm test:errors                # Error handling scenarios

# Run all critical tests (when implemented)
pnpm test:critical-only
```

## Links to Related Documentation

- **Migration Progress**: `flows.thepia.net/MIGRATION_PROGRESS.md`
- **Test Coverage Strategy**: `flows-auth/docs/testing/coverage-strategy.md`
- **Regression Analysis**: See MIGRATION_PROGRESS.md "CRITICAL REGRESSION ANALYSIS" section
- **Component Specifications**: `flows-auth/docs/specifications/`
- **API Documentation**: `flows-auth/docs/api/`

## Success Metrics

### Immediate Success (Phase 1)
- [ ] `createAccount-real-flow.test.ts` passes completely
- [ ] All production-blocking bugs fixed
- [ ] Component tests validate actual functionality

### Complete Success (All Phases)
- [ ] 100% test coverage for `createAccount` method
- [ ] WebAuthn passkey creation validated end-to-end
- [ ] All component integration tests pass with real auth store
- [ ] Comprehensive error handling validated
- [ ] Cross-platform compatibility confirmed

---

**CRITICAL STATUS**: Migration is **BLOCKED** until Phase 1 bugs are fixed
**Next Steps**: Fix production-blocking bugs before implementing test stubs
**Owner**: Development team
**Timeline**: Phase 1 must be completed before proceeding with migration
