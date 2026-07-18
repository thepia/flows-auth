import { svelte } from '@sveltejs/vite-plugin-svelte';
import sveltePreprocess from 'svelte-preprocess';
import { defineConfig } from 'vite';

// CSS-only pass. svelte-package does NOT bundle CSS — component <style> blocks
// are injected at runtime by each compiled component (which is fine on its own).
// This extra pass exists purely to keep emitting a single bundled
// dist/flows-auth.css for the transitional `./style.css` export (safer for SSR /
// external consumers than relying solely on runtime injection). The JS output of
// this build is throwaway and deleted by scripts/build.mjs.
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
      entry: 'src/svelte/index.ts',
      formats: ['es'],
      fileName: () => '__css-only.js'
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
