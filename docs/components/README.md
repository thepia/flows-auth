# Components Overview

This directory contains documentation for all user-facing components in the flows-auth library.

## 📋 Available Components

### 🔐 **Authentication Components**

| Component | Purpose | Documentation | Specification |
|-----------|---------|---------------|---------------|
| **AccountCreationForm** | Complete user registration with WebAuthn | [`AccountCreationForm.md`](./AccountCreationForm.md) | [`AccountCreationForm-spec.md`](../specifications/AccountCreationForm-spec.md) |
| **SignInForm** | Multi-method authentication (passkey/email-code) | *Coming Soon* | [`signInWithPasskey-spec.md`](../specifications/signInWithPasskey-spec.md) |

### 🔧 **Utility Components**

| Component | Purpose | Status |
|-----------|---------|--------|
| **AuthProvider** | Context provider for auth state | *Coming Soon* |
| **ProtectedRoute** | Route protection wrapper | *Coming Soon* |
| **ConditionalAuth** | Auto-signin for returning users | *Coming Soon* |

## 🎯 **Component Usage Patterns**

### **Basic Authentication Flow**
```svelte
<script>
  import { createAuthStore } from '@thepia/flows-auth';
  import { AccountCreationForm, makeSvelteCompatible, SignInForm } from '@thepia/flows-auth/svelte';

  const authStore = makeSvelteCompatible(createAuthStore({
    apiBaseUrl: 'https://api.example.com',
    clientId: 'your-client-id',
    appCode: 'app',
    domain: 'example.com',
    enablePasskeys: true
  }));

  let showRegistration = $state(false);

  // React to authentication state
  let isAuthenticated = $derived($authStore.state.startsWith('authenticated'));
  let currentUser = $derived($authStore.user);
</script>

{#if isAuthenticated}
  <h1>Welcome, {currentUser?.name || currentUser?.email}!</h1>
  <button onclick={() => authStore.signOut()}>Sign Out</button>
{:else if showRegistration}
  <AccountCreationForm
    store={authStore}
    on:success={(e) => console.log('Registration success:', e.detail)}
    on:appAccess={(e) => console.log('User enters app:', e.detail)}
    on:switchToSignIn={() => showRegistration = false}
  />
{:else}
  <!-- SignInForm has no built-in "switch to registration" event — drive
       showRegistration from your own UI (e.g. a separate "Create account" link) -->
  <SignInForm
    store={authStore}
    on:success={(e) => console.log('Sign-in success:', e.detail)}
  />
{/if}
```

### **Invitation Token Registration**
```svelte
<script>
  import { getAuthStoreFromContext, AccountCreationForm } from '@thepia/flows-auth/svelte';

  // Auth store set up by the root layout's setupAuthContext()
  const authStore = getAuthStoreFromContext();

  // Extract invitation token from URL
  const urlParams = new URLSearchParams(window.location.search);
  const invitationToken = urlParams.get('invitation');

  let invitationTokenData = null;

  // Process invitation token if present
  if (invitationToken) {
    // Decode and validate token (utility functions available)
    invitationTokenData = {
      email: 'user@example.com',
      firstName: 'John',
      company: 'Acme Corp',
      // ... other prefilled data
    };
  }
</script>

<AccountCreationForm
  store={authStore}
  {invitationToken}
  {invitationTokenData}
  readOnlyFields={invitationTokenData ? ['email'] : []}
  additionalFields={['company', 'phone', 'jobTitle']}
  on:appAccess={(e) => {
    if (e.detail.emailVerifiedViaInvitation) {
      // Immediate app access - email already verified
      enterApp(e.detail.user);
    } else {
      // Standard flow - show email verification prompt
      showEmailVerificationPrompt(e.detail.user);
    }
  }}
/>
```

## 🎨 **Theming and Customization**

Components are styled with `@thepia/branding` design tokens (an optional
peer dependency) — import branding's stylesheets and override its CSS
custom properties directly, no flows-auth-specific theming API needed:

```css
@import "@thepia/branding/css";
@import "@thepia/branding/css/components";

:root {
  --color-brand-primary: #your-brand-color;
  --color-brand-primaryHover: #your-brand-color-darker;
  --font-fontFamily-brand-body: 'Your Brand Font', sans-serif;
  --size-radius-4: 8px;
}
```

Dark mode follows branding's own convention — set `.dark`, `.dark-theme`,
or `data-theme="dark"` on an ancestor element; branding's tokens redefine
themselves automatically under those selectors (not via
`@media (prefers-color-scheme: dark)`).

## 📖 **Component Architecture**

### **Design Principles**
- **Framework Agnostic**: Core logic separated from Svelte presentation
- **Event-Driven**: Components communicate via custom events
- **Accessible**: Full ARIA support and keyboard navigation
- **Mobile-First**: Responsive design with touch-friendly interfaces
- **Zero Dependencies**: No external UI library dependencies

### **🎯 Critical Architecture Pattern: Sign-In vs Registration**

**IMPORTANT**: Sign-in and registration follow **different architectural patterns** by design:

#### **Sign-In Pattern: Pure AuthStore Integration** ✅
```svelte
<!-- ✅ CORRECT: Use SignInForm component -->
<script>
  import { createAuthStore } from '@thepia/flows-auth';
  import { makeSvelteCompatible, SignInForm } from '@thepia/flows-auth/svelte';

  const authStore = makeSvelteCompatible(createAuthStore(config));

  // Subscribe to authStore state changes - NO events needed
  authStore.subscribe(($auth) => {
    if ($auth.state.startsWith('authenticated')) {
      // User signed in - authStore handles everything
      navigateToApp($auth.user);
    }
  });
</script>

<SignInForm store={authStore} />
```

