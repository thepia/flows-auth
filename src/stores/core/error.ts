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
        lastFailedRequest: null
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
  const message = error instanceof Error ? error.message : String(error);
  const timestamp = Date.now();

  // Network and service availability errors
  if (
    message.includes('fetch') ||
    message.includes('network') ||
    message.includes('Failed to fetch')
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
    message.includes('404') ||
    message.includes('endpoint') ||
    message.includes('not found') ||
    message.includes('500') ||
    message.includes('502') ||
    message.includes('503')
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
    message.includes('user not found') ||
    message.includes('User not found') ||
    (message.includes('404') && context?.method === 'checkUser')
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
    message.includes('NotAllowedError') ||
    message.includes('cancelled') ||
    message.includes('aborted')
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
    message.includes('webauthn') ||
    message.includes('passkey') ||
    message.includes('credential')
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
    message.includes('rate limit') ||
    message.includes('too many requests') ||
    message.includes('429')
  ) {
    return {
      code: 'error.rateLimited',
      message,
      retryable: true,
      timestamp,
      context
    };
  }

  // Invalid input
  if (message.includes('invalid') || message.includes('validation') || message.includes('400')) {
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
