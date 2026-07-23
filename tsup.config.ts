import { readFileSync } from 'node:fs';
import { defineConfig } from 'tsup';

const { version } = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));

// Framework-agnostic core -> dist/index.js (+ dist/index.d.ts), the `.` export.
// tsup auto-externalizes everything in dependencies/peerDependencies, so zustand,
// zod, @simplewebauthn/browser, @dagrejs/dagre, d3, etc. stay external; only the
// local src/core/** (incl. the committed paraglide output) is bundled in.
export default defineConfig({
  entry: { index: 'src/core/index.ts' },
  format: ['esm'],
  // Types are emitted by `tsc` (tsconfig.build.json), not tsup: the committed
  // Paraglide output uses ES2022 string-literal exports (`export { x as "a.b" }`)
  // which tsup's rollup-plugin-dts cannot parse but tsc handles fine.
  dts: false,
  outDir: 'dist',
  target: 'es2020',
  sourcemap: true,
  clean: false, // orchestrated by scripts/build.mjs
  splitting: false,
  treeshake: true,
  // Core must never pull in a framework runtime.
  external: ['svelte', 'svelte/store', 'svelte/internal'],
  // Single source of truth for VERSION (see src/core/index.ts).
  define: { __LIB_VERSION__: JSON.stringify(version) }
});