```svelte
<!-- ❌ WRONG: Custom sign-in form brings no value -->
<script>
  // Don't reinvent the wheel - use SignInForm component
  async function handleSignIn() {
    await authStore.signInWithPasskey(email); // Manual implementation
  }
</script>

<form onsubmit={handleSignIn}>
  <input bind:value={email} />
  <button>Sign In</button>
</form>
```

#### **Registration Pattern: Rich Event System** ✅
```svelte
<!-- ✅ CORRECT: Registration needs event coordination -->
<script>
  import { getAuthStoreFromContext, AccountCreationForm } from '@thepia/flows-auth/svelte';

  const authStore = getAuthStoreFromContext();

  function handleAppAccess(event) {
    const { user, emailVerifiedViaInvitation } = event.detail;

    // Close registration dialog
    showAccountCreationForm = false;

    // Clean up invitation URLs
    if (invitationToken) cleanInvitationUrl();

    // Navigate based on verification status
    if (emailVerifiedViaInvitation) {
      enterAppImmediately(user);
    } else {
      showEmailVerificationPrompt(user);
    }
  }
</script>

<AccountCreationForm
  store={authStore}
  on:appAccess={handleAppAccess}
  on:switchToSignIn={() => showAccountCreationForm = false}
/>
```

#### **Why This Dual Pattern Exists**

| Aspect | Sign-In | Registration |
|--------|---------|-------------|
| **Complexity** | Simple: Email → AuthStore → Done | Complex: Form → Validation → API → UI Coordination |
| **State Management** | Pure AuthStore subscription | AuthStore + Event coordination |
| **UI Coordination** | None needed | Dialog closing, URL cleanup, navigation |
| **Parent Integration** | Subscribe to authStore state | Handle multiple events |
| **Custom Implementation** | ❌ Brings no value | ✅ May be needed for complex flows |

#### **Migration Note**
If you have custom sign-in forms (like in flows.thepia.net), **migrate to SignInForm component**:

```diff
- <!-- Custom sign-in form -->
- <form onsubmit={handleSignIn}>
-   <input bind:value={email} />
-   <button>Sign In</button>
- </form>

+ <!-- Use flows-auth SignInForm -->
+ <SignInForm store={authStore} />
```

**Benefits of using SignInForm**:
- ✅ Conditional authentication (auto-signin for returning users)
- ✅ Proper error handling and user feedback
- ✅ WebAuthn best practices built-in
- ✅ Accessibility and mobile optimization
- ✅ Consistent UX across applications

### **Event System**
Each component dispatches its own event set — there's no shared base
interface across all components. These are the real, currently-dispatched
events (verified against source, not aspirational):

```typescript
// SignInForm events
interface SignInFormEvents {
  success: { user: User; method: AuthMethod };
  error: { error: AuthError };
  close: {}; // Popup variant only
}

// AccountCreationForm events
interface AccountCreationFormEvents {
  success: { user: User };
  error: { error: AuthError };
  appAccess: { user: User; emailVerifiedViaInvitation?: boolean; autoSignIn?: boolean };
  switchToSignIn: {};
}
```

### **State Management Integration**
Components integrate seamlessly with the auth store:

```svelte
<script>
  import { createAuthStore } from '@thepia/flows-auth';
  import { makeSvelteCompatible, AccountCreationForm } from '@thepia/flows-auth/svelte';

  const authStore = makeSvelteCompatible(createAuthStore(config));

  // Subscribe to auth state changes
  let authState = $derived($authStore);
  let isAuthenticated = $derived(authState.state.startsWith('authenticated'));
  let currentUser = $derived(authState.user);
</script>

<!-- Components automatically sync with store state -->
<AccountCreationForm store={authStore} />
```

## 🧪 **Testing Components**

### **Component Testing Strategy**
- **Unit Tests**: Component behavior in isolation
- **Integration Tests**: Component + auth store integration
- **Visual Tests**: Styling and responsive behavior
- **Accessibility Tests**: ARIA compliance and keyboard navigation

### **Testing Utilities**
```typescript
import { render, fireEvent } from '@testing-library/svelte';
import { createAuthStore } from '@thepia/flows-auth';
import { makeSvelteCompatible } from '@thepia/flows-auth/svelte';
import AccountCreationForm from './AccountCreationForm.svelte';

// Test helper for component setup
function setupAccountCreationForm(props = {}) {
  const authStore = makeSvelteCompatible(createAuthStore({
    apiBaseUrl: 'https://test-api.com',
    clientId: 'test-client',
    appCode: 'app',
    domain: 'test.com',
    enablePasskeys: true
  }));

  return render(AccountCreationForm, {
    store: authStore,
    ...props
  });
}
```

## 📚 **Further Reading**

- **Component Specifications**: [`../specifications/`](../specifications/) - Formal behavior specifications
- **API Integration**: [`../development/api-server-architecture.md`](../development/api-server-architecture.md) - Backend requirements
- **Testing Strategy**: [`../testing/README.md`](../testing/README.md) - Comprehensive testing approach
- **Privacy Architecture**: [`../privacy/zero-cookie-architecture.md`](../privacy/zero-cookie-architecture.md) - Cookie-free design principles

## 🔗 **Related Documentation**

- **Main Documentation Hub**: [`../README.md`](../README.md)
- **Getting Started Guide**: [`../GETTING_STARTED.md`](../GETTING_STARTED.md)
- **Authentication Flow**: [`../auth/flow.md`](../auth/flow.md)
- **Configuration Guide**: [`../STORAGE_CONFIGURATION.md`](../STORAGE_CONFIGURATION.md)