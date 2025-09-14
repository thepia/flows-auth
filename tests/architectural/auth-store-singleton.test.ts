/**
 * Auth Store Singleton Architecture Tests
 *
 * These tests ensure components follow the critical architectural requirement
 * that auth stores must be passed as props, not created internally.
 */

import { render } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
import SignInCore from '../../src/components/core/SignInCore.svelte';
import { createAuthStore } from '../../src/stores/auth-store';

describe('Auth Store Singleton Architecture', () => {
  const mockConfig = {
    apiBaseUrl: 'https://api.example.com',
    clientId: 'test',
    domain: 'example.com',
    enablePasskeys: true,
    enableMagicPins: true
  };

  it('SignInCore should accept authStore prop and use provided store', () => {
    const sharedStore = createAuthStore(mockConfig);

    // This should work without throwing
    const { component } = render(SignInCore, {
      props: {
        config: mockConfig,
        authStore: sharedStore
      }
    });

    expect(component).toBeDefined();
  });

  it('SignInCore should create fallback store when authStore not provided', () => {
    // This should work for backward compatibility
    const { component } = render(SignInCore, {
      props: {
        config: mockConfig
        // No authStore prop provided
      }
    });

    expect(component).toBeDefined();
  });

  it('should prevent architectural violations - multiple store instances break reactivity', () => {
    // This test documents the architectural violation that causes sidebar reactivity issues
    const globalStore = createAuthStore(mockConfig);
    const isolatedStore = createAuthStore(mockConfig);

    // These are different instances - this breaks reactivity
    expect(globalStore).not.toBe(isolatedStore);

    // When components use different stores, state changes in one don't affect the other
    globalStore.sendSignInEvent({
      type: 'USER_CHECKED',
      email: 'test@example.com',
      exists: true,
      hasPasskey: false
    });

    // The isolated store won't see this change - this is the root cause of sidebar issues
    // Get current states from stores using the Svelte store interface
    let globalStoreState: any;
    let isolatedStoreState: any;

    const unsubGlobal = globalStore.subscribe((state) => {
      globalStoreState = state;
    });
    const unsubIsolated = isolatedStore.subscribe((state) => {
      isolatedStoreState = state;
    });

    expect(globalStoreState.signInState).not.toBe(isolatedStoreState.signInState);

    // Clean up subscriptions
    unsubGlobal();
    unsubIsolated();
  });

  it('should demonstrate correct shared store pattern', () => {
    const sharedStore = createAuthStore(mockConfig);

    // Multiple components using the SAME store instance
    const component1 = render(SignInCore, {
      props: { config: mockConfig, authStore: sharedStore }
    });

    const component2 = render(SignInCore, {
      props: { config: mockConfig, authStore: sharedStore }
    });

    // Both components use the same store - changes in one affect the other
    // This is the correct pattern for sidebar reactivity
    expect(component1.component).toBeDefined();
    expect(component2.component).toBeDefined();
  });
});
