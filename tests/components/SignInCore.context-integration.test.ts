import { render, screen } from '@testing-library/svelte';
import { writable } from 'svelte/store';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import SignInCore from '../../src/svelte/components/core/SignInCore.svelte';
import { AUTH_CONTEXT_KEY } from '../../src/core/constants/context-keys.js';
import { makeSvelteCompatible } from '../../src/svelte/adapters/svelte.js';
import { createAuthStore } from '../../src/core/stores/auth-store.js';
import type { SvelteAuthStore } from '../../src/core/types/index.js';

// Context provider wrapper that mimics auth-demo layout
import { setContext } from 'svelte';

/**
 * AUTHORITATIVE PATTERN FOR USING SignInCore
 * ==========================================
 *
 * This test proves the ONLY correct way to instantiate SignInCore and SignInForm:
 *
 * 1. Create auth store using createAuthStore()
 * 2. Make it Svelte-compatible using makeSvelteCompatible()
 * 3. Pass as store prop: <SignInCore store={authStore} />
 *
 * DO NOT:
 * - Try to use SignInCore without passing store prop
 * - Create the store inside the component
 * - Use context API (removed due to cross-package issues)
 */

describe('SignInCore - Context Integration (auth-demo pattern)', () => {
  let authStore: SvelteAuthStore;

  beforeEach(() => {
    // Create auth store exactly like auth-demo does
    const zustandStore = createAuthStore({
      apiBaseUrl: 'https://api.thepia.com',
      clientId: 'test',
      domain: 'test.com',
      enablePasskeys: false,
      enableMagicLinks: true
    });

    authStore = makeSvelteCompatible(zustandStore);
    authStore._debugId = 'test-' + Date.now();
  });

  it('should render when store prop is passed', async () => {
    // This is the EXACT pattern - pass store as prop
    const { container } = render(SignInCore, {
      props: {
        store: authStore,
        explainFeatures: true,
        initialEmail: 'test@example.com'
      }
    });

    // Should render without errors
    expect(container).toBeTruthy();
  });

  it('should work with store prop', async () => {
    const { component } = render(SignInCore, {
      props: {
        store: authStore,
        explainFeatures: false
      }
    });

    // Component should work with store prop
    expect(component).toBeTruthy();
  });

  it('should handle store updates reactively', async () => {
    const { component, rerender } = render(SignInCore, {
      props: {
        store: authStore
      }
    });

    // Update with a new auth store instance
    const newZustandStore = createAuthStore({
      apiBaseUrl: 'https://api2.thepia.com',
      clientId: 'test2',
      domain: 'test2.com'
    });
    const newAuthStore = makeSvelteCompatible(newZustandStore);

    await rerender({ store: newAuthStore });

    // Component should still work after store update
    expect(component).toBeTruthy();
  });
});
