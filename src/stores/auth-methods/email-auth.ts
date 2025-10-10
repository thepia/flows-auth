/**
 * Email Authentication Store
 *
 * Handles email-based authentication methods:
 * - PIN code generation and verification
 * - App-based email authentication
 * - Magic link generation and handling
 * - Organization-specific email flows
 */

import { devtools, subscribeWithSelector } from 'zustand/middleware';
import { createStore } from 'zustand/vanilla';
import { AuthApiClient } from '../../api/auth-api';
import type { SignInData, User } from '../../types';
import { createSessionData } from '../core/session';
import type { StoreOptions } from '../types';

/**
 * Email auth store state
 */
export interface EmailAuthState {
  // Operation states
  isSendingCode: boolean;
  isVerifyingCode: boolean;
  isSendingMagicLink: boolean;

  // Email flow state
  codeSent: boolean;
  codeVerified: boolean;
  magicLinkSent: boolean;
  lastCodeSentTime: number | null;
  lastMagicLinkSentTime: number | null;

  // Rate limiting and cooldowns
  canResendCode: boolean;
  resendCooldownSeconds: number;
  resendAttempts: number;

  // Last operation results
  lastSentEmail: string | null;
  lastError: Error | null;
  lastSuccessfulAuth: number | null;
}

/**
 * Email auth store actions
 */
export interface EmailAuthActions {
  // PIN code methods
  sendCode: (email: string) => Promise<{ success: boolean; message: string; timestamp: number }>;
  verifyCode: (email: string, code: string) => Promise<SignInData>;
  resendCode: (email: string) => Promise<{ success: boolean; message: string; timestamp: number }>;

  // Magic link methods
  sendMagicLink: (email: string) => Promise<SignInData | null>;

  // User check methods
  checkUser: (email: string) => Promise<{
    exists: boolean;
    hasWebAuthn: boolean;
    emailVerified: boolean;
    hasValidPin?: boolean;
    pinRemainingMinutes?: number;
  }>;

  // State management
  setCodeSent: (sent: boolean) => void;
  setCodeVerified: (verified: boolean) => void;
  setMagicLinkSent: (sent: boolean) => void;
  startResendCooldown: (seconds?: number) => void;
  clearError: () => void;
  reset: () => void;
}

/**
 * Combined email auth store interface
 */
export interface EmailAuthStore extends EmailAuthState, EmailAuthActions {}

/**
 * Initial state for the email auth store
 */
const initialState: EmailAuthState = {
  isSendingCode: false,
  isVerifyingCode: false,
  isSendingMagicLink: false,
  codeSent: false,
  codeVerified: false,
  magicLinkSent: false,
  lastCodeSentTime: null,
  lastMagicLinkSentTime: null,
  canResendCode: true,
  resendCooldownSeconds: 0,
  resendAttempts: 0,
  lastSentEmail: null,
  lastError: null,
  lastSuccessfulAuth: null
};

/**
 * Create the email authentication store
 */
