# @thepia/flows-auth

A comprehensive Svelte authentication library with WebAuthn/passkey support, designed for whitelabel applications and Flow app projects.

## Features

- 🔐 **WebAuthn/Passkey Support** - Secure, passwordless authentication
- 🎨 **Whitelabel Ready** - Complete branding and theming system
- 🔄 **Multi-step Flow** - Email → Passkey/Magic Link
- 📱 **Mobile Optimized** - Works seamlessly on all devices
- 🧪 **Fully Tested** - Comprehensive test coverage
- 📦 **Tree Shakeable** - Import only what you need
- 🎯 **TypeScript** - Full type safety
- 🌍 **SSR Compatible** - Works with SvelteKit

## Architecture

Modular Zustand-based state management:
- `src/stores/core/` - Auth state, session, errors, events
- `src/stores/auth-methods/` - Passkey and email authentication
- `src/stores/ui/` - UI state and business logic
- `src/stores/adapters/` - Svelte adapter for reactivity

## Quick Start

### Installation

#### From GitHub Packages

This package is published to GitHub Packages. You'll need to configure your package manager to use the GitHub registry for `@thepia` scoped packages.

#### Publishing the Package

For maintainers, to publish a new version:

```bash
# 1. Update version in package.json
npm version patch  # or minor/major

# 2. Build and test
pnpm build
pnpm test

# 3. Publish to GitHub Packages
pnpm publish --no-git-checks

# 4. Create GitHub release (optional)
git push --tags
```

> **Note**: Publishing requires a GitHub Personal Access Token with `write:packages` scope configured in your global `~/.npmrc` file.

**Using npm:**

```bash
# Configure registry for @thepia scope
npm config set @thepia:registry https://npm.pkg.github.com

# Set authentication token (required for GitHub Packages)
npm config set //npm.pkg.github.com/:_authToken YOUR_GITHUB_PERSONAL_ACCESS_TOKEN

# Install the package
npm install @thepia/flows-auth
```

**Using pnpm:**

```bash
# Configure registry in .npmrc file
echo "@thepia:registry=https://npm.pkg.github.com" >> .npmrc
echo "//npm.pkg.github.com/:_authToken=YOUR_GITHUB_PERSONAL_ACCESS_TOKEN" >> .npmrc

# Install the package
pnpm install @thepia/flows-auth
```

**Using yarn:**

```bash
# Configure registry
yarn config set @thepia:registry https://npm.pkg.github.com

# Install the package (you'll be prompted for authentication)
yarn add @thepia/flows-auth
```

> **Note**: You need a GitHub Personal Access Token with `read:packages` scope to install from GitHub Packages. Set the `NODE_AUTH_TOKEN` environment variable or configure it in your `.npmrc` file.

### Basic Usage

Choose the pattern that best fits your application architecture:

#### 1. Context Pattern (SvelteKit/Svelte Apps)

**Best for**: Traditional Svelte/SvelteKit applications with component hierarchies

Set up once in your root layout, access anywhere with `getAuthStoreFromContext()`:

```svelte
<!-- +layout.svelte -->
<script>
  import { setupAuthContext } from '@thepia/flows-auth';

  const authConfig = {
    apiBaseUrl: 'https://api.yourapp.com',
    clientId: 'your-client-id',
    domain: 'yourapp.com',
    enablePasskeys: true,
    enableMagicLinks: false,
    branding: {
      companyName: 'Your Company',
      logoUrl: '/logo.svg',
      primaryColor: '#0066cc'
    }
  };

  // Initialize once - available to all child components via context
  const authStore = setupAuthContext(authConfig);
</script>

<slot />
```

Then use `getAuthStoreFromContext()` in any child component:

```svelte
<!-- any-page.svelte -->
<script>
  import { getAuthStoreFromContext, SignInForm } from '@thepia/flows-auth';

  // Get the auth store from context (no store creation needed)
  const authStore = getAuthStoreFromContext();

  // Subscribe to auth state
  $: isAuthenticated = $authStore.isAuthenticated;
  $: user = $authStore.session?.user;
</script>

{#if isAuthenticated}
  <p>Welcome, {user?.email}!</p>
  <button onclick={() => authStore.signOut()}>Sign Out</button>
{:else}
  <SignInForm />
{/if}
```

#### 2. Astro Islands Pattern (Shared Zustand Store)

**Best for**: Astro applications using islands architecture with partial hydration

