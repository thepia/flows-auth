# Per-Device Passkey Architecture

**🚨 CRITICAL IMPLEMENTATION GAP**: Current API server doesn't properly handle per-device passkey storage

## Current Implementation Issues

### **Major Architectural Problems Identified**

1. **No per-device passkey storage** - Current implementation doesn't store credentials per device
2. **Missing domain-specific credentials** - No separation between thepia.com and thepia.net passkeys  
3. **No device management** - Users can't see or manage their registered devices
4. **Single credential assumption** - Code assumes one passkey per user

### **Why Per-Device Storage Is Critical**

#### **Real-World User Scenarios**
- **Multiple devices**: User has iPhone, MacBook, iPad - each needs its own passkey
- **Cross-domain usage**: Same user on thepia.com (employer portal) and thepia.net (employee app)
- **Device replacement**: User gets new phone, needs to register new passkey without losing access
- **Shared devices**: Work computer vs personal computer require separate passkeys

#### **Security Requirements**
- **Device-bound credentials**: Passkeys must be tied to specific hardware
- **Domain isolation**: thepia.com credentials shouldn't work on thepia.net
- **Credential lifecycle**: Registration, usage tracking, revocation per device
- **User control**: Ability to see and manage all registered devices

---

## Required Architecture Changes

### **Auth0 Metadata Schema (Updated)**

```typescript
interface Auth0UserMetadata {
  user_id: string;
  email: string;
  name?: string;
  
  app_metadata: {
    thepia: {
      status: 'active' | 'suspended' | 'deleted';
      created_at: string;
      updated_at: string;
      
      // Domain-specific data
      domains: {
        'thepia.com': {
          credentials: WebAuthnCredential[];
          last_signin?: string;
          settings?: DomainSettings;
        };
        'thepia.net': {
          credentials: WebAuthnCredential[];
          last_signin?: string;
          settings?: DomainSettings;
        };
      };
      
      // Cross-domain user preferences
      preferences?: {
        default_domain?: string;
        device_naming?: boolean;
        security_notifications?: boolean;
      };
    };
  };
}

interface WebAuthnCredential {
  // Unique identifier for this credential
  id: string;                    // e.g., "cred_iphone_15_pro_thepia_com"
  
  // WebAuthn standard fields
  credential_id: string;         // Base64URL encoded credential ID
  public_key: string;           // Base64URL encoded public key
  counter: number;              // Signature counter for replay protection
  
  // Device identification
  device_name: string;          // User-friendly name: "iPhone 15 Pro", "MacBook Pro"
  device_type?: 'mobile' | 'desktop' | 'tablet' | 'security_key';
  transports: AuthenticatorTransport[]; // ['internal', 'usb', 'nfc', 'ble']
  
  // Registration metadata
  created_at: string;           // ISO timestamp of registration
  user_agent?: string;          // Browser/device info at registration
  ip_address?: string;          // Registration IP (for security)
  
  // Usage tracking
  last_used?: string;           // ISO timestamp of last authentication
  usage_count: number;          // Number of times this credential was used
  
  // Management
  is_active: boolean;           // Can be disabled without deletion
  revoked_at?: string;          // Timestamp if manually revoked
  revocation_reason?: string;   // Why it was revoked
}

interface DomainSettings {
  // Domain-specific preferences
  preferred_auth_method?: 'passkey' | 'magic_link';
  require_device_verification?: boolean;
  session_timeout?: number;
}
```

### **Example: Multi-Device, Multi-Domain User**

