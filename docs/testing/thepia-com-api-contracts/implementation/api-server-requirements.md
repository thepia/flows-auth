# API Server Implementation Requirements

**Technical requirements for implementing the Authentication API server to support documented contracts**

## Server Architecture Requirements

### **Framework & Technology Stack**
- **Runtime**: Deno 1.40+ with required permissions
- **Framework**: Oak, Hono, or native Deno HTTP server
- **Authentication Backend**: Auth0 (with schema extensions)
- **WebAuthn Library**: @simplewebauthn/server (Deno-compatible)
- **Database**: Auth0 database (primary), PostgreSQL (future invitations)
- **Email**: SendGrid, AWS SES, or equivalent
- **Logging**: Deno native logging or structured logging solution

### **Deno Permissions Required**
```bash
# Minimum required permissions
deno run \
  --allow-net \
  --allow-env \
  --allow-read=./config,./certs \
  --allow-write=./logs \
  server.ts
```

### **Core Dependencies (import_map.json)**
```json
{
  "imports": {
    "@simplewebauthn/server": "https://deno.land/x/simplewebauthn@v8.0.0/server/mod.ts",
    "oak": "https://deno.land/x/oak@v12.6.0/mod.ts",
    "auth0": "https://deno.land/x/auth0@v1.0.0/mod.ts",
    "zod": "https://deno.land/x/zod@v3.21.4/mod.ts",
    "djwt": "https://deno.land/x/djwt@v2.9.1/mod.ts"
  }
}
```

---

## API Implementation Requirements

### **Endpoint Implementation Checklist**

#### **POST /auth/check-user**
- ✅ **Input validation**: Email format, required fields
- ✅ **Database lookup**: Efficient user query with email index
- ✅ **Response format**: Matches documented schema exactly
- ✅ **Error handling**: Proper error codes and messages
- ✅ **Rate limiting**: 10 requests per minute per IP

```typescript
// Deno implementation structure
import { Application, Router } from "oak";
import { z } from "zod";
import { ManagementClient } from "auth0";

const checkUserSchema = z.object({
  email: z.string().email().max(254)
});

router.post('/auth/check-user', async (ctx) => {
  try {
    // Rate limiting check
    await rateLimitMiddleware(ctx);
    
    // Validate input
    const { email } = checkUserSchema.parse(await ctx.request.body().value);
    
    // Query Auth0 for user
    const auth0User = await auth0Management.getUsersByEmail(email);
    
    if (!auth0User.length || auth0User[0].app_metadata?.thepia?.status !== 'active') {
      ctx.response.body = {
        userExists: false,
        hasPasskey: false,
        email: email.toLowerCase().trim()
      };
      return;
    }
    
    const user = auth0User[0];
    const domain = getDomainFromRequest(ctx);
    const domainCredentials = user.app_metadata?.thepia?.domains?.[domain]?.credentials || [];
    
    ctx.response.body = {
      userExists: true,
      hasPasskey: domainCredentials.length > 0,
      email: user.email,
      userId: user.user_id
    };
  } catch (error) {
    handleError(error, ctx);
  }
});

// Helper function to determine domain context
function getDomainFromRequest(ctx: Context): string {
  const origin = ctx.request.headers.get('origin');
  if (origin?.includes('thepia.com')) return 'thepia.com';
  if (origin?.includes('thepia.net')) return 'thepia.net';
  throw new Error('Invalid domain');
}
```

#### **POST /auth/webauthn/challenge**
- ✅ **WebAuthn integration**: Generate proper challenge
- ✅ **Credential lookup**: Fetch user's registered credentials
- ✅ **Challenge storage**: Store challenge with expiration
- ✅ **RP ID configuration**: Proper relying party setup
- ✅ **Timeout handling**: 5-minute challenge expiration

