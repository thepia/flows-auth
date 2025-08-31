# Getting Started with @thepia/flows-auth

This guide will help you get started with the Thepia Flows Authentication library.

## Installation

```bash
pnpm add @thepia/flows-auth
```

## Quick Start

### 1. Basic Setup

```svelte
<script>
  import { SignInForm, createAuthStore } from '@thepia/flows-auth';

  // Configure for your domain
  const authConfig = {
    apiBaseUrl: 'https://api.thepia.com',
    enablePasskeys: true,
    enableMagicLinks: true,
    domain: 'thepia.net' // or 'thepia.com'
  };

  // Create auth store
  const authStore = createAuthStore(authConfig);

  // Handle authentication events
  function handleAuthSuccess(event) {
    console.log('User signed in:', event.detail.user);
  }

  function handleAuthError(event) {
    console.error('Auth error:', event.detail.error);
  }

  // Subscribe to auth state
  $: currentUser = $authStore.user;
  $: isAuthenticated = !!currentUser;
</script>

{#if isAuthenticated}
  <div class="authenticated-content">
    <h1>Welcome, {currentUser.name}!</h1>
    <button on:click={() => authStore.signOut()}>Sign Out</button>

    <!-- Your app content -->
    <slot />
  </div>
{:else}
  <div class="auth-required">
    <h1>Sign In Required</h1>
    <p>Please sign in to access this application.</p>

    <SignInForm
      config={authConfig}
      on:success={handleAuthSuccess}
      on:error={handleAuthError}
    />
  </div>
{/if}
```

### 3. Client-Only Architecture

The flows-auth library is designed as a **client-only** solution that works in the browser:

```svelte
<!-- Your Svelte component -->
<script>
  import { createAuthStore } from '@thepia/flows-auth';
  import { onMount } from 'svelte';

  const authConfig = {
    apiBaseUrl: 'https://api.thepia.com',
    enablePasskeys: true,
    enableMagicLinks: true,
    domain: 'thepia.net'
  };

  const authStore = createAuthStore(authConfig);

  onMount(() => {
    // Initialize auth state on client
    authStore.checkSession();
  });

  $: isAuthenticated = !!$authStore.user;
</script>

{#if isAuthenticated}
  <!-- Authenticated content -->
  <slot />
{:else}
  <!-- Show sign-in form -->
  <SignInForm config={authConfig} />
{/if}
```

**Important**: This library is client-only and designed for CDN deployment.

### SvelteKit Support

SvelteKit can be used for **testing and development only**. The library functionality is entirely client-side:

- ✅ **Development**: Use SvelteKit for local development and testing
- ✅ **Testing**: Write tests using SvelteKit's testing utilities
- ❌ **Production**: SvelteKit server-side features are not supported
- ✅ **Deployment**: Build to static assets for CDN deployment

```svelte
<!-- Testing example with SvelteKit -->
<script>
  import { browser } from '$app/environment';
  import { createAuthStore } from '@thepia/flows-auth';

  // Only initialize on client-side
  const authStore = browser ? createAuthStore(config) : null;
</script>
```

## Configuration Options

### API Server Configuration

