/**
 * WebAuthn Debug Utilities
 * Comprehensive debugging for WebAuthn issues, especially port-related problems
 */

export interface WebAuthnDebugInfo {
  supported: boolean;
  platformAuthenticatorAvailable: boolean;
  conditionalMediationSupported: boolean;
  url: string;
  protocol: string;
  hostname: string;
  port: string | null;
  isSecureContext: boolean;
  isLocalhost: boolean;
  userAgent: string;
  errors: string[];
  warnings: string[];
  recommendations: string[];
}

export async function getWebAuthnDebugInfo(): Promise<WebAuthnDebugInfo> {
  const info: WebAuthnDebugInfo = {
    supported: false,
    platformAuthenticatorAvailable: false,
    conditionalMediationSupported: false,
    url: typeof window !== 'undefined' ? window.location.href : 'server',
    protocol: typeof window !== 'undefined' ? window.location.protocol : 'unknown',
    hostname: typeof window !== 'undefined' ? window.location.hostname : 'unknown',
    port: typeof window !== 'undefined' ? window.location.port || null : null,
    isSecureContext: typeof window !== 'undefined' ? window.isSecureContext : false,
    isLocalhost: false,
    userAgent: typeof window !== 'undefined' ? navigator.userAgent : 'server',
    errors: [],
    warnings: [],
    recommendations: [],
  };

  if (typeof window === 'undefined') {
    info.errors.push('Running on server - WebAuthn requires browser environment');
    return info;
  }

  // Check if localhost
  info.isLocalhost = ['localhost', '127.0.0.1', '::1'].includes(info.hostname);

  // Check basic WebAuthn support
  if (window.PublicKeyCredential === undefined) {
    info.errors.push('PublicKeyCredential not available - Browser does not support WebAuthn');
  } else if (typeof window.PublicKeyCredential !== 'function') {
    info.errors.push('PublicKeyCredential is not a function - Partial WebAuthn support');
  } else {
    info.supported = true;
  }

  // Check secure context
  if (!info.isSecureContext) {
    if (info.isLocalhost) {
      info.warnings.push('Not secure context but localhost detected - WebAuthn should work');
    } else {
      info.errors.push('Not secure context (HTTPS required) - WebAuthn will not work');
      info.recommendations.push('Use HTTPS or localhost for WebAuthn');
    }
  }

  // Check port issues
  if (info.port && !info.isLocalhost) {
    info.warnings.push(
      `Running on port ${info.port} with non-localhost hostname - May cause WebAuthn issues`
    );
    info.recommendations.push(
      'Try using localhost instead of IP address or use standard ports (80/443)'
    );
  }

  // Check platform authenticator
  if (info.supported) {
    try {
      info.platformAuthenticatorAvailable =
        await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
      if (!info.platformAuthenticatorAvailable) {
        info.warnings.push(
          'No platform authenticator available - Touch ID/Face ID/Windows Hello not available'
        );
      }
    } catch (error) {
      info.errors.push(`Platform authenticator check failed: ${error}`);
    }
  }

  // Check conditional mediation
  if (info.supported) {
    try {
      if (PublicKeyCredential.isConditionalMediationAvailable) {
        info.conditionalMediationSupported =
          await PublicKeyCredential.isConditionalMediationAvailable();
        if (!info.conditionalMediationSupported) {
          info.warnings.push(
            'Conditional mediation not supported - Email-triggered WebAuthn will not work'
          );
        }
      } else {
        info.warnings.push('Conditional mediation API not available - Older browser version');
      }
    } catch (error) {
      info.errors.push(`Conditional mediation check failed: ${error}`);
    }
  }

  // Browser-specific checks
  const ua = info.userAgent.toLowerCase();
  if (ua.includes('chrome')) {
    if (info.port && ['5173', '5174', '5175', '5176', '3000', '8080'].includes(info.port)) {
      info.warnings.push(
        'Chrome on development port - WebAuthn should work but may have limitations'
      );
    }
  } else if (ua.includes('firefox')) {
    info.warnings.push('Firefox WebAuthn support varies - Some features may not work');
  } else if (ua.includes('safari')) {
    if (info.port) {
      info.warnings.push('Safari with custom port - May have stricter WebAuthn requirements');
    }
  }

  // Generate recommendations
  if (info.errors.length === 0 && info.warnings.length === 0) {
    info.recommendations.push('WebAuthn should work normally');
  } else if (info.errors.length > 0) {
    info.recommendations.push('Fix errors before WebAuthn will work');
  } else {
    info.recommendations.push('WebAuthn may work with limitations - check warnings');
  }

  return info;
}

export function logWebAuthnDebugInfo(info: WebAuthnDebugInfo) {
  console.group('🔐 WebAuthn Debug Information');

  console.log('📍 Environment:', {
    url: info.url,
    protocol: info.protocol,
    hostname: info.hostname,
    port: info.port || 'default',
    isSecureContext: info.isSecureContext,
    isLocalhost: info.isLocalhost,
  });

  console.log('✅ Support:', {
    webauthnSupported: info.supported,
    platformAuthenticator: info.platformAuthenticatorAvailable,
    conditionalMediation: info.conditionalMediationSupported,
  });

  if (info.errors.length > 0) {
    console.error('❌ Errors:', info.errors);
  }

  if (info.warnings.length > 0) {
    console.warn('⚠️ Warnings:', info.warnings);
  }

  if (info.recommendations.length > 0) {
    console.info('💡 Recommendations:', info.recommendations);
  }

  console.log('🌐 User Agent:', info.userAgent);

  console.groupEnd();
}

export async function testWebAuthnBasicFlow(): Promise<{ success: boolean; error?: string }> {
  try {
    const debugInfo = await getWebAuthnDebugInfo();

    if (!debugInfo.supported) {
      return { success: false, error: 'WebAuthn not supported' };
    }

    if (!debugInfo.isSecureContext && !debugInfo.isLocalhost) {
      return { success: false, error: 'Secure context required' };
    }

    // Try to create a test credential (this will prompt user)
    console.log('🧪 Testing WebAuthn authentication creation...');

    const credential = await navigator.credentials.create({
      publicKey: {
        challenge: new Uint8Array(32),
        rp: {
          name: 'WebAuthn Test',
          id: debugInfo.hostname === 'localhost' ? 'localhost' : debugInfo.hostname,
        },
        user: {
          id: new Uint8Array(16),
          name: 'test@example.com',
          displayName: 'Test User',
        },
        pubKeyCredParams: [{ alg: -7, type: 'public-key' }],
        authenticatorSelection: {
          authenticatorAttachment: 'platform',
          userVerification: 'required',
        },
        timeout: 60000,
        attestation: 'direct',
      },
    });

    return { success: !!credential };
  } catch (error: any) {
    return {
      success: false,
      error: `${error.name}: ${error.message}`,
    };
  }
}

// Auto-run debug on import in development
if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
  getWebAuthnDebugInfo().then(logWebAuthnDebugInfo);
}
