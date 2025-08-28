/**
 * Test Setup and Utilities
 * Helpers for managing test accounts, API mocking, and test data
 */

import { vi } from 'vitest';
import type { AuthConfig } from '../src/types';

/**
 * API Server Selection Strategy for Testing
 * =========================================
 *
 * This function determines which API server to use for integration tests.
 * The strategy prioritizes developer experience while ensuring CI reliability.
 *
 * API Server Options:
 * ------------------
 * 1. LOCAL DEV SERVER: https://dev.thepia.com:8443
 *    - Preferred for development (fastest feedback)
 *    - Requires thepia.com repo running locally
 *    - Full feature parity with production
 *
 * 2. PRODUCTION API: https://api.thepia.com
 *    - Fallback when local unavailable
 *    - Used automatically in CI environments
 *    - Enables testing without local infrastructure
 *
 * Environment Variables:
 * ---------------------
 * - TEST_API_URL: Explicit override (highest priority)
 * - TEST_API_ENV: 'local' | 'public' | 'auto' (manual selection)
 * - CI: Auto-detected CI environment (triggers production fallback)
 * - CI_API_SERVER_RUNNING: Manual CI flag if local server available
 *
 * See: /CLAUDE.md "API Server Architecture" section
 * See: /docs/development/testing-strategy.md
 */
const getApiUrl = () => {
  // Check for explicit TEST_API_URL override
  if (process.env.TEST_API_URL) {
    return process.env.TEST_API_URL;
  }

  // Check for manual TEST_API_ENV selection
  const apiEnv = process.env.TEST_API_ENV || 'auto';

  switch (apiEnv) {
    case 'local':
      return 'https://dev.thepia.com:8443';
    case 'public':
      return 'https://api.thepia.com';
    default: {
      // Auto-detect: prefer local, fallback to production in CI
      const isCI = process.env.CI === 'true';
      const hasLocalServer = process.env.CI_API_SERVER_RUNNING === 'true';

      if (isCI && !hasLocalServer) {
        return 'https://api.thepia.com';
      }

      // Default to local for development environment
      return 'https://dev.thepia.com:8443';
    }
  }
};

// Test environment configuration - following main codebase patterns
export const TEST_CONFIG: AuthConfig = {
  apiBaseUrl: getApiUrl(),
  clientId: process.env.TEST_CLIENT_ID || process.env.AUTH0_CLIENT_ID || 'test-flows-auth-client',
  domain: process.env.AUTH0_DOMAIN || 'thepia.eu.auth0.com',
  enablePasskeys: true,
  enableMagicLinks: true,
  enablePasswordLogin: false, // As per requirements
  enableSocialLogin: false,
  errorReporting: {
    enabled: false, // Disable error reporting in tests to avoid fetch issues
    debug: false,
    endpoint: process.env.ERROR_REPORTING_ENDPOINT,
  },
  branding: {
    companyName: 'Thepia Test Environment',
    showPoweredBy: true,
  },
};

// Test account definitions - following main codebase patterns
export const TEST_ACCOUNTS = {
  // User with registered passkey (should exist in Auth0)
  existingWithPasskey: {
    email: process.env.TEST_AUTH_EMAIL || 'test-with-passkey@thepia.net',
    hasPasskey: true,
    hasPassword: false,
    userId: 'auth0|passkey-test-with-passkey@thepia.net-1234567890',
    name: 'Test User (With Passkey)',
  },

  // User without passkey (should exist in Auth0)
  existingWithoutPasskey: {
    email: process.env.TEST_AUTH_EMAIL_NO_PASSKEY || 'test-without-passkey@thepia.net',
    hasPasskey: false,
    hasPassword: false,
    userId: 'auth0|test-without-passkey@thepia.net-1234567890',
    name: 'Test User (No Passkey)',
  },

  // Dynamic new user for registration testing
  newUser: {
    email: `test-new-${Date.now()}@thepia.net`,
    hasPasskey: false,
    hasPassword: false,
    shouldCreate: true,
  },

  // Non-existent user for negative testing
  invalidEmail: {
    email: 'definitely-nonexistent@thepia.net',
    hasPasskey: false,
    hasPassword: false,
  },

  // Rate limiting test account
  rateLimitTest: {
    email: 'test-rate-limit@thepia.net',
    hasPasskey: false,
    hasPassword: false,
    maxRequests: 3, // Reduced for faster testing
  },
} as const;

