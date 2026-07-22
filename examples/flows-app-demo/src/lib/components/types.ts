/**
 * Type definitions and guards for authentication components
 *
 * Purpose: Prevent accidental usage of mock authentication in production
 * Context: Provides compile-time and runtime safety checks
 * Safe to remove: No - these types prevent security vulnerabilities
 */

/**
 * Configuration for REAL authentication (production-safe)
 */
export interface RealAuthConfig {
  apiBaseUrl: string;
  domain: string;
  clientId: string;
  enablePasskeys: boolean;
  branding?: {
    companyName: string;
    logoUrl?: string;
    primaryColor?: string;
    secondaryColor?: string;
  };
}

/**
 * Configuration for MOCK authentication (demo/testing only)
 *
 * ⚠️ WARNING: This type should NEVER be used in production
 */
export interface MockAuthConfig {
  /** 🚨 MOCK AUTHENTICATION - NOT FOR PRODUCTION 🚨 */
  __MOCK_AUTH_WARNING__: 'THIS_IS_FAKE_AUTHENTICATION_DO_NOT_USE_IN_PRODUCTION';
  branding?: {
    companyName: string;
    logoUrl?: string;
    primaryColor?: string;
    secondaryColor?: string;
  };
  enablePasskeys?: boolean;
}

/**
 * Type guard to check if configuration is for real authentication
 */
export function isRealAuthConfig(config: any): config is RealAuthConfig {
  return (
    config &&
    typeof config.apiBaseUrl === 'string' &&
    typeof config.domain === 'string' &&
    typeof config.clientId === 'string' &&
    !config.__MOCK_AUTH_WARNING__
  );
}

/**
 * Type guard to check if configuration is for mock authentication
 */
export function isMockAuthConfig(config: any): config is MockAuthConfig {
  return (
    config &&
    config.__MOCK_AUTH_WARNING__ === 'THIS_IS_FAKE_AUTHENTICATION_DO_NOT_USE_IN_PRODUCTION'
  );
}

/**
 * Runtime guard to prevent mock authentication in production
 *
 * @throws Error if mock authentication is detected in production environment
 */
export function validateAuthConfig(
  config: any,
  environment: 'development' | 'production' = 'development'
): void {
  if (environment === 'production' && isMockAuthConfig(config)) {
    throw new Error(
      '🚨 SECURITY ERROR: Mock authentication detected in production environment! ' +
        'This would allow anyone to sign in without real authentication. ' +
        'Use real flows-auth configuration instead.'
    );
  }

  if (isMockAuthConfig(config)) {
    console.warn('🚨 WARNING: Using mock authentication - only for demo/testing purposes');
    console.warn('🚨 This will accept ANY email without real verification');
  }

  if (isRealAuthConfig(config)) {
    console.log('✅ Using real authentication configuration');
  }
}

/**
 * Helper to create a safe mock config for development/testing
 *
 * This function makes it explicit that mock authentication is being used
 */
export function createMockAuthConfig(branding?: MockAuthConfig['branding']): MockAuthConfig {
  console.warn('🚨 Creating MOCK authentication config - not for production use');

  return {
    __MOCK_AUTH_WARNING__: 'THIS_IS_FAKE_AUTHENTICATION_DO_NOT_USE_IN_PRODUCTION',
    branding,
    enablePasskeys: true
  };
}

/**
 * Helper to create a real auth config with validation
 */
export function createRealAuthConfig(
  config: Omit<RealAuthConfig, 'enablePasskeys'> & { enablePasskeys?: boolean }
): RealAuthConfig {
  const realConfig: RealAuthConfig = {
    enablePasskeys: true,
    ...config
  };

  validateAuthConfig(realConfig, 'production');
  return realConfig;
}
