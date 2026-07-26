/**
 * Fixture for tests/package/debug-log-stripping.test.ts.
 *
 * Stands in for a consuming app: imports the built core entry and references
 * enough of its surface (store creation/teardown, the native-app session
 * adapter, and the standalone invitation/API-detection utilities) to pull in
 * as many `debug()` call sites as the core entry exposes, so a downstream
 * bundler has something real to either strip or keep.
 *
 * Deliberately core-only (no `./svelte` import) -- bundling the Svelte
 * target would need the Vite Svelte plugin in this fixture's build. The
 * svelte-side debug() (src/svelte/utils/debug.ts) is a verbatim duplicate of
 * the same one-line `import.meta.env.DEBUG` gate exercised here, so this
 * still covers the actual mechanism; see debug-log-stripping.test.ts for how
 * the exhaustiveness check accounts for the messages this fixture can't reach.
 */
import {
  createAuthStore,
  createNativeAppSessionAdapter,
  decodeInvitationToken,
  detectDefaultApiServer,
  processInvitationToken
} from '../../../dist/index.js';

export const store = createAuthStore({
  apiBaseUrl: 'https://api.test.com',
  clientId: 'test-client',
  domain: 'test.com',
  appCode: 'test-app',
  enablePasskeys: true
});

store.destroy();

export const utilities = {
  createNativeAppSessionAdapter,
  decodeInvitationToken,
  detectDefaultApiServer,
  processInvitationToken
};
