# Auth Store Test Scenarios

## Overview

This document outlines comprehensive test scenarios for the flows-auth library, focusing on integration testing against real API endpoints with various user account types and edge cases.

## Test Environment Setup

### API Endpoints
- **Local Development**: `https://dev.thepia.com:8443` (requires local API server. This is swapped in by the API client)
- **Production Environment**: `https://api.thepia.com`
- **Test Environment**: Configurable via `TEST_API_URL` environment variable

### Test Accounts Required

Create these test accounts in your test environment:

```typescript
const TEST_ACCOUNTS = {
  // User with registered passkey
  existingWithPasskey: {
    email: 'test-with-passkey@thepia.net',
    hasPasskey: true,
    passkeyDevices: ['Touch ID', 'Security Key']
  },
  
  // User without passkey  
  existingWithoutPasskey: {
    email: 'test-without-passkey@thepia.net',
    hasPasskey: false,
  },
  
  // Account for testing passkey registration
  newUserRegistration: {
    email: 'test-registration@thepia.net',
    shouldCreate: true // Will be created during tests
  },
  
  // Account for rate limiting tests
  rateLimitingTest: {
    email: 'test-rate-limit@thepia.net',
    hasPasskey: false,
    maxRequests: 5 // For testing rate limiting
  }
};
```

## Core Test Scenarios

### 1. State Machine Integration Tests

#### 1.1 Complete Authentication Flows
- [ ] **New User Registration Flow**
  - Start → Combined Auth → Email Entry → User Not Found → Registration
  - Verify state transitions: `checkingSession` → `sessionInvalid` → `combinedAuth` → `conditionalMediation` → `explicitAuth` → `auth0UserLookup` → `newUserRegistration`
  - Test API calls: `/auth/check-user` returns `exists: false`
  - Expected outcome: User registration form or magic link sent

- [ ] **Returning User with Passkey Flow**
  - Start → Combined Auth → Email Entry → Conditional Mediation → Passkey Auth → Success
  - Verify state transitions through conditional authentication
  - Test WebAuthn conditional mediation with `autocomplete="email webauthn"`
  - Expected outcome: Silent authentication via passkey autofill

- [ ] **Returning User without Passkey Flow**
  - Start → Combined Auth → Email Entry → Explicit Auth → Passkey Registration Offer
  - Verify user lookup shows `exists: true, hasPasskey: false`
  - Test magic link fallback option
  - Expected outcome: Passkey registration prompt or magic link

#### 1.2 Error Handling and Recovery
- [ ] **WebAuthn Error Classification**
  - Quick failure (< 500ms): `credentialNotFound`
  - User cancellation (500ms - 30s): `userCancellation` 
  - Timeout (> 30s): `credentialMismatch`
  - Test error state transitions and recovery options

- [ ] **Network Error Handling**
  - API server unreachable
  - Timeout errors
  - Rate limiting responses (429)
  - Invalid response formats

- [ ] **State Recovery**
  - Browser refresh during authentication
  - Page navigation during flow
  - Network reconnection scenarios

### 2. WebAuthn Integration Tests

#### 2.1 Conditional Mediation (Autofill)
- [ ] **Successful Conditional Authentication**
  ```typescript
  // Test scenario
  await authStore.startConditionalAuthentication('test-with-passkey@thepia.net');
  // Should trigger passkey autofill in email field
  // Should complete authentication silently if user selects passkey
  ```

- [ ] **Conditional Authentication with No Passkeys**
  ```typescript
  // Test scenario  
  await authStore.startConditionalAuthentication('test-without-passkey@thepia.net');
  // Should return false without showing any UI
  // Should not interfere with normal flow
  ```

- [ ] **Conditional Authentication Browser Support**
  - Test in browsers with/without conditional mediation support
  - Graceful degradation when `PublicKeyCredential.isConditionalMediationAvailable()` returns false

#### 2.2 Explicit WebAuthn Authentication
- [ ] **Direct Passkey Authentication**
  ```typescript
  // Test scenario
  await authStore.signInWithPasskey('test-with-passkey@thepia.net');
  // Should show biometric prompt immediately
  // Should complete authentication on success
  ```

- [ ] **Passkey Authentication Failures**
  - User cancellation (Touch ID cancelled)
  - Wrong finger/biometric
  - Security key removed
  - Device locked

#### 2.3 Cross-Device Authentication
- [ ] **QR Code Flow** (if supported)
  - Desktop initiates authentication
  - Mobile device completes passkey authentication
  - Cross-device synchronization

### 3. API Integration Tests

#### 3.1 User Check Endpoint
- [ ] **Existing User Detection**
  ```http
  POST /auth/check-user
  Content-Type: application/json
  
  { "email": "test-with-passkey@thepia.net" }
  
  Expected Response:
  {
    "exists": true,
    "hasPasskey": true, 
  }
  ```

- [ ] **New User Detection**
  ```http
  POST /auth/check-user
  Content-Type: application/json
  
  { "email": "new-user@thepia.net" }
  
  Expected Response:
  {
    "exists": false,
    "hasPasskey": false,
  }
  ```

#### 3.2 Passkey Challenge Endpoint
- [ ] **Valid Challenge Generation**
  ```http
  POST /auth/webauthn/challenge
  Content-Type: application/json
  
  { "email": "test-with-passkey@thepia.net" }
  
  Expected Response:
  {
    "challenge": "base64-encoded-challenge",
    "rpId": "thepia.net",
    "allowCredentials": [
      {
        "id": "credential-id",
        "type": "public-key"
      }
    ],
    "timeout": 60000
  }
  ```

- [ ] **Invalid Email Handling**
  ```http
  POST /auth/webauthn/challenge
  Content-Type: application/json
  
  { "email": "nonexistent@thepia.net" }
  
  Expected Response: 404 or appropriate error
  ```