```typescript
// Deno WebAuthn challenge generation with per-device support
import { generateAuthenticationOptions } from "@simplewebauthn/server";

const auth0User = await auth0Management.getUser({ id: userId });
const domain = getDomainFromRequest(ctx);
const domainData = auth0User.app_metadata?.thepia?.domains?.[domain];
const credentials = domainData?.credentials || [];

const options = await generateAuthenticationOptions({
  rpID: domain, // 'thepia.com' or 'thepia.net'
  allowCredentials: credentials.map(cred => ({
    id: cred.credential_id,
    type: 'public-key' as const,
    transports: cred.transports as AuthenticatorTransport[]
  })),
  timeout: 60000,
  userVerification: 'preferred'
});

// Store challenge temporarily
const challengeId = crypto.randomUUID();
challengeStore.set(challengeId, {
  userId: auth0User.user_id,
  challenge: options.challenge,
  domain,
  expiresAt: new Date(Date.now() + 5 * 60 * 1000) // 5 minutes
});

ctx.response.body = {
  ...options,
  challengeId // Include for verification
};
```

#### **POST /auth/webauthn/verify**
- ✅ **Credential verification**: Validate WebAuthn response
- ✅ **Challenge validation**: Verify against stored challenge
- ✅ **Session generation**: Create JWT token
- ✅ **Counter updates**: Update credential counter
- ✅ **Security checks**: Proper origin validation

#### **POST /auth/signin/magic-link**
- ✅ **Email sending**: Integration with email service
- ✅ **Token generation**: Secure magic link token
- ✅ **Rate limiting**: 3 requests per 5 minutes per email
- ✅ **Template rendering**: Professional email template
- ✅ **Expiration handling**: 15-minute link expiration

#### **GET /health**
- ✅ **Service checks**: Database, Auth0, email service
- ✅ **Performance metrics**: Response time, uptime
- ✅ **Dependency status**: External service health
- ✅ **Version information**: API version reporting

---

## Data Storage Architecture

### **Auth0 Database Schema Extensions**

User data is stored in Auth0's database with custom schema extensions:

#### **Auth0 User Metadata Structure**
```typescript
interface Auth0UserMetadata {
  // Standard Auth0 fields
  user_id: string;
  email: string;
  name?: string;
  
  // Custom app_metadata
  app_metadata: {
    thepia: {
      status: 'active' | 'suspended' | 'deleted';
      created_at: string;
      updated_at: string;
      domains: {
        'thepia.com': {
          credentials: WebAuthnCredential[];
          last_signin: string;
        };
        'thepia.net': {
          credentials: WebAuthnCredential[];
          last_signin: string;
        };
      };
    };
  };
  
  // Custom user_metadata
  user_metadata: {
    preferences?: Record<string, any>;
  };
}

interface WebAuthnCredential {
  id: string;                    // Unique credential ID
  credential_id: string;         // Base64URL credential ID
  public_key: string;           // Base64URL public key
  counter: number;              // Signature counter
  device_name?: string;         // User-friendly device name
  transports?: string[];        // ['internal', 'usb', 'nfc', 'ble']
  created_at: string;          // ISO timestamp
  last_used?: string;          // ISO timestamp
}
```

#### **Per-Device Passkey Storage Strategy**

**Critical Design Considerations**:
- **Multiple devices per user**: Each device can have its own passkey
- **Domain-specific credentials**: Separate credentials for thepia.com vs thepia.net
- **Device identification**: Need to handle device naming and management
- **Credential lifecycle**: Registration, usage tracking, revocation

