/**
 * Fetch Interceptor for Error Testing
 * Only affects network traffic when user explicitly triggers errors
 */

class FetchInterceptor {
  constructor() {
    this.originalFetch = globalThis.fetch;
    this.errorMappings = new Map();
    this.isActive = false;
  }

  install() {
    if (this.isActive) return;

    this.isActive = true;
    const self = this;

    globalThis.fetch = async function (input, init) {
      const url =
        typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;

      // Check if we should inject an error for this endpoint
      const errorToInject = self.shouldInjectError(url, init);
      if (errorToInject) {
        console.log('🧪 Fetch interceptor injecting error for:', url, '→', errorToInject.type);

        // Clear the error mapping so it only triggers once
        self.clearErrorMapping(url, init);

        // Simulate network delay
        await new Promise((resolve) => setTimeout(resolve, 200));

        // Throw the error or return error response
        if (errorToInject.throwError) {
          throw new Error(errorToInject.message);
        } else {
          return new Response(
            JSON.stringify({
              error: errorToInject.code || 'api_error',
              message: errorToInject.message
            }),
            {
              status: errorToInject.status || 500,
              headers: { 'Content-Type': 'application/json' }
            }
          );
        }
      }

      // Normal fetch call - no interference when no errors are mapped
      return self.originalFetch.call(this, input, init);
    };

    console.log(
      '🧪 Fetch interceptor installed (passive mode - only affects traffic when errors are triggered)'
    );
  }

  uninstall() {
    if (!this.isActive) return;

    globalThis.fetch = this.originalFetch;
    this.isActive = false;
    this.errorMappings.clear();
    console.log('🧪 Fetch interceptor uninstalled');
  }

  shouldInjectError(url, init) {
    // Only inject errors if we have active mappings
    if (this.errorMappings.size === 0) return null;

    const method = init?.method || 'GET';
    const key = `${method}:${url}`;

    // Debug logging for pattern matching
    if (this.errorMappings.size > 0) {
      console.log('🧪 Checking for error injection:', {
        method,
        url,
        mappings: Array.from(this.errorMappings.keys())
      });
    }

    // Check exact URL match first
    if (this.errorMappings.has(key)) {
      console.log('🧪 Exact match found! Injecting error:', { key });
      return this.errorMappings.get(key);
    }

    // Check endpoint pattern matches
    for (const [pattern, error] of this.errorMappings.entries()) {
      if (this.matchesPattern(pattern, method, url)) {
        console.log('🧪 Pattern matched! Injecting error:', { pattern, method, url });
        return error;
      }
    }

    return null;
  }

  matchesPattern(pattern, method, url) {
    const [patternMethod, patternUrl] = pattern.split(':', 2);

    if (patternMethod !== '*' && patternMethod !== method) {
      return false;
    }

    // Simple pattern matching for API endpoints
    if (patternUrl.includes('*')) {
      const regex = new RegExp(patternUrl.replace(/\*/g, '.*'));
      return regex.test(url);
    }

    return url.includes(patternUrl);
  }

  clearErrorMapping(url, init) {
    const method = init?.method || 'GET';
    const key = `${method}:${url}`;
    this.errorMappings.delete(key);

    // Also clear pattern-based mappings that match this request
    for (const [pattern] of this.errorMappings.entries()) {
      if (this.matchesPattern(pattern, method, url)) {
        this.errorMappings.delete(pattern);
        break;
      }
    }
  }

  // Public methods to set up error scenarios (only when user chooses)
  injectTechnicalError() {
    this.errorMappings.set('POST:*/auth/webauthn/authenticate', {
      type: 'technical',
      message: 'Endpoint not found',
      status: 404,
      code: 'endpoint_not_found',
      throwError: false
    });
    console.log('🧪 Set up technical error injection for next passkey auth attempt');
  }

  injectCheckUserError() {
    this.errorMappings.set('GET:*/check-user', {
      type: 'check_user',
      message: 'User check service temporarily unavailable',
      status: 503,
      code: 'service_unavailable',
      throwError: false
    });
    console.log('🧪 Set up check-user error injection for next user check');
  }

  injectPasskeyError() {
    this.errorMappings.set('POST:*/auth/webauthn/challenge', {
      type: 'passkey',
      message: '404: /auth/webauthn/challenge not found',
      status: 404,
      code: 'webauthn_endpoint_missing',
      throwError: false
    });
    console.log('🧪 Set up passkey error injection for next challenge request');
  }

  injectWebAuthnError() {
    this.errorMappings.set('POST:*/auth/webauthn/authenticate', {
      type: 'webauthn',
      message: 'NotAllowedError: User cancelled the operation',
      throwError: true // Throw as exception, not HTTP response
    });
    console.log('🧪 Set up WebAuthn cancellation error injection');
  }

  injectSecurityError() {
    this.errorMappings.set('POST:*/auth/webauthn/*', {
      type: 'security',
      message: 'SecurityError: Operation not allowed in this context',
      throwError: true
    });
    console.log('🧪 Set up security error injection for WebAuthn operations');
  }

  injectGenericError() {
    this.errorMappings.set('POST:*/auth/email-code', {
      type: 'generic',
      message: 'Unknown authentication error occurred',
      status: 500,
      code: 'internal_server_error',
      throwError: false
    });
    console.log('🧪 Set up generic error injection for next email code request');
  }

  injectEmailCodeError() {
    this.errorMappings.set('POST:*/auth/verify-email-code', {
      type: 'verification',
      message: 'Invalid verification code',
      status: 400,
      code: 'invalid_code',
      throwError: false
    });
    console.log('🧪 Set up email code verification error injection');
  }

  clearAllErrors() {
    const hadErrors = this.errorMappings.size > 0;
    this.errorMappings.clear();
    if (hadErrors) {
      console.log('🧪 Cleared all error injections - network traffic will be normal');
    }
  }

  // Get current error mappings for debugging
  getActiveMappings() {
    return Array.from(this.errorMappings.entries()).map(([pattern, error]) => ({
      pattern,
      type: error.type,
      message: error.message
    }));
  }
}

// Export singleton instance
export const fetchInterceptor = new FetchInterceptor();
