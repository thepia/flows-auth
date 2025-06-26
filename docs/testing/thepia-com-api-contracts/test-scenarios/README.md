# Test Scenarios Organization

**Comprehensive test scenario catalog organized by API behavior with unique identifiers**

## Test Scenario Principles

### **Scenario Numbering System**
- **T001-T010**: User Authentication behaviors
- **T011-T020**: WebAuthn Challenge behaviors  
- **T021-T030**: WebAuthn Verification behaviors
- **T031-T040**: Magic Link behaviors
- **T041-T050**: Health & Status behaviors

### **Scenario Structure**
Each test scenario includes:
- **Unique ID**: T### for easy reference
- **Description**: What behavior is being tested
- **Preconditions**: Required setup state
- **Input**: Request data
- **Expected Output**: Response data and status
- **Test Data**: Required test accounts/data

---

## User Authentication Scenarios (T001-T010)

**Endpoint**: `POST /auth/check-user`

### **T001: Valid existing user with passkey**
**Description**: User exists in system and has registered WebAuthn credential
**Preconditions**: 
- User `test-with-passkey@thepia.net` exists in database
- User has at least one registered WebAuthn credential
**Input**:
```json
{ "email": "test-with-passkey@thepia.net" }
```
**Expected Output**:
```json
{
  "status": 200,
  "body": {
    "userExists": true,
    "hasPasskey": true,
    "email": "test-with-passkey@thepia.net",
    "userId": "usr_test_with_passkey"
  }
}
```

### **T002: Valid existing user without passkey**
**Description**: User exists but has no WebAuthn credentials
**Preconditions**: 
- User `test-without-passkey@thepia.net` exists in database
- User has zero registered WebAuthn credentials
**Input**:
```json
{ "email": "test-without-passkey@thepia.net" }
```
**Expected Output**:
```json
{
  "status": 200,
  "body": {
    "userExists": true,
    "hasPasskey": false,
    "email": "test-without-passkey@thepia.net",
    "userId": "usr_test_without_passkey"
  }
}
```

### **T003: New user (does not exist)**
**Description**: Email not registered in system
**Preconditions**: 
- Email `test-new-user@thepia.net` does not exist in database
**Input**:
```json
{ "email": "test-new-user@thepia.net" }
```
**Expected Output**:
```json
{
  "status": 200,
  "body": {
    "userExists": false,
    "hasPasskey": false,
    "email": "test-new-user@thepia.net"
  }
}
```

### **T004: Invalid email format**
**Description**: Email format validation failure
**Preconditions**: None
**Input**:
```json
{ "email": "not-an-email" }
```
**Expected Output**:
```json
{
  "status": 400,
  "body": {
    "error": "invalid_email",
    "message": "Invalid email format",
    "details": { "field": "email", "value": "not-an-email" }
  }
}
```

### **T005: Missing email field**
**Description**: Required field validation failure
**Preconditions**: None
**Input**:
```json
{}
```
**Expected Output**:
```json
{
  "status": 400,
  "body": {
    "error": "missing_email",
    "message": "Email field is required",
    "details": { "field": "email" }
  }
}
```

---

## WebAuthn Challenge Scenarios (T011-T020)

**Endpoint**: `POST /auth/webauthn/challenge`

### **T011: Valid challenge for user with passkey**
**Description**: Generate challenge for user with registered credentials
**Preconditions**: 
- User `test-with-passkey@thepia.net` exists with registered credential
**Input**:
```json
{ "email": "test-with-passkey@thepia.net" }
```
**Expected Output**:
```json
{
  "status": 200,
  "body": {
    "challenge": "base64url-encoded-challenge",
    "rpId": "thepia.net",
    "allowCredentials": [
      {
        "type": "public-key",
        "id": "credential-id-base64url"
      }
    ],
    "timeout": 60000,
    "userVerification": "preferred"
  }
}
```

### **T012: Valid challenge for user without passkey**
**Description**: Generate challenge for user without credentials
**Preconditions**: 
- User `test-without-passkey@thepia.net` exists without credentials
**Input**:
```json
{ "email": "test-without-passkey@thepia.net" }
```
**Expected Output**:
```json
{
  "status": 200,
  "body": {
    "challenge": "base64url-encoded-challenge",
    "rpId": "thepia.net",
    "allowCredentials": [],
    "timeout": 60000,
    "userVerification": "preferred"
  }
}
```

