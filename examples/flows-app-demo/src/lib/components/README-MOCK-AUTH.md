# ⚠️ MOCK AUTHENTICATION COMPONENTS WARNING ⚠️

## 🚨 CRITICAL SECURITY NOTICE 🚨

The `MockAuthForm.svelte` component in this directory provides **FAKE AUTHENTICATION** for demo purposes only.

### ❌ WHAT IT DOES (DANGEROUS):
- ✅ Accepts ANY email address without verification
- ✅ Creates fake user accounts instantly
- ✅ Bypasses all real security checks
- ✅ Uses mock WebAuthn challenges
- ✅ Never contacts real API servers

### ⚠️ WHEN TO USE (VERY LIMITED):
- ✅ UI/UX demonstrations only
- ✅ Visual design showcases
- ✅ Isolated component testing
- ✅ Offline development environments

### 🚫 WHEN NEVER TO USE:
- ❌ **NEVER in production**
- ❌ **NEVER with real user data**
- ❌ **NEVER in security testing**
- ❌ **NEVER in integration tests**
- ❌ **NEVER in staging environments**

## ✅ CORRECT AUTHENTICATION

For real authentication, always use:

```svelte
<!-- ✅ CORRECT: Real authentication -->
<script>
  import { SignInForm, createAuthStore } from '@thepia/flows-auth';
  
  const authStore = createAuthStore({
    apiBaseUrl: 'https://api.thepia.com',
    domain: 'your-domain.com',
    enablePasskeys: true
  });
</script>

<SignInForm {authStore} on:success={handleSuccess} />
```

```svelte
<!-- ❌ WRONG: Mock authentication -->
<script>
  import MockAuthForm from './MockAuthForm.svelte';
</script>

<MockAuthForm config={mockConfig} />
```

## 🔍 HOW TO IDENTIFY MOCK COMPONENTS

Mock authentication components have these characteristics:

1. **File names**: `Mock*`, `*Mock*`, `Simple*Auth*`
2. **Visual warnings**: Prominent warning banners
3. **Console warnings**: Red warning messages in browser console
4. **Comments**: Large warning blocks in source code
5. **Fake data**: Hardcoded user IDs like `demo-user-${Date.now()}`

## 🛡️ SECURITY CHECKLIST

Before deploying ANY authentication:

- [ ] ✅ Using real flows-auth `SignInForm` component
- [ ] ✅ Connecting to real API server (`api.thepia.com` or `dev.thepia.com:8443`)
- [ ] ✅ No mock components in production code
- [ ] ✅ Real WebAuthn challenges from server
- [ ] ✅ Proper error handling for failed authentication
- [ ] ✅ No hardcoded user credentials
- [ ] ✅ HTTPS-only domains for WebAuthn

## 🚨 EMERGENCY RESPONSE

If you discover mock authentication in production:

1. **IMMEDIATELY** replace with real authentication
2. **REVOKE** all user sessions
3. **AUDIT** all user accounts created during mock period
4. **NOTIFY** security team and affected users
5. **REVIEW** deployment process to prevent recurrence

## 📞 CONTACT

If you're unsure whether you're using real or mock authentication:

- **Check browser console** for warning messages
- **Look for visual warning banners** in the UI
- **Verify API calls** go to real servers
- **Ask the development team** for clarification

Remember: **When in doubt, assume it's mock and verify with real authentication.**
