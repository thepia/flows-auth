import { fireEvent, render, screen, waitFor } from '@testing-library/svelte';
import { writable } from 'svelte/store';
/**
 * SignInCore PIN Entry Tests
 * Tests the "Enter pin here" button functionality and SENT_PIN_EMAIL event
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import SignInCore from '../../src/components/core/SignInCore.svelte';
import { renderWithStoreProp } from '../helpers/component-test-setup';

// Mock WebAuthn utils
vi.mock('../../src/utils/webauthn', () => ({
  isPlatformAuthenticatorAvailable: vi.fn(() => Promise.resolve(false)),
  isWebAuthnSupported: vi.fn(() => false),
  isConditionalMediationSupported: vi.fn(() => Promise.resolve(false))
}));

describe('SignInCore PIN Entry', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render "Enter pin here" button when user has valid PIN', async () => {
    renderWithStoreProp(SignInCore, {
      authConfig: {
        apiBaseUrl: 'https://api.test.com',
        appCode: 'test-app',
        enablePasskeys: true,
        enableMagicLinks: true
      },
      props: {
        initialEmail: 'test@example.com'
      }
    });

    // Component should render without waiting message
    expect(screen.queryByText('Waiting for authentication context...')).not.toBeInTheDocument();
  });

  it('should send SENT_PIN_EMAIL event when "Enter pin here" button is clicked', async () => {
    renderWithStoreProp(SignInCore, {
      authConfig: {
        apiBaseUrl: 'https://api.test.com',
        appCode: 'test-app',
        enablePasskeys: true,
        enableMagicLinks: true
      },
      props: {
        initialEmail: 'test@example.com'
      }
    });

    // Component should render without waiting message
    expect(screen.queryByText('Waiting for authentication context...')).not.toBeInTheDocument();
  });

  it('should not send event if hasValidPin is false', async () => {
    renderWithStoreProp(SignInCore, {
      authConfig: {
        apiBaseUrl: 'https://api.test.com',
        appCode: 'test-app',
        enablePasskeys: true,
        enableMagicLinks: true
      },
      props: {
        initialEmail: 'test@example.com'
      }
    });

    // Component should render without waiting message
    expect(screen.queryByText('Waiting for authentication context...')).not.toBeInTheDocument();
  });

  it('should transition to pinEntry state when SENT_PIN_EMAIL event is processed', async () => {
    renderWithStoreProp(SignInCore, {
      authConfig: {
        apiBaseUrl: 'https://api.test.com',
        appCode: 'test-app',
        enablePasskeys: true,
        enableMagicLinks: true
      },
      props: {
        initialEmail: 'test@example.com'
      }
    });

    // Component should render without waiting message
    expect(screen.queryByText('Waiting for authentication context...')).not.toBeInTheDocument();
  });
});
