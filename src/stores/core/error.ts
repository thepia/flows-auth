/**
 * Error Management Store
 *
 * Handles API errors, error classification, and retry logic:
 * - Error classification into user-friendly types
 * - API error state management
 * - Retry mechanism for failed requests
 * - Error reporting and logging
 */

import { devtools, subscribeWithSelector } from 'zustand/middleware';
import { createStore } from 'zustand/vanilla';
import type { ApiError } from '../../types';
import type { ErrorActions, ErrorState, ErrorStore, StoreOptions } from '../types';

/**
 * Initial state for the error store
 */
const initialState: ErrorState = {
  apiError: null,
  uiError: null,
  lastFailedRequest: null
};

/**
 * Create the error management store
 */
export function createErrorStore(options: StoreOptions) {
  const { devtools: enableDevtools = false, name = 'error' } = options;

  const storeImpl = (
    set: (partial: Partial<ErrorStore> | ((state: ErrorStore) => Partial<ErrorStore>)) => void,
    get: () => ErrorStore
  ) => ({
    ...initialState,

    setApiError: (error: unknown, context?: { method?: string; email?: string }) => {
      const apiError = classifyError(error, context);

      set({
        apiError,
        uiError: apiError, // Also set as UI error by default
        lastFailedRequest: context?.method
          ? { method: context.method, args: [] }
          : get().lastFailedRequest
      });

      // Log error for debugging
      console.error('API Error:', apiError);
    },

    clearApiError: () => {
      set({
        apiError: null,
        uiError: null,
        lastFailedRequest: null
      });
    },

    clearUiError: () => {
      // Clear only UI error, keep apiError for debugging/logging
      set({
        uiError: null
      });
    },

    retryLastRequest: async () => {
      const state = get();

      if (!state.apiError || !state.apiError.retryable || !state.lastFailedRequest) {
        return false;
      }

      // Clear error state for retry
      set({ apiError: null });

      try {
        // This would need to be implemented based on the specific method
        // For now, just clear the error and return true
        console.log('Retrying last failed request:', state.lastFailedRequest.method);
        return true;
      } catch (error) {
        // Restore error state if retry fails
        get().setApiError(error, { method: state.lastFailedRequest.method });
        return false;
      }
    }
  });

  const store = createStore<ErrorStore>()(
    subscribeWithSelector(enableDevtools ? devtools(storeImpl, { name }) : storeImpl)
  );

  return store;
}

/**
 * Classify technical errors into user-friendly ApiError objects
 * Extracted from the original auth-store.ts implementation
 */
function classifyError(error: unknown, context?: { method?: string; email?: string }): ApiError {
  const timestamp = Date.now();

  // If error is already an AuthError object from the API, use its code directly
  if (error && typeof error === 'object') {
    const errObj = error as any;

    // Server already sent us a structured error code - map it to our error codes
    if (errObj.code && errObj.code !== 'unknown_error') {
      const serverCode = errObj.code;
      const message = errObj.message || errObj.error || String(error);

      // Special case: server sends 'network_error' for HTTP 500/502/503 which is actually service unavailable
      if (serverCode === 'network_error' && (message.includes('500') || message.includes('502') || message.includes('503'))) {
        return {
          code: 'error.serviceUnavailable',
          message,
          retryable: true,
          timestamp,
          context
        };
      }

      // Map server error codes to client error codes (skip unknown_error - it needs message analysis)
      const codeMapping: Record<string, string> = {
        'invalid_one_time_code': 'error.invalidCode',
        'invalid_verification_code': 'error.invalidCode',
        'expired_code': 'error.invalidCode',
        'verification_failed': 'error.invalidCode',  // Added: from auth-store error wrapping
        'rate_limit_exceeded': 'error.rateLimited',
        'too_many_requests': 'error.rateLimited',
        'network_error': 'error.network',
        'user_not_found': 'error.userNotFound'
      };

      const mappedCode = codeMapping[serverCode];
      if (mappedCode) {
        return {
          code: mappedCode as any,
          message,
          retryable: mappedCode !== 'error.invalidCode' && mappedCode !== 'error.userNotFound',
          timestamp,
          context
        };
      }
    }
  }

  // Extract error message from various error types (fallback for non-structured errors)
  let message: string;
  if (error instanceof Error) {
    message = error.message;
  } else if (typeof error === 'string') {
    message = error;
  } else if (error && typeof error === 'object') {
    const errObj = error as any;
    message = errObj.message || errObj.error || JSON.stringify(error);
  } else {
    message = String(error);
  }

  // Use lowercase for case-insensitive matching (fallback for legacy errors)
  const lowerMessage = message.toLowerCase();

  // Network and service availability errors
  if (
    lowerMessage.includes('fetch') ||
    lowerMessage.includes('network') ||
    lowerMessage.includes('failed to fetch')
  ) {
    return {
      code: 'error.network',
      message,
      retryable: true,
      timestamp,
      context
    };
  }

  // Service unavailable (API endpoints not found, server errors)
  if (
    lowerMessage.includes('404') ||
    lowerMessage.includes('endpoint') ||
    lowerMessage.includes('not found') ||
    lowerMessage.includes('500') ||
    lowerMessage.includes('502') ||
    lowerMessage.includes('503')
  ) {
    return {
      code: 'error.serviceUnavailable',
      message,
      retryable: true,
      timestamp,
      context
    };
  }

  // User not found errors
  if (
    lowerMessage.includes('user not found') ||
    (lowerMessage.includes('404') && context?.method === 'checkUser')
  ) {
    return {
      code: 'error.userNotFound',
      message,
      retryable: false,
      timestamp,
      context
    };
  }

  // WebAuthn cancellation
  if (
    lowerMessage.includes('notallowederr') ||
    lowerMessage.includes('cancelled') ||
    lowerMessage.includes('aborted')
  ) {
    return {
      code: 'error.authCancelled',
      message,
      retryable: true,
      timestamp,
      context
    };
  }

  // WebAuthn and passkey failures
  if (
    lowerMessage.includes('webauthn') ||
    lowerMessage.includes('passkey') ||
    lowerMessage.includes('credential')
  ) {
    return {
      code: 'error.authFailed',
      message,
      retryable: true,
      timestamp,
      context
    };
  }

  // Rate limiting
  if (
    lowerMessage.includes('rate limit') ||
    lowerMessage.includes('too many requests') ||
    lowerMessage.includes('429')
  ) {
    return {
      code: 'error.rateLimited',
      message,
      retryable: true,
      timestamp,
      context
    };
  }

  // Invalid or expired verification code (specific check before general invalid input)
  if (
    (lowerMessage.includes('invalid') && lowerMessage.includes('code')) ||
    (lowerMessage.includes('expired') && lowerMessage.includes('code')) ||
    lowerMessage.includes('invalid_one_time_code') ||
    (context?.method === 'verifyEmailCode' && lowerMessage.includes('invalid'))
  ) {
    return {
      code: 'error.invalidCode',
      message,
      retryable: false,
      timestamp,
      context
    };
  }

  // Invalid input (general)
  if (lowerMessage.includes('invalid') || lowerMessage.includes('validation') || lowerMessage.includes('400')) {
    return {
      code: 'error.invalidInput',
      message,
      retryable: false,
      timestamp,
      context
    };
  }

  // Default unknown error
  return {
    code: 'error.unknown',
    message,
    retryable: true,
    timestamp,
    context
  };
}

