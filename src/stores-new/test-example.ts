/**
 * Example Test/Demo of the New Modular Auth Store
 * 
 * This demonstrates how the new architecture works and can be used
 * for both manual testing and as usage examples.
 */

import createAuthStore from './index';
import type { AuthConfig } from '../types';

// Example configuration
const testConfig: AuthConfig = {
  apiBaseUrl: 'https://api.thepia.com',
  clientId: 'test-client',
  domain: 'thepia.com',
  enablePasskeys: true,
  enableMagicLinks: true,
  enableDevtools: true, // Enable for testing
};

/**
 * Test the new modular architecture
 */
export async function testModularAuthStore() {
  console.log('🧪 Testing new modular auth store architecture...');
  
  // Create the composed store
  const authStore = createAuthStore(testConfig);
  
  console.log('📊 Store structure:', {
    hasCore: !!authStore.core,
    hasSession: !!authStore.session,
    hasError: !!authStore.error,
    hasEvents: !!authStore.events,
    hasPasskey: !!authStore.passkey,
    hasEmail: !!authStore.email,
    hasUI: !!authStore.ui,
    hasAPI: !!authStore.api,
    hasAdapters: !!authStore.adapters
  });
  
  // Test individual store access
  console.log('🔍 Testing individual store access...');
  
  // Core store
  console.log('Core authenticated:', authStore.core.getState().isAuthenticated());
  console.log('Core access token:', authStore.core.getState().getAccessToken());
  
  // UI store - single signInState
  console.log('UI signInState:', authStore.ui.getState().signInState);
  console.log('UI email:', authStore.ui.getState().email);
  
  // Passkey store
  console.log('Passkey supported:', authStore.passkey.getState().isSupported);
  console.log('Passkey authenticating:', authStore.passkey.getState().isAuthenticating);
  
  // Email store  
  console.log('Email code sent:', authStore.email.getState().codeSent);
  console.log('Email sending:', authStore.email.getState().isSendingCode);
  
  // Test unified API
  console.log('🔗 Testing unified API...');
  
  // Set email - should trigger user discovery
  console.log('Setting email: test@example.com');
  authStore.api.setEmail('test@example.com');
  
  console.log('UI state after email set:', {
    email: authStore.ui.getState().email,
    signInState: authStore.ui.getState().signInState
  });
  
  // Test event system
  console.log('🎯 Testing event system...');
  
  const unsubscribe = authStore.api.on('sign_in_started', (data) => {
    console.log('📨 Received sign_in_started event:', data);
  });
  
  // Emit test event
  authStore.api.emit('sign_in_started', { method: 'passkey', email: 'test@example.com' });
  
  // Clean up
  unsubscribe();
  
  // Test framework adapters
  console.log('🔄 Testing framework adapters...');
  
  // Vanilla adapter - should return core store state
  const coreState = authStore.core.getState();
  console.log('Core store state (via vanilla adapter):', {
    authenticated: coreState.state === 'authenticated',
    hasUser: !!coreState.user,
    state: coreState.state
  });
  
  // Svelte adapter (would be used in Svelte components)
  console.log('Svelte adapter type:', typeof authStore.adapters.svelte.subscribe);
  
  // Test state composition - single signInState management
  console.log('📋 Testing state composition...');
  
  console.log('Before state change:');
  console.log('- UI signInState:', authStore.ui.getState().signInState);
  console.log('- Passkey authenticating:', authStore.passkey.getState().isAuthenticating);
  console.log('- Email sending:', authStore.email.getState().isSendingCode);
  
  // Simulate state changes
  authStore.ui.getState().setSignInState('userChecked');
  authStore.passkey.getState().setAuthenticating(true);
  authStore.email.getState().setCodeSent(true);
  
  console.log('After state change:');
  console.log('- UI signInState:', authStore.ui.getState().signInState); // Single source of truth
  console.log('- Passkey authenticating:', authStore.passkey.getState().isAuthenticating); // Specific operation
  console.log('- Email code sent:', authStore.email.getState().codeSent); // Specific operation
  
  // Cleanup
  console.log('🧹 Cleaning up test...');
  authStore.destroy();
  
  console.log('✅ Modular auth store test completed!');
}

/**
 * Example usage in different frameworks
 */
export const frameworkExamples = {
  /**
   * React component example
   */
  react: `
    import { useEffect, useState } from 'react';
    import createAuthStore from '@thepia/flows-auth/stores-new';
    
    function AuthComponent() {
      const [authStore] = useState(() => createAuthStore(config));
      const [user, setUser] = useState(null);
      const [signInState, setSignInState] = useState('emailEntry');
      
      useEffect(() => {
        // Subscribe to core auth state
        const unsubCore = authStore.core.subscribe((state) => {
          setUser(state.user);
        });
        
        // Subscribe to UI flow state  
        const unsubUI = authStore.ui.subscribe((state) => {
          setSignInState(state.signInState);
        });
        
        return () => {
          unsubCore();
          unsubUI();
        };
      }, []);
      
      const handleSignIn = async (email) => {
        if (authStore.passkey.getState().isSupported) {
          await authStore.api.signInWithPasskey(email);
        } else {
          await authStore.api.signInWithEmail(email);
        }
      };
      
      return (
        <div>
          {signInState === 'emailEntry' && <EmailForm />}
          {signInState === 'userChecked' && <AuthButtons />}
          {signInState === 'pinEntry' && <PinForm />}
          {signInState === 'signedIn' && <Welcome user={user} />}
        </div>
      );
    }
  `,
  
  /**
   * Svelte component example  
   */
  svelte: `
    <script>
      import { onMount } from 'svelte';
      import createAuthStore from '@thepia/flows-auth/stores-new';
      
      let authStore;
      let coreStore;
      let uiStore;
      
      onMount(async () => {
        authStore = createAuthStore(config);
        coreStore = authStore.adapters.svelte; // Svelte readable store
        uiStore = createSvelteAdapter(authStore.ui); // UI state store
      });
      
      async function handleSignIn(email) {
        if ($passkeyStore.isSupported) {
          await authStore.api.signInWithPasskey(email);
        } else {
          await authStore.api.signInWithEmail(email);
        }
      }
    </script>
    
    {#if authStore}
      {#if $uiStore.signInState === 'emailEntry'}
        <EmailForm />
      {:else if $uiStore.signInState === 'userChecked'}
        <AuthButtons />
      {:else if $uiStore.signInState === 'pinEntry'}
        <PinForm />
      {:else if $uiStore.signInState === 'signedIn'}
        <Welcome user={$coreStore.user} />
      {/if}
    {/if}
  `,
  
  /**
   * Vanilla JavaScript example
   */
  vanilla: `
    import createAuthStore from '@thepia/flows-auth/stores-new';
    
    const authStore = createAuthStore(config);
    
    // Subscribe to state changes
    authStore.adapters.vanilla.subscribe((state) => {
      updateUI(state);
    });
    
    // Use specific store operations
    authStore.ui.subscribe((uiState) => {
      if (uiState.signInState === 'userChecked') {
        showAuthButtons();
      }
    });
    
    // Handle authentication
    async function signIn(email) {
      try {
        if (authStore.passkey.getState().isSupported) {
          await authStore.api.signInWithPasskey(email);
        } else {
          await authStore.api.signInWithEmail(email);
        }
      } catch (error) {
        console.error('Sign in failed:', error);
      }
    }
  `
};

// Export for manual testing
if (typeof window !== 'undefined') {
  // @ts-ignore
  window.testModularAuthStore = testModularAuthStore;
  // @ts-ignore  
  window.frameworkExamples = frameworkExamples;
}