```typescript
const userWithMultipleDevices = {
  user_id: "auth0|user123",
  email: "user@example.com",
  app_metadata: {
    thepia: {
      status: "active",
      created_at: "2024-01-10T10:00:00Z",
      updated_at: "2024-01-22T15:30:00Z",
      
      domains: {
        "thepia.com": {
          credentials: [
            {
              id: "cred_iphone_thepia_com_001",
              credential_id: "base64url-cred-id-1",
              public_key: "base64url-pubkey-1",
              counter: 15,
              device_name: "iPhone 15 Pro",
              device_type: "mobile",
              transports: ["internal"],
              created_at: "2024-01-10T10:15:00Z",
              last_used: "2024-01-22T09:30:00Z",
              usage_count: 15,
              is_active: true
            },
            {
              id: "cred_macbook_thepia_com_001",
              credential_id: "base64url-cred-id-2", 
              public_key: "base64url-pubkey-2",
              counter: 8,
              device_name: "MacBook Pro 16-inch",
              device_type: "desktop",
              transports: ["internal", "usb"],
              created_at: "2024-01-12T14:20:00Z",
              last_used: "2024-01-21T16:45:00Z",
              usage_count: 8,
              is_active: true
            }
          ],
          last_signin: "2024-01-22T09:30:00Z",
          settings: {
            preferred_auth_method: "passkey",
            session_timeout: 28800 // 8 hours
          }
        },
        
        "thepia.net": {
          credentials: [
            {
              id: "cred_iphone_thepia_net_001",
              credential_id: "base64url-cred-id-3",
              public_key: "base64url-pubkey-3", 
              counter: 25,
              device_name: "iPhone 15 Pro",
              device_type: "mobile",
              transports: ["internal"],
              created_at: "2024-01-10T10:30:00Z",
              last_used: "2024-01-22T15:30:00Z",
              usage_count: 25,
              is_active: true
            },
            {
              id: "cred_ipad_thepia_net_001",
              credential_id: "base64url-cred-id-4",
              public_key: "base64url-pubkey-4",
              counter: 3,
              device_name: "iPad Pro",
              device_type: "tablet", 
              transports: ["internal"],
              created_at: "2024-01-18T11:00:00Z",
              last_used: "2024-01-20T19:15:00Z",
              usage_count: 3,
              is_active: true
            }
          ],
          last_signin: "2024-01-22T15:30:00Z",
          settings: {
            preferred_auth_method: "passkey"
          }
        }
      },
      
      preferences: {
        default_domain: "thepia.net",
        device_naming: true,
        security_notifications: true
      }
    }
  }
};
```

---

## API Implementation Changes Required

### **1. Updated POST /auth/check-user**

```typescript
// Current (WRONG): Assumes single passkey per user
const hasPasskey = user.passkeys?.length > 0;

// Required (CORRECT): Check domain-specific credentials
router.post('/auth/check-user', async (ctx) => {
  const { email } = await ctx.request.body().value;
  const domain = getDomainFromRequest(ctx); // 'thepia.com' or 'thepia.net'
  
  const auth0User = await auth0Management.getUsersByEmail(email);
  if (!auth0User.length) {
    return ctx.response.body = {
      userExists: false,
      hasPasskey: false,
      email: email.toLowerCase()
    };
  }
  
  const user = auth0User[0];
  const domainData = user.app_metadata?.thepia?.domains?.[domain];
  const activeCredentials = domainData?.credentials?.filter(cred => cred.is_active) || [];
  
  ctx.response.body = {
    userExists: true,
    hasPasskey: activeCredentials.length > 0,
    deviceCount: activeCredentials.length, // NEW: Number of registered devices
    email: user.email,
    userId: user.user_id
  };
});
```

### **2. Updated POST /auth/webauthn/challenge**

```typescript
router.post('/auth/webauthn/challenge', async (ctx) => {
  const { email } = await ctx.request.body().value;
  const domain = getDomainFromRequest(ctx);
  
  const auth0User = await auth0Management.getUsersByEmail(email);
  if (!auth0User.length) {
    return ctx.response.status = 404;
  }
  
  const user = auth0User[0];
  const domainData = user.app_metadata?.thepia?.domains?.[domain];
  const activeCredentials = domainData?.credentials?.filter(cred => cred.is_active) || [];
  
  const options = await generateAuthenticationOptions({
    rpID: domain,
    // CRITICAL: Only include credentials for this specific domain
    allowCredentials: activeCredentials.map(cred => ({
      id: cred.credential_id,
      type: 'public-key' as const,
      transports: cred.transports
    })),
    timeout: 60000,
    userVerification: 'preferred'
  });
  
  // Store challenge with domain context
  const challengeId = crypto.randomUUID();
  challengeStore.set(challengeId, {
    userId: user.user_id,
    email: user.email,
    challenge: options.challenge,
    domain, // CRITICAL: Store domain context
    expiresAt: new Date(Date.now() + 5 * 60 * 1000)
  });
  
  ctx.response.body = {
    ...options,
    challengeId,
    deviceCount: activeCredentials.length // Help UI show device selection
  };
});
```