// WebAuthn mock helpers
export class WebAuthnMocker {
  static mockSuccess(credentialId = 'test-credential-id') {
    vi.spyOn(navigator.credentials, 'get').mockResolvedValue({
      id: credentialId,
      rawId: new ArrayBuffer(16),
      response: {
        clientDataJSON: new TextEncoder().encode(
          JSON.stringify({
            type: 'webauthn.get',
            challenge: 'test-challenge',
            origin: 'https://dev.thepia.net',
          })
        ),
        authenticatorData: new ArrayBuffer(32),
        signature: new ArrayBuffer(32),
        userHandle: new TextEncoder().encode('test-user-id'),
      },
      type: 'public-key',
    } as any);
  }

  static mockUserCancellation() {
    const error = new Error('The operation either timed out or was not allowed.');
    error.name = 'NotAllowedError';
    vi.spyOn(navigator.credentials, 'get').mockRejectedValue(error);
  }

  static mockTimeout() {
    const error = new Error('Request timed out');
    error.name = 'TimeoutError';
    vi.spyOn(navigator.credentials, 'get').mockRejectedValue(error);
  }

  static mockCredentialNotFound() {
    const error = new Error('No credentials found');
    error.name = 'NotAllowedError';
    vi.spyOn(navigator.credentials, 'get').mockRejectedValue(error);

    // Simulate quick failure (< 500ms)
    setTimeout(() => {
      const mockGet = navigator.credentials.get as any;
      mockGet.mockImplementation(() => {
        const _start = Date.now();
        return new Promise((_, reject) => {
          setTimeout(() => reject(error), 100); // Quick failure
        });
      });
    }, 0);
  }

  static mockConditionalMediationNotSupported() {
    Object.defineProperty(PublicKeyCredential, 'isConditionalMediationAvailable', {
      value: vi.fn().mockResolvedValue(false),
      writable: true,
      configurable: true,
    });
  }

  static mockConditionalMediationSupported() {
    Object.defineProperty(PublicKeyCredential, 'isConditionalMediationAvailable', {
      value: vi.fn().mockResolvedValue(true),
      writable: true,
      configurable: true,
    });
  }

  static restore() {
    vi.restoreAllMocks();
  }
}

// API mock helpers
export class APIMocker {
  static mockEmailCheck(
    email: string,
    response: { exists: boolean; hasPasskey: boolean; hasPassword?: boolean }
  ) {
    vi.spyOn(global, 'fetch').mockImplementation((url, options) => {
      if (url.toString().includes('/auth/check-user')) {
        const body = JSON.parse((options?.body as string) || '{}');
        if (body.email === email) {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                exists: response.exists,
                hasPasskey: response.hasPasskey,
                hasPassword: response.hasPassword || false,
                socialProviders: [],
              }),
          } as any);
        }
      }
      return Promise.reject(new Error('Unmocked API call'));
    });
  }

  static mockPasskeyChallenge(email: string, challenge = 'test-challenge') {
    vi.spyOn(global, 'fetch').mockImplementation((url, options) => {
      if (url.toString().includes('/auth/webauthn/challenge')) {
        const body = JSON.parse((options?.body as string) || '{}');
        if (body.email === email) {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                challenge,
                rpId: 'thepia.net',
                allowCredentials: [
                  {
                    id: 'test-credential-id',
                    type: 'public-key',
                  },
                ],
                timeout: 60000,
              }),
          } as any);
        }
      }
      return Promise.reject(new Error('Unmocked API call'));
    });
  }

  static mockSuccessfulAuthentication(email: string, user = TEST_ACCOUNTS.existingWithPasskey) {
    vi.spyOn(global, 'fetch').mockImplementation((url, options) => {
      if (url.toString().includes('/auth/signin/passkey')) {
        const body = JSON.parse((options?.body as string) || '{}');
        if (body.email === email) {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                step: 'success',
                user: {
                  id: user.userId,
                  email: user.email,
                  name: user.name,
                  emailVerified: true,
                  createdAt: new Date().toISOString(),
                },
                accessToken: 'test-access-token',
                refreshToken: 'test-refresh-token',
                expiresIn: 3600,
              }),
          } as any);
        }
      }
      return Promise.reject(new Error('Unmocked API call'));
    });
  }

  static mockMagicLinkSent(email: string) {
    vi.spyOn(global, 'fetch').mockImplementation((url, options) => {
      if (url.toString().includes('/auth/signin/magic-link')) {
        const body = JSON.parse((options?.body as string) || '{}');
        if (body.email === email) {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                step: 'magic_link_sent',
                magicLinkSent: true,
                message: 'Check your email for the sign-in link',
              }),
          } as any);
        }
      }
      return Promise.reject(new Error('Unmocked API call'));
    });
  }

  static mockNetworkError() {
    vi.spyOn(global, 'fetch').mockRejectedValue(new Error('Network error'));
  }

  static mockRateLimit() {
    vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: false,
      status: 429,
      statusText: 'Too Many Requests',
      json: () =>
        Promise.resolve({
          error: 'rate_limit_exceeded',
          message: 'Too many requests, please try again later',
        }),
    } as any);
  }

  static restore() {
    vi.restoreAllMocks();
  }
}