#### 3.3 Passwordless Authentication Endpoint
- [ ] **Passwordless Authentication (Magic Link)**
  ```http
  POST /auth/start-passwordless
  Content-Type: application/json
  
  {
    "email": "test-without-passkey@thepia.net",
    "clientId": "your-client-id"
  }
  
  Expected Response:
  {
    "success": true,
    "timestamp": 1234567890,
    "message": "Check your email for the sign-in link",
    "user": {
      "email": "test-without-passkey@thepia.net",
      "id": "user-id"
    }
  }
  ```

#### 3.4 Authentication Completion
- [ ] **Passkey Authentication**
  ```http
  POST /auth/webauthn/verify
  Content-Type: application/json
  
  {
    "email": "test-with-passkey@thepia.net",
    "challengeId": "challenge-id",
    "clientId": "your-client-id",
    "credential": {
      "id": "credential-id",
      "rawId": "base64-raw-id",
      "response": {
        "clientDataJSON": "base64-client-data",
        "authenticatorData": "base64-auth-data", 
        "signature": "base64-signature",
        "userHandle": "base64-user-handle"
      },
      "type": "public-key"
    }
  }
  
  Expected Response:
  {
    "step": "success",
    "user": { ... },
    "accessToken": "jwt-access-token",
    "refreshToken": "jwt-refresh-token", 
    "expiresIn": 3600
  }
  ```

### 4. Performance and Load Tests

#### 4.1 Concurrent Authentication Attempts
- [ ] **Multiple Sign-in Attempts**
  - Start 10 concurrent authentication flows
  - Verify all complete without interference
  - Check for race conditions in state management

- [ ] **Rapid State Transitions**
  - Execute 100 rapid state machine transitions
  - Verify state consistency and no memory leaks
  - Performance should remain responsive

#### 4.2 Memory and Resource Management
- [ ] **Store Creation/Destruction**
  - Create and destroy 100 auth stores
  - Verify no memory leaks
  - Check event listener cleanup

- [ ] **Long-Running Sessions**
  - Keep authenticated session for extended period
  - Test token refresh mechanisms
  - Verify session persistence across page reloads

### 5. Edge Cases and Error Scenarios

#### 5.1 Network Conditions
- [ ] **Slow Network Simulation**
  - Simulate 3G/slow connections
  - Test timeout handling
  - Verify user feedback during delays

- [ ] **Intermittent Connectivity**
  - Network drops during authentication
  - Recovery when connection restored
  - Retry mechanisms

#### 5.2 Browser Compatibility
- [ ] **Safari WebAuthn Quirks**
  - Touch ID authentication
  - Conditional mediation support differences
  - Cross-origin iframe restrictions

- [ ] **Chrome/Edge WebAuthn**
  - Windows Hello integration
  - Security key support
  - Platform authenticator preferences

- [ ] **Firefox WebAuthn**
  - Limited conditional mediation
  - Fallback behavior verification

#### 5.3 Security Edge Cases
- [ ] **CSRF Protection**
  - Verify proper CSRF token handling
  - Test with malicious requests

- [ ] **Rate Limiting**
  - Trigger rate limits with rapid requests
  - Verify proper error handling and backoff

- [ ] **Token Expiration**
  - Test with expired access tokens
  - Verify refresh token mechanism
  - Handle refresh token expiration

### 6. User Experience Scenarios

#### 6.1 Accessibility
- [ ] **Screen Reader Compatibility**
  - Verify ARIA labels and announcements
  - Test keyboard navigation
  - Error message accessibility

- [ ] **High Contrast Mode**
  - Visual elements remain accessible
  - Error states clearly visible

#### 6.2 Mobile Experience
- [ ] **Touch ID/Face ID Integration**
  - Native biometric prompts
  - Error handling for biometric failures

- [ ] **Android Fingerprint**
  - Platform authenticator integration
  - Cross-device authentication

## Running the Tests

### Environment Setup
```bash
# Set test API endpoint
export TEST_API_URL=https://api.dev.thepia.net

# Run all tests
pnpm test

# Run integration tests only
pnpm test tests/integration/

# Run with coverage
pnpm test:coverage

# Run specific test scenarios
pnpm test auth-store-integration.test.ts
pnpm test auth-state-machine.test.ts
```

### Test Data Management
```bash
# Setup test accounts (run before tests)
npm run test:setup

# Cleanup test data (run after tests)
npm run test:cleanup
```

### Continuous Integration
```yaml
# .github/workflows/test.yml
- name: Run Integration Tests
  env:
    TEST_API_URL: ${{ secrets.TEST_API_URL }}
    TEST_CLIENT_ID: ${{ secrets.TEST_CLIENT_ID }}
  run: |
    pnpm test:integration
    pnpm test:coverage
```

## Success Criteria

- [ ] **100% State Machine Coverage**: All documented states and transitions tested
- [ ] **API Integration**: All endpoints tested with various inputs and error conditions  
- [ ] **WebAuthn Compatibility**: Tests pass across Chrome, Safari, Firefox
- [ ] **Performance**: No memory leaks, transitions complete within 100ms
- [ ] **Error Recovery**: All error states have tested recovery paths
- [ ] **Cross-Device**: Authentication flows work across desktop/mobile
- [ ] **Production Readiness**: Tests can run against production API safely

## Reporting

Test results should include:
- State machine transition coverage
- API endpoint success/failure rates
- WebAuthn compatibility matrix
- Performance benchmarks
- Memory usage analysis
- Error recovery validation

This comprehensive test suite ensures the flows-auth library is production-ready with solid integration against real API endpoints and robust error handling across all supported scenarios.