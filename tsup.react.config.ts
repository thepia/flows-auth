import { readFileSync } from 'node:fs';
import { defineConfig } from 'tsup';

const { version } = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));

// React target -> dist/react/index.js (+ dist/react/index.d.ts), the `./react` export.
// Unlike core (tsup.config.ts), `dts: true` here: React source doesn't touch the
// committed Paraglide output that breaks tsup's rollup-plugin-dts, so a single
// tsup pass can emit both JS and types.
export default defineConfig({
  entry: {
    index: 'src/react/index.ts'
  },
  format: ['esm'],
  dts: true,
  outDir: 'dist/react',
  target: 'es2020',
  sourcemap: true,
  clean: false, // orchestrated by scripts/build.mjs
  splitting: false,
  treeshake: true,
  // React (and the icon set the UI components render) must be provided by the
  // consumer, not bundled -- same optional-peer-dependency pattern as `phosphor-svelte`
  // on the Svelte target. Icons are imported via deep per-icon paths
  // (`@phosphor-icons/react/dist/csr/Key`, see AuthButton.tsx/AuthExplainer.tsx for why),
  // so the external match needs the subpath, not just the bare package name.
  external: [
    'react',
    'react-dom',
    'react/jsx-runtime',
    '@phosphor-icons/react',
    /^@phosphor-icons\/react\//
  ],
  // Single source of truth for VERSION (see src/core/index.ts).
  define: { __LIB_VERSION__: JSON.stringify(version) }
});
