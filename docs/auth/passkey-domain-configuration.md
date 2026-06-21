# Passkey Domain Configuration Guide

## 🎯 **Overview**

This guide explains how to configure passkeys (WebAuthn) to work across multiple domains, specifically addressing the issue where passkeys registered on `thepia.com` don't work on `dev.thepia.com` and vice versa.

## 🔍 **The Problem**

**WebAuthn passkeys are cryptographically bound to the exact domain** where they were created:

- **Passkey created on `thepia.com`** → Only works on `thepia.com`
- **Passkey created on `dev.thepia.com`** → Only works on `dev.thepia.com`
- **Registering on both domains** → Second registration overwrites the first in Auth0

This causes **re-registration cycles** where using one domain invalidates the passkey for the other.

## ✅ **Solution: Two Configuration Approaches**

### **Option 1: Subdomain Passkeys (NEW - Recommended)**

**Single passkey works across all subdomains of `thepia.com`**

#### **How It Works:**
- **Relying Party ID (RP ID)**: `thepia.com` (parent domain)
- **Compatible domains**: `thepia.com`, `dev.thepia.com`, `staging.thepia.com`, etc.
- **One passkey registration** works everywhere

#### **Configuration:**
```bash
# In your .env file
PUBLIC_WEBAUTHN_RP_ID=thepia.com
PUBLIC_WEBAUTHN_RP_NAME=Thepia
```

#### **Benefits:**
- ✅ **Single passkey** for all development environments
- ✅ **No re-registration** when switching domains
- ✅ **Seamless development** experience
- ✅ **Production-ready** security

#### **Requirements:**
- All domains must be subdomains of `thepia.com`
- Requires one-time passkey re-registration after enabling

### **Option 2: Domain-Specific Passkeys (CURRENT)**

**Separate passkey required for each domain**

#### **How It Works:**
- **Relying Party ID (RP ID)**: Current domain (e.g., `dev.thepia.com`)
- **Domain isolation**: Each domain has its own passkeys
- **Multiple registrations** needed for multiple domains

#### **Configuration:**
```bash
# In your .env file (leave empty or comment out)
# PUBLIC_WEBAUTHN_RP_ID=
```

#### **Benefits:**
- ✅ **Maximum security** isolation between domains
- ✅ **No changes** to existing setup
- ✅ **Works with any domain** structure

#### **Drawbacks:**
- ❌ **Separate passkeys** needed for each domain
- ❌ **Re-registration cycles** when switching domains
- ❌ **Development friction**

## 🚀 **Implementation Guide**

### **Step 1: Choose Your Approach**

#### **For Subdomain Passkeys (Recommended):**
Add to your `.env` file:
```bash
PUBLIC_WEBAUTHN_RP_ID=thepia.com
PUBLIC_WEBAUTHN_RP_NAME=Thepia
```

#### **For Domain-Specific Passkeys (Current):**
Leave these variables empty or commented out:
```bash
# PUBLIC_WEBAUTHN_RP_ID=
# PUBLIC_WEBAUTHN_RP_NAME=Thepia
```

### **Step 2: Update Your WebAuthn Implementation**

The new `webauthn-config.ts` utility automatically handles both approaches:

```typescript
import { getWebAuthnConfig, getWebAuthnRegistrationOptions } from '../config/webauthn-config';

// Get configuration (automatically detects approach)
const config = getWebAuthnConfig();
console.log('Using approach:', config.approach);

// Get registration options with correct RP ID
const registrationOptions = getWebAuthnRegistrationOptions(userId, email, name);
```

### **Step 3: Test and Validate**

#### **Validation Commands:**
```bash
# Check current configuration
pnpm auth0:validate

# Test WebAuthn configuration
node -e "
import('./src/config/webauthn-config.js').then(m => {
  const config = m.getWebAuthnConfig();
  console.log('Current config:', config);
  const validation = m.validateDomainCompatibility();
  console.log('Domain compatibility:', validation);
});
"
```

#### **Testing Checklist:**
- [ ] **Register passkey** on `thepia.com`
- [ ] **Test authentication** on `thepia.com` ✅
- [ ] **Test authentication** on `dev.thepia.com` ✅ (should work with subdomain approach)
- [ ] **Verify no re-registration** needed when switching domains

## 🔄 **Migration Process**

### **From Domain-Specific to Subdomain Passkeys:**

1. **Enable subdomain passkeys** in `.env`:
   ```bash
   PUBLIC_WEBAUTHN_RP_ID=thepia.com
   PUBLIC_WEBAUTHN_RP_NAME=Thepia
   ```

2. **Clear existing passkeys** (one-time):
   - Users will need to re-register passkeys
   - New passkeys will work across all subdomains

3. **Test thoroughly** before deploying to production

4. **Communicate to users** about one-time re-registration

### **Rollback Plan:**
If issues arise, simply remove the environment variables:
```bash
# Comment out or remove these lines
# PUBLIC_WEBAUTHN_RP_ID=thepia.com
# PUBLIC_WEBAUTHN_RP_NAME=Thepia
```

## 🛠 **Development Workflow**

### **With Subdomain Passkeys (NEW):**
1. **Register passkey once** on any `*.thepia.com` domain
2. **Works everywhere**: `thepia.com`, `dev.thepia.com`, `staging.thepia.com`
3. **No re-registration** when switching environments
4. **Seamless development** experience

### **With Domain-Specific Passkeys (CURRENT):**
1. **Register passkey** on `thepia.com` for production
2. **Register separate passkey** on `dev.thepia.com` for development
3. **Manage multiple passkeys** or use different test emails
4. **Accept re-registration** when switching domains

## 🔍 **Troubleshooting**

### **"Passkey not working on dev.thepia.com"**
- **Check RP ID configuration** in browser dev tools
- **Verify domain compatibility** using validation commands
- **Re-register passkey** if switching from domain-specific to subdomain approach

### **"WebAuthn registration fails"**
- **Check browser support** for WebAuthn
- **Verify HTTPS** is enabled (required for WebAuthn)
- **Check console errors** for specific WebAuthn error codes

### **"Auth0 overwrites existing passkey"**
- **This is expected** when switching between approaches
- **One-time re-registration** is required after configuration changes

## 📊 **Comparison Table**

| Feature | Subdomain Passkeys | Domain-Specific |
|---------|-------------------|-----------------|
| **Cross-domain compatibility** | ✅ Single passkey | ❌ Multiple passkeys |
| **Development friction** | ✅ Seamless | ❌ Re-registration cycles |
| **Security isolation** | ⚠️ Shared across subdomains | ✅ Complete isolation |
| **Setup complexity** | ⚠️ One-time migration | ✅ No changes needed |
| **Production readiness** | ✅ Industry standard | ✅ Maximum security |

## 🎯 **Recommendation**

**Use Subdomain Passkeys** for development efficiency while maintaining production security. This is the industry standard approach used by major platforms like Google, GitHub, and Microsoft.

The minimal security trade-off (shared passkeys across subdomains) is outweighed by the significant improvement in developer experience and user convenience.