### **3. Updated POST /auth/webauthn/verify**

```typescript
router.post('/auth/webauthn/verify', async (ctx) => {
  const { email, challengeId, credentialResponse } = await ctx.request.body().value;
  
  // Retrieve challenge with domain context
  const storedChallenge = challengeStore.get(challengeId);
  if (!storedChallenge || new Date() > storedChallenge.expiresAt) {
    return ctx.response.status = 400;
  }
  
  const domain = storedChallenge.domain;
  const auth0User = await auth0Management.getUser({ id: storedChallenge.userId });
  const domainData = auth0User.app_metadata?.thepia?.domains?.[domain];
  const credentials = domainData?.credentials || [];
  
  // Find the specific credential used
  const usedCredential = credentials.find(cred => 
    cred.credential_id === credentialResponse.id && cred.is_active
  );
  
  if (!usedCredential) {
    return ctx.response.status = 400; // Unknown credential
  }
  
  // Verify WebAuthn response
  const verification = await verifyAuthenticationResponse({
    response: credentialResponse,
    expectedChallenge: storedChallenge.challenge,
    expectedOrigin: getOriginForDomain(domain),
    expectedRPID: domain,
    authenticator: {
      credentialID: usedCredential.credential_id,
      credentialPublicKey: usedCredential.public_key,
      counter: usedCredential.counter
    }
  });
  
  if (!verification.verified) {
    return ctx.response.status = 400;
  }
  
  // CRITICAL: Update credential usage tracking
  await updateCredentialUsage(auth0User.user_id, domain, usedCredential.id, {
    counter: verification.authenticationInfo.newCounter,
    last_used: new Date().toISOString(),
    usage_count: usedCredential.usage_count + 1
  });
  
  // Generate session token
  const sessionToken = await generateSessionToken({
    userId: auth0User.user_id,
    email: auth0User.email,
    domain,
    deviceId: usedCredential.id // Include device context in session
  });
  
  ctx.response.body = {
    success: true,
    sessionToken,
    user: {
      id: auth0User.user_id,
      email: auth0User.email,
      name: auth0User.name
    },
    device: {
      id: usedCredential.id,
      name: usedCredential.device_name,
      type: usedCredential.device_type
    },
    expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString()
  };
});
```

### **4. New Device Management Endpoints**

```typescript
// GET /auth/devices - List user's registered devices
router.get('/auth/devices', authenticateUser, async (ctx) => {
  const { userId } = ctx.state.user;
  const domain = getDomainFromRequest(ctx);
  
  const auth0User = await auth0Management.getUser({ id: userId });
  const domainData = auth0User.app_metadata?.thepia?.domains?.[domain];
  const credentials = domainData?.credentials || [];
  
  ctx.response.body = {
    devices: credentials.map(cred => ({
      id: cred.id,
      name: cred.device_name,
      type: cred.device_type,
      created_at: cred.created_at,
      last_used: cred.last_used,
      usage_count: cred.usage_count,
      is_active: cred.is_active,
      transports: cred.transports
    }))
  };
});

// POST /auth/devices/:deviceId/revoke - Revoke a specific device
router.post('/auth/devices/:deviceId/revoke', authenticateUser, async (ctx) => {
  const { deviceId } = ctx.params;
  const { userId } = ctx.state.user;
  const domain = getDomainFromRequest(ctx);
  
  await revokeUserDevice(userId, domain, deviceId, {
    revoked_at: new Date().toISOString(),
    revocation_reason: 'user_requested'
  });
  
  ctx.response.body = { success: true };
});

// PUT /auth/devices/:deviceId/rename - Rename a device
router.put('/auth/devices/:deviceId/rename', authenticateUser, async (ctx) => {
  const { deviceId } = ctx.params;
  const { name } = await ctx.request.body().value;
  const { userId } = ctx.state.user;
  const domain = getDomainFromRequest(ctx);
  
  await updateDeviceName(userId, domain, deviceId, name);
  
  ctx.response.body = { success: true };
});
```

