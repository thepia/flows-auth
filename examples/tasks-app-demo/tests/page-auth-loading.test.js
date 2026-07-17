/**
 * Regression test for the tasks app getting stuck on
 * "Loading authentication system..." forever.
 *
 * The auth section in +page.svelte only renders <SignInForm> when
 * `authStore && authConfig && showAuthForm` is true. `authConfig` is a
 * component-local `let authConfig = null` that nothing in the component
 * ever assigns, so once the store reports "not loading, no user" the UI
 * falls into the permanent `{:else}` fallback instead of showing sign-in.
 */
import { render, screen, waitFor } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';
import SignInFormStub from './support/SignInFormStub.svelte';

const mockAuthStore = {
  subscribe: vi.fn((callback) => {
    callback({ state: 'unauthenticated', user: null, isLoading: false });
    return () => {};
  }),
  getConfig: vi.fn(() => ({
    domain: 'test.local',
    apiBaseUrl: 'https://api.test.local',
    clientId: 'tasks-app-demo-test'
  })),
  signOut: vi.fn()
};

// +page.svelte only uses SignInForm and getAuthStoreFromContext at runtime
// (the User import is type-only and erased at compile time), so the mock
// stays fully self-contained — no need to load the real package here.
vi.mock('@thepia/flows-auth', () => ({
  SignInForm: SignInFormStub,
  getAuthStoreFromContext: () => mockAuthStore
}));

import Page from '../src/routes/+page.svelte';

describe('Tasks app auth loading state', () => {
  it('shows the sign-in UI instead of staying stuck on "Loading authentication system..."', async () => {
    render(Page);

    // Once the store reports it's done loading and there's no user, the app
    // must move past the "Loading authentication system..." placeholder.
    await waitFor(
      () => {
        expect(screen.queryByText('Loading authentication system...')).toBeNull();
      },
      { timeout: 2000 }
    );
  });
});
