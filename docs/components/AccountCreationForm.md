# AccountCreationForm Component

The AccountCreationForm component provides a complete user registration experience with WebAuthn passkey authentication, supporting invitation tokens, business fields, and immediate app access after registration.

## Features

- ✅ **Complete Registration Flow**: Email entry → Terms acceptance → WebAuthn registration → App access
- ✅ **Invitation Token Support**: Prefill fields and validate tokens
- ✅ **Business Fields**: Company, phone, and job title fields
- ✅ **Dynamic Field Configuration**: Configure which fields to show and lock
- ✅ **Immediate App Access**: Users enter app immediately after registration
- ✅ **Sign-in Mode Switching**: Allow users to switch to sign-in if they have an account
- ✅ **WebAuthn Integration**: Secure passkey-based authentication
- ✅ **Responsive Design**: Works on desktop and mobile devices

## Basic Usage

```svelte
<script>
  import { AccountCreationForm } from '@thepia/flows-auth';
  
  const config = {
    apiBaseUrl: 'https://api.thepia.com',
    domain: 'thepia.com',
    enablePasskeys: true,
    branding: {
      companyName: 'Your Company',
      logoUrl: '/logo.svg'
    }
  };
  
  function handleAppAccess(event) {
    const { user } = event.detail;
    // User is now authenticated and can access the app
    console.log('User registered:', user);
  }
  
  function handleSwitchToSignIn() {
    // Switch to sign-in mode
    showSignInForm = true;
  }
</script>

<AccountCreationForm 
  {config}
  on:appAccess={handleAppAccess}
  on:switchToSignIn={handleSwitchToSignIn}
/>
```

## Advanced Usage with Invitation Tokens

```svelte
<script>
  import { AccountCreationForm } from '@thepia/flows-auth';
  
  const config = {
    apiBaseUrl: 'https://api.thepia.com',
    domain: 'thepia.com',
    enablePasskeys: true,
    branding: {
      companyName: 'Your Company',
      logoUrl: '/logo.svg'
    }
  };
  
  // Invitation token data from URL or API
  const invitationTokenData = {
    email: 'user@company.com',
    firstName: 'John',
    lastName: 'Doe',
    company: 'Acme Corp',
    phone: '+1-555-0123',
    jobTitle: 'Software Engineer',
    expires: new Date('2025-12-31'),
    message: 'Welcome to our team!'
  };
  
  // Configure additional business fields
  const additionalFields = ['company', 'phone', 'jobTitle'];
  
  // Lock email field since it's from invitation token
  const readOnlyFields = ['email'];
  
  function handleAppAccess(event) {
    const { user } = event.detail;
    // User is now authenticated with invitation token data
    console.log('User registered with invitation:', user);
  }
</script>

<AccountCreationForm 
  {config}
  {invitationTokenData}
  {additionalFields}
  {readOnlyFields}
  on:appAccess={handleAppAccess}
/>
```

## Props

### Required Props

| Prop | Type | Description |
|------|------|-------------|
| `config` | `AuthConfig` | Authentication configuration object |

### Optional Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `showLogo` | `boolean` | `true` | Whether to show company logo |
| `compact` | `boolean` | `false` | Use compact layout for smaller screens |
| `className` | `string` | `''` | Additional CSS classes |
| `initialEmail` | `string` | `''` | Pre-populate email field |
| `invitationTokenData` | `InvitationTokenData` | `null` | Invitation token data for prefilling |
| `additionalFields` | `Array<'company' \\| 'phone' \\| 'jobTitle'>` | `[]` | Additional business fields to show |
| `readOnlyFields` | `string[]` | `[]` | Fields that should be read-only |
| `onSwitchToSignIn` | `() => void` | `undefined` | Callback for switching to sign-in mode |

## Events

| Event | Payload | Description |
|-------|---------|-------------|
| `stepChange` | `{ step: RegistrationStep }` | Emitted when form step changes |
| `success` | `{ user: User, step: RegistrationStep }` | Emitted on successful registration |
| `appAccess` | `{ user: User }` | Emitted when user should access app immediately |
| `error` | `{ error: AuthError }` | Emitted on registration errors |
| `switchToSignIn` | `{}` | Emitted when user wants to switch to sign-in |
| `terms_accepted` | `{ terms: boolean, privacy: boolean, marketing: boolean }` | Emitted when terms are accepted |

