# Framework Integrations

`@thepia/flows-auth` provides first-class support for multiple frameworks with optimized adapters and helpers.

## Supported Frameworks

### Astro (Islands Architecture) ⭐ NEW

**Status**: ✅ Production Ready  
**Quick Start**: [ASTRO_QUICK_START.md](./ASTRO_QUICK_START.md)  
**Full Guide**: [ASTRO.md](./ASTRO.md)  
**Example**: [examples/astro-demo](../../examples/astro-demo)

```typescript
import { createAstroAuthStore, getAstroApiUrl } from '@thepia/flows-auth/stores/adapters/astro';

export const authStore = createAstroAuthStore({
  apiBaseUrl: getAstroApiUrl(),
  domain: 'your-domain.com',
  enablePasskeys: true
});
```

**Features**:
- ✅ Singleton pattern for shared state across islands
- ✅ Auto-initialization and dev mode detection
- ✅ Environment variable support
- ✅ SSR-safe with browser-only guards
- ✅ Works with all Astro hydration strategies

---

### Pure Svelte

**Status**: ✅ Production Ready
**Pattern**: Context with `setupAuthContext()` / `getGlobalAuthStore()`
**Authority**: [ADR 0004](../adr/0004-global-svelte-store-architecture.md#pure-svelte-applications-non-sveltekit)

```svelte
<!-- App.svelte -->
<script>
  import { setupAuthContext } from '@thepia/flows-auth';

  if (typeof window !== 'undefined') {
    const authStore = setupAuthContext({
      apiBaseUrl: 'https://api.thepia.com',
      domain: 'thepia.net',
      enablePasskeys: true
    });
  }
</script>

<!-- Any component -->
<script>
  import { getAuthStoreFromContext } from '@thepia/flows-auth';
  const store = getAuthStoreFromContext();
</script>
```

**Features**:
- ✅ Clean context-based architecture
- ✅ Automatic timing and lifecycle management
- ✅ `getAuthStoreFromContext()` hook for components
- ✅ SSR-safe with browser guards

### SvelteKit

**Status**: ✅ Production Ready
**Pattern**: Explicit prop passing (recommended) or context
**Authority**: [ADR 0004](../adr/0004-global-svelte-store-architecture.md#sveltekit-applications)

```svelte
<!-- +layout.svelte -->
<script>
  import { createAuthStore } from '@thepia/flows-auth';

  let authStore = null;
  if (browser) {
    authStore = createAuthStore({
      apiBaseUrl: 'https://api.thepia.com',
      domain: 'thepia.net',
      enablePasskeys: true
    });
  }
</script>

{#if authStore}
  <slot {authStore} />
{/if}
```

**Features**:
- ✅ Maximum reliability with explicit props
- ✅ SSR support with browser guards
- ✅ Works with SvelteKit load functions
- ✅ Easy testing with store injection

---

### Vanilla JavaScript

**Status**: ✅ Production Ready  
**Adapter**: `createVanillaAdapter()`

```typescript
import { createAuthStore } from '@thepia/flows-auth';
import { createVanillaAdapter } from '@thepia/flows-auth/stores/adapters';

const authStore = createAuthStore({
  apiBaseUrl: 'https://api.thepia.com',
  domain: 'thepia.net',
  enablePasskeys: true
});

const adapter = createVanillaAdapter(authStore);

// Subscribe to changes
const unsubscribe = adapter.subscribe((state) => {
  console.log('Auth state:', state);
});
```

**Features**:
- ✅ Framework-agnostic
- ✅ Simple subscription API
- ✅ Works in any JavaScript environment
- ✅ No build tools required

---

## Comparison

| Feature | Astro | SvelteKit | Vanilla JS |
|---------|-------|-----------|------------|
| **Reactivity** | Svelte stores | Svelte stores | Manual |
| **SSR Support** | ✅ | ✅ | N/A |
| **Auto-init** | ✅ | Manual | Manual |
| **Env Detection** | ✅ | Manual | Manual |
| **Bundle Size** | Small | Small | Smallest |
| **Setup Complexity** | Easiest | Easy | Medium |

## Installation

All integrations use the same package:

```bash
pnpm add @thepia/flows-auth
```

## Import Paths

### Astro Helpers

```typescript
import { createAstroAuthStore, getAstroApiUrl } from '@thepia/flows-auth/stores/adapters/astro';
```

### Svelte Adapter

```typescript
import { makeSvelteCompatible } from '@thepia/flows-auth/stores/adapters/svelte';
```

### Vanilla Adapter

```typescript
import { createVanillaAdapter } from '@thepia/flows-auth/stores/adapters/vanilla';
```

### All Adapters

```typescript
import {
  createAstroAuthStore,
  getAstroApiUrl,
  createSvelteAdapter,
  createVanillaAdapter
} from '@thepia/flows-auth/stores/adapters';
```

## Tree-Shaking

All adapters are tree-shakeable. Only import what you need:

```typescript
// ✅ Only bundles Astro adapter
import { createAstroAuthStore } from '@thepia/flows-auth/stores/adapters/astro';

// ✅ Only bundles Svelte adapter
import { makeSvelteCompatible } from '@thepia/flows-auth/stores/adapters/svelte';
```

## Common Patterns

### Singleton Store (Astro, SvelteKit)

Create one store instance and export it:

```typescript
// src/lib/auth-store.ts
import { createAstroAuthStore, getAstroApiUrl } from '@thepia/flows-auth/stores/adapters/astro';

export const authStore = createAstroAuthStore({
  apiBaseUrl: getAstroApiUrl(),
  domain: 'your-domain.com',
  enablePasskeys: true
});
```

All components import the same instance:

```typescript
import { authStore } from '../lib/auth-store';
```

### Environment-Based Configuration

```typescript
const getApiUrl = () => {
  if (typeof window === 'undefined') return 'https://api.thepia.com';
  
  // Development
  if (import.meta.env.DEV) {
    return 'https://dev.thepia.com:8443';
  }
  
  // Production
  return import.meta.env.PUBLIC_API_URL || 'https://api.thepia.com';
};

export const authStore = createAstroAuthStore({
  apiBaseUrl: getApiUrl(),
  domain: 'thepia.net',
  enablePasskeys: true
});
```

### SSR-Safe Initialization

```typescript
// Only run in browser
if (typeof window !== 'undefined') {
  authStore.getState().initialize?.();
}
```

**Note**: `createAstroAuthStore()` does this automatically!

## Framework-Specific Guides

- **Astro**: [ASTRO.md](./ASTRO.md) - Complete guide with islands architecture
- **SvelteKit**: Coming soon
- **Vanilla JS**: Coming soon

## Examples

- **Astro Demo**: [examples/astro-demo](../../examples/astro-demo)
- **SvelteKit Demo**: [examples/auth-demo](../../examples/auth-demo)
- **Flows App Demo**: [examples/flows-app-demo](../../examples/flows-app-demo)

## Migration Guides

### From Manual Setup to Astro Adapter

**Before**:
```typescript
import { createAuthStore } from '@thepia/flows-auth';

const getApiBaseUrl = (): string => {
  if (typeof window !== 'undefined') {
    return import.meta.env.PUBLIC_API_URL || 'https://api.thepia.com';
  }
  return 'https://api.thepia.com';
};

export const authStore = createAuthStore({
  apiBaseUrl: getApiBaseUrl(),
  domain: 'thepia.net',
  enablePasskeys: true,
  devtools: import.meta.env.DEV
});

if (typeof window !== 'undefined') {
  authStore.getState().initialize?.();
}
```

**After**:
```typescript
import { createAstroAuthStore, getAstroApiUrl } from '@thepia/flows-auth/stores/adapters/astro';

export const authStore = createAstroAuthStore({
  apiBaseUrl: getAstroApiUrl(),
  domain: 'thepia.net',
  enablePasskeys: true
});
```

**Savings**: 15 lines → 8 lines (47% reduction)

## Support

- **Documentation**: [docs/](../)
- **Issues**: [GitHub Issues](https://github.com/thepia/flows-auth/issues)
- **Examples**: [examples/](../../examples/)

## Contributing

Adding a new framework adapter? See [CONTRIBUTING.md](../../CONTRIBUTING.md) for guidelines.

### Adapter Requirements

1. **Browser-only guard** - Prevent SSR execution
3. **Environment detection** - Auto-detect dev mode
4. **Type safety** - Full TypeScript support
5. **Tree-shakeable** - Separate export path
6. **Documentation** - Quick start + full guide
7. **Example** - Working demo in `examples/`

## Roadmap

- [ ] React adapter (useAuthStore hook)
- [ ] Vue adapter (reactive composition API)
- [ ] Solid.js adapter
- [ ] Next.js integration guide
- [ ] Nuxt integration guide

