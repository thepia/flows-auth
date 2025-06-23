# Getting Started with @thepia/flows-auth

This guide will help you integrate the Thepia Auth Library into your Svelte application.

## Installation

```bash
npm install @thepia/flows-auth
```

## Quick Setup

### 1. Configure Your API

The library expects your API server to implement the authentication endpoints. See [API Integration](./api.md) for details.

### 2. Basic Implementation

```svelte
<!-- App.svelte -->
<script>
  import { SignInForm, createAuthStore } from '@thepia/flows-auth';

  const authConfig = {
    apiBaseUrl: 'https://api.yourapp.com',
    clientId: 'your-client-id',
    domain: 'yourapp.com',
    enablePasskeys: true,
    enableMagicLinks: true,
    branding: {
      companyName: 'Your Company',
      logoUrl: '/logo.svg',
      primaryColor: '#0066cc'
    }
  };

  const auth = createAuthStore(authConfig);

  function handleSuccess({ detail }) {
    console.log('User signed in:', detail.user);
    // Redirect to app or update UI
  }
</script>

<SignInForm 
  config={authConfig}
  on:success={handleSuccess}
/>

{#if $auth.isAuthenticated}
  <p>Welcome, {$auth.user.name}!</p>
  <button on:click={() => auth.signOut()}>Sign Out</button>
{/if}
```

### 3. SvelteKit Integration

For SvelteKit apps, you'll want to integrate with the auth store in your layout:

```svelte
<!-- src/routes/+layout.svelte -->
<script>
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { createAuthStore } from '@thepia/flows-auth';
  import { onMount } from 'svelte';

  const authConfig = {
    // Your config
  };

  const auth = createAuthStore(authConfig);

  onMount(() => {
    // Initialize auth state
    auth.initialize();

    // Redirect to sign-in if not authenticated
    const protectedRoutes = ['/dashboard', '/profile'];
    if (protectedRoutes.some(route => $page.url.pathname.startsWith(route))) {
      if (!auth.isAuthenticated()) {
        goto('/signin');
      }
    }
  });
</script>

<slot />
```

## Configuration Options

### Required Configuration

```typescript
interface AuthConfig {
  apiBaseUrl: string;    // Your API server URL
  clientId: string;      // Your application client ID
  domain: string;        // Your application domain
}
```

### Feature Flags

```typescript
{
  enablePasskeys: true,        // Enable WebAuthn/passkey authentication
  enableMagicLinks: true,      // Enable magic link authentication  
  enablePasswordLogin: true,   // Enable password authentication
  enableSocialLogin: false,    // Enable social provider authentication
}
```

### Branding Configuration

```typescript
{
  branding: {
    companyName: 'Your Company',
    logoUrl: '/logo.svg',
    primaryColor: '#0066cc',
    secondaryColor: '#e6f3ff', 
    showPoweredBy: true,        // Show "Powered by Thepia"
    customCSS: `
      .auth-form { border-radius: 0; }
    `
  }
}
```

## Authentication Flow

The library implements a multi-step authentication flow:

1. **Email Entry** - User enters their email address
2. **Method Detection** - Server determines available auth methods
3. **Authentication** - User completes authentication via:
   - Passkey (WebAuthn)
   - Password
   - Magic link
4. **Success** - User is signed in with access/refresh tokens

## Using the Auth Store

The auth store provides reactive authentication state:

```javascript
const auth = createAuthStore(config);

// Subscribe to state changes
auth.subscribe($auth => {
  console.log('State:', $auth.state);      // 'authenticated' | 'unauthenticated' | 'loading'
  console.log('User:', $auth.user);        // User object or null
  console.log('Token:', $auth.accessToken); // JWT access token
});

// Authentication methods
await auth.signIn('user@example.com');
await auth.signInWithPasskey('user@example.com');
await auth.signInWithPassword('user@example.com', 'password');
await auth.signOut();

// Utility methods
const isAuthenticated = auth.isAuthenticated();
const token = auth.getAccessToken();
```

## Error Handling

```svelte
<script>
  function handleError({ detail }) {
    const { error } = detail;
    
    switch (error.code) {
      case 'invalid_credentials':
        // Show invalid login message
        break;
      case 'passkey_not_supported':
        // Show passkey not supported message
        break;
      case 'network_error':
        // Show network error message
        break;
      default:
        // Show generic error message
    }
  }
</script>

<SignInForm 
  {config}
  on:error={handleError}
/>
```

## Styling and Theming

The library uses CSS custom properties for theming:

```css
:root {
  /* Brand colors */
  --auth-primary-color: #0066cc;
  --auth-secondary-color: #e6f3ff;
  --auth-error-color: #dc3545;
  --auth-success-color: #28a745;
  
  /* Typography */
  --auth-font-family: 'Your Brand Font', sans-serif;
  --auth-font-size-base: 16px;
  --auth-font-weight-normal: 400;
  --auth-font-weight-medium: 500;
  --auth-font-weight-bold: 700;
  
  /* Layout */
  --auth-border-radius: 8px;
  --auth-padding: 24px;
  --auth-gap: 16px;
  
  /* Shadows */
  --auth-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  --auth-shadow-lg: 0 10px 15px rgba(0, 0, 0, 0.1);
}
```

## Next Steps

- [API Integration Guide](./api.md) - Set up your authentication API
- [Component Reference](./components.md) - Detailed component documentation
- [Theming Guide](./theming.md) - Complete styling and branding options
- [WebAuthn Setup](./webauthn.md) - Configure passkey authentication
- [Examples](../examples/) - See complete example implementations
