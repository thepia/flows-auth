# Flows Auth Demo App

This is a demonstration application showcasing the `@thepia/flows-auth` library with WebAuthn/passkey support.

## Purpose

This demo app serves as:
- **Example Implementation**: Shows how to integrate flows-auth into a SvelteKit application
- **Feature Showcase**: Demonstrates all major features of the authentication library
- **Testing Environment**: Provides a sandbox for testing authentication flows
- **Documentation**: Living example of best practices and configuration options

## Features Demonstrated

- ✅ **WebAuthn/Passkey Authentication**: Secure, passwordless sign-in
- ✅ **Multi-step Authentication Flow**: Email → Passkey/Password/Magic Link
- ✅ **Whitelabel Branding**: Custom styling and company branding
- ✅ **State Management**: Real-time authentication state updates
- ✅ **Error Handling**: Comprehensive error handling and user feedback
- ✅ **Mobile Responsive**: Works on all device sizes

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm 8+

### Installation

```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev

# Build for production
pnpm build

# Preview production build
pnpm preview
```

### Configuration

The demo uses a sample configuration in `src/routes/+page.svelte`:

```javascript
const authConfig = {
  apiBaseUrl: 'https://api.demo.thepia.com',
  clientId: 'demo-flows-auth',
  domain: 'demo.thepia.com',
  enablePasskeys: true,
  enableMagicLinks: true,
  enablePasswordLogin: true,
  branding: {
    companyName: 'Demo Company',
    logoUrl: '/logo.svg',
    primaryColor: '#3b82f6',
    secondaryColor: '#1f2937',
    showPoweredBy: true
  }
};
```

## Usage Examples

### Basic Integration

```svelte
<script>
  import { SignInForm, createAuthStore } from '@thepia/flows-auth';
  
  const authConfig = { /* your config */ };
  const auth = createAuthStore(authConfig);
  
  function handleSuccess(event) {
    console.log('User signed in:', event.detail.user);
  }
</script>

<SignInForm 
  config={authConfig}
  on:success={handleSuccess}
/>
```

### Auth Store Usage

```javascript
// Subscribe to auth state
auth.subscribe($auth => {
  console.log('Current user:', $auth.user);
  console.log('Auth state:', $auth.state);
});

// Sign in methods
await auth.signIn('user@example.com');
await auth.signInWithPasskey('user@example.com');
await auth.signOut();
```

## Development

### Project Structure

```
src/demo-app/
├── src/
│   ├── routes/
│   │   ├── +layout.svelte    # App layout
│   │   └── +page.svelte      # Main demo page
│   ├── app.html              # HTML template
│   └── app.css               # Global styles
├── package.json
├── svelte.config.js
├── vite.config.js
└── tsconfig.json
```

### Available Scripts

- `pnpm dev` - Start development server
- `pnpm build` - Build for production
- `pnpm preview` - Preview production build
- `pnpm check` - Run Svelte type checking
- `pnpm lint` - Run Biome linting
- `pnpm format` - Format code with Biome

## Deployment

This demo app is configured for static deployment and can be deployed to:

- **GitHub Pages**: Automatic deployment via GitHub Actions
- **Vercel**: Connect your repository for automatic deployments
- **Netlify**: Drag and drop the `build` folder
- **Any static hosting**: Upload the contents of the `build` folder

### GitHub Pages Deployment

The demo app is automatically deployed to GitHub Pages when changes are pushed to the main branch. The deployment URL follows the pattern:

```
https://thepia.github.io/flows-auth/
```

## Contributing

When making changes to the demo app:

1. Ensure all examples work correctly
2. Update documentation if adding new features
3. Test on multiple devices and browsers
4. Follow the existing code style and patterns

## Support

For questions about the demo app or the flows-auth library:

- 📖 [Library Documentation](../../README.md)
- 🐛 [Issue Tracker](https://github.com/thepia/flows-auth/issues)
- 💬 [Discussions](https://github.com/thepia/flows-auth/discussions)
- 📧 Email: dev@thepia.com
