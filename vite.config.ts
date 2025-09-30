import { copyFileSync, existsSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { paraglideVitePlugin } from '@inlang/paraglide-js';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import sveltePreprocess from 'svelte-preprocess';
import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';

// Custom plugin to copy Paraglide files to dist
function copyParaglideFiles() {
  return {
    name: 'copy-paraglide-files',
    writeBundle() {
      const srcDir = resolve(__dirname, 'src/paraglide');
      const distDir = resolve(__dirname, 'dist/paraglide');

      if (existsSync(srcDir)) {
        if (!existsSync(distDir)) {
          mkdirSync(distDir, { recursive: true });
        }

        // Copy runtime.js
        const runtimeSrc = resolve(srcDir, 'runtime.js');
        const runtimeDist = resolve(distDir, 'runtime.js');
        if (existsSync(runtimeSrc)) {
          copyFileSync(runtimeSrc, runtimeDist);
          console.log('✅ Copied Paraglide runtime.js to dist');
        }

        // Copy messages.js (main messages file)
        const messagesSrc = resolve(srcDir, 'messages.js');
        const messagesDist = resolve(distDir, 'messages.js');
        if (existsSync(messagesSrc)) {
          copyFileSync(messagesSrc, messagesDist);
          console.log('✅ Copied Paraglide messages.js to dist');
        }

        // Copy entire messages/ directory recursively
        const messagesDir = resolve(srcDir, 'messages');
        const messagesDistDir = resolve(distDir, 'messages');
        if (existsSync(messagesDir)) {
          if (!existsSync(messagesDistDir)) {
            mkdirSync(messagesDistDir, { recursive: true });
          }

          // Copy all files in messages directory
          const files = readdirSync(messagesDir);
          for (const file of files) {
            const srcFile = resolve(messagesDir, file);
            const distFile = resolve(messagesDistDir, file);
            if (statSync(srcFile).isFile()) {
              copyFileSync(srcFile, distFile);
            }
          }
          console.log('✅ Copied Paraglide messages/ directory to dist');
        }
      }
    }
  };
}

export default defineConfig({
  plugins: [
    // Paraglide plugin - automatically compiles translations during build
    paraglideVitePlugin({
      project: './project.inlang',
      outdir: './src/paraglide'
    }),
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
    }),
    copyParaglideFiles()
  ],
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'ThepiaAuthLibrary',
      fileName: (format) => (format === 'es' ? 'index.js' : 'index.cjs'),
      formats: ['es', 'cjs']
    },
    rollupOptions: {
      external: ['svelte', 'svelte/store', 'svelte/internal', 'd3'],
      output: {
        globals: {
          svelte: 'Svelte',
          'svelte/store': 'SvelteStore',
          'svelte/internal': 'SvelteInternal',
          d3: 'D3'
        }
      },
      // Suppress dynamic import warnings for modules that are both statically and dynamically imported
      onwarn(warning, warn) {
        // Skip certain warnings
        if (warning.code === 'UNUSED_EXTERNAL_IMPORT') return;

        // Skip dynamic import warnings for specific modules we know about
        if (warning.message && warning.message.includes('dynamically imported') &&
            (warning.message.includes('webauthn') ||
             warning.message.includes('sessionManager') ||
             warning.message.includes('invitation-tokens') ||
             warning.message.includes('errorReporter') ||
             warning.message.includes('api-detection'))) {
          return;
        }

        // Use default for everything else
        warn(warning);
      }
    },
    sourcemap: true,
    target: 'es2020',
    minify: false
  }
});
