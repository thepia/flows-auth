/**
 * Passkey Authentication Store
 * 
 * Handles WebAuthn/Passkey-specific authentication:
 * - Passkey registration and authentication
 * - Conditional authentication (autofill integration)
 * - Platform authenticator detection
 * - WebAuthn credential management
 */

import { createStore } from 'zustand/vanilla';
import { subscribeWithSelector, devtools } from 'zustand/middleware';
import type { StoreOptions } from '../types';
import type { User, SignInResponse } from '../../types';
import { AuthApiClient } from '../../api/auth-api';
import {
  authenticateWithPasskey,
  isConditionalMediationSupported,
  isWebAuthnSupported,
  serializeCredential,
  isPlatformAuthenticatorAvailable
} from '../../utils/webauthn';

/**
 * Passkey store state
 */
export interface PasskeyState {
  // Capability detection
  isSupported: boolean;
  isPlatformAvailable: boolean;
  isConditionalSupported: boolean;
  
  // Operation state
  isAuthenticating: boolean;
  isRegistering: boolean;
  conditionalActive: boolean;
  
  // Last operation results
  lastAuthenticationTime: number | null;
  lastRegistrationTime: number | null;
  lastError: Error | null;
}

/**
 * Passkey store actions
 */
export interface PasskeyActions {
  // Authentication
  signIn: (email: string, conditional?: boolean) => Promise<SignInResponse>;
  startConditionalAuth: (email: string) => Promise<boolean>;
  stopConditionalAuth: () => void;
  
  // Registration
  register: (email: string, userId: string) => Promise<boolean>;
  
  // Capability detection
  checkCapabilities: () => Promise<void>;
  
  // State management
  setAuthenticating: (authenticating: boolean) => void;
  setRegistering: (registering: boolean) => void;
  setConditionalActive: (active: boolean) => void;
  clearError: () => void;
  reset: () => void;
}

/**
 * Combined passkey store interface
 */
export interface PasskeyStore extends PasskeyState, PasskeyActions {}

/**
 * Initial state for the passkey store
 */
const initialState: PasskeyState = {
  isSupported: false,
  isPlatformAvailable: false,
  isConditionalSupported: false,
  isAuthenticating: false,
  isRegistering: false,
  conditionalActive: false,
  lastAuthenticationTime: null,
  lastRegistrationTime: null,
  lastError: null,
};

/**
 * Create the passkey authentication store
 */
