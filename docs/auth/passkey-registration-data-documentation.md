# Passkey Registration Data: Complete Documentation

## Overview

This document provides a comprehensive analysis of all data saved during passkey registration, explaining the purpose of each piece, what it can contain, and how it might be used to securely pass information between applications or from user to application.

## Table of Contents

1. [Core Registration Data](#core-registration-data)
2. [Attestation Data](#attestation-data)
3. [Client Data](#client-data)
4. [Credential Properties](#credential-properties)
5. [Security Implications](#security-implications)
6. [Inter-Application Data Transfer](#inter-application-data-transfer)
7. [Implementation Considerations](#implementation-considerations)

## Core Registration Data

### 1. Credential ID (`credentialId`)

**Purpose**: Unique identifier for the credential, used to locate and reference the specific passkey.

**What it contains**:

- Probabilistically unique byte sequence (16-1023 bytes)
- Either random entropy (≥100 bits) or encrypted credential data
- Opaque to the relying party

**Security properties**:

- No sensitive information should be derivable
- Must be unique across all credentials
- Can be safely stored in databases and logs

**Inter-app usage**:

- Can be used as a correlation ID between systems
- Safe to include in URLs or API calls
- Useful for credential management across multiple services

```typescript
interface CredentialData {
  credentialId: string; // Base64URL encoded
  // Safe to share, no sensitive data
}
```

### 2. Public Key (`publicKey`)

**Purpose**: Cryptographic public key used to verify signatures from the corresponding private key.

**What it contains**:

- COSE-encoded public key (typically ECDSA P-256 or RSA)
- Algorithm identifier (-7 for ES256, -257 for RS256)
- Key parameters (x, y coordinates for EC keys)

**Security properties**:

- Safe to share publicly
- Cannot be used to derive the private key
- Enables signature verification

**Inter-app usage**:

- Can be shared between services for signature verification
- Enables federated authentication scenarios
- Useful for building trust relationships

```typescript
interface PublicKeyData {
  publicKey: ArrayBuffer; // COSE-encoded public key
  algorithm: number; // COSE algorithm identifier
  // Safe to share publicly
}
```

### 3. User Handle (`userHandle`)

**Purpose**: Opaque identifier linking the credential to a specific user account.

**What it contains**:

- Up to 64 bytes of opaque data
- Chosen by the relying party during registration
- Should not contain personally identifiable information

**Security properties**:

- Must not contain PII (per WebAuthn spec)
- Should be consistent across all credentials for the same user
- Can be used for user correlation

**Inter-app usage**:

- Can serve as a stable user identifier across systems
- Useful for account linking and federation
- Should be treated as sensitive for privacy reasons

```typescript
interface UserData {
  userHandle: ArrayBuffer; // Up to 64 bytes, no PII
  // Treat as sensitive for privacy
}
```

## Attestation Data

### 4. Attestation Object (`attestationObject`)

**Purpose**: Cryptographic proof of the authenticator's authenticity and the credential's properties.

**What it contains**:

- Authenticator data (RP ID hash, flags, counter, credential data)
- Attestation statement (signature and certificates)
- Format identifier (packed, fido-u2f, android-key, etc.)

**Security properties**:

- Proves credential was created by a specific authenticator
- Contains manufacturer information
- Can indicate security properties of the authenticator

**Inter-app usage**:

- Can be used for device trust decisions
- Enables policy enforcement based on authenticator type
- Useful for compliance and audit requirements

```typescript
interface AttestationData {
  attestationObject: ArrayBuffer;
  format: string; // "packed", "fido-u2f", "android-key", etc.
  // Contains device and security information
}
```

### 5. AAGUID (Authenticator Attestation GUID)

**Purpose**: Identifies the make and model of the authenticator.

**What it contains**:

- 16-byte UUID identifying authenticator model
- Links to FIDO Metadata Service entries
- May be all zeros for privacy reasons

**Security properties**:

- Can be used for device identification
- May be privacy-sensitive
- Useful for security policy enforcement

**Inter-app usage**:

- Can inform trust decisions
- Useful for device management
- Enables authenticator-specific features

```typescript
interface AuthenticatorInfo {
  aaguid: string; // UUID format
  // Can be used for device trust decisions
}
```

## Client Data

### 6. Client Data JSON (`clientDataJSON`)

**Purpose**: Contains contextual information about the registration ceremony.

**What it contains**:

- Type: "webauthn.create"
- Challenge: Random value from server
- Origin: The website/app that initiated registration
- Cross-origin information (if applicable)

**Security properties**:

- Signed by the authenticator
- Prevents replay attacks (via challenge)
- Prevents cross-origin attacks (via origin binding)

**Inter-app usage**:

- Origin can be used for trust decisions
- Challenge can be used for session correlation
- Timestamp information for audit trails

```typescript
interface ClientData {
  type: "webauthn.create";
  challenge: string; // Base64URL encoded
  origin: string; // https://example.com
  crossOrigin?: boolean;
  topOrigin?: string;
}
```

## Credential Properties

### 7. Backup Eligibility (`backupEligible`)

**Purpose**: Indicates whether the credential can be backed up/synced.

**What it contains**:

- Boolean flag set during credential creation
- Permanent property of the credential
- Indicates multi-device vs single-device credential

**Security properties**:

- Affects credential recovery scenarios
- Impacts security model (synced vs device-bound)
- Important for risk assessment

**Inter-app usage**:

- Can inform backup/recovery policies
- Useful for user experience decisions
- Important for security policy enforcement

### 8. Backup State (`backupState`)

**Purpose**: Current backup status of the credential.

**What it contains**:

- Boolean flag indicating current backup status
- Can change over time
- Only meaningful for backup-eligible credentials

**Security properties**:

- Indicates current availability across devices
- Affects account recovery scenarios
- Important for security monitoring

**Inter-app usage**:

- Can inform user experience
- Useful for account recovery planning
- Important for security policy decisions

### 9. Transports (`transports`)

**Purpose**: Indicates how the authenticator can be accessed.

**What it contains**:

- Array of transport methods: "usb", "nfc", "ble", "internal", "hybrid"
- Helps optimize user experience
- Indicates authenticator capabilities

**Security properties**:

- No direct security implications
- Useful for user experience optimization
- Can indicate authenticator type

**Inter-app usage**:

- Can optimize authentication flows
- Useful for device management
- Helps with user guidance

```typescript
interface CredentialProperties {
  backupEligible: boolean;
  backupState: boolean;
  transports: ("usb" | "nfc" | "ble" | "internal" | "hybrid")[];
}
```

## Security Implications

### Data Classification

**Public Data** (safe to share):

- Credential ID
- Public key
- AAGUID (with privacy considerations)
- Transports
- Backup eligibility

**Sensitive Data** (handle carefully):

- User handle (privacy implications)
- Attestation object (may contain identifying information)
- Client data origin (may reveal user behavior)

**Private Data** (never share):

- Private key (never leaves authenticator)
- PIN/biometric data (local to authenticator)

### Trust Boundaries

1. **Authenticator → Browser**: Cryptographically secured via WebAuthn
2. **Browser → Server**: Secured via HTTPS
3. **Server → Server**: Application-level security required
4. **Server → Client**: Consider data sensitivity

## Inter-Application Data Transfer

### Secure Information Passing Scenarios

#### 1. Federated Authentication

```typescript
interface FederatedCredential {
  credentialId: string;
  publicKey: ArrayBuffer;
  userHandle: ArrayBuffer;
  origin: string;
  // Can be safely shared between trusted services
}
```

#### 2. Device Trust Assessment

```typescript
interface DeviceTrustInfo {
  aaguid: string;
  attestationObject: ArrayBuffer;
  backupEligible: boolean;
  transports: string[];
  // Used for policy enforcement
}
```

#### 3. User Account Linking

```typescript
interface AccountLinkingData {
  userHandle: ArrayBuffer; // Stable user identifier
  credentialId: string; // For correlation
  origin: string; // Source verification
  // Enables cross-service account correlation
}
```

### Security Considerations for Data Transfer

1. **Encryption in Transit**: Always use TLS/HTTPS
2. **Access Control**: Implement proper authorization
3. **Data Minimization**: Only transfer necessary data
4. **Audit Logging**: Log all data transfers
5. **Privacy Compliance**: Respect user privacy preferences

### Example: Secure Service-to-Service Transfer

```typescript
interface SecureTransfer {
  // Safe to transfer
  publicData: {
    credentialId: string;
    publicKey: ArrayBuffer;
    transports: string[];
  };

  // Requires encryption/authorization
  sensitiveData: {
    userHandle: ArrayBuffer;
    attestationObject?: ArrayBuffer;
  };

  // Metadata
  transferMetadata: {
    sourceOrigin: string;
    timestamp: number;
    purpose: string;
  };
}
```

## Implementation Considerations

### Storage Recommendations

1. **Database Design**:

   - Index credential IDs for fast lookup
   - Store public keys in binary format
   - Consider partitioning by user or origin

2. **Caching Strategy**:

   - Cache public keys for signature verification
   - Cache attestation data for trust decisions
   - Implement cache invalidation policies

3. **Backup and Recovery**:
   - Back up all registration data
   - Implement secure key escrow if required
   - Plan for credential migration scenarios

### Privacy Protection

1. **Data Minimization**:

   - Only collect necessary attestation data
   - Avoid storing unnecessary metadata
   - Implement data retention policies

2. **User Control**:

   - Allow users to view stored data
   - Provide credential deletion capabilities
   - Implement data export functionality

3. **Compliance**:
   - Follow GDPR/privacy regulations
   - Implement consent mechanisms
   - Provide transparency about data usage

### Integration Patterns

#### Pattern 1: Credential Sharing Service

```typescript
class CredentialSharingService {
  async shareCredential(
    credentialId: string,
    targetService: string,
    permissions: string[]
  ): Promise<SharedCredential> {
    // Verify authorization
    // Package safe data
    // Create secure transfer
  }
}
```

#### Pattern 2: Trust Assessment Service

```typescript
class TrustAssessmentService {
  async assessDevice(
    attestationObject: ArrayBuffer,
    aaguid: string
  ): Promise<TrustLevel> {
    // Verify attestation
    // Check against policies
    // Return trust assessment
  }
}
```

#### Pattern 3: User Identity Federation

```typescript
class IdentityFederationService {
  async linkAccounts(
    userHandle: ArrayBuffer,
    sourceOrigin: string,
    targetOrigin: string
  ): Promise<FederationResult> {
    // Verify user consent
    // Create secure linkage
    // Maintain privacy
  }
}
```

## Conclusion

Passkey registration data provides a rich set of information that can be used for various security, user experience, and integration purposes. Understanding the properties and security implications of each data element is crucial for building secure and privacy-respecting systems.

Key takeaways:

- Most registration data is safe to share between trusted services
- User handles and attestation data require careful privacy consideration
- Proper encryption and access control are essential for sensitive data transfers
- The data enables powerful scenarios like federated authentication and device trust assessment
- Always follow privacy regulations and user consent requirements

When implementing passkey systems, carefully consider which data elements you need, how they will be used, and what security and privacy protections are required for your specific use case.

## Current Implementation Data Structure

### Your System's Data Model

Based on the current implementation in your system, here's the specific data structure being saved:

```typescript
interface UserCredential {
  credentialID: Uint8Array; // Raw credential identifier
  credentialPublicKey: Uint8Array; // COSE-encoded public key
  counter: number; // Signature counter for replay protection
  credentialDeviceType: "singleDevice" | "multiDevice"; // Device binding type
  credentialBackedUp: boolean; // Current backup status
  transports?: AuthenticatorTransport[]; // Available transport methods
}

interface UserRecord {
  email: string; // User's email address
  userId: string; // Format: "auth0|passkey-{email}-{timestamp}"
  hasWebAuthn: boolean; // Whether user has any passkeys
  registeredAt: number; // Unix timestamp of registration
  credentials: UserCredential[]; // Array of all user's credentials
}
```

### Data Flow in Your System

#### Registration Process

1. **User Registration** (`/api/auth/register.ts`):

   - Creates `userId` in format: `auth0|passkey-{email}-{timestamp}`
   - Stores user record with `hasWebAuthn: false` initially

2. **WebAuthn Registration Options** (`/api/auth/webauthn/register-options.ts`):

   - Generates challenge and stores in challenge store
   - Uses email as `userHandle` (converted to Uint8Array)
   - Sets up credential creation options

3. **WebAuthn Registration Verification** (`/api/auth/webauthn/register-verify.ts`):
   - Verifies attestation response
   - Extracts and stores credential data:
     ```typescript
     const credential: UserCredential = {
       credentialID: verification.registrationInfo.credentialID,
       credentialPublicKey: verification.registrationInfo.credentialPublicKey,
       counter: verification.registrationInfo.counter,
       credentialDeviceType: verification.registrationInfo.credentialDeviceType,
       credentialBackedUp: verification.registrationInfo.credentialBackedUp,
       transports: body.response.transports,
     };
     ```

#### Authentication Process

1. **Challenge Generation** (`/api/auth/webauthn/challenge.ts`):

   - Retrieves user's stored credentials
   - Maps credential IDs for `allowCredentials`
   - Generates fresh authentication challenge

2. **Authentication Verification** (`/api/auth/webauthn/verify.ts`):
   - Verifies authentication response
   - Updates credential counter
   - Returns user data and demo tokens

### Security Properties of Your Data

#### Safe to Share Between Services

- `credentialID` (as base64url string)
- `credentialPublicKey` (for signature verification)
- `credentialDeviceType` (for policy decisions)
- `credentialBackedUp` (for UX decisions)
- `transports` (for optimization)
- `hasWebAuthn` (for capability detection)

#### Sensitive Data (Handle Carefully)

- `email` (PII - requires privacy protection)
- `userId` (contains email - treat as sensitive)
- `registeredAt` (behavioral data)

#### Internal Use Only

- `counter` (security-critical for replay protection)
- Challenge data (temporary, security-critical)

### Potential Enhancements for Inter-App Usage

#### 1. Add AAGUID Support

```typescript
interface UserCredential {
  // ... existing fields
  aaguid?: string; // Authenticator model identifier
}
```

#### 2. Add Attestation Data Storage

```typescript
interface UserCredential {
  // ... existing fields
  attestationObject?: Uint8Array; // For device trust assessment
  attestationFormat?: string; // "packed", "fido-u2f", etc.
}
```

#### 3. Add Origin Tracking

```typescript
interface UserCredential {
  // ... existing fields
  origin: string; // Where credential was created
  createdAt: number; // When credential was created
}
```

#### 4. Add User Handle Separation

```typescript
interface UserRecord {
  // ... existing fields
  userHandle: Uint8Array; // Separate from email for privacy
}
```

### Migration Considerations

If you want to enhance your data model for better inter-app usage:

1. **Backward Compatibility**: Add new fields as optional
2. **Data Migration**: Plan for existing credential updates
3. **Privacy**: Consider separating PII from technical data
4. **Storage**: Plan for increased data size with attestation objects

### Example: Enhanced Data Structure for Federation

```typescript
interface EnhancedUserCredential extends UserCredential {
  aaguid?: string;
  attestationObject?: Uint8Array;
  attestationFormat?: string;
  origin: string;
  createdAt: number;
  metadata?: {
    deviceName?: string;
    lastUsed?: number;
    trustLevel?: "low" | "medium" | "high";
  };
}

interface FederationSafeData {
  credentialId: string; // Base64URL encoded
  publicKey: string; // Base64URL encoded COSE key
  deviceType: "singleDevice" | "multiDevice";
  backupEligible: boolean;
  transports: string[];
  origin: string;
  trustLevel?: string;
  // No PII included
}
```

This structure would enable secure sharing between your services while maintaining privacy and security.
