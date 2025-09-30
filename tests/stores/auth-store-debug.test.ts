/**
 * Debug test for auth store modular architecture
 * This test helps understand the new Zustand-based modular auth store
 */

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

describe('Auth Store Debug Tests (New Modular Architecture)', () => {
  let createAuthStore;
  let authConfig;

  beforeEach(async () => {
    // Clear all mocks
    vi.clearAllMocks();

    // Import fresh modules - NEW MODULAR ARCHITECTURE
    const authStoreModule = await import('../../src/stores');
    createAuthStore = authStoreModule.createAuthStore;

    // Standard test config
    authConfig = {
      apiBaseUrl: 'https://api.test.com',
      domain: 'test.auth0.com',
      clientId: 'test-client-id',
      appCode: 'debug-test',
      enablePasskeys: true,
      enableMagicLinks: false,
      language: 'en',
      branding: {
        companyName: 'Debug Test'
      }
    };
  });

  it('should create composed auth store without hanging', async () => {
    console.log('🧪 Test: Creating modular auth store...');

    // This should not hang - new architecture
    const composedStore = createAuthStore(authConfig);

    console.log('✅ Composed auth store created successfully');
    console.log('📊 Store structure:', {
      hasCore: !!composedStore.core,
      hasUI: !!composedStore.ui,
      hasPasskey: !!composedStore.passkey,
      hasEmail: !!composedStore.email
    });

    expect(composedStore).toBeDefined();
    expect(composedStore.core).toBeDefined();
    expect(composedStore.ui).toBeDefined();
    expect(typeof composedStore.isAuthenticated).toBe('function');

    // Cleanup
    composedStore.destroy();
  });

  it('should have correct initial state across all stores', async () => {
    console.log('🧪 Test: Checking initial state across modular stores...');

    const composedStore = createAuthStore(authConfig);

    // Get initial state from each store
    const coreState = composedStore.core.getState();
    const uiState = composedStore.ui.getState();
    const passkeyState = composedStore.passkey.getState();
    const emailState = composedStore.email.getState();

    console.log('📊 Core state:', {
      state: coreState.state,
      authenticated: coreState.isAuthenticated(),
      hasUser: !!coreState.user
    });

    console.log('📊 UI state:', {
      signInState: uiState.signInState,
      email: uiState.email,
      userExists: uiState.userExists
    });

    console.log('📊 Passkey state:', {
      isSupported: passkeyState.isSupported,
      isAuthenticating: passkeyState.isAuthenticating
    });

    console.log('📊 Email state:', {
      isSendingCode: emailState.isSendingCode,
      codeSent: emailState.codeSent
    });

    // Verify initial states
    expect(coreState.state).toBe('unauthenticated');
    expect(coreState.user).toBeNull();
    expect(coreState.isAuthenticated()).toBe(false);

    expect(uiState.signInState).toBe('emailEntry');
    expect(uiState.email).toBe('');
    expect(uiState.userExists).toBeNull();

    expect(passkeyState.isAuthenticating).toBe(false);
    expect(emailState.isSendingCode).toBe(false);

    // Cleanup
    composedStore.destroy();
  });

  it('should handle store subscriptions correctly', async () => {
    console.log('🧪 Test: Testing modular store subscriptions...');

    const composedStore = createAuthStore(authConfig);

    let coreSubscriptionCalls = 0;
    let uiSubscriptionCalls = 0;
    let lastCoreState = null;
    let lastUIState = null;

    // Subscribe to individual stores
    const unsubscribeCore = composedStore.core.subscribe((state) => {
      coreSubscriptionCalls++;
      lastCoreState = state;
      console.log(`📊 Core subscription call #${coreSubscriptionCalls}:`, state.state);
    });

    const unsubscribeUI = composedStore.ui.subscribe((state) => {
      uiSubscriptionCalls++;
      lastUIState = state;
      console.log(`📊 UI subscription call #${uiSubscriptionCalls}:`, state.signInState);
    });

    // Trigger state changes to test subscriptions
    console.log('📊 Triggering state changes to test subscriptions...');
    composedStore.ui.getState().setEmail('subscription-test@example.com');
    composedStore.ui.getState().setSignInState('userChecked');

    // Wait a bit for subscriptions to fire
    await new Promise((resolve) => setTimeout(resolve, 10));

    console.log('📊 Core subscription calls:', coreSubscriptionCalls);
    console.log('📊 UI subscription calls:', uiSubscriptionCalls);

    expect(uiSubscriptionCalls).toBeGreaterThan(0);
    expect(lastUIState).toBeDefined();

    // Cleanup
    unsubscribeCore();
    unsubscribeUI();
    composedStore.destroy();
  });

  it('should handle unified API methods', async () => {
    console.log('🧪 Test: Testing unified API methods...');

    const composedStore = createAuthStore(authConfig);

    // Test unified API methods
    console.log('📊 isAuthenticated():', composedStore.isAuthenticated());
    console.log('📊 getAccessToken():', composedStore.getAccessToken());

    expect(typeof composedStore.isAuthenticated).toBe('function');
    expect(typeof composedStore.getAccessToken).toBe('function');
    expect(typeof composedStore.setEmail).toBe('function');
    expect(typeof composedStore.signInWithPasskey).toBe('function');

    expect(composedStore.isAuthenticated()).toBe(false);
    expect(composedStore.getAccessToken()).toBeNull();

    // Test email setting via unified API
    composedStore.setEmail('test@example.com');
    const uiState = composedStore.ui.getState();
    expect(uiState.email).toBe('test@example.com');

    // Cleanup
    composedStore.destroy();
  });

  it('should handle state coordination between stores', async () => {
    console.log('🧪 Test: Testing state coordination...');

    const composedStore = createAuthStore(authConfig);

    // Test state changes across stores
    console.log('📊 Testing UI state change...');
    composedStore.ui.getState().setSignInState('userChecked');
    expect(composedStore.ui.getState().signInState).toBe('userChecked');

    console.log('📊 Testing passkey state change...');
    composedStore.passkey.getState().setAuthenticating(true);
    expect(composedStore.passkey.getState().isAuthenticating).toBe(true);

    // Verify states remain independent
    expect(composedStore.ui.getState().signInState).toBe('userChecked');
    expect(composedStore.passkey.getState().isAuthenticating).toBe(true);
    expect(composedStore.core.getState().state).toBe('unauthenticated'); // Unchanged

    console.log('📊 State coordination working correctly');

    // Cleanup
    composedStore.destroy();
  });

  it('should handle destroy cleanup correctly', async () => {
    console.log('🧪 Test: Testing destroy cleanup...');

    const composedStore = createAuthStore(authConfig);

    // Set some state
    composedStore.ui.getState().setEmail('test@example.com');
    composedStore.ui.getState().setSignInState('userChecked');
    composedStore.passkey.getState().setAuthenticating(true);

    // Verify state is set
    expect(composedStore.ui.getState().email).toBe('test@example.com');
    expect(composedStore.ui.getState().signInState).toBe('userChecked');
    expect(composedStore.passkey.getState().isAuthenticating).toBe(true);

    console.log('📊 State before destroy:', {
      email: composedStore.ui.getState().email,
      signInState: composedStore.ui.getState().signInState,
      isAuthenticating: composedStore.passkey.getState().isAuthenticating
    });

    // Destroy should reset everything
    composedStore.destroy();

    console.log('📊 State after destroy:', {
      email: composedStore.ui.getState().email,
      signInState: composedStore.ui.getState().signInState,
      isAuthenticating: composedStore.passkey.getState().isAuthenticating
    });

    // Verify cleanup
    expect(composedStore.ui.getState().email).toBe('');
    expect(composedStore.ui.getState().signInState).toBe('emailEntry');
    expect(composedStore.passkey.getState().isAuthenticating).toBe(false);
    expect(composedStore.core.getState().state).toBe('unauthenticated');

    console.log('✅ Destroy cleanup working correctly');
  });

  it('should demonstrate single signInState architecture', async () => {
    console.log('🧪 Test: Demonstrating single signInState architecture...');

    const composedStore = createAuthStore(authConfig);

    // Check that only UI store has signInState
    const coreState = composedStore.core.getState();
    const uiState = composedStore.ui.getState();
    const passkeyState = composedStore.passkey.getState();
    const emailState = composedStore.email.getState();

    console.log('📊 Checking signInState ownership:', {
      coreHasSignInState: 'signInState' in coreState,
      uiHasSignInState: 'signInState' in uiState,
      passkeyHasSignInState: 'signInState' in passkeyState,
      emailHasSignInState: 'signInState' in emailState
    });

    // Only UI store should have signInState
    expect('signInState' in uiState).toBe(true);
    expect('signInState' in coreState).toBe(false);
    expect('signInState' in passkeyState).toBe(false);
    expect('signInState' in emailState).toBe(false);

    // UI store owns master signInState
    expect(uiState.signInState).toBe('emailEntry');

    // Feature stores own their specific operational states
    expect(passkeyState).toHaveProperty('isAuthenticating');
    expect(emailState).toHaveProperty('isSendingCode');

    console.log('✅ Single signInState architecture verified');

    // Cleanup
    composedStore.destroy();
  });
});