Create a singleton Zustand store that all islands share:

```typescript
// src/lib/auth-store.ts - Singleton store shared across all islands
import { createAstroAuthStore, getAstroApiUrl } from '@thepia/flows-auth/stores/adapters/astro';

// This is the ONLY store instance - all islands import this same instance
export const authStore = createAstroAuthStore({
  apiBaseUrl: getAstroApiUrl(),
  domain: 'yourapp.com',
  enablePasskeys: true,
  enableMagicLinks: false,
  signInMode: 'login-or-register'
});
```

Use the shared store in Svelte islands:

```svelte
<!-- src/components/SignInIsland.svelte -->
<script>
  import { authStore } from '../lib/auth-store';
  import { makeSvelteCompatible } from '@thepia/flows-auth/stores/adapters/svelte';

  // Wrap the shared Zustand store for Svelte reactivity
  const auth = makeSvelteCompatible(authStore);

  $: isAuthenticated = $auth.isAuthenticated;
  $: user = $auth.session?.user;
</script>

{#if isAuthenticated}
  <p>Welcome, {user?.email}!</p>
  <button onclick={() => auth.signOut()}>Sign Out</button>
{:else}
  <!-- Your sign-in UI here -->
{/if}
```

```svelte
<!-- src/components/UserStatusIsland.svelte -->
<script>
  import { authStore } from '../lib/auth-store'; // Same store instance!
  import { makeSvelteCompatible } from '@thepia/flows-auth/stores/adapters/svelte';

  const auth = makeSvelteCompatible(authStore);

  // This island automatically updates when SignInIsland changes the store
</script>

<div>
  <p>Current user: {$auth.session?.user?.email || 'Not signed in'}</p>
  <p>Auth state: {$auth.signInState}</p>
</div>
```

Use islands in Astro pages:

```astro
<!-- src/pages/index.astro -->
---
import SignInIsland from '../components/SignInIsland.svelte';
import UserStatusIsland from '../components/UserStatusIsland.svelte';
---
<html>
  <body>
    <!-- Both islands share the same auth store and stay synchronized -->
    <SignInIsland client:load />
    <UserStatusIsland client:visible />
  </body>
</html>
```

**Key Differences**:
- **Context Pattern**: Uses Svelte context (`setupAuthContext` + `getAuthStoreFromContext`)
- **Astro Islands**: Uses shared Zustand store (`createAstroAuthStore` + `makeSvelteCompatible`)
- **State Sharing**: Context works within component trees; Astro islands share via ES module singleton

**Alternative: Standalone Usage**

For single-page apps or when you don't need context:

```svelte
<script>
  import { SignInForm, createAuthStore } from '@thepia/flows-auth';

  const authConfig = {
    apiBaseUrl: 'https://api.yourapp.com',
    clientId: 'your-client-id',
    domain: 'yourapp.com',
    enablePasskeys: true,
    enableMagicLinks: false
  };

  const auth = createAuthStore(authConfig);

  function handleSuccess({ detail }) {
    console.log('Signed in:', detail.user);
  }
</script>

<SignInForm
  config={authConfig}
  on:success={handleSuccess}
/>
```

## Components

### SignInForm

The main authentication component that handles the complete sign-in flow.

```svelte
<SignInForm 
  {config}
  showLogo={true}
  compact={false}
  initialEmail=""
  on:success={handleSuccess}
  on:error={handleError}
  on:stateChange={handleStateChange}
/>
```

**Props:**

- `config` - Authentication configuration object
- `showLogo` - Whether to display the company logo
- `compact` - Use compact layout for modals/small spaces
- `initialEmail` - Pre-fill email field
- `className` - Additional CSS classes

**Events:**

- `success` - User successfully authenticated
- `error` - Authentication error occurred
- `stateChange` - Authentication step changed

### AccountCreationForm

The complete user registration component with WebAuthn passkey support, invitation tokens, and immediate app access.

```svelte
<AccountCreationForm 
  {config}
  showLogo={true}
  compact={false}
  initialEmail=""
  invitationTokenData={null}
  additionalFields={['company', 'phone', 'jobTitle']}
  readOnlyFields={[]}
  on:appAccess={handleAppAccess}
  on:success={handleSuccess}
  on:error={handleError}
  on:switchToSignIn={handleSwitchToSignIn}
/>
```

**Props:**

