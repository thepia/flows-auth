import { SignInForm, getGlobalAuthStore, initializeAuth } from '@thepia/flows-auth/react';
import type { AuthConfig, AuthError, AuthMethod, User } from '@thepia/flows-auth/react';

// This demo proves the `./react` export (hook AND UI components, as of
// Phase C) resolves and wires up correctly for a real workspace-linked
// consumer (types + runtime), *and* performs live authentication against
// the real API server -- `appCode` must be `'demo'` (a registered app code
// server-side, same as auth-demo/tasks-app-demo use) rather than this
// project's own name: appCode becomes the `/{appCode}/check-user` etc. URL
// path segment (see auth-api.ts), and an unregistered code 404s.
const demoConfig: AuthConfig = {
  apiBaseUrl: 'https://api.thepia.com',
  clientId: 'react-demo',
  domain: 'thepia.net',
  appCode: 'demo',
  enablePasskeys: true,
  // Opt-in: fires checkAuthAvailability() once at store creation (see its
  // header comment in auth-store.ts) so a misconfigured appCode or
  // unreachable API surfaces as `error.authUnavailable` immediately, instead
  // of only after a real visitor's first attempt. Store-level, not a
  // component effect -- framework-agnostic and fires exactly once per store
  // instance regardless of how many components render.
  checkAuthAvailabilityOnInit: true,
  branding: {
    companyName: 'flows-auth React demo'
  }
};

// Created once, synchronously, at module load -- not tied to any component's
// render/mount lifecycle. Deliberately not using `<AuthProvider>` here: that
// pattern ties store creation to a `useRef` in a component's render body,
// which React StrictMode's dev-mode double-invoke (mount -> cleanup ->
// remount re-runs only *effects*, never the render body) can destroy without
// ever recreating -- see `src/react/context.tsx`'s header comment. Module-
// scope initialization sidesteps that whole hazard class.
initializeAuth(demoConfig);

export default function App() {
  return (
    <div style={{ maxWidth: 480, margin: '2rem auto' }}>
      <h1>flows-auth React demo</h1>
      <p>Renders the ported `SignInForm` against the global auth store singleton.</p>
      <SignInForm
        store={getGlobalAuthStore()}
        onSuccess={(payload: { user: User; method: AuthMethod }) => {
          console.log('Signed in', payload);
        }}
        onError={(payload: { error: AuthError }) => {
          console.error('Auth error', payload);
        }}
      />
    </div>
  );
}
