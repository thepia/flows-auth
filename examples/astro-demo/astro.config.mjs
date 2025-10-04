import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
// @ts-check
import { defineConfig } from 'astro/config';

import svelte from '@astrojs/svelte';
import tailwindcss from '@tailwindcss/vite';

const __dirname = dirname(fileURLToPath(import.meta.url));

// https://astro.build/config
export default defineConfig({
  integrations: [svelte()],

  // Astro server config
  server: {
    host: true, // Listen on all network interfaces (0.0.0.0)
    port: 4321
  },

  // Vite server config for HTTPS
  vite: {
    plugins: [tailwindcss()],
    ssr: {
      noExternal: ['phosphor-svelte']
    },
    server: {
      host: true, // Listen on all network interfaces
      https: {
        key: readFileSync(resolve(__dirname, 'certs/dev.thepia.net-key.pem')),
        cert: readFileSync(resolve(__dirname, 'certs/dev.thepia.net.pem'))
      },
      hmr: {
        // Fix WebSocket connection for custom domain
        protocol: 'wss',
        host: 'dev.thepia.net',
        port: 24678, // Separate port for HMR WebSocket
        clientPort: 24678
      }
    }
  }
});
