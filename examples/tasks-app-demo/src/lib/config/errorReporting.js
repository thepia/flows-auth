/**
 * Error Reporting Configuration for Tasks App Demo
 */

import { browser } from '$app/environment';

/**
 * Error reporting endpoints for different environments
 * Default to local dev/demo server, fallback to API server
 */
const ERROR_REPORTING_ENDPOINTS = {
  // Local demo server (default for development)
  localDemo: null, // Will be set dynamically to current dev server
  // Local API server (fallback option)
  localApi: 'https://dev.thepia.com:8443/dev/error-reports',
  // Production: Intentionally not implemented yet (needs throttling/protection design)
  productionApi: null, // Not implemented - requires throttling and protection strategy
};

/**
 * Get the local demo server endpoint dynamically
 */
function getLocalDemoEndpoint() {
  if (!browser) return null;

  const { protocol, hostname, port } = window.location;
  return `${protocol}//${hostname}:${port}/dev/error-reports`;
}

/**
 * Check if local demo server is available
 */
async function isLocalDemoAvailable() {
  if (!browser) return false;

  try {
    const endpoint = getLocalDemoEndpoint();
    if (!endpoint) return false;

    const healthEndpoint = endpoint.replace('/dev/error-reports', '/health');
    const response = await fetch(healthEndpoint, {
      method: 'GET',
      timeout: 2000, // Quick timeout for availability check
    });
    return response.ok;
  } catch (_error) {
    return false;
  }
}

/**
 * Check if local API server is available
 */
async function isLocalApiAvailable() {
  if (!browser) return false;

  try {
    const response = await fetch('https://dev.thepia.com:8443/health', {
      method: 'GET',
      timeout: 2000, // Quick timeout for availability check
    });
    return response.ok;
  } catch (_error) {
    return false;
  }
}

/**
 * Detect current environment and available servers
 */
async function detectEnvironmentAndServers() {
  if (!browser) return { environment: 'development', useLocalDemo: false, useLocalApi: false };

  const hostname = window.location.hostname;

  // Check if we're in development environment
  const isDevelopment =
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname.includes('dev.thepia.net') ||
    hostname.includes('dev.thepia.com');

  if (isDevelopment) {
    // In development, prefer local demo server, fallback to local API server
    const localDemoAvailable = await isLocalDemoAvailable();
    const localApiAvailable = !localDemoAvailable && (await isLocalApiAvailable());

    return {
      environment: 'development',
      useLocalDemo: localDemoAvailable,
      useLocalApi: localApiAvailable,
      fallbackDisabled: !localDemoAvailable && !localApiAvailable,
    };
  }

  return { environment: 'production', useLocalDemo: false, useLocalApi: false };
}

/**
 * Get error reporting configuration with smart server detection
 */
export async function getErrorReportingConfig() {
  const { environment, useLocalDemo, useLocalApi, fallbackDisabled } =
    await detectEnvironmentAndServers();
  const isDev = environment === 'development';

  let endpoint;
  let serverType;

  if (isDev && useLocalDemo) {
    endpoint = getLocalDemoEndpoint();
    serverType = 'Local Demo Server (/dev/error-reports)';
  } else if (isDev && useLocalApi) {
    endpoint = ERROR_REPORTING_ENDPOINTS.localApi;
    serverType = 'Local API Server (/dev/error-reports)';
  } else {
    // Production frontend error reporting not implemented yet
    endpoint = null;
    serverType = fallbackDisabled
      ? 'Disabled (no local servers available)'
      : 'Disabled (dev-only feature)';
  }

  return {
    enabled: !!endpoint, // Only enable when we have a valid endpoint
    endpoint,
    apiKey: undefined,
    debug: isDev,
    maxRetries: 3,
    retryDelay: 1000,
    environment,
    serverType,
    useLocalDemo,
    useLocalApi,
    fallbackDisabled,
    appName: 'tasks-app-demo',
    appVersion: '0.0.1',
  };
}

/**
 * Initialize error reporting for the tasks app with smart server detection
 */
export async function initializeTasksErrorReporting() {
  if (!browser) return;

  try {
    const { initializeErrorReporter } = await import('@thepia/flows-auth');
    const config = await getErrorReportingConfig();

    await initializeErrorReporter(config);

    if (config.debug) {
      console.log('[Tasks App] Error reporting initialized:', {
        environment: config.environment,
        serverType: config.serverType,
        endpoint: config.endpoint,
        enabled: config.enabled,
        useLocalDemo: config.useLocalDemo,
        useLocalApi: config.useLocalApi,
        fallbackDisabled: config.fallbackDisabled,
      });
    }

    // Always log in development for verification
    if (config.environment === 'development') {
      console.log('🔧 Error Reporting Status:', config.enabled ? 'ENABLED' : 'DISABLED');
      console.log('📡 Target:', config.serverType);
      console.log('🎯 Endpoint:', config.endpoint || 'None');
    }

    return true;
  } catch (error) {
    console.error('[Tasks App] Failed to initialize error reporting:', error);
    return false;
  }
}

