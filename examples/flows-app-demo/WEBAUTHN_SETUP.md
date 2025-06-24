# WebAuthn Setup for Flows App Demo

## The Problem
WebAuthn was not appearing because of hostname/HTTPS configuration issues.

## Root Cause
The Vite config is set up for HTTPS with `dev.thepia.net` certificates, but the app might be accessed via:
- `localhost:5175` (won't match certificate)
- `127.0.0.1:5175` (won't match certificate)  
- `https://localhost:5176/` (wrong port, wrong cert)

## Solution 

### Option 1: Use the correct hostname (Recommended)
Access the app at: **https://dev.thepia.net:5175**

This matches the SSL certificate and provides a secure context for WebAuthn.

### Option 2: Use localhost certificates
Update `vite.config.ts` to use localhost certificates:

```typescript
server: {
  host: true,
  port: 5175,
  https: {
    key: '../../../nets-offboarding-flows/certs/localhost-key.pem',
    cert: '../../../nets-offboarding-flows/certs/localhost.crt'
  }
}
```

Then access at: **https://localhost:5175**

### Option 3: Add dev.thepia.net to /etc/hosts
If dev.thepia.net doesn't resolve, add to `/etc/hosts`:
```
127.0.0.1 dev.thepia.net
```

## WebAuthn Requirements
- ✅ HTTPS (secure context) - PROVIDED by certificates
- ✅ Valid hostname/certificate match - MUST USE correct URL
- ✅ Platform authenticator (Touch ID/Face ID) - Device dependent
- ✅ Browser support - Modern browsers support WebAuthn

## Testing
1. Access via correct URL (https://dev.thepia.net:5175)
2. Open browser dev tools
3. Check console for WebAuthn debug info
4. Look for "🔐 WebAuthn Debug Information" logs

## Current Status
The certificates and HTTPS setup are correct. The issue is accessing via the wrong hostname/port combination.