import { svelte } from '@sveltejs/vite-plugin-svelte';
import sveltePreprocess from 'svelte-preprocess';
import { defineConfig } from 'vite';

// CSS-only pass. svelte-package does NOT bundle CSS — component <style> blocks
// are injected at runtime by each compiled component (which is fine on its own).
// This extra pass exists purely to keep emitting a single bundled
// dist/flows-auth.css for the transitional `./style.css` export (safer for SSR /
// external consumers than relying solely on runtime injection). The JS output of
// this build is throwaway and deleted by scripts/build.mjs.
//
// Two lib entries feed the one combined stylesheet: the Svelte component tree
// (compiled via the svelte plugin, `emitCss: true`) and `src/react/styles-entry.ts`
// (a plain side-effect-only `.ts` file that imports every React component's `.css`).
// `cssCodeSplit: false` makes Rollup emit a single CSS asset regardless of entry
// count, so both targets' styles land in the same `dist/flows-auth.css` — see
// `src/react/styles-entry.ts` for why the two targets intentionally share one file.
export default defineConfig({
  plugins: [
    svelte({
      preprocess: sveltePreprocess(),
      compilerOptions: { dev: false },
      emitCss: true
    })
  ],
  build: {
    lib: {
      entry: {
        'svelte-css-only': 'src/svelte/index.ts',
        'react-css-only': 'src/react/styles-entry.ts'
      },
      formats: ['es'],
      fileName: (_format, entryName) => `${entryName}.js`
    },
    rollupOptions: {
      // Externalize everything except the components we're compiling for CSS.
      external: [
        /^@thepia\/flows-auth/,
        'svelte',
        /^svelte\//,
        '@xyflow/svelte',
        'd3',
        /^d3-/,
        'phosphor-svelte',
        '@phosphor-icons/react',
        'react',
        /^react\//,
        'react-dom',
        '@dagrejs/dagre'
      ],
      output: { assetFileNames: 'flows-auth.[ext]' }
    },
    outDir: 'dist',
    emptyOutDir: false,
    cssCodeSplit: false,
    sourcemap: false
  }
});