/**
 * Force error reporting to use production API (override auto-detection)
 * Currently disabled as production frontend error reporting is not implemented
 */
export async function initializeTasksErrorReportingProduction() {
  if (!browser) return;

  try {
    const { initializeErrorReporter } = await import('@thepia/flows-auth');

    const config = {
      enabled: false, // Production frontend error reporting not implemented yet
      endpoint: null,
      apiKey: undefined,
      debug: false,
      maxRetries: 3,
      retryDelay: 1000,
      environment: 'production',
      serverType: 'Disabled (production frontend error reporting not implemented)',
      appName: 'tasks-app-demo',
      appVersion: '0.0.1',
    };

    await initializeErrorReporter(config);

    console.log('[Tasks App] Error reporting initialized (production forced):', {
      endpoint: config.endpoint,
      serverType: config.serverType,
      enabled: config.enabled,
    });

    return true;
  } catch (error) {
    console.error('[Tasks App] Failed to initialize production error reporting:', error);
    return false;
  }
}

/**
 * Report task-specific errors
 */
export async function reportTaskError(operation, error, context = {}) {
  if (!browser) return;

  try {
    const { reportApiError } = await import('@thepia/flows-auth');

    await reportApiError(
      context.url || 'tasks-app',
      context.method || 'TASK_OPERATION',
      500,
      error.message || String(error),
      {
        operation,
        taskApp: true,
        ...context,
      }
    );
  } catch (reportingError) {
    console.error('[Tasks App] Failed to report error:', reportingError);
  }
}

/**
 * Report sync-related errors
 */
export async function reportSyncError(operation, error, context = {}) {
  if (!browser) return;

  try {
    const { reportApiError } = await import('@thepia/flows-auth');

    await reportApiError(
      context.url || 'service-worker-sync',
      context.method || 'SYNC_OPERATION',
      context.status || 500,
      error.message || String(error),
      {
        operation,
        syncError: true,
        serviceWorker: true,
        ...context,
      }
    );
  } catch (reportingError) {
    console.error('[Tasks App] Failed to report sync error:', reportingError);
  }
}

/**
 * Report auth-related errors in tasks app context
 */
export async function reportTasksAuthError(operation, error, context = {}) {
  if (!browser) return;

  try {
    const { reportWebAuthnError } = await import('@thepia/flows-auth');

    await reportWebAuthnError(operation, error, {
      taskApp: true,
      ...context,
    });
  } catch (reportingError) {
    console.error('[Tasks App] Failed to report auth error:', reportingError);
  }
}

/**
 * Flush any pending error reports
 */
export async function flushTasksErrorReports() {
  if (!browser) return;

  try {
    const { flushErrorReports } = await import('@thepia/flows-auth');
    await flushErrorReports();
  } catch (error) {
    console.error('[Tasks App] Failed to flush error reports:', error);
  }
}

/**
 * Test function to verify error reporting is working
 */
export async function testErrorReporting() {
  if (!browser) return;

  console.log('🧪 Testing error reporting...');

  try {
    await reportTaskError('test.manual', new Error('Manual test error'), {
      context: 'Manual test triggered by user',
      testTimestamp: Date.now(),
    });
    console.log('✅ Test error sent successfully');
  } catch (error) {
    console.error('❌ Failed to send test error:', error);
  }
}

/**
 * Override console.error to also report errors
 */
export function enableGlobalErrorReporting() {
  if (!browser) return;

  const originalError = console.error;

  console.error = (...args) => {
    // Call original console.error
    originalError.apply(console, args);

    // Report error if it looks like an Error object
    const firstArg = args[0];
    if (firstArg instanceof Error || (typeof firstArg === 'string' && args.length > 0)) {
      reportTaskError(
        'console.error',
        {
          message: String(firstArg),
          stack: firstArg.stack || 'No stack trace',
        },
        {
          consoleArgs: args.slice(1),
        }
      );
    }
  };

  // Handle unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    reportTaskError(
      'unhandledRejection',
      {
        message: event.reason?.message || String(event.reason),
        stack: event.reason?.stack || 'No stack trace',
      },
      {
        promise: true,
      }
    );
  });

  // Handle uncaught errors
  window.addEventListener('error', (event) => {
    reportTaskError(
      'uncaughtError',
      {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        stack: event.error?.stack || 'No stack trace',
      },
      {
        global: true,
      }
    );
  });
}