```typescript
// Example: User with passkeys on multiple devices and domains
const userMetadata = {
  app_metadata: {
    thepia: {
      status: 'active',
      domains: {
        'thepia.com': {
          credentials: [
            {
              id: 'cred_iphone_thepia_com',
              credential_id: 'base64url-credential-id-1',
              public_key: 'base64url-public-key-1',
              counter: 5,
              device_name: 'iPhone 15 Pro',
              transports: ['internal'],
              created_at: '2024-01-15T10:00:00Z',
              last_used: '2024-01-20T14:30:00Z'
            }
          ]
        },
        'thepia.net': {
          credentials: [
            {
              id: 'cred_iphone_thepia_net',
              credential_id: 'base64url-credential-id-2',
              public_key: 'base64url-public-key-2',
              counter: 3,
              device_name: 'iPhone 15 Pro',
              transports: ['internal'],
              created_at: '2024-01-15T10:05:00Z',
              last_used: '2024-01-18T09:15:00Z'
            },
            {
              id: 'cred_macbook_thepia_net',
              credential_id: 'base64url-credential-id-3',
              public_key: 'base64url-public-key-3',
              counter: 12,
              device_name: 'MacBook Pro',
              transports: ['internal', 'usb'],
              created_at: '2024-01-16T15:20:00Z',
              last_used: '2024-01-22T11:45:00Z'
            }
          ]
        }
      }
    }
  }
};
```

### **In-Memory Storage (Deno)**

For temporary data (challenges, rate limiting):

```typescript
// Challenge storage in memory (or Redis for multi-instance)
const challengeStore = new Map<string, {
  userId: string;
  challenge: string;
  domain: string;
  expiresAt: Date;
}>();

// Rate limiting storage
const rateLimitStore = new Map<string, {
  count: number;
  resetTime: Date;
}>();
```

### **🚨 Critical TODOs Identified**

#### **Per-Device Passkey Storage**
- [ ] **Current implementation lacks per-device storage** - Major architectural gap
- [ ] **Domain-specific credential separation** - thepia.com vs thepia.net credentials
- [ ] **Device management UI** - Users need to see and manage their devices
- [ ] **Credential migration strategy** - Move existing credentials to new schema

#### **Auth0 Schema Extension**
- [ ] **Implement custom Auth0 metadata structure** - Define app_metadata schema
- [ ] **Auth0 Management API integration** - Read/write custom metadata
- [ ] **Schema validation** - Ensure metadata consistency
- [ ] **Migration scripts** - Update existing user data

### **PostgreSQL (Future Use)**
Currently not used for authentication, but planned for:
- **Invitation management** - Organization invites and onboarding
- **Audit logging** - Authentication events and security logs
- **Analytics data** - Usage patterns and metrics

---

## Security Implementation Requirements

### **Input Validation (Zod Schemas)**
```typescript
// Zod schema validation for Deno
import { z } from "zod";

const schemas = {
  checkUser: z.object({
    email: z.string().email().max(254)
  }),
  
  webAuthnChallenge: z.object({
    email: z.string().email().max(254),
    userId: z.string().regex(/^[a-zA-Z0-9_|-]+$/).max(128).optional()
  }),
  
  webAuthnVerify: z.object({
    email: z.string().email().max(254),
    challengeId: z.string().uuid(),
    credentialResponse: z.object({
      id: z.string(),
      rawId: z.string(),
      response: z.object({
        authenticatorData: z.string(),
        clientDataJSON: z.string(),
        signature: z.string(),
        userHandle: z.string().nullable().optional()
      }),
      type: z.literal('public-key')
    })
  }),
  
  magicLink: z.object({
    email: z.string().email().max(254),
    redirectUrl: z.string().url().max(2048).optional().refine(
      (url) => !url || url.startsWith('https://'),
      { message: 'Redirect URL must use HTTPS' }
    )
  })
};
```