---

## Migration Strategy

### **Phase 1: Schema Migration (Week 1)**

1. **Extend Auth0 metadata structure** for existing users
2. **Migrate existing credentials** to new per-device format
3. **Create migration scripts** to handle data transformation

```typescript
// Migration script for existing users
async function migrateExistingUsers() {
  const users = await auth0Management.getUsers({
    q: 'app_metadata.thepia.credentials:*',
    search_engine: 'v3'
  });
  
  for (const user of users) {
    const oldCredentials = user.app_metadata?.thepia?.credentials || [];
    
    if (oldCredentials.length > 0) {
      // Migrate to new structure
      const migratedData = {
        thepia: {
          ...user.app_metadata.thepia,
          domains: {
            'thepia.net': {
              credentials: oldCredentials.map((cred, index) => ({
                id: `migrated_device_${index}`,
                credential_id: cred.credential_id,
                public_key: cred.public_key,
                counter: cred.counter || 0,
                device_name: `Migrated Device ${index + 1}`,
                device_type: 'unknown',
                transports: cred.transports || ['internal'],
                created_at: user.created_at,
                usage_count: 0,
                is_active: true
              }))
            }
          }
        }
      };
      
      await auth0Management.updateAppMetadata({ id: user.user_id }, migratedData);
    }
  }
}
```

### **Phase 2: API Updates (Week 2)**

1. **Update all API endpoints** to handle per-device logic
2. **Add device management endpoints**
3. **Update test scenarios** to cover multi-device cases

### **Phase 3: Frontend Updates (Week 3)**

1. **Update flows-auth library** to handle device management
2. **Add device naming during registration**
3. **Create device management UI components**

### **Phase 4: Testing & Rollout (Week 4)**

1. **Comprehensive testing** of migration and new features
2. **Gradual rollout** with feature flags
3. **Monitor for issues** and performance impact

---

## Critical TODOs

### **🚨 IMMEDIATE (This Week)**
- [ ] **Design Auth0 metadata schema** - Define exact structure
- [ ] **Create migration scripts** - Handle existing user data
- [ ] **Update API contract documentation** - Reflect per-device endpoints
- [ ] **Plan backward compatibility** - Ensure smooth transition

### **🔶 HIGH PRIORITY (Next Week)** 
- [ ] **Implement per-device storage** - Update all API endpoints
- [ ] **Add device management endpoints** - CRUD operations for devices
- [ ] **Update WebAuthn challenge/verify** - Domain-specific credential handling
- [ ] **Create comprehensive tests** - Cover multi-device scenarios

### **🔹 MEDIUM PRIORITY (Following Weeks)**
- [ ] **Frontend device management** - UI for managing registered devices
- [ ] **Device naming during registration** - Better UX for device identification
- [ ] **Security notifications** - Alert users of new device registrations
- [ ] **Usage analytics** - Track device usage patterns

### **📊 METRICS TO TRACK**
- **Devices per user** - Average number of registered devices
- **Cross-domain usage** - Users active on both thepia.com and thepia.net
- **Device lifecycle** - Registration, usage, revocation patterns
- **Authentication success rates** - By device type and domain

---

## Security Considerations

### **Cross-Domain Isolation**
- **Credentials must be domain-specific** - thepia.com credentials don't work on thepia.net
- **Separate credential stores** - No sharing between domains
- **Domain validation** - Strict origin checking in WebAuthn

### **Device Security**
- **Credential revocation** - Users can revoke compromised devices
- **Usage monitoring** - Track unusual authentication patterns
- **Device identification** - Help users identify and manage devices

### **Migration Security**
- **Data validation** - Ensure migrated data integrity
- **Rollback capability** - Ability to revert if issues occur
- **Audit logging** - Track all migration activities