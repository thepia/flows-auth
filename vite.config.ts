import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { resolve } from 'path';
import sveltePreprocess from 'svelte-preprocess';
import dts from 'vite-plugin-dts';

export default defineConfig({
  plugins: [
    svelte({
      preprocess: sveltePreprocess(),
      compilerOptions: {
        dev: false
      },
      emitCss: true
    }),
    dts({
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.test.ts', 'tests/**/*']
    })
  ],
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'ThepiaAuthLibrary',
      fileName: (format) => format === 'es' ? 'index.js' : 'index.cjs',
      formats: ['es', 'cjs']
    },
    rollupOptions: {
      external: ['svelte', 'svelte/store', 'svelte/internal'],
      output: {
        globals: {
          svelte: 'Svelte',
          'svelte/store': 'SvelteStore',
          'svelte/internal': 'SvelteInternal'
        }
      }
    },
    sourcemap: true,
    target: 'es2020',
    minify: false
  }
});