export function createPasskeyStore(options: StoreOptions) {
  const { config, devtools: enableDevtools = false, name = 'passkey' } = options;
  
  // Initialize API client
  const api = new AuthApiClient(config);

  const store = createStore<PasskeyStore>()(
    subscribeWithSelector(
      enableDevtools 
        ? devtools(
            (set, get) => ({
              ...initialState,
              
              // Authentication methods
              signIn: async (email: string, conditional = false) => {
                const startTime = Date.now();
                
                if (!get().isSupported) {
                  throw new Error('Passkeys are not supported on this device');
                }
                
                try {
                  set({ isAuthenticating: true, lastError: null });
                  
                  console.log('🔍 Passkey signIn called:', { email, conditional });
                  
                  // Get userId from email (mirrors thepia.com pattern)
                  const userCheck = await api.checkEmail(email);
                  if (!userCheck.exists || !userCheck.userId) {
                    throw new Error('User not found or missing userId');
                  }
                  
                  // Get challenge from server
                  const challenge = await api.getPasskeyChallenge(email);
                  
                  // Authenticate with passkey
                  const credential = await authenticateWithPasskey(challenge, conditional);
                  const serializedCredential = serializeCredential(credential);
                  
                  // Complete authentication with server
                  const response = await api.signInWithPasskey({
                    email: email,
                    credential: serializedCredential,
                    challengeId: challenge.challenge
                  });
                  
                  // Update success state
                  set({
                    isAuthenticating: false,
                    lastAuthenticationTime: Date.now(),
                    lastError: null
                  });
                  
                  console.log('✅ Passkey authentication successful');
                  return response;
                  
                } catch (error) {
                  const authError = error as Error;
                  
                  set({
                    isAuthenticating: false,
                    lastError: authError
                  });
                  
                  console.error('❌ Passkey authentication failed:', authError);
                  throw error;
                }
              },
              
              startConditionalAuth: async (email: string) => {
                if (!get().isSupported || !get().isConditionalSupported) {
                  return false;
                }
                
                try {
                  set({ conditionalActive: true });
                  
                  // Use the main signIn method with conditional=true
                  await get().signIn(email, true);
                  
                  set({ conditionalActive: false });
                  return true;
                  
                } catch (error) {
                  set({ conditionalActive: false });
                  // Conditional auth failures should be silent
                  console.log('⚠️ Conditional authentication failed (expected if no passkeys):', error);
                  return false;
                }
              },
              
              stopConditionalAuth: () => {
                set({ conditionalActive: false });
              },
              
              // Registration methods
              register: async (email: string, userId: string) => {
                if (!get().isSupported || !get().isPlatformAvailable) {
                  throw new Error('Passkey registration not supported on this device');
                }
                
                try {
                  set({ isRegistering: true, lastError: null });
                  
                  console.log('🔄 Starting passkey registration:', { email, userId });
                  
                  // Get WebAuthn registration options from server
                  const registrationOptions = await api.getWebAuthnRegistrationOptions({
                    email,
                    userId
                  });
                  
                  // Create WebAuthn credential using browser API
                  const webauthnUtils = await import('../../utils/webauthn');
                  const credential = await webauthnUtils.createCredential(registrationOptions);
                  
                  // Verify WebAuthn registration with server
                  const verificationResult = await api.verifyWebAuthnRegistration({
                    userId,
                    registrationResponse: credential
                  });
                  
                  if (!verificationResult.success) {
                    throw new Error(verificationResult.error || 'Failed to verify passkey registration');
                  }
                  
                  set({
                    isRegistering: false,
                    lastRegistrationTime: Date.now(),
                    lastError: null
                  });
                  
                  console.log('✅ Passkey registration successful');
                  return true;
                  
                } catch (error) {
                  const regError = error as Error;
                  
                  set({
                    isRegistering: false,
                    lastError: regError
                  });
                  
                  console.error('❌ Passkey registration failed:', regError);
                  throw error;
                }
              },
              
              // Capability detection
              checkCapabilities: async () => {
                if (typeof window === 'undefined') {
                  return;
                }
                
                const isSupported = isWebAuthnSupported();
                const isPlatformAvailable = isSupported ? await isPlatformAuthenticatorAvailable() : false;
                const isConditionalSupported = isSupported ? await isConditionalMediationSupported() : false;
                
                set({
                  isSupported,
                  isPlatformAvailable,
                  isConditionalSupported
                });
                
                console.log('🔍 Passkey capabilities detected:', {
                  isSupported,
                  isPlatformAvailable,
                  isConditionalSupported
                });
              },
              
              // State management
              setAuthenticating: (authenticating: boolean) => {
                set({ isAuthenticating: authenticating });
              },
              
              setRegistering: (registering: boolean) => {
                set({ isRegistering: registering });
              },
              
              setConditionalActive: (active: boolean) => {
                set({ conditionalActive: active });
              },
              
              clearError: () => {
                set({ lastError: null });
              },
              
              reset: () => {
                set(initialState);
              }
            }),
            { name }
          )
        : (set, get) => ({
            ...initialState,
            
            // Authentication methods
            signIn: async (email: string, conditional = false) => {
              const startTime = Date.now();
              
              if (!get().isSupported) {
                throw new Error('Passkeys are not supported on this device');
              }
              
              try {
                set({ isAuthenticating: true, lastError: null });
                
                console.log('🔍 Passkey signIn called:', { email, conditional });
                
                // Get userId from email (mirrors thepia.com pattern)
                const userCheck = await api.checkEmail(email);
                if (!userCheck.exists || !userCheck.userId) {
                  throw new Error('User not found or missing userId');
                }
                
                // Get challenge from server
                const challenge = await api.getPasskeyChallenge(email);
                
                // Authenticate with passkey
                const credential = await authenticateWithPasskey(challenge, conditional);
                const serializedCredential = serializeCredential(credential);
                
                // Complete authentication with server
                const response = await api.signInWithPasskey({
                  email: email,
                  credential: serializedCredential,
                  challengeId: challenge.challenge
                });
                
                // Update success state
                set({
                  isAuthenticating: false,
                  lastAuthenticationTime: Date.now(),
                  lastError: null
                });
                
                console.log('✅ Passkey authentication successful');
                return response;
                
              } catch (error) {
                const authError = error as Error;
                
                set({
                  isAuthenticating: false,
                  lastError: authError
                });
                
                console.error('❌ Passkey authentication failed:', authError);
                throw error;
              }
            },
            
            startConditionalAuth: async (email: string) => {
              if (!get().isSupported || !get().isConditionalSupported) {
                return false;
              }
              
              try {
                set({ conditionalActive: true });
                
                // Use the main signIn method with conditional=true
                await get().signIn(email, true);
                
                set({ conditionalActive: false });
                return true;
                
              } catch (error) {
                set({ conditionalActive: false });
                // Conditional auth failures should be silent
                console.log('⚠️ Conditional authentication failed (expected if no passkeys):', error);
                return false;
              }
            },
            
            stopConditionalAuth: () => {
              set({ conditionalActive: false });
            },
            
            // Registration methods
            register: async (email: string, userId: string) => {
              if (!get().isSupported || !get().isPlatformAvailable) {
                throw new Error('Passkey registration not supported on this device');
              }
              
              try {
                set({ isRegistering: true, lastError: null });
                
                console.log('🔄 Starting passkey registration:', { email, userId });
                
                // Get WebAuthn registration options from server
                const registrationOptions = await api.getWebAuthnRegistrationOptions({
                  email,
                  userId
                });
                
                // Create WebAuthn credential using browser API
                const webauthnUtils = await import('../../utils/webauthn');
                const credential = await webauthnUtils.createCredential(registrationOptions);
                
                // Verify WebAuthn registration with server
                const verificationResult = await api.verifyWebAuthnRegistration({
                  userId,
                  registrationResponse: credential
                });
                
                if (!verificationResult.success) {
                  throw new Error(verificationResult.error || 'Failed to verify passkey registration');
                }
                
                set({
                  isRegistering: false,
                  lastRegistrationTime: Date.now(),
                  lastError: null
                });
                
                console.log('✅ Passkey registration successful');
                return true;
                
              } catch (error) {
                const regError = error as Error;
                
                set({
                  isRegistering: false,
                  lastError: regError
                });
                
                console.error('❌ Passkey registration failed:', regError);
                throw error;
              }
            },
            
            // Capability detection
            checkCapabilities: async () => {
              if (typeof window === 'undefined') {
                return;
              }
              
              const isSupported = isWebAuthnSupported();
              const isPlatformAvailable = isSupported ? await isPlatformAuthenticatorAvailable() : false;
              const isConditionalSupported = isSupported ? await isConditionalMediationSupported() : false;
              
              set({
                isSupported,
                isPlatformAvailable,
                isConditionalSupported
              });
              
              console.log('🔍 Passkey capabilities detected:', {
                isSupported,
                isPlatformAvailable,
                isConditionalSupported
              });
            },
            
            // State management
            setAuthenticating: (authenticating: boolean) => {
              set({ isAuthenticating: authenticating });
            },
            
            setRegistering: (registering: boolean) => {
              set({ isRegistering: registering });
            },
            
            setConditionalActive: (active: boolean) => {
              set({ conditionalActive: active });
            },
            
            clearError: () => {
              set({ lastError: null });
            },
            
            reset: () => {
              set(initialState);
            }
          })
    )
  );

  // Auto-detect capabilities on creation
  if (typeof window !== 'undefined') {
    store.getState().checkCapabilities();
  }

  return store;
}

/**
 * Helper to check if passkey is available for a user
 */
export function isPasskeyAvailableForUser(
  passkeyStore: ReturnType<typeof createPasskeyStore>,
  userHasPasskeys: boolean
): boolean {
  const { isSupported, isPlatformAvailable } = passkeyStore.getState();
  return isSupported && isPlatformAvailable && userHasPasskeys;
}

/**
 * Helper to get passkey authentication readiness
 */
export function getPasskeyReadiness(
  passkeyStore: ReturnType<typeof createPasskeyStore>
) {
  const state = passkeyStore.getState();
  
  return {
    canAuthenticate: state.isSupported,
    canRegister: state.isSupported && state.isPlatformAvailable,
    canUseConditional: state.isSupported && state.isConditionalSupported,
    isReady: state.isSupported && state.isPlatformAvailable,
    capabilities: {
      webauthn: state.isSupported,
      platform: state.isPlatformAvailable,
      conditional: state.isConditionalSupported
    }
  };
}