/**
 * Browser Telemetry Client
 * Wraps the runtime-agnostic telemetry core (../telemetry/core.js) with an
 * AuthApiClient-based transport (POSTing to thepia.com's /dev/error-reports)
 * and browser-only service worker logging. See ../telemetry/index.ts (the
 * `@thepia/flows-auth/telemetry` export) for the non-browser entry point.
 */

import type { AuthApiClient } from '../api/auth-api.js';
import {
  type AuthStateEvent,
  type TelemetryEvent as ErrorReportEvent,
  type SerializedError,
  TelemetryCore,
  type WebAuthnErrorEvent
} from '../telemetry/core.js';
import type { AuthConfig } from '../types/index.js';
import { debug } from './debug.js';

export type { ApiErrorEvent, ServerErrorEvent } from '../telemetry/core.js';
export type { AuthStateEvent, ErrorReportEvent, SerializedError, WebAuthnErrorEvent };

class Telemetry {
  private core: TelemetryCore | null = null;
  private config: AuthConfig | null = null;
  private queue: ErrorReportEvent[] = [];
  private serviceWorkerRegistration: ServiceWorkerRegistration | null = null;
  private serviceWorkerInitialized = false;

  setApiClient(api: AuthApiClient, config: AuthConfig) {
    this.config = config;
    this.core = new TelemetryCore(
      async (payload) => {
        const endpoint = config.errorReporting?.endpoint ?? '/dev/error-reports';
        // biome-ignore lint/complexity/useLiteralKeys: intentional access to AuthApiClient's private request() method
        await api['request'](endpoint, {
          method: 'POST',
          body: JSON.stringify(payload),
          headers: { 'Content-Type': 'application/json' }
        });
      },
      {
        maxRetries: config.errorReporting?.maxRetries,
        retryDelay: config.errorReporting?.retryDelay,
        onError: (error) => console.warn('📊 [Telemetry] Failed to send event:', error)
      }
    );
    debug('📊 [Telemetry] Connected to API client');

    // Initialize service worker if logging is enabled (fire and forget)
    if (config.errorReporting?.serviceWorkerLogging?.enabled) {
      this.initServiceWorker().catch((error) => {
        if (config.errorReporting?.serviceWorkerLogging?.debug) {
          console.warn('📊 [Telemetry] Failed to initialize service worker:', error);
        }
      });
    }

    // Flush any queued events
    this.flushQueue();
  }

  /**
   * Initialize service worker registration for logging
   */
  private async initServiceWorker() {
    if (
      this.serviceWorkerInitialized ||
      typeof window === 'undefined' ||
      !('serviceWorker' in navigator)
    ) {
      return;
    }

    this.serviceWorkerInitialized = true;

    let serviceWorkerReady = false;

    try {
      this.serviceWorkerRegistration = await navigator.serviceWorker.ready;
      serviceWorkerReady = true;
    } catch (error) {
      if (this.config?.errorReporting?.serviceWorkerLogging?.debug) {
        console.warn('📊 [Telemetry] Service worker not available:', error);
      }
      this.serviceWorkerRegistration = null;
    }

    if (serviceWorkerReady && this.config?.errorReporting?.serviceWorkerLogging?.debug) {
      debug('📊 [Telemetry] Service worker ready for logging');
    }
  }

  async report(event: ErrorReportEvent) {
    if (!this.core || !this.config) {
      // No API client yet - queue the event
      this.queue.push(event);
      return;
    }

    const errorConfig = this.config.errorReporting;

    // Always send to service worker if enabled
    if (errorConfig?.serviceWorkerLogging?.enabled) {
      this.sendToServiceWorker(event);
    }

    if (!errorConfig?.enabled) {
      if (errorConfig?.debug) {
        debug('📊 [Telemetry] Event (API reporting disabled):', event);
      }
      return;
    }

    if (errorConfig?.debug) {
      debug('📊 [Telemetry] Reporting event:', event);
    }

    await this.core.report(event);

    if (errorConfig?.debug) {
      debug('📊 [Telemetry] Event sent successfully');
    }
  }

