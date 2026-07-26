/**
 * Recommended Rollup treeshake setting for apps consuming flows-auth,
 * intended to be spread into `build.rollupOptions.treeshake` in the
 * consumer's own vite.config.ts / astro.config.mjs.
 *
 * Rollup's default (`propertyReadSideEffects: true`) treats every property
 * read anywhere in the whole reachable module graph as a potential side
 * effect (a getter, a Proxy trap). Real apps read properties constantly, so
 * that conservatism compounds across a large module graph and can prevent
 * even simple, argument-free `debug()` calls (see flows-auth's own
 * src/core/utils/debug.ts) from being eliminated by the later esbuild
 * minify pass -- confirmed empirically: this single option took a real
 * app from 0/79 to 74/79 eliminated debug() call sites. See the
 * vite-debug-log skill for the full investigation.
 *
 * This is a project-wide setting, not scoped to flows-auth's own code --
 * it tells Rollup that no property read anywhere in your app has side
 * effects. That's true for the overwhelming majority of real code, but if
 * your app genuinely relies on a getter or Proxy trap for correctness (not
 * just laziness/logging), verify your own test suite still passes after
 * adding it.
 *
 * Usage (no existing rollupOptions.treeshake):
 *   import { flowsAuthTreeshake } from '@thepia/flows-auth/vite-preset';
 *   export default defineConfig({
 *     build: { rollupOptions: { treeshake: flowsAuthTreeshake } }
 *   });
 *
 * Usage (already have rollupOptions, e.g. output.manualChunks):
 *   import { flowsAuthTreeshake } from '@thepia/flows-auth/vite-preset';
 *   build: {
 *     rollupOptions: {
 *       output: { manualChunks(id) { ... } },
 *       treeshake: flowsAuthTreeshake
 *     }
 *   }
 *
 * Usage (already set your own rollupOptions.treeshake options and want to
 * add this one without clobbering them):
 *   import { withFlowsAuthTreeshake } from '@thepia/flows-auth/vite-preset';
 *   treeshake: withFlowsAuthTreeshake(myExistingTreeshakeConfig)
 */
export const flowsAuthTreeshake = {
  propertyReadSideEffects: false
} as const;

/**
 * Merges `flowsAuthTreeshake` into an existing `rollupOptions.treeshake`
 * value, which might be `undefined`, `false` (tree-shaking disabled
 * entirely -- respected as-is, not overridden), `true`, or an options
 * object with its own settings.
 */
export function withFlowsAuthTreeshake(
  existingTreeshake?: boolean | Record<string, unknown>
): boolean | Record<string, unknown> {
  if (existingTreeshake === false) {
    return existingTreeshake;
  }
  const base = typeof existingTreeshake === 'object' ? existingTreeshake : {};
  return { ...base, ...flowsAuthTreeshake };
}
