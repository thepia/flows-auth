# Authentication Demo - Flows Auth

A comprehensive demonstration app showcasing the flows-auth library capabilities, state machine, and branded components.

## Features Demonstrated

- **Passwordless Authentication** - WebAuthn passkeys and magic link flows
- **User Registration** - Complete registration with email verification  
- **State Machine** - XState-inspired authentication state management
- **Branded Components** - White-label ready with configurable branding
- **Single Auth Store** - Proper central configuration and store pattern

## Quick Start

```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev

# Open in browser
open https://dev.thepia.net:5177
```

## Demo Sections

### 1. Overview
- Feature overview and current configuration display
- Real-time authentication status
- Configuration inspection

### 2. Sign In Flow Demo
- Test email-based sign in
- Test passkey authentication
- Live SignInForm component demonstration

### 3. Registration Demo
- User registration flow testing
- Account creation with passkey setup
- Email verification process

### 4. Passkey Authentication
- WebAuthn passkey testing
- Browser compatibility checks
- Domain configuration validation

### 5. State Machine
- Real-time state machine monitoring
- Context inspection
- State transition visualization

## Key Architecture Features

### Single Source of Truth
```javascript
// Central auth configuration
const authConfig = await getCachedAuthConfig();
const authStore = createAuthStore(authConfig);
```

### Proper Context Sharing
```javascript
// Layout provides both stores via context
setContext('authStore', authStoreContainer);
setContext('authConfig', authConfigContainer);
```

### Branded Components
```javascript
// Branded configuration
branding: {
  companyName: 'Acme Corporation',
  primaryColor: '#2563eb',
  showPoweredBy: true,
}
```

## Testing Authentication Flows

### Email Login
1. Enter email address
2. Click "Test Sign In" 
3. Follow magic link flow

### Passkey Registration  
1. Enter email for new account
2. Click "Test Registration"
3. Create passkey when prompted

### Passkey Authentication
1. Enter email with existing passkey
2. Click "Authenticate with Passkey"
3. Use biometric authentication

## State Machine States

The demo shows real-time state transitions:

- `checkingSession` - Initial session validation
- `sessionValid` - Existing valid session found  
- `sessionInvalid` - No valid session, needs authentication
- `combinedAuth` - Combined authentication form
- `conditionalMediation` - Passkey auto-discovery
- `biometricPrompt` - WebAuthn authentication
- `sessionCreated` - New session established
- `appLoaded` - Authentication complete

## Configuration

### API Server Detection
- Automatically detects local API server at `https://dev.thepia.com:8443`
- Falls back to production API at `https://api.thepia.com`
- Configurable via `PUBLIC_API_BASE_URL` environment variable

### Domain Configuration
- Default domain: `dev.thepia.net` (matches SSL certificates)
- Must match your registered passkey domain
- Change in `src/lib/config/auth.js` if needed

### Branding Customization
Modify `src/lib/config/auth.js` to customize:
- Company name and colors
- Logo URL
- "Powered by" footer
- Theme colors

## Testing

### Smoke Tests

Smoke tests validate that the page loads correctly and key functions are available:

```bash
# Run smoke tests (USER MUST RUN THIS - not automated)
pnpm test:smoke

# Run with UI (recommended for development)  
pnpm test:ui
```

**Important**: Tests must be run manually by the user. They validate:

1. **Page loading** - No critical JavaScript errors
2. **Function imports** - `useAuth` and `quickAuthSetup` available  
3. **Component rendering** - Tabs and forms render correctly
4. **API configuration** - Error reporting properly configured

### Known Issues & Fixes

1. **Domain undefined error**: ✅ Fixed - `quickAuthSetup()` now properly defaults domain
2. **SSL certificate issues**: ⚠️ Local API detection fails gracefully, uses production  
3. **Function import errors**: ✅ Fixed - All exports properly available

## Development

### Cache Management
- Automatic cache busting in development
- No-cache headers for fresh builds
- HMR disabled to prevent reload loops

### SSL Requirements & Local API Server
- HTTPS required for WebAuthn/passkey testing
- Uses certificates from `../tasks-app-demo/certs/`
- Port 5177 configured in SSL certificates

**Local API Server Detection:**
- Tries `https://dev.thepia.com:8443/health` first
- If SSL certificate invalid → Falls back to production gracefully
- All functionality works with production API fallback

### Debugging
- Comprehensive console logging
- Real-time state machine inspection
- Configuration display in UI
- Error reporting in development

## Architecture Benefits

This demo showcases the **correct** patterns for using flows-auth:

✅ **Single auth store** - One source of truth  
✅ **Central configuration** - Shared via context  
✅ **Proper branding** - White-label ready  
✅ **State machine** - Transparent and debuggable  
✅ **Cache management** - No stale code issues  
✅ **Component composition** - Reusable and branded  

This demonstrates production-ready patterns for implementing flows-auth in real applications.