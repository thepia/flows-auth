# Global Auth Store Singleton Pattern

## 🚨 Critical Svelte Context Limitations

**IMPORTANT**: `setAuthContext()` uses Svelte's `setContext()` internally, which has **severe limitations**:

- ✅ **MUST be called during component initialization** (in `<script>` block)
- ❌ **CANNOT be called in `onMount()`** - Will throw "Function called outside component initialization"
- ❌ **CANNOT be called in lifecycle hooks** - Context must be set before component mounts
- ❌ **CANNOT be called asynchronously** - Even `.then()` callbacks are too late
- ❌ **CANNOT be used with async imports** - `await import()` moves execution outside initialization

### ⚠️ When Svelte Context Won't Work

If you need **any** of these features, **do NOT use `setAuthContext()`**:
- API server detection (requires async `fetch()`)
- Dynamic imports (`await import()`)
- Configuration from async sources
- Any `async/await` operations before auth setup

**Use `initializeAuth()` and `getGlobalAuthStore()` instead** - they work perfectly with async operations.

**✅ Correct Pattern for Async Operations:**
```svelte
<!-- +layout.svelte -->
<script>
  import { browser } from '$app/environment';
  
  // Use global store for async operations
  if (browser) {
    (async () => {
      const { initializeAuth, quickAuthSetup } = await import('@thepia/flows-auth');
      
      const authConfig = await quickAuthSetup({
        companyName: 'Your App',
        clientId: 'your-client-id',
        enableErrorReporting: true,
      });
      
      // ✅ This works with async operations
      const authStore = initializeAuth(authConfig);
    })();
  }
</script>
```

**✅ Correct Pattern for Sync Operations Only:**
```svelte
<!-- +layout.svelte - only if you have synchronous config -->
<script>
  import { browser } from '$app/environment';
  import { setAuthContext } from '@thepia/flows-auth';
  
  if (browser) {
    // ✅ This only works with synchronous config
    const authStore = setAuthContext(predefinedConfig);
  }
</script>
```

**❌ Incorrect Patterns:**
```svelte
<script>
  import { onMount } from 'svelte';
  import { setAuthContext } from '@thepia/flows-auth';
  
  // ❌ WRONG: onMount is too late for setContext
  onMount(() => {
    setAuthContext(config); // Will fail!
  });
  
  // ❌ WRONG: async operations break setContext timing
  if (browser) {
    (async () => {
      const config = await getAsyncConfig();
      setAuthContext(config); // Will fail!
    })();
  }
</script>
```

## Overview

The flows-auth library provides a **singleton auth store pattern** that ensures only one auth store instance exists per application. This prevents common issues like:

- ❌ Multiple auth stores with inconsistent state
- ❌ Duplicate API calls from different components  
- ❌ Memory leaks from multiple store subscriptions
- ❌ Race conditions between auth instances
- ❌ Prop drilling auth state through component trees

## Quick Start

### 1. Initialize Once in Root Layout

```svelte
<!-- +layout.svelte -->
<script>
  import { browser } from '$app/environment';
  import { setAuthContext } from '@thepia/flows-auth';
  
  // ✅ CRITICAL: setAuthContext must be called during component initialization, NOT in onMount
  // setContext() only works during component initialization in Svelte
  if (browser) {
    (async () => {
      const authConfig = {
        apiBaseUrl: 'https://api.yourapp.com',
        clientId: 'your-client-id',
        domain: 'yourapp.com',
        enablePasskeys: true,
        enableMagicPins: true
      };
      
      // Initialize the global singleton auth store
      const authStore = setAuthContext(authConfig);
      console.log('🔐 Global auth store initialized');
    })();
  }
</script>

<main>
  <slot />
</main>
```

### 2. Use Anywhere with `useAuth()`

```svelte
<!-- Any component in your app -->
<script>
  import { useAuth } from '@thepia/flows-auth';
  
  // Get the global auth store - no creation, no prop drilling!
  const auth = useAuth();
  
  // Subscribe to auth state
  $: authState = $auth;
  $: isAuthenticated = authState.state === 'authenticated';
  $: user = authState.user;
</script>

{#if isAuthenticated}
  <p>Welcome, {user.email}!</p>
  <button on:click={() => auth.signOut()}>Sign Out</button>
{:else}
  <button on:click={() => auth.signInWithMagicLink('user@example.com')}>
    Sign In
  </button>
{/if}
```

