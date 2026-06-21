# Passkey Troubleshooting & Availability Detection

This document describes how Thepia detects and handles scenarios where passkeys are registered in Auth0 but not available locally on the user's device.

## The Problem

A common UX challenge occurs when:

1. **User has a passkey registered in Auth0** (server-side record exists)
2. **Passkey is not available locally** due to:
   - User deleted it from their keychain/device
   - User is on a different device
   - Browser/device limitations
   - Keychain synchronization issues

Without detection, users would see a confusing QR code for cross-device authentication even when they intended to delete their passkey entirely.

## Updated Authentication Flow (Current Implementation)

### Direct Authentication Flow

**Current Implementation** eliminates intermediate dialog steps for a seamless experience:

1. **Conditional Discovery**: As user types valid email, conditional mediation starts automatically
2. **Browser Integration**: If passkeys exist, browser may show autofill suggestions  
3. **Direct Authentication**: Clicking "Continue with Touch ID" triggers immediate biometric prompt
4. **Intelligent Error Handling**: Timing-based classification routes users to appropriate recovery flows

### Key Improvements

- **No Intermediate Steps**: Users get immediate biometric prompts instead of dialog chains
- **Standards Compliant**: Uses `mediation: 'conditional'` for passkey discovery
- **Enhanced Error Classification**: Distinguishes between user cancellation, credential issues, and availability
- **Real-time Integration**: Email field includes `autocomplete="webauthn"` for browser autofill

### Deprecated Patterns

The following patterns have been **removed** from the current implementation:

#### ❌ **Two-Step Authentication Flow (Deprecated)**
```
Email Input → Continue Button → Intermediate Dialog → Continue Again → Biometric Prompt
```

#### ✅ **Direct Authentication Flow (Current)**  
```
Email Input → Continue Button → Immediate Biometric Prompt
```

#### ❌ **Timing-Based Detection (Deprecated)**
While still present as fallback, timing analysis should not be the primary detection method:
```typescript
// DEPRECATED: Primary reliance on timing heuristics
const isCredentialMissing = duration < 500; // Unreliable
```

#### ✅ **Conditional Mediation (Current)**
```typescript
// PREFERRED: Standards-compliant discovery
const response = await navigator.credentials.get({
  publicKey: options,
  mediation: 'conditional' // Non-intrusive, privacy-preserving
});
```

## Technical Solution

### Error Timing Analysis

We use **timing analysis** to distinguish between different `NotAllowedError` scenarios:

| Scenario | Timing | User Experience |
|----------|--------|------------------|
| **Credential not found locally** | < 500ms | Instant rejection from browser |
| **User cancellation** | 500ms - 10s | Normal TouchID/FaceID interaction |
| **Long timeout** | > 10s | User left prompt open |

### Detection Functions

```typescript
// Quick failures indicate no matching credential locally
export function isCredentialNotFoundLocally(error: any, duration?: number): boolean {
  if (error?.name !== 'NotAllowedError') return false;
  
  // Very quick failures (< 500ms) typically indicate no matching credential
  if (duration !== undefined && duration < 500) {
    return true;
  }
  
  // Some browsers provide specific messages
  const notFoundPatterns = [
    'no credentials available',
    'credential not found', 
    'no matching credential',
    'authenticator not found',
  ];
  
  return notFoundPatterns.some(pattern => 
    error.message?.toLowerCase().includes(pattern)
  );
}

// Normal timing with cancellation patterns
export function isUserCancellation(error: any, duration?: number): boolean {
  if (error?.name !== 'NotAllowedError') return false;
  
  // Quick failures are likely credential not found, not cancellation
  if (duration !== undefined && duration < 500) {
    return false;
  }
  
  const cancellationPatterns = [
    'user denied permission',
    'cancelled by user',
    'operation was cancelled',
    'user cancelled',
    'aborted by user',
  ];
  
  return cancellationPatterns.some(pattern => 
    error.message?.toLowerCase().includes(pattern)
  );
}

// Credential exists but has issues (excluding cancellation and not-found)
export function isCredentialMismatchError(error: any, duration?: number): boolean {
  if (error?.name !== 'NotAllowedError') return false;
  
  // Exclude other scenarios first
  if (isUserCancellation(error, duration)) return false;
  if (isCredentialNotFoundLocally(error, duration)) return false;
  
  // Look for credential-specific issues
  const mismatchPatterns = [
    'credential',
    'unavailable', 
    'invalid',
    'not recognized',
    'authentication failed',
  ];
  
  return mismatchPatterns.some(pattern => 
    error.message?.toLowerCase().includes(pattern)
  );
}
```

