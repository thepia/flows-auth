# Astro Quick Start

Get up and running with `@thepia/flows-auth` in Astro in 5 minutes.

## Installation

```bash
pnpm add @thepia/flows-auth
pnpm astro add svelte
```

## Setup (3 steps)

### 1. Create Shared Store

**File**: `src/lib/auth-store.ts`

```typescript
import { createAstroAuthStore, getAstroApiUrl } from '@thepia/flows-auth/stores/adapters/astro';

export const authStore = createAstroAuthStore({
  apiBaseUrl: getAstroApiUrl(),
  domain: 'your-domain.com',
  enablePasskeys: true,
  enableMagicLinks: false,
  signInMode: 'login-or-register'
});
```

### 2. Create Island Component

**File**: `src/components/SignInIsland.svelte`

```svelte
<script lang="ts">
  import { authStore } from '../lib/auth-store';
  import { makeSvelteCompatible } from '@thepia/flows-auth/stores/adapters/svelte';
  
  const auth = makeSvelteCompatible(authStore);
  
  let email = '';
  
  async function handleCheckUser() {
    await auth.checkUser(email);
  }
</script>

<div>
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

### 3. Add to Page

**File**: `src/pages/index.astro`

```astro
---
import SignInIsland from '../components/SignInIsland.svelte';
---

<html>
  <body>
    <h1>Authentication</h1>
    <SignInIsland client:load />
  </body>
</html>
```

## Done! 🎉

Your Astro app now has authentication with:
- ✅ Shared state across islands
- ✅ WebAuthn/passkey support
- ✅ Auto-initialization
- ✅ Dev mode detection

## Next Steps

- **Full Guide**: [docs/integrations/ASTRO.md](./ASTRO.md)
- **Working Example**: [examples/astro-demo](../../examples/astro-demo)
- **API Reference**: [docs/API.md](../API.md)

## Common Patterns

### Multiple Islands Sharing State

```astro
---
import HeaderIsland from '../components/HeaderIsland.svelte';
import SignInIsland from '../components/SignInIsland.svelte';
import StatusIsland from '../components/StatusIsland.svelte';
---

<HeaderIsland client:idle />
<SignInIsland client:load />
<StatusIsland client:visible />
```

All islands automatically share the same auth state!

### Custom API URL

```typescript
// src/lib/auth-store.ts
import { createAstroAuthStore } from '@thepia/flows-auth/stores/adapters/astro';

export const authStore = createAstroAuthStore({
  apiBaseUrl: 'https://api.your-domain.com', // Custom URL
  domain: 'your-domain.com',
  enablePasskeys: true
});
```

### Environment Variables

Create `.env`:

```bash
PUBLIC_API_URL=https://api.your-domain.com
```

Then use `getAstroApiUrl()`:

```typescript
import { createAstroAuthStore, getAstroApiUrl } from '@thepia/flows-auth/stores/adapters/astro';

export const authStore = createAstroAuthStore({
  apiBaseUrl: getAstroApiUrl(), // Reads PUBLIC_API_URL
  domain: 'your-domain.com',
  enablePasskeys: true
});
```

## Troubleshooting

### "createAstroAuthStore must be called in browser context"

**Fix**: Only import the store in `.svelte` files, not `.astro` files.

```typescript
// ❌ WRONG - .astro file
---
import { authStore } from '../lib/auth-store'; // Runs during SSR!
---

// ✅ CORRECT - .svelte file
<script>
  import { authStore } from '../lib/auth-store'; // Runs client-side
</script>
```

### Islands not sharing state

**Fix**: Ensure all islands import from the same module:

```typescript
// ✅ All islands import from here
import { authStore } from '../lib/auth-store';
```

## Key Concepts

### Singleton Pattern

The auth store is created **once** in `src/lib/auth-store.ts` and all islands import the **same instance**.

```typescript
// src/lib/auth-store.ts - Created ONCE
export const authStore = createAstroAuthStore({...});

// src/components/Island1.svelte - Imports same instance
import { authStore } from '../lib/auth-store';

// src/components/Island2.svelte - Imports same instance
import { authStore } from '../lib/auth-store';
```

### Client-Only Execution

The store only exists in the browser:
- Created when first island hydrates
- Shared across all islands
- No server-side state

### Hydration Strategies

- `client:load` - Hydrate immediately (critical UI)
- `client:idle` - Hydrate when idle (headers, navbars)
- `client:visible` - Hydrate when visible (below-the-fold)

## Support

- **Issues**: [GitHub Issues](https://github.com/thepia/flows-auth/issues)
- **Docs**: [Full Documentation](./ASTRO.md)
- **Example**: [examples/astro-demo](../../examples/astro-demo)

