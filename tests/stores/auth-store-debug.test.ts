/**
 * Debug test for auth store issues in Svelte 5 migration
 * This test will help us understand what's happening with the auth store
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { get } from 'svelte/store';

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

describe('Auth Store Debug Tests', () => {
  let createAuthStore;
  let authConfig;

  beforeEach(async () => {
    // Clear all mocks
    vi.clearAllMocks();
    
    // Import fresh modules
    const authStoreModule = await import('../../src/stores/auth-store');
    createAuthStore = authStoreModule.createAuthStore;
    
    // Standard test config
    authConfig = {
      apiBaseUrl: 'https://api.test.com',
      domain: 'test.auth0.com',
      clientId: 'test-client-id',
      appCode: 'debug-test',
      enablePasskeys: true,
      enableMagicLinks: false,
      signInMode: 'login-or-register',
      language: 'en',
      applicationContext: {
        companyName: 'Debug Test'
      }
    };
  });

  it('should create auth store without hanging', async () => {
    console.log('🧪 Test: Creating auth store...');
    
    // This should not hang
    const authStore = createAuthStore(authConfig);
    
    console.log('✅ Auth store created successfully');
    console.log('📊 Auth store type:', typeof authStore);
    console.log('📊 Auth store methods:', Object.keys(authStore));
    
    expect(authStore).toBeDefined();
    expect(typeof authStore.subscribe).toBe('function');
    expect(typeof authStore.initialize).toBe('function');
  });

  it('should have correct initial state', async () => {
    console.log('🧪 Test: Checking initial state...');
    
    const authStore = createAuthStore(authConfig);
    
    // Get initial state
    const initialState = get(authStore);
    
    console.log('📊 Initial state:', initialState);
    console.log('📊 Initial state type:', typeof initialState);
    console.log('📊 Initial state keys:', Object.keys(initialState || {}));
    
    expect(initialState).toBeDefined();
    expect(initialState.state).toBe('unauthenticated'); // Should be unauthenticated initially
    expect(initialState.user).toBeNull();
    expect(initialState.error).toBeNull();
  });

  it('should handle subscription correctly', async () => {
    console.log('🧪 Test: Testing subscription...');
    
    const authStore = createAuthStore(authConfig);
    
    let subscriptionCallCount = 0;
    let lastState = null;
    
    const unsubscribe = authStore.subscribe((state) => {
      subscriptionCallCount++;
      lastState = state;
      console.log(`📊 Subscription call #${subscriptionCallCount}:`, state?.state || 'undefined');
    });
    
    // Wait a bit to see if subscription fires
    await new Promise(resolve => setTimeout(resolve, 10));
    
    console.log('📊 Total subscription calls:', subscriptionCallCount);
    console.log('📊 Last state:', lastState);
    
    expect(subscriptionCallCount).toBeGreaterThan(0);
    expect(lastState).toBeDefined();
    
    unsubscribe();
  });

  it('should handle initialize method', async () => {
    console.log('🧪 Test: Testing initialize method...');
    
    const authStore = createAuthStore(authConfig);
    
    // Get state before initialize
    const stateBefore = get(authStore);
    console.log('📊 State before initialize:', stateBefore.state);
    
    // Call initialize
    await authStore.initialize();
    
    // Get state after initialize
    const stateAfter = get(authStore);
    console.log('📊 State after initialize:', stateAfter.state);
    
    expect(stateAfter).toBeDefined();
  });

  it('should handle context pattern like demo app', async () => {
    console.log('🧪 Test: Testing context pattern...');
    
    // Simulate the demo app pattern
    const authStore = createAuthStore(authConfig);
    
    // Simulate context usage
    let contextState = null;
    let subscriptionCount = 0;
    
    const unsubscribe = authStore.subscribe((state) => {
      subscriptionCount++;
      contextState = state;
      console.log(`📊 Context subscription #${subscriptionCount}:`, state?.state || 'undefined');
    });
    
    // Wait for initial subscription
    await new Promise(resolve => setTimeout(resolve, 10));
    
    // Initialize like demo app does
    await authStore.initialize();
    
    // Wait for any state changes
    await new Promise(resolve => setTimeout(resolve, 10));
    
    const currentState = get(authStore);
    
    console.log('📊 Context state:', contextState);
    console.log('📊 Current state:', currentState);
    console.log('📊 Subscription count:', subscriptionCount);
    
    expect(currentState).toBeDefined();
    expect(currentState.state).toBe('unauthenticated');
  });

  it('should handle errors gracefully', async () => {
    console.log('🧪 Test: Testing error handling...');
    
    // Test with invalid config to see if it throws
    const invalidConfig = {
      // Missing required fields
      apiBaseUrl: 'https://api.test.com'
      // Missing other required fields
    };
    
    try {
      const authStore = createAuthStore(invalidConfig as any);
      const state = get(authStore);
      
      console.log('📊 Auth store created with invalid config');
      console.log('📊 State with invalid config:', state);
      
      // Should not throw, but might have error state
      expect(authStore).toBeDefined();
    } catch (error) {
      console.log('📊 Error caught:', error.message);
      // If it throws, that's also acceptable behavior
      expect(error).toBeDefined();
    }
  });
});