The flows-auth library connects to the Thepia authentication API server. **Important**: The API server source code is maintained in the [thepia.com repository](https://github.com/thepia/thepia.com), not in flows-auth.

#### Production Configuration (Default)

```typescript
// Production configuration - connects to api.thepia.com
const authConfig = {
  apiBaseUrl: 'https://api.thepia.com',  // Production API server
  enablePasskeys: true,
  enableMagicLinks: true,
  domain: 'thepia.net'
};
```

#### Local Development Configuration

```typescript
// Local development - connects to local API server
const authConfig = {
  apiBaseUrl: 'https://dev.thepia.com:8443',  // Local development API
  enablePasskeys: true,
  enableMagicLinks: true,
  domain: 'thepia.net'
};
```

#### Required Configuration Interface

```typescript
interface AuthConfig {
  apiBaseUrl: string;           // API server URL
  enablePasskeys?: boolean;     // Enable WebAuthn passkeys (default: true)
  enableMagicLinks?: boolean;   // Enable magic link fallback (default: true)
  domain?: string;              // Domain for storage scope (thepia.com or thepia.net)
}
```

#### API Server Architecture

- **Production**: `api.thepia.com` - Deployed via Bunny Edge Scripting
- **Local Development**: `dev.thepia.com:8443` - Started from thepia.com repo
- **Source Code**: Located in `thepia.com/src/api/` directory
- **Deployment**: Automated via GitHub Actions from thepia.com repo

### Authentication Methods

The library supports **passwordless-only** authentication:

```typescript
{
  enablePasskeys: true,        // WebAuthn/passkey authentication (recommended)
  enableMagicLinks: true,      // Email-based fallback for unsupported devices

  // Enterprise options (when required by customers)
  enterprise: {
    enableSAML: false,         // SAML/SSO integration
    enableLegacyAuth: false,   // Legacy system support
  }
}
```

**Note**: Traditional passwords and social login are not supported. The library is designed for passwordless authentication only.

## Authentication Flow

The library implements a **cookie-free**, passwordless authentication flow:

1. **Email Entry** - User enters their email address
2. **Method Detection** - Server determines available auth methods
3. **Authentication** - User completes authentication via:
   - **Passkey (WebAuthn)** - Primary method using biometrics
   - **Magic link** - Email-based fallback for unsupported devices
4. **Success** - User is signed in with tokens stored in browser storage

### 🍪 Privacy-First Approach

**Default: Zero-Cookie Operation**
- **No cookie banners** - Clean, uninterrupted user experience
- **No consent popups** - Simplified onboarding flow
- **Complete privacy** - Session data stays in user's browser under their control
- **Future-proof** - Aligned with browser cookie deprecation trends

**Enterprise Flexibility**
- **Additional auth methods** - SAML/SSO when required by customers
- **Still privacy-conscious** - Minimal additional storage, no cookies
- **Transparent to users** - Clear disclosure of any session storage
- **User controlled** - Users can still clear all data

## Working with Auth State

The auth store provides reactive authentication state for client-side applications:

### Auth Store Properties

```typescript
interface AuthStore {
  state: 'authenticated' | 'unauthenticated' | 'authenticating' | 'error';
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  expiresAt: number | null;
  error: string | null;
}
```

### Reactive Auth State

```svelte
<script>
  import { createAuthStore } from '@thepia/flows-auth';

  const authStore = createAuthStore(config);

  // Reactive statements automatically update when auth state changes
  $: user = $authStore.user;
  $: isAuthenticated = $authStore.state === 'authenticated';
  $: isLoading = $authStore.state === 'authenticating';
  $: error = $authStore.error;
</script>

{#if isLoading}
  <div class="loading">Signing in...</div>
{:else if error}
  <div class="error">Error: {error}</div>
{:else if isAuthenticated}
  <div class="authenticated">Welcome, {user.name}!</div>
{:else}
  <div class="unauthenticated">Please sign in</div>
{/if}
```

### Authentication Methods

```javascript
// Available methods (passwordless only)
try {
  await authStore.signInWithPasskey(email);     // WebAuthn authentication
  // User is now authenticated
} catch (error) {
  console.error('Passkey auth failed:', error);
  // Fallback to magic link
}

try {
  await authStore.signInWithMagicLink(email);   // Email-based authentication
  // User will receive email with login link
} catch (error) {
  console.error('Magic link failed:', error);
}

// Session management
await authStore.refreshTokens();              // Refresh access token
await authStore.signOut();                    // Sign out user

// Utility methods
const isAuthenticated = authStore.isAuthenticated();
const token = authStore.getAccessToken();
```

## Error Handling

```svelte
<script>
  import { createAuthStore, SignInForm } from '@thepia/flows-auth';
  
  const authStore = createAuthStore({
    apiBaseUrl: 'https://api.thepia.com',
    clientId: 'your-client-id',
    enablePasskeys: true,
    enableMagicLinks: true,
    domain: 'thepia.net'
  });

  // React to auth store errors
  $: authError = $authStore.error;
  $: if (authError) {
    handleAuthStoreError(authError);
  }

  function handleAuthStoreError(error) {
    switch (error.code) {
      case 'passkey_failed':
        console.error('Passkey authentication failed:', error.message);
        // Could automatically fallback to magic link
        break;
      case 'invalid_credentials':
        console.error('Invalid credentials:', error.message);
        break;
      case 'network_error':
        console.error('Network error:', error.message);
        break;
      default:
        console.error('Authentication error:', error.message);
    }
  }

  function handleComponentError(event) {
    const { error } = event.detail;
    console.error('Component error:', error);
    
    // Handle specific component-level errors
    if (error.code === 'passkey_not_supported') {
      // Show message about passkey support
      alert('Passkeys are not supported on this device. Please use email authentication.');
    }
  }

  // Example of calling auth methods with proper error handling
  async function tryPasskeyAuth() {
    try {
      await authStore.signInWithPasskey('user@example.com');
      console.log('Passkey authentication successful');
    } catch (error) {
      console.error('Passkey auth failed:', error);
      // Fallback to magic link
      try {
        await authStore.signInWithMagicLink('user@example.com');
        console.log('Magic link sent as fallback');
      } catch (fallbackError) {
        console.error('Both auth methods failed:', fallbackError);
      }
    }
  }
</script>

<!-- Display auth errors in UI -->
{#if authError}
  <div class="error-banner">
    <p>Authentication Error: {authError.message}</p>
    <button on:click={() => authStore.reset()}>Try Again</button>
  </div>
{/if}

<SignInForm 
  {authStore}
  on:error={handleComponentError}
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

## Examples

### Complete Flows App Example

See the [flows-app-demo](../examples/flows-app-demo) for a complete working example that demonstrates:

- **Client-only architecture** - No server-side dependencies
- **Invitation-based access** - Private flows authentication
- **HTTPS development setup** - Required for WebAuthn
- **Proper error handling** - Comprehensive error management
- **Session management** - Browser-based session storage
- **CDN deployment ready** - Static assets only

### Running the Demo

#### From Library Root (Recommended)

```bash
# Run flows-app-demo with smart API detection
pnpm run example:flows-app-demo

# Run flows-app-demo with local API server (requires local server running)
pnpm run example:flows-app-demo:local

# Run flows-app-demo with production API server
pnpm run example:flows-app-demo:production
```

#### From Example Directory

```bash
cd examples/flows-app-demo

# Smart API detection (auto-detects local, falls back to production)
pnpm run dev:auto

# Force local API server
pnpm run dev:local

# Force production API server
pnpm run dev:production

# Traditional start (uses environment variables)
pnpm dev
```

Then visit https://localhost:5175/ to see the authentication flow in action.

#### API Server Context

The development scripts automatically detect and configure the appropriate API server:

- **Local Development**: `https://dev.thepia.com:8443` (when available)
- **Production Fallback**: `https://api.thepia.com` (always available)
- **Context Logging**: Always displays which API server is being used

**Note**: The demo uses Vite for development but builds to static assets suitable for CDN deployment.

## Next Steps

1. **[Zero-Cookie Architecture](./privacy/zero-cookie-architecture.md)** - Understand the privacy advantages
2. **[Authentication Overview](./auth/README.md)** - Complete system architecture
3. **[Flows Integration](./flows/README.md)** - Multi-domain authentication
4. **[Authentication Flow](./auth/flow.md)** - Detailed flow diagrams and state management

## Troubleshooting

### Common Issues

1. **WebAuthn not working**: Ensure HTTPS is enabled (required for WebAuthn)
2. **CORS errors**: Verify your domain is configured in the API server
3. **Token refresh failing**: Check localStorage for stored tokens
4. **Magic links not working**: Verify email service configuration

### Getting Help

- Check the [Troubleshooting Guide](./troubleshooting/README.md)
- Review the [examples](../examples/) directory
- Check [GitHub Issues](https://github.com/thepia/flows-auth/issues)

For more detailed information, see the complete documentation in the [docs](./README.md) directory.
