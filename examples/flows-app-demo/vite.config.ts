import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [sveltekit()],
  ssr: {
    noExternal: ['@thepia/flows-auth']
  },
  optimizeDeps: {
    include: ['@thepia/flows-auth'],
    // Force re-optimization of dependencies on every server start
    force: true
  },
  server: {
    host: 'dev.thepia.net',
    port: 5175,
    https: {
      key: './certs/dev.thepia.net-key.pem',
      cert: './certs/dev.thepia.net.crt'
    },
    // Aggressive cache busting for development
    watch: {
      // Watch node_modules for changes (normally ignored)
      ignored: ['!**/node_modules/@thepia/flows-auth/**']
    },
    // Clear module cache on every request
    hmr: {
      overlay: true
    }
  },
  // Always disable caching in dev
  cacheDir: '.vite-cache',
  build: {
    // Clear output dir before build
    emptyOutDir: true
  }
});
