import { copyFileSync, existsSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import { resolve, join, dirname } from 'node:path';
import { paraglideVitePlugin } from '@inlang/paraglide-js';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import sveltePreprocess from 'svelte-preprocess';
import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';

// Helper function to recursively copy directory
function copyDirRecursive(src: string, dest: string) {
  if (!existsSync(src)) return;

  if (!existsSync(dest)) {
    mkdirSync(dest, { recursive: true });
  }

  const entries = readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = join(src, entry.name);
    const destPath = join(dest, entry.name);

    // Skip .gitignore files to prevent pnpm from ignoring package contents
    if (entry.name === '.gitignore') {
      continue;
    }

    if (entry.isDirectory()) {
      copyDirRecursive(srcPath, destPath);
    } else {
      copyFileSync(srcPath, destPath);
    }
  }
}

// Custom plugin to copy source files to dist/src for source imports
function copySourceFiles() {
  return {
    name: 'copy-source-files',
    writeBundle() {
      const srcDir = resolve(__dirname, 'src');
      const distSrcDir = resolve(__dirname, 'dist/src');

      console.log('📦 Copying source files to dist/src for source imports...');

      // Copy entire src directory to dist/src
      copyDirRecursive(srcDir, distSrcDir);

      console.log('✅ Copied all source files to dist/src');

      // Also copy to dist/paraglide for backward compatibility
      const paraglideSrc = resolve(__dirname, 'src/paraglide');
      const paraglideDistRoot = resolve(__dirname, 'dist/paraglide');

      if (existsSync(paraglideSrc)) {
        copyDirRecursive(paraglideSrc, paraglideDistRoot);
        console.log('✅ Copied Paraglide files to dist/paraglide');
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
    copySourceFiles()
  ],
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'ThepiaAuthLibrary',
      fileName: (format) => (format === 'es' ? 'index.js' : 'index.cjs'),
      formats: ['es', 'cjs']
    },
    rollupOptions: {
      external: ['svelte', 'svelte/store', 'd3'],
      output: {
        globals: {
          svelte: 'Svelte',
          'svelte/store': 'SvelteStore',
          d3: 'D3'
        }
      },
      // Suppress dynamic import warnings for modules that are both statically and dynamically imported
      onwarn(warning, warn) {
        // Skip certain warnings
        if (warning.code === 'UNUSED_EXTERNAL_IMPORT') return;

        // Skip dynamic import warnings for specific modules we know about
        if (
          warning.message &&
          warning.message.includes('dynamically imported') &&
          (warning.message.includes('webauthn') ||
            warning.message.includes('sessionManager') ||
            warning.message.includes('invitation-tokens') ||
            warning.message.includes('errorReporter') ||
            warning.message.includes('api-detection'))
        ) {
          return;
        }

        // Use default for everything else
        warn(warning);
      }
    },
    sourcemap: true,
    target: 'es2020',
    minify: 'esbuild'  // Strip comments and minify dist builds
  }
});
