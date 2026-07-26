/**
 * Concrete, named environment/secret values server-side modules need from
 * the host app - not a generic string-keyed lookup. The set of variables
 * any module needs is small and known up front, so named getters give real
 * type-checking and autocomplete instead of typo-prone key strings a
 * compiler can't catch.
 *
 * The host app implements this once (wrapping whatever env-reading
 * mechanism it has - Deno.env.get, BunnySDK.secret.get, process.env, etc.)
 * and passes the same instance to every server module that needs it. As new
 * server modules need new variables, add a named getter here rather than
 * falling back to a generic `get(key)` escape hatch.
 */
export interface EnvChecker {
  /** PostHog project API key (the public `phc_...` token) used for server-side error telemetry. */
  get postHogApiKey(): string | undefined;
  /** PostHog ingestion host, e.g. `https://eu.i.posthog.com`. */
  get postHogHost(): string | undefined;
  /** Public API server host (e.g. `dev.thepia.com:8443`) - used to detect local dev so rate limiting can be conditionally relaxed. */
  get apiServerHost(): string | undefined;
  /** Explicit opt-in to enforce rate limiting during local development (ignored in production, where it's always enforced). */
  get enforceRateLimit(): string | undefined;
}
