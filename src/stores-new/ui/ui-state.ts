/**
 * UI State Management Store
 * 
 * Manages the master sign-in flow and UI state:
 * - Single source of truth for signInState
 * - Form input management (email, fullName)
 * - User discovery state (userExists, hasPasskeys)
 * - Loading and interaction states
 * - UI flow orchestration
 */

import { createStore } from 'zustand/vanilla';
import { subscribeWithSelector, devtools } from 'zustand/middleware';
import type { UIState, UIActions, UIStore, StoreOptions } from '../types';
import type { SignInState, AuthConfig, StateMessageConfig, ButtonConfig, ExplainerConfig } from '../../types';

/**
 * Initial state for the UI store
 */
const initialState: UIState = {
  // Form inputs
  email: '',
  fullName: '',
  loading: false,
  
  // Master flow state - SINGLE SOURCE OF TRUTH
  signInState: 'emailEntry',
  emailCodeSent: false,
  
  // User discovery state
  userExists: null,
  hasPasskeys: false,
  hasValidPin: false,
  pinRemainingMinutes: 0,
  
  // WebAuthn state
  conditionalAuthActive: false,
  platformAuthenticatorAvailable: false,
};

/**
 * Create the UI state management store
 */
export function createUIStore(options: StoreOptions) {
  const { devtools: enableDevtools = false, name = 'ui' } = options;

  const store = createStore<UIStore>()(
    subscribeWithSelector(
      enableDevtools 
        ? devtools(
            (set, get) => ({
              ...initialState,
              
              // Form input setters
              setEmail: (email: string) => {
                const currentState = get();
                const emailChanged = currentState.email !== email;
                
                if (emailChanged) {
                  // Reset user discovery state when email changes
                  set({
                    email,
                    userExists: null,
                    hasPasskeys: false,
                    hasValidPin: false,
                    pinRemainingMinutes: 0,
                    // Reset signInState to emailEntry if we were in userChecked
                    signInState: currentState.signInState === 'userChecked' ? 'emailEntry' : currentState.signInState
                  });
                } else {
                  set({ email });
                }
              },
              
              setFullName: (fullName: string) => {
                set({ fullName });
              },
              
              setLoading: (loading: boolean) => {
                set({ loading });
              },
              
              // Master flow state management - SINGLE SOURCE OF TRUTH
              setSignInState: (signInState: SignInState) => {
                console.log('🔄 SignIn state transition:', { 
                  from: get().signInState, 
                  to: signInState 
                });
                set({ signInState });
              },
              
              setEmailCodeSent: (emailCodeSent: boolean) => {
                set({ emailCodeSent });
              },
              
              setConditionalAuthActive: (conditionalAuthActive: boolean) => {
                set({ conditionalAuthActive });
              },
              
              // User discovery state setters
              setUserExists: (userExists: boolean | null) => {
                set({ userExists });
              },
              
              setHasPasskeys: (hasPasskeys: boolean) => {
                set({ hasPasskeys });
              },
              
              setHasValidPin: (hasValidPin: boolean) => {
                set({ hasValidPin });
              },
              
              setPinRemainingMinutes: (pinRemainingMinutes: number) => {
                set({ pinRemainingMinutes });
              },
              
              // Reset to initial state
              resetUIState: () => {
                console.log('🔄 Resetting UI state to initial');
                set(initialState);
              },

              // Event-based actions for state machine
              userChecked: (userData: {
                email: string;
                exists: boolean;
                hasPasskey: boolean;
                hasValidPin: boolean;
                pinRemainingMinutes?: number;
              }) => {
                set((state) => ({
                  ...state,
                  email: userData.email,
                  userExists: userData.exists,
                  hasPasskeys: userData.hasPasskey,
                  hasValidPin: userData.hasValidPin,
                  pinRemainingMinutes: userData.pinRemainingMinutes || 0,
                  signInState: 'userChecked'
                }));
              },

              pinEmailSent: () => {
                set((state) => ({
                  ...state,
                  signInState: 'pinEntry',
                  emailCodeSent: true
                }));
              },

              reset: () => {
                set((state) => ({
                  ...state,
                  email: '',
                  fullName: '',
                  emailCodeSent: false,
                  userExists: null,
                  hasPasskeys: false,
                  hasValidPin: false,
                  pinRemainingMinutes: 0,
                  loading: false,
                  signInState: 'emailEntry'
                }));
              },

              authSuccess: (method: 'passkey' | 'email-code' | 'magic-link') => {
                set((state) => ({
                  ...state,
                  signInState: 'signedIn',
                  loading: false
                }));
              },

              authError: () => {
                set((state) => ({
                  ...state,
                  signInState: 'generalError',
                  loading: false
                }));
              },

              // UI Configuration methods
              getStateMessageConfig: (config: AuthConfig): StateMessageConfig | null => {
                const currentState = get();
                const { signInState, userExists, emailCodeSent, hasValidPin } = currentState;
                const signInMode = config.signInMode || 'login-or-register';

                switch (signInState) {
                  case 'userChecked':
                    if (!userExists && signInMode === 'login-only') {
                      return {
                        type: 'info',
                        textKey: 'auth.onlyRegisteredUsers',
                        showIcon: true
                      };
                    }
                    return null;

                  case 'pinEntry':
                    if (emailCodeSent && !hasValidPin) {
                      return {
                        type: 'success',
                        textKey: 'status.checkEmail',
                        showIcon: true
                      };
                    }
                    if (hasValidPin) {
                      return {
                        type: 'info',
                        textKey: 'status.pinDetected',
                        showIcon: true
                      };
                    }
                    return null;

                  case 'emailVerification':
                    return {
                      type: 'info',
                      textKey: 'registration.required',
                      showIcon: true
                    };

                  default:
                    return null;
                }
              },

              getButtonConfig: (config: AuthConfig): ButtonConfig => {
                const currentState = get();
                const { loading, userExists, hasPasskeys, signInState, email, fullName } = currentState;
                const passkeysEnabled = config.enablePasskeys && hasPasskeys;

                // Handle pinEntry state with specific button configs
                if (signInState === 'pinEntry') {
                  return getPinEntryButtonConfig(loading);
                }

                // Smart button logic based on user state
                if (userExists && hasPasskeys && passkeysEnabled) {
                  return getPasskeyButtonConfig(config, currentState);
                }
                return getEmailCodeOnlyButtonConfig(config, currentState);

                // Helper functions
                function getPinEntryButtonConfig(loading: boolean): ButtonConfig {
                  const pinEntryConfig = {
                    primary: {
                      method: 'email-code' as const,
                      textKey: 'code.verify',
                      loadingTextKey: 'code.verifying',
                      disabled: loading, // Component will handle emailCode validation
                      supportsWebAuthn: false
                    },
                    secondary: {
                      method: 'generic' as const,
                      textKey: 'action.useDifferentEmail',
                      loadingTextKey: '',
                      disabled: loading,
                      supportsWebAuthn: false
                    }
                  };
                  console.log('🔘 Button config - pinEntry state:', {
                    loading,
                    primaryDisabled: pinEntryConfig.primary.disabled,
                    secondaryDisabled: pinEntryConfig.secondary?.disabled
                  });
                  return pinEntryConfig;
                }

                function getEmailCodeOnlyButtonConfig(config: AuthConfig, state: typeof currentState): ButtonConfig {
                  // Button disabled state logic
                  let isDisabled = !email || !email?.trim();
                  console.log('🔘 Button disabled - initial check:', {
                    loading,
                    signInState,
                    initialDisabled: isDisabled
                  });

                  switch (signInState) {
                    case 'emailEntry':
                      isDisabled = true;
                      console.log('🔘 Button disabled - emailEntry state: always disabled');
                      break;
                    case 'userChecked':
                      if (config.signInMode === 'login-only') {
                        isDisabled = !userExists;
                      } else {
                        isDisabled = userExists ? false : !fullName || fullName.trim().length < 3;
                      }
                      console.log('🔘 Button disabled - userChecked state:', {
                        fullName,
                        fullNameTrimmed: fullName?.trim(),
                        fullNameLength: fullName?.trim().length,
                        disabled: isDisabled
                      });
                      break;
                    default:
                      console.log('🔘 Button disabled - other state:', { signInState, disabled: isDisabled });
                  }

                  const emailCodeOnlyConfig = {
                    primary: {
                      method: 'email-code' as const,
                      textKey: 'auth.sendPinByEmail',
                      loadingTextKey: 'auth.sendingPin',
                      disabled: isDisabled || loading,
                      supportsWebAuthn: false
                    },
                    secondary: null
                  };
                  console.log('🔘 Button config - emailCodeOnly state:', {
                    loading,
                    primaryDisabled: emailCodeOnlyConfig.primary.disabled
                  });
                  return emailCodeOnlyConfig;
                }

                function getPasskeyButtonConfig(config: AuthConfig, state: typeof currentState): ButtonConfig {
                  const isDisabled = !email || !email?.trim() || loading || !userExists;

                  let secondary: any;
                  if (config.enableMagicLinks) {
                    secondary = {
                      method: 'magic-link',
                      textKey: 'auth.sendMagicLink',
                      loadingTextKey: 'auth.sendingMagicLink',
                      supportsWebAuthn: true,
                      disabled: isDisabled
                    };
                  } else {
                    secondary = {
                      method: 'email-code',
                      textKey: 'auth.sendPinByEmail',
                      loadingTextKey: 'auth.sendingPin',
                      supportsWebAuthn: true,
                      disabled: isDisabled
                    };
                  }

                  const buttonConfig: ButtonConfig = {
                    primary: {
                      method: 'passkey',
                      textKey: 'auth.signInWithPasskey',
                      loadingTextKey: 'auth.authenticating',
                      supportsWebAuthn: true,
                      disabled: isDisabled
                    },
                    secondary
                  };
                  console.log('🔘 Button config - final result:', {
                    signInState,
                    email,
                    fullName,
                    loading,
                    primaryMethod: buttonConfig.primary.method,
                    primaryTextKey: buttonConfig.primary.textKey,
                    primaryDisabled: buttonConfig.primary.disabled,
                    secondaryDisabled: buttonConfig.secondary?.disabled
                  });
                  return buttonConfig;
                }
              },

              getExplainerConfig: (config: AuthConfig, explainFeatures: boolean): ExplainerConfig | null => {
                // TODO: Implement full explainer config logic from original auth-store.ts
                if (!explainFeatures) return null;
                return {
                  type: 'features',
                  title: 'Sign in with passkeys or email',
                  description: 'Choose your preferred authentication method',
                  features: []
                };
              }
            }),
            { name }
          )
        : (set, get) => ({
            ...initialState,
            
            // Form input setters
            setEmail: (email: string) => {
              const currentState = get();
              const emailChanged = currentState.email !== email;
              
              if (emailChanged) {
                // Reset user discovery state when email changes
                set({
                  email,
                  userExists: null,
                  hasPasskeys: false,
                  hasValidPin: false,
                  pinRemainingMinutes: 0,
                  // Reset signInState to emailEntry if we were in userChecked
                  signInState: currentState.signInState === 'userChecked' ? 'emailEntry' : currentState.signInState
                });
              } else {
                set({ email });
              }
            },
            
            setFullName: (fullName: string) => {
              set({ fullName });
            },
            
            setLoading: (loading: boolean) => {
              set({ loading });
            },
            
            // Master flow state management - SINGLE SOURCE OF TRUTH
            setSignInState: (signInState: SignInState) => {
              console.log('🔄 SignIn state transition:', { 
                from: get().signInState, 
                to: signInState 
              });
              set({ signInState });
            },
            
            setEmailCodeSent: (emailCodeSent: boolean) => {
              set({ emailCodeSent });
            },
            
            setConditionalAuthActive: (conditionalAuthActive: boolean) => {
              set({ conditionalAuthActive });
            },
            
            // User discovery state setters
            setUserExists: (userExists: boolean | null) => {
              set({ userExists });
            },
            
            setHasPasskeys: (hasPasskeys: boolean) => {
              set({ hasPasskeys });
            },
            
            setHasValidPin: (hasValidPin: boolean) => {
              set({ hasValidPin });
            },
            
            setPinRemainingMinutes: (pinRemainingMinutes: number) => {
              set({ pinRemainingMinutes });
            },
            
            // Reset to initial state
            resetUIState: () => {
              console.log('🔄 Resetting UI state to initial');
              set(initialState);
            },

            // Event-based actions for state machine
            userChecked: (userData: {
              email: string;
              exists: boolean;
              hasPasskey: boolean;
              hasValidPin: boolean;
              pinRemainingMinutes?: number;
            }) => {
              set((state) => ({
                ...state,
                email: userData.email,
                userExists: userData.exists,
                hasPasskeys: userData.hasPasskey,
                hasValidPin: userData.hasValidPin,
                pinRemainingMinutes: userData.pinRemainingMinutes || 0,
                signInState: 'userChecked'
              }));
            },

            pinEmailSent: () => {
              set((state) => ({
                ...state,
                signInState: 'pinEntry',
                emailCodeSent: true
              }));
            },

            reset: () => {
              set((state) => ({
                ...state,
                email: '',
                fullName: '',
                emailCodeSent: false,
                userExists: null,
                hasPasskeys: false,
                hasValidPin: false,
                pinRemainingMinutes: 0,
                loading: false,
                signInState: 'emailEntry'
              }));
            },

            authSuccess: (method: 'passkey' | 'email-code' | 'magic-link') => {
              set((state) => ({
                ...state,
                signInState: 'signedIn',
                loading: false
              }));
            },

            authError: () => {
              set((state) => ({
                ...state,
                signInState: 'generalError',
                loading: false
              }));
            },

            // UI Configuration methods
            getStateMessageConfig: (config: AuthConfig): StateMessageConfig | null => {
              const currentState = get();
              const { signInState, userExists, emailCodeSent, hasValidPin } = currentState;
              const signInMode = config.signInMode || 'login-or-register';

              switch (signInState) {
                case 'userChecked':
                  if (!userExists && signInMode === 'login-only') {
                    return {
                      type: 'info',
                      textKey: 'auth.onlyRegisteredUsers',
                      showIcon: true
                    };
                  }
                  return null;

                case 'pinEntry':
                  if (emailCodeSent && !hasValidPin) {
                    return {
                      type: 'success',
                      textKey: 'status.checkEmail',
                      showIcon: true
                    };
                  }
                  if (hasValidPin) {
                    return {
                      type: 'info',
                      textKey: 'status.pinDetected',
                      showIcon: true
                    };
                  }
                  return null;

                case 'emailVerification':
                  return {
                    type: 'info',
                    textKey: 'registration.required',
                    showIcon: true
                  };

                default:
                  return null;
              }
            },

            getButtonConfig: (config: AuthConfig): ButtonConfig => {
              const currentState = get();
              const { loading, userExists, hasPasskeys, signInState, email, fullName } = currentState;
              const passkeysEnabled = config.enablePasskeys && hasPasskeys;

              // Handle pinEntry state with specific button configs
              if (signInState === 'pinEntry') {
                return getPinEntryButtonConfig(loading);
              }

              // Smart button logic based on user state
              if (userExists && hasPasskeys && passkeysEnabled) {
                return getPasskeyButtonConfig(config, currentState);
              }
              return getEmailCodeOnlyButtonConfig(config, currentState);

              // Helper functions
              function getPinEntryButtonConfig(loading: boolean): ButtonConfig {
                const pinEntryConfig = {
                  primary: {
                    method: 'email-code' as const,
                    textKey: 'code.verify',
                    loadingTextKey: 'code.verifying',
                    disabled: loading, // Component will handle emailCode validation
                    supportsWebAuthn: false
                  },
                  secondary: {
                    method: 'generic' as const,
                    textKey: 'action.useDifferentEmail',
                    loadingTextKey: '',
                    disabled: loading,
                    supportsWebAuthn: false
                  }
                };
                console.log('🔘 Button config - pinEntry state:', {
                  loading,
                  primaryDisabled: pinEntryConfig.primary.disabled,
                  secondaryDisabled: pinEntryConfig.secondary?.disabled
                });
                return pinEntryConfig;
              }

              function getEmailCodeOnlyButtonConfig(config: AuthConfig, state: typeof currentState): ButtonConfig {
                // Button disabled state logic
                let isDisabled = !email || !email?.trim();
                console.log('🔘 Button disabled - initial check:', {
                  loading,
                  signInState,
                  initialDisabled: isDisabled
                });

                switch (signInState) {
                  case 'emailEntry':
                    isDisabled = true;
                    console.log('🔘 Button disabled - emailEntry state: always disabled');
                    break;
                  case 'userChecked':
                    if (config.signInMode === 'login-only') {
                      isDisabled = !userExists;
                    } else {
                      isDisabled = userExists ? false : !fullName || fullName.trim().length < 3;
                    }
                    console.log('🔘 Button disabled - userChecked state:', {
                      fullName,
                      fullNameTrimmed: fullName?.trim(),
                      fullNameLength: fullName?.trim().length,
                      disabled: isDisabled
                    });
                    break;
                  default:
                    console.log('🔘 Button disabled - other state:', { signInState, disabled: isDisabled });
                }

                const emailCodeOnlyConfig = {
                  primary: {
                    method: 'email-code' as const,
                    textKey: 'auth.sendPinByEmail',
                    loadingTextKey: 'auth.sendingPin',
                    disabled: isDisabled || loading,
                    supportsWebAuthn: false
                  },
                  secondary: null
                };
                console.log('🔘 Button config - emailCodeOnly state:', {
                  loading,
                  primaryDisabled: emailCodeOnlyConfig.primary.disabled
                });
                return emailCodeOnlyConfig;
              }

              function getPasskeyButtonConfig(config: AuthConfig, state: typeof currentState): ButtonConfig {
                const isDisabled = !email || !email?.trim() || loading || !userExists;

                let secondary: any;
                if (config.enableMagicLinks) {
                  secondary = {
                    method: 'magic-link',
                    textKey: 'auth.sendMagicLink',
                    loadingTextKey: 'auth.sendingMagicLink',
                    supportsWebAuthn: true,
                    disabled: isDisabled
                  };
                } else {
                  secondary = {
                    method: 'email-code',
                    textKey: 'auth.sendPinByEmail',
                    loadingTextKey: 'auth.sendingPin',
                    supportsWebAuthn: true,
                    disabled: isDisabled
                  };
                }

                const buttonConfig: ButtonConfig = {
                  primary: {
                    method: 'passkey',
                    textKey: 'auth.signInWithPasskey',
                    loadingTextKey: 'auth.authenticating',
                    supportsWebAuthn: true,
                    disabled: isDisabled
                  },
                  secondary
                };
                console.log('🔘 Button config - final result:', {
                  signInState,
                  email,
                  fullName,
                  loading,
                  primaryMethod: buttonConfig.primary.method,
                  primaryTextKey: buttonConfig.primary.textKey,
                  primaryDisabled: buttonConfig.primary.disabled,
                  secondaryDisabled: buttonConfig.secondary?.disabled
                });
                return buttonConfig;
              }
            },

            getExplainerConfig: (config: AuthConfig, explainFeatures = true): ExplainerConfig | null => {
              const currentState = get();
              const { signInState, userExists, hasPasskeys, hasValidPin } = currentState;

              // Only show explainer during email entry and user checked states
              if (signInState !== 'emailEntry' && signInState !== 'userChecked') {
                return null;
              }

              // Determine if we should show features list or paragraph
              const shouldShowFeatures =
                explainFeatures !== undefined
                  ? explainFeatures
                  : userExists === true && (hasPasskeys || hasValidPin);

              if (shouldShowFeatures) {
                // Show features list when user exists and has advanced auth methods
                const features = [];

                if (hasPasskeys) {
                  features.push({
                    iconName: 'Lock',
                    textKey: 'explainer.features.securePasskey',
                    iconWeight: 'duotone' as const
                  });
                }

                features.push({
                  iconName: 'Shield',
                  textKey: 'explainer.features.privacyCompliant',
                  iconWeight: 'duotone' as const
                });

                if (config.branding?.companyName) {
                  features.push({
                    iconName: 'BadgeCheck',
                    textKey: 'explainer.features.employeeVerification',
                    iconWeight: 'duotone' as const
                  });
                } else {
                  features.push({
                    iconName: 'UserCheck',
                    textKey: 'explainer.features.userVerification',
                    iconWeight: 'duotone' as const
                  });
                }

                return {
                  type: 'features',
                  features,
                  className: 'explainer-features-list'
                };
              }
              // Show paragraph for new users or simple auth scenarios
              let textKey: string;

              if (config.branding?.companyName) {
                if (config.appCode) {
                  textKey = 'security.passwordlessWithPin';
                } else {
                  textKey = 'security.passwordlessExplanation';
                }
              } else {
                if (config.appCode) {
                  textKey = 'security.passwordlessWithPinGeneric';
                } else {
                  textKey = 'security.passwordlessGeneric';
                }
              }

              return {
                type: 'paragraph',
                textKey,
                iconName: 'Lock',
                iconWeight: 'duotone' as const,
                useCompanyName: !!config.branding?.companyName,
                companyName: config.branding?.companyName,
                className: 'explainer-paragraph'
              };
            }
          })
    )
  );

  return store;
}

