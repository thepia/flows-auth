# @thepia/flows-auth

A comprehensive Svelte authentication library with WebAuthn/passkey support, designed for whitelabel applications and Flow app projects.

## Features

- 🔐 **WebAuthn/Passkey Support** - Secure, passwordless authentication
- 🎨 **Whitelabel Ready** - Complete branding and theming system
- 🔄 **Multi-step Flow** - Email → Passkey/Password/Magic Link
- 📱 **Mobile Optimized** - Works seamlessly on all devices
- 🧪 **Fully Tested** - Comprehensive test coverage
- 📦 **Tree Shakeable** - Import only what you need
- 🎯 **TypeScript** - Full type safety
- 🌍 **SSR Compatible** - Works with SvelteKit

## Quick Start

### Installation

#### From GitHub Packages

This package is published to GitHub Packages. You'll need to configure your package manager to use the GitHub registry for `@thepia` scoped packages.

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

```svelte
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

### Individual Step Components

You can also use individual step components for custom flows:

```svelte
import { 
  EmailStep,
  PasskeyStep, 
  PasswordStep,
  MagicLinkStep 
} from '@thepia/flows-auth/components';
```

## Authentication Store

The auth store manages authentication state and provides methods for sign-in/out.

```javascript
import { createAuthStore } from '@thepia/flows-auth/stores';

const auth = createAuthStore(config);

// Subscribe to auth state
auth.subscribe($auth => {
  console.log('Auth state:', $auth.state);
  console.log('User:', $auth.user);
});

// Sign in methods
await auth.signIn('user@example.com');
await auth.signInWithPasskey('user@example.com');
await auth.signInWithPassword('user@example.com', 'password');
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
  enablePasswordLogin: boolean;
  enableSocialLogin: boolean;
  
  // Optional
  redirectUri?: string;
  socialProviders?: SocialProvider[];
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

## API Integration

The library expects your API to implement these endpoints:

```http
POST /auth/signin
POST /auth/signin/passkey
POST /auth/signin/password
POST /auth/signin/magic-link
POST /auth/webauthn/challenge
POST /auth/refresh
POST /auth/signout
GET  /auth/profile
```

See the [API Documentation](./docs/api.md) for detailed request/response formats.

## Demo Application

A comprehensive demo application is included in `src/demo-app/` that showcases all features of the flows-auth library. The demo includes:

- **Live Authentication Flow**: Complete sign-in/sign-out functionality
- **Feature Showcase**: Demonstrates WebAuthn, magic links, and password authentication
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
    enableMagicLinks: true,
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

MIT License - see [LICENSE](./LICENSE) file for details.

## Support

- 📖 [Documentation](./docs/)
- 🐛 [Issue Tracker](https://github.com/thepia/flows-auth/issues)
- 💬 [Discussions](https://github.com/thepia/flows-auth/discussions)
- 📧 Email: <dev@thepia.com>
