# API Contracts Overview

**⚠️ CRITICAL**: This documentation is the **single source of truth** for Authentication API behavior.

## Contract Documentation Structure

### **Endpoint Specifications**
- **[Authentication Endpoints](./authentication-endpoints.md)** - Complete endpoint specifications with schemas
- **[Request/Response Schemas](./request-response-schemas.md)** - JSON schemas with validation examples
- **[Error Codes Catalog](./error-codes-catalog.md)** - Comprehensive error response documentation
- **[Rate Limiting Specs](./rate-limiting-specs.md)** - API throttling and abuse prevention

### **Contract Testing**
Each endpoint contract includes:
- **Request Schema** - Required/optional fields with types
- **Response Schema** - Success and error response formats
- **Test Scenarios** - Specific behaviors to validate (T001, T002, etc.)
- **Error Cases** - All possible error conditions
- **Performance Requirements** - Response time and throughput expectations

## Test Scenario Organization

All API behaviors are organized by scenario IDs:

### **User Authentication (T001-T010)**
- T001: Valid existing user with passkey
- T002: Valid existing user without passkey
- T003: New user registration flow
- T004: Invalid email format
- T005: User does not exist

### **WebAuthn Challenge (T011-T020)**
- T011: Valid challenge request for existing user
- T012: Challenge request for user without passkey
- T013: Invalid user ID format
- T014: Rate limited challenge request

### **WebAuthn Verification (T021-T030)**
- T021: Valid passkey authentication
- T022: Invalid credential response
- T023: Expired challenge
- T024: Mismatched user ID

### **Magic Link Authentication (T031-T040)**
- T031: Valid magic link request
- T032: Magic link for user with passkey
- T033: Rate limited magic link request
- T034: Invalid email format

## Contract Validation Requirements

### **Schema Validation**
All requests and responses must validate against documented JSON schemas:

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["email"],
  "properties": {
    "email": {
      "type": "string",
      "format": "email",
      "maxLength": 254
    }
  }
}
```

### **Response Time Requirements**
- **Authentication endpoints**: < 500ms p95
- **Health checks**: < 100ms p95
- **WebAuthn operations**: < 1000ms p95

### **Error Response Consistency**
All error responses must follow the standard format:

```json
{
  "error": "specific_error_code",
  "message": "Human readable error message",
  "details": {
    "additional": "context"
  }
}
```

## Implementation Requirements

### **Test Data Setup**
Required test accounts must exist in all environments:
- `test-with-passkey@thepia.net` - Has registered passkey
- `test-without-passkey@thepia.net` - No passkey registered
- `test-new-user@thepia.net` - Does not exist in system

### **Environment Configuration**
- **Local Development**: `https://dev.thepia.com:8443`
- **Production**: `https://api.thepia.com`
- **CORS Origins**: `thepia.com`, `thepia.net`, `*.thepia.net`

## Contract Testing Strategy

### **API Contract Tests (thepia.com/tests/auth/contracts/)**
Validate that the API server implements documented contracts:

```typescript
describe('Authentication API Contracts', () => {
  describe('POST /auth/check-user', () => {
    it('T001: Valid existing user with passkey', async () => {
      const response = await fetch('/auth/check-user', {
        method: 'POST',
        body: JSON.stringify({ email: 'test-with-passkey@thepia.net' })
      });
      
      // Validate response matches contract T001 specification
      expect(response.status).toBe(200);
      expect(response.body).toMatchSchema(checkUserResponseSchema);
      expect(response.body.hasPasskey).toBe(true);
    });
  });
});
```

### **Integration Tests (flows-auth/tests/integration/)**
Validate that the client integrates correctly with documented contracts:

```typescript
describe('Client API Integration', () => {
  it('should handle existing user with passkey (T001)', async () => {
    // Test references thepia.com contract scenario T001
    // Uses real API endpoint with no mocking
    const result = await checkUserExists('test-with-passkey@thepia.net');
    expect(result.hasPasskey).toBe(true);
  });
});
```

## Change Management

### **Contract Changes**
1. **Document first** - Update API contracts before implementation
2. **Cross-repository validation** - Ensure client compatibility
3. **Breaking change approval** - Require engineering leadership sign-off
4. **Migration guides** - Document required client updates

### **Version Management**
- **Semantic versioning** for breaking changes
- **Backward compatibility** maintained for 6 months minimum
- **Deprecation notices** with clear migration paths

---

**For detailed endpoint specifications, see [Authentication Endpoints](./authentication-endpoints.md)**