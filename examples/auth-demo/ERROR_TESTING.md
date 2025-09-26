# Error Testing Feature

## Overview

The auth-demo now includes a **Network Error Testing** feature that allows you to test friendly error messages in SignInCore without modifying production code.

## How It Works

### 🧪 Fetch Interceptor
- **Clean Architecture**: Only affects network traffic when you explicitly trigger errors
- **Zero Production Impact**: Uses app-level fetch interception, no changes to flows-auth library
- **One-Time Triggers**: Errors inject once then automatically clear to prevent permanent breakage
- **Real Error Handling**: Uses the actual SignInCore error processing pipeline

### 🎯 Floating Menu Button
- **Minimal UI**: Small floating button in top-right corner
- **Visual Indicators**: Button changes color when errors are active
- **Error Counter**: Shows number of active error injections
- **Instructions**: Built-in guidance for testing each error type

## Available Error Types

### 1. 🔧 Technical API Error (404)
- **Triggers**: "Authentication service temporarily unavailable"
- **Test**: Click error type → Try signing in with passkey
- **Simulates**: `Endpoint not found` → Friendly message

### 2. 🔑 Passkey Challenge Error  
- **Triggers**: "No passkey found for this email"
- **Test**: Click error type → Try signing in with passkey
- **Simulates**: `404: /auth/webauthn/challenge not found` → Friendly message

### 3. ❌ WebAuthn Cancelled
- **Triggers**: "Authentication was cancelled"
- **Test**: Click error type → Try signing in with passkey  
- **Simulates**: `NotAllowedError: User cancelled` → Friendly message

### 4. 🔒 Security Error
- **Triggers**: "Security error occurred"
- **Test**: Click error type → Try any WebAuthn operation
- **Simulates**: `SecurityError: Operation not allowed` → Friendly message

### 5. ⚠️ Generic Auth Error
- **Triggers**: "Authentication failed. Please try again"
- **Test**: Click error type → Try sending email code
- **Simulates**: `Unknown authentication error` → Friendly message

### 6. 📧 Email Code Error
- **Triggers**: "Invalid verification code"
- **Test**: Click error type → Try verifying email code
- **Simulates**: `Invalid verification code` → Friendly message

## Usage Instructions

### Step 1: Access the Demo
```bash
cd examples/auth-demo
pnpm dev
# Visit https://dev.thepia.net:5177/signin
```

### Step 2: Trigger an Error
1. Click the **🧪 Test Errors** button (top-right)
2. Select an error type from the dropdown
3. Perform the suggested action in SignInCore
4. Observe the friendly error message

### Step 3: Clear Errors
- Click **✨ Clear All Errors** to reset to normal behavior
- Or errors automatically clear after first use

## Technical Implementation

### Fetch Interceptor (`src/lib/utils/fetch-interceptor.js`)
```javascript
// Only intercepts when errors are explicitly mapped
globalThis.fetch = async function(input, init) {
  const errorToInject = shouldInjectError(url, init);
  if (errorToInject) {
    // Inject error and clear mapping
    return simulateError(errorToInject);
  }
  // Normal fetch behavior when no errors mapped
  return originalFetch(input, init);
};
```

### Error Test Menu (`src/lib/components/ErrorTestMenu.svelte`)
- Installs/uninstalls interceptor on mount/unmount
- Provides UI for triggering specific error scenarios
- Shows active error mappings with visual indicators
- Includes usage instructions and action guidance

### Integration (`src/routes/signin/+page.svelte`)
- Simplified layout removes bulky sidebars
- Floating menu button for error testing
- Clean focus on SignInCore component
- Responsive design for mobile devices

## Benefits

### ✅ For Developers
- **Test Error Handling**: Validate friendly error messages work correctly
- **Debug UX**: See how technical errors become user-friendly
- **Regression Testing**: Ensure error handling doesn't break
- **Clean Architecture**: No production code pollution

### ✅ For QA/Testing
- **Interactive Testing**: Real-time error scenario validation
- **User Experience**: Test actual error message quality
- **Edge Cases**: Simulate hard-to-reproduce network errors
- **Documentation**: Clear instructions for each error type

### ✅ For Product/Design
- **Error Message Review**: Evaluate user-friendly error text
- **UX Validation**: Ensure errors are helpful, not confusing
- **Accessibility**: Verify error messages work with screen readers
- **Flow Testing**: Test error recovery and retry flows

## Error Mapping Examples

The interceptor maps API endpoints to error scenarios:

```javascript
// Technical API Error
'POST:*/auth/webauthn/authenticate' → 404 "Endpoint not found"

// WebAuthn Cancellation  
'POST:*/auth/webauthn/authenticate' → throw "NotAllowedError"

// Email Code Error
'POST:*/auth/verify-email-code' → 400 "Invalid verification code"
```

## Future Enhancements

- **Custom Error Messages**: Allow editing error text in UI
- **Error Scenarios**: Add more complex multi-step error flows  
- **Export/Import**: Save/load error test configurations
- **Analytics**: Track which errors are most commonly tested
- **Integration**: Connect with automated testing frameworks
