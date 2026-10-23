import { paraglideVitePlugin } from '@inlang/paraglide-js';
import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { flowsAuthTreeshake } from '@thepia/flows-auth/vite-preset';
import { defineConfig } from 'vite';

export default defineConfig(({ mode }) => ({
  plugins: [
    // Paraglide plugin BEFORE sveltekit for proper compilation
    paraglideVitePlugin({
      project: './project.inlang',
      outdir: './src/paraglide',
      // Must match flows-auth's own src/core/paraglide strategy exactly.
      // auth-demo compiles its own separate Paraglide runtime (for its own
      // page-level messages), independent from flows-auth's -- SvelteKit's
      // paraglide plugin auto-wires this runtime's own getLocale()/setLocale()
      // into routing/hydration regardless of what our own code calls. The two
      // runtimes only stay in sync because they share the same cookie name
      // and (with this fix) the same strategy order. Previously this had
      // 'localStorage' first: the first automatic getLocale() call (before
      // any of our code ran) would freeze whatever locale it saw into
      // localStorage, and since localStorage was checked before cookie on
      // every later call, no locale change made via setLocaleReactive()
      // (which only ever writes the cookie) could ever reach this runtime
      // again -- explaining why translations were stuck and reload never
      // picked up a chosen language.
      strategy: ['cookie', 'globalVariable', 'baseLocale'],
      // Pin the output layout to match flows-auth's own src/paraglide. Paraglide
      // 2.4.0 defaults to "message-modules" (per-message barrel, no en.js/da.js,
      // no dot-notation aliases), which breaks the dot-notation `m["auth.signIn"]`
      // lookups and the paraglide-multi-directory-merge tests. "locale-modules"
      // restores messages/_index.js with `export { fn as "dot.key" }` + en.js/da.js.
      outputStructure: 'locale-modules'
    }),
    sveltekit(),
    tailwindcss()
  ],
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
      },
      treeshake: flowsAuthTreeshake
    }
  }
}));
