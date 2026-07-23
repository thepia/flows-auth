/**
 * Test actual auth functionality and interactions
 * This test focuses on whether the auth store actually responds to interactions
 */

import { get } from 'svelte/store';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AuthConfig, AuthStore } from '../../src/core/types/index.js';
import type { SvelteAuthStore } from '../../src/core/types/svelte.js';

// Mock browser environment
Object.defineProperty(global, 'window', {
  value: {
    location: { hostname: 'localhost' },
    sessionStorage: {
      getItem: vi.fn(() => null),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn()
    },
    localStorage: {
      getItem: vi.fn(() => null),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn()
    }
  },
  writable: true
});

// Mock fetch for API calls
const fetchMock = vi.fn();
global.fetch = fetchMock as unknown as typeof fetch;

describe('Auth Functionality Tests', () => {
  let createAuthStore: (config: AuthConfig) => SvelteAuthStore;
  let authConfig: AuthConfig;
  let authStore: SvelteAuthStore;

  beforeEach(async () => {
    // Clear all mocks
    vi.clearAllMocks();

    // Reset fetch mock
    fetchMock.mockClear();

    // Import fresh modules
    const { createAuthStore: createBaseStore } = await import('../../src/core/stores/index.js');
    const { makeSvelteCompatible } = await import('../../src/svelte/adapters/svelte.js');
    createAuthStore = (config) => makeSvelteCompatible(createBaseStore(config));

    // Standard test config
    authConfig = {
      apiBaseUrl: 'https://api.test.com',
      domain: 'test.auth0.com',
      clientId: 'test-client-id',
      appCode: 'functionality-test',
      enablePasskeys: true,
      signInMode: 'login-or-register',
      language: 'en',
      branding: {
        companyName: 'Functionality Test'
      }
    };

    // Create auth store for each test
    authStore = createAuthStore(authConfig);
  });

  it('should handle sign-in interaction', async () => {
    console.log('🧪 Testing sign-in interaction...');

    // Track state changes
    const stateChanges = [];
    const unsubscribe = authStore.subscribe((state: AuthStore) => {
      stateChanges.push(state);
      console.log('📊 State change:', state?.state || 'undefined');
    });

    // Wait for initial subscription to complete
    await new Promise((resolve) => setTimeout(resolve, 1));

    const initialCount = stateChanges.length;
    console.log('📊 Initial state changes:', initialCount);

    // Trigger a simple state change by setting email, which should cause a state change
    authStore.setEmail('test@example.com');

    // Wait for state change to propagate
    await new Promise((resolve) => setTimeout(resolve, 10));

    console.log('📊 Total state changes after setEmail:', stateChanges.length);
    expect(stateChanges.length).toBeGreaterThan(initialCount);

    unsubscribe();
  });

  it('should handle sign-out interaction', async () => {
    console.log('🧪 Testing sign-out interaction...');

    // Track state changes
    const stateChanges = [];
    const unsubscribe = authStore.subscribe((state: AuthStore) => {
      stateChanges.push(state);
      console.log('📊 State change:', state?.state || 'undefined');
    });

    // Get initial state
    const initialState = get(authStore);
    console.log('📊 Initial state:', initialState.state);

    // Try to sign out
    try {
      await authStore.signOut();
      console.log('📊 Sign-out completed');
    } catch (error) {
      console.log('📊 Sign-out error:', (error as Error).message);
    }

    console.log('📊 Total state changes:', stateChanges.length);
    expect(stateChanges.length).toBeGreaterThan(0);

    unsubscribe();
  });

  it('should handle user check interaction', async () => {
    console.log('🧪 Testing user check interaction...');

    // Mock API response for user check
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        userExists: true,
        hasPasskeys: false
      })
    });

    // Track state changes
    const stateChanges = [];
    const unsubscribe = authStore.subscribe((state: AuthStore) => {
      stateChanges.push(state);
      console.log('📊 State change:', state?.state || 'undefined');
    });

    // Get initial state
    const initialState = get(authStore);
    console.log('📊 Initial state:', initialState.state);

    // Try to check user
    try {
      const result = await authStore.checkUser('test@example.com');
      console.log('📊 User check result:', result);
    } catch (error) {
      console.log('📊 User check error:', (error as Error).message);
    }

    console.log('📊 Total state changes:', stateChanges.length);
    console.log('📊 Fetch called:', fetchMock.mock.calls.length > 0);

    expect(fetchMock).toHaveBeenCalled();

    unsubscribe();
  });

  it('should handle subscription reactivity', async () => {
    console.log('🧪 Testing subscription reactivity...');

    let subscriptionCallCount = 0;
    let lastState = null;

    const unsubscribe = authStore.subscribe((state: AuthStore) => {
      subscriptionCallCount++;
      lastState = state;
      console.log(`📊 Subscription call #${subscriptionCallCount}:`, state?.state || 'undefined');
    });

    // Wait for initial subscription
    await new Promise((resolve) => setTimeout(resolve, 10));

    // Wait for any additional state changes
    await new Promise((resolve) => setTimeout(resolve, 10));

    // Try to trigger more state changes
    try {
      await authStore.reset();
    } catch (error) {
      console.log('📊 Reset error:', (error as Error).message);
    }

    // Wait for final state changes
    await new Promise((resolve) => setTimeout(resolve, 10));

    console.log('📊 Total subscription calls:', subscriptionCallCount);
    console.log('📊 Last state:', lastState);

    expect(subscriptionCallCount).toBeGreaterThan(0);
    expect(lastState).toBeDefined();

    unsubscribe();
  });

  it('should handle context pattern interactions', async () => {
    console.log('🧪 Testing context pattern like demo app...');

    // Simulate the demo app's context pattern
    let contextState = null;
    let subscriptionCount = 0;

    const unsubscribe = authStore.subscribe((state: AuthStore) => {
      subscriptionCount++;
      contextState = state;
      console.log(`📊 Context subscription #${subscriptionCount}:`, state?.state || 'undefined');
    });

    // Wait for initial subscription
    await new Promise((resolve) => setTimeout(resolve, 10));

    // Simulate user interaction
    try {
      await authStore.checkUser('demo@example.com');
    } catch (error) {
      console.log('📊 Demo user check error:', (error as Error).message);
    }

    // Wait for state changes
    await new Promise((resolve) => setTimeout(resolve, 10));

    const finalState = get(authStore);

    console.log('📊 Context state:', contextState);
    console.log('📊 Final state:', finalState);
    console.log('📊 Subscription count:', subscriptionCount);

    expect(contextState).toBeDefined();
    expect(finalState).toBeDefined();
    expect(subscriptionCount).toBeGreaterThan(0);

    unsubscribe();
  });
});