/**
 * State transition helpers - Business logic for signInState changes
 */
export const signInStateTransitions = {
  /**
   * Transition from emailEntry to userChecked after user discovery
   */
  userDiscovered: (
    uiStore: ReturnType<typeof createUIStore>,
    userData: {
      exists: boolean;
      hasPasskeys: boolean;
      hasValidPin: boolean;
      pinRemainingMinutes: number;
    }
  ) => {
    const { setSignInState, setUserExists, setHasPasskeys, setHasValidPin, setPinRemainingMinutes } = uiStore.getState();
    
    // Update user discovery state
    setUserExists(userData.exists);
    setHasPasskeys(userData.hasPasskeys);
    setHasValidPin(userData.hasValidPin);
    setPinRemainingMinutes(userData.pinRemainingMinutes);
    
    // Transition to userChecked state
    setSignInState('userChecked');
    
    console.log('✅ User discovered, transitioned to userChecked:', userData);
  },
  
  /**
   * Transition to pinEntry after email code sent
   */
  emailCodeSent: (uiStore: ReturnType<typeof createUIStore>) => {
    const { setSignInState, setEmailCodeSent } = uiStore.getState();
    
    setEmailCodeSent(true);
    setSignInState('pinEntry');
    
    console.log('✅ Email code sent, transitioned to pinEntry');
  },
  
  /**
   * Transition to signedIn after successful authentication
   */
  authenticationSuccess: (uiStore: ReturnType<typeof createUIStore>) => {
    const { setSignInState } = uiStore.getState();
    
    setSignInState('signedIn');
    
    console.log('✅ Authentication successful, transitioned to signedIn');
  },
  
  /**
   * Reset to emailEntry (e.g., on sign out or error)
   */
  reset: (uiStore: ReturnType<typeof createUIStore>) => {
    const { resetUIState } = uiStore.getState();
    
    resetUIState();
    
    console.log('🔄 Reset to emailEntry state');
  },
  
  /**
   * Handle authentication error
   */
  authenticationError: (uiStore: ReturnType<typeof createUIStore>, error: Error) => {
    const { setSignInState, setLoading } = uiStore.getState();
    
    setLoading(false);
    setSignInState('generalError');
    
    console.error('❌ Authentication error, transitioned to generalError:', error);
  }
};

