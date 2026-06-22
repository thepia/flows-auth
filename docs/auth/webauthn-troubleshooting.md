# WebAuthn Troubleshooting Guide

This guide covers common WebAuthn issues and their resolution, including support procedures for production environments.

## Common Issues

### 1. Credential Mismatch (QR Code Instead of Touch ID)

**Symptoms:**
- User expects Touch ID/Face ID but gets QR code for cross-device authentication
- User previously had working biometric authentication
- Error: "The request is not allowed by the user agent or the platform in the current context"

**Root Cause:**
This occurs when:
1. User deleted passkeys from their device (iOS Settings → Passwords → Passkeys)
2. Auth0 still has the credential records stored
3. System tries to authenticate with credentials that no longer exist on the device

**Visual Indicators in Logs:**
```
✅ User found in Auth0: {
  hasWebAuthn: true,
  credentialCount: 1,  // ← Auth0 thinks user has credentials
  searchMethod: 'v3-exact'
}

// But WebAuthn fails with NotAllowedError
```

## Development Scripts

### Clear WebAuthn Credentials Script

Location: `scripts/clear-webauthn-simple.ts`

**Purpose:** Removes all WebAuthn credentials from Auth0 for a specific user, allowing them to register fresh credentials.

**Usage:**
```bash
npx tsx scripts/clear-webauthn-simple.ts <email>
```

**Example:**
```bash
npx tsx scripts/clear-webauthn-simple.ts user@example.com
```

**What it does:**
1. Searches for user in Auth0 by email
2. Displays current WebAuthn status
3. Clears `webauthn_credentials` array in `app_metadata`
4. Sets `hasWebAuthn: false` in `user_metadata`
5. Allows user to register new credentials

**Output:**
```
🔍 Looking for user: user@example.com
🔑 Getting Auth0 Management API token...
✅ Found user: auth0|683c5559f5ccd2705df26ea3
📊 Current WebAuthn status: { hasWebAuthn: true, credentialCount: 1 }
✅ WebAuthn credentials cleared from Auth0
🎯 You can now register new WebAuthn credentials
```

## Production Support Procedures

### For Customer Support Teams

#### Issue Identification

**Customer Reports:**
- "My Touch ID stopped working"
- "I keep getting a QR code instead of fingerprint login"
- "I deleted my passkeys and now I can't log in"

**Verification Steps:**
1. Confirm user email
2. Check Auth0 user record for WebAuthn status
3. Ask if user recently:
   - Changed devices
   - Reset their device
   - Deleted passkeys from iOS/Android settings
   - Cleared browser data

#### Resolution Options

##### Option 1: Admin Credential Reset (Immediate)

**For Support Staff:**

Use the admin API endpoint for production credential resets:

```bash
# Production admin API call
curl -X POST https://api.thepia.com/admin/reset-webauthn \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "reason": "User deleted passkeys from device",
    "adminId": "support_staff_id",
    "supportTicketId": "TICKET-12345"
  }'
```

**Steps:**
1. Verify user identity through existing support procedures
2. Run admin script to clear WebAuthn credentials
3. Inform user they can now register new credentials
4. Guide user through re-registration process

##### Option 2: User Self-Service (Recommended)

**Implement "Reset Passkeys" Feature:**

Add a "Reset My Passkeys" button in user account settings that:
1. Requires additional authentication (email verification, SMS, etc.)
2. Clears WebAuthn credentials from Auth0
3. Guides user through fresh registration

**UI Flow:**
```
Account Settings → Security → Passkeys → "Having trouble?" → Reset Passkeys
```

##### Option 3: Automatic Detection and Recovery

**Smart Error Handling:**

Detect credential mismatch scenarios and offer automatic recovery:

```typescript
// In WebAuthn authentication flow
if (error.name === 'NotAllowedError' && hasStoredCredentials) {
  // Show user-friendly message with reset option
  showCredentialMismatchDialog({
    message: "Your saved passkey appears to be unavailable.",
    options: ["Try Again", "Reset Passkeys", "Use Alternative Login"]
  });
}
```

### Implementation Recommendations

#### 1. Admin Dashboard Integration

**Support Portal Features:**
- Search users by email
- View WebAuthn credential status
- One-click credential reset with audit logging
- User notification system

#### 2. User-Facing Solutions

**Account Settings Page:**
```typescript
// Add to user settings
{
  section: "Security",
  items: [
    {
      title: "Passkeys",
      description: "Manage your biometric authentication",
      actions: [
        "View Active Passkeys",
        "Add New Passkey", 
        "Reset All Passkeys" // ← New option
      ]
    }
  ]
}
```

**Reset Flow:**
1. User clicks "Reset All Passkeys"
2. Confirm with email verification or backup method
3. Clear Auth0 credentials
4. Immediate redirect to re-registration flow
5. Success confirmation

#### 3. Proactive Monitoring

**Alert System:**
- Monitor for high rates of `NotAllowedError`
- Track credential mismatch patterns
- Auto-suggest credential resets

**Analytics:**
```typescript
// Track credential issues
{
  event: "webauthn_credential_mismatch",
  user_id: "auth0|...",
  error_type: "NotAllowedError",
  device_changed: boolean,
  suggested_resolution: "credential_reset"
}
```

### Production Script Template

For customer support teams, the production admin API is available at:

**API Endpoint:** `POST https://api.thepia.com/admin/reset-webauthn`

**Features:**
- Audit logging with unique audit IDs
- Admin authentication required
- User notification capability
- Support ticket ID tracking
- Comprehensive error handling

**Example Usage:**
```bash
# Reset credentials for user experiencing mismatch
curl -X POST https://api.thepia.com/admin/reset-webauthn \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "reason": "User deleted device passkeys",
    "adminId": "support_staff_jane",
    "supportTicketId": "HELP-2024-001234"
  }'
```

**Response:**
```json
{
  "success": true,
  "message": "WebAuthn credentials successfully cleared",
  "userFound": true,
  "credentialsCleared": 2,
  "auditId": "audit_1704201600000_abc123xyz"
}
```

## Prevention Strategies

### 1. Better User Education

**In-App Guidance:**
- Explain what passkeys are and how they work
- Warning before deleting device passkeys
- Clear instructions for device changes

### 2. Credential Sync Detection

**Device Change Detection:**
```typescript
// Detect potential device changes
if (lastLoginDevice !== currentDevice && hasWebAuthnCredentials) {
  showDeviceChangeDialog({
    message: "Logging in from a new device?",
    options: ["Use This Device", "Keep Previous Settings", "Reset Passkeys"]
  });
}
```

### 3. Backup Authentication Methods

**Always Provide Alternatives:**
- Email magic links
- SMS codes  
- Backup codes
- Traditional passwords (if policy allows)

## Monitoring and Metrics

**Key Metrics to Track:**
- WebAuthn success/failure rates
- Credential mismatch frequency
- Support ticket volume for passkey issues
- User credential reset requests

**Alerting Thresholds:**
- WebAuthn failure rate > 5%
- Multiple credential mismatches for same user
- Unusual spikes in credential resets

## Related Documentation

- [WebAuthn Setup Guide](./webauthn-setup.md)
- [Auth0 Configuration](./auth0-setup.md)
- [Production Deployment](./deployment.md)
- [Error Handling](./error-handling.md) 