### **Rate Limiting Configuration (Deno)**
```typescript
// In-memory rate limiting for Deno
interface RateLimitEntry {
  count: number;
  resetTime: Date;
}

class RateLimiter {
  private store = new Map<string, RateLimitEntry>();
  
  async check(key: string, limit: number, windowMs: number): Promise<boolean> {
    const now = new Date();
    const entry = this.store.get(key);
    
    if (!entry || now > entry.resetTime) {
      this.store.set(key, {
        count: 1,
        resetTime: new Date(now.getTime() + windowMs)
      });
      return true;
    }
    
    if (entry.count >= limit) {
      return false;
    }
    
    entry.count++;
    return true;
  }
  
  // Clean up expired entries periodically
  cleanup() {
    const now = new Date();
    for (const [key, entry] of this.store.entries()) {
      if (now > entry.resetTime) {
        this.store.delete(key);
      }
    }
  }
}

const rateLimiter = new RateLimiter();

// Rate limiting middleware
const rateLimitMiddleware = (limit: number, windowMs: number, keyFn: (ctx: Context) => string) => {
  return async (ctx: Context, next: () => Promise<unknown>) => {
    const key = keyFn(ctx);
    const allowed = await rateLimiter.check(key, limit, windowMs);
    
    if (!allowed) {
      ctx.response.status = 429;
      ctx.response.body = {
        error: 'rate_limited',
        message: 'Too many requests',
        details: { retryAfter: Math.ceil(windowMs / 1000) }
      };
      return;
    }
    
    await next();
  };
};

// Usage examples
const authRateLimit = rateLimitMiddleware(10, 60 * 1000, (ctx) => 
  ctx.request.ip || 'unknown'
);

const magicLinkRateLimit = rateLimitMiddleware(3, 5 * 60 * 1000, (ctx) => 
  ctx.request.body?.email || ctx.request.ip
);
```

### **CORS Configuration (Deno Oak)**
```typescript
import { oakCors } from "https://deno.land/x/cors@v1.2.2/mod.ts";

const corsOptions = oakCors({
  origin: (origin: string) => {
    const allowedOrigins = [
      'https://thepia.com',
      'https://thepia.net',
      // Development origins
      'https://dev.thepia.com:8443',
      'https://dev.thepia.net:5176'
    ];
    
    // Allow thepia.net subdomains
    const subdomainPattern = /^https:\/\/[a-zA-Z0-9-]+\.thepia\.net$/;
    
    return allowedOrigins.includes(origin) || subdomainPattern.test(origin);
  },
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
});

app.use(corsOptions);
```

### **Security Headers**
```javascript
// Helmet configuration
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));
```

---

## WebAuthn Implementation Requirements

### **Relying Party Configuration**
```javascript
const rpConfig = {
  rpName: 'Thepia',
  rpID: process.env.NODE_ENV === 'production' ? 'thepia.net' : 'thepia.com',
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://thepia.net', 'https://thepia.com']
    : ['https://dev.thepia.net:5176', 'https://dev.thepia.com:8443'],
  
  // Authentication options
  timeout: 60000,
  userVerification: 'preferred',
  attestationType: 'none'
};
```

### **Challenge Generation**
```javascript
async function generateChallenge(userId) {
  const challenge = crypto.randomBytes(32);
  const challengeId = crypto.randomUUID();
  
  // Store challenge in database
  await db.query(`
    INSERT INTO webauthn_challenges (id, user_id, challenge, expires_at)
    VALUES (?, ?, ?, DATE_ADD(NOW(), INTERVAL 5 MINUTE))
  `, [challengeId, userId, challenge.toString('base64url')]);
  
  return {
    challengeId,
    challenge: challenge.toString('base64url')
  };
}
```

### **Credential Verification**
```javascript
async function verifyCredential(credentialResponse, challengeId) {
  // Retrieve stored challenge
  const challenge = await db.query(`
    SELECT challenge, user_id FROM webauthn_challenges 
    WHERE id = ? AND expires_at > NOW()
  `, [challengeId]);
  
  if (!challenge) {
    throw new Error('Challenge expired or not found');
  }
  
  // Verify WebAuthn response
  const verification = await verifyAuthenticationResponse({
    response: credentialResponse,
    expectedChallenge: challenge.challenge,
    expectedOrigin: rpConfig.origin,
    expectedRPID: rpConfig.rpID,
    authenticator: {
      credentialID: credential.id,
      credentialPublicKey: credential.publicKey,
      counter: credential.counter
    }
  });
  
  if (!verification.verified) {
    throw new Error('Credential verification failed');
  }
  
  return verification;
}
```

---

## Email Service Integration

