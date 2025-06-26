# User Authentication Test Scenarios (T001-T010)

**Comprehensive test scenarios for the `POST /auth/check-user` endpoint**

## Endpoint Overview

**Endpoint**: `POST /auth/check-user`  
**Purpose**: Check if user exists and determine available authentication methods  
**Rate Limit**: 10 requests per minute per IP

---

## T001: Valid existing user with passkey

### **Description**
User exists in system and has at least one registered WebAuthn credential

### **Test Objective**
Verify API correctly identifies existing users with passkey capabilities

### **Preconditions**
- User `test-with-passkey@thepia.net` exists in database
- User has 1+ registered WebAuthn credentials
- User account is active (not suspended/deleted)

### **Test Data Setup**
```sql
INSERT INTO users (id, email, created_at, status) 
VALUES ('usr_test_with_passkey', 'test-with-passkey@thepia.net', NOW(), 'active');

INSERT INTO webauthn_credentials (id, user_id, credential_id, public_key, counter)
VALUES ('cred_1', 'usr_test_with_passkey', 'test-credential-id-1', 'public-key-data', 0);
```

### **Request**
```http
POST /auth/check-user HTTP/1.1
Content-Type: application/json

{
  "email": "test-with-passkey@thepia.net"
}
```

### **Expected Response**
```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "userExists": true,
  "hasPasskey": true,
  "email": "test-with-passkey@thepia.net",
  "userId": "usr_test_with_passkey"
}
```

### **Validation Points**
- ✅ Status code is 200
- ✅ Response matches schema
- ✅ `userExists` is `true`
- ✅ `hasPasskey` is `true`
- ✅ `email` is normalized (lowercase, trimmed)
- ✅ `userId` is present and valid

### **Edge Cases**
- User with multiple credentials → should still return `hasPasskey: true`
- User with revoked credentials → should return `hasPasskey: false`

---

## T002: Valid existing user without passkey

### **Description**
User exists in system but has no registered WebAuthn credentials

### **Test Objective**
Verify API correctly identifies existing users without passkey capabilities

### **Preconditions**
- User `test-without-passkey@thepia.net` exists in database
- User has 0 registered WebAuthn credentials
- User account is active

### **Test Data Setup**
```sql
INSERT INTO users (id, email, created_at, status) 
VALUES ('usr_test_without_passkey', 'test-without-passkey@thepia.net', NOW(), 'active');
```

### **Request**
```http
POST /auth/check-user HTTP/1.1
Content-Type: application/json

{
  "email": "test-without-passkey@thepia.net"
}
```

### **Expected Response**
```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "userExists": true,
  "hasPasskey": false,
  "email": "test-without-passkey@thepia.net",
  "userId": "usr_test_without_passkey"
}
```

### **Validation Points**
- ✅ Status code is 200
- ✅ `userExists` is `true`
- ✅ `hasPasskey` is `false`
- ✅ `userId` is present

---

## T003: New user (does not exist)

### **Description**
Email address is not registered in the system

### **Test Objective**
Verify API correctly handles non-existent user lookup

### **Preconditions**
- Email `test-new-user@thepia.net` does not exist in database
- No user records with this email

### **Request**
```http
POST /auth/check-user HTTP/1.1
Content-Type: application/json

{
  "email": "test-new-user@thepia.net"
}
```

### **Expected Response**
```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "userExists": false,
  "hasPasskey": false,
  "email": "test-new-user@thepia.net"
}
```

### **Validation Points**
- ✅ Status code is 200 (not 404)
- ✅ `userExists` is `false`
- ✅ `hasPasskey` is `false`
- ✅ `userId` field is NOT present
- ✅ Email is still normalized

---

## T004: Invalid email format

### **Description**
Email format validation should reject malformed email addresses

### **Test Objective**
Verify API validates email format before processing

### **Test Cases**

#### **T004a: Clearly invalid format**
```http
POST /auth/check-user HTTP/1.1
Content-Type: application/json

{
  "email": "not-an-email"
}
```

**Expected Response**:
```http
HTTP/1.1 400 Bad Request
Content-Type: application/json

{
  "error": "invalid_email",
  "message": "Invalid email format",
  "details": {
    "field": "email",
    "value": "not-an-email"
  }
}
```

#### **T004b: Missing @ symbol**
```json
{ "email": "userexample.com" }
```

#### **T004c: Multiple @ symbols**
```json
{ "email": "user@@example.com" }
```

#### **T004d: Too long (>254 characters)**
```json
{ "email": "very-long-email-address-that-exceeds-the-maximum-length-limit-of-254-characters-according-to-rfc-5322-specification-and-should-be-rejected-by-the-api-server-validation-logic-because-it-is-too-long-to-be-a-valid-email@example.com" }
```

#### **T004e: Invalid characters**
```json
{ "email": "user space@example.com" }
```

### **Validation Points**
- ✅ Status code is 400
- ✅ Error code is `invalid_email`
- ✅ Error message is user-friendly
- ✅ Details include problematic field and value

---

## T005: Missing email field

### **Description**
Required field validation should reject requests without email

### **Test Objective**
Verify API enforces required field validation

### **Test Cases**

#### **T005a: Completely empty request**
```http
POST /auth/check-user HTTP/1.1
Content-Type: application/json

{}
```

#### **T005b: Null email value**
```json
{ "email": null }
```

#### **T005c: Empty string email**
```json
{ "email": "" }
```

### **Expected Response**
```http
HTTP/1.1 400 Bad Request
Content-Type: application/json

{
  "error": "missing_email",
  "message": "Email field is required",
  "details": {
    "field": "email"
  }
}
```

### **Validation Points**
- ✅ Status code is 400
- ✅ Error code is `missing_email`
- ✅ Clear indication of missing field

