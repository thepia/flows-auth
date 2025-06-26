# API Contract Testing Policy

## 🚨 CRITICAL POLICY: NO MOCKING IN INTEGRATION TESTS

**Effective Date**: 2025-01-26  
**Authority**: Engineering Leadership  
**Applies To**: All authentication API integration testing

## Policy Statement

Integration tests **MUST NOT mock networking, HTTP requests, or API calls** unless there is a crystal clear need and explicit sign-off from engineering leadership. Any mocking in integration tests requires the highest level of scrutiny.

## Documentation Requirements

### 1. API Contract Authority: thepia.com Repository

**thepia.com/docs/auth/** is the **single source of truth** for API behavior specifications.

**Required Documentation Structure:**
```
thepia.com/docs/auth/
├── api-contracts/
│   ├── authentication-endpoints.md    # Complete endpoint specifications
│   ├── request-response-schemas.md     # JSON schemas with examples
│   ├── error-codes-catalog.md         # All error scenarios
│   └── test-scenarios-catalog.md      # Organized by behavior
├── testing/
│   ├── contract-test-requirements.md  # API contract test specs
│   ├── test-data-requirements.md      # Required test accounts/data
│   └── environment-setup.md           # Test environment requirements
```

**Each API endpoint MUST have:**
- [ ] Complete request/response schemas
- [ ] All possible error scenarios documented
- [ ] Test scenarios organized by expected behavior
- [ ] Example requests and responses
- [ ] Performance requirements
- [ ] Rate limiting specifications

### 2. Client Integration Authority: flows-auth Repository

**flows-auth/docs/auth/api-integration/** documents how the client integrates with documented API contracts.

**Required Documentation Structure:**
```
flows-auth/docs/auth/api-integration/
├── server-contracts.md               # References thepia.com API contracts
├── integration-test-mapping.md       # Maps client tests to API scenarios
├── client-expectations.md            # What client expects from API
└── error-handling-strategy.md        # How client handles API errors
```

**Each integration test MUST:**
- [ ] Reference specific API contract scenarios from thepia.com/docs
- [ ] Test against real API endpoints (no mocking)
- [ ] Validate actual API behavior matches documented contracts
- [ ] Handle all documented error scenarios
- [ ] Test state machine transitions with real API responses

## Testing Requirements

### API Contract Tests (thepia.com/tests/)

**Purpose**: Validate that the API server implements documented contracts correctly.

**Requirements:**
- [ ] Every documented API endpoint has corresponding contract tests
- [ ] All documented error scenarios are tested
- [ ] Request/response schemas are validated
- [ ] Performance requirements are tested
- [ ] Rate limiting behavior is tested
- [ ] Authentication flows are tested end-to-end

**Test Organization:**
```typescript
// thepia.com/tests/auth/contracts/
describe('Authentication API Contracts', () => {
  describe('POST /auth/check-user', () => {
    it('T001: Valid existing user with passkey', async () => {
      // Test matches documented scenario T001
    });
    
    it('T002: Valid existing user without passkey', async () => {
      // Test matches documented scenario T002
    });
    
    it('T004: Invalid email format returns 400', async () => {
      // Test matches documented error scenario T004
    });
  });
});
```

### Integration Tests (flows-auth/tests/integration/)

**Purpose**: Validate that the client library integrates correctly with real API servers.

**CRITICAL REQUIREMENTS:**
- [ ] **NO MOCKING** of fetch, HTTP requests, or API calls
- [ ] Test against real API servers (local and production)
- [ ] Validate client behavior matches API contract expectations
- [ ] Test all state machine transitions with real API responses
- [ ] Test error handling with real API error responses

**Test Organization:**
```typescript
// flows-auth/tests/integration/
describe('API Integration Tests', () => {
  // Reference: thepia.com/docs/auth/test-scenarios/user-authentication.md
  describe('User Authentication Integration', () => {
    it('should handle existing user with passkey (T001)', async () => {
      // Tests against real API endpoint
      // Validates behavior matches thepia.com contract T001
      // Uses real test account: test-with-passkey@thepia.net
    });
  });
});
```

## Quality Assurance Checklists

### Pre-Implementation Checklist

**Before writing any integration test:**
- [ ] Verify API contract is documented in thepia.com/docs/auth/
- [ ] Confirm test scenario is defined in API contract documentation
- [ ] Verify test data/accounts exist in test environment
- [ ] Confirm no mocking is needed for test scenario
- [ ] Document any exceptions that might require mocking (requires sign-off)

### Code Review Checklist

**For any integration test changes:**
- [ ] Integration test uses real API calls (no mocking detected)
- [ ] Test references specific API contract scenario
- [ ] Test validates actual API behavior
- [ ] Error handling matches documented API error responses
- [ ] State machine transitions tested with real API responses
- [ ] Performance expectations align with API contract requirements

### Documentation Review Checklist

**For API contract documentation:**
- [ ] All endpoints have complete specifications
- [ ] Request/response schemas are comprehensive
- [ ] Error scenarios are completely documented
- [ ] Test scenarios are organized by behavior
- [ ] Examples are accurate and working
- [ ] Breaking changes are clearly marked

**For integration documentation:**
- [ ] References to API contracts are accurate and current
- [ ] Integration test mapping is complete
- [ ] Client expectations align with API contracts
- [ ] Error handling strategy matches API error specifications

## Change Management Process

### API Contract Changes (thepia.com)

1. **Documentation First**: Update API contracts before implementation
2. **Impact Assessment**: Analyze impact on flows-auth integration tests
3. **Test Updates**: Update contract tests before deploying API changes
4. **Client Notification**: Notify flows-auth team of changes
5. **Migration Period**: Provide backward compatibility during transitions

### Integration Test Changes (flows-auth)

1. **Contract Verification**: Verify changes align with API contracts
2. **Real API Testing**: Ensure tests work against real API endpoints
3. **Documentation Updates**: Update integration documentation
4. **No Mocking Review**: Verify no inappropriate mocking introduced

## Approval Process for Mocking Exceptions

**When mocking might be considered in integration tests:**

1. **Third-party services** outside thepia.com control
2. **Browser APIs** that cannot be realistically tested
3. **Hardware limitations** in CI environments

**Required approvals:**
- [ ] Technical justification documented
- [ ] Alternative approaches evaluated
- [ ] Engineering leadership sign-off
- [ ] Clear scope limitation (what is mocked and why)
- [ ] Mitigation strategy (how real behavior is validated elsewhere)

## Enforcement

This policy is enforced through:
- **Automated checks** in CI/CD pipeline detecting fetch mocking
- **Code review requirements** with integration test checklist
- **Documentation audits** ensuring contract completeness
- **Cross-repository validation** ensuring test alignment

**Policy violations will result in:**
- Immediate code review rejection
- Required remediation before merge
- Documentation of policy exception if justified
- Follow-up review to prevent recurring issues

## Success Metrics

- **Zero inappropriate mocking** in integration tests
- **100% API contract coverage** in thepia.com tests
- **100% integration test alignment** with API contracts
- **Documented test scenarios** for all authentication flows
- **Cross-repository test coordination** preventing integration failures

---

**Next Steps:**
1. Create API contract documentation in thepia.com/docs/auth/
2. Implement API contract tests in thepia.com/tests/
3. Update flows-auth integration tests to remove inappropriate mocking
4. Establish regular cross-repository documentation sync process

This policy ensures that integration tests validate real system behavior and that API contracts are the authoritative source of truth for system integration.