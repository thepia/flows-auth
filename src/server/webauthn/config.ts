/**
 * WebAuthn RP ID / origin resolution from a request's hostname.
 *
 * Only the real, load-bearing logic is ported here. The original thepia.com
 * implementation also had a `getWebAuthnConfig` "main" function plus
 * per-domain RP name resolution (`getRpNameForDomain`) and a debug helper -
 * verified against every actual call site that none of that is ever
 * invoked; only RP ID resolution, origin resolution, and a single
 * non-host-aware RP name are used anywhere. That confirmed-dead surface
 * isn't carried forward.
 *
 * The original also implemented origin resolution and RP ID resolution as
 * two independently-duplicated hostname-matching functions with the same
 * shape. This version resolves both from one shared host-rule table
 * instead.
 */

export interface WebAuthnHostRule {
  /** Exact hostname or suffix (matched as hostname === domain, or hostname.endsWith('.' + domain)). Longest domain wins when multiple rules could match. */
  domain: string;
  rpId: string;
  /**
   * Origin for this host. Defaults to `https://<matched hostname>` (the
   * host IS its own frontend) when omitted - set explicitly for a host
   * that serves a *different* frontend domain, e.g. an API host
   * (api.example.com) whose WebAuthn ceremonies actually originate from
   * example.com.
   */
  origin?: string;
}

export interface WebAuthnDomainConfig {
  /** Checked first, in order, for an exact/suffix hostname match - e.g. dev/preview/local environments, or an API host mapped to a different frontend domain. */
  hostRules?: WebAuthnHostRule[];
  /** General supported RP domains (suffix-matched; longest match wins) for hosts that are their own frontend and aren't covered by hostRules. */
  supportedDomains?: string[];
  /** RP name returned by getRpName(). Not per-domain: verified against the only real caller, which invokes it with no request/hostname context at all. */
  rpName: string;
  /** Fallback RP ID / origin when hostname resolution fails entirely (no hostRules match, no supportedDomains match, and - for RP ID - no Origin header match either). */
  fallbackRpId: string;
  fallbackOrigin: string;
}

export interface WebAuthnConfigResolver {
  /**
   * RP ID must match the domain in the browser's address bar where the
   * ceremony was initiated. Prefers the Origin header (the actual frontend
   * origin) over the request URL's own hostname (which may be a different
   * API-serving domain), falling back to the URL hostname, then to
   * fallbackRpId.
   */
  getRpIdFromRequest(request: Request): string;
  /** Same preference order as getRpIdFromRequest, returning the full origin URL rather than a bare hostname. */
  getOriginFromRequest(request: Request): string;
  getRpName(): string;
}

function findRule(hostRules: WebAuthnHostRule[], hostname: string): WebAuthnHostRule | null {
  const sorted = [...hostRules].sort((a, b) => b.domain.length - a.domain.length);
  for (const rule of sorted) {
    if (hostname === rule.domain || hostname.endsWith(`.${rule.domain}`)) {
      return rule;
    }
  }
  return null;
}

function findSupportedDomain(domains: string[], hostname: string): string | null {
  const sorted = [...domains].sort((a, b) => b.length - a.length);
  for (const domain of sorted) {
    if (hostname === domain || hostname.endsWith(`.${domain}`)) {
      return domain;
    }
  }
  return null;
}

export function createWebAuthnConfig(config: WebAuthnDomainConfig): WebAuthnConfigResolver {
  const hostRules = config.hostRules ?? [];
  const supportedDomains = config.supportedDomains ?? [];

  function resolveRpId(hostname: string): string | null {
    const rule = findRule(hostRules, hostname);
    if (rule) {
      return rule.rpId;
    }
    return findSupportedDomain(supportedDomains, hostname);
  }

  function resolveOrigin(hostname: string): string | null {
    const rule = findRule(hostRules, hostname);
    if (rule) {
      return rule.origin ?? `https://${hostname}`;
    }
    const domain = findSupportedDomain(supportedDomains, hostname);
    return domain ? `https://${hostname}` : null;
  }

  function originHeaderHostname(request: Request): string | null {
    const origin = request.headers.get('Origin');
    if (!origin) {
      return null;
    }
    try {
      return new URL(origin).hostname;
    } catch {
      return null;
    }
  }

  function getRpIdFromRequest(request: Request): string {
    const originHostname = originHeaderHostname(request);
    if (originHostname) {
      const rpId = resolveRpId(originHostname);
      if (rpId) {
        return rpId;
      }
    }

    const hostname = new URL(request.url).hostname;
    return resolveRpId(hostname) ?? config.fallbackRpId;
  }

  function getOriginFromRequest(request: Request): string {
    const origin = request.headers.get('Origin');
    const originHostname = originHeaderHostname(request);
    // Trust the header's own value verbatim (it must match clientDataJSON
    // exactly, port included) rather than reconstructing it - only once
    // we've confirmed the hostname is one we actually recognize.
    if (origin && originHostname && resolveRpId(originHostname)) {
      return origin;
    }

    const hostname = new URL(request.url).hostname;
    return resolveOrigin(hostname) ?? config.fallbackOrigin;
  }

  function getRpName(): string {
    return config.rpName;
  }

  return { getRpIdFromRequest, getOriginFromRequest, getRpName };
}