## API Reference

### Core Functions

#### `initializeAuth(config: AuthConfig)`

Initializes the global auth store singleton. Call this **once** at app startup.

```typescript
import { initializeAuth } from '@thepia/flows-auth';

const authStore = initializeAuth({
  apiBaseUrl: 'https://api.yourapp.com',
  clientId: 'your-client-id',
  domain: 'yourapp.com',
  enablePasskeys: true,
  enableMagicPins: true
});
```

**Throws:** Error if called multiple times with different configs

#### `getGlobalAuthStore()`

Gets the global auth store instance.

```typescript
import { getGlobalAuthStore } from '@thepia/flows-auth';

const authStore = getGlobalAuthStore();
```

**Throws:** Error if auth store not initialized

#### `setAuthContext(config: AuthConfig)`

Svelte-specific function that initializes auth store and sets it in component context.

```typescript
import { setAuthContext } from '@thepia/flows-auth';

const authStore = setAuthContext(config);
```

#### `useAuth()`

Hook-like function to get auth store from context or global state.

```typescript
import { useAuth } from '@thepia/flows-auth';

const auth = useAuth();
```

**Throws:** Error if auth store not available

#### `useAuthSafe()`

Safe version that returns `null` instead of throwing.

```typescript
import { useAuthSafe } from '@thepia/flows-auth';

const auth = useAuthSafe(); // auth could be null
if (auth) {
  // Use auth store
}
```

### Utility Functions

#### `isAuthStoreInitialized()`

Check if the global auth store is initialized.

```typescript
import { isAuthStoreInitialized } from '@thepia/flows-auth';

if (isAuthStoreInitialized()) {
  const auth = getGlobalAuthStore();
}
```

#### `getGlobalAuthConfig()`

Get the current auth configuration.

```typescript
import { getGlobalAuthConfig } from '@thepia/flows-auth';

const config = getGlobalAuthConfig();
console.log('API Base URL:', config.apiBaseUrl);
```

#### `resetGlobalAuthStore()`

Reset the global auth store (primarily for testing).

```typescript
import { resetGlobalAuthStore } from '@thepia/flows-auth';

// ⚠️ WARNING: Only use in tests or complete app reinitialization
resetGlobalAuthStore();
```

## Usage Patterns

### Pattern 1: Standard Web App

```svelte
<!-- +layout.svelte -->
<script>
  import { setAuthContext } from '@thepia/flows-auth';
  
  onMount(async () => {
    const authStore = setAuthContext(authConfig);
  });
</script>

<!-- Header.svelte -->
<script>
  import { useAuth } from '@thepia/flows-auth';
  
  const auth = useAuth();
  $: user = $auth.user;
</script>

<!-- Dashboard.svelte -->
<script>
  import { useAuth } from '@thepia/flows-auth';
  
  const auth = useAuth();
  
  async function fetchUserData() {
    const token = auth.getAccessToken();
    // Make authenticated API calls
  }
</script>
```

### Pattern 2: Component Library

If you're building a component library that uses flows-auth:

```svelte
<!-- AuthButton.svelte -->
<script>
  import { useAuthSafe } from '@thepia/flows-auth';
  
  const auth = useAuthSafe();
  
  // Component works with or without auth
  $: canAuthenticate = auth !== null;
  $: isAuthenticated = auth ? $auth.state === 'authenticated' : false;
</script>

{#if canAuthenticate}
  {#if isAuthenticated}
    <button on:click={() => auth.signOut()}>Sign Out</button>
  {:else}
    <button on:click={() => auth.signInWithPasskey()}>Sign In</button>
  {/if}
{:else}
  <p>Authentication not available</p>
{/if}
```

### Pattern 3: Conditional Initialization

For components that might load before auth is initialized:

```svelte
<script>
  import { getOrInitializeAuth } from '@thepia/flows-auth';
  
  const fallbackConfig = {
    apiBaseUrl: 'https://api.yourapp.com',
    clientId: 'your-client-id',
    domain: 'yourapp.com',
    enablePasskeys: true,
    enableMagicPins: true
  };
  
  const auth = getOrInitializeAuth(fallbackConfig);
</script>
```

## Migration Guide

### From Multiple Auth Stores

