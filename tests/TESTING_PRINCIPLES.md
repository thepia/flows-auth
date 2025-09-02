# Flows-Auth Testing Principles

## Overview

The flows-auth library follows the same testing principles established in the main Thepia codebase for Auth0 backend integration. These principles ensure reliable, maintainable, and production-ready authentication code.

## Core Testing Principles

### 1. **Dual Testing Strategy**

Following the pattern from `/tests/auth/`, we employ both:

- **Unit Tests with Mocks**: Fast, isolated component testing
- **Live Integration Tests**: Real backend validation against Auth0 API

### 2. **Environment-Based Testing**

```typescript
// Pattern from main codebase: /tests/auth/auth0Service-live-integration.test.ts
beforeAll(async () => {
  testEmail = process.env.TEST_AUTH_EMAIL || 'test-user@thepia.com';
  
  try {
    const response = await fetch('https://api.thepia.com/auth/check-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'ping@test.com' }),
    });
    apiAvailable = response.status !== undefined;
  } catch (error) {
    console.warn('Live API not available - skipping integration tests');
    apiAvailable = false;
  }
});
```

### 3. **Real Backend Validation**

Tests must validate against actual Auth0 API endpoints:
- `/auth/check-user` - User existence checking
- `/auth/webauthn/challenge` - WebAuthn challenge generation
- `/auth/webauthn/verify` - Passkey authentication
- `/auth/start-passwordless` - Passwordless authentication (magic links)

### 4. **Required API Availability for Integration Tests**

Integration tests MUST have a live API available. Unlike unit tests, integration tests validate real backend behavior and cannot pass by skipping when the API is unavailable.

```typescript
beforeAll(async () => {
  try {
    const response = await fetch(`${TEST_CONFIG.apiBaseUrl}/auth/check-user`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'ping@test.com' }),
    });
    
    if (!response.ok && response.status !== 400) {
      throw new Error(`API health check failed: ${response.status}`);
    }
    
    console.log(`✅ Live API available: ${TEST_CONFIG.apiBaseUrl}`);
    
  } catch (error) {
    throw new Error(`Integration tests require live API - cannot continue: ${error.message}`);
  }
});
```

### 5. **Test Account Management**

Following `/docs/auth/webauthn-test-strategy.md`:

```typescript
const TEST_ACCOUNTS = {
  // Predefined test accounts that exist in Auth0
  existingWithPasskey: {
    email: 'test-with-passkey@thepia.net',
    hasPasskey: true,
    userId: 'auth0|passkey-test-with-passkey@thepia.net-1234567890'
  },
  existingWithoutPasskey: {
    email: 'test-without-passkey@thepia.net', 
    hasPasskey: false,
    userId: 'auth0|test-without-passkey@thepia.net-1234567890'
  },
  // Dynamic test user creation for new user flows
  newUser: {
    email: `test-new-${Date.now()}@thepia.net`,
    shouldCreate: true
  }
};
```

### 6. **Challenge Store Key Consistency**

Critical pattern from `/tests/webauthn/challenge-store.test.ts`:

```typescript
test('challenge key consistency - registration vs authentication', () => {
  const email = 'test@example.com';
  const userId = `auth0|passkey-${email}-${Date.now()}`;
  
  // CRITICAL: Store with userId, retrieve with userId
  challengeStore.store(userId, challenge);
  const retrieved = challengeStore.retrieve(userId);
  
  expect(retrieved).toBeDefined();
});
```

### 7. **WebAuthn Error Classification**

Based on timing analysis from main codebase:

```typescript
test('should classify WebAuthn errors by timing', () => {
  // < 500ms = credential not found
  expect(classifyError(error, 300)).toBe('credential-not-found');
  
  // 500ms - 30s = user cancellation  
  expect(classifyError(error, 5000)).toBe('user-cancellation');
  
  // > 30s = credential mismatch/timeout
  expect(classifyError(error, 35000)).toBe('credential-mismatch');
});
```

### 8. **RP ID Validation**

Following `/docs/auth/webauthn-test-strategy.md`:

```typescript
test('RP ID configuration validation', () => {
  expect(getRpIdFromRequest(devRequest)).toBe('dev.thepia.com');
  expect(getRpIdFromRequest(prodRequest)).toBe('thepia.com');
  expect(getRpIdFromRequest(apiRequest)).not.toBe('api.thepia.com');
});
```

### 9. **Base64 Encoding Consistency**

Critical from WebAuthn regression testing:

```typescript
test('credential ID encoding consistency', () => {
  const credentialId = 'test-credential-123';
  const encoded = base64url.encode(credentialId);
  const decoded = base64url.decode(encoded);
  
  expect(decoded).toBe(credentialId);
  expect(encoded).not.toContain('+'); // No standard base64 chars
  expect(encoded).not.toContain('/');
  expect(encoded).not.toContain('=');
});
```

### 10. **Performance and Memory Testing**

