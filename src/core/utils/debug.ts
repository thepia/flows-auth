/**
 * Dev-only diagnostic logging, silent by default.
 *
 * `import.meta.env && import.meta.env.DEBUG` is a single static expression so
 * Vite-family bundlers (Vite, Astro, SvelteKit, Vitest) can constant-fold it
 * and dead-code-eliminate this call -- including any sensitive arguments
 * passed to it -- whenever DEBUG isn't set. The leading `import.meta.env &&`
 * guard matters for the PUBLISHED build: `import.meta.env` is a Vite-family
 * construct the build leaves for the consumer's bundler to replace, so a
 * consumer that does NOT transform this module (plain Node, plain vitest
 * against the installed package, Jest, a non-Vite bundler) sees
 * `import.meta.env === undefined` at runtime. A bare `import.meta.env.DEBUG`
 * then throws and takes `createAuthStore()` down with it; the `&&` guard
 * short-circuits to `undefined` (falsy) instead. The member access stays a
 * PLAIN `.DEBUG` on purpose: under Vite `import.meta.env` folds to a literal
 * object, `truthyLiteral && literal.DEBUG` folds to `undefined`, and the
 * branch is still eliminated -- whereas `import.meta.env?.DEBUG` would defeat
 * that fold and LEAK the debug strings into production bundles. See
 * tests/package/published-import-meta-env-safety (no-throw) and
 * tests/package/debug-log-stripping (DCE still works). That's the default:
 * Vite only exposes
 * env vars matching `envPrefix` (default `VITE_`), so `DEBUG` stays
 * `undefined` (falsy) unless a project opts in by adding it to `envPrefix`:
 *
 *   // vite.config.ts
 *   envPrefix: ['VITE_', 'DEBUG']
 *
 * and setting `DEBUG=true` in `.env`/`.env.local` or the shell. Without that
 * opt-in, dev servers and test runs stay quiet, and a production build never
 * has DEBUG set, so this remains a dead branch and is stripped entirely.
 */
export function debug(...args: unknown[]): void {
  // NB: `&&` guard, not `?.` -- see module header (DCE). biome useOptionalChain
  // is scoped off for this file in biome.json; do not "simplify" to `?.`.
  if (import.meta.env && import.meta.env.DEBUG) {
    console.log(...args);
  }
}