### **Magic Link Email Template**
```html
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Sign in to Thepia</title>
</head>
<body>
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1>Sign in to Thepia</h1>
        <p>Click the link below to sign in to your account:</p>
        
        <a href="{{magic_link_url}}" 
           style="display: inline-block; padding: 12px 24px; background-color: #007bff; color: white; text-decoration: none; border-radius: 4px;">
            Sign In
        </a>
        
        <p>This link will expire in 15 minutes.</p>
        
        <p>If you didn't request this, please ignore this email.</p>
    </div>
</body>
</html>
```

### **Email Service Configuration**
```javascript
const emailConfig = {
  from: 'noreply@thepia.com',
  templates: {
    magicLink: 'magic-link-template.html'
  },
  
  // Provider-specific configuration
  sendgrid: {
    apiKey: process.env.SENDGRID_API_KEY
  },
  
  // Rate limiting
  maxEmailsPerHour: 100,
  maxEmailsPerDay: 1000
};
```

---

## Monitoring & Logging Requirements

### **Structured Logging**
```javascript
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});

// Log API requests
app.use((req, res, next) => {
  logger.info('API Request', {
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    requestId: req.id
  });
  next();
});
```

### **Metrics Collection**
```javascript
// Prometheus metrics
const promClient = require('prom-client');

const httpRequestDuration = new promClient.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code']
});

const authenticationAttempts = new promClient.Counter({
  name: 'authentication_attempts_total',
  help: 'Total number of authentication attempts',
  labelNames: ['method', 'status']
});
```

### **Health Check Implementation**
```javascript
app.get('/health', async (req, res) => {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    services: {}
  };
  
  try {
    // Check database
    await db.query('SELECT 1');
    health.services.database = 'healthy';
  } catch (error) {
    health.services.database = 'unhealthy';
    health.status = 'degraded';
  }
  
  // Check email service
  try {
    await emailService.verify();
    health.services.email = 'healthy';
  } catch (error) {
    health.services.email = 'unhealthy';
    health.status = 'degraded';
  }
  
  const statusCode = health.status === 'unhealthy' ? 503 : 200;
  res.status(statusCode).json(health);
});
```

---

## Development Environment Setup

### **Deno Development Configuration**
```typescript
// config/development.ts
import { loadSync } from "https://deno.land/std@0.208.0/dotenv/mod.ts";

loadSync({ export: true });

export const config = {
  server: {
    port: 8443,
    hostname: 'dev.thepia.com',
    // TLS configuration for HTTPS
    tls: {
      certFile: './certs/dev.thepia.com.crt',
      keyFile: './certs/dev.thepia.com.key'
    }
  },
  
  auth0: {
    domain: Deno.env.get('AUTH0_DOMAIN') || 'dev-thepia.auth0.com',
    clientId: Deno.env.get('AUTH0_CLIENT_ID'),
    clientSecret: Deno.env.get('AUTH0_CLIENT_SECRET'),
    audience: Deno.env.get('AUTH0_AUDIENCE') || 'https://api.thepia.com'
  },
  
  webauthn: {
    rpName: 'Thepia',
    rpID: 'thepia.com', // For development
    origins: [
      'https://dev.thepia.com:8443',
      'https://dev.thepia.net:5176'
    ],
    timeout: 60000
  },
  
  email: {
    provider: 'sendgrid',
    apiKey: Deno.env.get('SENDGRID_API_KEY'),
    fromAddress: 'noreply@thepia.com'
  }
};

// Validate required environment variables
if (!config.auth0.clientId || !config.auth0.clientSecret) {
  throw new Error('Missing required Auth0 configuration');
}
```

### **Deno Development Setup**
```dockerfile
# Dockerfile.dev
FROM denoland/deno:1.40.0

WORKDIR /app

# Copy import map and configuration
COPY import_map.json .
COPY config/ ./config/
COPY certs/ ./certs/

# Copy source code
COPY src/ ./src/
COPY server.ts .

# Cache dependencies
RUN deno cache --import-map=import_map.json server.ts

EXPOSE 8443

# Run with required permissions
CMD ["deno", "run", \
     "--allow-net", \
     "--allow-env", \
     "--allow-read=./config,./certs", \
     "--allow-write=./logs", \
     "--import-map=import_map.json", \
     "server.ts"]
```