```typescript
test('should not leak memory with rapid state transitions', () => {
  const initialMemory = process.memoryUsage().heapUsed;
  
  for (let i = 0; i < 1000; i++) {
    stateMachine.send({ type: 'EMAIL_TYPED', email: `test${i}@example.com` });
    stateMachine.send({ type: 'RESET_TO_COMBINED_AUTH' });
  }
  
  // Force garbage collection if available
  if (global.gc) global.gc();
  
  const finalMemory = process.memoryUsage().heapUsed;
  const memoryIncrease = finalMemory - initialMemory;
  
  expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024); // < 10MB increase
});
```

## Environment Variables

Following main codebase patterns:

| Variable | Purpose | Example |
|----------|---------|---------|
| `TEST_API_URL` | API endpoint for testing (overrides TEST_API_ENV) | `https://localhost:8443` or `https://api.thepia.com` |
| `TEST_API_ENV` | Environment to test against (`local` or `public`) | `local` (default) or `public` |
| `TEST_AUTH_EMAIL` | Email of test user with passkey | `test-with-passkey@thepia.net` |
| `AUTH0_DOMAIN` | Auth0 tenant domain | `thepia.eu.auth0.com` |
| `AUTH0_CLIENT_ID` | Auth0 client ID | `your-client-id` |
| `TEST_MODE` | Skip live API tests if 'mock' | `live` or `mock` |

## Test Categories

### 1. **Unit Tests** (`/tests/stores/`, `/tests/utils/`)
- Isolated component testing with mocks
- Fast execution (< 1 second total)
- No external dependencies
- 100% predictable results

### 2. **Integration Tests** (`/tests/integration/`)
- Real API endpoint testing
- WebAuthn flow validation
- State machine integration
- Error scenario coverage

### 3. **E2E Tests** (`/tests/e2e/` - planned)
- Full browser automation with Playwright
- Cross-browser WebAuthn testing
- Complete user journey validation

## Test Execution Commands

```bash
# Fast unit tests only
pnpm test:unit

# Live integration tests against local API (default)
pnpm test:integration

# Live integration tests against public API
TEST_API_ENV=public pnpm test:integration

# Test specific API URL
TEST_API_URL=https://custom.api.com pnpm test:integration

# State machine specific tests
pnpm test:state-machine

# All auth store tests
pnpm test:auth-store

# Full test suite with coverage
pnpm test:coverage

# Smoke tests (< 30 seconds)
pnpm test:smoke
```

## CI/CD Integration

```yaml
# .github/workflows/test.yml
jobs:
  test-flows-auth:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: pnpm install
      
      # Fast unit tests always run
      - name: Unit Tests
        run: pnpm test:unit
        
      # Integration tests only if API secrets available
      - name: Integration Tests
        if: ${{ secrets.TEST_API_URL }}
        run: pnpm test:integration
        env:
          TEST_API_URL: ${{ secrets.TEST_API_URL }}
          TEST_AUTH_EMAIL: ${{ secrets.TEST_AUTH_EMAIL }}
          AUTH0_CLIENT_ID: ${{ secrets.AUTH0_CLIENT_ID }}
```

## Security Considerations

1. **Test Data Isolation**: Use dedicated test accounts, never production data
2. **Secret Management**: Environment variables for sensitive config
3. **API Rate Limiting**: Respect API limits in integration tests
4. **Read-Only Testing**: Tests should only read data, not create/modify users
5. **Clean Test State**: Reset between tests to prevent interference

## Historical Bug Prevention

Based on `/docs/auth/webauthn-regression-testing-summary.md`, our tests prevent:

1. ✅ Challenge key mismatches (stored with userId but retrieved with email)
2. ✅ Email extraction regex failures (invalid userId format)
3. ✅ Base64 encoding conversion issues (credential ID format mismatches)
4. ✅ RP ID validation failures (incorrect domain handling)
5. ✅ Credential ID format mismatches (Uint8Array ↔ base64url)
6. ✅ Challenge storage key consistency (registration vs authentication)
7. ✅ Type conversion issues (Buffer ↔ Uint8Array ↔ base64url)

## Success Metrics

Following main codebase standards:

- ✅ **Zero regression bugs** for tested scenarios
- ✅ **100% test pass rate** in CI
- ✅ **< 1 second** unit test execution
- ✅ **< 30 seconds** smoke test execution
- 🎯 **95%+ code coverage** for critical paths
- 🎯 **100% API endpoint coverage**

## Code Review Checklist

Before merging auth-related changes:

- [ ] Challenge storage/retrieval key consistency
- [ ] Proper type conversions (Uint8Array ↔ base64url)
- [ ] Error handling completeness
- [ ] Test coverage for new functionality
- [ ] RP ID validation for all domains
- [ ] Base64 encoding consistency
- [ ] User ID format validation
- [ ] State machine transition coverage
- [ ] Integration test updates if API changes
- [ ] Performance impact assessment

## Related Documentation

- [WebAuthn Test Strategy](../../../docs/auth/webauthn-test-strategy.md)
- [E2E Test Scenarios](../../../docs/auth/e2e-test-scenarios.md)  
- [Live Integration Testing](../../../tests/auth/README-live-integration.md)
- [WebAuthn Regression Testing](../../../docs/auth/webauthn-regression-testing-summary.md)

This testing approach ensures the flows-auth library maintains the same high standards of reliability and production-readiness as the main Thepia authentication system.