export function createEmailAuthStore(options: StoreOptions) {
  const { config, devtools: enableDevtools = false, name = 'email-auth', api } = options;

  // Helper function to get effective app code
  const getEffectiveAppCode = (): string | undefined => {
    if (config.appCode === false || config.appCode === null || config.appCode === undefined) {
      return undefined;
    }
    if (typeof config.appCode === 'string') {
      return config.appCode;
    }
    if (config.appCode === true) {
      return 'app';
    }
    return undefined;
  };

  const storeImpl = (
    set: (
      partial: Partial<EmailAuthStore> | ((state: EmailAuthStore) => Partial<EmailAuthStore>)
    ) => void,
    get: () => EmailAuthStore
  ) => ({
    ...initialState,

    // Same implementation as above for non-devtools version
    sendCode: async (email: string) => {
      try {
        set({
          isSendingCode: true,
          lastError: null,
          lastSentEmail: email
        });

        console.log('📧 Sending email code:', { email, appCode: getEffectiveAppCode() });

        let response;
        if (getEffectiveAppCode()) {
          response = await api.sendAppEmailCode(email);
        } else {
          const magicResponse = await api.signInWithMagicLink({ email });
          response = {
            success: magicResponse.step === 'magic-link' || !!magicResponse.magicLinkSent,
            message: 'Magic link sent to your email',
            timestamp: Date.now()
          };
        }

        if (response?.success) {
          set({
            isSendingCode: false,
            codeSent: true,
            lastCodeSentTime: Date.now(),
            resendAttempts: get().resendAttempts + 1
          });

          get().startResendCooldown();
        }

        console.log('✅ Email code sent successfully');
        return response || { success: true, message: 'Code sent', timestamp: Date.now() };
      } catch (error) {
        const sendError = error as Error;

        set({
          isSendingCode: false,
          lastError: sendError
        });

        console.error('❌ Failed to send email code:', sendError);
        throw error;
      }
    },

    verifyCode: async (email: string, code: string) => {
      try {
        set({
          isVerifyingCode: true,
          lastError: null
        });

        console.log('🔍 Verifying email code:', { email, hasCode: !!code });

        if (!getEffectiveAppCode()) {
          set({ isVerifyingCode: false });
          throw new Error(
            'Email code verification is only available with organization configuration. This email uses magic link authentication instead.'
          );
        }

        const response = await api.verifyAppEmailCode(email, code);

        if (response.step === 'success' && response.user && response.access_token) {
          set({
            isVerifyingCode: false,
            codeVerified: true,
            lastSuccessfulAuth: Date.now(),
            lastError: null
          });

          console.log('✅ Email code verified successfully');

          // Convert SignInResponse to SignInData immediately
          const signInData = createSessionData(
            response.user,
            {
              access_token: response.access_token,
              refresh_token: response.refresh_token,
              expires_in: response.expires_in
            },
            'email-code'
          );

          return signInData;
        }

        // Ensure loading is cleared before throwing
        set({ isVerifyingCode: false });
        throw new Error('Invalid response from email code verification');
      } catch (error) {
        const verifyError = error as Error;

        set({
          isVerifyingCode: false,
          lastError: verifyError
        });

        console.error('❌ Email code verification failed:', verifyError);
        throw error;
      }
    },

    resendCode: async (email: string) => {
      const state = get();

      if (!state.canResendCode) {
        throw new Error(`Please wait ${state.resendCooldownSeconds} seconds before resending`);
      }

      if (state.resendAttempts >= 3) {
        throw new Error('Maximum resend attempts reached. Please try again later.');
      }

      return await get().sendCode(email);
    },

    sendMagicLink: async (email: string) => {
      try {
        set({
          isSendingMagicLink: true,
          lastError: null,
          lastSentEmail: email
        });

        console.log('🔗 Sending magic link:', { email });

        const response = await api.signInWithMagicLink({ email });

        set({
          isSendingMagicLink: false,
          magicLinkSent: true,
          lastMagicLinkSentTime: Date.now()
        });

        console.log('✅ Magic link sent successfully');

        // Magic link just sends email, no immediate auth data
        // Return null - caller should wait for user to click link
        return null;
      } catch (error) {
        const linkError = error as Error;

        set({
          isSendingMagicLink: false,
          lastError: linkError
        });

        console.error('❌ Failed to send magic link:', linkError);
        throw error;
      }
    },

    checkUser: async (email: string) => {
      try {
        console.log('🔍 Checking user:', { email });

        const result = await api.checkEmail(email);

        if (!result) {
          console.error('❌ Error checking user: No result from API');
          throw new Error('Failed to check user - no response from API');
        }

        const hasValidPin = checkForValidPin(result);
        const pinRemainingMinutes = getRemainingPinMinutes(result);

        console.log('✅ User check completed:', {
          exists: result.exists,
          hasWebAuthn: result.hasWebAuthn,
          hasValidPin,
          pinRemainingMinutes
        });

        return {
          exists: result.exists,
          hasWebAuthn: result.hasWebAuthn || false,
          emailVerified: result.emailVerified || false,
          hasValidPin,
          pinRemainingMinutes
        };
      } catch (error) {
        console.error('❌ Error checking user:', error);
        return {
          exists: false,
          hasWebAuthn: false,
          emailVerified: false
        };
      }
    },

    setCodeSent: (sent: boolean) => {
      set({ codeSent: sent });
    },

    setCodeVerified: (verified: boolean) => {
      set({ codeVerified: verified });
    },

    setMagicLinkSent: (sent: boolean) => {
      set({ magicLinkSent: sent });
    },

    startResendCooldown: (seconds = 30) => {
      set({
        canResendCode: false,
        resendCooldownSeconds: seconds
      });

      const interval = setInterval(() => {
        const currentSeconds = get().resendCooldownSeconds;
        if (currentSeconds <= 1) {
          set({
            canResendCode: true,
            resendCooldownSeconds: 0
          });
          clearInterval(interval);
        } else {
          set({ resendCooldownSeconds: currentSeconds - 1 });
        }
      }, 1000);
    },

    clearError: () => {
      set({ lastError: null });
    },

    reset: () => {
      set(initialState);
    }
  });

  const store = createStore<EmailAuthStore>()(
    subscribeWithSelector(enableDevtools ? devtools(storeImpl, { name }) : storeImpl)
  );

  return store;
}

/**
 * Helper functions for PIN validation (extracted from original auth-store)
 */
function checkForValidPin(userCheck: any): boolean {
  if (!userCheck || !userCheck.lastPinExpiry) return false;

  try {
    const expiryTime = new Date(userCheck.lastPinExpiry);
    const now = new Date();
    return expiryTime > now;
  } catch (error) {
    console.error('Error parsing pin expiry time:', error);
    return false;
  }
}

function getRemainingPinMinutes(userCheck: any): number {
  if (!userCheck || !userCheck.lastPinExpiry) return 0;

  try {
    const expiryTime = new Date(userCheck.lastPinExpiry);
    const now = new Date();
    const remainingMs = expiryTime.getTime() - now.getTime();

    if (Number.isNaN(remainingMs)) return 0;
    return Math.max(0, Math.ceil(remainingMs / (1000 * 60)));
  } catch (error) {
    console.error('Error calculating pin remaining time:', error);
    return 0;
  }
}

/**
 * Helper to get email auth capabilities
 */
export function getEmailAuthCapabilities(
  emailStore: ReturnType<typeof createEmailAuthStore>,
  config: { appCode?: string | boolean; enableMagicLinks?: boolean }
) {
  const state = emailStore.getState();

  const hasAppCode =
    !!config.appCode && (typeof config.appCode === 'string' || config.appCode === true);

  return {
    canSendCode: hasAppCode,
    canSendMagicLink: config.enableMagicLinks || !hasAppCode,
    canResendCode: state.canResendCode && state.resendAttempts < 3,
    resendCooldown: state.resendCooldownSeconds,
    recommendedMethod: hasAppCode ? 'email-code' : 'magic-link'
  };
}

/**
 * Helper to check if email operation is in progress
 */
export function isEmailOperationInProgress(
  emailStore: ReturnType<typeof createEmailAuthStore>
): boolean {
  const state = emailStore.getState();
  return state.isSendingCode || state.isVerifyingCode || state.isSendingMagicLink;
}
