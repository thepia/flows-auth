import { sveltekit } from '@sveltejs/kit/vite';
import { flowsAuthTreeshake } from '@thepia/flows-auth/vite-preset';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [sveltekit()],
  ssr: {
    noExternal: ['@thepia/flows-auth']
  },
  optimizeDeps: {
    include: ['@thepia/flows-auth']
  },
  resolve: {
    dedupe: ['svelte']
  },
  server: {
    host: 'dev.thepia.net',
    port: 5176,
    https: {
      key: './certs/dev.thepia.net-key.pem',
      cert: './certs/dev.thepia.net.crt'
    },
    hmr: {
      port: 5177,
      host: 'dev.thepia.net'
    }
  },
  build: {
    rollupOptions: {
      treeshake: flowsAuthTreeshake
    }
  }
});
