/**
 * Error and State Reporting Utilities
 * Reports errors through the auth store's API client and optionally to service worker
 */

import type { AuthApiClient } from '../api/auth-api';
import type { AuthConfig } from '../types';

export interface AuthStateEvent {
  type: 'auth-state-change';
  event:
    | 'login-attempt'
    | 'login-success'
    | 'login-failure'
    | 'webauthn-start'
    | 'webauthn-success'
    | 'webauthn-failure'
    | 'webauthn-register-start'
    | 'webauthn-register-success'
    | 'webauthn-register-failure'
    | 'magic-link-request'
    | 'magic-link-sent'
    | 'magic-link-failure'
    | 'magic-link-verify-start'
    | 'magic-link-verify-success'
    | 'magic-link-verify-failure'
    | 'sign-in-started'
    | 'sign-in-success'
    | 'sign-in-error'
    | 'token-refreshed'
    | 'sign-out'
    | 'registration-start'
    | 'registration-success'
    | 'registration-failure';
  email?: string;
  userId?: string;
  authMethod?: 'passkey' | 'password' | 'email' | 'magic-link';
  duration?: number;
  error?: string;
  context?: Record<string, any>;
}

export interface WebAuthnErrorEvent {
  type: 'webauthn-error';
  operation: 'authentication' | 'registration';
  error: any;
  context?: Record<string, any>;
}

export interface ApiErrorEvent {
  type: 'api-error';
  url: string;
  method: string;
  status: number;
  message: string;
  context?: Record<string, any>;
}

export type ErrorReportEvent = AuthStateEvent | WebAuthnErrorEvent | ApiErrorEvent;

class Telemetry {
  private api: AuthApiClient | null = null;
  private config: AuthConfig | null = null;
  private queue: ErrorReportEvent[] = [];
  private retryQueue: { event: ErrorReportEvent; attempts: number }[] = [];
  private serviceWorkerRegistration: ServiceWorkerRegistration | null = null;
  private serviceWorkerInitialized = false;

  setApiClient(api: AuthApiClient, config: AuthConfig) {
    this.api = api;
    this.config = config;
    console.log('📊 [Telemetry] Connected to API client');

    // Initialize service worker if logging is enabled
    if (config.errorReporting?.serviceWorkerLogging?.enabled) {
      this.initServiceWorker();
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

    try {
      this.serviceWorkerRegistration = await navigator.serviceWorker.ready;
      if (this.config?.errorReporting?.serviceWorkerLogging?.debug) {
        console.log('📊 [Telemetry] Service worker ready for logging');
      }
    } catch (error) {
      if (this.config?.errorReporting?.serviceWorkerLogging?.debug) {
        console.warn('📊 [Telemetry] Service worker not available:', error);
      }
      this.serviceWorkerRegistration = null;
    }
  }

  async report(event: ErrorReportEvent) {
    if (!this.api || !this.config) {
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
        console.log('📊 [Telemetry] Event (API reporting disabled):', event);
      }
      return;
    }

    if (errorConfig?.debug) {
      console.log('📊 [Telemetry] Reporting event:', event);
    }

    try {
      await this.sendEvent(event);
    } catch (error) {
      console.warn('📊 [Telemetry] Failed to send event:', error);
      this.retryQueue.push({ event, attempts: 0 });
      this.scheduleRetry();
    }
  }

  private async sendEvent(event: ErrorReportEvent) {
    if (!this.api || !this.config) {
      throw new Error('No API client available');
    }

    const payload = {
      ...event,
      timestamp: Date.now(),
      userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'server',
      url: typeof window !== 'undefined' ? window.location.href : 'unknown'
    };

    // Use the API client to send the error report
    const endpoint = '/dev/error-reports';
    await this.api['request'](endpoint, {
      method: 'POST',
      body: JSON.stringify(payload),
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (this.config.errorReporting?.debug) {
      console.log('📊 [Telemetry] Event sent successfully');
    }
  }

  /**
   * Send event to service worker for persistent logging
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
        console.log('📊 [Telemetry] Sent to service worker:', event);
      }
    } else if (swConfig.debug) {
      console.warn('📊 [Telemetry] Service worker not available for logging');
    }
  }

  private scheduleRetry() {
    const retryDelay = this.config?.errorReporting?.retryDelay || 1000;
    setTimeout(() => {
      this.processRetryQueue();
    }, retryDelay);
  }

  private async processRetryQueue() {
    const failedRetries: { event: ErrorReportEvent; attempts: number }[] = [];
    const maxRetries = this.config?.errorReporting?.maxRetries || 3;

    for (const { event, attempts } of this.retryQueue) {
      if (attempts >= maxRetries) {
        if (this.config?.errorReporting?.debug) {
          console.warn('📊 [Telemetry] Max retries reached for event:', event);
        }
        continue;
      }

      try {
        await this.sendEvent(event);
      } catch (error) {
        failedRetries.push({ event, attempts: attempts + 1 });
      }
    }

    this.retryQueue = failedRetries;

    if (this.retryQueue.length > 0) {
      this.scheduleRetry();
    }
  }

  flushQueue() {
    if (!this.api) {
      console.warn('📊 [Telemetry] Cannot flush queue: no API client');
      return;
    }

    const queuedEvents = [...this.queue];
    this.queue = [];

    queuedEvents.forEach((event) => this.report(event));
  }

  getQueueSize() {
    return this.queue.length + this.retryQueue.length;
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

export function reportAuthState(event: Omit<AuthStateEvent, 'type'>) {
  telemetry.report({
    type: 'auth-state-change',
    ...event
  });
}

export function reportWebAuthnError(
  operation: 'authentication' | 'registration',
  error: any,
  context?: Record<string, any>
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
  context?: Record<string, any>
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
  data: Record<string, any>,
  context?: Record<string, any>
) {
  // Create a flexible event that can handle custom event types
  const flexibleEvent = {
    type: 'auth-state-change' as const,
    event: event as any, // Allow custom event types
    email: data.email,
    authMethod: data.method || ('unknown' as any),
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
  data: Record<string, any>,
  context?: Record<string, any>
) {
  reportAuthEvent(`session-${event}`, data, context);
}

/**
 * Report refresh token events
 */
export function reportRefreshEvent(
  event: string,
  data: Record<string, any>,
  context?: Record<string, any>
) {
  reportAuthEvent(`refresh-${event}`, { ...data, method: 'token-refresh' }, context);
}
