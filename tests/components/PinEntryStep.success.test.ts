/**
 * PinEntryStep Success Flow Test
 * Tests the actual success path with SignInData return value
 */

import { fireEvent, render, screen, waitFor } from '@testing-library/svelte';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import PinEntryStep from '../../src/components/core/PinEntryStep.svelte';
import { createTestAuthStore, setupPinEntryState } from '../helpers/component-test-setup';
import type { SignInData } from '../../src/types';

// Mock WebAuthn utils
vi.mock('../../src/utils/webauthn', () => ({
  isPlatformAuthenticatorAvailable: vi.fn(() => Promise.resolve(false)),
  isWebAuthnSupported: vi.fn(() => false),
  isConditionalMediationSupported: vi.fn(() => Promise.resolve(false))
}));

describe('PinEntryStep Success Flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should recognize SignInData return value as success', async () => {
    const authStore = createTestAuthStore({
      apiBaseUrl: 'https://api.test.com',
      appCode: 'test-app'
    });

    // Set email then transition to pinEntry state
    authStore.core.setState({ email: 'test@example.com' });
    setupPinEntryState(authStore);

    await waitFor(() => {
      expect(authStore.getState().signInState).toBe('pinEntry');
    });

    // Mock verifyEmailCode to return SignInData (what auth-store actually returns)
    const mockSignInData: SignInData = {
      user: {
        id: '123',
        email: 'test@example.com',
        name: 'Test User',
        emailVerified: true
      },
      tokens: {
        accessToken: 'test-access-token',
        refreshToken: 'test-refresh-token',
        expiresAt: Date.now() + 3600000
      },
      authMethod: 'email-code'
    };

    const mockVerify = vi.fn().mockResolvedValue(mockSignInData);
    authStore.verifyEmailCode = mockVerify;

    // Spy on success event
    const successHandler = vi.fn();
    const { component } = render(PinEntryStep, {
      props: { authStore }
    });
    component.$on('success', successHandler);

    const input = screen.getByRole('textbox');

    // Type valid code
    await fireEvent.input(input, { target: { value: '123456' } });

    // Click verify button
    const verifyButton = screen.getByRole('button', { name: /verif/i });
    await fireEvent.click(verifyButton);

    // Wait for async verification
    await waitFor(() => {
      expect(mockVerify).toHaveBeenCalledWith('123456');
    });

    // Should dispatch success event (not throw error)
    await waitFor(() => {
      expect(successHandler).toHaveBeenCalled();
    });

    const successEvent = successHandler.mock.calls[0][0];
    expect(successEvent.detail.user).toEqual(mockSignInData.user);
    expect(successEvent.detail.method).toBe('email-code');
  });

  it('should NOT throw error when result has user but no step property', async () => {
    const authStore = createTestAuthStore({
      apiBaseUrl: 'https://api.test.com',
      appCode: 'test-app'
    });

    authStore.core.setState({ email: 'test@example.com' });
    setupPinEntryState(authStore);

    await waitFor(() => {
      expect(authStore.getState().signInState).toBe('pinEntry');
    });

    // Mock returns SignInData (no step property)
    const mockSignInData: SignInData = {
      user: {
        id: '123',
        email: 'test@example.com',
        name: 'Test User',
        emailVerified: true
      },
      tokens: {
        accessToken: 'test-token',
        refreshToken: 'test-refresh',
        expiresAt: Date.now() + 3600000
      },
      authMethod: 'email-code'
    };

    const mockVerify = vi.fn().mockResolvedValue(mockSignInData);
    authStore.verifyEmailCode = mockVerify;

    const successHandler = vi.fn();
    const { component } = render(PinEntryStep, {
      props: { authStore }
    });
    component.$on('success', successHandler);

    const input = screen.getByRole('textbox');
    await fireEvent.input(input, { target: { value: '123456' } });

    const verifyButton = screen.getByRole('button', { name: /verif/i });
    await fireEvent.click(verifyButton);

    // Should succeed without errors
    await waitFor(() => {
      expect(successHandler).toHaveBeenCalled();
    });
  });

  it('should throw error when result is missing user', async () => {
    const authStore = createTestAuthStore({
      apiBaseUrl: 'https://api.test.com',
      appCode: 'test-app'
    });

    authStore.core.setState({ email: 'test@example.com' });
    setupPinEntryState(authStore);

    await waitFor(() => {
      expect(authStore.getState().signInState).toBe('pinEntry');
    });

    // Mock returns incomplete data
    const mockVerify = vi.fn().mockResolvedValue({
      tokens: {
        accessToken: 'test-token',
        refreshToken: 'test-refresh',
        expiresAt: Date.now() + 3600000
      }
      // Missing user!
    });
    authStore.verifyEmailCode = mockVerify;

    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const successHandler = vi.fn();
    const { component } = render(PinEntryStep, {
      props: { authStore }
    });
    component.$on('success', successHandler);

    const input = screen.getByRole('textbox');
    await fireEvent.input(input, { target: { value: '123456' } });

    const verifyButton = screen.getByRole('button', { name: /verif/i });
    await fireEvent.click(verifyButton);

    // Should log error
    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalled();
    });

    // Should NOT dispatch success
    expect(successHandler).not.toHaveBeenCalled();

    consoleErrorSpy.mockRestore();
  });

  it('should handle the exact structure returned by auth-store.verifyEmailCode', async () => {
    const authStore = createTestAuthStore({
      apiBaseUrl: 'https://api.test.com',
      appCode: 'test-app'
    });

    authStore.core.setState({ email: 'test@example.com' });
    setupPinEntryState(authStore);

    await waitFor(() => {
      expect(authStore.getState().signInState).toBe('pinEntry');
    });

    // This is EXACTLY what auth-store.ts:290 returns
    const exactReturnValue: SignInData = {
      user: {
        id: 'workos|user_123',
        email: 'test@example.com',
        name: 'Test User',
        emailVerified: true
      },
      tokens: {
        accessToken: 'eyJhbGci...',
        refreshToken: 'refresh123',
        expiresAt: Date.now() + 3600000
      },
      authMethod: 'email-code'
    };

    const mockVerify = vi.fn().mockResolvedValue(exactReturnValue);
    authStore.verifyEmailCode = mockVerify;

    const successHandler = vi.fn();
    const { component } = render(PinEntryStep, {
      props: { authStore }
    });
    component.$on('success', successHandler);

    const input = screen.getByRole('textbox');
    await fireEvent.input(input, { target: { value: '123456' } });

    const verifyButton = screen.getByRole('button', { name: /verif/i });
    await fireEvent.click(verifyButton);

    // Verify success is dispatched with correct data
    await waitFor(() => {
      expect(successHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          detail: expect.objectContaining({
            user: exactReturnValue.user,
            method: 'email-code'
          })
        })
      );
    });
  });
});
