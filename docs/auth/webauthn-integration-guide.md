# WebAuthn Integration Guide

## 🎯 **Quick Start: Enable Subdomain Passkeys**

### **Step 1: Update Environment Configuration**

Add to your `.env` file:
```bash
# Enable subdomain passkeys (single passkey works on thepia.com and dev.thepia.com)
PUBLIC_WEBAUTHN_RP_ID=thepia.com
PUBLIC_WEBAUTHN_RP_NAME=Thepia
```

### **Step 2: Validate Configuration**

```bash
# Test WebAuthn configuration
pnpm webauthn:validate

# Test Auth0 integration
pnpm auth0:validate
```

### **Step 3: Update Your WebAuthn Code (Optional)**

The new configuration is **backward compatible**. For enhanced functionality, you can optionally integrate the new utilities:

```typescript
// Before (current approach - still works)
const rpId = window.location.hostname;

// After (new approach - automatic configuration)
import { getWebAuthnConfig } from '../config/webauthn-config';
const config = getWebAuthnConfig();
const rpId = config.rpId; // Automatically uses subdomain or domain-specific
```

## 🔄 **Integration with Existing Auth0Service**

### **Minimal Integration (Recommended)**

Your existing `Auth0Service` will continue to work. To add subdomain passkey support, make these small changes:

```typescript
// In your WebAuthn registration/authentication code
import { getWebAuthnConfig } from '../config/webauthn-config';

// Replace hardcoded RP ID with dynamic configuration
const config = getWebAuthnConfig();

// Use config.rpId instead of window.location.hostname
const registrationOptions = {
  rp: {
    id: config.rpId,        // ← Changed from window.location.hostname
    name: config.rpName,    // ← Changed from hardcoded name
  },
  // ... rest of your existing options
};
```

### **Full Integration (Optional)**

For complete integration, use the provided utilities:

```typescript
import { 
  getWebAuthnRegistrationOptions,
  getWebAuthnAuthenticationOptions,
  validateDomainCompatibility 
} from '../config/webauthn-config';

// Registration
const registrationOptions = getWebAuthnRegistrationOptions(userId, email, name);

// Authentication  
const authenticationOptions = getWebAuthnAuthenticationOptions();

// Validation
const validation = validateDomainCompatibility();
if (!validation.compatible) {
  console.warn(validation.message);
}
```

## 🧪 **Testing Your Setup**

### **Test Subdomain Passkeys**

1. **Enable subdomain passkeys** in `.env`:
   ```bash
   PUBLIC_WEBAUTHN_RP_ID=thepia.com
   ```

2. **Register a passkey** on `dev.thepia.com`

3. **Test authentication** on `thepia.com` (should work without re-registration)

4. **Validate configuration**:
   ```bash
   pnpm webauthn:validate
   ```

### **Test Domain-Specific Passkeys (Current)**

1. **Disable subdomain passkeys** in `.env`:
   ```bash
   # PUBLIC_WEBAUTHN_RP_ID=
   ```

2. **Register separate passkeys** on each domain

3. **Verify isolation** between domains

## 🔧 **Configuration Options**

### **Environment Variables**

```bash
# Subdomain Passkeys (NEW)
PUBLIC_WEBAUTHN_RP_ID=thepia.com          # Parent domain for cross-subdomain passkeys
PUBLIC_WEBAUTHN_RP_NAME=Thepia            # Display name for passkeys

# Domain-Specific Passkeys (CURRENT)  
# Leave PUBLIC_WEBAUTHN_RP_ID empty to use current domain-specific behavior
```

### **Runtime Configuration**

```typescript
import { getWebAuthnConfig, isSubdomainPasskeysEnabled } from '../config/webauthn-config';

// Check current approach
if (isSubdomainPasskeysEnabled()) {
  console.log('Using subdomain passkeys');
} else {
  console.log('Using domain-specific passkeys');
}

// Get current configuration
const config = getWebAuthnConfig();
console.log('RP ID:', config.rpId);
console.log('Approach:', config.approach);
```

## 🚀 **Migration Strategy**

### **Phase 1: Test (Current)**
- ✅ **Keep existing setup** working
- ✅ **Add new configuration** alongside current
- ✅ **Test subdomain passkeys** in development
- ✅ **Validate compatibility** with existing users

### **Phase 2: Enable (When Ready)**
- **Enable subdomain passkeys** in production
- **Communicate to users** about one-time re-registration
- **Monitor for issues** and provide support

### **Phase 3: Optimize (Future)**
- **Remove legacy code** if desired
- **Fully integrate** new utilities
- **Add advanced features** (conditional mediation, etc.)

## 🛡️ **Security Considerations**

### **Subdomain Passkeys**
- ✅ **Industry standard** approach (used by Google, GitHub, Microsoft)
- ✅ **Secure** - passkeys still bound to domain hierarchy
- ⚠️ **Shared across subdomains** - consider if you need complete isolation

### **Domain-Specific Passkeys**
- ✅ **Maximum isolation** between domains
- ✅ **No changes** to existing security model
- ❌ **Development friction** with multiple registrations

## 📋 **Troubleshooting**

### **"Configuration not working"**
```bash
# Check environment variables
echo $PUBLIC_WEBAUTHN_RP_ID

# Validate configuration
pnpm webauthn:validate

# Test specific domain
TEST_DOMAIN=dev.thepia.com pnpm webauthn:validate
```

### **"Passkey still not working across domains"**
- **Clear browser data** for both domains
- **Re-register passkey** after enabling subdomain configuration
- **Check browser console** for WebAuthn errors
- **Verify HTTPS** is enabled on both domains

### **"Want to rollback"**
```bash
# Disable subdomain passkeys
# Comment out or remove from .env:
# PUBLIC_WEBAUTHN_RP_ID=thepia.com

# Restart development server
pnpm dev
```

## 🎯 **Summary**

This implementation provides:
- ✅ **Backward compatibility** - existing setup continues working
- ✅ **Minimal changes** - add environment variables to enable
- ✅ **Easy testing** - validate configuration with simple commands
- ✅ **Clear migration path** - enable when ready, rollback if needed
- ✅ **Comprehensive documentation** - understand both approaches

**Recommended next step**: Add the environment variables and test in development before enabling in production.