**❌ Old Pattern (Multiple Stores):**
```svelte
<!-- Component A -->
<script>
  import { createAuthStore } from '@thepia/flows-auth';
  const auth = createAuthStore(config); // Creates instance #1
</script>

<!-- Component B -->  
<script>
  import { createAuthStore } from '@thepia/flows-auth';
  const auth = createAuthStore(config); // Creates instance #2 😞
</script>
```

**✅ New Pattern (Singleton):**
```svelte
<!-- +layout.svelte -->
<script>
  import { browser } from '$app/environment';
  import { setAuthContext } from '@thepia/flows-auth';
  
  // ✅ Initialize during component initialization with browser guard
  if (browser) {
    (async () => {
      setAuthContext(config); // Initialize once
    })();
  }
</script>

<!-- Component A -->
<script>
  import { useAuth } from '@thepia/flows-auth';
  const auth = useAuth(); // Gets singleton instance
</script>

<!-- Component B -->
<script>
  import { useAuth } from '@thepia/flows-auth';
  const auth = useAuth(); // Gets same singleton instance ✅
</script>
```

### From Prop Drilling

**❌ Old Pattern (Prop Drilling):**
```svelte
<!-- App.svelte -->
<script>
  const auth = createAuthStore(config);
</script>
<Header {auth} />
<Dashboard {auth} />

<!-- Header.svelte -->
<script>
  export let auth;
</script>
<UserProfile {auth} />

<!-- UserProfile.svelte -->
<script>
  export let auth; // 😞 Props all the way down
</script>
```

**✅ New Pattern (Context):**
```svelte
<!-- App.svelte -->
<script>
  import { browser } from '$app/environment';
  import { setAuthContext } from '@thepia/flows-auth';
  
  // ✅ Set during component initialization with browser guard
  if (browser) {
    (async () => {
      setAuthContext(config); // Set once
    })();
  }
</script>
<Header />
<Dashboard />

<!-- UserProfile.svelte (deep in component tree) -->
<script>
  import { useAuth } from '@thepia/flows-auth';
  const auth = useAuth(); // Direct access ✅
</script>
```

## Best Practices

### ✅ Do's

1. **Initialize once** in your root layout component
2. **Use `useAuth()`** in components that need auth
3. **Use `useAuthSafe()`** in optional auth components
4. **Call `setAuthContext()`** in SvelteKit layouts for proper context
5. **Use TypeScript** for better error catching

### ❌ Don'ts

1. **Don't call `createAuthStore()`** in multiple components
2. **Don't pass auth store through props** (use context instead)
3. **Don't initialize auth in multiple places**
4. **Don't forget to handle auth not being initialized**
5. **Don't call `resetGlobalAuthStore()`** in production
6. **🚨 NEVER call `setAuthContext()` inside `onMount()`** - This violates Svelte context rules

### Error Handling

```svelte
<script>
  import { useAuthSafe } from '@thepia/flows-auth';
  
  const auth = useAuthSafe();
  
  // Handle auth not being available
  if (!auth) {
    console.warn('Auth store not initialized');
    // Show fallback UI or redirect to setup
  }
</script>
```

### Testing

```typescript
import { resetGlobalAuthStore, initializeAuth } from '@thepia/flows-auth';

beforeEach(() => {
  // Reset auth store between tests
  resetGlobalAuthStore();
});

test('component with auth', () => {
  // Initialize auth for test
  initializeAuth(mockConfig);
  
  // Test component that uses useAuth()
});
```

## TypeScript Support

The singleton pattern includes full TypeScript support:

```typescript
import type { GlobalAuthStore, AuthConfig } from '@thepia/flows-auth';

function setupAuth(config: AuthConfig): GlobalAuthStore {
  return initializeAuth(config);
}
```

## Performance Benefits

The singleton pattern provides significant performance improvements:

- **Reduced Memory Usage**: Single auth store instance instead of multiple
- **Fewer API Calls**: No duplicate authentication requests
- **Better Caching**: Single cache instance shared across all components
- **Consistent State**: All components see the same auth state simultaneously

## Security Considerations

The singleton pattern maintains the same security standards as individual stores:

- ✅ No auth state stored in global variables
- ✅ Proper cleanup on sign out
- ✅ Token management remains secure
- ✅ Session validation continues to work

The singleton simply ensures you have **one secure auth store** instead of **multiple secure auth stores**.