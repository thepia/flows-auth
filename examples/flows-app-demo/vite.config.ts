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
    // Disable caching for development
    watch: {
      // Watch node_modules for changes (normally ignored)
      ignored: ['!**/node_modules/@thepia/flows-auth/**']
    }
  },
  // Disable caching entirely in dev
  cacheDir: process.env.VITE_DISABLE_CACHE === 'true' ? false : undefined
});
