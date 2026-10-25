/**
 * Dev-only diagnostic logging, silent by default.
 *
 * Duplicated verbatim from ../../core/utils/debug.ts rather than imported
 * across the src/svelte -> src/core boundary: the Svelte target is built by
 * `svelte-package` (dist/svelte/**), which preserves relative imports as-is,
 * while core is bundled by tsup into a single flat dist/index.js -- there is
 * no dist/core/utils/debug.js for a relative import to resolve against. See
 * the sibling module for the full rationale on the `import.meta.env?.DEBUG`
 * gate itself, including why the `?.` is required so the published build
 * doesn't throw under a non-Vite consumer (plain Node/vitest/Jest).
 */
export function debug(...args: unknown[]): void {
  // NB: `&&` guard, not `?.` -- see ../../core/utils/debug.ts (DCE). biome
  // useOptionalChain is scoped off for this file in biome.json; keep `&&`.
  if (import.meta.env && import.meta.env.DEBUG) {
    console.log(...args);
  }
}
