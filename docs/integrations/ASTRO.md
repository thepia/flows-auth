# Astro Integration Guide

Complete guide for using `@thepia/flows-auth` with Astro's islands architecture.

## Table of Contents

- [Quick Start](#quick-start)
- [Core Concepts](#core-concepts)
- [Installation](#installation)
- [Basic Setup](#basic-setup)
- [Creating Islands](#creating-islands)
- [Advanced Patterns](#advanced-patterns)
- [Troubleshooting](#troubleshooting)

## Quick Start

### 1. Install Dependencies

```bash
pnpm add @thepia/flows-auth
pnpm astro add svelte
```

### 2. Create Shared Auth Store

Create a singleton store that all islands will share:

```typescript
// src/lib/auth-store.ts
import { createAstroAuthStore, getAstroApiUrl } from '@thepia/flows-auth/stores/adapters/astro';

export const authStore = createAstroAuthStore({
  apiBaseUrl: getAstroApiUrl(),
  domain: 'your-domain.com',
  enablePasskeys: true,
  enableMagicLinks: false,
  signInMode: 'login-or-register'
});
```

### 3. Create a Svelte Island Component

```svelte
<!-- src/components/SignInIsland.svelte -->
<script lang="ts">
  import { authStore } from '../lib/auth-store';
  import { makeSvelteCompatible } from '@thepia/flows-auth/stores/adapters/svelte';
  
  // Wrap for Svelte reactivity
  const auth = makeSvelteCompatible(authStore);
  
  let email = '';
  
  async function handleCheckUser() {
    await auth.checkUser(email);
  }
</script>

<div class="sign-in">
  <input
    type="email"
    bind:value={email}
    placeholder="you@example.com"
  />
  
  <button on:click={handleCheckUser}>
    Check User
  </button>
  
  {#if $auth.userExists !== null}
    <p>User exists: {$auth.userExists ? 'Yes' : 'No'}</p>
  {/if}
</div>
```

### 4. Use in Astro Page

```astro
---
// src/pages/index.astro
import SignInIsland from '../components/SignInIsland.svelte';
---

<html>
  <body>
    <h1>Authentication Demo</h1>
    <SignInIsland client:load />
  </body>
</html>
```

## Core Concepts

### Singleton Pattern

**Key principle**: All islands must import the **same store instance** to share state.

```typescript
// ✅ CORRECT - Single instance in shared module
// src/lib/auth-store.ts
export const authStore = createAstroAuthStore({...});

// src/components/Island1.svelte
import { authStore } from '../lib/auth-store';

// src/components/Island2.svelte
import { authStore } from '../lib/auth-store'; // Same instance!
```

```typescript
// ❌ WRONG - Each island creates its own instance
// src/components/Island1.svelte
const authStore = createAstroAuthStore({...}); // Isolated instance

// src/components/Island2.svelte
const authStore = createAstroAuthStore({...}); // Different instance!
```

### ES Module Caching

JavaScript's ES module system guarantees:
- Modules are **evaluated only once**
- All imports get the **same instance**
- Works in both dev and production builds

### Client-Only Execution

The auth store only exists in the browser:
- `createAstroAuthStore()` throws error if called during SSR
- Use `client:*` directives to hydrate islands
- No server-side state leakage

## Installation

### Prerequisites

- Astro 5.x or later
- Node.js 18+
- pnpm (recommended)

### Install Flows Auth

```bash
pnpm add @thepia/flows-auth
```

### Add Svelte Integration

```bash
pnpm astro add svelte
```

This configures Astro to support Svelte components as islands.

## Basic Setup

### Project Structure

```
src/
├── lib/
│   └── auth-store.ts          # Singleton store instance
├── components/
│   ├── SignInIsland.svelte    # Authentication island
│   ├── UserStatusIsland.svelte # Status display island
│   └── HeaderIsland.svelte    # Header with auth state
└── pages/
    └── index.astro            # Main page
```

### Environment Variables

Create `.env` file:

```bash
# Optional: Override default API URL
PUBLIC_API_URL=https://api.your-domain.com
```

Access in Astro:

```typescript
import.meta.env.PUBLIC_API_URL
```

### Shared Store Module

**File**: `src/lib/auth-store.ts`

```typescript
import { createAstroAuthStore, getAstroApiUrl } from '@thepia/flows-auth/stores/adapters/astro';

/**
 * Singleton auth store shared across all islands
 * 
 * This is the ONLY instance - all islands import this same instance
 * to ensure state synchronization across the page.
 */
export const authStore = createAstroAuthStore({
  apiBaseUrl: getAstroApiUrl(),
  domain: 'your-domain.com', // Your WebAuthn RP ID
  enablePasskeys: true,
  enableMagicLinks: false,
  signInMode: 'login-or-register'
});
```

**What `createAstroAuthStore()` does**:
1. ✅ Validates browser context (throws if SSR)
2. ✅ Auto-detects dev mode (`import.meta.env.DEV`)
3. ✅ Auto-initializes the store
4. ✅ Returns ready-to-use Zustand store

**What `getAstroApiUrl()` does**:
1. ✅ Reads `import.meta.env.PUBLIC_API_URL`
2. ✅ Falls back to `https://api.thepia.com`
3. ✅ Handles SSR safely (returns fallback)

## Creating Islands

### Basic Island Pattern

```svelte
<!-- src/components/MyIsland.svelte -->
<script lang="ts">
  import { authStore } from '../lib/auth-store';
  import { makeSvelteCompatible } from '@thepia/flows-auth/stores/adapters/svelte';
  
  // Wrap Zustand store for Svelte reactivity
  const auth = makeSvelteCompatible(authStore);
  
  // Now you can use $auth in templates
</script>

<div>
  <p>Email: {$auth.email || 'Not set'}</p>
  <p>State: {$auth.signInState}</p>
</div>
```

### Hydration Strategies

Astro provides different `client:*` directives for when islands hydrate:

#### `client:load` - Immediate Hydration

Best for: Critical UI that needs to be interactive immediately

```astro
<SignInIsland client:load />
```

Hydrates as soon as the page loads.

#### `client:idle` - Deferred Hydration

Best for: Headers, navbars, non-critical UI

```astro
<HeaderIsland client:idle />
```

Hydrates when the browser is idle (uses `requestIdleCallback`).

#### `client:visible` - Lazy Hydration

Best for: Below-the-fold content, status displays

```astro
<UserStatusIsland client:visible />
```

Hydrates when the element scrolls into view (uses `IntersectionObserver`).

### Example: Sign-In Island

```svelte
<!-- src/components/SignInIsland.svelte -->
<script lang="ts">
  import { authStore } from '../lib/auth-store';
  import { makeSvelteCompatible } from '@thepia/flows-auth/stores/adapters/svelte';
  
  const auth = makeSvelteCompatible(authStore);
  
  let email = '';
  let loading = false;
  
  async function handleCheckUser() {
    if (!email.trim()) return;
    
    loading = true;
    try {
      await auth.checkUser(email);
    } catch (error) {
      console.error('User check failed:', error);
    } finally {
      loading = false;
    }
  }
</script>

<div class="sign-in-island">
  <h2>Sign In</h2>
  
  <input
    type="email"
    bind:value={email}
    placeholder="you@example.com"
    disabled={loading}
  />
  
  <button
    on:click={handleCheckUser}
    disabled={!email.trim() || loading}
  >
    {loading ? 'Checking...' : 'Check User'}
  </button>
  
  {#if $auth.userExists !== null}
    <p class="status">
      {$auth.userExists ? '✅ User exists' : '👋 New user'}
    </p>
  {/if}
</div>

<style>
  .sign-in-island {
    padding: 2rem;
    border: 2px solid #4f46e5;
    border-radius: 8px;
  }
  
  input {
    width: 100%;
    padding: 0.5rem;
    margin-bottom: 1rem;
  }
  
  button {
    padding: 0.5rem 1rem;
    background: #4f46e5;
    color: white;
    border: none;
    border-radius: 0.375rem;
    cursor: pointer;
  }
  
  button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
</style>
```

### Example: Status Display Island

```svelte
<!-- src/components/UserStatusIsland.svelte -->
<script lang="ts">
  import { authStore } from '../lib/auth-store';
  import { makeSvelteCompatible } from '@thepia/flows-auth/stores/adapters/svelte';
  
  const auth = makeSvelteCompatible(authStore);
  
  // This island automatically updates when SignInIsland changes the store!
</script>

<div class="status-island">
  <h2>User Status</h2>
  
  <dl>
    <dt>Email:</dt>
    <dd>{$auth.email || '(not set)'}</dd>
    
    <dt>User Exists:</dt>
    <dd>
      {#if $auth.userExists === null}
        Unknown
      {:else if $auth.userExists}
        Yes
      {:else}
        No
      {/if}
    </dd>
    
    <dt>State:</dt>
    <dd>{$auth.signInState}</dd>
  </dl>
</div>
```

## Advanced Patterns

### Multiple Islands Sharing State

```astro
---
// src/pages/index.astro
import HeaderIsland from '../components/HeaderIsland.svelte';
import SignInIsland from '../components/SignInIsland.svelte';
import StatusIsland from '../components/StatusIsland.svelte';
---

<html>
  <body>
    <!-- Header hydrates when idle -->
    <HeaderIsland client:idle />
    
    <main>
      <!-- Sign-in form hydrates immediately -->
      <SignInIsland client:load />
      
      <!-- Status display hydrates when visible -->
      <StatusIsland client:visible />
    </main>
  </body>
</html>
```

All three islands share the same `authStore` instance and stay synchronized!

### Custom API URL Detection

```typescript
// src/lib/auth-store.ts
import { createAstroAuthStore } from '@thepia/flows-auth/stores/adapters/astro';

function getApiUrl(): string {
  if (typeof window === 'undefined') {
    return 'https://api.thepia.com';
  }
  
  // Custom logic: check local server first
  const isLocal = window.location.hostname === 'localhost';
  if (isLocal) {
    return 'https://dev.thepia.com:8443';
  }
  
  return import.meta.env.PUBLIC_API_URL || 'https://api.thepia.com';
}

export const authStore = createAstroAuthStore({
  apiBaseUrl: getApiUrl(),
  domain: 'thepia.net',
  enablePasskeys: true
});
```

### TypeScript Configuration

Ensure proper types in `tsconfig.json`:

```json
{
  "extends": "astro/tsconfigs/strict",
  "compilerOptions": {
    "types": ["@thepia/flows-auth"]
  }
}
```

## Troubleshooting

### Error: "createAstroAuthStore must be called in browser context"

**Cause**: Trying to create the store during SSR.

**Solution**: Ensure the store module is only imported by Svelte islands (which run client-side):

```typescript
// ❌ WRONG - Imported in .astro file
---
import { authStore } from '../lib/auth-store'; // Runs during SSR!
---

// ✅ CORRECT - Only imported in .svelte islands
<!-- SignInIsland.svelte -->
<script>
  import { authStore } from '../lib/auth-store'; // Runs client-side only
</script>
```

### Islands Not Sharing State

**Cause**: Each island is creating its own store instance.

**Solution**: Ensure all islands import from the same shared module:

```typescript
// ✅ All islands import from here
// src/lib/auth-store.ts
export const authStore = createAstroAuthStore({...});
```

### WebSocket HMR Errors in Dev

**Cause**: Vite HMR trying to connect on wrong port/protocol.

**Solution**: Configure HMR in `astro.config.mjs`:

```javascript
export default defineConfig({
  vite: {
    server: {
      hmr: {
        protocol: 'wss',
        host: 'localhost',
        port: 24678
      }
    }
  }
});
```

### Build Errors with Zustand

**Cause**: Zustand not properly externalized.

**Solution**: Add to `astro.config.mjs`:

```javascript
export default defineConfig({
  vite: {
    optimizeDeps: {
      include: ['zustand', 'zustand/vanilla']
    }
  }
});
```

## Styling with Tailwind CSS

This library uses Tailwind CSS for component styling. **Consuming applications must configure Tailwind to scan the library's source files.**

### Quick Tailwind Setup

```css
/* src/styles/app.css */
@import "tailwindcss";
@import "@thepia/branding/tailwind/variables";
@import "@thepia/branding/css/components";

/* CRITICAL: Tell Tailwind to scan library source files */
@source "../../node_modules/@thepia/flows-auth/src/**/*.svelte";
```

**Important**: The `@source` directive is required for Tailwind v4 in Astro. Without it, library components will have no styling.

For complete Tailwind integration details, see [Tailwind Integration Guide](../development/tailwind-integration.md).

## Next Steps

- See [examples/astro-demo](../../examples/astro-demo) for complete working example
- Read [Tailwind Integration Guide](../development/tailwind-integration.md) for styling setup
- Read [WebAuthn Guide](../WEBAUTHN.md) for passkey implementation
- Check [API Documentation](../API.md) for full store API reference

## Resources

- [Astro Islands Documentation](https://docs.astro.build/en/concepts/islands/)
- [Astro Svelte Integration](https://docs.astro.build/en/guides/integrations-guide/svelte/)
- [Tailwind CSS v4 Documentation](https://tailwindcss.com/docs)
- [Flows Auth GitHub](https://github.com/thepia/flows-auth)

