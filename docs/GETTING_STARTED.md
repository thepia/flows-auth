# Getting Started with @thepia/flows-auth

This guide will help you get started with the Thepia Flows Authentication library.

## Installation

```bash
pnpm add @thepia/flows-auth
```

## Quick Start

### 1. Setup Auth Store in Root Layout (Once)

**IMPORTANT**: `setupAuthContext()` must ONLY be called in your root layout (`+layout.svelte` or `App.svelte`), never in components.

```svelte
<!-- +layout.svelte - Root layout ONLY -->
<script>
  import { setupAuthContext } from '@thepia/flows-auth/svelte';

  // Configure for your domain
  const authConfig = {
    apiBaseUrl: 'https://api.thepia.com',
    clientId: 'your-app',
    appCode: 'app',
    enablePasskeys: true,
    enableMagicLinks: false,
    domain: 'thepia.net' // or 'thepia.com'
  };

  // ✅ Initialize auth store ONCE in root layout
  // This makes the store available to all child components via context
  const authStore = setupAuthContext(authConfig);
</script>

<main>
  <slot />
</main>
```

### 2. Access Auth Store in Components

Components access the auth store using `getAuthStoreFromContext()` - they never call `setupAuthContext()`.

**Pattern 1: Get store from context in component**

```svelte
<!-- YourComponent.svelte -->
<script>
  import { SignInForm, getAuthStoreFromContext } from '@thepia/flows-auth/svelte';

  // ✅ Get auth store from context (DO NOT call setupAuthContext here)
  const authStore = getAuthStoreFromContext();

  // Handle authentication events
  function handleAuthSuccess(event) {
    console.log('User signed in:', event.detail.user);
  }

  function handleAuthError(event) {
    console.error('Auth error:', event.detail.error);
  }

  // Subscribe to auth state
  let currentUser = $derived($authStore.user);
  let isAuthenticated = $derived(!!currentUser);
</script>

{#if isAuthenticated}
  <div class="authenticated-content">
    <h1>Welcome, {currentUser.name}!</h1>
    <button onclick={() => authStore.signOut()}>Sign Out</button>

    <!-- Your app content -->
    <slot />
  </div>
{:else}
  <div class="auth-required">
    <h1>Sign In Required</h1>
    <p>Please sign in to access this application.</p>

    <!-- Pass store as prop to be explicit -->
    <SignInForm
      store={authStore}
      on:success={handleAuthSuccess}
      on:error={handleAuthError}
    />
  </div>
{/if}
```

**Pattern 2: Let library components auto-detect context**

```svelte
<!-- YourComponent.svelte -->
<script>
  import { SignInForm, getAuthStoreFromContext } from '@thepia/flows-auth/svelte';

  // ✅ Get auth store from context for local use
  const authStore = getAuthStoreFromContext();

  // Subscribe to auth state
  let currentUser = $derived($authStore.user);
  let isAuthenticated = $derived(!!currentUser);
</script>

{#if isAuthenticated}
  <div class="authenticated-content">
    <h1>Welcome, {currentUser.name}!</h1>
    <button onclick={() => authStore.signOut()}>Sign Out</button>

    <!-- Your app content -->
    <slot />
  </div>
{:else}
  <div class="auth-required">
    <h1>Sign In Required</h1>
    <p>Please sign in to access this application.</p>

    <!-- SignInForm will automatically get store from context if no prop provided -->
    <SignInForm />
  </div>
{/if}
```

### 3. Client-Only Architecture

The flows-auth library is designed as a **client-only** solution that works in the browser:

```svelte
<!-- +layout.svelte - Root layout with auth initialization -->
<script>
  import { setupAuthContext } from '@thepia/flows-auth/svelte';

  // Initialize auth store in root layout (runs once)
  const authConfig = {
    apiBaseUrl: 'https://api.thepia.com',
    clientId: 'your-app',
    appCode: 'app',
    enablePasskeys: true,
    enableMagicLinks: false,
    domain: 'thepia.net'
  };

  const authStore = setupAuthContext(authConfig);
</script>

<main>
  <slot />
</main>
```

