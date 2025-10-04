# Components Overview

This directory contains documentation for all user-facing components in the flows-auth library.

## 📋 Available Components

### 🔐 **Authentication Components**

| Component | Purpose | Documentation | Specification |
|-----------|---------|---------------|---------------|
| **AccountCreationForm** | Complete user registration with WebAuthn | [`AccountCreationForm.md`](./AccountCreationForm.md) | [`AccountCreationForm-spec.md`](../specifications/AccountCreationForm-spec.md) |
| **SignInForm** | Multi-method authentication (passkey/password/magic-link) | *Coming Soon* | [`signInWithPasskey-spec.md`](../specifications/signInWithPasskey-spec.md) |

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
  import { AccountCreationForm, SignInForm, createAuthStore } from '@thepia/flows-auth';
  
  const authStore = createAuthStore({
    apiBaseUrl: 'https://api.example.com',
    clientId: 'your-client-id',
    domain: 'example.com',
    enablePasskeys: true,
    enableMagicLinks: false,
  });
  
  let showRegistration = false;

  // React to authentication state
  $: isAuthenticated = $authStore.state === 'authenticated';
  $: currentUser = $authStore.user;
</script>

{#if isAuthenticated}
  <h1>Welcome, {currentUser?.name || currentUser?.email}!</h1>
  <button on:click={() => authStore.signOut()}>Sign Out</button>
{:else if showRegistration}
  <AccountCreationForm 
    {authStore}
    on:success={(e) => console.log('Registration success:', e.detail)}
    on:appAccess={(e) => console.log('User enters app:', e.detail)}
    on:switchToSignIn={() => showRegistration = false}
  />
{:else}
  <SignInForm 
    {authStore}
    on:success={(e) => console.log('Sign-in success:', e.detail)}
    on:switchToRegister={() => showRegistration = true}
  />
{/if}
```

### **Invitation Token Registration**
```svelte
<script>
  import { AccountCreationForm } from '@thepia/flows-auth';
  
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
  config={authConfig}
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

All components support complete visual customization through CSS custom properties and the branding configuration system.

### **Basic Theming**
```css
:root {
  --auth-primary-color: #your-brand-color;
  --auth-secondary-color: #your-secondary-color;
  --auth-font-family: 'Your Brand Font', sans-serif;
  --auth-border-radius: 8px;
}
```

### **Component-Specific Styling**
```css
/* Registration form specific */
.registration-form {
  --form-background: #ffffff;
  --form-border: 1px solid #e5e7eb;
  --form-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
}

/* Dark mode support */
@media (prefers-color-scheme: dark) {
  .registration-form {
    --form-background: #2d3748;
    --form-border: 1px solid #4a5568;
  }
}
```

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
  import { SignInForm, createAuthStore } from '@thepia/flows-auth';

  const authStore = createAuthStore(config);

  // Subscribe to authStore state changes - NO events needed
  authStore.subscribe(($auth) => {
    if ($auth.state === 'authenticated') {
      // User signed in - authStore handles everything
      navigateToApp($auth.user);
    }
  });
</script>

<SignInForm {config} />
```

```svelte
<!-- ❌ WRONG: Custom sign-in form brings no value -->
<script>
  // Don't reinvent the wheel - use SignInForm component
  async function handleSignIn() {
    await authStore.signInWithPasskey(email); // Manual implementation
  }
</script>

<form on:submit={handleSignIn}>
  <input bind:value={email} />
  <button>Sign In</button>
</form>
```

#### **Registration Pattern: Rich Event System** ✅
```svelte
<!-- ✅ CORRECT: Registration needs event coordination -->
<script>
  import { AccountCreationForm } from '@thepia/flows-auth';

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
  {config}
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
- <form on:submit={handleSignIn}>
-   <input bind:value={email} />
-   <button>Sign In</button>
- </form>

+ <!-- Use flows-auth SignInForm -->
+ <SignInForm {config} />
```

**Benefits of using SignInForm**:
- ✅ Conditional authentication (auto-signin for returning users)
- ✅ Proper error handling and user feedback
- ✅ WebAuthn best practices built-in
- ✅ Accessibility and mobile optimization
- ✅ Consistent UX across applications

### **Event System**
All components follow a consistent event emission pattern:

```typescript
// Standard events emitted by all auth components
interface AuthComponentEvents {
  success: { user: User; method?: AuthMethod };
  error: { error: AuthError };
  stateChange: { state: AuthState };
}

// Component-specific events
interface AccountCreationFormEvents extends AuthComponentEvents {
  appAccess: { user: User; emailVerifiedViaInvitation?: boolean };
  stepChange: { step: RegistrationStep };
  switchToSignIn: {};
  terms_accepted: { terms: boolean; privacy: boolean; marketing: boolean };
}
```

### **State Management Integration**
Components integrate seamlessly with the auth store:

```svelte
<script>
  import { createAuthStore } from '@thepia/flows-auth';
  
  const authStore = createAuthStore(config);
  
  // Subscribe to auth state changes
  $: authState = $authStore;
  $: isAuthenticated = authState.state === 'authenticated';
  $: currentUser = authState.user;
</script>

<!-- Components automatically sync with store state -->
<AccountCreationForm config={authStore.config} />
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
import AccountCreationForm from './AccountCreationForm.svelte';

// Test helper for component setup
function setupAccountCreationForm(props = {}) {
  const authStore = createAuthStore({
    apiBaseUrl: 'https://test-api.com',
    domain: 'test.com',
    enablePasskeys: true
  });
  
  return render(AccountCreationForm, {
    config: authStore.config,
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