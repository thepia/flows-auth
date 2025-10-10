# 🚨 BREAKING CHANGES CHECKLIST

**STOP!** Before making changes to authentication patterns, complete this checklist.

## Critical Authentication Components

These components are **PROTECTED** and require special care:

### 🔒 **CRITICAL FILES** - Require Full Test Coverage
- [ ] `src/stores/auth-store.ts` - Core authentication logic
- [ ] `src/utils/sessionManager.ts` - Session persistence
- [ ] `src/stores/auth-state-machine.ts` - State transitions
- [ ] `src/api/auth-api.ts` - API communication
- [ ] `src/types/index.ts` - Type definitions

### 📋 **API CONTRACTS** - Cannot Break Without Migration
- [ ] `signInWithPasskey` response format handling
- [ ] Session storage key: `'thepia_auth_session'`
- [ ] Authentication state transitions
- [ ] Event emission patterns

## Pre-Change Requirements

### 1. **Test Coverage Verification**
- [ ] Run: `pnpm test contracts/api-response-contracts.test.ts`
- [ ] Run: `pnpm test integration/api-response-format.test.ts`
- [ ] Verify: All critical tests pass
- [ ] Coverage: Authentication flows have 100% test coverage

### 2. **API Compatibility Check**
- [ ] New API response format: `{success: true, tokens: {...}, user: {...}}`
- [ ] Legacy API response format: `{step: 'success', access_token: '...', user: {...}}`
- [ ] Both formats must be supported simultaneously
- [ ] Session normalization must work for both formats

### 3. **Session Management Verification**
- [ ] `saveAuthSession()` called on successful authentication
- [ ] Session saved to correct storage (sessionStorage/localStorage)
- [ ] Storage key consistency across all components
- [ ] Session data format matches `SignInResponse` interface

### 4. **State Management Verification**
- [ ] Store state updates to `'authenticated'` on success
- [ ] User, tokens, and expiration set correctly
- [ ] No state updates on authentication failure
- [ ] Event emission follows established patterns

## Change Impact Assessment

### **LOW RISK** ✅
- Adding new optional fields to existing interfaces
- Adding new authentication methods (with tests)
- Improving error messages
- Adding debug logging (non-sensitive data only)

### **MEDIUM RISK** ⚠️
- Modifying existing method signatures
- Changing default configuration values
- Adding new required dependencies
- Modifying event payloads

### **HIGH RISK** 🚨
- Changing API response format handling
- Modifying session storage keys or format
- Changing authentication state transitions
- Removing or renaming existing methods

### **BREAKING CHANGES** 💥
- Removing support for legacy API formats
- Changing session storage key
- Modifying core authentication flow
- Breaking existing type definitions

## Required Actions by Risk Level

### For **MEDIUM RISK** Changes:
1. [ ] Update all relevant tests
2. [ ] Update documentation
3. [ ] Test with flows.thepia.net integration
4. [ ] Get code review from auth system owner

### For **HIGH RISK** Changes:
1. [ ] Complete full test suite update
2. [ ] Create migration guide
3. [ ] Test with all consuming applications
4. [ ] Staged rollout plan
5. [ ] Rollback plan documented

### For **BREAKING CHANGES**:
1. [ ] **STOP** - Requires architecture review
2. [ ] Create RFC (Request for Comments)
3. [ ] Migration strategy for all consumers
4. [ ] Backward compatibility period plan
5. [ ] Communication plan for all stakeholders

## Post-Change Verification

### 1. **Test Suite Execution**
- [ ] All contract tests pass: `pnpm test contracts/`
- [ ] All integration tests pass: `pnpm test integration/`
- [ ] All unit tests pass: `pnpm test`
- [ ] Coverage remains at 100% for critical paths

### 2. **Integration Testing**
- [ ] flows.thepia.net authentication works
- [ ] Session persistence works on page reload
- [ ] All authentication methods function correctly
- [ ] Error handling works as expected

### 3. **Performance Verification**
- [ ] Authentication timing within acceptable limits
- [ ] No memory leaks in authentication flow
- [ ] Session storage operations remain fast
- [ ] No regression in user experience

## Emergency Rollback Plan

If authentication breaks in production:

### **Immediate Actions** (< 5 minutes)
1. [ ] Revert to last known good commit
2. [ ] Deploy immediately
3. [ ] Verify authentication works
4. [ ] Notify stakeholders

### **Investigation** (< 30 minutes)
1. [ ] Identify root cause
2. [ ] Check which tests failed to catch the issue
3. [ ] Document the failure mode
4. [ ] Plan proper fix

### **Prevention** (< 24 hours)
1. [ ] Add tests to catch the specific failure
2. [ ] Update this checklist if needed
3. [ ] Improve CI/CD pipeline if necessary
4. [ ] Conduct post-mortem review

## Approval Requirements

### **Code Review Requirements**
- [ ] At least 2 reviewers for HIGH RISK changes
- [ ] Auth system owner approval for BREAKING CHANGES
- [ ] Security team review for authentication logic changes

### **Testing Requirements**
- [ ] All automated tests pass
- [ ] Manual testing completed
- [ ] Integration testing with consuming apps
- [ ] Performance testing if applicable

### **Documentation Requirements**
- [ ] API documentation updated
- [ ] Migration guide created (if needed)
- [ ] CHANGELOG.md updated
- [ ] Breaking changes documented

---

## 🔒 **REMEMBER**: Authentication is critical infrastructure. When in doubt, ask for help rather than risk breaking user access.
