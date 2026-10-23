import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const __dirname = dirname(fileURLToPath(import.meta.url));
// Shared from tasks-app-demo rather than duplicated here -- see that
// directory's certs/README.md for how they're generated (mkcert) and why
// they're safe to check in (dev-only, dev.thepia.net resolves to 127.0.0.1
// via /etc/hosts, domain controlled by Thepia).
const certsDir = resolve(__dirname, '../tasks-app-demo/certs');

export default defineConfig({
  // Opt in DEBUG so `import.meta.env.DEBUG` (see src/core/utils/debug.ts) is
  // readable from a `DEBUG=true` env var / `.env.local` entry -- temporary
  // diagnostic aid for tracing the sign-in state-machine transition.
  envPrefix: ['VITE_', 'DEBUG'],
  plugins: [react()],
  server: {
    // Matches the other examples (auth-demo, tasks-app-demo, flows-app-demo,
    // astro-demo): the demo config points checkUser/etc. at the real
    // https://api.thepia.com, and that API's CORS policy allows the
    // dev.thepia.net origin, not arbitrary localhost ports (see
    // examples/tasks-app-demo/certs/README.md's "Integration with API
    // Server" section) -- WebAuthn/passkeys also require a secure context.
    host: 'dev.thepia.net',
    port: 5178,
    strictPort: true,
    https: {
      key: readFileSync(resolve(certsDir, 'dev.thepia.net-key.pem')),
      cert: readFileSync(resolve(certsDir, 'dev.thepia.net.crt'))
    }
  }
});
