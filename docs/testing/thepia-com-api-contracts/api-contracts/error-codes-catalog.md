# Error Codes Catalog

**Comprehensive catalog of all API error responses with scenarios and handling guidance**

## Error Response Format

All API endpoints return errors in this standardized format:

```json
{
  "error": "specific_error_code",
  "message": "Human readable error message",
  "details": {
    "field": "additional_context",
    "value": "problematic_value"
  }
}
```

---

## Authentication Errors (4xx)

### **400 Bad Request Errors**

#### `invalid_email`
**Description**: Email format is invalid or malformed
**HTTP Status**: 400
**Example Response**:
```json
{
  "error": "invalid_email",
  "message": "Invalid email format",
  "details": {
    "field": "email",
    "value": "not-an-email"
  }
}
```
**Triggers**:
- Email doesn't match RFC 5322 format
- Email contains invalid characters
- Email is too long (>254 characters)

**Test Scenarios**: T004, T014, T034

---

#### `missing_email`
**Description**: Required email field is missing from request
**HTTP Status**: 400
**Example Response**:
```json
{
  "error": "missing_email",
  "message": "Email field is required",
  "details": {
    "field": "email"
  }
}
```
**Triggers**:
- Request body missing `email` field
- Email field is null or undefined

**Test Scenarios**: T005

---

#### `invalid_credential`
**Description**: WebAuthn credential response is invalid
**HTTP Status**: 400
**Example Response**:
```json
{
  "error": "invalid_credential",
  "message": "Invalid WebAuthn credential response",
  "details": {
    "field": "credentialResponse",
    "reason": "signature_verification_failed"
  }
}
```
**Triggers**:
- Malformed WebAuthn response structure
- Invalid signature verification
- Corrupted credential data

**Test Scenarios**: T022

---

#### `challenge_expired`
**Description**: WebAuthn challenge has expired
**HTTP Status**: 400
**Example Response**:
```json
{
  "error": "challenge_expired",
  "message": "WebAuthn challenge has expired",
  "details": {
    "expiresAt": "2024-01-15T10:30:00Z",
    "now": "2024-01-15T10:35:00Z"
  }
}
```
**Triggers**:
- Challenge older than 5 minutes
- System clock drift issues

**Test Scenarios**: T023

---

#### `user_mismatch`
**Description**: Credential doesn't belong to specified user
**HTTP Status**: 400
**Example Response**:
```json
{
  "error": "user_mismatch",
  "message": "Credential does not belong to specified user",
  "details": {
    "email": "user@example.com",
    "credentialUserId": "different_user_id"
  }
}
```
**Triggers**:
- User handle mismatch in WebAuthn response
- Credential registered to different user

**Test Scenarios**: T024

---

#### `unknown_credential`
**Description**: Credential ID not found in system
**HTTP Status**: 400
**Example Response**:
```json
{
  "error": "unknown_credential",
  "message": "WebAuthn credential not found",
  "details": {
    "credentialId": "unknown_credential_id"
  }
}
```
**Triggers**:
- Credential ID not registered in system
- Credential was deleted or revoked

**Test Scenarios**: T025

---

#### `invalid_redirect_url`
**Description**: Redirect URL format is invalid
**HTTP Status**: 400
**Example Response**:
```json
{
  "error": "invalid_redirect_url",
  "message": "Invalid redirect URL format",
  "details": {
    "field": "redirectUrl",
    "value": "http://insecure-url.com",
    "reason": "https_required"
  }
}
```
**Triggers**:
- Non-HTTPS redirect URL
- Invalid URL format
- Disallowed domain

**Test Scenarios**: T035

---

### **401 Unauthorized Errors**

#### `invalid_session`
**Description**: Session token is invalid or expired
**HTTP Status**: 401
**Example Response**:
```json
{
  "error": "invalid_session",
  "message": "Invalid or expired session token",
  "details": {
    "reason": "token_expired",
    "expiresAt": "2024-01-15T10:00:00Z"
  }
}
```
**Triggers**:
- JWT token expired
- Invalid JWT signature
- Token format is malformed

**Test Scenarios**: T026

---

#### `session_required`
**Description**: Endpoint requires authentication
**HTTP Status**: 401
**Example Response**:
```json
{
  "error": "session_required",
  "message": "This endpoint requires authentication",
  "details": {
    "endpoint": "/auth/profile"
  }
}
```
**Triggers**:
- Missing Authorization header
- Accessing protected endpoint without session

**Test Scenarios**: T027

---

### **404 Not Found Errors**

#### `user_not_found`
**Description**: User does not exist in system
**HTTP Status**: 404
**Example Response**:
```json
{
  "error": "user_not_found",
  "message": "User does not exist",
  "details": {
    "email": "nonexistent@example.com"
  }
}
```
**Triggers**:
- Email not registered in system
- User account was deleted

**Test Scenarios**: T013

---

#### `endpoint_not_found`
**Description**: API endpoint does not exist
**HTTP Status**: 404
**Example Response**:
```json
{
  "error": "endpoint_not_found",
  "message": "API endpoint not found",
  "details": {
    "path": "/auth/nonexistent-endpoint",
    "method": "POST"
  }
}
```
**Triggers**:
- Invalid API path
- Unsupported HTTP method

**Test Scenarios**: T044

---

### **429 Rate Limit Errors**

#### `rate_limited`
**Description**: Too many requests from client
**HTTP Status**: 429
**Example Response**:
```json
{
  "error": "rate_limited",
  "message": "Too many requests",
  "details": {
    "limit": 10,
    "window": 60,
    "retryAfter": 45
  }
}
```
**Triggers**:
- Exceeded requests per minute limit
- Authentication attempt rate limiting
- IP-based rate limiting

**Test Scenarios**: T015, T033