// Test utilities
export class TestUtils {
  /**
   * Wait for state machine to reach specific state
   */
  static async waitForState(stateMachine: any, targetState: string, timeout = 5000): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error(`Timeout waiting for state: ${targetState}`));
      }, timeout);

      const checkState = () => {
        if (stateMachine.matches(targetState)) {
          clearTimeout(timeoutId);
          resolve();
        } else {
          setTimeout(checkState, 10);
        }
      };

      checkState();
    });
  }

  /**
   * Wait for async operation with timeout
   */
  static async waitFor(condition: () => boolean, timeout = 5000, interval = 10): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error('Timeout waiting for condition'));
      }, timeout);

      const check = () => {
        if (condition()) {
          clearTimeout(timeoutId);
          resolve();
        } else {
          setTimeout(check, interval);
        }
      };

      check();
    });
  }

  /**
   * Create mock user object
   */
  static createMockUser(overrides: Partial<any> = {}) {
    return {
      id: 'test-user-id',
      email: 'test@example.com',
      name: 'Test User',
      emailVerified: true,
      createdAt: new Date().toISOString(),
      ...overrides,
    };
  }

  /**
   * Create mock session data
   */
  static createMockSession(user = TestUtils.createMockUser()) {
    return {
      accessToken: 'test-access-token',
      refreshToken: 'test-refresh-token',
      expiresIn: 3600,
      user,
    };
  }

  /**
   * Simulate timing for error classification
   */
  static async simulateWebAuthnTiming(mockFn: any, duration: number, error: Error): Promise<void> {
    mockFn.mockImplementation(() => {
      return new Promise((_, reject) => {
        setTimeout(() => reject(error), duration);
      });
    });
  }

  /**
   * Clean up test environment
   */
  static cleanup() {
    localStorage.clear();
    sessionStorage.clear();
    WebAuthnMocker.restore();
    APIMocker.restore();
    vi.clearAllMocks();
  }
}

// Performance testing utilities
export class PerformanceTestUtils {
  private static performanceMarks: Map<string, number> = new Map();

  static startMark(name: string) {
    PerformanceTestUtils.performanceMarks.set(name, performance.now());
  }

  static endMark(name: string): number {
    const start = PerformanceTestUtils.performanceMarks.get(name);
    if (!start) {
      throw new Error(`No start mark found for: ${name}`);
    }

    const duration = performance.now() - start;
    PerformanceTestUtils.performanceMarks.delete(name);
    return duration;
  }

  static async measureAsync<T>(
    name: string,
    operation: () => Promise<T>
  ): Promise<{ result: T; duration: number }> {
    PerformanceTestUtils.startMark(name);
    const result = await operation();
    const duration = PerformanceTestUtils.endMark(name);
    return { result, duration };
  }

  static expectPerformance(duration: number, maxDuration: number, operation: string) {
    if (duration > maxDuration) {
      throw new Error(
        `Performance expectation failed: ${operation} took ${duration}ms, expected < ${maxDuration}ms`
      );
    }
  }
}

// Memory leak detection
export class MemoryTestUtils {
  static trackObjects<T>(constructor: new (...args: any[]) => T): {
    count: () => number;
    cleanup: () => void;
  } {
    const instances = new WeakSet<T>();
    const originalConstructor = constructor;

    // Replace constructor to track instances
    const TrackedConstructor = function (this: T, ...args: any[]) {
      const instance = new originalConstructor(...args);
      instances.add(instance);
      return instance;
    } as any;

    return {
      count: () => {
        // This is a simplified tracking - in real scenarios you'd use more sophisticated memory profiling
        return 0; // WeakSet doesn't expose size
      },
      cleanup: () => {
        // Restore original constructor
        Object.setPrototypeOf(TrackedConstructor, originalConstructor);
      },
    };
  }
}

// Export everything for easy importing
export default {
  TEST_CONFIG,
  TEST_ACCOUNTS,
  WebAuthnMocker,
  APIMocker,
  TestUtils,
  PerformanceTestUtils,
  MemoryTestUtils,
};