### **T013: User does not exist**
**Description**: Challenge request for non-existent user
**Preconditions**: 
- Email `nonexistent@thepia.net` does not exist
**Input**:
```json
{ "email": "nonexistent@thepia.net" }
```
**Expected Output**:
```json
{
  "status": 404,
  "body": {
    "error": "user_not_found",
    "message": "User does not exist",
    "details": { "email": "nonexistent@thepia.net" }
  }
}
```

### **T014: Invalid email format**
**Description**: Email validation in challenge request
**Preconditions**: None
**Input**:
```json
{ "email": "invalid-email" }
```
**Expected Output**:
```json
{
  "status": 400,
  "body": {
    "error": "invalid_email",
    "message": "Invalid email format",
    "details": { "field": "email" }
  }
}
```

### **T015: Rate limited challenge request**
**Description**: Too many challenge requests from same IP
**Preconditions**: 
- Previous 10 requests within last minute from same IP
**Input**:
```json
{ "email": "test-with-passkey@thepia.net" }
```
**Expected Output**:
```json
{
  "status": 429,
  "body": {
    "error": "rate_limited",
    "message": "Too many challenge requests",
    "details": { "retryAfter": 60 }
  }
}
```

---

## WebAuthn Verification Scenarios (T021-T030)

**Endpoint**: `POST /auth/webauthn/verify`

### **T021: Valid passkey authentication**
**Description**: Successful WebAuthn credential verification
**Preconditions**: 
- Valid challenge generated for user
- User has registered credential
- WebAuthn response is valid
**Input**:
```json
{
  "email": "test-with-passkey@thepia.net",
  "credentialResponse": {
    "id": "credential-id",
    "rawId": "credential-raw-id",
    "response": {
      "authenticatorData": "auth-data",
      "clientDataJSON": "client-data",
      "signature": "signature"
    },
    "type": "public-key"
  }
}
```
**Expected Output**:
```json
{
  "status": 200,
  "body": {
    "success": true,
    "sessionToken": "jwt-session-token",
    "user": {
      "id": "usr_test_with_passkey",
      "email": "test-with-passkey@thepia.net",
      "name": "Test User"
    },
    "expiresAt": "2024-01-15T11:30:00Z"
  }
}
```

### **T022: Invalid credential response**
**Description**: WebAuthn verification failure
**Preconditions**: 
- Valid challenge generated
- Invalid or corrupted WebAuthn response
**Input**:
```json
{
  "email": "test-with-passkey@thepia.net",
  "credentialResponse": {
    "id": "invalid-credential",
    "rawId": "invalid-raw-id",
    "response": {
      "authenticatorData": "invalid-data",
      "clientDataJSON": "invalid-client-data",
      "signature": "invalid-signature"
    },
    "type": "public-key"
  }
}
```
**Expected Output**:
```json
{
  "status": 400,
  "body": {
    "error": "invalid_credential",
    "message": "Invalid WebAuthn credential response",
    "details": { "reason": "signature_verification_failed" }
  }
}
```

### **T023: Expired challenge**
**Description**: Challenge timeout exceeded
**Preconditions**: 
- Challenge generated more than 5 minutes ago
**Input**:
```json
{
  "email": "test-with-passkey@thepia.net",
  "credentialResponse": {
    "id": "credential-id",
    "rawId": "credential-raw-id",
    "response": {
      "authenticatorData": "auth-data",
      "clientDataJSON": "expired-client-data",
      "signature": "signature"
    },
    "type": "public-key"
  }
}
```
**Expected Output**:
```json
{
  "status": 400,
  "body": {
    "error": "challenge_expired",
    "message": "WebAuthn challenge has expired",
    "details": { "expiresAt": "2024-01-15T10:30:00Z" }
  }
}
```

---

## Magic Link Scenarios (T031-T040)

**Endpoint**: `POST /auth/signin/magic-link`

### **T031: Valid magic link request**
**Description**: Send magic link to valid email
**Preconditions**: 
- User `test-magic-link@thepia.net` exists or will be created
**Input**:
```json
{
  "email": "test-magic-link@thepia.net",
  "redirectUrl": "https://app.thepia.net/dashboard"
}
```
**Expected Output**:
```json
{
  "status": 200,
  "body": {
    "success": true,
    "message": "Magic link sent to your email",
    "expiresAt": "2024-01-15T10:45:00Z"
  }
}
```

