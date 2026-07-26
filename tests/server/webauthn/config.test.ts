/**
 * createWebAuthnConfig Unit Tests
 * RP ID / origin resolution: Origin-header preference, hostRules vs
 * supportedDomains matching, longest-match priority, and fallback behavior.
 *
 * The config below mirrors thepia.com's real domain setup (see
 * webauthn-config.ts in thepia.com) so these tests exercise the same
 * scenarios as the original webauthn-multi-domain.test.ts /
 * webauthn-origin-header.test.ts suites, just against the parameterized
 * resolver instead of hardcoded domain names.
 */

import { describe, expect, it } from 'vitest';
import { createWebAuthnConfig, type WebAuthnConfigResolver } from '../../../src/server/webauthn/config.js';

function thepiaLikeConfig(): WebAuthnConfigResolver {
  return createWebAuthnConfig({
    hostRules: [
      { domain: 'localhost', rpId: 'localhost' },
      { domain: 'dev.thepia.com', rpId: 'dev.thepia.com', origin: 'https://dev.thepia.com' },
      { domain: 'dev.thepia.net', rpId: 'dev.thepia.net', origin: 'https://dev.thepia.net' },
      { domain: 'thepia.local', rpId: 'thepia.local' },
      { domain: 'api.thepia.com', rpId: 'thepia.com', origin: 'https://thepia.com' },
      { domain: 'api.thepia.net', rpId: 'thepia.net', origin: 'https://thepia.net' }
    ],
    supportedDomains: ['thepia.com', 'thepia.net'],
    rpName: 'Thepia',
    fallbackRpId: 'thepia.com',
    fallbackOrigin: 'https://thepia.com'
  });
}

function requestWithOrigin(url: string, origin?: string): Request {
  const headers: Record<string, string> = {};
  if (origin !== undefined) {
    headers.Origin = origin;
  }
  return new Request(url, { headers });
}

describe('createWebAuthnConfig - domain separation', () => {
  const config = thepiaLikeConfig();

  it('creates separate RP IDs for thepia.com and thepia.net', () => {
    expect(config.getRpIdFromRequest(requestWithOrigin('https://api.thepia.com/x', 'https://thepia.com'))).toBe(
      'thepia.com'
    );
    expect(config.getRpIdFromRequest(requestWithOrigin('https://api.thepia.net/x', 'https://thepia.net'))).toBe(
      'thepia.net'
    );
  });

  it('creates separate RP IDs for the dev domains', () => {
    expect(
      config.getRpIdFromRequest(requestWithOrigin('https://api.thepia.com/x', 'https://dev.thepia.com'))
    ).toBe('dev.thepia.com');
    expect(
      config.getRpIdFromRequest(requestWithOrigin('https://api.thepia.com/x', 'https://dev.thepia.net'))
    ).toBe('dev.thepia.net');
  });

  it('shares one RP ID across subdomains of the same supported domain', () => {
    const flowsOrigin = config.getRpIdFromRequest(
      requestWithOrigin('https://api.thepia.com/x', 'https://flows.thepia.net')
    );
    const netsOrigin = config.getRpIdFromRequest(
      requestWithOrigin('https://api.thepia.com/x', 'https://nets.thepia.net')
    );
    expect(flowsOrigin).toBe('thepia.net');
    expect(netsOrigin).toBe('thepia.net');
  });

  it('a longer, more specific hostRule wins over a shorter supportedDomains suffix match', () => {
    // dev.thepia.com is both an exact hostRule AND would suffix-match nothing
    // in supportedDomains (thepia.com isn't a suffix of dev.thepia.com in a
    // way that matters here) - but api.thepia.com IS a hostRule that would
    // otherwise also satisfy no supportedDomains suffix. Confirm the
    // hostRule takes priority whenever both could apply.
    const custom = createWebAuthnConfig({
      hostRules: [{ domain: 'thepia.com', rpId: 'override-rp-id' }],
      supportedDomains: ['thepia.com'],
      rpName: 'Test',
      fallbackRpId: 'fallback',
      fallbackOrigin: 'https://fallback.example.com'
    });
    expect(custom.getRpIdFromRequest(requestWithOrigin('https://api.example.com/x', 'https://thepia.com'))).toBe(
      'override-rp-id'
    );
  });
});

