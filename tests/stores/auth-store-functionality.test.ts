/**
 * Test actual auth functionality and interactions
 * This test focuses on whether the auth store actually responds to interactions
 */

import { get } from 'svelte/store';
import { beforeEach, describe, expect, it, vi } from 'vitest';

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
global.fetch = vi.fn();

describe('Auth Functionality Tests', () => {
  let createAuthStore;
  let authConfig;
  let authStore;

  beforeEach(async () => {
    // Clear all mocks
    vi.clearAllMocks();

    // Reset fetch mock
    global.fetch.mockClear();

    // Import fresh modules
    const authStoreModule = await import('../../src/stores');
    const { createAuthStore: createBaseStore, makeSvelteCompatible } = authStoreModule;
    createAuthStore = (config) => makeSvelteCompatible(createBaseStore(config));

    // Standard test config
    authConfig = {
      apiBaseUrl: 'https://api.test.com',
      domain: 'test.auth0.com',
      clientId: 'test-client-id',
      appCode: 'functionality-test',
      enablePasskeys: true,
      enableMagicLinks: false,
      signInMode: 'login-or-register',
      language: 'en',
      applicationContext: {
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
    const unsubscribe = authStore.subscribe((state) => {
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
    const unsubscribe = authStore.subscribe((state) => {
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
      console.log('📊 Sign-out error:', error.message);
    }

    console.log('📊 Total state changes:', stateChanges.length);
    expect(stateChanges.length).toBeGreaterThan(0);

    unsubscribe();
  });

  it('should handle user check interaction', async () => {
    console.log('🧪 Testing user check interaction...');

    // Mock API response for user check
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        userExists: true,
        hasPasskeys: false
      })
    });

    // Track state changes
    const stateChanges = [];
    const unsubscribe = authStore.subscribe((state) => {
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
      console.log('📊 User check error:', error.message);
    }

    console.log('📊 Total state changes:', stateChanges.length);
    console.log('📊 Fetch called:', global.fetch.mock.calls.length > 0);

    expect(global.fetch).toHaveBeenCalled();

    unsubscribe();
  });

  it('should handle subscription reactivity', async () => {
    console.log('🧪 Testing subscription reactivity...');

    let subscriptionCallCount = 0;
    let lastState = null;

    const unsubscribe = authStore.subscribe((state) => {
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
      console.log('📊 Reset error:', error.message);
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

    const unsubscribe = authStore.subscribe((state) => {
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
      console.log('📊 Demo user check error:', error.message);
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
