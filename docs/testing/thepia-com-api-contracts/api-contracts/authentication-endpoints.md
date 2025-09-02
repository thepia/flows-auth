# Authentication API Endpoints

**Complete specifications for all authentication endpoints with schemas, test scenarios, and error cases.**

## POST /auth/check-user

**Purpose**: Check if user exists and determine available authentication methods

### Request Schema
```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["email"],
  "properties": {
    "email": {
      "type": "string",
      "format": "email",
      "maxLength": 254,
      "description": "User's email address"
    }
  },
  "additionalProperties": false
}
```

### Response Schema (Success)
```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["userExists", "hasPasskey", "email"],
  "properties": {
    "userExists": {
      "type": "boolean",
      "description": "Whether user account exists"
    },
    "hasPasskey": {
      "type": "boolean", 
      "description": "Whether user has registered passkey"
    },
    "email": {
      "type": "string",
      "format": "email",
      "description": "Normalized email address"
    },
    "userId": {
      "type": "string",
      "description": "User ID (only present if userExists is true)"
    }
  },
  "additionalProperties": false
}
```

### Test Scenarios
- **T001**: Valid existing user with passkey → `200`, `userExists: true, hasPasskey: true`
- **T002**: Valid existing user without passkey → `200`, `userExists: true, hasPasskey: false`
- **T003**: New user (does not exist) → `200`, `userExists: false, hasPasskey: false`
- **T004**: Invalid email format → `400`, error code `invalid_email`
- **T005**: Missing email field → `400`, error code `missing_email`

### Error Cases
```json
{
  "400": {
    "error": "invalid_email",
    "message": "Invalid email format",
    "details": { "field": "email" }
  },
  "400": {
    "error": "missing_email", 
    "message": "Email field is required",
    "details": { "field": "email" }
  },
  "429": {
    "error": "rate_limited",
    "message": "Too many requests",
    "details": { "retryAfter": 60 }
  }
}
```

---

## POST /auth/webauthn/challenge

**Purpose**: Generate WebAuthn challenge for authentication

### Request Schema
```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["email"],
  "properties": {
    "email": {
      "type": "string",
      "format": "email",
      "description": "User's email address"
    },
    "userId": {
      "type": "string",
      "description": "User ID (optional, will be looked up from email)"
    }
  },
  "additionalProperties": false
}
```

### Response Schema (Success)
```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["challenge", "rpId", "timeout", "userVerification"],
  "properties": {
    "challenge": {
      "type": "string",
      "description": "Base64URL encoded challenge bytes"
    },
    "rpId": {
      "type": "string",
      "description": "Relying party identifier"
    },
    "allowCredentials": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "type": { "type": "string", "enum": ["public-key"] },
          "id": { "type": "string", "description": "Base64URL encoded credential ID" }
        }
      },
      "description": "List of allowed credentials for this user"
    },
    "timeout": {
      "type": "number",
      "description": "Timeout in milliseconds"
    },
    "userVerification": {
      "type": "string",
      "enum": ["required", "preferred", "discouraged"]
    }
  },
  "additionalProperties": false
}
```

### Test Scenarios
- **T011**: Valid challenge for user with passkey → `200`, includes `allowCredentials`
- **T012**: Valid challenge for user without passkey → `200`, empty `allowCredentials`
- **T013**: User does not exist → `404`, error code `user_not_found`
- **T014**: Invalid email format → `400`, error code `invalid_email`
- **T015**: Rate limited request → `429`, error code `rate_limited`

### Error Cases
```json
{
  "400": {
    "error": "invalid_email",
    "message": "Invalid email format",
    "details": { "field": "email" }
  },
  "404": {
    "error": "user_not_found",
    "message": "User does not exist",
    "details": { "email": "provided_email" }
  },
  "429": {
    "error": "rate_limited",
    "message": "Too many challenge requests",
    "details": { "retryAfter": 60 }
  }
}
```

---

## POST /auth/webauthn/verify

**Purpose**: Verify WebAuthn authentication response

### Request Schema
```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["email", "credentialResponse"],
  "properties": {
    "email": {
      "type": "string",
      "format": "email"
    },
    "credentialResponse": {
      "type": "object",
      "required": ["id", "rawId", "response", "type"],
      "properties": {
        "id": { "type": "string" },
        "rawId": { "type": "string" },
        "response": {
          "type": "object",
          "required": ["authenticatorData", "clientDataJSON", "signature"],
          "properties": {
            "authenticatorData": { "type": "string" },
            "clientDataJSON": { "type": "string" },
            "signature": { "type": "string" },
            "userHandle": { "type": ["string", "null"] }
          }
        },
        "type": { "type": "string", "enum": ["public-key"] }
      }
    }
  },
  "additionalProperties": false
}
```