```svelte
<!-- YourComponent.svelte - Any child component -->
<script>
  import { getAuthStoreFromContext } from '@thepia/flows-auth/svelte';

  // Get auth store from context (no creation, no prop drilling)
  const authStore = getAuthStoreFromContext();

  // Subscribe to auth state
  let isAuthenticated = $derived(!!$authStore.user);
</script>

{#if isAuthenticated}
  <p>Welcome, {$authStore.user.email}!</p>
  <button onclick={() => authStore.signOut()}>Sign Out</button>
{:else}
  <p>Please sign in</p>
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
  clientId: 'your-app',
  appCode: 'app',
  enablePasskeys: true,
  enableMagicLinks: false,
  domain: 'thepia.net'
};
```

#### Local Development Configuration

```typescript
// Local development - connects to local API server
const authConfig = {
  apiBaseUrl: 'https://dev.thepia.com:8443',  // Local development API
  clientId: 'your-app',
  appCode: 'app',
  enablePasskeys: true,
  enableMagicLinks: false,
  domain: 'thepia.net'
};
```

#### Required Configuration Interface

```typescript
// Simplified — see the full AuthConfig interface in src/core/types/index.ts
// for optional fields (branding, errorReporting, signInMode, storage, etc.)
interface AuthConfig {
  apiBaseUrl: string;           // API server URL
  clientId: string;             // Required — identifies your app to the API
  appCode: string;              // Required — app-specific endpoint routing
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
  enableMagicLinks: false,      // Email-based fallback for unsupported devices

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
// Simplified — see the full AuthStore interface in src/core/types/index.ts
// for the complete state shape (signInState, loading, passkeysEnabled, etc.)
interface AuthStore {
  state: 'unauthenticated' | 'authenticated-unconfirmed' | 'authenticated-confirmed' | 'authenticated' | 'error';
  loading: boolean;           // Component loading state — not a `state` value
  user: User | null;
  access_token: string | null;
  refresh_token: string | null;
  expiresAt: string | null;   // ISO 8601 timestamp string
  apiError: ApiError | null;
}

interface ApiError {
  code: AuthErrorCode; // Translation key for the error message
  message: string; // Technical error message for debugging
  retryable: boolean; // Whether the error can be retried
  timestamp: number; // When the error occurred
  context?: {
    method?: string; // Which API method failed
    email?: string; // Email context if relevant
    attempt?: number; // Retry attempt number
  };
}
```

### Reactive Auth State

```svelte
<script>
  import { createAuthStore } from '@thepia/flows-auth';
  import { makeSvelteCompatible } from '@thepia/flows-auth/svelte';
  import { m } from '../paraglide/messages.js';

  // createAuthStore() returns a plain Zustand store — wrap it with
  // makeSvelteCompatible() to get Svelte's $store auto-subscription
  const authStore = makeSvelteCompatible(createAuthStore(config));

  // Reactive statements automatically update when auth state changes
  let user = $derived($authStore.user);
  let isAuthenticated = $derived($authStore.state.startsWith('authenticated'));
  let isLoading = $derived($authStore.loading);
  let apiError = $derived($authStore.apiError);
</script>

{#if isLoading}
  <div class="loading">Signing in...</div>
{:else if apiError}
  <div class="error" role="alert">
    {m[apiError.code]()}
    {#if apiError.retryable}
      <button onclick={() => authStore.retryLastFailedRequest()}>Try Again</button>
    {/if}
  </div>
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

The library uses a centralized **ApiError architecture** with translation-based error messages for internationalization support.

### Centralized Error Management

```svelte
<script>
  import { createAuthStore } from '@thepia/flows-auth';
  import { makeSvelteCompatible, SignInCore } from '@thepia/flows-auth/svelte';
  import { m } from '../paraglide/messages.js';

  const authStore = makeSvelteCompatible(createAuthStore({
    apiBaseUrl: 'https://api.thepia.com',
    clientId: 'your-client-id',
    appCode: 'app',
    enablePasskeys: true,
    enableMagicLinks: false,
    domain: 'thepia.net'
  }));

  // React to centralized API errors
  let apiError = $derived($authStore.apiError);
  $effect(() => {
    if (apiError) {
      handleApiError(apiError);
    }
  });

  function handleApiError(error) {
    console.error('API Error:', {
      code: error.code,
      message: error.message,
      retryable: error.retryable,
      timestamp: new Date(error.timestamp)
    });

    // Optionally handle specific error types
    switch (error.code) {
      case 'error_usernotfound2':
        // User doesn't exist - could trigger registration flow
        break;
      case 'error_networkerror1':
        // Network issue - could show offline indicator
        break;
      case 'error_authenticationfailed1':
        // Auth failed - could suggest alternative methods
        break;
    }
  }

  // Clear errors when user takes action
  function clearError() {
    authStore.clearApiError();
  }

  // Retry failed operations
  async function retryLastOperation() {
    const success = await authStore.retryLastFailedRequest();
    if (!success) {
      console.log('Retry failed or no operation to retry');
    }
  }