**Headers**:
```
Retry-After: 45
X-RateLimit-Limit: 10
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1705320600
```

---

## Server Errors (5xx)

### **500 Internal Server Error**

#### `internal_error`
**Description**: Unexpected server error occurred
**HTTP Status**: 500
**Example Response**:
```json
{
  "error": "internal_error",
  "message": "An internal server error occurred",
  "details": {
    "requestId": "req_1a2b3c4d5e",
    "timestamp": "2024-01-15T10:30:00Z"
  }
}
```
**Triggers**:
- Database connection failures
- Unexpected exceptions
- Third-party service failures

**Test Scenarios**: T045

---

#### `database_error`
**Description**: Database operation failed
**HTTP Status**: 500
**Example Response**:
```json
{
  "error": "database_error",
  "message": "Database operation failed",
  "details": {
    "operation": "user_lookup",
    "requestId": "req_1a2b3c4d5e"
  }
}
```
**Triggers**:
- Database connection timeouts
- SQL query failures
- Transaction conflicts

**Test Scenarios**: T046

---

### **502 Bad Gateway**

#### `auth0_error`
**Description**: Auth0 service unavailable
**HTTP Status**: 502
**Example Response**:
```json
{
  "error": "auth0_error",
  "message": "Authentication service unavailable",
  "details": {
    "service": "auth0",
    "status": "degraded"
  }
}
```
**Triggers**:
- Auth0 API downtime
- Auth0 rate limiting
- Network connectivity issues

**Test Scenarios**: T047

---

### **503 Service Unavailable**

#### `service_unavailable`
**Description**: Service temporarily unavailable
**HTTP Status**: 503
**Example Response**:
```json
{
  "error": "service_unavailable",
  "message": "Service temporarily unavailable",
  "details": {
    "reason": "maintenance",
    "retryAfter": 300
  }
}
```
**Triggers**:
- Planned maintenance
- System overload
- Health check failures

**Test Scenarios**: T043, T048

**Headers**:
```
Retry-After: 300
```

---

## Error Handling Best Practices

### **Client-Side Error Handling**

#### **Error Classification**
```typescript
interface APIError {
  error: string;
  message: string;
  details?: Record<string, any>;
}

function classifyError(error: APIError): 'user' | 'system' | 'network' {
  const userErrors = ['invalid_email', 'missing_email', 'user_not_found'];
  const systemErrors = ['internal_error', 'database_error', 'auth0_error'];
  
  if (userErrors.includes(error.error)) return 'user';
  if (systemErrors.includes(error.error)) return 'system';
  return 'network';
}
```

#### **Retry Logic**
```typescript
function shouldRetry(error: APIError, attempt: number): boolean {
  // Retry on server errors, not client errors
  if (error.error.startsWith('4')) return false;
  
  // Rate limits - respect retry-after
  if (error.error === 'rate_limited') return attempt < 3;
  
  // Server errors - exponential backoff
  if (error.error.startsWith('5')) return attempt < 3;
  
  return false;
}
```

### **User-Friendly Error Messages**

#### **Error Message Mapping**
```typescript
const ERROR_MESSAGES = {
  invalid_email: 'Please enter a valid email address',
  missing_email: 'Email address is required',
  user_not_found: 'No account found with this email address',
  challenge_expired: 'Authentication expired. Please try again.',
  rate_limited: 'Too many attempts. Please wait before trying again.',
  internal_error: 'Something went wrong. Please try again.',
  service_unavailable: 'Service is temporarily unavailable. Please try again later.'
};
```

### **Logging and Monitoring**

#### **Error Logging Structure**
```json
{
  "timestamp": "2024-01-15T10:30:00Z",
  "level": "error",
  "requestId": "req_1a2b3c4d5e",
  "endpoint": "/auth/check-user",
  "method": "POST",
  "statusCode": 400,
  "error": {
    "code": "invalid_email",
    "message": "Invalid email format",
    "details": {
      "field": "email",
      "value": "[REDACTED]"
    }
  },
  "userAgent": "Mozilla/5.0...",
  "ip": "192.168.1.1"
}
```

#### **Monitoring Alerts**
- **4xx errors > 5%**: Potential client integration issues
- **5xx errors > 1%**: Server health problems
- **Rate limiting > 10%**: Potential abuse or client bugs
- **Challenge expired > 15%**: Clock sync or UX issues

---

## Test Scenario Error Matrix

| Scenario | Error Code | HTTP Status | Description |
|----------|------------|-------------|-------------|
| T004 | `invalid_email` | 400 | Invalid email format |
| T005 | `missing_email` | 400 | Missing email field |
| T013 | `user_not_found` | 404 | User does not exist |
| T014 | `invalid_email` | 400 | Invalid email in challenge |
| T015 | `rate_limited` | 429 | Challenge rate limited |
| T022 | `invalid_credential` | 400 | Invalid WebAuthn response |
| T023 | `challenge_expired` | 400 | Expired challenge |
| T024 | `user_mismatch` | 400 | Credential user mismatch |
| T025 | `unknown_credential` | 400 | Unknown credential ID |
| T026 | `invalid_session` | 401 | Invalid session token |
| T027 | `session_required` | 401 | Missing authentication |
| T033 | `rate_limited` | 429 | Magic link rate limited |
| T034 | `invalid_email` | 400 | Invalid email in magic link |
| T035 | `invalid_redirect_url` | 400 | Invalid redirect URL |
| T043 | `service_unavailable` | 503 | API unhealthy |
| T044 | `endpoint_not_found` | 404 | Invalid endpoint |
| T045 | `internal_error` | 500 | Server error |
| T046 | `database_error` | 500 | Database failure |
| T047 | `auth0_error` | 502 | Auth0 unavailable |
| T048 | `service_unavailable` | 503 | Maintenance mode |