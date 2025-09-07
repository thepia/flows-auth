# flows-auth: Passwordless Authentication API

## Overview

The flows-auth library provides client-side methods for passwordless magic link authentication. This allows users to start authentication on one device and complete it by clicking a magic link on any device.

## API Methods

### Unified Passwordless Endpoint

**⚠️ IMPORTANT**: The `/auth/send-verification` endpoint has been removed and consolidated into `/auth/start-passwordless` for consistency. Both registration and verification use the same unified endpoint.

### AuthApiClient.startPasswordlessAuthentication()

**⚠️ CRITICAL**: This method serves **DUAL PURPOSE** - both user registration AND login authentication.

- **For non-existent users**: Creates user account and sends verification email
- **For existing users**: Sends authentication magic link
- **Side Effect**: When user clicks magic link, Auth0 automatically sets `email_verified: true`

Initiates passwordless magic link authentication flow.

**Method Signature:**
```typescript
async startPasswordlessAuthentication(email: string): Promise<{
  success: boolean;
  timestamp: number;
  message?: string;
  user?: {
    email: string;
    id: string;
  };
}>
```

**Parameters:**
- `email: string` - User's email address

**Returns:**
- `success: boolean` - Whether the request succeeded
- `timestamp: number` - Request timestamp for polling Auth0 state
- `message?: string` - User-friendly message (e.g., "Check your email for a verification link")
- `user?: object` - User information if available

**Authentication Side Effects:**
- Creates user account if user doesn't exist
- Sets `email_verified: true` when user clicks magic link
- Provides full authentication tokens (not just verification)
- Works for both initial registration and subsequent logins

### ⚠️ BREAKING CHANGE: sendVerificationEmail() Removed

The `sendVerificationEmail()` method has been **completely removed** in favor of the unified `startPasswordlessAuthentication()` endpoint.

**Migration Required:**
```typescript
// ❌ OLD - No longer available
await client.sendVerificationEmail(email);

// ✅ NEW - Use this instead
await client.startPasswordlessAuthentication(email);
```

**Why this change:** Both methods called the same `/auth/start-passwordless` endpoint, creating unnecessary API surface area. The unified method is clearer about its dual purpose (registration + verification).

**Example Usage:**
```typescript
import { AuthApiClient } from '@thepia/flows-auth';

const client = new AuthApiClient({
  apiBaseUrl: 'https://api.thepia.com',
  clientId: 'thepia-app',
  // ... other config
});

try {
  const result = await client.startPasswordlessAuthentication('user@company.com');
  
  if (result.success) {
    console.log('Magic link sent! Timestamp:', result.timestamp);
    console.log('Message:', result.message);
    
    // Start polling for completion
    startPolling('user@company.com', result.timestamp);
  } else {
    console.error('Failed to start passwordless authentication');
  }
} catch (error) {
  console.error('Network error:', error);
}
```

**Error Handling:**
- Throws on network errors
- Returns `success: false` for validation errors
- API validates email format and client configuration

### AuthApiClient.checkPasswordlessStatus()

Checks Auth0 authentication state for cross-device authentication completion.

**Method Signature:**
```typescript
async checkPasswordlessStatus(email: string, timestamp: number): Promise<{
  status: 'pending' | 'verified' | 'expired';
  user?: {
    id: string;
    email: string;
    email_verified: boolean;
  };
}>
```

**Parameters:**
- `email: string` - User's email address
- `timestamp: number` - Timestamp from `startPasswordlessAuthentication()`

**Returns:**
- `status: string` - Current authentication status
  - `'pending'` - Waiting for email verification
  - `'verified'` - User authenticated via magic link
  - `'expired'` - Request timed out (10 minutes)
- `user?: object` - User information (when status is 'verified')

**Example Usage:**
```typescript
// Poll every 3 seconds for completion
function startPolling(email: string, timestamp: number) {
  const pollInterval = setInterval(async () => {
    try {
      const status = await client.checkPasswordlessStatus(email, timestamp);
      
      switch (status.status) {
        case 'verified':
          // Authentication complete!
          console.log('User authenticated:', status.user);
          
          // Note: In production, you'd need to fetch proper tokens
          // This shows Auth0 has verified the user
          clearInterval(pollInterval);
          break;
          
        case 'expired':
          console.log('Session expired, please try again');
          clearInterval(pollInterval);
          break;
          
        case 'pending':
          console.log('Still waiting for email verification...');
          break;
      }
    } catch (error) {
      console.error('Error checking status:', error);
    }
  }, 3000); // Poll every 3 seconds
}
```

## Auth Store Integration

### Three Store Methods for Different Scenarios

The auth store provides three distinct methods for different registration/authentication needs:

#### 1. registerUser() - Invitation Flow (Immediate Authentication)
```typescript
import { authStore } from '$lib/stores/auth';

// For invitation-based registration (e.g., flows apps)
// User gets authenticated immediately after account creation
try {
  const response = await authStore.registerUser({
    email: 'user@company.com',
    firstName: 'John',
    lastName: 'Doe',
    acceptedTerms: true,
    acceptedPrivacy: true,
    invitationToken: 'optional-token' // Pre-verifies email if present
  });
  
  // User is immediately authenticated
  console.log('User created and authenticated:', response.user);
} catch (error) {
  console.error('Registration failed:', error);
}
```

#### 2. registerIndividualUser() - Individual Registration Flow
```typescript
// For app.thepia.net individual registration
// Requires email verification before authentication
try {
  const result = await authStore.registerIndividualUser({
    email: 'user@personal.com',
    firstName: 'Jane',
    lastName: 'Smith',
    acceptedTerms: true,
    acceptedPrivacy: true
  });
  
  if (result.success && result.verificationRequired) {
    console.log('Account created! Please check email for verification.');
    console.log('Verification message:', result.message);
    // User must click email link to complete authentication
  }
} catch (error) {
  console.error('Individual registration failed:', error);
}
```

