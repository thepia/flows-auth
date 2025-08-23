/**
 * API Server Detection Utility
 * Detects and selects the best available API server for authentication
 * Extracted from flows.thepia.net for common usage across Flows apps
 * 
 * PERFORMANCE OPTIMIZATION:
 * - Production domains (non-dev.*): Skip local check, use production API immediately (0ms)
 * - Development domains (dev.*): Check local server first, fallback to production (0-3000ms)
 * - Localhost: Always use production API immediately (0ms)
 */

export interface ApiServerConfig {
  localUrl?: string;
  productionUrl: string;
  healthTimeout?: number;
  preferLocal?: boolean;
}

export interface ApiServerInfo {
  url: string;
  type: 'local' | 'production';
  isHealthy: boolean;
  serverInfo?: {
    version?: string;
    environment?: string;
  };
}

/**
 * Default configuration for Thepia Flows applications
 */
export const DEFAULT_API_CONFIG: ApiServerConfig = {
  localUrl: 'https://dev.thepia.com:8443',
  productionUrl: 'https://api.thepia.com',
  healthTimeout: 3000,
  preferLocal: true
};

/**
 * Detects the best available API server based on health checks
 * 
 * PERFORMANCE OPTIMIZATION: Domain-based routing for zero-delay production
 * - flows.thepia.net, *.thepia.net, *.thepia.com: Use production API immediately (0ms)
 * - dev.thepia.net, dev.thepia.com: Check local server first, fallback to production (0-3000ms)
 * - localhost: Use production API immediately (0ms)
 * 
 * @param config - Configuration for API server detection
 * @param location - Optional location object for testing (defaults to window.location)
 * @returns Promise resolving to the selected API server info
 */
export async function detectApiServer(
  config: ApiServerConfig = DEFAULT_API_CONFIG,
  location?: { hostname: string }
): Promise<ApiServerInfo> {
  // Use provided location or window.location
  const currentLocation = location || (typeof window !== 'undefined' ? window.location : null);
  
  // Check for localhost development - exact match from flows.thepia.net
  if (currentLocation?.hostname === 'localhost') {
    return {
      url: config.productionUrl,
      type: 'production',
      isHealthy: true,
      serverInfo: undefined
    };
  }

  // Check for ngrok domains - treat as development and try local server first
  if (currentLocation?.hostname && (currentLocation.hostname.includes('ngrok') || currentLocation.hostname.includes('ngrok-free.app'))) {
    console.log(`🔗 ngrok domain detected: ${currentLocation.hostname} - trying local API first`);
    // Continue to local server detection below
  } 
  // Check for production domains - skip local server check for performance
  else if (currentLocation?.hostname && !currentLocation.hostname.startsWith('dev.')) {
    console.log(`🌐 Using production API server for ${currentLocation.hostname}: ${config.productionUrl}`);
    return {
      url: config.productionUrl,
      type: 'production',
      isHealthy: true,
      serverInfo: undefined
    };
  }

  // If preferLocal is false or no localUrl configured, use production
  if (!config.preferLocal || !config.localUrl) {
    return {
      url: config.productionUrl,
      type: 'production',
      isHealthy: true,
      serverInfo: undefined
    };
  }

  // Try local development server first - exact implementation
  try {
    const localResponse = await fetch(`${config.localUrl}/health`, {
      signal: AbortSignal.timeout(config.healthTimeout || 3000),
    });
    
    if (localResponse.ok) {
      console.log(`🔧 Using local API server: ${config.localUrl}`);
      
      // Try to parse server info
      let serverInfo: ApiServerInfo['serverInfo'];
      try {
        const data = await localResponse.json();
        serverInfo = {
          version: data.version,
          environment: data.environment || 'local'
        };
      } catch {
        // Ignore JSON parsing errors
      }
      
      return {
        url: config.localUrl,
        type: 'local',
        isHealthy: true,
        serverInfo
      };
    }
  } catch (error) {
    console.log('ℹ️ Local API server not available, using production');
  }

  // Fallback to production
  console.log(`🌐 Using production API server: ${config.productionUrl}`);
  return {
    url: config.productionUrl,
    type: 'production',
    isHealthy: true,
    serverInfo: undefined
  };
}