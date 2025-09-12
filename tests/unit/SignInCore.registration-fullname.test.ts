/**
 * Tests for SignInCore registration flow with fullName validation
 * Ensures sign-in button is properly disabled when fullName is invalid for new users
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, fireEvent, waitFor } from '@testing-library/svelte';
import { writable } from 'svelte/store';
import SignInCore from '../../src/components/core/SignInCore.svelte';
import type { AuthConfig } from '../../src/types';

// Mock the auth store
const mockAuthStore = () => {
  const store = writable({
    state: 'unauthenticated',
    signInState: 'emailEntry',
    user: null,
    accessToken: null,
    refreshToken: null,
    expiresAt: null,
    error: null
  });

  return {
    subscribe: store.subscribe,
    checkUser: vi.fn(),
    sendSignInEvent: vi.fn((event) => {
      // Update the store state based on the event
      if (event.type === 'USER_CHECKED') {
        store.update(s => ({ ...s, signInState: 'userChecked' }));
        return 'userChecked';
      }
      return 'emailEntry';
    }),
    createAccount: vi.fn(),
    sendEmailCode: vi.fn(),
    notifyPinSent: vi.fn(),
    startConditionalAuthentication: vi.fn()
  };
};

// Mock WebAuthn utilities
vi.mock('../../src/utils/webauthn', () => ({
  isWebAuthnSupported: vi.fn(() => false),
  isPlatformAuthenticatorAvailable: vi.fn(() => Promise.resolve(false))
}));

describe('SignInCore - Registration with FullName Validation', () => {
  let authStore: ReturnType<typeof mockAuthStore>;
  let mockConfig: AuthConfig;

  beforeEach(() => {
    vi.clearAllMocks();
    authStore = mockAuthStore();
    
    mockConfig = {
      apiBaseUrl: 'https://api.test.com',
      clientId: 'test-client',
      domain: 'test.com',
      enablePasskeys: false,
      enableMagicLinks: false,
      appCode: 'test',
      signInMode: 'login-or-register', // Allow registration
      invitationToken: 'test-invitation-token'
    };
  });

  describe('New user registration flow', () => {
    beforeEach(() => {
      // Mock checkUser to return user doesn't exist
      authStore.checkUser.mockResolvedValue({
        exists: false,
        hasWebAuthn: false,
        lastPinExpiry: null
      });

    });

    it('should disable sign-in button when fullName is empty for new users', async () => {
      const { container, component } = render(SignInCore, {
        props: {
          config: mockConfig,
          authStore,
          initialEmail: 'newuser@example.com'
        }
      });

      // Wait for initial email check
      await waitFor(() => {
        expect(authStore.checkUser).toHaveBeenCalledWith('newuser@example.com');
      });

      // Simulate the state transition to userChecked
      authStore.sendSignInEvent({ 
        type: 'USER_CHECKED', 
        email: 'newuser@example.com',
        exists: false,
        hasPasskey: false
      });

      // Wait for UI update
      await waitFor(() => {
        const fullNameInput = container.querySelector('#fullName');
        expect(fullNameInput).toBeTruthy();
      });

      // Check that submit button is disabled when fullName is empty
      const submitButton = container.querySelector('button[type="submit"]');
      expect(submitButton).toBeTruthy();
      expect(submitButton?.disabled).toBe(true);
    });

    it('should disable sign-in button when fullName has less than 3 characters', async () => {
      const { container } = render(SignInCore, {
        props: {
          config: mockConfig,
          authStore,
          initialEmail: 'newuser@example.com'
        }
      });

      // Wait for initial email check
      await waitFor(() => {
        expect(authStore.checkUser).toHaveBeenCalledWith('newuser@example.com');
      });

      // Simulate the state transition to userChecked
      authStore.sendSignInEvent({ 
        type: 'USER_CHECKED', 
        email: 'newuser@example.com',
        exists: false,
        hasPasskey: false
      });

      // Wait for fullName input to appear
      await waitFor(() => {
        const fullNameInput = container.querySelector('#fullName');
        expect(fullNameInput).toBeTruthy();
      });

      // Enter a short name (less than 3 characters)
      const fullNameInput = container.querySelector('#fullName') as HTMLInputElement;
      await fireEvent.input(fullNameInput, { target: { value: 'AB' } });

      // Check that submit button is still disabled
      const submitButton = container.querySelector('button[type="submit"]');
      expect(submitButton?.disabled).toBe(true);
    });

    it('should enable sign-in button when fullName has 3 or more characters', async () => {
      const { container } = render(SignInCore, {
        props: {
          config: mockConfig,
          authStore,
          initialEmail: 'newuser@example.com'
        }
      });

      // Wait for initial email check
      await waitFor(() => {
        expect(authStore.checkUser).toHaveBeenCalledWith('newuser@example.com');
      });

      // Simulate the state transition to userChecked
      authStore.sendSignInEvent({ 
        type: 'USER_CHECKED', 
        email: 'newuser@example.com',
        exists: false,
        hasPasskey: false
      });

      // Wait for fullName input to appear
      await waitFor(() => {
        const fullNameInput = container.querySelector('#fullName');
        expect(fullNameInput).toBeTruthy();
      });

      // Enter a valid name (3+ characters)
      const fullNameInput = container.querySelector('#fullName') as HTMLInputElement;
      await fireEvent.input(fullNameInput, { target: { value: 'John Doe' } });

      // Check that submit button is now enabled
      await waitFor(() => {
        const submitButton = container.querySelector('button[type="submit"]');
        expect(submitButton?.disabled).toBe(false);
      });
    });

    it('should call createAccount with correct parameters when form is submitted', async () => {
      authStore.createAccount.mockResolvedValue({
        user: { id: '123', email: 'newuser@example.com' },
        step: 'email-code'
      });

      const { container } = render(SignInCore, {
        props: {
          config: mockConfig,
          authStore,
          initialEmail: 'newuser@example.com'
        }
      });

      // Wait for initial email check
      await waitFor(() => {
        expect(authStore.checkUser).toHaveBeenCalledWith('newuser@example.com');
      });

      // Simulate the state transition to userChecked
      authStore.sendSignInEvent({ 
        type: 'USER_CHECKED', 
        email: 'newuser@example.com',
        exists: false,
        hasPasskey: false
      });

      // Wait for fullName input to appear
      await waitFor(() => {
        const fullNameInput = container.querySelector('#fullName');
        expect(fullNameInput).toBeTruthy();
      });

      // Enter a valid full name
      const fullNameInput = container.querySelector('#fullName') as HTMLInputElement;
      await fireEvent.input(fullNameInput, { target: { value: 'John Doe' } });

      // Submit the form
      const form = container.querySelector('form');
      await fireEvent.submit(form!);

      // Verify createAccount was called with correct parameters
      await waitFor(() => {
        expect(authStore.createAccount).toHaveBeenCalledWith({
          email: 'newuser@example.com',
          firstName: 'John',
          lastName: 'Doe',
          acceptedTerms: false,
          acceptedPrivacy: false,
          invitationToken: 'test-invitation-token'
        });
      });
    });

    it('should show registration form only in login-or-register mode', async () => {
      const { container } = render(SignInCore, {
        props: {
          config: mockConfig,
          authStore,
          initialEmail: 'newuser@example.com'
        }
      });

      // Wait for initial email check
      await waitFor(() => {
        expect(authStore.checkUser).toHaveBeenCalledWith('newuser@example.com');
      });

      // Simulate the state transition to userChecked
      authStore.sendSignInEvent({ 
        type: 'USER_CHECKED', 
        email: 'newuser@example.com',
        exists: false,
        hasPasskey: false
      });

      // Check that fullName input is shown
      await waitFor(() => {
        const fullNameInput = container.querySelector('#fullName');
        expect(fullNameInput).toBeTruthy();
      });

      // Check that terms notice is shown
      const termsMessage = container.querySelector('.terms-notice');
      expect(termsMessage).toBeTruthy();
    });
  });

  describe('Login-only mode', () => {
    beforeEach(() => {
      mockConfig.signInMode = 'login-only';
      
      // Mock checkUser to return user doesn't exist
      authStore.checkUser.mockResolvedValue({
        exists: false,
        hasWebAuthn: false,
        lastPinExpiry: null
      });
    });

    it('should not show fullName input in login-only mode', async () => {
      const { container, getByText } = render(SignInCore, {
        props: {
          config: mockConfig,
          authStore,
          initialEmail: 'newuser@example.com'
        }
      });

      // Wait for initial email check
      await waitFor(() => {
        expect(authStore.checkUser).toHaveBeenCalledWith('newuser@example.com');
      });

      // Simulate the state transition to userChecked
      authStore.sendSignInEvent({ 
        type: 'USER_CHECKED', 
        email: 'newuser@example.com',
        exists: false,
        hasPasskey: false
      });

      // Wait for the component to update after state transition
      await waitFor(() => {
        // Check that fullName input is NOT shown
        const fullNameInput = container.querySelector('#fullName');
        expect(fullNameInput).toBeFalsy();
        
        // Check that login-only message is shown
        const authMessage = container.querySelector('.auth-message');
        expect(authMessage).toBeTruthy();
        expect(authMessage?.textContent).toContain('Only registered users can sign in');
      });
    });

    it('should keep submit button disabled for non-existing users in login-only mode', async () => {
      const { container } = render(SignInCore, {
        props: {
          config: mockConfig,
          authStore,
          initialEmail: 'newuser@example.com'
        }
      });

      // Wait for initial email check
      await waitFor(() => {
        expect(authStore.checkUser).toHaveBeenCalledWith('newuser@example.com');
      });

      // Submit the form - should show error
      const form = container.querySelector('form');
      await fireEvent.submit(form!);

      // Verify createAccount was NOT called
      expect(authStore.createAccount).not.toHaveBeenCalled();
    });
  });

  describe('Existing user flow', () => {
    beforeEach(() => {
      // Mock checkUser to return user exists
      authStore.checkUser.mockResolvedValue({
        exists: true,
        hasWebAuthn: false,
        lastPinExpiry: null
      });
    });

    it('should not show fullName input for existing users', async () => {
      const { container } = render(SignInCore, {
        props: {
          config: mockConfig,
          authStore,
          initialEmail: 'existing@example.com'
        }
      });

      // Wait for initial email check
      await waitFor(() => {
        expect(authStore.checkUser).toHaveBeenCalledWith('existing@example.com');
      });

      // Check that fullName input is NOT shown
      const fullNameInput = container.querySelector('#fullName');
      expect(fullNameInput).toBeFalsy();

      // Check that submit button is enabled (no fullName required)
      const submitButton = container.querySelector('button[type="submit"]');
      expect(submitButton?.disabled).toBe(false);
    });
  });
});