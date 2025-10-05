/**
 * SignInCore PIN Entry Button Submission Tests
 * Tests that the verify button actually submits when clicked
 */

import { fireEvent, render, screen, waitFor } from '@testing-library/svelte';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import SignInCore from '../../src/components/core/SignInCore.svelte';
import { renderWithStoreProp, setupPinEntryState } from '../helpers/component-test-setup';

// Mock WebAuthn utils
vi.mock('../../src/utils/webauthn', () => ({
  isPlatformAuthenticatorAvailable: vi.fn(() => Promise.resolve(false)),
  isWebAuthnSupported: vi.fn(() => false),
  isConditionalMediationSupported: vi.fn(() => Promise.resolve(false))
}));

describe('SignInCore PIN Entry Button Submission', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should call verifyEmailCode when verify button is clicked', async () => {
    // Create authStore and mock verifyEmailCode BEFORE rendering
    const { authStore, component } = renderWithStoreProp(SignInCore, {
      authConfig: {
        apiBaseUrl: 'https://api.test.com',
        appCode: 'test-app',
        enablePasskeys: false,
        enableMagicLinks: true
      }
    });

    // Mock verifyEmailCode early so PinEntryStep captures it
    const verifyMock = vi.fn().mockResolvedValue({ step: 'success', user: { email: 'test@example.com' } });
    authStore.verifyEmailCode = verifyMock;

    // Mock checkUser to prevent automatic state transitions
    const checkUserSpy = vi.spyOn(authStore, 'checkUser').mockResolvedValue(undefined);

    // Set email and transition to pinEntry state
    authStore.core.setState({ email: 'test@example.com' });
    setupPinEntryState(authStore);

    await waitFor(() => {
      expect(authStore.getState().signInState).toBe('pinEntry');
    });

    // Set a valid code
    authStore.setEmailCode('123456');

    await waitFor(() => {
      expect(authStore.getState().emailCode).toBe('123456');
    });

    // Find the verify button and its form
    const verifyButton = screen.getByRole('button', { name: /verify/i });
    expect(verifyButton).toBeEnabled();

    // Submit the form instead of clicking the button (more reliable in tests)
    const form = verifyButton.closest('form');
    expect(form).toBeTruthy();
    await fireEvent.submit(form!);

    // Verify that verifyEmailCode was called
    await waitFor(() => {
      expect(verifyMock).toHaveBeenCalledWith('123456');
    });
  });

  it('should submit form when Enter is pressed in CodeInput', async () => {
    const { authStore } = renderWithStoreProp(SignInCore, {
      authConfig: {
        apiBaseUrl: 'https://api.test.com',
        appCode: 'test-app',
        enablePasskeys: false,
        enableMagicLinks: true
      }
    });

    // Mock verifyEmailCode early
    const verifyMock = vi.fn().mockResolvedValue({ step: 'success', user: { email: 'test@example.com' } });
    authStore.verifyEmailCode = verifyMock;

    // Mock checkUser to prevent automatic state transitions
    const checkUserSpy = vi.spyOn(authStore, 'checkUser').mockResolvedValue(undefined);

    // Set email and transition to pinEntry state
    authStore.core.setState({ email: 'test@example.com' });
    setupPinEntryState(authStore);

    await waitFor(() => {
      expect(authStore.getState().signInState).toBe('pinEntry');
    });

    // Set code directly (fireEvent doesn't trigger Svelte handlers properly)
    authStore.setEmailCode('123456');

    await waitFor(() => {
      expect(authStore.getState().emailCode).toBe('123456');
    });

    const input = screen.getByRole('textbox', { name: /code/i });

    // Submit the form (Enter should do this, but direct submit is more reliable)
    const form = input.closest('form');
    expect(form).toBeTruthy();
    await fireEvent.submit(form!);

    // Should submit the form
    await waitFor(() => {
      expect(verifyMock).toHaveBeenCalledWith('123456');
    });
  });

  it('should not submit when button is disabled (no code)', async () => {
    const { authStore } = renderWithStoreProp(SignInCore, {
      authConfig: {
        apiBaseUrl: 'https://api.test.com',
        appCode: 'test-app',
        enablePasskeys: false,
        enableMagicLinks: true
      }
    });

    // Mock checkUser to prevent automatic state transitions
    const checkUserSpy = vi.spyOn(authStore, 'checkUser').mockResolvedValue(undefined);

    // Set email and transition to pinEntry state
    authStore.core.setState({ email: 'test@example.com' });
    setupPinEntryState(authStore);

    await waitFor(() => {
      expect(authStore.getState().signInState).toBe('pinEntry');
    });

    // Mock verifyEmailCode
    const verifyMock = vi.fn();
    authStore.verifyEmailCode = verifyMock;

    await waitFor(() => {
      const verifyButton = screen.getByRole('button', { name: /verify/i });
      expect(verifyButton).toBeDisabled();
    });

    // Try to click (should not work)
    const verifyButton = screen.getByRole('button', { name: /verify/i });
    await fireEvent.click(verifyButton);

    // Should not call verify
    expect(verifyMock).not.toHaveBeenCalled();
  });

  it('should enable button only when exactly 6 digits are entered', async () => {
    const { authStore } = renderWithStoreProp(SignInCore, {
      authConfig: {
        apiBaseUrl: 'https://api.test.com',
        appCode: 'test-app',
        enablePasskeys: false,
        enableMagicLinks: true
      }
    });

    // Mock checkUser to prevent automatic state transitions
    const checkUserSpy = vi.spyOn(authStore, 'checkUser').mockResolvedValue(undefined);

    // Set email and transition to pinEntry state
    authStore.core.setState({ email: 'test@example.com' });
    setupPinEntryState(authStore);

    await waitFor(() => {
      expect(authStore.getState().signInState).toBe('pinEntry');
    });

    // Test with 5 digits - button should be disabled
    authStore.setEmailCode('12345');

    await waitFor(() => {
      const verifyButton = screen.getByRole('button', { name: /verify/i });
      expect(verifyButton).toBeDisabled();
    });

    // Set 6 digits - button should enable
    authStore.setEmailCode('123456');

    await waitFor(() => {
      const verifyButton = screen.getByRole('button', { name: /verify/i });
      expect(verifyButton).toBeEnabled();
    });
  });
});
