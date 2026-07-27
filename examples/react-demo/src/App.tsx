import { AuthProvider, SignInForm } from '@thepia/flows-auth/react';
import type { AuthConfig, AuthError, AuthMethod, User } from '@thepia/flows-auth/react';

// Placeholder config -- this demo only proves the `./react` export (hook AND UI
// components, as of Phase C) resolves and wires up correctly for a real
// workspace-linked consumer (types + runtime); it does not perform live
// authentication against a real API server.
const demoConfig: AuthConfig = {
  apiBaseUrl: 'https://api.thepia.com',
  clientId: 'react-demo',
  domain: 'thepia.net',
  appCode: 'react-demo',
  enablePasskeys: true,
  branding: {
    companyName: 'flows-auth React demo'
  }
};

export default function App() {
  return (
    <AuthProvider config={demoConfig}>
      <div style={{ maxWidth: 480, margin: '2rem auto' }}>
        <h1>flows-auth React demo</h1>
        <p>Renders the ported `SignInForm` against a real `AuthProvider`-backed store.</p>
        <SignInForm
          onSuccess={(payload: { user: User; method: AuthMethod }) => {
            console.log('Signed in', payload);
          }}
          onError={(payload: { error: AuthError }) => {
            console.error('Auth error', payload);
          }}
        />
      </div>
    </AuthProvider>
  );
}
