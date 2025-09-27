/**
 * Main Auth Store Composition
 * 
 * Composes all modular stores into a unified auth system:
 * - Creates and connects all individual stores
 * - Provides unified API similar to original auth store
 * - Handles cross-store communication and events
 * - Framework-agnostic with adapter support
 */

import type { AuthConfig, CompleteAuthStore } from '../types';
import type { StoreOptions, AuthEventType, AuthEventData, AuthEventHandler } from './types';

// Core stores
import { createAuthCoreStore, authenticateUser } from './core/auth-core';
import { createSessionStore, initializeSessionStore, createSessionData } from './core/session';
import { createErrorStore } from './core/error';
import { createEventStore, createTypedEventEmitters } from './core/events';

// Feature stores
import { createPasskeyStore } from './auth-methods/passkey';
import { createEmailAuthStore } from './auth-methods/email-auth';

// UI stores
import { createUIStore, signInStateTransitions, createUIEventHandlers } from './ui/ui-state';

// Framework adapters
import { createVanillaAdapter } from './adapters/vanilla';
import { toReadable as createSvelteAdapter } from './adapters/svelte';
import { createSvelteAuthStore } from './adapters/svelte';

/**
 * Composed auth store interface - provides unified API
 */
export interface ComposedAuthStore {
  // Individual store access
  core: ReturnType<typeof createAuthCoreStore>;
  session: ReturnType<typeof createSessionStore>;
  error: ReturnType<typeof createErrorStore>;
  events: ReturnType<typeof createEventStore>;
  passkey: ReturnType<typeof createPasskeyStore>;
  email: ReturnType<typeof createEmailAuthStore>;
  ui: ReturnType<typeof createUIStore>;
  
  // Unified API (backward compatibility layer)
  api: {
    // Authentication methods
    signInWithPasskey: (email: string, conditional?: boolean) => Promise<any>;
    signInWithEmail: (email: string) => Promise<any>;
    verifyEmailCode: (email: string, code: string) => Promise<any>;
    signOut: () => Promise<void>;
    
    // User management
    checkUser: (email: string) => Promise<any>;
    isAuthenticated: () => boolean;
    getAccessToken: () => string | null;
    
    // State management
    setEmail: (email: string) => void;
    setFullName: (name: string) => void;
    reset: () => void;
    
    // Event system
    on: (event: AuthEventType, handler: AuthEventHandler<any>) => () => void;
    emit: (event: AuthEventType, data?: AuthEventData[AuthEventType]) => void;
  };
  
  // Framework adapters
  adapters: {
    vanilla: ReturnType<typeof createVanillaAdapter>;
    svelte: any; // Svelte readable store
  };
  
  // Cleanup
  destroy: () => void;
}

/**
 * Create the composed auth store system
 * Returns a Svelte-compatible store that implements CompleteAuthStore interface
 */
