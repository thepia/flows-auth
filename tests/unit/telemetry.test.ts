/**
 * @file Telemetry System Unit Tests
 * @description Tests for the enhanced telemetry system with service worker caching optimization
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AuthConfig } from '../../src/types';

// Mock service worker registration
const mockServiceWorkerRegistration = {
  active: {
    postMessage: vi.fn()
  }
};

// Mock navigator.serviceWorker with spy
const mockServiceWorkerReady = vi.fn().mockResolvedValue(mockServiceWorkerRegistration);
const mockServiceWorker = {
  ready: mockServiceWorkerReady
};

// Mock AuthApiClient
const mockApiClient = {
  request: vi.fn()
};

// Mock the telemetry module to avoid auto-mocking issues
vi.mock('../../src/utils/telemetry', async () => {
  const actual = await vi.importActual('../../src/utils/telemetry');
  return actual;
});

// Helper function to create test config
const createTestConfig = (serviceWorkerLogging: any): AuthConfig => ({
  apiBaseUrl: 'https://api.test.com',
  clientId: 'test-client',
  domain: 'test.com',
  enablePasskeys: true,
  enableMagicLinks: false,
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

    // Mock global window
    Object.defineProperty(global, 'window', {
      value: {
        location: { href: 'https://test.example.com' },
        name: 'test-tab'
      },
      writable: true
    });

    // Import telemetry functions
    const telemetryModule = await import('../../src/utils/telemetry');
    initializeTelemetry = telemetryModule.initializeTelemetry;
    reportAuthEvent = telemetryModule.reportAuthEvent;
    reportSessionEvent = telemetryModule.reportSessionEvent;
    reportRefreshEvent = telemetryModule.reportRefreshEvent;
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

      // Wait for service worker initialization
      await new Promise((resolve) => setTimeout(resolve, 10));

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

      // Wait for initialization
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Clear the mock to count only subsequent calls
      mockServiceWorkerRegistration.active.postMessage.mockClear();

      // Send multiple events
      reportAuthEvent('TEST_EVENT_1', { test: 'data1' });
      reportAuthEvent('TEST_EVENT_2', { test: 'data2' });
      reportSessionEvent('RESTORE', { userId: 'test-user' });

      // Wait for events to be processed
      await new Promise((resolve) => setTimeout(resolve, 10));

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
      await new Promise((resolve) => setTimeout(resolve, 10));

      mockServiceWorkerRegistration.active.postMessage.mockClear();

      // Send different types of events
      reportAuthEvent('SIGN_IN', { method: 'email' });
      reportSessionEvent('RESTORE', { userId: 'test' });
      reportRefreshEvent('START', { tokenPrefix: 'abc123...' });

      await new Promise((resolve) => setTimeout(resolve, 10));

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
      await new Promise((resolve) => setTimeout(resolve, 10));

      mockServiceWorkerRegistration.active.postMessage.mockClear();

      // Send different types of events
      reportAuthEvent('SIGN_IN', { method: 'email' });
      reportSessionEvent('RESTORE', { userId: 'test' });
      reportRefreshEvent('START', { tokenPrefix: 'abc123...' });

      await new Promise((resolve) => setTimeout(resolve, 10));

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
      const telemetryModule = await import('../../src/utils/telemetry');
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
      await new Promise((resolve) => setTimeout(resolve, 10));

      mockServiceWorkerRegistration.active.postMessage.mockClear();

      const testData = { tokenPrefix: 'abc123...', userId: 'test-user' };
      reportRefreshEvent('START', testData);

      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(mockServiceWorkerRegistration.active.postMessage).toHaveBeenCalledWith({
        type: 'LOG_AUTH_EVENT',
        event: 'TELEMETRY_AUTH-STATE-CHANGE',
        data: expect.objectContaining({
          type: 'auth-state-change',
          event: 'START',
          data: testData
        }),
        url: 'https://test.example.com',
        tabId: 'test-tab'
      });
    });
  });
});