### Classification Priority

The system uses a hierarchical approach to ensure only one classification applies:

1. **Credential not found locally** (highest priority)
   - Quick timing (< 500ms) OR specific "not found" messages
   
2. **User cancellation** (medium priority)  
   - Normal timing + cancellation message patterns
   
3. **Credential mismatch** (fallback)
   - Everything else that's not cancellation or not-found

## User Experience Flows

### Scenario 1: Passkey Not Available Locally

**Detection:** Quick failure (< 500ms) or specific "not found" messages

**UI Response:** Shows "Passkey Not Available" screen with options:

```
⚠️ Passkey Not Available

Your passkey isn't available on this device. This could mean it was 
deleted from your keychain or you're using a different device.

What would you like to do?

📱 Use passkey from another device
   Scan QR code to authenticate with phone/tablet

🔑 Set up a new passkey  
   Replace the old passkey with a new one

📧 Use email login instead
   Get a secure login link sent to your email

[ Use a different account ]
```

### Scenario 2: User Cancelled TouchID/FaceID

**Detection:** Normal timing (≥ 500ms) + cancellation message patterns

**UI Response:** Shows cancellation message and retry option:

```
TouchID was cancelled. Please try again.

[Try Again] [Use Different Account]
```

### Scenario 3: Credential Mismatch/Issues  

**Detection:** Normal timing without cancellation patterns (fallback)

**UI Response:** Shows credential issue screen:

```
🔑 Passkey Issue

Your passkey appears to be outdated or has compatibility issues. 
Setting up a new passkey will resolve this.

[Set up a new passkey] [Use email login instead] [Use different account]
```

## Implementation in AuthModal

The enhanced error handling in `AuthModal.tsx`:

```typescript
const handleWebAuthnAuth = async () => {
  const startTime = Date.now();
  
  try {
    const result = await service.authenticateWithWebAuthn(emailToUse);
    // ... success handling
  } catch (error: any) {
    const duration = Date.now() - startTime;
    
    if (isCredentialNotFoundLocally(error, duration)) {
      setCurrentStep('credential-not-found');
    } else if (isUserCancellation(error, duration)) {
      const cancelMsg = isAppleDevice() 
        ? 'TouchID was cancelled. Please try again.'
        : 'Biometric authentication was cancelled. Please try again.';
      setError(cancelMsg);
    } else if (isCredentialMismatchError(error, duration)) {
      setError('Your passkey appears to be outdated or unavailable...');
      setCurrentStep('credential-mismatch');
    } else {
      setError('Authentication failed. Please try again...');
    }
    
    reportWebAuthnError('authentication', error);
  }
};
```

## Real-World Examples

### Example 1: macOS User Deleted Keychain Entry

```
User Action: Deletes passkey from macOS Keychain
Auth0 State: Passkey still registered
Detection: isCredentialNotFoundLocally() = true (< 100ms failure)
UX: Shows "Passkey Not Available" options screen
```

### Example 2: User Pressed Cancel on TouchID

```  
User Action: Presses Cancel on TouchID prompt
Auth0 State: Passkey exists and available
Detection: isUserCancellation() = true (3s duration + "user denied")
UX: Shows "TouchID was cancelled" message with retry
```

### Example 3: User Left TouchID Prompt Open