export function createAuthStore(config: AuthConfig): CompleteAuthStore {
  const storeOptions: StoreOptions = {
    config,
    devtools: config.enableDevtools || false,
  };
  
  // Create all individual stores
  console.log('🔧 Creating modular auth stores...');
  
  const core = createAuthCoreStore({ ...storeOptions, name: 'auth-core' });
  const session = createSessionStore({ ...storeOptions, name: 'session' });
  const error = createErrorStore({ ...storeOptions, name: 'error' });
  const events = createEventStore({ ...storeOptions, name: 'events' });
  const passkey = createPasskeyStore({ ...storeOptions, name: 'passkey' });
  const email = createEmailAuthStore({ ...storeOptions, name: 'email-auth' });
  const ui = createUIStore({ ...storeOptions, name: 'ui' });
  
  // Create event emitters for type-safe events
  const eventEmitters = createTypedEventEmitters(events);
  
  // Create UI event handlers that coordinate between stores
  const uiHandlers = createUIEventHandlers(ui, {
    emailStore: email,
    passkeyStore: passkey,
    eventStore: events
  });
  
  console.log('✅ All modular stores created');
  
  // Initialize with existing session if available
  const existingAuth = initializeSessionStore(session);
  if (existingAuth) {
    console.log('🔄 Restoring existing session');
    authenticateUser(core, existingAuth.user, existingAuth.tokens);
    signInStateTransitions.authenticationSuccess(ui);
  }
  
  // Set up cross-store communication
  setupCrossStoreIntegration();
  
  // Create framework adapters
  const adapters = {
    vanilla: createVanillaAdapter(core),
    svelte: createSvelteAdapter(core)
  };
  
  function setupCrossStoreIntegration() {
    console.log('🔗 Setting up cross-store integration...');
    
    // Listen for authentication success events
    events.getState().on('sign_in_success', (data) => {
      console.log('🎯 Sign-in success event received:', data);
      
      // Update UI state
      signInStateTransitions.authenticationSuccess(ui);
      
      // Save session if we have user and tokens
      if (data.user && data.tokens) {
        const sessionData = createSessionData(
          data.user, 
          data.tokens, 
          data.method || 'passkey'
        );
        session.getState().saveSession(sessionData);
      }
    });
    
    // Listen for sign-out events
    events.getState().on('sign_out', () => {
      console.log('🎯 Sign-out event received');
      
      // Clear all stores
      core.getState().reset();  // Reset core auth state
      session.getState().clearSession();
      ui.getState().resetUIState();
      error.getState().clearApiError();
      passkey.getState().reset();
      email.getState().reset();
    });
    
    // Listen for errors and update error store
    events.getState().on('sign_in_error', (data) => {
      console.log('🎯 Sign-in error event received:', data);
      
      if (data.error) {
        error.getState().setApiError(data.error, { 
          method: data.method, 
          email: ui.getState().email 
        });
      }
    });
    
    console.log('✅ Cross-store integration setup complete');
  }
  
  // Unified API layer for backward compatibility
  const api = {
    // Authentication methods
    signInWithPasskey: async (emailAddress: string, conditional = false) => {
      try {
        eventEmitters.signInStarted({ method: 'passkey', email: emailAddress });
        
        const response = await passkey.getState().signIn(emailAddress, conditional);
        
        if (response.step === 'success' && response.user && response.accessToken) {
          // Update core auth state
          authenticateUser(core, response.user, {
            accessToken: response.accessToken,
            refreshToken: response.refreshToken,
            expiresAt: response.expiresIn ? Date.now() + response.expiresIn * 1000 : undefined
          });
          
          // Save session
          const sessionData = createSessionData(response.user, {
            accessToken: response.accessToken,
            refreshToken: response.refreshToken,
            expiresIn: response.expiresIn
          }, 'passkey');
          session.getState().saveSession(sessionData);
          
          // Emit success event
          eventEmitters.signInSuccess({ 
            user: response.user, 
            method: 'passkey' 
          });
        }
        
        return response;
      } catch (err) {
        eventEmitters.signInError({ 
          error: { code: 'passkey_failed', message: (err as Error).message }, 
          method: 'passkey' 
        });
        throw err;
      }
    },
    
    signInWithEmail: async (emailAddress: string) => {
      try {
        eventEmitters.signInStarted({ method: 'email-code', email: emailAddress });
        
        const response = await email.getState().sendCode(emailAddress);
        
        if (response.success) {
          // Trigger UI state transition
          signInStateTransitions.emailCodeSent(ui);
        }
        
        return response;
      } catch (err) {
        eventEmitters.signInError({ 
          error: { code: 'email_failed', message: (err as Error).message }, 
          method: 'email-code' 
        });
        throw err;
      }
    },
    
    verifyEmailCode: async (emailAddress: string, code: string) => {
      try {
        const response = await email.getState().verifyCode(emailAddress, code);
        
        if (response.step === 'success' && response.user && response.accessToken) {
          // Update core auth state
          authenticateUser(core, response.user, {
            accessToken: response.accessToken,
            refreshToken: response.refreshToken,
            expiresAt: response.expiresIn ? Date.now() + response.expiresIn * 1000 : undefined
          });
          
          // Save session
          const sessionData = createSessionData(response.user, {
            accessToken: response.accessToken,
            refreshToken: response.refreshToken,
            expiresIn: response.expiresIn
          }, 'email-code');
          session.getState().saveSession(sessionData);
          
          // Emit success event
          eventEmitters.signInSuccess({ 
            user: response.user, 
            method: 'email-code' 
          });
        }
        
        return response;
      } catch (err) {
        eventEmitters.signInError({ 
          error: { code: 'verification_failed', message: (err as Error).message }, 
          method: 'email-code' 
        });
        throw err;
      }
    },
    
    signOut: async () => {
      await core.getState().signOut();
      eventEmitters.signOut({ reason: 'user_action' });
    },
    
    // User management
    checkUser: async (emailAddress: string) => {
      const result = await email.getState().checkUser(emailAddress);
      
      // Update UI with user discovery
      signInStateTransitions.userDiscovered(ui, {
        exists: result.exists,
        hasPasskeys: result.hasWebAuthn,
        hasValidPin: result.hasValidPin || false,
        pinRemainingMinutes: result.pinRemainingMinutes || 0
      });
      
      return result;
    },
    
    isAuthenticated: () => core.getState().isAuthenticated(),
    getAccessToken: () => core.getState().getAccessToken(),
    
    // State management
    setEmail: (email: string) => uiHandlers.handleEmailChange(email),
    setFullName: (name: string) => ui.getState().setFullName(name),
    setLoading: (loading: boolean) => ui.getState().setLoading(loading),
    reset: () => uiHandlers.handleReset(),
    
    // Event system
    on: (event: AuthEventType, handler: AuthEventHandler<any>) => 
      events.getState().on(event, handler),
    emit: (event: AuthEventType, data?: AuthEventData[AuthEventType]) => 
      events.getState().emit(event, data)
  };
  
  // Create the composed store object
  const composedStore: ComposedAuthStore = {
    core,
    session,
    error,
    events,
    passkey,
    email,
    ui,
    api,
    adapters,
    destroy: () => {
      console.log('🧹 Destroying auth store...');
      
      // Clean up all stores
      core.getState().reset();
      session.getState().clearSession();
      error.getState().clearApiError();
      events.getState().removeAllListeners();
      passkey.getState().reset();
      email.getState().reset();
      ui.getState().resetUIState();
      
      console.log('✅ Auth store destroyed');
    }
  };
  
  console.log('🚀 Composed auth store ready!');
  
  // Return a Svelte-compatible store that implements CompleteAuthStore
  return createSvelteStoreWrapper(composedStore, config);
}

// Re-export individual store creators for advanced usage
export {
  createAuthCoreStore,
  createSessionStore,
  createErrorStore,
  createEventStore,
  createPasskeyStore,
  createEmailAuthStore,
  createUIStore
};

// Re-export adapters
export { createVanillaAdapter };
export { toReadable as createSvelteAdapter } from './adapters/svelte';

// Re-export types
export type * from './types';

// Default export for easy import
export default createAuthStore;