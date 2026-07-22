# Global Auth Store Singleton Pattern

> **📋 AUTHORITY**: This document implements the patterns defined in [ADR 0004: Global Svelte Store Architecture](./adr/0004-global-svelte-store-architecture.md). For complete architectural context and framework-specific prescriptions, see the ADR.

## 🚨 Critical Svelte Context Limitations

**IMPORTANT**: `setAuthContext()` uses Svelte's `setContext()` internally, which has **severe limitations**:

- ✅ **MUST be called during component initialization** (in `<script>` block)
- ❌ **CANNOT be called in `onMount()`** - Will throw "Function called outside component initialization"
- ❌ **CANNOT be called in lifecycle hooks** - Context must be set before component mounts
- ❌ **CANNOT be called asynchronously** - Even `.then()` callbacks are too late
- ❌ **CANNOT be used with async imports** - `await import()` moves execution outside initialization

**📖 See [ADR 0004](./adr/0004-global-svelte-store-architecture.md) for complete technical analysis and proven implementation patterns.**

### ⚠️ When Svelte Context Won't Work

If you need **any** of these features, **do NOT use `setAuthContext()`**:
- API server detection (requires async `fetch()`)
- Dynamic imports (`await import()`)
- Configuration from async sources
- Any `async/await` operations before auth setup

**Use `initializeAuth()` and `getGlobalAuthStore()` instead** - they work perfectly with async operations.


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

**IMPORTANT**: `setupAuthContext()` must ONLY be called in your root layout (`+layout.svelte` or `App.svelte`), never in components.

```svelte
<!-- +layout.svelte - Root layout ONLY -->
<script>
  import { setupAuthContext } from '@thepia/flows-auth';

  const authConfig = {
    apiBaseUrl: 'https://api.yourapp.com',
    clientId: 'your-client-id',
    domain: 'yourapp.com',
    enablePasskeys: true
  };

  // ✅ Initialize the auth store ONCE in root layout
  // This makes it available to all child components via context
  const authStore = setupAuthContext(authConfig);
  console.log('🔐 Auth store initialized in context');
</script>

<main>
  <slot />
</main>
```

### 2. Access in Components with `getAuthStoreFromContext()`

```svelte
<!-- Any component in your app -->
<script>
  import { getAuthStoreFromContext } from '@thepia/flows-auth';

  // ✅ Get the auth store from context (DO NOT call setupAuthContext here)
  const authStore = getAuthStoreFromContext();

  // Subscribe to auth state
  $: isAuthenticated = $authStore.state === 'authenticated';
  $: user = $authStore.user;
</script>

{#if isAuthenticated}
  <p>Welcome, {user.email}!</p>
  <button on:click={() => authStore.signOut()}>Sign Out</button>
{:else}
  <button on:click={() => authStore.sendEmailCode('user@example.com')}>
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
  enablePasskeys: true
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

### Utility Functions

#### `isAuthStoreInitialized()`

Check if the global auth store is initialized.

```typescript
import { isAuthStoreInitialized } from '@thepia/flows-auth';

if (isAuthStoreInitialized()) {
  const auth = getGlobalAuthStore();
}
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
<!-- +layout.svelte - Root layout ONLY -->
<script>
  import { setupAuthContext } from '@thepia/flows-auth';

  // SINGLE config object that will be shared by ALL components
  const sharedConfig = {
    apiBaseUrl: 'https://api.thepia.com',
    clientId: 'proof-test',
    domain: 'thepia.net',
    enablePasskeys: false,
    errorReporting: { enabled: true },
    appCode: 'demo',
    branding: {
      companyName: 'Proof Test'
    }
  };

  // ✅ Initialize auth store ONCE in root layout
  const authStore = setupAuthContext(sharedConfig);
</script>

<slot />

<!-- Header.svelte - Component -->
<script>
  import { getAuthStoreFromContext } from '@thepia/flows-auth';

  // ✅ Get auth store from context in component
  const authStore = getAuthStoreFromContext();
  $: user = $authStore.user;
</script>

<!-- Dashboard.svelte - Component -->
<script>
  import { getAuthStoreFromContext } from '@thepia/flows-auth';

  // ✅ Get auth store from context in component
  const authStore = getAuthStoreFromContext();

  async function fetchUserData() {
    const token = authStore.getAccessToken();
    // Make authenticated API calls
  }
</script>
```

### Pattern 2: Component Library

If you're building a component library that uses flows-auth:

```svelte
<!-- AuthButton.svelte - Component -->
<script>
  import { tryGetAuthContext } from '@thepia/flows-auth';

  // ✅ Try to get auth store from context (safe - returns null if not available)
  const authStore = tryGetAuthContext();

  // Component works with or without auth
  $: canAuthenticate = authStore !== null;
  $: isAuthenticated = authStore ? $authStore.state === 'authenticated' : false;
</script>

{#if canAuthenticate}
  {#if isAuthenticated}
    <button on:click={() => authStore.signOut()}>Sign Out</button>
  {:else}
    <button on:click={() => authStore.signInWithPasskey()}>Sign In</button>
  {/if}
{:else}
  <p>Authentication not available</p>
{/if}
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
<!-- +layout.svelte - Root layout ONLY -->
<script>
  import { setupAuthContext } from '@thepia/flows-auth';

  // ✅ Initialize ONCE in root layout
  const authStore = setupAuthContext(config);
</script>

<slot />

<!-- Component A -->
<script>
  import { getAuthStoreFromContext } from '@thepia/flows-auth';
  const authStore = getAuthStoreFromContext(); // Gets singleton instance
</script>

<!-- Component B -->
<script>
  import { getAuthStoreFromContext } from '@thepia/flows-auth';
  const authStore = getAuthStoreFromContext(); // Gets same singleton instance ✅
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
<!-- App.svelte - Root layout ONLY -->
<script>
  import { setupAuthContext } from '@thepia/flows-auth';

  // ✅ Initialize ONCE in root layout
  const authStore = setupAuthContext(config);
</script>

<Header />
<Dashboard />

<!-- UserProfile.svelte (deep in component tree) -->
<script>
  import { getAuthStoreFromContext } from '@thepia/flows-auth';
  const authStore = getAuthStoreFromContext(); // Direct access ✅
</script>
```

## Best Practices

### ✅ Do's

1. **Initialize once** in your root layout (`+layout.svelte` or `App.svelte`) using `setupAuthContext()`
2. **Access in components** using `getAuthStoreFromContext()` or `tryGetAuthContext()`
3. **Pass store as prop** to library components when explicit control is needed
4. **Use TypeScript** for better error catching

### ❌ Don'ts

1. **🚨 NEVER call `setupAuthContext()` in components** - Only in root layout
2. **Don't call `createAuthStore()`** directly in components - use context
3. **Don't pass auth store through props** unless explicitly needed (library components handle context)
4. **Don't initialize auth in multiple places** - only once in root layout
5. **Don't call `resetGlobalAuthStore()`** in production code

### Error Handling



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
});
```

## TypeScript Support

The singleton pattern includes full TypeScript support:

```typescript
import type { SvelteAuthStore, AuthConfig } from '@thepia/flows-auth';

function setupAuth(config: AuthConfig): SvelteAuthStore {
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