- `config` - Authentication configuration object
- `showLogo` - Whether to display the company logo
- `compact` - Use compact layout for modals/small spaces
- `initialEmail` - Pre-fill email field
- `invitationTokenData` - Invitation token data for prefilling fields
- `additionalFields` - Array of additional business fields to show
- `readOnlyFields` - Array of field names that should be read-only
- `className` - Additional CSS classes

**Events:**

- `appAccess` - User should enter app immediately after registration
- `success` - User successfully registered
- `error` - Registration error occurred
- `switchToSignIn` - User wants to switch to sign-in mode
- `stepChange` - Registration step changed

### Individual Step Components

You can also use individual step components for custom flows:

```svelte
import { 
  EmailStep,
  PasskeyStep, 
  MagicLinkStep 
} from '@thepia/flows-auth/components';
```

## Authentication Store

The auth store manages authentication state and provides methods for sign-in/out. Access patterns depend on your application architecture:

### Context Pattern (SvelteKit/Svelte)

Use `getAuthStoreFromContext()` to access the store initialized in your root layout:

```javascript
import { getAuthStoreFromContext } from '@thepia/flows-auth';

// In any component after setupAuthContext() was called in root layout
const authStore = getAuthStoreFromContext();

// Subscribe to auth state (Svelte reactive)
$: isAuthenticated = $authStore.isAuthenticated;
$: user = $authStore.session?.user;

// Call auth methods
await authStore.signIn('user@example.com');
await authStore.signInWithPasskey('user@example.com');
await authStore.signOut();
```

### Astro Islands Pattern

Use the shared Zustand store with Svelte adapter:

```javascript
import { authStore } from '../lib/auth-store'; // Your singleton store
import { makeSvelteCompatible } from '@thepia/flows-auth/stores/adapters/svelte';

// In any Svelte island component
const auth = makeSvelteCompatible(authStore);

// Subscribe to auth state (Svelte reactive)
$: isAuthenticated = $auth.isAuthenticated;
$: user = $auth.session?.user;

// Call auth methods
await auth.signIn('user@example.com');
await auth.signInWithPasskey('user@example.com');
await auth.signOut();
```

### Direct Store Creation (Advanced)

For custom implementations or when you need direct control:

```javascript
import { createAuthStore } from '@thepia/flows-auth/stores';

const auth = createAuthStore(config);

// Subscribe to auth state (Zustand)
auth.subscribe($auth => {
  console.log('Auth state:', $auth.signInState);
  console.log('User:', $auth.session?.user);
});

// Sign in methods
await auth.signIn('user@example.com');
await auth.signInWithPasskey('user@example.com');
await auth.signInWithMagicLink('user@example.com');

// Other methods
await auth.signOut();
await auth.refreshTokens();
const isAuthenticated = auth.isAuthenticated();
const token = auth.getAccessToken();
```

## Configuration

```typescript
interface AuthConfig {
  // Required
  apiBaseUrl: string;
  clientId: string;
  domain: string;
  
  // Feature flags
  enablePasskeys: boolean;
  enableMagicLinks: boolean;
  
  // Optional
  redirectUri?: string;
  branding?: AuthBranding;
}

interface AuthBranding {
  companyName: string;
  logoUrl?: string;
  primaryColor?: string;
  secondaryColor?: string;
  showPoweredBy?: boolean;
  customCSS?: string;
}
```

### Database Adapter for Session Persistence

flows-auth uses a `SessionPersistence` interface for all session persistence. By default, it uses a localStorage/sessionStorage adapter, but you can provide any custom adapter (flows-db, IndexedDB, Service Worker, etc.).

**Default Behavior:**
- If no `database` config is provided, sessions are stored in localStorage/sessionStorage (via `createLocalStorageAdapter()`)
- The auth store remains synchronous (`createAuthStore()`)
- Session restoration happens asynchronously after store creation
- Store starts as `unauthenticated` and transitions to `authenticated` once session loads

**Example: Using flows-db for Service Worker persistence**

```svelte
<!-- +layout.svelte -->
<script>
  import { setupAuthContext } from '@thepia/flows-auth';
  import { getFlowsDB } from '@thepia/flows-db/client';

  // Get flows-db client - provides session property that implements SessionPersistence
  const flowsDB = getFlowsDB();

  const authConfig = {
    apiBaseUrl: 'https://api.thepia.com',
    clientId: 'demo',
    domain: 'thepia.net',
    enablePasskeys: true,
    enableMagicLinks: false,
    // Automatic session persistence via flows-db service worker
    database: flowsDB.session
  };

  const authStore = setupAuthContext(authConfig);
</script>
```

