# Component Architecture Patterns

## Overview

The flows-auth library implements **two distinct architectural patterns** for authentication components, each optimized for their specific use case.

## 🔑 Sign-In Pattern: Pure AuthStore Integration

### Design Philosophy
Sign-in is a **simple, direct operation**: user provides credentials → authStore handles authentication → parent subscribes to state changes.

### Implementation Pattern
```svelte
<!-- ✅ CORRECT: Use SignInForm component -->
<script>
  import { SignInForm, createAuthStore } from '@thepia/flows-auth';
  
  const authStore = createAuthStore(config);
  
  // Pure authStore subscription - NO events needed
  authStore.subscribe(($auth) => {
    if ($auth.state === 'authenticated') {
      navigateToApp($auth.user);
    }
  });
</script>

<SignInForm config={config} />
```

### Why No Events?
- **Single Responsibility**: SignInForm only handles authentication
- **Direct State Management**: AuthStore is the single source of truth
- **No UI Coordination**: No dialogs to close or complex navigation
- **Predictable Flow**: Email → Authenticate → Done

### Anti-Pattern: Custom Sign-In Forms
```svelte
<!-- ❌ WRONG: Custom sign-in brings no value -->
<script>
  async function handleSignIn() {
    await authStore.signInWithPasskey(email);
  }
</script>

<form on:submit={handleSignIn}>
  <input bind:value={email} />
  <button>Sign In</button>
</form>
```

**Problems with custom sign-in**:
- ❌ Missing conditional authentication
- ❌ Poor error handling
- ❌ No accessibility features
- ❌ Inconsistent UX
- ❌ Reinventing the wheel

## 📝 Registration Pattern: Rich Event System

### Design Philosophy
Registration is **complex coordination**: form validation → API calls → UI updates → navigation → cleanup.

### Implementation Pattern
```svelte
<!-- ✅ CORRECT: Registration needs event coordination -->
<script>
  import { AccountCreationForm } from '@thepia/flows-auth';
  
  function handleAppAccess(event) {
    const { user, emailVerifiedViaInvitation } = event.detail;
    
    // UI Coordination
    showAccountCreationForm = false;
    
    // URL Cleanup
    if (invitationToken) cleanInvitationUrl();
    
    // Conditional Navigation
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
  on:error={handleRegistrationError}
/>
```

### Why Events Are Essential
- **UI Coordination**: Close dialogs, update parent state
- **Navigation Logic**: Different flows based on verification status
- **URL Management**: Clean up invitation tokens
- **Error Handling**: Display user-friendly messages
- **Form Switching**: Toggle between registration/sign-in

### Event Types and Purposes

| Event | Purpose | When Emitted |
|-------|---------|--------------|
| `appAccess` | **UI Coordination** - User can enter app | After successful registration + auth confirmation |
| `switchToSignIn` | **Navigation** - Switch to sign-in form | User clicks "Sign in instead" |
| `success` | **User Feedback** - Show success message | Registration API call succeeds |
| `error` | **Error Handling** - Display error message | Registration fails |

## 🔄 Pattern Comparison

| Aspect | Sign-In | Registration |
|--------|---------|-------------|
| **Complexity** | Simple: Email → Auth → Done | Complex: Form → API → UI → Navigation |
| **State Management** | Pure AuthStore subscription | AuthStore + Event coordination |
| **UI Coordination** | None needed | Dialog closing, URL cleanup |
| **Parent Integration** | Subscribe to authStore | Handle multiple events |
| **Custom Implementation** | ❌ Brings no value | ✅ May be needed for complex flows |
| **Event System** | Not needed | Essential for coordination |

## 🚀 Migration Guidelines

### From Custom Sign-In to SignInForm

```diff
- <!-- Custom implementation -->
- <form on:submit={handleSignIn}>
-   <input bind:value={email} />
-   <button disabled={loading}>
-     {loading ? 'Signing in...' : 'Sign In'}
-   </button>
- </form>

+ <!-- Use flows-auth component -->
+ <SignInForm config={config} />
```

### Benefits of Migration
- ✅ **Conditional Authentication**: Auto-signin for returning users
- ✅ **Error Handling**: Proper user feedback and recovery
- ✅ **WebAuthn Best Practices**: Secure passkey implementation
- ✅ **Accessibility**: ARIA compliance and keyboard navigation
- ✅ **Mobile Optimization**: Touch-friendly interfaces
- ✅ **Consistent UX**: Same experience across applications

## 🧪 Testing Implications

### Sign-In Testing
```typescript
// Test authStore integration, not events
test('should authenticate user via authStore', async () => {
  render(SignInForm, { props: { config } });
  
  // Trigger sign-in
  await fireEvent.click(screen.getByText('Sign In'));
  
  // Verify authStore state change
  await waitFor(() => {
    expect(mockAuthStore.state).toBe('authenticated');
  });
});
```

### Registration Testing
```typescript
// Test both authStore AND events
test('should emit appAccess event after registration', async () => {
  const appAccessHandler = vi.fn();
  
  render(AccountCreationForm, { 
    props: { config },
    listeners: { appAccess: appAccessHandler }
  });
  
  // Complete registration
  await submitAccountCreationForm();
  
  // Verify event emission
  expect(appAccessHandler).toHaveBeenCalledWith(
    expect.objectContaining({
      detail: { user: expect.any(Object) }
    })
  );
});
```

## 📋 Implementation Checklist

### For Sign-In
- [ ] Use `SignInForm` component (not custom forms)
- [ ] Subscribe to `authStore` state changes
- [ ] Handle authentication state in parent
- [ ] No event listeners needed

### For Registration
- [ ] Use `AccountCreationForm` component
- [ ] Handle `appAccess` event for UI coordination
- [ ] Handle `switchToSignIn` for form navigation
- [ ] Handle `error` events for user feedback
- [ ] Subscribe to `authStore` for state management

## 🔗 Related Documentation

- [Component Overview](./README.md) - Main component documentation
- [AccountCreationForm Specification](../specifications/AccountCreationForm-spec.md) - Detailed registration behavior
- [Authentication Flow](../auth/flow.md) - Overall authentication architecture
- [Testing Strategy](../testing/README.md) - Component testing approaches