describe('createWebAuthnConfig - Origin header preference', () => {
  const config = thepiaLikeConfig();

  it('prefers the Origin header over the request URL hostname', () => {
    const request = requestWithOrigin('https://api.thepia.com/auth/webauthn/challenge', 'https://thepia.com');
    expect(config.getRpIdFromRequest(request)).toBe('thepia.com');
    expect(config.getOriginFromRequest(request)).toBe('https://thepia.com');
  });

  it('preserves the exact Origin header value, including a non-standard port', () => {
    const request = requestWithOrigin(
      'https://dev.thepia.com:8443/auth/webauthn/challenge',
      'https://dev.thepia.com:5173'
    );
    // Must match clientDataJSON exactly - not reconstructed from the hostname.
    expect(config.getOriginFromRequest(request)).toBe('https://dev.thepia.com:5173');
  });

  it('falls back to the request URL hostname when the Origin header is missing', () => {
    const request = requestWithOrigin('https://api.thepia.com/x');
    expect(config.getRpIdFromRequest(request)).toBe('thepia.com');
    expect(config.getOriginFromRequest(request)).toBe('https://thepia.com');
  });

  it('handles a malformed Origin header gracefully by falling back to the URL hostname', () => {
    const request = requestWithOrigin('https://api.thepia.com/x', 'not-a-valid-url');
    expect(config.getRpIdFromRequest(request)).toBe('thepia.com');
    expect(config.getOriginFromRequest(request)).toBe('https://thepia.com');
  });

  it('falls through to the URL hostname when the Origin header is an unrecognized domain', () => {
    const request = requestWithOrigin('https://api.thepia.com/x', 'https://evil.example.com');
    // Origin isn't trusted since it doesn't resolve to anything known - falls
    // back to the URL's own hostname resolution instead.
    expect(config.getRpIdFromRequest(request)).toBe('thepia.com');
  });
});

describe('createWebAuthnConfig - API-to-frontend domain mapping', () => {
  const config = thepiaLikeConfig();

  it('maps api.thepia.com to the thepia.com frontend origin when accessed directly', () => {
    const request = requestWithOrigin('https://api.thepia.com/auth/webauthn/challenge');
    expect(config.getRpIdFromRequest(request)).toBe('thepia.com');
    expect(config.getOriginFromRequest(request)).toBe('https://thepia.com');
  });

  it('maps api.thepia.net to the thepia.net frontend origin when accessed directly', () => {
    const request = requestWithOrigin('https://api.thepia.net/auth/webauthn/challenge');
    expect(config.getRpIdFromRequest(request)).toBe('thepia.net');
    expect(config.getOriginFromRequest(request)).toBe('https://thepia.net');
  });

  it('never returns the API domain itself as the RP ID', () => {
    const request = requestWithOrigin('https://api.thepia.com/auth/webauthn/challenge');
    expect(config.getRpIdFromRequest(request)).not.toBe('api.thepia.com');
  });

  it('direct frontend access (no API domain involved) resolves to its own hostname', () => {
    const request = requestWithOrigin('https://thepia.com/x');
    expect(config.getRpIdFromRequest(request)).toBe('thepia.com');
    expect(config.getOriginFromRequest(request)).toBe('https://thepia.com');
  });
});

describe('createWebAuthnConfig - fallback behavior', () => {
  const config = thepiaLikeConfig();

  it('falls back to fallbackRpId/fallbackOrigin for a completely unrecognized domain', () => {
    const request = requestWithOrigin('https://totally-unknown.example.org/x');
    expect(config.getRpIdFromRequest(request)).toBe('thepia.com');
    expect(config.getOriginFromRequest(request)).toBe('https://thepia.com');
  });

  it('rejects an unsupported Origin domain while still resolving via the URL hostname', () => {
    const request = requestWithOrigin('https://thepia.com/x', 'https://attacker.example.com');
    // The Origin header is untrusted, but the request URL itself is a
    // recognized domain, so resolution still succeeds via that path.
    expect(config.getRpIdFromRequest(request)).toBe('thepia.com');
  });
});

describe('createWebAuthnConfig - getRpName', () => {
  it('returns the configured RP name regardless of request context', () => {
    const config = createWebAuthnConfig({
      supportedDomains: ['example.com'],
      rpName: 'My App',
      fallbackRpId: 'example.com',
      fallbackOrigin: 'https://example.com'
    });
    expect(config.getRpName()).toBe('My App');
  });
});

describe('createWebAuthnConfig - localhost/local development', () => {
  const config = thepiaLikeConfig();

  it('resolves localhost via its hostRule', () => {
    const request = requestWithOrigin('https://localhost:8443/x', 'https://localhost:5173');
    expect(config.getRpIdFromRequest(request)).toBe('localhost');
    expect(config.getOriginFromRequest(request)).toBe('https://localhost:5173');
  });

  it('resolves thepia.local via its hostRule', () => {
    const request = requestWithOrigin('https://api.thepia.com/x', 'https://thepia.local');
    expect(config.getRpIdFromRequest(request)).toBe('thepia.local');
  });
});