## Type Definitions

### InvitationTokenData

```typescript
interface InvitationTokenData {
  email: string;
  firstName?: string;
  lastName?: string;
  company?: string;
  phone?: string;
  jobTitle?: string;
  expires?: Date;
  message?: string;
}
```

### RegistrationStep

```typescript
type RegistrationStep =
  | 'email-entry'
  | 'terms-of-service'
  | 'webauthn-register'
  | 'registration-success'
  | 'error';
```

## Registration Flow

### Step 1: Email Entry
- User enters their email address
- System checks if user already exists
- If user exists, shows option to switch to sign-in
- If invitation token provided, email is prefilled and locked

### Step 2: Terms of Service
- User must accept Terms of Service (required)
- User must accept Privacy Policy (required)
- User can optionally accept marketing communications
- Links to actual terms and privacy policy documents

### Step 3: WebAuthn Registration
- User can optionally enter name information
- Business fields shown if configured
- WebAuthn passkey creation initiated
- User prompted for biometric authentication

### Step 4: Registration Success
- Success message displayed
- `appAccess` event emitted for immediate app access
- Welcome email sent in background
- User enters app in `authenticated-unconfirmed` state

## Error Handling

### Common Errors

| Error Type | Description | Recovery |
|------------|-------------|----------|
| `UserAlreadyExists` | Email already registered | Switch to sign-in mode |
| `WebAuthnNotSupported` | Browser doesn't support WebAuthn | Show alternative auth options |
| `WebAuthnCancelled` | User cancelled passkey creation | Allow retry |
| `InvitationExpired` | Invitation token expired | Show warning, allow registration |
| `EmailMismatch` | Email doesn't match invitation token | Show error, require correction |

### Error Recovery

```svelte
<script>
  function handleError(event) {
    const { error } = event.detail;
    
    switch (error.code) {
      case 'user_already_exists':
        // Show option to switch to sign-in
        showSwitchToSignInOption = true;
        break;
        
      case 'webauthn_not_supported':
        // Show alternative authentication options
        showAlternativeAuth = true;
        break;
        
      case 'webauthn_cancelled':
        // Allow user to retry
        showRetryButton = true;
        break;
        
      default:
        // Show generic error message
        showGenericError = true;
    }
  }
</script>

<AccountCreationForm 
  {config}
  on:error={handleError}
/>
```

## Styling

### CSS Custom Properties

```css
:root {
  --registration-form-background: #ffffff;
  --registration-form-border: #e5e7eb;
  --registration-form-border-radius: 12px;
  --registration-form-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
  
  --registration-button-background: #0066cc;
  --registration-button-hover: #0052a3;
  --registration-button-text: #ffffff;
  
  --registration-error-color: #ef4444;
  --registration-success-color: #10b981;
  --registration-text-color: #111827;
  --registration-text-muted: #6b7280;
}
```

### Custom Styling

```svelte
<AccountCreationForm 
  {config}
  className="custom-registration-form"
/>

<style>
  :global(.custom-registration-form) {
    --registration-form-background: #f9fafb;
    --registration-button-background: #7c3aed;
    --registration-button-hover: #6d28d9;
  }
  
  :global(.custom-registration-form .step-title) {
    color: #1f2937;
    font-weight: 600;
  }
</style>
```

## Best Practices

### 1. Handle All Events
Always handle the `appAccess` event to provide immediate app access:

```svelte
<AccountCreationForm 
  {config}
  on:appAccess={handleAppAccess}
  on:error={handleError}
/>
```

### 2. Validate Invitation Tokens
Always validate invitation tokens before passing to the component:

```typescript
function validateInvitationToken(tokenData) {
  if (!tokenData.email) {
    throw new Error('Invalid invitation token: missing email');
  }
  
  if (tokenData.expires && tokenData.expires < new Date()) {
    console.warn('Invitation token expired');
  }
  
  return tokenData;
}
```