/**
 * Computed state helpers - Derived values from UI state
 */
export const uiStateSelectors = {
  /**
   * Check if user can proceed with authentication
   */
  canProceed: (uiStore: ReturnType<typeof createUIStore>): boolean => {
    const state = uiStore.getState();
    
    switch (state.signInState) {
      case 'emailEntry':
        return false; // Always disabled in email entry
      
      case 'userChecked':
        if (state.userExists) {
          return true; // Existing user can always proceed
        } else {
          // New user needs full name (min 3 chars)
          return state.fullName.trim().length >= 3;
        }
      
      case 'pinEntry':
        return true; // PIN validation handled at component level
      
      default:
        return false;
    }
  },
  
  /**
   * Determine the primary authentication method
   */
  getPrimaryAuthMethod: (
    uiStore: ReturnType<typeof createUIStore>,
    config: { enablePasskeys?: boolean }
  ): 'passkey' | 'email-code' | null => {
    const state = uiStore.getState();
    
    if (state.signInState !== 'userChecked') {
      return null;
    }
    
    if (state.userExists && state.hasPasskeys && config.enablePasskeys) {
      return 'passkey';
    }
    
    return 'email-code';
  },
  
  /**
   * Check if form inputs are valid
   */
  isFormValid: (uiStore: ReturnType<typeof createUIStore>): boolean => {
    const state = uiStore.getState();
    
    // Email must be valid format
    const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(state.email.trim());
    
    // If user doesn't exist, full name is required
    if (state.userExists === false) {
      return emailValid && state.fullName.trim().length >= 3;
    }
    
    return emailValid;
  },
  
  /**
   * Get current loading state from any operation
   */
  getLoadingState: (
    uiStore: ReturnType<typeof createUIStore>,
    passkeyStore?: { isAuthenticating: boolean },
    emailStore?: { isSendingCode: boolean; isVerifyingCode: boolean }
  ): boolean => {
    const uiState = uiStore.getState();
    
    return uiState.loading || 
           passkeyStore?.isAuthenticating || 
           emailStore?.isSendingCode || 
           emailStore?.isVerifyingCode || 
           false;
  }
};

