import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [sveltekit()],
  // Vitest runs test files through Vite's SSR pipeline by default, which
  // resolves `svelte` to its server build (no mount()/effects). Component
  // tests need the browser build instead. See:
  // https://testing-library.com/docs/svelte-testing-library/setup
  resolve: process.env.VITEST ? { conditions: ['browser'] } : undefined,
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup.js'],
    include: ['tests/**/*.test.js'],
    exclude: ['node_modules/**/*', 'dist/**/*']
  }
});
