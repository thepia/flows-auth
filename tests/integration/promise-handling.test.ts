/**
 * Promise handling tests
 * These tests ensure promise rejections are properly handled to prevent unhandled promise rejections
 */

import { fireEvent, render, waitFor } from '@testing-library/svelte';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import SignInForm from '../../src/components/SignInForm.svelte';
import { createDefaultConfig } from '../../src/index';

describe('Promise Handling', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Mock fetch with rejection
    global.fetch = vi.fn();

    // Reset WebAuthn mocks
    Object.defineProperty(navigator, 'credentials', {
      value: {
        create: vi.fn(),
        get: vi.fn()
      },
      writable: true,
      configurable: true
    });
  });

  it('should handle API errors gracefully without unhandled promise rejections', async () => {
    const config = createDefaultConfig({
      apiBaseUrl: 'https://api.test.com',
      clientId: 'test-client',
      enablePasskeys: true
    });

    // Mock API to reject
    global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

    const { getByLabelText, getByRole } = render(SignInForm, {
      props: { config }
    });

    const emailInput = getByLabelText('Email address');
    const continueButton = getByRole('button', { name: /continue/i });

    // Enter email and submit
    await fireEvent.input(emailInput, { target: { value: 'test@example.com' } });
    await fireEvent.click(continueButton);

    // Should handle the error without throwing unhandled promise rejection
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
    });

    // Component should show error state instead of crashing
    await waitFor(() => {
      expect(continueButton).not.toHaveAttribute('disabled');
    });
  });

  it('should handle WebAuthn failures gracefully', async () => {
    const config = createDefaultConfig({
      apiBaseUrl: 'https://api.test.com',
      clientId: 'test-client',
      enablePasskeys: true
    });

    // Mock successful email check with passkey
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          exists: true,
          hasPasskey: true
        })
    });

    // Mock WebAuthn to reject
    navigator.credentials.get = vi.fn().mockRejectedValue(new Error('User cancelled'));

    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const { getByLabelText, getByRole, queryByText } = render(SignInForm, {
      props: { config }
    });

    const emailInput = getByLabelText('Email address');
    const continueButton = getByRole('button', { name: /continue/i });

    // Enter email and submit
    await fireEvent.input(emailInput, { target: { value: 'test@example.com' } });
    await fireEvent.click(continueButton);

    // Should fallback to magic link step after WebAuthn fails
    await waitFor(() => {
      expect(queryByText('Check your email')).toBeInTheDocument();
    });

    // Should log warning instead of throwing unhandled rejection
    expect(consoleSpy).toHaveBeenCalledWith('Passkey authentication failed:', expect.any(Error));

    consoleSpy.mockRestore();
  });

  it('should handle magic link failures gracefully', async () => {
    const config = createDefaultConfig({
      apiBaseUrl: 'https://api.test.com',
      clientId: 'test-client',
      enablePasskeys: false,
      enableMagicPins: true
    });

    // Mock successful email check, then reject magic link
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            exists: true,
            hasPasskey: false
          })
      })
      .mockRejectedValueOnce(new Error('Magic link service unavailable'));

    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const { getByLabelText, getByRole, queryByText } = render(SignInForm, {
      props: { config }
    });

    const emailInput = getByLabelText('Email address');
    const continueButton = getByRole('button', { name: /continue/i });

    // Enter email and submit
    await fireEvent.input(emailInput, { target: { value: 'test@example.com' } });
    await fireEvent.click(continueButton);

    // Should show error message when magic link fails and no other auth methods available
    await waitFor(() => {
      expect(queryByText('Unable to send magic link')).toBeInTheDocument();
    });

    // Should log warning instead of throwing unhandled rejection
    expect(consoleSpy).toHaveBeenCalledWith('Magic link failed:', expect.any(Error));

    consoleSpy.mockRestore();
  });

  it('should handle nested promise failures in fallback scenarios', async () => {
    const config = createDefaultConfig({
      apiBaseUrl: 'https://api.test.com',
      clientId: 'test-client',
      enablePasskeys: true,
      enableMagicPins: true
    });

    // Mock successful email check with passkey
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            exists: true,
            hasPasskey: true
          })
      })
      .mockRejectedValueOnce(new Error('Magic link service unavailable'));

    // Mock WebAuthn to reject (triggering fallback to magic link)
    navigator.credentials.get = vi.fn().mockRejectedValue(new Error('WebAuthn failed'));

    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const { getByLabelText, getByRole, queryByText } = render(SignInForm, {
      props: { config }
    });

    const emailInput = getByLabelText('Email address');
    const continueButton = getByRole('button', { name: /continue/i });

    // Enter email and submit
    await fireEvent.input(emailInput, { target: { value: 'test@example.com' } });
    await fireEvent.click(continueButton);

    // Should show error message when both WebAuthn and magic link fail
    await waitFor(() => {
      expect(queryByText('Unable to send magic link')).toBeInTheDocument();
    });

    // Should log warnings for both failures
    expect(consoleSpy).toHaveBeenCalledWith('Passkey authentication failed:', expect.any(Error));
    expect(consoleSpy).toHaveBeenCalledWith('Magic link failed:', expect.any(Error));

    consoleSpy.mockRestore();
  });
});
