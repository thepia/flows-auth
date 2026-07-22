/**
 * @file Telemetry System Unit Tests
 * @description Tests for the enhanced telemetry system with service worker caching optimization
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AuthConfig } from '../../src/core/types/index.js';

// Mock service worker registration
const mockServiceWorkerRegistration = {
  active: {
    postMessage: vi.fn()
  }
};

// Mock navigator.serviceWorker with spy
// Note: navigator.serviceWorker.ready is a property that returns a promise, not a function
const mockServiceWorkerReady = vi.fn().mockResolvedValue(mockServiceWorkerRegistration);
const mockServiceWorker = {
  get ready() {
    mockServiceWorkerReady();
    return Promise.resolve(mockServiceWorkerRegistration);
  }
};

// Mock AuthApiClient
const mockApiClient = {
  request: vi.fn()
};

// Mock the telemetry module to avoid auto-mocking issues
vi.mock('../../src/core/utils/telemetry', async () => {
  const actual = await vi.importActual('../../src/core/utils/telemetry');
  return actual;
});

// Helper function to create test config
const createTestConfig = (serviceWorkerLogging: any): AuthConfig => ({
  apiBaseUrl: 'https://api.test.com',
  clientId: 'test-client',
  domain: 'test.com',
  enablePasskeys: true,
  errorReporting: {
    enabled: true,
    serviceWorkerLogging
  }
});

describe('Telemetry System', () => {
  let initializeTelemetry: any;
  let reportAuthEvent: any;
  let reportSessionEvent: any;
  let reportRefreshEvent: any;
  let reportWebAuthnError: any;
  let resetTelemetry: any;
  beforeEach(async () => {
    // Reset all mocks
    vi.clearAllMocks();

    // Mock global navigator
    Object.defineProperty(global, 'navigator', {
      value: {
        serviceWorker: mockServiceWorker
      },
      writable: true
    });

    // Mock global window (navigator mirrors the global navigator mock above,
    // since production code reads window.navigator.userAgent)
    Object.defineProperty(global, 'window', {
      value: {
        location: { href: 'https://test.example.com' },
        name: 'test-tab',
        navigator: { userAgent: 'test-agent' }
      },
      writable: true
    });

    // Import telemetry functions
    const telemetryModule = await import('../../src/core/utils/telemetry.js');
    initializeTelemetry = telemetryModule.initializeTelemetry;
    reportAuthEvent = telemetryModule.reportAuthEvent;
    reportSessionEvent = telemetryModule.reportSessionEvent;
    reportRefreshEvent = telemetryModule.reportRefreshEvent;
    reportWebAuthnError = telemetryModule.reportWebAuthnError;
    resetTelemetry = telemetryModule.resetTelemetry;

    // Reset telemetry state between tests
    resetTelemetry();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Service Worker Caching Optimization', () => {
    it('should cache service worker registration on initialization', async () => {
      const config = createTestConfig({
        enabled: true,
        events: ['all'],
        debug: true
      });

      // Initialize telemetry
      initializeTelemetry(mockApiClient as any, config);

      // Wait for service worker initialization to complete
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Verify service worker ready was called once during initialization
      expect(mockServiceWorkerReady).toHaveBeenCalled();
    });

    it('should use cached registration for subsequent events', async () => {
      const config = createTestConfig({
        enabled: true,
        events: ['all'],
        debug: false
      });

      // Initialize telemetry
      initializeTelemetry(mockApiClient as any, config);

      // Wait for initialization to complete
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Clear the mock to count only subsequent calls
      mockServiceWorkerRegistration.active.postMessage.mockClear();

      // Send multiple events
      reportAuthEvent('TEST_EVENT_1', { test: 'data1' });
      reportAuthEvent('TEST_EVENT_2', { test: 'data2' });
      reportSessionEvent('RESTORE', { userId: 'test-user' });

      // Wait for events to be processed
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Verify postMessage was called for each event (using cached registration)
      expect(mockServiceWorkerRegistration.active.postMessage).toHaveBeenCalledTimes(3);
    });
  });

  describe('Event Filtering', () => {
    it('should filter events based on configuration', async () => {
      const config = createTestConfig({
        enabled: true,
        events: ['refresh'], // Only refresh events
        debug: false
      });

      initializeTelemetry(mockApiClient as any, config);
      await new Promise((resolve) => setTimeout(resolve, 50));

      mockServiceWorkerRegistration.active.postMessage.mockClear();

      // Send different types of events
      reportAuthEvent('SIGN_IN', { method: 'email' });
      reportSessionEvent('RESTORE', { userId: 'test' });
      reportRefreshEvent('START', { tokenPrefix: 'abc123...' });

      await new Promise((resolve) => setTimeout(resolve, 50));

      // Only refresh event should be sent
      expect(mockServiceWorkerRegistration.active.postMessage).toHaveBeenCalledTimes(1);
      expect(mockServiceWorkerRegistration.active.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'LOG_AUTH_EVENT',
          event: 'TELEMETRY_AUTH-STATE-CHANGE'
        })
      );
    });

    it('should log all events when configured with "all"', async () => {
      const config = createTestConfig({
        enabled: true,
        events: ['all'],
        debug: false
      });

      initializeTelemetry(mockApiClient as any, config);
      await new Promise((resolve) => setTimeout(resolve, 50));

      mockServiceWorkerRegistration.active.postMessage.mockClear();

      // Send different types of events
      reportAuthEvent('SIGN_IN', { method: 'email' });
      reportSessionEvent('RESTORE', { userId: 'test' });
      reportRefreshEvent('START', { tokenPrefix: 'abc123...' });

      await new Promise((resolve) => setTimeout(resolve, 50));

      // All events should be sent
      expect(mockServiceWorkerRegistration.active.postMessage).toHaveBeenCalledTimes(3);
    });
  });

  describe('Service Worker Unavailable Scenarios', () => {
    it('should handle service worker unavailable gracefully', async () => {
      // Mock service worker as unavailable
      Object.defineProperty(global, 'navigator', {
        value: {},
        writable: true
      });

      const config = createTestConfig({
        enabled: true,
        events: ['all'],
        debug: true
      });

      // Should not throw
      expect(() => {
        initializeTelemetry(mockApiClient as any, config);
      }).not.toThrow();

      // Events should not cause errors
      expect(() => {
        reportAuthEvent('TEST_EVENT', { test: 'data' });
      }).not.toThrow();
    });

    it('should handle service worker registration failure', async () => {
      // Mock service worker ready to reject
      const mockFailingServiceWorkerReady = vi
        .fn()
        .mockRejectedValue(new Error('Service worker failed'));
      const mockFailingServiceWorker = {
        ready: mockFailingServiceWorkerReady
      };

      Object.defineProperty(global, 'navigator', {
        value: {
          serviceWorker: mockFailingServiceWorker
        },
        writable: true
      });

      // Re-import telemetry with new navigator mock
      const telemetryModule = await import('../../src/core/utils/telemetry.js');
      const localInitializeTelemetry = telemetryModule.initializeTelemetry;
      const localReportAuthEvent = telemetryModule.reportAuthEvent;

      const config = createTestConfig({
        enabled: true,
        events: ['all'],
        debug: true
      });

      // Should not throw
      expect(() => {
        localInitializeTelemetry(mockApiClient as any, config);
      }).not.toThrow();

      // Wait for promise rejection to be handled
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Events should not cause errors
      expect(() => {
        localReportAuthEvent('TEST_EVENT', { test: 'data' });
      }).not.toThrow();
    });
  });

  describe('Event Data Structure', () => {
    it('should send correctly structured messages to service worker', async () => {
      const config = createTestConfig({
        enabled: true,
        events: ['all'],
        debug: false
      });

      initializeTelemetry(mockApiClient as any, config);
      await new Promise((resolve) => setTimeout(resolve, 50));

      mockServiceWorkerRegistration.active.postMessage.mockClear();

      const testData = { tokenPrefix: 'abc123...', userId: 'test-user' };
      reportRefreshEvent('START', testData);

      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(mockServiceWorkerRegistration.active.postMessage).toHaveBeenCalledWith({
        type: 'LOG_AUTH_EVENT',
        event: 'TELEMETRY_AUTH-STATE-CHANGE',
        data: expect.objectContaining({
          type: 'auth-state-change',
          event: 'refresh-START',
          context: expect.objectContaining(testData)
        }),
        url: 'https://test.example.com',
        tabId: 'test-tab'
      });
    });
  });

  describe('Dev error-reports wire contract', () => {
    // thepia.com's /dev/error-reports endpoint destructures
    // `{ errors, authStates, sessionId, timestamp }` from the POST body
    // (src/api/dev/error-reports.ts). Every event we send MUST match that
    // envelope or the server silently drops it.
    it('sends auth-state events inside the {errors, authStates, sessionId, timestamp} envelope', async () => {
      const config = createTestConfig({ enabled: false });
      initializeTelemetry(mockApiClient as any, config);
      await new Promise((resolve) => setTimeout(resolve, 10));

      reportAuthEvent('SIGN_IN', { method: 'passkey' });
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(mockApiClient.request).toHaveBeenCalledWith(
        '/dev/error-reports',
        expect.objectContaining({ method: 'POST' })
      );

      const [, options] = mockApiClient.request.mock.calls[0];
      const body = JSON.parse(options.body as string);

      expect(Array.isArray(body.errors)).toBe(true);
      expect(Array.isArray(body.authStates)).toBe(true);
      expect(typeof body.sessionId).toBe('string');
      expect(body.sessionId.length).toBeGreaterThan(0);
      expect(typeof body.timestamp).toBe('number');
      expect(body.authStates).toHaveLength(1);
      expect(body.authStates[0]).toMatchObject({
        type: 'auth-state-change',
        event: 'SIGN_IN'
      });
      expect(body.errors).toHaveLength(0);
    });

    it('sends webauthn errors as an entry in the errors array', async () => {
      const config = createTestConfig({ enabled: false });
      initializeTelemetry(mockApiClient as any, config);
      await new Promise((resolve) => setTimeout(resolve, 10));

      reportWebAuthnError('authentication', { name: 'NotAllowedError', message: 'denied' });
      await new Promise((resolve) => setTimeout(resolve, 10));

      const [, options] = mockApiClient.request.mock.calls[0];
      const body = JSON.parse(options.body as string);

      expect(body.authStates).toHaveLength(0);
      expect(body.errors).toHaveLength(1);
      expect(body.errors[0]).toMatchObject({
        type: 'webauthn-error',
        message: 'denied',
        severity: expect.any(String)
      });
    });
  });
});
