# Error Reporting Integration

## Overview

The error reporting system is integrated with the auth store's API client. It automatically reports authentication errors, WebAuthn failures, and API errors to the configured endpoint.

## Architecture

### Initialization

Error reporting is automatically initialized when you create an auth store with error reporting enabled:

```typescript
import { setupAuthContext } from '@thepia/flows-auth';

const authStore = setupAuthContext({
  apiBaseUrl: 'https://api.thepia.com',
  clientId: 'your-app',
  domain: 'yourdomain.com',
  errorReporting: {
    enabled: true,          // Enable error reporting
    debug: true,            // Log errors to console
    maxRetries: 3,          // Retry failed reports
    retryDelay: 1000,       // Milliseconds between retries
    endpoint: '/custom-endpoint' // Optional custom endpoint
  }
});
```

### How It Works

1. **Auth Store Creates API Client**: When `createAuthStore()` runs, it creates an `AuthApiClient` instance
2. **Error Reporter Initialization**: If `errorReporting.enabled` is true, the error reporter is initialized with:
   - The API client (`store.api`)
   - The auth config (`store.getConfig()`)
3. **Reports Use API Client**: All error reports are sent through `store.api.request()` to `/dev/error-reports`

### Error Reporting Flow

```
Error Occurs
    ↓
reportApiError() / reportWebAuthnError() / reportAuthState()
    ↓
ErrorReporter.report(event)
    ↓
Check if enabled (config.errorReporting.enabled)
    ↓
ErrorReporter.sendEvent(event)
    ↓
api.request('/dev/error-reports', payload)
    ↓
Success or Retry Queue
```

## Telemetry Policy: What Gets Reported

### ⚠️ Important: Avoid Redundant Reporting

**Do NOT report events that the API server already knows about.** The API generates server-side logs for all successful operations.

### ❌ Never Report (Server Already Knows)

These successful operations are already logged by the API server:
- ❌ Successful passkey authentication
- ❌ Successful passkey registration
- ❌ Email code sent successfully
- ❌ Email code verified successfully
- ❌ Magic link sent successfully
- ❌ Magic link verified successfully

**Rationale**: These are server-side operations. The API already logs who authenticated, when, and with what method. Client-side telemetry would be redundant and waste bandwidth.

### ✅ Always Report (Client-Side Only)

Report events that happen **before** the API is called or are **client-only**:
- ✅ WebAuthn failures (user cancelled, no credentials, browser errors)
- ✅ Sign-out events (client-only, localStorage clear)
- ✅ API errors (network failures, timeouts, HTTP errors)
- ✅ Client-side validation failures

**Rationale**: These failures occur in the browser and never reach the server. They're valuable for debugging UX issues, browser compatibility problems, and network connectivity issues.

## Automatic Error Reporting

Errors are automatically reported in these locations:

### 1. API Errors
**Location**: `src/api/auth-api.ts`

All failed API requests are automatically reported:
```typescript
if (!response.ok) {
  const error = await this.handleErrorResponse(response);
  reportApiError(url, method, response.status, error.message, context);
  throw error;
}
```

### 2. WebAuthn Client-Side Errors
**Location**: `src/stores/auth-methods/passkey.ts`

WebAuthn authentication and registration failures (browser-level errors):
```typescript
catch (error) {
  reportWebAuthnError('authentication', authError, { email, conditional });
  throw error;
}
```

**Examples of reported WebAuthn errors:**
- User cancelled credential selection
- No credentials available for email
- Browser doesn't support WebAuthn
- Platform authenticator not available
- Timeout waiting for user interaction

### 3. Client-Only State Changes
**Location**: `src/stores/auth-store.ts`

```typescript
// Sign-out is client-only (localStorage clear)
reportAuthState({
  event: 'sign-out'
});
```

## Manual Error Reporting

You can also manually report errors:

```typescript
import { reportAuthState, reportWebAuthnError, reportApiError } from '@thepia/flows-auth';

// Report auth state changes
reportAuthState({
  event: 'login-attempt',
  email: 'user@example.com',
  authMethod: 'passkey'
});

// Report WebAuthn errors
reportWebAuthnError('registration', error, { userId: '123' });

// Report API errors
reportApiError(url, 'POST', 500, 'Server error', { context: 'data' });
```

## Telemetry Queue

If the API client is not available or requests fail, telemetry events are queued:

```typescript
import { getTelemetryQueueSize, flushTelemetry } from '@thepia/flows-auth';

// Check queue size
const queueSize = getTelemetryQueueSize(); // Returns number

// Manually flush queue
flushTelemetry(); // Attempts to send all queued reports
```

## ErrorReportingStatus Component

The `ErrorReportingStatus` component provides a UI for monitoring error reporting:

```svelte
<script>
  import { ErrorReportingStatus } from '@thepia/flows-auth';
</script>

<!-- Automatically connects to auth store from context -->
<ErrorReportingStatus />

<!-- Or pass store explicitly -->
<ErrorReportingStatus {store} />
```

### Features

- **Real-time queue monitoring**: Shows number of queued error reports
- **API connectivity status**: Displays which API server is connected
- **Test error buttons**: Send test errors to verify reporting works
- **Configuration display**: Shows endpoint, debug mode, retry settings

## Configuration Options

### errorReporting

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `enabled` | `boolean` | `false` | Enable/disable error reporting |
| `debug` | `boolean` | `false` | Log errors to console |
| `endpoint` | `string` | `/dev/error-reports` | Custom error reporting endpoint |
| `maxRetries` | `number` | `3` | Maximum retry attempts |
| `retryDelay` | `number` | `1000` | Milliseconds between retries |

## Event Types

### AuthStateEvent
```typescript
{
  type: 'auth-state-change',
  event: 'login-attempt' | 'login-success' | ... ,
  email?: string,
  userId?: string,
  authMethod?: 'passkey' | 'email' | 'magic-link',
  context?: Record<string, any>
}
```

### WebAuthnErrorEvent
```typescript
{
  type: 'webauthn-error',
  operation: 'authentication' | 'registration',
  error: {
    name: string,
    message: string,
    code: string,
    stack: string
  },
  context?: Record<string, any>
}
```

### ApiErrorEvent
```typescript
{
  type: 'api-error',
  url: string,
  method: string,
  status: number,
  message: string,
  context?: Record<string, any>
}
```

## Best Practices

1. **Enable in Development**: Always enable `debug: true` during development
2. **Disable in Production**: Only enable if you have a proper error aggregation service
3. **Use Custom Endpoints**: Override `endpoint` if using a third-party service
4. **Monitor Queue Size**: Large queues indicate connectivity issues
5. **Test Error Reporting**: Use ErrorReportingStatus test buttons to verify setup

## Troubleshooting

### Errors Not Being Reported

Check:
1. `errorReporting.enabled` is `true`
2. Auth store is properly initialized
3. API client is connected (check `store.api`)
4. Check browser console for initialization logs

### Queue Growing

This indicates:
- API endpoint is unreachable
- Network connectivity issues
- Endpoint is rejecting requests (check server logs)

Use `flushErrorReports()` to manually retry sending queued reports.

## Migration from Old System

If you have code using the old system:

### Before (deprecated)
```typescript
// ❌ Old way - don't use
import { updateErrorReporterConfig } from '@thepia/flows-auth';

updateErrorReporterConfig({
  enabled: true,
  endpoint: 'https://...',
  debug: true
});
```

### After (current)
```typescript
// ✅ New way - configure via auth store
const authStore = setupAuthContext({
  errorReporting: {
    enabled: true,
    debug: true
  }
});
```

The error reporter is automatically initialized with the auth store's API client.