**Note:** The `flowsDB.session` object implements the `SessionPersistence` interface natively - no wrapper function needed!

**Using explicit localStorage adapter (with custom storage config)**

```typescript
import { createLocalStorageAdapter } from '@thepia/flows-auth';

const authConfig = {
  // ... other config
  storage: {
    type: 'localStorage', // or 'sessionStorage'
    sessionTimeout: 28800000, // 8 hours in milliseconds
    persistentSessions: true,
    userRole: 'employee'
  },
  // Explicitly use localStorage adapter (optional - this is the default)
  database: createLocalStorageAdapter()
};
```

**Custom Database Adapter**

Implement the `SessionPersistence` interface for any storage system:

```typescript
import type { SessionPersistence, SessionData } from '@thepia/flows-auth';

const myAdapter: SessionPersistence = {
  async saveSession(session: SessionData): Promise<void> {
    // Save to your database
    await myDB.sessions.put(session);
  },

  async loadSession(): Promise<SessionData | null> {
    // Load from your database
    return await myDB.sessions.get();
  },

  async clearSession(): Promise<void> {
    // Clear from your database
    await myDB.sessions.delete();
  }
};

// Use in auth config
const authConfig = {
  // ... other config
  database: myAdapter
};
```

When configured, the auth store will automatically:
- Save sessions when users sign in
- Load sessions on initialization
- Clear sessions when users sign out

## Whitelabel Theming

The library supports complete visual customization through CSS custom properties:

```css
:root {
  /* Brand colors */
  --auth-primary-color: #your-brand-color;
  --auth-secondary-color: #your-secondary-color;
  --auth-accent-color: #your-accent-color;
  
  /* Typography */
  --auth-font-family: 'Your Brand Font', sans-serif;
  --auth-border-radius: 8px;
  
  /* Spacing */
  --auth-padding: 24px;
  --auth-gap: 16px;
}
```

Or use the branding configuration:

```javascript
const config = {
  // ... other config
  branding: {
    companyName: 'ACME Corp',
    logoUrl: '/acme-logo.svg',
    primaryColor: '#ff0000',
    secondaryColor: '#00ff00',
    customCSS: `
      .auth-form { border-radius: 0; }
      .auth-button { text-transform: uppercase; }
    `
  }
};
```

## API Integration Status

flows-auth is **production-ready** and correctly interfaces with the thepia.com authentication API.

### ✅ Currently Working Endpoints
- `POST /auth/check-user` - User existence and passkey checking
- `POST /auth/webauthn/challenge` - WebAuthn challenge generation  
- `POST /auth/webauthn/verify` - Passkey authentication verification
- `POST /auth/register` - New user account creation
- `POST /auth/webauthn/register-options` - Passkey registration options
- `POST /auth/webauthn/register-verify` - Passkey registration verification

### 🔄 Token Handling
Currently receives placeholder tokens from thepia.com API (`"webauthn-verified"`). flows-auth stores and uses these tokens correctly. **Will automatically work with real JWT tokens** when thepia.com implements them per their documented plan.

### 📋 Planned Features (API Not Ready)
- Token refresh functionality (logic implemented, waiting for API)
- Magic link authentication (fallback method)

See [API Integration Status](./docs/auth/api-integration-status.md) for complete technical details.

## Documentation Authority Matrix

The following documents are the **single source of truth** for their respective topics. When information conflicts between documents, these authorities take precedence:

### 🏛️ **Core Architecture & Requirements**
| Document | Authority Over | Status |
|----------|---------------|---------|
| [`docs/specifications/AccountCreationForm-spec.md`](./docs/specifications/AccountCreationForm-spec.md) | AccountCreationForm component behavior, events, props | ✅ Authoritative |
| [`docs/specifications/signInWithPasskey-spec.md`](./docs/specifications/signInWithPasskey-spec.md) | WebAuthn/passkey authentication flow | ✅ Authoritative |
| [`docs/SESSION_MANAGEMENT_REQUIREMENTS.md`](./docs/SESSION_MANAGEMENT_REQUIREMENTS.md) | Session storage, timeouts, state management | ✅ Authoritative |
| [`docs/testing/API_CONTRACT_TESTING_POLICY.md`](./docs/testing/API_CONTRACT_TESTING_POLICY.md) | API integration testing requirements | ✅ Authoritative |