### **T032: Magic link for user with passkey**
**Description**: Magic link request for user who has passkey option
**Preconditions**: 
- User `test-with-passkey@thepia.net` exists with registered passkey
**Input**:
```json
{
  "email": "test-with-passkey@thepia.net",
  "redirectUrl": "https://app.thepia.net/dashboard"
}
```
**Expected Output**:
```json
{
  "status": 200,
  "body": {
    "success": true,
    "message": "Magic link sent. You can also use your passkey to sign in.",
    "expiresAt": "2024-01-15T10:45:00Z"
  }
}
```

### **T033: Rate limited magic link request**
**Description**: Too many magic link requests for same email
**Preconditions**: 
- 3 magic link requests sent to same email in last 5 minutes
**Input**:
```json
{
  "email": "test-magic-link@thepia.net"
}
```
**Expected Output**:
```json
{
  "status": 429,
  "body": {
    "error": "rate_limited",
    "message": "Too many magic link requests",
    "details": { "retryAfter": 300 }
  }
}
```

### **T034: Invalid email format**
**Description**: Email validation for magic link
**Preconditions**: None
**Input**:
```json
{
  "email": "invalid-email-format"
}
```
**Expected Output**:
```json
{
  "status": 400,
  "body": {
    "error": "invalid_email",
    "message": "Invalid email format",
    "details": { "field": "email" }
  }
}
```

### **T035: Invalid redirect URL**
**Description**: Redirect URL validation failure
**Preconditions**: None
**Input**:
```json
{
  "email": "test@thepia.net",
  "redirectUrl": "http://insecure-site.com"
}
```
**Expected Output**:
```json
{
  "status": 400,
  "body": {
    "error": "invalid_redirect_url",
    "message": "Invalid redirect URL format",
    "details": { "reason": "https_required" }
  }
}
```

---

## Health & Status Scenarios (T041-T050)

**Endpoint**: `GET /health`

### **T041: Healthy API**
**Description**: All services operational
**Preconditions**: 
- Database accessible
- Auth0 service accessible
- All systems nominal
**Input**: None (GET request)
**Expected Output**:
```json
{
  "status": 200,
  "body": {
    "status": "healthy",
    "timestamp": "2024-01-15T10:30:00Z",
    "version": "1.0.0",
    "services": {
      "database": "healthy",
      "auth0": "healthy"
    }
  }
}
```

### **T042: Degraded API**
**Description**: Some services have issues but API functional
**Preconditions**: 
- One non-critical service experiencing issues
**Input**: None (GET request)
**Expected Output**:
```json
{
  "status": 200,
  "body": {
    "status": "degraded",
    "timestamp": "2024-01-15T10:30:00Z",
    "services": {
      "database": "healthy",
      "auth0": "unhealthy"
    }
  }
}
```

### **T043: Unhealthy API**
**Description**: Critical services unavailable
**Preconditions**: 
- Database or other critical service unavailable
**Input**: None (GET request)
**Expected Output**:
```json
{
  "status": 503,
  "body": {
    "status": "unhealthy",
    "timestamp": "2024-01-15T10:30:00Z",
    "services": {
      "database": "unhealthy",
      "auth0": "healthy"
    }
  }
}
```

---

## Test Data Requirements

### **Required Test Accounts**
```json
{
  "test-with-passkey@thepia.net": {
    "userId": "usr_test_with_passkey",
    "hasPasskey": true,
    "credentials": [
      {
        "id": "test-credential-id-1",
        "publicKey": "...",
        "counter": 0
      }
    ]
  },
  "test-without-passkey@thepia.net": {
    "userId": "usr_test_without_passkey",
    "hasPasskey": false,
    "credentials": []
  },
  "test-magic-link@thepia.net": {
    "userId": "usr_test_magic_link",
    "hasPasskey": false,
    "credentials": []
  }
}
```

### **Test Data Setup Script**
```bash
# Create required test accounts
curl -X POST localhost:8443/dev/setup-test-data \
  -H "Content-Type: application/json" \
  -d @test-accounts.json
```

---

## Cross-Repository Test References

### **flows-auth Integration Tests**
Integration tests should reference these scenarios:

```typescript
describe('User Authentication', () => {
  it('should handle existing user with passkey (T001)', async () => {
    // Test implementation references scenario T001
  });
  
  it('should handle existing user without passkey (T002)', async () => {
    // Test implementation references scenario T002
  });
});
```

### **API Contract Tests**
Contract tests validate server behavior:

```typescript
describe('API Contract: POST /auth/check-user', () => {
  it('T001: Valid existing user with passkey', async () => {
    // Test validates server implements T001 correctly
  });
});
```