/**
 * Integration tests for WebAuthn flow
 * These tests ensure the complete flow from UI to WebAuthn API works correctly
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, fireEvent, waitFor } from '@testing-library/svelte';
import SignInForm from '../../src/components/SignInForm.svelte';
import { createDefaultConfig } from '../../src/index';

// Mock WebAuthn APIs
const mockNavigatorCredentials = {
  create: vi.fn(),
  get: vi.fn()
};

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('WebAuthn Integration Flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Reset navigator credentials mock
    mockNavigatorCredentials.create.mockReset();
    mockNavigatorCredentials.get.mockReset();
    
    // Update navigator.credentials
    Object.defineProperty(navigator, 'credentials', {
      value: mockNavigatorCredentials,
      writable: true,
      configurable: true
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should trigger WebAuthn flow when user has passkeys', async () => {
    const config = createDefaultConfig({
      apiBaseUrl: 'https://api.test.com',
      clientId: 'test-client',
      enablePasskeys: true
    });

    // Mock API responses
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          exists: true,
          hasPasskey: true,
          hasPassword: false,
          socialProviders: []
        })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          challenge: 'test-challenge',
          rpId: 'test.com',
          allowCredentials: []
        })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          step: 'success',
          user: { id: '1', email: 'test@example.com', name: 'Test User' },
          accessToken: 'test-token'
        })
      });

    // Mock WebAuthn credential response
    mockNavigatorCredentials.get.mockResolvedValueOnce({
      id: 'test-credential-id',
      rawId: new ArrayBuffer(16),
      response: {
        clientDataJSON: new ArrayBuffer(32),
        authenticatorData: new ArrayBuffer(32),
        signature: new ArrayBuffer(32),
        userHandle: new ArrayBuffer(8)
      },
      type: 'public-key'
    });

    const { getByLabelText, getByRole } = render(SignInForm, {
      props: { config }
    });

    const emailInput = getByLabelText('Email address');
    const continueButton = getByRole('button', { name: /continue|checking/i });

    // Enter email and submit
    await fireEvent.input(emailInput, { target: { value: 'test@example.com' } });
    await fireEvent.click(continueButton);

    // Wait for WebAuthn flow to complete
    await waitFor(() => {
      expect(mockNavigatorCredentials.get).toHaveBeenCalled();
    }, { timeout: 5000 });

    // Verify API calls were made
    expect(mockFetch).toHaveBeenCalledWith('https://api.test.com/auth/check-user', expect.any(Object));
    expect(mockFetch).toHaveBeenCalledWith('https://api.test.com/auth/webauthn/challenge', expect.any(Object));
    expect(mockFetch).toHaveBeenCalledWith('https://api.test.com/auth/signin/passkey', expect.any(Object));
  });

  it('should fallback to password when WebAuthn fails', async () => {
    const config = createDefaultConfig({
      apiBaseUrl: 'https://api.test.com',
      clientId: 'test-client',
      enablePasskeys: true,
      enablePasswordLogin: true
    });

    // Mock API responses
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          exists: true,
          hasPasskey: true,
          hasPassword: true,
          socialProviders: []
        })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          challenge: 'test-challenge',
          rpId: 'test.com',
          allowCredentials: []
        })
      });

    // Mock WebAuthn failure
    mockNavigatorCredentials.get.mockRejectedValueOnce(new Error('User cancelled'));

    const { getByLabelText, getByRole, queryByText } = render(SignInForm, {
      props: { config }
    });

    const emailInput = getByLabelText('Email address');
    const continueButton = getByRole('button', { name: /continue|checking/i });

    // Enter email and submit
    await fireEvent.input(emailInput, { target: { value: 'test@example.com' } });
    await fireEvent.click(continueButton);

    // Wait for fallback to password step
    await waitFor(() => {
      expect(queryByText('Enter your password')).toBeInTheDocument();
    });

    expect(mockNavigatorCredentials.get).toHaveBeenCalled();
  });

  it('should skip WebAuthn when passkeys are disabled', async () => {
    const config = createDefaultConfig({
      apiBaseUrl: 'https://api.test.com',
      clientId: 'test-client',
      enablePasskeys: false,
      enablePasswordLogin: true
    });

    // Mock API response
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        exists: true,
        hasPasskey: true,
        hasPassword: true,
        socialProviders: []
      })
    });

    const { getByLabelText, getByRole, queryByText } = render(SignInForm, {
      props: { config }
    });

    const emailInput = getByLabelText('Email address');
    const continueButton = getByRole('button', { name: /continue|checking/i });

    // Enter email and submit
    await fireEvent.input(emailInput, { target: { value: 'test@example.com' } });
    await fireEvent.click(continueButton);

    // Should go directly to password step
    await waitFor(() => {
      expect(queryByText('Enter your password')).toBeInTheDocument();
    });

    // WebAuthn should not be called
    expect(mockNavigatorCredentials.get).not.toHaveBeenCalled();
  });

  it('should handle WebAuthn not supported gracefully', async () => {
    // Temporarily remove WebAuthn support
    const originalPKC = global.PublicKeyCredential;
    delete (global as any).PublicKeyCredential;

    const config = createDefaultConfig({
      apiBaseUrl: 'https://api.test.com',
      clientId: 'test-client',
      enablePasskeys: true,
      enablePasswordLogin: true
    });

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        exists: true,
        hasPasskey: true,
        hasPassword: true,
        socialProviders: []
      })
    });

    const { getByLabelText, getByRole, queryByText } = render(SignInForm, {
      props: { config }
    });

    const emailInput = getByLabelText('Email address');
    const continueButton = getByRole('button', { name: /continue|checking/i });

    // Enter email and submit
    await fireEvent.input(emailInput, { target: { value: 'test@example.com' } });
    await fireEvent.click(continueButton);

    // Should fallback to password since WebAuthn is not supported
    await waitFor(() => {
      expect(queryByText('Enter your password')).toBeInTheDocument();
    });
    
    // Restore WebAuthn support
    (global as any).PublicKeyCredential = originalPKC;
  });
});