</script>

<!-- Display persistent API errors with translations -->
{#if apiError}
  <div class="error-banner" role="alert">
    <p>{m[apiError.code]()}</p>
    <div class="error-actions">
      {#if apiError.retryable}
        <button onclick={retryLastOperation}>Try Again</button>
      {/if}
      <button onclick={clearError}>Dismiss</button>
    </div>
  </div>
{/if}

<!-- SignInCore automatically displays apiError with translations -->
<SignInCore store={authStore} />
```

### Error Types and Translation Keys

The library uses these error codes as translation keys:

- `error_usernotfound2` - No account found for email
- `error_serviceunavailable1` - Service temporarily unavailable
- `error_authenticationcancelled1` - User cancelled authentication
- `error_authenticationfailed1` - Authentication failed
- `error_networkerror1` - Network connection failed
- `error_ratelimited1` - Too many attempts
- `error_invalidinput1` - Invalid input provided
- `error_unknownerror1` - Unexpected error occurred

### Simplified Component Integration

Components no longer need error handling - errors are managed centrally:

```svelte
<script>
  // No try/catch needed - errors handled by AuthStore
  async function handleSignIn() {
    // This will set apiError on failure, no exception thrown
    await authStore.checkUser(email);
    await authStore.signInWithPasskey(email);
  }
</script>
```

## Styling and Theming

flows-auth components are styled with `@thepia/branding` design tokens.
`@thepia/branding` is an **optional peer dependency** — components reference
its CSS custom properties with hardcoded fallbacks (e.g.
`var(--color-brand-primary, #988ACA)`), so they render sensibly even if you
never load branding's CSS. To get real, on-brand styling, import branding's
stylesheets in your app:

```css
/* your app's global CSS */
@import "@thepia/branding/css";            /* design tokens (custom properties) */
@import "@thepia/branding/css/components"; /* .btn-brand, .input-brand, etc. */
```

```bash
pnpm add @thepia/branding
```

### Available tokens

Don't invent token names — these are the real ones components reference
(see `@thepia/branding`'s `tokens.css` for the complete list):

| Concept | Token |
|---|---|
| Primary brand color | `--color-brand-primary`, `--color-brand-primaryHover`, `--color-brand-primaryActive` |
| Text | `--color-text-primary`, `--color-text-secondary`, `--color-text-inverse`, `--color-text-error` |
| Backgrounds | `--color-bg-primary`, `--color-bg-secondary`, `--color-bg-muted` |
| Borders | `--color-border-default`, `--color-border-subtle`, `--color-border-error` |
| Radius scale | `--size-radius-0` through `-12`, and `-full` (note: `--size-radius-*`, not `--radius-*`) |
| Typography | `--font-fontFamily-brand-body`, `--font-fontFamily-brand-lead` |

### Overriding without forking branding

Since branding is just CSS custom properties, override them in your own
app's CSS after importing branding's tokens — no flows-auth-specific
theming API needed:

```css
:root {
  --color-brand-primary: #your-brand-color;
  --color-brand-primaryHover: #your-brand-color-darker;
}
```

Dark mode follows branding's own convention — set `.dark`, `.dark-theme`,
or `data-theme="dark"` on an ancestor element; branding's tokens redefine
themselves automatically under those selectors.

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
