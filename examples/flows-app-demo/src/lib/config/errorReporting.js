/**
 * Error Reporting Configuration for Flows App Demo
 *
 * Purpose: Configures flows-auth error reporting to use the local demo server endpoint
 * Context: This enables debugging of authentication flows and WebAuthn issues during development
 * Safe to remove: Yes, this is only used during development
 */

import { browser } from '$app/environment';

/**
 * Error reporting endpoints for different environments
 * Default to local demo server, fallback to API server
 */
const ERROR_REPORTING_ENDPOINTS = {
  // Local demo server (default for development)
  localDemo: null, // Will be set dynamically to current dev server
  // Local API server (fallback option)
  localApi: 'https://dev.thepia.com:8443/dev/error-reports',
  // Production: Intentionally not implemented yet (needs throttling/protection design)
  productionApi: null // Not implemented - requires throttling and protection strategy
};

/**
 * Get the local demo server error reporting endpoint
 */
function getLocalDemoEndpoint() {
  if (!browser) return null;

  const { protocol, hostname, port } = window.location;
  return `${protocol}//${hostname}:${port}/dev/error-reports`;
}

/**
 * Check if a server endpoint is responding
 */
async function checkServerHealth(endpoint) {
  if (!endpoint) return false;

  try {
    const response = await fetch(endpoint, {
      method: 'GET',
      headers: { Accept: 'application/json' }
    });
    return response.ok;
  } catch (error) {
    return false;
  }
}

/**
 * Detect environment and available servers
 */
async function detectEnvironmentAndServers() {
  if (!browser) {
    return {
      environment: 'server',
      useLocalDemo: false,
      useLocalApi: false,
      fallbackDisabled: true
    };
  }

  const isDev =
    window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  const environment = isDev ? 'development' : 'production';

  // Check local demo server (current dev server)
  const localDemoEndpoint = getLocalDemoEndpoint();
  const useLocalDemo = localDemoEndpoint && (await checkServerHealth(localDemoEndpoint));

  // Check local API server (fallback)
  const useLocalApi =
    !useLocalDemo && (await checkServerHealth(ERROR_REPORTING_ENDPOINTS.localApi));

  const fallbackDisabled = !useLocalDemo && !useLocalApi;

  return {
    environment,
    useLocalDemo,
    useLocalApi,
    fallbackDisabled
  };
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
    enabled: !!endpoint,
    endpoint,
    apiKey: undefined,
    debug: isDev,
    maxRetries: 3,
    retryDelay: 1000,
    environment,
    serverType,
    appName: 'flows-app-demo',
    appVersion: '0.0.1'
  };
}

/**
 * Initialize error reporting for flows app demo
 */
export async function initializeFlowsErrorReporting() {
  if (!browser) return false;

  try {
    const { initializeErrorReporter } = await import('@thepia/flows-auth');
    const config = await getErrorReportingConfig();

    await initializeErrorReporter(config);

    console.log('[Flows App] Error reporting initialized:', {
      endpoint: config.endpoint,
      serverType: config.serverType,
      enabled: config.enabled
    });

    return true;
  } catch (error) {
    console.error('[Flows App] Failed to initialize error reporting:', error);
    return false;
  }
}

/**
 * Enable global error reporting for unhandled errors
 */
export function enableGlobalErrorReporting() {
  if (!browser) return;

  // Global error handler
  window.addEventListener('error', (event) => {
    console.error('[Flows App] Unhandled error:', event.error);
  });

  // Unhandled promise rejection handler
  window.addEventListener('unhandledrejection', (event) => {
    console.error('[Flows App] Unhandled promise rejection:', event.reason);
  });
}

/**
 * Report auth-related errors in flows app context
 */
export async function reportFlowsAuthError(operation, error, context = {}) {
  if (!browser) return;

  try {
    const { reportWebAuthnError } = await import('@thepia/flows-auth');

    await reportWebAuthnError(operation, error, {
      flowsApp: true,
      ...context
    });
  } catch (reportingError) {
    console.error('[Flows App] Failed to report auth error:', reportingError);
  }
}

/**
 * Flush any pending error reports
 */
export async function flushFlowsErrorReports() {
  if (!browser) return;

  try {
    const { flushErrorReports } = await import('@thepia/flows-auth');
    await flushErrorReports();
  } catch (error) {
    console.error('[Flows App] Failed to flush error reports:', error);
  }
}