### 🔧 **Configuration & Setup**
| Document | Authority Over | Status |
|----------|---------------|---------|
| [`docs/STORAGE_CONFIGURATION.md`](./docs/STORAGE_CONFIGURATION.md) | Storage adapters, role-based configuration | ✅ Authoritative |
| [`docs/INVITATION_TOKEN_IMPLEMENTATION.md`](./docs/INVITATION_TOKEN_IMPLEMENTATION.md) | Invitation token format, validation, flows | ✅ Authoritative |
| [`docs/privacy/zero-cookie-architecture.md`](./docs/privacy/zero-cookie-architecture.md) | Privacy architecture, cookie-free design | ✅ Authoritative |

### 🧪 **Testing & Quality**
| Document | Authority Over | Status |
|----------|---------------|---------|
| [`docs/testing/README.md`](./docs/testing/README.md) | Testing strategy, coverage requirements | ✅ Authoritative |
| [`docs/testing/thepia-com-api-contracts/`](./docs/testing/thepia-com-api-contracts/) | API contract specifications | ✅ Authoritative |
| [`docs/CRITICAL_ISSUES_AND_FIXES.md`](./docs/CRITICAL_ISSUES_AND_FIXES.md) | Known issues, root causes, fix status | ✅ Authoritative |

### 🚨 **Critical Issues & Fixes**
| Document | Authority Over | Status |
|----------|---------------|---------|
| [`docs/CRITICAL_ISSUES_AND_FIXES.md`](./docs/CRITICAL_ISSUES_AND_FIXES.md) | createAccount session saving, doc consolidation plan | ✅ Authoritative |
| [`docs/BREAKING_CHANGES_CHECKLIST.md`](./docs/BREAKING_CHANGES_CHECKLIST.md) | Breaking change protocols, API compatibility | ✅ Authoritative |

### 🔄 **Development & Implementation**
| Document | Authority Over | Status |
|----------|---------------|---------|
| [`CLAUDE.md`](./CLAUDE.md) | AI development patterns, common mistakes | ✅ Authoritative |
| [`docs/development/api-server-architecture.md`](./docs/development/api-server-architecture.md) | Server-side implementation requirements | ✅ Authoritative |
| [`docs/components/AccountCreationForm.md`](./docs/components/AccountCreationForm.md) | Component usage examples, integration patterns | ✅ Authoritative |

### ⚠️ **Deprecated/Transitional Documents**
| Document | Status | Migration Path |
|----------|--------|----------------|
| `docs/testing/IMPLEMENTATION_CHECKLIST.md` | ✅ **Archived** | `docs/archive/IMPLEMENTATION_CHECKLIST.md` |
| `docs/testing/FINDINGS_AND_RECOMMENDATIONS.md` | ✅ **Archived** | `docs/archive/FINDINGS_AND_RECOMMENDATIONS.md` |
| `docs/auth/comprehensive-implementation-plan.md` | ✅ **Archived** | `docs/archive/comprehensive-implementation-plan.md` |

### 📋 **Usage Guidelines**

**For Developers:**
- Always check the **Authority Matrix** before reading documentation
- When information conflicts, defer to the authoritative document
- Update this matrix when creating new authoritative documents

**For AI Assistants:**
- Prioritize authoritative documents over non-authoritative ones
- Flag conflicts between authoritative documents as critical issues
- Never contradict information from authoritative documents

**For Documentation Maintainers:**
- Keep this matrix updated when moving/creating/deleting documents
- Mark documents as authoritative only when they're complete and reviewed
- Use the `Status` column to track documentation lifecycle

---

## Demo Application

A comprehensive demo application is included in `src/demo-app/` that showcases all features of the flows-auth library. The demo includes:

- **Live Authentication Flow**: Complete sign-in/sign-out functionality
- **Feature Showcase**: Demonstrates WebAuthn and magic link authentication
- **Configuration Examples**: Shows different branding and configuration options
- **Responsive Design**: Works on desktop and mobile devices

### Running the Demo

```bash
# Navigate to demo app
cd src/demo-app

# Install dependencies
pnpm install

# Start development server
pnpm dev

# Build for production
pnpm build
```

