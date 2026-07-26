/**
 * Dev-only diagnostic logging, silent by default.
 *
 * Duplicated verbatim from ../../core/utils/debug.ts rather than imported
 * across the src/svelte -> src/core boundary: the Svelte target is built by
 * `svelte-package` (dist/svelte/**), which preserves relative imports as-is,
 * while core is bundled by tsup into a single flat dist/index.js -- there is
 * no dist/core/utils/debug.js for a relative import to resolve against. See
 * the sibling module for the full rationale on the `import.meta.env.DEBUG`
 * gate itself.
 */
export function debug(...args: unknown[]): void {
  if (import.meta.env.DEBUG) {
    console.log(...args);
  }
}