---

## T006: Email normalization

### **Description**
Verify email addresses are properly normalized

### **Test Objective**
Ensure consistent email handling across different input formats

### **Test Cases**

#### **T006a: Uppercase email**
```json
{ "email": "TEST-USER@THEPIA.NET" }
```

**Expected**: Email normalized to `test-user@thepia.net`

#### **T006b: Mixed case with spaces**
```json
{ "email": "  Test.User@ThepiA.Net  " }
```

**Expected**: Email normalized to `test.user@thepia.net`

#### **T006c: Unicode characters**
```json
{ "email": "tëst@thepia.net" }
```

**Expected**: Handle according to internationalization rules

### **Validation Points**
- ✅ Email in response is lowercase
- ✅ Leading/trailing whitespace removed
- ✅ Consistent normalization rules applied

---

## T007: Suspended user account

### **Description**
User exists but account is suspended/deactivated

### **Test Objective**  
Verify handling of suspended user accounts

### **Preconditions**
- User `test-suspended@thepia.net` exists in database  
- User account status is `suspended`

### **Test Data Setup**
```sql
INSERT INTO users (id, email, created_at, status) 
VALUES ('usr_test_suspended', 'test-suspended@thepia.net', NOW(), 'suspended');
```

### **Expected Behavior**
API should treat suspended users as if they don't exist for security reasons.

### **Expected Response**
```json
{
  "userExists": false,
  "hasPasskey": false,
  "email": "test-suspended@thepia.net"
}
```

---

## T008: Case sensitivity test

### **Description**
Verify email lookup is case-insensitive

### **Test Objective**
Ensure users can sign in regardless of email case

### **Preconditions**
- User stored as `test-case@thepia.net` (lowercase)

### **Test Cases**

#### **Input**: `Test-Case@Thepia.Net`
#### **Input**: `TEST-CASE@THEPIA.NET`  
#### **Input**: `test-case@thepia.net`

### **Expected**
All variations should find the same user

---

## T009: Database performance test

### **Description**
Verify endpoint performance under normal load

### **Test Objective**
Ensure response times meet SLA requirements

### **Performance Requirements**
- **Response time**: < 200ms p95
- **Concurrent requests**: Handle 100 concurrent requests
- **Database optimization**: Proper indexing on email field

### **Test Method**
- Send 1000 requests over 10 seconds
- Measure response time distribution
- Verify no timeouts or errors

---

## T010: Malicious input handling

### **Description**
Verify protection against malicious input attempts

### **Test Objective**
Ensure API security against common attack vectors

### **Test Cases**

#### **T010a: SQL injection attempt**
```json
{ "email": "user'; DROP TABLE users; --@example.com" }
```

#### **T010b: XSS attempt**
```json
{ "email": "<script>alert('xss')</script>@example.com" }
```

#### **T010c: Very large payload**
```json
{ "email": "x".repeat(1000000) + "@example.com" }
```

### **Expected Behavior**
- Input sanitization prevents execution
- Proper error responses returned
- No system compromise occurs

---

## Integration Test Implementation

### **flows-auth Integration Test Example**
```typescript
describe('User Authentication API Integration', () => {
  it('should handle existing user with passkey (T001)', async () => {
    const response = await fetch(`${API_BASE_URL}/auth/check-user`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'test-with-passkey@thepia.net' })
    });
    
    expect(response.status).toBe(200);
    const data = await response.json();
    
    expect(data).toMatchObject({
      userExists: true,
      hasPasskey: true,
      email: 'test-with-passkey@thepia.net',
      userId: expect.stringMatching(/^usr_/)
    });
  });

  it('should handle non-existent user (T003)', async () => {
    const response = await fetch(`${API_BASE_URL}/auth/check-user`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'test-new-user@thepia.net' })
    });
    
    expect(response.status).toBe(200);
    const data = await response.json();
    
    expect(data).toMatchObject({
      userExists: false,
      hasPasskey: false,
      email: 'test-new-user@thepia.net'
    });
    expect(data).not.toHaveProperty('userId');
  });

  it('should reject invalid email format (T004)', async () => {
    const response = await fetch(`${API_BASE_URL}/auth/check-user`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'not-an-email' })
    });
    
    expect(response.status).toBe(400);
    const data = await response.json();
    
    expect(data).toMatchObject({
      error: 'invalid_email',
      message: 'Invalid email format',
      details: {
        field: 'email',
        value: 'not-an-email'
      }
    });
  });
});
```

### **API Contract Test Example**
```typescript
describe('API Contract: POST /auth/check-user', () => {
  it('T001: Valid existing user with passkey', async () => {
    // Validate server implements T001 contract correctly
    const response = await request(app)
      .post('/auth/check-user')
      .send({ email: 'test-with-passkey@thepia.net' })
      .expect(200);
    
    // Validate response schema
    expect(validateCheckUserResponse(response.body)).toBe(true);
    
    // Validate specific contract requirements
    expect(response.body.userExists).toBe(true);
    expect(response.body.hasPasskey).toBe(true);
    expect(response.body.userId).toBeDefined();
  });
});
```

---

## Success Criteria

### **Contract Compliance**
- ✅ All test scenarios pass consistently
- ✅ Response schemas match documentation
- ✅ Performance requirements met
- ✅ Security requirements validated

### **Cross-Repository Alignment**
- ✅ flows-auth integration tests reference these scenarios
- ✅ API contract tests validate server behavior
- ✅ No mocking in flows-auth integration tests
- ✅ Real API calls validate documented contracts

### **Test Data Management**
- ✅ Required test accounts exist in all environments
- ✅ Test data setup scripts are automated
- ✅ Data consistency maintained across test runs