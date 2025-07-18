# Components Overview

This directory contains documentation for all user-facing components in the flows-auth library.

## 📋 Available Components

### 🔐 **Authentication Components**

| Component | Purpose | Documentation | Specification |
|-----------|---------|---------------|---------------|
| **RegistrationForm** | Complete user registration with WebAuthn | [`RegistrationForm.md`](./RegistrationForm.md) | [`RegistrationForm-spec.md`](../specifications/RegistrationForm-spec.md) |
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
  import { RegistrationForm, SignInForm, createAuthStore } from '@thepia/flows-auth';
  
  const authStore = createAuthStore({
    apiBaseUrl: 'https://api.example.com',
    domain: 'example.com',
    enablePasskeys: true
  });
  
  let showRegistration = false;
</script>

{#if showRegistration}
  <RegistrationForm 
    config={authStore.config}
    on:success={(e) => console.log('Registration success:', e.detail)}
    on:appAccess={(e) => console.log('User enters app:', e.detail)}
    on:switchToSignIn={() => showRegistration = false}
  />
{:else}
  <SignInForm 
    config={authStore.config}
    on:success={(e) => console.log('Sign-in success:', e.detail)}
    on:switchToRegister={() => showRegistration = true}
  />
{/if}
```

### **Invitation Token Registration**
```svelte
<script>
  import { RegistrationForm } from '@thepia/flows-auth';
  
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

<RegistrationForm 
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
interface RegistrationFormEvents extends AuthComponentEvents {
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
<RegistrationForm config={authStore.config} />
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
import RegistrationForm from './RegistrationForm.svelte';

// Test helper for component setup
function setupRegistrationForm(props = {}) {
  const authStore = createAuthStore({
    apiBaseUrl: 'https://test-api.com',
    domain: 'test.com',
    enablePasskeys: true
  });
  
  return render(RegistrationForm, {
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