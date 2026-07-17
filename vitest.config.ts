import { resolve } from 'node:path';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { svelteTesting } from '@testing-library/svelte/vite';
import sveltePreprocess from 'svelte-preprocess';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [
    svelte({
      preprocess: sveltePreprocess(),
      hot: !process.env.VITEST
    }),
    svelteTesting()
  ],
  optimizeDeps: {
    include: ['phosphor-svelte']
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    env: {
      // Integration tests hit the local dev API server (dev.thepia.com:8443)
      // over HTTPS with a certificate Node's fetch doesn't trust by default
      // (unlike curl, which trusts it via the system CA store). Without
      // this, the health-check silently falls back to production and those
      // tests hang/time out. Applies here so it works uniformly whether
      // tests run via npm scripts or the VS Code Vitest extension, which
      // invokes vitest directly against this config.
      NODE_TLS_REJECT_UNAUTHORIZED: '0'
    },
    server: {
      deps: {
        external: ['phosphor-svelte']
      }
    },
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/examples/**',
      '**/coverage/**',
      '**/build/**',
      '**/tests/disabled/**',
      '**/*.timestamp-*.mjs'
    ],
    testTimeout: 10000,
    // Simplified for VS Code compatibility
    reporters: ['verbose'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'coverage/**',
        'dist/**',
        'examples/**',
        '**/*.d.ts',
        '**/*.test.{js,ts}',
        '**/*.spec.{js,ts}'
      ]
    }
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src')
    }
  }
});
