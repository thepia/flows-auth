# Request/Response Schemas

**Complete JSON Schema definitions for all API endpoints with validation examples**

## Schema Validation Principles

### **Standard Error Response**
All API endpoints return errors in this format:

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "Standard Error Response",
  "type": "object",
  "required": ["error", "message"],
  "properties": {
    "error": {
      "type": "string",
      "description": "Machine-readable error code"
    },
    "message": {
      "type": "string", 
      "description": "Human-readable error message"
    },
    "details": {
      "type": "object",
      "description": "Additional error context"
    }
  },
  "additionalProperties": false
}
```

### **Validation Rules**
- **Email validation**: RFC 5322 compliant with max 254 characters
- **Required fields**: Must be present and non-null
- **Additional properties**: Not allowed unless explicitly specified
- **String lengths**: Enforced for security and performance

---

## POST /auth/check-user

### Request Schema
```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "Check User Request",
  "type": "object",
  "required": ["email"],
  "properties": {
    "email": {
      "type": "string",
      "format": "email",
      "maxLength": 254,
      "pattern": "^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$",
      "description": "User's email address",
      "examples": [
        "user@example.com",
        "test.user+tag@company.co.uk"
      ]
    }
  },
  "additionalProperties": false
}
```

### Response Schema
```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "Check User Response",
  "type": "object",
  "required": ["userExists", "hasPasskey", "email"],
  "properties": {
    "userExists": {
      "type": "boolean",
      "description": "Whether user account exists in system"
    },
    "hasPasskey": {
      "type": "boolean",
      "description": "Whether user has registered WebAuthn credential"
    },
    "email": {
      "type": "string",
      "format": "email",
      "description": "Normalized email address (lowercase, trimmed)"
    },
    "userId": {
      "type": "string",
      "pattern": "^[a-zA-Z0-9_-]+$",
      "minLength": 1,
      "maxLength": 128,
      "description": "Unique user identifier (only present if userExists is true)"
    }
  },
  "additionalProperties": false,
  "examples": [
    {
      "userExists": true,
      "hasPasskey": true,
      "email": "user@example.com",
      "userId": "usr_1a2b3c4d5e"
    },
    {
      "userExists": false,
      "hasPasskey": false,
      "email": "newuser@example.com"
    }
  ]
}
```

---

## POST /auth/webauthn/challenge

### Request Schema
```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "WebAuthn Challenge Request",
  "type": "object",
  "required": ["email"],
  "properties": {
    "email": {
      "type": "string",
      "format": "email",
      "maxLength": 254,
      "description": "User's email address"
    },
    "userId": {
      "type": "string",
      "pattern": "^[a-zA-Z0-9_-]+$",
      "minLength": 1,
      "maxLength": 128,
      "description": "User ID (optional, will be looked up from email if not provided)"
    }
  },
  "additionalProperties": false
}
```

### Response Schema
```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "WebAuthn Challenge Response",
  "type": "object",
  "required": ["challenge", "rpId", "timeout", "userVerification"],
  "properties": {
    "challenge": {
      "type": "string",
      "pattern": "^[A-Za-z0-9_-]+$",
      "minLength": 43,
      "maxLength": 43,
      "description": "Base64URL encoded challenge (32 bytes)"
    },
    "rpId": {
      "type": "string",
      "pattern": "^[a-zA-Z0-9.-]+$",
      "description": "Relying party identifier",
      "examples": ["thepia.com", "thepia.net"]
    },
    "allowCredentials": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["type", "id"],
        "properties": {
          "type": {
            "type": "string",
            "enum": ["public-key"]
          },
          "id": {
            "type": "string",
            "pattern": "^[A-Za-z0-9_-]+$",
            "description": "Base64URL encoded credential ID"
          },
          "transports": {
            "type": "array",
            "items": {
              "type": "string",
              "enum": ["usb", "nfc", "ble", "internal"]
            }
          }
        },
        "additionalProperties": false
      },
      "maxItems": 20,
      "description": "List of allowed credentials for this user"
    },
    "timeout": {
      "type": "integer",
      "minimum": 30000,
      "maximum": 300000,
      "description": "Timeout in milliseconds"
    },
    "userVerification": {
      "type": "string",
      "enum": ["required", "preferred", "discouraged"],
      "description": "User verification requirement"
    }
  },
  "additionalProperties": false
}
```

---

## POST /auth/webauthn/verify

### Request Schema
```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "WebAuthn Verify Request",
  "type": "object",
  "required": ["email", "credentialResponse"],
  "properties": {
    "email": {
      "type": "string",
      "format": "email",
      "maxLength": 254
    },
    "credentialResponse": {
      "type": "object",
      "required": ["id", "rawId", "response", "type"],
      "properties": {
        "id": {
          "type": "string",
          "pattern": "^[A-Za-z0-9_-]+$",
          "description": "Base64URL encoded credential ID"
        },
        "rawId": {
          "type": "string",
          "pattern": "^[A-Za-z0-9_-]+$",
          "description": "Base64URL encoded raw credential ID"
        },
        "response": {
          "type": "object",
          "required": ["authenticatorData", "clientDataJSON", "signature"],
          "properties": {
            "authenticatorData": {
              "type": "string",
              "pattern": "^[A-Za-z0-9_-]+$",
              "description": "Base64URL encoded authenticator data"
            },
            "clientDataJSON": {
              "type": "string",
              "pattern": "^[A-Za-z0-9_-]+$",
              "description": "Base64URL encoded client data JSON"
            },
            "signature": {
              "type": "string",
              "pattern": "^[A-Za-z0-9_-]+$",
              "description": "Base64URL encoded signature"
            },
            "userHandle": {
              "type": ["string", "null"],
              "pattern": "^[A-Za-z0-9_-]*$",
              "description": "Base64URL encoded user handle"
            }
          },
          "additionalProperties": false
        },
        "type": {
          "type": "string",
          "enum": ["public-key"]
        },
        "clientExtensionResults": {
          "type": "object",
          "description": "Client extension results (optional)"
        }
      },
      "additionalProperties": false
    }
  },
  "additionalProperties": false
}
```

### Response Schema
```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "WebAuthn Verify Response",
  "type": "object",
  "required": ["success", "sessionToken", "user"],
  "properties": {
    "success": {
      "type": "boolean",
      "const": true
    },
    "sessionToken": {
      "type": "string",
      "pattern": "^[A-Za-z0-9_-]+\\.[A-Za-z0-9_-]+\\.[A-Za-z0-9_-]+$",
      "description": "JWT session token"
    },
    "user": {
      "type": "object",
      "required": ["id", "email"],
      "properties": {
        "id": {
          "type": "string",
          "pattern": "^[a-zA-Z0-9_-]+$",
          "description": "User ID"
        },
        "email": {
          "type": "string",
          "format": "email",
          "description": "User's email address"
        },
        "name": {
          "type": ["string", "null"],
          "maxLength": 100,
          "description": "User's display name"
        },
        "createdAt": {
          "type": "string",
          "format": "date-time",
          "description": "Account creation timestamp"
        }
      },
      "additionalProperties": false
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

---

## POST /auth/signin/magic-link

### Request Schema
```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "Magic Link Request",
  "type": "object",
  "required": ["email"],
  "properties": {
    "email": {
      "type": "string",
      "format": "email",
      "maxLength": 254
    },
    "redirectUrl": {
      "type": "string",
      "format": "uri",
      "pattern": "^https://[a-zA-Z0-9.-]+(/.*)?$",
      "maxLength": 2048,
      "description": "HTTPS URL to redirect to after verification"
    }
  },
  "additionalProperties": false
}
```

### Response Schema
```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "Magic Link Response",
  "type": "object",
  "required": ["success", "message"],
  "properties": {
    "success": {
      "type": "boolean",
      "const": true
    },
    "message": {
      "type": "string",
      "description": "Success message for user display"
    },
    "expiresAt": {
      "type": "string",
      "format": "date-time",
      "description": "Magic link expiration timestamp"
    }
  },
  "additionalProperties": false
}
```

---

## GET /health

### Response Schema
```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "Health Check Response",
  "type": "object",
  "required": ["status", "timestamp"],
  "properties": {
    "status": {
      "type": "string",
      "enum": ["healthy", "degraded", "unhealthy"],
      "description": "Overall API health status"
    },
    "timestamp": {
      "type": "string",
      "format": "date-time",
      "description": "Health check timestamp"
    },
    "version": {
      "type": "string",
      "pattern": "^\\d+\\.\\d+\\.\\d+$",
      "description": "API version"
    },
    "services": {
      "type": "object",
      "properties": {
        "database": {
          "type": "string",
          "enum": ["healthy", "unhealthy"]
        },
        "auth0": {
          "type": "string",
          "enum": ["healthy", "unhealthy"]
        },
        "email": {
          "type": "string",
          "enum": ["healthy", "unhealthy"]
        }
      },
      "additionalProperties": false
    },
    "metrics": {
      "type": "object",
      "properties": {
        "responseTime": {
          "type": "number",
          "description": "Response time in milliseconds"
        },
        "uptime": {
          "type": "number",
          "description": "Uptime in seconds"
        }
      }
    }
  },
  "additionalProperties": false
}
```

---

## Schema Validation Examples

### **Using JSON Schema Validation (Node.js)**
```javascript
const Ajv = require('ajv');
const addFormats = require('ajv-formats');

const ajv = new Ajv();
addFormats(ajv);

// Validate request
const validateCheckUser = ajv.compile(checkUserRequestSchema);
const isValid = validateCheckUser(requestData);

if (!isValid) {
  throw new Error(`Invalid request: ${ajv.errorsText(validateCheckUser.errors)}`);
}
```

### **Using TypeScript Types**
```typescript
interface CheckUserRequest {
  email: string;
}

interface CheckUserResponse {
  userExists: boolean;
  hasPasskey: boolean;
  email: string;
  userId?: string;
}

// Type-safe request handling
function handleCheckUser(request: CheckUserRequest): CheckUserResponse {
  // Implementation here
}
```

### **Contract Test Example**
```javascript
describe('Schema Validation', () => {
  it('validates check-user response schema', async () => {
    const response = await fetch('/auth/check-user', {
      method: 'POST',
      body: JSON.stringify({ email: 'test@example.com' })
    });
    
    const data = await response.json();
    
    // Validate response matches schema
    expect(validateCheckUserResponse(data)).toBe(true);
  });
});
```

---

## Common Validation Patterns

### **Email Validation**
- Format: RFC 5322 compliant
- Length: Maximum 254 characters
- Pattern: Basic email regex for additional validation
- Normalization: Lowercase, trimmed

### **Base64URL Encoding**
- Character set: `A-Za-z0-9_-`
- No padding (`=`) characters
- Used for WebAuthn data (challenges, credential IDs, etc.)

### **User IDs**
- Format: Alphanumeric with hyphens and underscores
- Length: 1-128 characters
- Pattern: `^[a-zA-Z0-9_-]+$`

### **Timestamps**
- Format: ISO 8601 UTC
- Example: `2024-01-15T10:30:00Z`
- Validation: RFC 3339 date-time format