```yaml
# docker-compose.yml (simplified for Deno)
version: '3.8'
services:
  api:
    build:
      context: .
      dockerfile: Dockerfile.dev
    ports:
      - "8443:8443"
    environment:
      - DENO_ENV=development
      - AUTH0_DOMAIN=dev-thepia.auth0.com
      - AUTH0_CLIENT_ID=${AUTH0_CLIENT_ID}
      - AUTH0_CLIENT_SECRET=${AUTH0_CLIENT_SECRET}
      - SENDGRID_API_KEY=${SENDGRID_API_KEY}
    volumes:
      - ./certs:/app/certs:ro
      - ./logs:/app/logs
      - ./src:/app/src:ro
    
  # Optional: Redis for distributed rate limiting
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    command: redis-server --appendonly yes
```

---

## Deployment Requirements

### **Production Configuration**
- **SSL/TLS**: Valid certificates for thepia.com and thepia.net
- **Load balancing**: Support for multiple instances
- **Database**: Connection pooling and replication
- **Monitoring**: Prometheus metrics and alerting
- **Logging**: Centralized logging (ELK stack or similar)

### **Deno Environment Variables**
```bash
# .env for development
DENO_ENV=development
PORT=8443

# Auth0 Configuration
AUTH0_DOMAIN=dev-thepia.auth0.com
AUTH0_CLIENT_ID=your_auth0_client_id
AUTH0_CLIENT_SECRET=your_auth0_client_secret
AUTH0_AUDIENCE=https://api.thepia.com

# Email Service
SENDGRID_API_KEY=SG.your_sendgrid_api_key
EMAIL_FROM=noreply@thepia.com

# Optional: Redis for distributed systems
REDIS_URL=redis://localhost:6379

# Logging
LOG_LEVEL=info
LOG_FILE=./logs/api.log

# WebAuthn Configuration
WEBAUTHN_RP_NAME=Thepia
WEBAUTHN_TIMEOUT=60000
```

```bash
# Production environment variables
DENO_ENV=production
PORT=8443

# Auth0 Production
AUTH0_DOMAIN=thepia.auth0.com
AUTH0_CLIENT_ID=prod_client_id
AUTH0_CLIENT_SECRET=prod_client_secret
AUTH0_AUDIENCE=https://api.thepia.com

# Production Email
SENDGRID_API_KEY=SG.production_key

# Redis Cluster
REDIS_URL=redis://redis-cluster:6379

# SSL/TLS
TLS_CERT_FILE=/etc/ssl/certs/thepia.com.crt
TLS_KEY_FILE=/etc/ssl/private/thepia.com.key
```

### **CI/CD Pipeline Integration**
```yaml
# .github/workflows/deploy.yml
- name: Run API Contract Tests
  run: |
    npm run test:contracts
    
- name: Validate API Endpoints
  run: |
    npm run validate:api
    
- name: Deploy to Production
  run: |
    npm run deploy:production
```

---

## Success Criteria

### **Implementation Checklist**
- ✅ All documented endpoints implemented
- ✅ Request/response schemas match documentation
- ✅ Error codes and messages are consistent
- ✅ Rate limiting implemented correctly
- ✅ Security headers and CORS configured
- ✅ Database schema optimized for performance
- ✅ WebAuthn integration working correctly
- ✅ Email service integrated and tested
- ✅ Health checks returning proper status
- ✅ Monitoring and logging implemented

### **Performance Targets**
- **Response times**: < 200ms p95 for check-user
- **Throughput**: 1000 requests/minute sustained
- **Availability**: 99.9% uptime
- **Error rate**: < 0.1% for 5xx errors

### **Security Validation**
- **Input validation**: All endpoints reject invalid input
- **Rate limiting**: Proper throttling prevents abuse
- **CORS**: Only authorized origins allowed
- **WebAuthn**: Proper challenge/response validation
- **Session management**: Secure JWT implementation