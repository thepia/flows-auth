import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

export default defineConfig(({ mode }) => ({
  plugins: [sveltekit(), tailwindcss()],
  ssr: {
    noExternal: ['@thepia/flows-auth']
  },
  optimizeDeps: {
    exclude: ['@thepia/flows-auth'], // Force fresh rebuild of local package
    force: false // DISABLE constant rebuilds
  },
  resolve: {
    dedupe: ['svelte']
  },
  server: {
    host: 'dev.thepia.net',
    port: 5177,
    strictPort: true, // Don't try other ports
    https: {
      key: '../tasks-app-demo/certs/dev.thepia.net-key.pem',
      cert: '../tasks-app-demo/certs/dev.thepia.net.crt'
    },
    hmr: {
      port: 5177,
      host: 'dev.thepia.net'
    },
    fs: {
      strict: false
    },
    // DISABLE file watching to prevent constant reloads
    watch: {
      ignored: ['**/.git/**', '**/node_modules/**', '**/dist/**']
    }
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: undefined // Prevent aggressive caching
      }
    }
  }
}));
