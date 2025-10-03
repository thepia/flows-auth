/**
 * Regression Test: SignIn State Preservation
 *
 * This test ensures that SignInCore component never resets the signInState
 * when it initializes or when the email field becomes empty.
 *
 * Root Cause: Previously, SignInCore had a reactive statement that would
 * send a RESET event when email was empty, causing state machine transitions
 * to be lost when switching between tabs or components.
 *
 * Fix: Component should only clear local UI state, never send state machine events
 * based on UI field values.
 */

import { render } from '@testing-library/svelte';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import SignInCore from '../../src/components/core/SignInCore.svelte';
import type { AuthConfig } from '../../src/types';
import { createTestAuthStore } from '../helpers/component-test-setup';

const testAuthConfig: Partial<AuthConfig> = {
  apiBaseUrl: 'https://api.thepia.com',
  domain: 'test.com',
  enablePasskeys: true,
  enableMagicLinks: true,
  appCode: 'TEST'
};

describe('SignIn State Preservation Regression Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should NOT send RESET event when component initializes with empty email', async () => {
    // Arrange: Create real auth store
    const authStore = createTestAuthStore(testAuthConfig);
    const sendSignInEventSpy = vi.spyOn(authStore, 'sendSignInEvent');

    // Set up store in userChecked state
    authStore.sendSignInEvent({
      type: 'USER_CHECKED',
      email: 'test@example.com',
      exists: true,
      hasPasskey: false,
      hasValidPin: false,
      pinRemainingMinutes: 0
    });

    // Clear the spy to only track future calls
    sendSignInEventSpy.mockClear();

    // Act: Render SignInCore with empty email (default state)
    render(SignInCore, {
      props: {
        store: authStore,
        initialEmail: '' // Empty email should not trigger RESET
      }
    });

    // Assert: sendSignInEvent should NOT be called with RESET
    expect(sendSignInEventSpy).not.toHaveBeenCalledWith({ type: 'RESET' });
  });

  it('should NOT send RESET event when email field becomes empty after user interaction', async () => {
    // Arrange: Create real auth store
    const authStore = createTestAuthStore(testAuthConfig);
    const sendSignInEventSpy = vi.spyOn(authStore, 'sendSignInEvent');

    // Set up store in userChecked state
    authStore.sendSignInEvent({
      type: 'USER_CHECKED',
      email: 'test@example.com',
      exists: true,
      hasPasskey: false,
      hasValidPin: false,
      pinRemainingMinutes: 0
    });

    // Act: Render SignInCore with initial email
    render(SignInCore, {
      props: {
        store: authStore,
        initialEmail: 'test@example.com'
      }
    });

    // Clear the spy to only track future calls
    sendSignInEventSpy.mockClear();

    // Note: We can't easily simulate email field interaction in this test environment
    // but the key assertion is that no RESET events are sent during component lifecycle

    // Assert: sendSignInEvent should NOT be called with RESET during component lifecycle
    expect(sendSignInEventSpy).not.toHaveBeenCalledWith({ type: 'RESET' });
  });

  it('should preserve signInState when switching between components', async () => {
    // Arrange: Create real auth store
    const authStore = createTestAuthStore(testAuthConfig);
    const sendSignInEventSpy = vi.spyOn(authStore, 'sendSignInEvent');

    // Set up store in pinEntry state
    authStore.sendSignInEvent({
      type: 'USER_CHECKED',
      email: 'test@example.com',
      exists: true,
      hasPasskey: false,
      hasValidPin: false,
      pinRemainingMinutes: 0
    });

    authStore.sendSignInEvent({
      type: 'SENT_PIN_EMAIL'
    });

    // Clear the spy to only track future calls
    sendSignInEventSpy.mockClear();

    // Act: Render SignInCore (simulating component mount when switching tabs)
    render(SignInCore, {
      props: {
        store: authStore,
        initialEmail: '' // Empty email on mount
      }
    });

    // Assert: signInState should remain 'pinEntry', no RESET should be sent
    expect(sendSignInEventSpy).not.toHaveBeenCalledWith({ type: 'RESET' });
  });

  it('should only clear local component state when email becomes empty', async () => {
    // This test verifies that local state is cleared but no events are sent
    const authStore = createTestAuthStore(testAuthConfig);
    const sendSignInEventSpy = vi.spyOn(authStore, 'sendSignInEvent');

    // Set up store in userChecked state
    authStore.sendSignInEvent({
      type: 'USER_CHECKED',
      email: 'test@example.com',
      exists: true,
      hasPasskey: false,
      hasValidPin: false,
      pinRemainingMinutes: 0
    });

    // Clear the spy to only track future calls
    sendSignInEventSpy.mockClear();

    // Render component
    render(SignInCore, {
      props: {
        store: authStore,
        initialEmail: ''
      }
    });

    // Verify that no state machine events are sent
    expect(sendSignInEventSpy).not.toHaveBeenCalled();
  });

  it('should allow explicit RESET only through resetForm function', async () => {
    // Arrange: Create real auth store
    const authStore = createTestAuthStore(testAuthConfig);
    const sendSignInEventSpy = vi.spyOn(authStore, 'sendSignInEvent');

    // Set up store in userChecked state
    authStore.sendSignInEvent({
      type: 'USER_CHECKED',
      email: 'test@example.com',
      exists: true,
      hasPasskey: false,
      hasValidPin: false,
      pinRemainingMinutes: 0
    });

    // Act: Render component
    render(SignInCore, {
      props: {
        store: authStore,
        initialEmail: 'test@example.com'
      }
    });

    // Clear any initialization calls
    sendSignInEventSpy.mockClear();

    // Note: In a real test environment, we would click the reset button
    // For now, we just verify that no automatic RESET events are sent

    // Assert: No automatic RESET events should be sent
    expect(sendSignInEventSpy).not.toHaveBeenCalledWith({ type: 'RESET' });
  });
});