/**
 * Helper to create UI event handlers that coordinate with other stores
 */
export function createUIEventHandlers(
  uiStore: ReturnType<typeof createUIStore>,
  dependencies: {
    emailStore?: any;
    passkeyStore?: any;
    eventStore?: any;
  }
) {
  return {
    /**
     * Handle email input change with user discovery
     */
    handleEmailChange: async (email: string) => {
      const { setEmail, setLoading } = uiStore.getState();
      
      setEmail(email);
      
      // Trigger user discovery if email is valid
      const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
      if (emailValid && dependencies.emailStore) {
        try {
          setLoading(true);
          const userCheck = await dependencies.emailStore.getState().checkUser(email);
          
          signInStateTransitions.userDiscovered(uiStore, {
            exists: userCheck.exists,
            hasPasskeys: userCheck.hasWebAuthn,
            hasValidPin: userCheck.hasValidPin || false,
            pinRemainingMinutes: userCheck.pinRemainingMinutes || 0
          });
        } catch (error) {
          console.error('User discovery failed:', error);
        } finally {
          setLoading(false);
        }
      }
    },
    
    /**
     * Handle authentication success from any method
     */
    handleAuthSuccess: (method: 'passkey' | 'email-code' | 'magic-link') => {
      signInStateTransitions.authenticationSuccess(uiStore);
      
      if (dependencies.eventStore) {
        dependencies.eventStore.getState().emit('sign_in_success', { method });
      }
    },
    
    /**
     * Handle authentication error from any method
     */
    handleAuthError: (error: Error, method: 'passkey' | 'email-code' | 'magic-link') => {
      signInStateTransitions.authenticationError(uiStore, error);
      
      if (dependencies.eventStore) {
        dependencies.eventStore.getState().emit('sign_in_error', { error, method });
      }
    },
    
    /**
     * Handle reset/sign out
     */
    handleReset: () => {
      signInStateTransitions.reset(uiStore);
      
      if (dependencies.eventStore) {
        dependencies.eventStore.getState().emit('sign_out', { reason: 'user_action' });
      }
    }
  };
}