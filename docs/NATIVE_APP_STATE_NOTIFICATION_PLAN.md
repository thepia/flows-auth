# Native App Integration Guide

Comprehensive documentation for iOS/macOS native app integration.

## Overview

The native app integration consists of two complementary systems:

1. **Session Persistence** (flows-auth): Secure storage of auth tokens in native Keychain
2. **State Notifications** (flows-client): Real-time UI state updates to native container

**Architecture**: Single unified message handler (`__thepiaResponseHandler`) in flows-client routes all responses from native app. Svelte components trigger state changes by calling `notifyNativeAppState()` from flows-client.

## Native App Detection

**Function**: `isThepiaApp()`
**Location**: `src/stores/core/native-app-session-adapter.ts`

Detects if running in native app by checking for WebKit message handlers:
```typescript
isThepiaApp() // Returns true if window.webkit.messageHandlers.thepia exists
```

**User Agent Detection** (alternative):
- Native app user agent ends with `Thepia/1.0`
- Used in service worker to skip registration in native context

## Session Persistence

**Adapter**: `createNativeAppSessionAdapter()`
**Location**: `src/stores/core/native-app-session-adapter.ts`

Persists auth sessions to native Keychain instead of localStorage.

**Message Types**:
- `saveSession` - Store session data
- `loadSession` - Retrieve session data
- `clearSession` - Remove session data
- `saveUser` - Store user data
- `getUser` - Retrieve user data
- `clearUser` - Remove user data

**Request/Response Protocol**:
- Web sends: `{ type, data, requestId }`
- Native responds: `{ requestId, success, data?, error? }`
- 10-second timeout (configurable)
- Automatic fallback to localStorage if WebKit unavailable

## State Notifications

**Function**: `notifyNativeAppState(payload)`
**Location**: `@thepia/flows-client` (flows-client/src/lib/flows-client.ts)

Sends UI state updates to native container via `webapp_state` messages.

**Message Format**:
```typescript
{
  type: 'flowsdb',
  procedure: 'webapp_state',
  payload: {
    readiness?: 'loading' | 'ready' | 'transitioning' | 'transitioned' | 'completed',
    pageHeight?: 'pill' | 'sheet' | 'full',
    backgroundMaterial?: 'clear' | 'thinMaterial' | 'ultraThinMaterial' | 'regularMaterial' | 'thickMaterial',
    currentStep?: string,
    stepList?: string[],
    backName?: string | null
  },
  requestId: 'flowsdb_webapp_state_...'
}
```

**Key Features**:
- Fire-and-forget (no response expected)
- Graceful fallback when WebKit unavailable (silently ignored in browser)
- Type-safe via `WebAppStatePayload` interface
- Integrated with FlowsClient singleton

**Usage**:
```typescript
import { notifyNativeAppState } from '@thepia/flows-client';

// From Svelte components
await notifyNativeAppState({ readiness: 'ready' });
await notifyNativeAppState({ pageHeight: 'full' });
await notifyNativeAppState({
  currentStep: 'signin',
  stepList: ['signin', 'verify', 'complete'],
  backName: 'Back'
});
```

## Implementation Status

### Phase 1: Core Infrastructure ✅ COMPLETE
- ✅ `notifyNativeAppState()` function in flows-client
- ✅ `WebAppStatePayload` type definition
- ✅ Integrated with FlowsClient singleton
- ✅ Library builds successfully

### Phase 2: App Integration (Pending)
- Svelte components call `notifyNativeAppState()` on state changes
- Integrate with SignInCore, PolicyViewer
- Add navigation tracking

### Phase 3: Testing & Refinement (Pending)
- Test on iOS/macOS simulator
- Verify native UI responds correctly

## Integration Points

**Svelte Components** (app.thepia.net):

Components should call `notifyNativeAppState()` when state changes:

```typescript
import { notifyNativeAppState } from '@thepia/flows-client';

// SignInCore.svelte
onMount(() => await notifyNativeAppState({ readiness: 'loading' }));
// After init: await notifyNativeAppState({ readiness: 'ready' });
// During auth: await notifyNativeAppState({ readiness: 'transitioning' });
// On success: await notifyNativeAppState({ readiness: 'transitioned' });

// PolicyViewer.svelte
// When opened: await notifyNativeAppState({ pageHeight: 'full', backgroundMaterial: 'regularMaterial' });
// When closed: await notifyNativeAppState({ pageHeight: 'sheet' });

// Navigation
// await notifyNativeAppState({
//   currentStep: 'signin',
//   stepList: ['signin', 'verify', 'complete'],
//   backName: 'Back'
// });
```

**Auth Store** (flows-auth):
- No direct state notification responsibility
- Components handle state change notifications
- Auth store provides state that components observe

## Related Documentation

- **Message Protocol**: `../flows-client/docs/APP_MESSAGE_SPEC.md` - Complete message specification
- **Session Adapter**: `docs/adapters/native-app-session-adapter.md` - Session persistence details
- **API Contracts**: `docs/testing/API_CONTRACT_TESTING_POLICY.md` - Testing requirements
- **Test Coverage**: `docs/testing/coverage-strategy.md` - Testing strategy

## Security Considerations

1. **Keychain Storage**: Use `kSecAttrAccessibleWhenUnlockedThisDeviceOnly` for maximum security
2. **Request Validation**: Always validate message structure and data types
3. **Timeout Handling**: Native side should respond within 10 seconds
4. **Clean Logout**: Ensure all sensitive data cleared from Keychain
5. **No Sensitive Data in Logs**: Avoid logging tokens or credentials

