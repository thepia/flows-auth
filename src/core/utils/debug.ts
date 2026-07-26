/**
 * Dev-only diagnostic logging, silent by default.
 *
 * `import.meta.env.DEBUG` is a single static expression so Vite-family
 * bundlers (Vite, Astro, SvelteKit, Vitest) can constant-fold it and
 * dead-code-eliminate this call -- including any sensitive arguments passed
 * to it -- whenever DEBUG isn't set. That's the default: Vite only exposes
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
  if (import.meta.env.DEBUG) {
    console.log(...args);
  }
}
