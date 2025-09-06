# i18n Usage Examples

## Basic Configuration

### English (Default)
```typescript
import { createAuthStore } from '@thepia/flows-auth';

const authConfig = {
  apiBaseUrl: 'https://api.thepia.com',
  domain: 'thepia.com',
  clientId: 'your-client-id',
  enablePasskeys: true,
  enableMagicLinks: true,
  // language defaults to 'en' if not specified
};

const authStore = createAuthStore(authConfig);
```

### Spanish Configuration
```typescript
import { createAuthStore } from '@thepia/flows-auth';

const authConfig = {
  apiBaseUrl: 'https://api.thepia.com',
  domain: 'thepia.com',
  clientId: 'your-client-id',
  enablePasskeys: true,
  enableMagicLinks: true,
  language: 'es', // Spanish interface
};

const authStore = createAuthStore(authConfig);
```

### Custom Translation Overrides
```typescript
import { createAuthStore, type CustomTranslations } from '@thepia/flows-auth';

const customTranslations: CustomTranslations = {
  'auth.signIn': 'Login to ACME',
  'email.placeholder': 'usuario@acme.com',
  'status.emailSent': 'Check your ACME email for verification code',
  'webauthn.ready': '🔐 ACME SecureAuth ready - Touch ID available',
};

const authConfig = {
  apiBaseUrl: 'https://api.thepia.com',
  domain: 'thepia.com',
  clientId: 'your-client-id',
  enablePasskeys: true,
  enableMagicLinks: true,
  language: 'en',
  translations: customTranslations, // Override specific messages
  branding: {
    companyName: 'ACME Corporation'
  }
};

const authStore = createAuthStore(authConfig);
```

## Component Usage

### SignInCore with i18n
```svelte
<script>
  import { SignInCore } from '@thepia/flows-auth';
  
  const authConfig = {
    apiBaseUrl: 'https://api.thepia.com',
    domain: 'thepia.com',
    clientId: 'your-client-id',
    enablePasskeys: true,
    appCode: 'your-app',
    language: 'es', // Spanish interface
    translations: {
      'auth.signIn': 'Iniciar Sesión ACME',
      'email.label': 'Correo Electrónico',
    }
  };
</script>

<SignInCore
  config={authConfig}
  on:success={(event) => console.log('Success:', event.detail)}
  on:error={(event) => console.log('Error:', event.detail)}
/>
```

### Backward Compatibility with Legacy `texts` prop
```svelte
<script>
  import { SignInCore } from '@thepia/flows-auth';
  
  const authConfig = {
    apiBaseUrl: 'https://api.thepia.com',
    domain: 'thepia.com',
    clientId: 'your-client-id',
    enablePasskeys: true,
  };
  
  // DEPRECATED: Use config.translations instead
  const legacyTexts = {
    emailLabel: 'Your Email',
    emailPlaceholder: 'email@example.com',
    signInButton: 'Sign In Now'
  };
</script>

<!-- Still supported for backward compatibility -->
<SignInCore
  config={authConfig}
  texts={legacyTexts}
  on:success={(event) => console.log('Success:', event.detail)}
/>
```

## Available Languages

Currently supported languages (more can be added):
- `en` - English (default)

## Translation Keys

### Email Input
- `email.label` - "Email address"
- `email.placeholder` - "your.email@company.com" 
- `email.invalid` - "Please enter a valid email address"
- `email.required` - "Email address is required"

### Authentication Buttons
- `auth.signIn` - "Sign In"
- `auth.signInWithPasskey` - "Sign in with Passkey"
- `auth.sendPinByEmail` - "Send pin by email"
- `auth.enterExistingPin` - "Enter existing pin"
- `auth.loading` - "Loading..."
- `auth.signingIn` - "Signing in..."
- `auth.sendingPin` - "Sending pin..."
- `auth.verifyingPin` - "Verifying pin..."

### Status Messages
- `status.emailSent` - "We sent a verification code to"
- `status.checkEmail` - "Check your email"
- `status.pinValid` - "A valid pin was already sent to you, good for {minutes} minute{s}."
- `status.pinDirectAction` - "Enter pin here"
- `status.signInSuccess` - "Welcome back!"

### WebAuthn
- `webauthn.ready` - "🔐 WebAuthn ready - Touch ID/Face ID will appear automatically"
- `webauthn.cancelled` - "Authentication was cancelled"
- `webauthn.notSupported` - "WebAuthn is not supported on this device"

### Errors
- `error.network` - "Network error. Please try again."
- `error.authentication` - "Authentication failed. Please try again."
- `error.userNotFound` - "No account found with this email address"

### Actions
- `action.retry` - "Try again"
- `action.back` - "Back"
- `action.continue` - "Continue"
- `action.useDifferentEmail` - "Use a different email"

## Advanced Usage

### Language Detection
```typescript
import { detectUserLanguage, getSupportedLanguages } from '@thepia/flows-auth';

// Detect user's preferred language
const userLang = detectUserLanguage(['en'], 'en');

// Get all supported languages
const supportedLangs = getSupportedLanguages(); // ['en']

console.log('User language:', userLang);
console.log('Supported languages:', supportedLangs);
```

### Custom i18n Instance
```typescript
import { createI18n } from '@thepia/flows-auth';

// Create standalone i18n instance (for advanced use cases)
const i18n = createI18n('en', {
  'custom.message': 'Hello World'
});

// Use in your own components
$: translation = $i18n.t('custom.message');
```

### Template Variables
```typescript
const customTranslations = {
  'welcome.message': 'Welcome {name} to {company}!',
  'status.pinValid': 'Pin valid for {minutes} minute{s}.',
};

// The library automatically handles variable substitution:
// $i18n.t('welcome.message', { name: 'John', company: 'ACME' })
// Results in: "Welcome John to ACME!"
```

## Migration Guide

### From Legacy `texts` Prop

**Before (deprecated):**
```svelte
<SignInCore
  config={authConfig}
  texts={{
    emailLabel: 'Email Address',
    signInButton: 'Login Now',
    webAuthnReady: '🔐 Secure login ready'
  }}
/>
```

**After (recommended):**
```svelte
<script>
  const authConfig = {
    // ... other config
    translations: {
      'email.label': 'Email Address',
      'auth.signIn': 'Login Now', 
      'webauthn.ready': '🔐 Secure login ready'
    }
  };
</script>

<SignInCore config={authConfig} />
```

### Adding New Languages

To add support for a new language, extend the `defaultTranslations` object in `src/utils/i18n.ts`:

```typescript
export const defaultTranslations = {
  en: {
    'email.label': 'Email address',
    // ... other English translations
  },
  es: {
    'email.label': 'Dirección de correo electrónico',
    // ... Spanish translations  
  },
  // Add your language here
  fr: {
    'email.label': 'Adresse e-mail',
    // ... French translations
  }
};
```