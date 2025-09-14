/**
 * Default Configuration Utilities for flows-auth
 * 
 * Provides standard API detection and configuration patterns
 * to eliminate duplication across apps using flows-auth
 */

import type { AuthConfig } from '../types';

/**
 * Default API detection with standard fallback pattern
 */
export async function detectDefaultApiServer(): Promise<string> {
  if (typeof window === 'undefined') {
    return 'https://api.thepia.com';
  }
  
  // Check environment variable first
  let apiBaseUrl = import.meta.env?.PUBLIC_API_BASE_URL;
  
  if (apiBaseUrl) {
    console.log('🔧 Using API base URL from environment:', apiBaseUrl);
    return apiBaseUrl;
  }
  
  // Check for local development API server
  try {
    const localResponse = await fetch('https://dev.thepia.com:8443/health', {
      method: 'GET',
      signal: AbortSignal.timeout(2000),
      // Don't reject on invalid SSL in development
      mode: 'cors',
    });
    
    if (localResponse.ok) {
      apiBaseUrl = 'https://dev.thepia.com:8443';
      console.log('🔧 Using local development API server');
      return apiBaseUrl;
    }
  } catch (error) {
    console.log('🔧 Local API server not available, using production');
    // Log the specific error for debugging
    if (error instanceof Error) {
      console.log(`   Error: ${error.message}`);
    }
  }
  
  // Fallback to production
  apiBaseUrl = 'https://api.thepia.com';
  console.log('🔧 Using production API server');
  return apiBaseUrl;
}

/**
 * Determine if running in development environment
 */
export function isDevelopmentEnvironment(): boolean {
  if (typeof window === 'undefined') return false;
  
  return (
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1' ||
    window.location.hostname.includes('dev.thepia.net') ||
    window.location.hostname.includes('dev.thepia.com') ||
    import.meta.env?.DEV === true
  );
}

/**
 * Create a standard auth config with sensible defaults
 */
export async function createDefaultAuthConfig(overrides: Partial<AuthConfig> = {}): Promise<AuthConfig> {
  const apiBaseUrl = await detectDefaultApiServer();
  const isDev = isDevelopmentEnvironment();
  
  const defaults: AuthConfig = {
    // API Configuration
    apiBaseUrl,
    clientId: 'flows-auth-app',
    domain: isDev ? 'dev.thepia.net' : 'thepia.net',
    
    // Authentication Methods
    enablePasskeys: true,
    enableMagicLinks: true,
    
    // Default Branding
    branding: {
      companyName: 'Your App',
      showPoweredBy: true,
      primaryColor: '#2563eb',
      secondaryColor: '#1e40af',
    } as const,
    
    // Error Reporting (development only)
    errorReporting: {
      enabled: isDev,
      endpoint: isDev ? `${apiBaseUrl}/dev/error-reports` : undefined,
      debug: isDev,
      maxRetries: 3,
      retryDelay: 1000,
    } as const,
    
    // Application Context
    applicationContext: {
      userType: 'mixed',
      forceGuestMode: false,
    },
  };
  
  // Deep merge overrides with proper type safety
  const result: AuthConfig = {
    ...defaults,
    ...overrides,
  };
  
  // Handle nested objects properly
  if (overrides.branding) {
    result.branding = {
      ...defaults.branding,
      ...overrides.branding,
    };
  }
  
  if (overrides.errorReporting) {
    result.errorReporting = {
      ...defaults.errorReporting,
      ...overrides.errorReporting,
    };
  }
  
  if (overrides.applicationContext) {
    result.applicationContext = {
      ...defaults.applicationContext,
      ...overrides.applicationContext,
    };
  }
  
  return result;
}

/**
 * Quick setup function for most common use cases
 */
export async function quickAuthSetup(options: {
  companyName?: string;
  clientId?: string;
  domain?: string;
  enableErrorReporting?: boolean;
  appCode?: string | boolean;
} = {}) {
  // Get the API base URL first
  const apiBaseUrl = await detectDefaultApiServer();
  
  const config = await createDefaultAuthConfig({
    clientId: options.clientId,
    ...(options.domain && { domain: options.domain }),
    ...(options.appCode !== undefined && { appCode: options.appCode }),
    branding: {
      companyName: options.companyName || 'Your App',
      showPoweredBy: true,
      primaryColor: '#2563eb',
      secondaryColor: '#1e40af',
    },
    errorReporting: {
      enabled: options.enableErrorReporting ?? isDevelopmentEnvironment(),
      endpoint: options.enableErrorReporting ? `${apiBaseUrl}/dev/error-reports` : undefined,
      debug: options.enableErrorReporting ?? isDevelopmentEnvironment(),
      maxRetries: 3,
      retryDelay: 1000,
    },
  });
  
  console.log('🚀 Quick auth setup complete:', {
    apiBaseUrl: config.apiBaseUrl,
    domain: config.domain,
    companyName: config.branding?.companyName,
    isDev: isDevelopmentEnvironment(),
  });
  
  return config;
}

/**
 * Cache for config to avoid repeated API detection
 */
let cachedConfig: AuthConfig | null = null;

/**
 * Get cached default config (recommended for most apps)
 */
export async function getCachedDefaultConfig(overrides: Partial<AuthConfig> = {}): Promise<AuthConfig> {
  if (!cachedConfig) {
    cachedConfig = await createDefaultAuthConfig();
  }
  
  // If overrides provided, create a new config with overrides
  if (Object.keys(overrides).length > 0) {
    return createDefaultAuthConfig(overrides);
  }
  
  return cachedConfig;
}

/**
 * Reset cached config (useful for testing)
 */
export function resetConfigCache(): void {
  cachedConfig = null;
}