### Response Schema (Success)
```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["success", "sessionToken", "user"],
  "properties": {
    "success": { "type": "boolean" },
    "sessionToken": {
      "type": "string",
      "description": "JWT session token"
    },
    "user": {
      "type": "object",
      "required": ["id", "email"],
      "properties": {
        "id": { "type": "string" },
        "email": { "type": "string", "format": "email" },
        "name": { "type": ["string", "null"] }
      }
    },
    "expiresAt": {
      "type": "string",
      "format": "date-time",
      "description": "Session expiration timestamp"
    }
  },
  "additionalProperties": false
}
```

### Test Scenarios
- **T021**: Valid passkey authentication → `200`, returns session token
- **T022**: Invalid credential response → `400`, error code `invalid_credential`
- **T023**: Expired challenge → `400`, error code `challenge_expired`
- **T024**: Mismatched user ID → `400`, error code `user_mismatch`
- **T025**: Unknown credential ID → `400`, error code `unknown_credential`

### Error Cases
```json
{
  "400": {
    "error": "invalid_credential",
    "message": "Invalid WebAuthn credential response",
    "details": { "field": "credentialResponse" }
  },
  "400": {
    "error": "challenge_expired",
    "message": "WebAuthn challenge has expired",
    "details": { "expiresAt": "2024-01-01T12:00:00Z" }
  },
  "400": {
    "error": "user_mismatch", 
    "message": "Credential does not belong to specified user",
    "details": { "email": "provided_email" }
  }
}
```

---

## POST /auth/start-passwordless

**Purpose**: Start passwordless authentication flow (sends magic link email)

### Request Schema
```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["email"],
  "properties": {
    "email": {
      "type": "string",
      "format": "email"
    },
    "redirectUrl": {
      "type": "string",
      "format": "uri",
      "description": "URL to redirect to after magic link verification"
    }
  },
  "additionalProperties": false
}
```

### Response Schema (Success)
```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["success", "message"],
  "properties": {
    "success": { "type": "boolean" },
    "message": { "type": "string" },
    "expiresAt": {
      "type": "string",
      "format": "date-time",
      "description": "Magic link expiration timestamp"
    }
  },
  "additionalProperties": false
}
```

### Test Scenarios
- **T031**: Valid magic link request → `200`, email sent
- **T032**: Magic link for user with passkey → `200`, email sent with passkey option
- **T033**: Rate limited magic link → `429`, error code `rate_limited`
- **T034**: Invalid email format → `400`, error code `invalid_email`
- **T035**: Invalid redirect URL → `400`, error code `invalid_redirect_url`

### Error Cases
```json
{
  "400": {
    "error": "invalid_email",
    "message": "Invalid email format",
    "details": { "field": "email" }
  },
  "400": {
    "error": "invalid_redirect_url",
    "message": "Invalid redirect URL format",
    "details": { "field": "redirectUrl" }
  },
  "429": {
    "error": "rate_limited",
    "message": "Too many magic link requests",
    "details": { "retryAfter": 300 }
  }
}
```

---

## GET /health

**Purpose**: API health check endpoint

### Request
No request body required.

### Response Schema
```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["status", "timestamp"],
  "properties": {
    "status": { "type": "string", "enum": ["healthy", "degraded", "unhealthy"] },
    "timestamp": { "type": "string", "format": "date-time" },
    "version": { "type": "string" },
    "services": {
      "type": "object",
      "properties": {
        "database": { "type": "string", "enum": ["healthy", "unhealthy"] },
        "auth0": { "type": "string", "enum": ["healthy", "unhealthy"] }
      }
    }
  }
}
```

### Test Scenarios
- **T041**: Healthy API → `200`, status: "healthy"
- **T042**: Degraded API → `200`, status: "degraded"
- **T043**: Unhealthy API → `503`, status: "unhealthy"

---

## Performance Requirements

### Response Time Targets
- **Health checks**: < 100ms p95
- **Check user**: < 200ms p95
- **WebAuthn challenge**: < 300ms p95
- **WebAuthn verify**: < 500ms p95
- **Magic link**: < 1000ms p95

### Rate Limits
- **Authentication endpoints**: 10 req/min per IP
- **Magic link requests**: 3 req/5min per email
- **Health checks**: 100 req/min per IP

### Availability
- **Uptime**: 99.9% minimum
- **Error rate**: < 0.1% for 2xx responses
- **Recovery time**: < 5 minutes for outages