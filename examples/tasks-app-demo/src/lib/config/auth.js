/**
 * Central Auth Configuration for Tasks App Demo
 * Single source of truth for all authentication settings
 */

import { browser } from '$app/environment';

/**
 * Auto-detect API server with fallback
 */
async function getApiBaseUrl() {
  if (!browser) return 'https://api.thepia.com';
  
  // Check if we have env var
  let apiBaseUrl = import.meta.env.PUBLIC_API_BASE_URL;
  
  if (!apiBaseUrl) {
    // Try local API server first
    try {
      const localResponse = await fetch('https://dev.thepia.com:8443/health', {
        method: 'GET',
        signal: AbortSignal.timeout(2000),
      });
      if (localResponse.ok) {
        apiBaseUrl = 'https://dev.thepia.com:8443';
        console.log('🔧 Using local API server');
      } else {
        throw new Error('Local API not responding');
      }
    } catch (error) {
      // Local API not available, use production
      apiBaseUrl = 'https://api.thepia.com';
      console.log('🔧 Using production API server');
      console.log('💡 Note: Some features may be limited due to CORS restrictions');
    }
  }
  
  return apiBaseUrl;
}

/**
 * Get the central auth configuration
 * This is the single source of truth for the entire app
 */
export async function getAuthConfig() {
  const apiBaseUrl = await getApiBaseUrl();
  
  // Determine if we're in development
  const isDev = browser && (
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1' ||
    window.location.hostname.includes('dev.thepia.net') ||
    window.location.hostname.includes('dev.thepia.com')
  );
  
  return {
    apiBaseUrl,
    clientId: 'tasks-app-demo',
    domain: 'dev.thepia.net',
    enablePasskeys: true,
    enableMagicLinks: true,
    branding: {
      companyName: 'Assignment Management System',
      showPoweredBy: true,
      logoUrl: undefined,
      primaryColor: undefined,
      secondaryColor: undefined
    },
    errorReporting: {
      enabled: isDev,
      debug: isDev,
      maxRetries: 3,
      retryDelay: 1000,
    },
  };
}

/**
 * Cached auth config to avoid repeated API detection
 */
let cachedConfig = null;

/**
 * Get cached auth config (avoids repeated server detection)
 */
export async function getCachedAuthConfig() {
  if (!cachedConfig) {
    cachedConfig = await getAuthConfig();
  }
  return cachedConfig;
}