# Phase 1 Architecture Test Coverage Plan

## Overview

This document outlines comprehensive test coverage plans for the Phase 1 architecture refactoring completed in flows-auth. The Phase 1 work centralized UI configuration logic in AuthStore and implemented the translation key pattern across all components.

## ✅ Completed Test Coverage

### AuthStore UI Configuration Tests
- **File**: `tests/stores/auth-store-ui-config.test.ts`
- **Coverage**: 18 tests covering `getButtonConfig()` and `getStateMessageConfig()` methods
- **Scenarios**: Button configuration, state messages, passkey scenarios, translation keys

### Component Integration Tests
- **AuthButton**: Fixed disabled state logic and button configuration
- **SignInCore**: Updated to use centralized button configuration
- **SignInForm**: Added "Powered by Thepia" footer and fixed test expectations
- **All existing tests**: 228 tests passing ✅

## 🎯 Planned Test Coverage (Future Implementation)

### 1. AuthButton Component Tests for New Architecture

**File**: `tests/components/AuthButton-buttonConfig.test.ts`

**Test Categories**:
- **ButtonConfig Pattern Tests**:
  - Should accept `buttonConfig` prop and use internal translation
  - Should maintain backward compatibility with legacy props
  - Should prioritize `buttonConfig` over legacy props when both provided
  - Should handle null `buttonConfig` gracefully

- **Translation Key Handling**:
  - Should translate `textKey` and `loadingTextKey` internally
  - Should update text reactively when i18n store changes
  - Should handle missing translation keys gracefully

- **Disabled State Logic**:
  - Should use `buttonConfig.disabled` when available
  - Should combine `buttonConfig.disabled` with loading state
  - Should fall back to legacy `disabled` prop when no buttonConfig

### 2. Integration Tests for Phase 1 Architecture

**File**: `tests/integration/phase1-architecture.test.ts`

**Test Categories**:
- **End-to-End UI Configuration Flow**:
  - AuthStore → ButtonConfig → AuthButton → Rendered UI
  - AuthStore → StateMessageConfig → AuthStateMessage → Rendered UI
  - Configuration changes propagate through entire component tree

- **Translation Key Flow**:
  - Translation keys flow from AuthStore to components
  - Components handle translation internally
  - No manual `$_()` calls in SignInCore

- **Reactive Configuration Updates**:
  - Button configuration updates when auth state changes
  - State message configuration updates when sign-in state changes
  - UI reflects configuration changes immediately

### 3. Component Translation Key Pattern Tests

**Files**: 
- `tests/components/EmailInput-translation-keys.test.ts`
- `tests/components/CodeInput-translation-keys.test.ts`

**Test Categories**:
- **Translation Key Props**:
  - Should accept `labelKey`, `placeholderKey`, `errorKey` props
  - Should translate keys internally using i18n store
  - Should fall back to default keys when custom keys not provided

- **Reactive Translation Updates**:
  - Should update text when i18n store language changes
  - Should handle missing translation keys gracefully
  - Should maintain accessibility attributes during translation updates

### 4. Performance Tests for Centralized UI Configuration

**File**: `tests/performance/ui-configuration.test.ts`

**Test Categories**:
- **Configuration Method Performance**:
  - `getButtonConfig()` should execute in <1ms for typical scenarios
  - `getStateMessageConfig()` should execute in <1ms for typical scenarios
  - Configuration methods should not cause memory leaks

- **Reactive Update Performance**:
  - Configuration changes should trigger minimal re-renders
  - Button configuration updates should not affect unrelated components
  - State message updates should be debounced appropriately

### 5. State Machine Integration Tests

**File**: `tests/integration/state-machine-ui-config.test.ts`

**Test Categories**:
- **State Transition UI Updates**:
  - Button configuration updates correctly across all SignInState transitions
  - State message configuration reflects current state accurately
  - UI configuration handles edge cases and error states

- **Complex Scenario Testing**:
  - User with passkeys + valid PIN → correct button configuration
  - New user in login-only mode → correct state message
  - Configuration changes during authentication flow

## 🔧 Testing Infrastructure Improvements

### Mock Strategy Enhancements
- **WebAuthn Mocking**: Consistent WebAuthn support mocking across all tests
- **i18n Mocking**: Proper svelte-i18n store mocking for translation tests
- **AuthStore Mocking**: Reusable AuthStore mock configurations for different scenarios

### Test Utilities
- **Configuration Builders**: Helper functions to create test AuthStore configurations
- **State Builders**: Helper functions to create specific auth states for testing
- **Assertion Helpers**: Custom matchers for button configuration and state message validation

### Test Organization
- **Shared Test Setup**: Common test setup for Phase 1 architecture tests
- **Test Data**: Centralized test data for different user scenarios and configurations
- **Test Categories**: Clear separation between unit, integration, and performance tests

## 📋 Implementation Priority

### High Priority (Next Sprint)
1. **AuthButton buttonConfig pattern tests** - Critical for component reliability
2. **Integration tests for UI configuration flow** - Validates architecture works end-to-end

### Medium Priority (Following Sprint)
3. **EmailInput/CodeInput translation key tests** - Completes component coverage
4. **State machine integration tests** - Validates complex scenarios

### Low Priority (Future Sprints)
5. **Performance tests** - Optimization and monitoring
6. **Advanced edge case testing** - Comprehensive scenario coverage

## 🎯 Success Criteria

- **Test Coverage**: >95% coverage for new AuthStore UI configuration methods
- **Component Coverage**: All components using translation key pattern have dedicated tests
- **Integration Coverage**: End-to-end flows from AuthStore to rendered UI validated
- **Performance**: UI configuration methods perform within acceptable limits
- **Reliability**: All tests pass consistently across different environments

## 📝 Notes

- Tests should validate actual implementation behavior, not expected behavior
- Focus on testing the architecture patterns, not just individual functions
- Ensure tests remain maintainable as we migrate to Paraglide JS in Phase 2
- Consider test migration strategy for Paraglide JS (Phase 2) compatibility

---

**Status**: Phase 1 architecture complete, comprehensive test coverage planned for future implementation
**Next Phase**: Paraglide JS migration (Phase 2)
