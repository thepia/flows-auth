/**
 * Error and State Reporting Utilities
 * Configurable error reporting that can send to local API server or other endpoints
 */

export interface AuthStateEvent {
  type: 'auth-state-change';
  event: 'login-attempt' | 'login-success' | 'login-failure' | 'webauthn-start' | 'webauthn-success' | 'webauthn-failure' | 'webauthn-register-start' | 'webauthn-register-success' | 'webauthn-register-failure' | 'magic-link-request' | 'magic-link-sent' | 'magic-link-failure' | 'magic-link-verify-start' | 'magic-link-verify-success' | 'magic-link-verify-failure' | 'sign-in-started' | 'sign-in-success' | 'sign-in-error' | 'token-refreshed' | 'sign-out';
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

export interface ErrorReporterConfig {
  enabled: boolean;
  endpoint?: string;
  apiKey?: string;
  debug?: boolean;
  maxRetries?: number;
  retryDelay?: number;
}

class ErrorReporter {
  private config: ErrorReporterConfig;
  private queue: ErrorReportEvent[] = [];
  private retryQueue: { event: ErrorReportEvent; attempts: number }[] = [];

  constructor(config: ErrorReporterConfig = { enabled: false }) {
    this.config = {
      maxRetries: 3,
      retryDelay: 1000,
      debug: false,
      ...config
    };
  }

  updateConfig(config: Partial<ErrorReporterConfig>) {
    this.config = { ...this.config, ...config };
  }

  async report(event: ErrorReportEvent) {
    if (!this.config.enabled) {
      if (this.config.debug) {
        console.log('📊 [ErrorReporter] Event (reporting disabled):', event);
      }
      return;
    }

    if (this.config.debug) {
      console.log('📊 [ErrorReporter] Reporting event:', event);
    }

    if (!this.config.endpoint) {
      this.queue.push(event);
      if (this.config.debug) {
        console.warn('📊 [ErrorReporter] No endpoint configured, queuing event');
      }
      return;
    }

    try {
      await this.sendEvent(event);
    } catch (error) {
      console.warn('📊 [ErrorReporter] Failed to send event:', error);
      this.retryQueue.push({ event, attempts: 0 });
      this.scheduleRetry();
    }
  }

  private async sendEvent(event: ErrorReportEvent) {
    const payload = {
      ...event,
      timestamp: Date.now(),
      userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'server',
      url: typeof window !== 'undefined' ? window.location.href : 'unknown'
    };

    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };

    if (this.config.apiKey) {
      headers['Authorization'] = `Bearer ${this.config.apiKey}`;
    }

    const response = await fetch(this.config.endpoint!, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    if (this.config.debug) {
      console.log('📊 [ErrorReporter] Event sent successfully');
    }
  }

  private scheduleRetry() {
    setTimeout(() => {
      this.processRetryQueue();
    }, this.config.retryDelay);
  }

  private async processRetryQueue() {
    const failedRetries: { event: ErrorReportEvent; attempts: number }[] = [];

    for (const { event, attempts } of this.retryQueue) {
      if (attempts >= this.config.maxRetries!) {
        if (this.config.debug) {
          console.warn('📊 [ErrorReporter] Max retries reached for event:', event);
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
    if (!this.config.endpoint) {
      console.warn('📊 [ErrorReporter] Cannot flush queue: no endpoint configured');
      return;
    }

    const queuedEvents = [...this.queue];
    this.queue = [];

    queuedEvents.forEach(event => this.report(event));
  }

  getQueueSize() {
    return this.queue.length + this.retryQueue.length;
  }
}

// Global reporter instance
let reporter: ErrorReporter | null = null;

export function initializeErrorReporter(config: ErrorReporterConfig) {
  reporter = new ErrorReporter(config);
  
  if (config.debug) {
    console.log('📊 [ErrorReporter] Initialized with config:', config);
  }
}

export function updateErrorReporterConfig(config: Partial<ErrorReporterConfig>) {
  if (!reporter) {
    console.warn('📊 [ErrorReporter] Not initialized. Call initializeErrorReporter first.');
    return;
  }
  
  reporter.updateConfig(config);
}

export function reportAuthState(event: Omit<AuthStateEvent, 'type'>) {
  if (!reporter) return;
  
  reporter.report({
    type: 'auth-state-change',
    ...event
  });
}

export function reportWebAuthnError(operation: 'authentication' | 'registration', error: any, context?: Record<string, any>) {
  if (!reporter) return;
  
  reporter.report({
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

export function reportApiError(url: string, method: string, status: number, message: string, context?: Record<string, any>) {
  if (!reporter) return;
  
  reporter.report({
    type: 'api-error',
    url,
    method,
    status,
    message,
    context
  });
}

export function flushErrorReports() {
  if (!reporter) return;
  reporter.flushQueue();
}

export function getErrorReportQueueSize() {
  if (!reporter) return 0;
  return reporter.getQueueSize();
}

// Auto-initialize with basic config if running in browser
if (typeof window !== 'undefined') {
  // Check for SvelteKit dev mode or other development indicators
  const isDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  
  initializeErrorReporter({
    enabled: true,
    debug: isDev,
    // Default to local API server for development
    endpoint: isDev ? 'http://localhost:3000/api/error-reports' : undefined
  });
}