#### 3. signInWithMagicLink() - Existing User Login
```typescript
// For existing user authentication
try {
  await authStore.signInWithMagicLink('existing@user.com');
  console.log('Magic link sent! User will receive email.');
  // Auth store handles the complete flow including polling
} catch (error) {
  console.error('Magic link authentication failed:', error);
}
```

#### Low-Level API Access
```typescript
// Direct API access (manual polling required)
try {
  const result = await authStore.api.startPasswordlessAuthentication(email);
  if (result.success && result.timestamp) {
    console.log('Passwordless flow started, timestamp:', result.timestamp);
    // You would need to handle polling manually with this approach
  }
} catch (error) {
  console.error('API call failed:', error);
}
```

#### React to Authentication Completion
```typescript
// React to authentication completion
$: if ($authStore.state === 'authenticated' && $authStore.user) {
  console.log('User successfully authenticated via magic link!');
  goto('/dashboard');
}
```

## Configuration

### Client Configuration

Ensure your client is configured for passwordless authentication:

```typescript
const client = new AuthApiClient({
  apiBaseUrl: 'https://api.thepia.com',
  clientId: 'thepia-app', // Must be configured for passwordless strategy
  domain: 'thepia.net',
  enableMagicPins: true, // Enable magic link support
  enablePasskeys: false, // Can be used together
  // ... other options
});
```

### Environment Detection

The library automatically detects the appropriate API server:

- **Local development**: Uses `https://dev.thepia.com:8443` if available
- **Production**: Falls back to `https://api.thepia.com`
- **Test environments**: Detected by domain patterns (`test.`, etc.)

### CORS Configuration

The API server automatically handles CORS for:
- `*.thepia.com` and `*.thepia.net` domains
- `ngrok` tunnels for development
- GitHub Pages preview deployments
- Local development ports

## Error Scenarios

### Common Errors

1. **Invalid Email Format**
```typescript
// Will throw error
await client.startPasswordlessAuthentication('invalid-email');
```

2. **Client Not Configured for Passwordless**
```typescript
// Returns success: false
const result = await client.startPasswordlessAuthentication('user@company.com');
console.log(result.message); // "Passwordless not enabled for this client"
```

3. **Session Not Found**
```typescript
const status = await client.checkPasswordlessStatus('invalid-session');
console.log(status.status); // 'expired'
```

4. **Network Errors**
```typescript
try {
  await client.startPasswordlessAuthentication('user@company.com');
} catch (error) {
  console.error('Network error:', error.message);
}
```

### Error Recovery

```typescript
async function robustPasswordlessAuth(email: string, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await client.startPasswordlessAuthentication(email);
      
      if (result.success) {
        return result;
      } else {
        // Validation error, don't retry
        throw new Error(result.message || 'Validation failed');
      }
    } catch (error) {
      if (attempt === maxRetries) {
        throw error;
      }
      
      console.log(`Attempt ${attempt} failed, retrying...`);
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
    }
  }
}
```

## Magic Link User Experience

### Email Content
Users receive an email with a magic link that:
- Expires after 15 minutes
- Is single-use only
- Redirects to the appropriate success page based on the client

### Cross-Device Flow
1. **Device A**: User enters email and starts authentication
2. **Email**: Magic link sent to user's email
3. **Device B**: User clicks magic link (can be different device)
4. **Device B**: Redirected to success page
5. **Device A**: Automatically detects authentication and proceeds

### Success Pages
Based on client configuration:
- `thepia-app` → `https://app.thepia.net/auth/success`
- `flows-demo` → `https://flows.thepia.net/auth/success`
- Custom clients → Configurable redirect URLs

## Testing

### Unit Tests
```typescript
import { describe, it, expect } from 'vitest';
import { AuthApiClient } from '@thepia/flows-auth';

describe('Passwordless Authentication', () => {
  const client = new AuthApiClient(TEST_CONFIG);

  it('should start passwordless authentication', async () => {
    const result = await client.startPasswordlessAuthentication('test@example.com');
    
    expect(result.success).toBe(true);
    expect(result.sessionId).toBeDefined();
    expect(typeof result.sessionId).toBe('string');
  });

  it('should handle invalid email', async () => {
    await expect(
      client.startPasswordlessAuthentication('invalid-email')
    ).rejects.toThrow();
  });
});
```

### Integration Tests
See `/tests/integration/passwordless-cross-device.test.ts` for complete integration test suite.

### Manual Testing
1. Start passwordless authentication in one browser
2. Check email for magic link
3. Click link in different browser/device
4. Verify first browser automatically authenticates

## Performance Considerations

### Polling Optimization
- Poll every 3 seconds (good balance of UX and server load)
- Stop polling on success, error, or page unload
- Use exponential backoff for network errors

### Session Storage
- Sessions automatically expire after 15 minutes
- Garbage collection prevents memory leaks
- Only necessary data stored in session

### Network Efficiency
- Minimal payload sizes
- Proper HTTP caching headers
- CDN edge deployment for low latency

## Security Notes

### Session Security
- Sessions use cryptographically secure random IDs
- One-time use OAuth authorization codes
- State parameter includes CSRF protection

### Token Security
- Proper user tokens (not Machine-to-Machine)
- Short-lived access tokens
- Secure refresh token handling
- Automatic token rotation

### Email Security
- Magic links expire quickly (15 minutes)
- Links are single-use only
- No sensitive data in email content
- OAuth code exchange happens server-side