### 3. Configure Required Fields
Specify which additional fields are required for your use case:

```svelte
<AccountCreationForm 
  {config}
  additionalFields={['company', 'jobTitle']}
  readOnlyFields={invitationTokenData ? ['email'] : []}
/>
```

### 4. Provide Clear Error Messages
Handle errors gracefully and provide helpful messages:

```svelte
<script>
  let errorMessage = '';
  
  function handleError(event) {
    const { error } = event.detail;
    
    if (error.code === 'webauthn_not_supported') {
      errorMessage = 'Your browser doesn\'t support passkeys. Please use a modern browser.';
    } else if (error.code === 'webauthn_cancelled') {
      errorMessage = 'Passkey creation was cancelled. Please try again.';
    } else {
      errorMessage = error.message || 'Registration failed. Please try again.';
    }
  }
</script>

{#if errorMessage}
  <div class="error-banner">{errorMessage}</div>
{/if}
```

## Integration Examples

### With SvelteKit
```svelte
<!-- routes/register/+page.svelte -->
<script>
  import { AccountCreationForm } from '@thepia/flows-auth';
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  
  const config = {
    apiBaseUrl: 'https://api.thepia.com',
    domain: 'thepia.com',
    enablePasskeys: true
  };
  
  // Extract invitation token from URL
  const invitationToken = $page.url.searchParams.get('token');
  let invitationTokenData = null;
  
  if (invitationToken) {
    // Decode and validate invitation token
    invitationTokenData = decodeInvitationToken(invitationToken);
  }
  
  function handleAppAccess(event) {
    const { user } = event.detail;
    // Redirect to app after successful registration
    goto('/app');
  }
  
  function handleSwitchToSignIn() {
    goto('/signin');
  }
</script>

<AccountCreationForm 
  {config}
  {invitationTokenData}
  additionalFields={['company', 'phone', 'jobTitle']}
  readOnlyFields={invitationTokenData ? ['email'] : []}
  on:appAccess={handleAppAccess}
  on:switchToSignIn={handleSwitchToSignIn}
/>
```

### With Astro
```astro
---
// pages/register.astro
import Layout from '../layouts/Layout.astro';
---

<Layout title="Register">
  <div id="registration-container"></div>
</Layout>

<script>
  import { AccountCreationForm } from '@thepia/flows-auth';
  
  const config = {
    apiBaseUrl: 'https://api.thepia.com',
    domain: 'thepia.com',
    enablePasskeys: true
  };
  
  const registrationForm = new AccountCreationForm({
    target: document.getElementById('registration-container'),
    props: {
      config,
      additionalFields: ['company', 'phone', 'jobTitle']
    }
  });
  
  registrationForm.$on('appAccess', (event) => {
    const { user } = event.detail;
    window.location.href = '/app';
  });
  
  registrationForm.$on('switchToSignIn', () => {
    window.location.href = '/signin';
  });
</script>
```

## Migration Guide

### From Custom Registration Form

If you're migrating from a custom registration form:

1. **Replace form HTML** with `<AccountCreationForm>` component
2. **Map existing fields** to component props
3. **Handle events** instead of form submissions
4. **Update styling** to use CSS custom properties
5. **Test invitation token** integration thoroughly

### From flows-auth v1

If you're upgrading from an older version:

1. **Update imports** to use new component name
2. **Add new props** for business fields and invitation tokens
3. **Update event handlers** to use new event names
4. **Test compatibility** with existing auth configuration

## Troubleshooting

### Common Issues

**Registration not completing**
- Ensure `appAccess` event is handled
- Check WebAuthn support in browser
- Verify API configuration is correct

**Fields not prefilling**
- Validate invitation token data format
- Check field names match expected values
- Ensure invitation token is not expired

**Styling issues**
- Use CSS custom properties for theming
- Check CSS specificity for custom styles
- Verify component is properly imported

**WebAuthn errors**
- Ensure HTTPS is enabled in development
- Check browser WebAuthn support
- Verify platform authenticator availability