/**
 * Helper to check if an error is retryable
 */
export function isErrorRetryable(error: ApiError): boolean {
  return (
    error.retryable &&
    [
      'error.network',
      'error.serviceUnavailable',
      'error.authCancelled',
      'error.authFailed',
      'error.rateLimited',
      'error.unknown'
    ].includes(error.code)
  );
}

/**
 * Helper to get user-friendly error message
 */
export function getUserFriendlyErrorMessage(error: ApiError): string {
  switch (error.code) {
    case 'error.network':
      return 'Network connection issue. Please check your internet connection and try again.';

    case 'error.serviceUnavailable':
      return 'Service temporarily unavailable. Please try again in a few minutes.';

    case 'error.userNotFound':
      return 'User account not found. Please check your email address or register for a new account.';

    case 'error.authCancelled':
      return 'Authentication was cancelled. Please try again.';

    case 'error.authFailed':
      return 'Authentication failed. Please try again or use a different method.';

    case 'error.rateLimited':
      return 'Too many requests. Please wait a moment before trying again.';

    case 'error.invalidInput':
      return 'Invalid input. Please check your information and try again.';

    default:
      return 'An unexpected error occurred. Please try again.';
  }
}

/**
 * Helper to determine if error should be shown to user
 */
export function shouldShowErrorToUser(error: ApiError): boolean {
  // Don't show certain technical errors to users
  const hiddenErrorCodes = ['error.network', 'error.serviceUnavailable'];
  return !hiddenErrorCodes.includes(error.code);
}

/**
 * Helper to log error for debugging
 */
export function logError(error: ApiError, additionalContext?: Record<string, any>) {
  const logData = {
    ...error,
    additionalContext,
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
    timestamp: new Date().toISOString()
  };

  console.error('Auth Error:', logData);

  // In production, this could send to error reporting service
  if (process.env.NODE_ENV === 'production') {
    // Send to error reporting service (e.g., Sentry, LogRocket, etc.)
    // errorReportingService.captureError(logData);
  }
}

/**
 * Helper to create custom API errors
 */
export function createApiError(
  code: ApiError['code'],
  message: string,
  retryable = false,
  context?: { method?: string; email?: string }
): ApiError {
  return {
    code,
    message,
    retryable,
    timestamp: Date.now(),
    context
  };
}

/**
 * Error recovery strategies
 */
export const errorRecoveryStrategies = {
  /**
   * Exponential backoff for retryable errors
   */
  exponentialBackoff: (attempt: number, baseDelay = 1000): number => {
    return Math.min(baseDelay * Math.pow(2, attempt), 30000); // Max 30 seconds
  },

  /**
   * Check if error should trigger a retry based on attempt count
   */
  shouldRetry: (error: ApiError, attemptCount: number, maxRetries = 3): boolean => {
    return error.retryable && attemptCount < maxRetries;
  },

  /**
   * Get suggested retry delay based on error type
   */
  getRetryDelay: (error: ApiError, attemptCount: number): number => {
    switch (error.code) {
      case 'error.rateLimited':
        return 5000 * (attemptCount + 1); // 5s, 10s, 15s...

      case 'error.network':
        return errorRecoveryStrategies.exponentialBackoff(attemptCount, 500);

      case 'error.serviceUnavailable':
        return errorRecoveryStrategies.exponentialBackoff(attemptCount, 2000);

      default:
        return errorRecoveryStrategies.exponentialBackoff(attemptCount);
    }
  }
};
