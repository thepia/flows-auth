/**
 * Error and State Reporting Utilities
 * Reports errors through the auth store's API client
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

  setApiClient(api: AuthApiClient, config: AuthConfig) {
    this.api = api;
    this.config = config;
    console.log('📊 [Telemetry] Connected to API client');

    // Flush any queued events
    this.flushQueue();
  }

  async report(event: ErrorReportEvent) {
    if (!this.api || !this.config) {
      // No API client yet - queue the event
      this.queue.push(event);
      return;
    }

    const errorConfig = this.config.errorReporting;
    if (!errorConfig?.enabled) {
      if (errorConfig?.debug) {
        console.log('📊 [Telemetry] Event (reporting disabled):', event);
      }
      return;
    }

    if (errorConfig.debug) {
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