```
User Action: Walks away during TouchID prompt  
Auth0 State: Passkey exists but timeout occurred
Detection: isCredentialMismatchError() = true (120s duration, no cancellation)
UX: Shows "Passkey Issue" screen with new setup option
```

## Testing Strategy

### Unit Tests

Comprehensive test coverage in `tests/webauthn/passkey-availability-detection.test.ts`:

- **Timing-based detection** (100ms, 2000ms, 120000ms scenarios)
- **Message pattern matching** (cancellation vs not-found vs mismatch)
- **Error type filtering** (only NotAllowedError)
- **Classification exclusivity** (only one classification true at a time)
- **Real-world scenarios** using actual timing data from logs

### Manual Testing

1. **Delete keychain entry** and test quick rejection detection
2. **Cancel TouchID prompt** and verify cancellation detection  
3. **Leave prompt open** and test timeout classification
4. **Different browsers/devices** to validate timing variations

### E2E Testing Limitations

- OS-level TouchID dialogs cannot be automated
- Timing variations across different devices/browsers  
- Keychain manipulation requires manual intervention
- See `docs/testing/touchid-cancellation-testing.md` for manual test procedures

## Browser Compatibility

### Timing Reliability

| Browser | Quick Detection | Message Patterns | Notes |
|---------|----------------|------------------|-------|
| **Safari** | ✅ Reliable | ⚠️ Generic messages | 50-200ms for not found |
| **Chrome** | ✅ Reliable | ✅ Better messages | 100-300ms for not found |
| **Firefox** | ⚠️ Variable | ✅ Good messages | 200-500ms range |
| **Edge** | ✅ Reliable | ✅ Good messages | Similar to Chrome |

### Fallback Strategy

- **Primary:** Timing analysis (< 500ms threshold)
- **Secondary:** Message pattern matching
- **Fallback:** Conservative credential mismatch classification

## Security Considerations

### Information Disclosure

The timing-based detection does not reveal:
- Whether specific passkeys exist in Auth0
- Details about credential storage
- Information about other users' accounts

### Attack Mitigation

- **Timing attacks:** 500ms threshold prevents micro-timing analysis  
- **Message enumeration:** Generic messages prevent credential existence detection
- **Privacy:** No sensitive information exposed in error classifications

## Metrics & Monitoring

### Error Reporting

All scenarios are tracked via the error reporting system:

```typescript
reportWebAuthnError('authentication', error);

// Includes context:
// - operation: 'authentication'  
// - error details and type
// - timing information
// - user agent and device info
```

### Analytics Events

- `webauthn-failure` with classification type
- `auth-state-change` with error context
- Timing distribution for threshold calibration

## Configuration

### Timing Thresholds

Currently hardcoded but could be made configurable:

```typescript
const CREDENTIAL_NOT_FOUND_THRESHOLD_MS = 500;
const USER_CANCELLATION_MIN_DURATION_MS = 500; 
const LONG_TIMEOUT_THRESHOLD_MS = 10000;
```

### Error Message Customization

Messages can be customized per device/browser:

```typescript
const getCancellationMessage = (isApple: boolean) => 
  isApple 
    ? 'TouchID was cancelled. Please try again.'
    : 'Biometric authentication was cancelled. Please try again.';
```

## Future Enhancements

### Adaptive Thresholds

- **Learn from user behavior** to adjust timing thresholds
- **Browser-specific calibration** based on performance metrics
- **Device-class optimization** (mobile vs desktop timing)

### Enhanced Detection

- **WebAuthn Conditional UI** for better credential availability detection
- **Platform-specific APIs** where available (e.g., iOS WebAuthn extensions)
- **User preference learning** (e.g., user typically cancels vs deletes credentials)

### UX Improvements

- **Smart option ordering** based on user history and context
- **Progressive disclosure** of advanced options
- **Cross-device setup flows** with better QR code UX

This comprehensive approach ensures users get appropriate guidance when their passkeys aren't available locally, improving the overall authentication experience while maintaining security. 