  /**
   * Send event to service worker for persistent logging.
   *
   * Does nothing on its own - this only registers a listener via
   * navigator.serviceWorker.ready, it doesn't create/register a service
   * worker. It's meant for web (non-native-shell) deployments where the
   * consuming app already runs its own service worker and wants flows-auth's
   * telemetry piggybacked onto it rather than managing a second one.
   *
   * flows-client's service worker (../../flows-client/src/service-worker/index.ts)
   * is a real, working consumer: it handles this exact LOG_AUTH_EVENT message
   * type and persists each event to IndexedDB ('flows-tmp' db, 'auth-log'
   * store, see service-worker/logger.ts's logAuthEvent()) - verified
   * end-to-end. flows-auth's own sw.js (repo root) does NOT implement this
   * handler (it's an unrelated experimental caching/background-sync spike),
   * so enabling serviceWorkerLogging.enabled against that one is a no-op
   * that just warns "Unknown message type" - this feature only does
   * anything useful when paired with a consumer's own service worker that
   * actually handles LOG_AUTH_EVENT, like flows-client's.
   */
  private sendToServiceWorker(event: ErrorReportEvent) {
    const swConfig = this.config?.errorReporting?.serviceWorkerLogging;
    if (!swConfig?.enabled) {
      return;
    }

    // Check if this event type should be logged
    const eventTypes = swConfig.events || ['all'];
    const shouldLog =
      eventTypes.includes('all') ||
      eventTypes.some((type) => {
        switch (type) {
          case 'auth':
            return event.type === 'auth-state-change';
          case 'session':
            return (
              event.type === 'auth-state-change' &&
              ['login-success', 'login-failure', 'logout'].includes(event.event)
            );
          case 'refresh':
            return event.type === 'auth-state-change' && event.event.includes('refresh');
          case 'errors':
            return event.type === 'webauthn-error' || event.type === 'api-error';
          default:
            return false;
        }
      });

    if (!shouldLog) {
      return;
    }

    // Use cached service worker registration for immediate posting
    if (this.serviceWorkerRegistration?.active) {
      this.serviceWorkerRegistration.active.postMessage({
        type: 'LOG_AUTH_EVENT',
        event: `TELEMETRY_${event.type.toUpperCase()}`,
        data: event,
        url: typeof window !== 'undefined' ? window.location.href : 'unknown',
        tabId: typeof window !== 'undefined' ? window.name || 'unnamed' : 'unknown'
      });

      if (swConfig.debug) {
        debug('📊 [Telemetry] Sent to service worker:', event);
      }
    } else if (swConfig.debug) {
      console.warn('📊 [Telemetry] Service worker not available for logging');
    }
  }

  flushQueue() {
    if (!this.core) {
      console.warn('📊 [Telemetry] Cannot flush queue: no API client');
      return;
    }

    const queuedEvents = [...this.queue];
    this.queue = [];

    for (const event of queuedEvents) {
      this.report(event);
    }
  }

  getQueueSize() {
    return this.queue.length + (this.core?.getQueueSize() ?? 0);
  }

  /**
   * Reset telemetry state (for testing)
   */
  reset() {
    this.core = null;
    this.config = null;
    this.queue = [];
    this.serviceWorkerRegistration = null;
    this.serviceWorkerInitialized = false;
  }
}

// Global telemetry instance
const telemetry = new Telemetry();

/**
 * Initialize telemetry with auth store's API client and config
 * Called automatically by createAuthStore()
 */
export function initializeTelemetry(api: AuthApiClient, config: AuthConfig) {
  telemetry.setApiClient(api, config);
}

/**
 * Reset telemetry state (for testing)
 */
export function resetTelemetry() {
  telemetry.reset();
}

export function reportAuthState(event: Omit<AuthStateEvent, 'type'>) {
  telemetry.report({
    type: 'auth-state-change',
    ...event
  });
}

export function reportWebAuthnError(
  operation: 'authentication' | 'registration',
  error: SerializedError,
  context?: Record<string, unknown>
) {
  telemetry.report({
    type: 'webauthn-error',
    operation,
    error: {
      name: error?.name,
      message: error?.message,
      code: error?.code,
      stack: error?.stack
    },
    context
  });
}

export function reportApiError(
  url: string,
  method: string,
  status: number,
  message: string,
  context?: Record<string, unknown>
) {
  telemetry.report({
    type: 'api-error',
    url,
    method,
    status,
    message,
    context
  });
}

export function flushTelemetry() {
  telemetry.flushQueue();
}

export function getTelemetryQueueSize() {
  return telemetry.getQueueSize();
}

/**
 * Report auth-specific events (refresh, session, etc.) to telemetry and service worker
 * Uses a flexible event structure that bypasses strict typing for custom events
 */
export function reportAuthEvent(
  event: string,
  data: Record<string, unknown>,
  context?: Record<string, unknown>
) {
  // Create a flexible event that can handle custom event types
  const flexibleEvent = {
    type: 'auth-state-change' as const,
    event: event as AuthStateEvent['event'], // Allow custom event types
    email: data.email as string | undefined,
    authMethod: (data.method as AuthStateEvent['authMethod']) || 'unknown',
    context: {
      ...data,
      ...context
    }
  };

  telemetry.report(flexibleEvent);
}

/**
 * Report session-related events (restore, save, etc.)
 */
export function reportSessionEvent(
  event: string,
  data: Record<string, unknown>,
  context?: Record<string, unknown>
) {
  reportAuthEvent(`session-${event}`, data, context);
}

/**
 * Report refresh token events
 */
export function reportRefreshEvent(
  event: string,
  data: Record<string, unknown>,
  context?: Record<string, unknown>
) {
  reportAuthEvent(`refresh-${event}`, { ...data, method: 'token-refresh' }, context);
}
