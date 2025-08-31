/**
 * Central Auth Configuration for Auth Demo
 * Single source of truth - demonstrates proper branded authentication
 */

import { browser } from '$app/environment';

/**
 * Auto-detect API server with fallback
 */
async function getApiBaseUrl() {
  if (!browser) return 'https://api.thepia.com';
  
  // Check for environment variable first
  let apiBaseUrl = import.meta.env.PUBLIC_API_BASE_URL;
  
  if (!apiBaseUrl) {
    // Try local API server first (for development)
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
 * This demonstrates proper branding and configuration structure
 */
export async function getAuthConfig() {
  const apiBaseUrl = await getApiBaseUrl();
  
  // Determine environment for development features
  const isDev = browser && (
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1' ||
    window.location.hostname.includes('dev.thepia.net') ||
    window.location.hostname.includes('dev.thepia.com')
  );
  
  return {
    // API Configuration
    apiBaseUrl,
    clientId: 'auth-demo',
    domain: 'dev.thepia.net', // Match your passkey domain
    
    // Authentication Methods
    enablePasskeys: true,
    enableMagicLinks: true,
    enablePasswordLogin: true, // For demo purposes
    enableSocialLogin: false,
    
    // Branding Configuration - This is key for white-labeling
    branding: {
      companyName: 'Acme Corporation',
      logoUrl: undefined, // Could be a URL to company logo
      primaryColor: '#2563eb', // Blue theme
      secondaryColor: '#1e40af',
      showPoweredBy: true, // Show "Powered by Thepia" footer
    },
    
    // Error Reporting (development only)
    errorReporting: {
      enabled: isDev,
      debug: isDev,
      maxRetries: 3,
      retryDelay: 1000,
    },
    
    // Application Context
    applicationContext: {
      userType: 'mixed', // Support different user types
      forceGuestMode: false,
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