The demo app is also deployed automatically to GitHub Pages: [View Live Demo](https://thepia.github.io/flows-auth/)

## Examples

### Basic Authentication

```svelte
<!-- examples/basic/App.svelte -->
<script>
  import { SignInForm } from '@thepia/flows-auth';
  
  const config = {
    apiBaseUrl: 'https://api.example.com',
    clientId: 'demo-client',
    domain: 'example.com',
    enablePasskeys: true,
    enableMagicLinks: false,
    branding: {
      companyName: 'Demo Company'
    }
  };
</script>

<SignInForm {config} />
```

### Whitelabel Example

```svelte
<!-- examples/whitelabel/App.svelte -->
<script>
  import { SignInForm } from '@thepia/flows-auth';
  
  const config = {
    apiBaseUrl: process.env.VITE_API_URL,
    clientId: process.env.VITE_CLIENT_ID,
    domain: process.env.VITE_DOMAIN,
    enablePasskeys: true,
    branding: {
      companyName: process.env.VITE_COMPANY_NAME,
      logoUrl: process.env.VITE_LOGO_URL,
      primaryColor: process.env.VITE_PRIMARY_COLOR,
      customCSS: `
        .auth-form {
          --auth-border-radius: 0;
          --auth-shadow: none;
          border: 2px solid var(--auth-primary-color);
        }
      `
    }
  };
</script>

<SignInForm {config} compact />
```

## Testing

The library includes comprehensive test utilities:

```javascript
import { render, fireEvent } from '@testing-library/svelte';
import { createMockAuthConfig } from '@thepia/flows-auth/testing';
import SignInForm from '@thepia/flows-auth';

test('sign in flow', async () => {
  const config = createMockAuthConfig();
  const { getByLabelText, getByText } = render(SignInForm, { config });
  
  await fireEvent.input(getByLabelText('Email'), { 
    target: { value: 'test@example.com' } 
  });
  await fireEvent.click(getByText('Continue'));
  
  // Assert passkey step appears
  expect(getByText('Use your passkey')).toBeInTheDocument();
});
```

## Migration from React

If you're migrating from the React version:

1. **Component props** remain largely the same
2. **Event handlers** use Svelte's `on:event` syntax instead of `onEvent` props
3. **State management** uses Svelte stores instead of React hooks
4. **Styling** uses CSS custom properties instead of CSS-in-JS

See the [Migration Guide](./docs/migration.md) for detailed instructions.

## Development

### Basic Development

```bash
# Install dependencies
pnpm install

# Run tests
pnpm test

# Build library
pnpm build

# Run examples
pnpm example:flows-app-demo
pnpm example:tasks-app-demo
```

### Local Development with Live Updates

When developing flows-auth alongside a consuming project (like flows.thepia.net), you can use pnpm link for live updates that automatically reflect changes without manual reinstallation:

```bash
# Step 1: In flows-auth directory - create global link
cd /path/to/flows-auth
pnpm link --global

# Step 2: In your consuming project - use the global link
cd /path/to/your-project
pnpm link --global @thepia/flows-auth

# Now changes in flows-auth will automatically be available in your project
# You still need to build flows-auth after making changes:
cd /path/to/flows-auth
pnpm build
# Changes are now live in your consuming project!
```

**Troubleshooting pnpm link issues:**

If you encounter "Symlink path is the same as the target path" error:

```bash
# Clear existing global links
pnpm unlink --global @thepia/flows-auth

# Remove from consuming project
cd /path/to/your-project
pnpm unlink --global @thepia/flows-auth

# Clean install in consuming project
rm -rf node_modules/@thepia/flows-auth
pnpm install

# Try linking again
cd /path/to/flows-auth
pnpm link --global
cd /path/to/your-project
pnpm link --global @thepia/flows-auth
```

If linking continues to fail, use the manual install method below.

### Alternative: Manual Install Method

If you prefer not to use global links, you can manually update after each build:

```bash
# After building flows-auth
cd /path/to/your-project
rm -rf node_modules/@thepia/flows-auth
pnpm install
```

**Note:** The `file:../flows-auth` dependency method requires manual reinstallation after each build, as pnpm copies files at install time rather than creating live links.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality
4. Ensure all tests pass
5. Submit a pull request

## License

Proprietary License - see [LICENSE](./LICENSE) file for details.

## Support

- 📖 [Documentation](./docs/)
- 🐛 [Issue Tracker](https://github.com/thepia/flows-auth/issues)
- 💬 [Discussions](https://github.com/thepia/flows-auth/discussions)
- 📧 Email: <dev@thepia.com>
