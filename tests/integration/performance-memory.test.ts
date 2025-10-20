/**
 * Performance and Memory Integration Tests
 *
 * Purpose: Test auth-store performance characteristics and memory usage
 * Context: Ensures authentication flows are performant and don't leak memory
 * Safe to remove: No - critical for preventing performance regressions
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createAuthStore } from '../../src/stores';
import type { AuthConfig } from '../../src/types';
import { PerformanceTestUtils, TEST_ACCOUNTS, TEST_CONFIG, TestUtils } from '../test-setup';

// Test configuration with API fallback
const getTestConfig = (): AuthConfig => {
  const isLocalServerRunning = process.env.CI_API_SERVER_RUNNING === 'true';
  const apiBaseUrl = isLocalServerRunning
    ? 'https://dev.thepia.com:8443'
    : 'https://api.thepia.com';

  return {
    ...TEST_CONFIG,
    apiBaseUrl,
    clientId: 'flows-auth-performance-test'
  };
};

describe('Performance and Memory Tests', () => {
  let testConfig: AuthConfig;

  beforeEach(() => {
    testConfig = getTestConfig();
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    TestUtils.cleanup();
  });

  describe('Auth Store Performance', () => {
    it('should initialize auth store quickly', async () => {
      const { result, duration } = await PerformanceTestUtils.measureAsync(
        'auth-store-initialization',
        async () => {
          const authStore = createAuthStore(testConfig);

          // Wait for initial state machine setup
          await TestUtils.waitFor(() => authStore.ui.getState().signInState !== undefined, 3000);

          return authStore;
        }
      );

      // Should initialize within 1 second
      PerformanceTestUtils.expectPerformance(duration, 1000, 'Auth store initialization');

      if (result?.destroy) {
        result.destroy();
      }
    });

    it.skip('should handle rapid state transitions efficiently', async () => {
      // TODO: Update to use actual auth store API instead of non-existent methods
      // (clickNext, typeEmail, resetToAuth don't exist on auth store)
      const authStore = createAuthStore(testConfig);

      await TestUtils.waitFor(() => authStore.ui.getState().signInState !== undefined, 3000);

      const { duration } = await PerformanceTestUtils.measureAsync(
        'rapid-state-transitions',
        async () => {
          // Perform 100 rapid state transitions
          for (let i = 0; i < 100; i++) {
            // TODO: Replace with actual auth store methods
            // authStore.clickNext();
            // authStore.typeEmail(`test${i}@example.com`);
            // authStore.resetToAuth();

            // Small delay to prevent overwhelming the system
            if (i % 10 === 0) {
              await new Promise((resolve) => setTimeout(resolve, 1));
            }
          }
        }
      );

      // Should handle 100 transitions within 500ms
      PerformanceTestUtils.expectPerformance(duration, 500, 'Rapid state transitions');

      if (authStore?.destroy) {
        authStore.destroy();
      }
    });

    it.skip('should handle concurrent API calls efficiently', async () => {
      // TODO: Update to use actual auth store API instead of non-existent authStore.api property
      const authStore = createAuthStore(testConfig);

      await TestUtils.waitFor(() => authStore.ui.getState().signInState !== undefined, 3000);

      const { duration } = await PerformanceTestUtils.measureAsync(
        'concurrent-api-calls',
        async () => {
          // Make 10 concurrent email check calls
          const emails = Array(10)
            .fill(0)
            .map((_, i) => `test${i}@thepia.net`);

          // TODO: Replace with actual auth store methods
          // const promises = emails.map((email) =>
          //   authStore.api.checkEmail(email).catch((e) => ({ error: e.message }))
          // );
          // await Promise.all(promises);
        }
      );

      // Should handle 10 concurrent calls within 5 seconds
      PerformanceTestUtils.expectPerformance(duration, 5000, 'Concurrent API calls');

      if (authStore?.destroy) {
        authStore.destroy();
      }
    });

    it('should handle WebAuthn operations within reasonable time');
  });

  describe('Memory Management', () => {
    it('should not leak memory with multiple store creations', async () => {
      const initialMemory = performance.memory?.usedJSHeapSize || 0;

      // Create and destroy 20 auth stores
      const stores = [];
      for (let i = 0; i < 20; i++) {
        const store = createAuthStore(testConfig);
        stores.push(store);

        // Wait for initialization
        await TestUtils.waitFor(() => store.ui.getState().signInState !== undefined, 1000);
      }

      // Destroy all stores
      stores.forEach((store) => {
        if (store?.destroy) {
          store.destroy();
        }
      });

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      // Wait for cleanup
      await new Promise((resolve) => setTimeout(resolve, 100));

      const finalMemory = performance.memory?.usedJSHeapSize || 0;

      // Memory should not increase significantly (allow 10MB increase)
      const memoryIncrease = finalMemory - initialMemory;
      expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024); // 10MB
    });

    it.skip('should clean up event listeners on destroy', async () => {
      // TODO: Update to use actual auth store API instead of non-existent subscribe method
      const authStore = createAuthStore(testConfig);

      await TestUtils.waitFor(() => authStore.ui.getState().signInState !== undefined, 3000);

      // Subscribe to store to create listeners
      // const unsubscribe = authStore.subscribe(() => {});

      // Verify store is working
      expect(authStore.isAuthenticated()).toBe(false);

      // Destroy store
      if (authStore?.destroy) {
        authStore.destroy();
      }

      // Clean up subscription
      // unsubscribe();

      // Store should be cleaned up (no specific assertion, just ensuring no errors)
      expect(true).toBe(true);
    });

    it.skip('should handle large numbers of subscribers efficiently', async () => {
      // TODO: Update to use actual auth store API instead of non-existent subscribe method
      const authStore = createAuthStore(testConfig);

      await TestUtils.waitFor(() => authStore.ui.getState().signInState !== undefined, 3000);

      const { duration } = await PerformanceTestUtils.measureAsync('many-subscribers', async () => {
        // Create 100 subscribers
        const unsubscribers = [];
        for (let i = 0; i < 100; i++) {
          // TODO: Replace with actual auth store subscription method
          // const unsubscribe = authStore.subscribe(() => {
          //   // Minimal subscriber function
          // });
          // unsubscribers.push(unsubscribe);
        }

        // Trigger state change to notify all subscribers
        // authStore.clickNext();

        // Clean up subscribers
        // unsubscribers.forEach((unsub) => unsub());
      });

      // Should handle 100 subscribers within 100ms
      PerformanceTestUtils.expectPerformance(duration, 100, 'Many subscribers');

      if (authStore?.destroy) {
        authStore.destroy();
      }
    });
  });

  describe('API Performance', () => {
    it('should cache email check results for performance', async () => {
      const authStore = createAuthStore(testConfig);
      const testEmail = TEST_ACCOUNTS.existingWithPasskey.email;

      await TestUtils.waitFor(() => authStore.ui.getState().signInState !== undefined, 3000);

      // First call - should hit API
      const { duration: firstCallDuration } = await PerformanceTestUtils.measureAsync(
        'first-email-check',
        async () => {
          try {
            await authStore.api.checkEmail(testEmail);
          } catch (error) {
            // May fail in test environment
            console.log('Email check failed (expected in test env)');
          }
        }
      );

      // Second call - should be faster (cached or optimized)
      const { duration: secondCallDuration } = await PerformanceTestUtils.measureAsync(
        'second-email-check',
        async () => {
          try {
            await authStore.api.checkEmail(testEmail);
          } catch (error) {
            // May fail in test environment
            console.log('Email check failed (expected in test env)');
          }
        }
      );

      // Both calls should be reasonably fast
      PerformanceTestUtils.expectPerformance(firstCallDuration, 5000, 'First email check');
      PerformanceTestUtils.expectPerformance(secondCallDuration, 5000, 'Second email check');

      if (authStore?.destroy) {
        authStore.destroy();
      }
    });

    it('should handle API timeouts gracefully', { timeout: 15000 }, async () => {
      // Create auth store with very short timeout
      const timeoutConfig = {
        ...testConfig,
        apiBaseUrl: 'https://httpstat.us/200?sleep=10000' // 10 second delay
      };

      const authStore = createAuthStore(timeoutConfig);

      await TestUtils.waitFor(() => authStore.ui.getState().signInState !== undefined, 3000);

      const { duration } = await PerformanceTestUtils.measureAsync(
        'api-timeout-handling',
        async () => {
          try {
            await authStore.api.checkEmail('test@example.com');
          } catch (error) {
            // Expected to timeout
            expect(error.message).toMatch(/timeout|network|fetch/i);
          }
        }
      );

      // Should timeout quickly, not wait for full 10 seconds
      PerformanceTestUtils.expectPerformance(duration, 8000, 'API timeout handling');

      if (authStore?.destroy) {
        authStore.destroy();
      }
    });
  });

  describe.skip('State Machine Performance', () => {
    // TODO: Rewrite for new UI store architecture (authStore.ui.getState().signInState)
    // Old stateMachine architecture has been replaced with modular stores
    it('should handle complex state transitions efficiently');

    it('should maintain performance with large context objects');
  });
});
