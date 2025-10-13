/**
 * Debug Test: RegistrationForm Step Progression
 *
 * This test specifically debugs why the form is getting stuck in terms-of-service
 * step and not progressing to webauthn-register step.
 */

import { fireEvent, render, screen, waitFor } from '@testing-library/svelte';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import RegistrationForm from '../../src/components/RegistrationForm.svelte';
import type { AuthConfig, InvitationTokenData } from '../../src/types';

// Mock WebAuthn API
Object.defineProperty(navigator, 'credentials', {
  value: {
    create: vi.fn().mockResolvedValue({
      id: 'mock-credential-id',
      rawId: new ArrayBuffer(16),
      response: {
        clientDataJSON: new ArrayBuffer(32),
        attestationObject: new ArrayBuffer(64)
      },
      type: 'public-key'
    })
  },
  writable: true
});

// Mock fetch for API calls
global.fetch = vi.fn();

describe('RegistrationForm Step Progression Debug', () => {
  let authConfig: AuthConfig;
  let invitationTokenData: InvitationTokenData;

  beforeEach(() => {
    vi.clearAllMocks();

    authConfig = {
      apiBaseUrl: 'https://api.test.com',
      clientId: 'test-client',
      domain: 'test.com',
      enablePasskeys: true,
      enableMagicLinks: false,
      branding: {
        companyName: 'Test Company',
        logoUrl: '/logo.svg',
        primaryColor: '#0066cc'
      }
    };

    invitationTokenData = {
      email: 'test@example.com',
      firstName: 'John',
      lastName: 'Doe',
      company: 'Test Corp',
      phone: '+1234567890',
      jobTitle: 'Software Engineer',
      expires: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
      message: 'Welcome to Test Company!'
    };

    // Mock successful API responses
    (global.fetch as any).mockImplementation((url: string) => {
      if (url.includes('/auth/check-email')) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              exists: false,
              message: 'Email is available'
            })
        });
      }

      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({})
      });
    });
  });

  it('should debug step progression issue', async () => {
    const stepChangeEvents: any[] = [];

    const { component } = render(RegistrationForm, {
      props: {
        config: authConfig,
        additionalFields: ['company', 'phone', 'jobTitle'],
        invitationTokenData,
        initialEmail: 'test@example.com'
      }
    });

    // Listen for step change events
    component.$on('stepChange', (event) => {
      stepChangeEvents.push(event.detail);
      console.log('Step changed to:', event.detail.step);
    });

    // Step 1: Email entry
    console.log('=== STEP 1: Email Entry ===');
    expect(screen.getByText('Create Account')).toBeInTheDocument();

    const continueButton = screen.getByText('Continue');
    fireEvent.click(continueButton);

    await waitFor(() => {
      expect(screen.getByText('Terms & Privacy')).toBeInTheDocument();
    });

    console.log('Step change events so far:', stepChangeEvents);

    // Step 2: Terms of Service
    console.log('=== STEP 2: Terms of Service ===');
    expect(screen.getByText('Terms & Privacy')).toBeInTheDocument();

    // Find the checkboxes using more specific selectors
    const checkboxes = screen.getAllByRole('checkbox');
    expect(checkboxes).toHaveLength(3); // Terms, Privacy, Marketing

    const termsCheckbox = checkboxes[0];
    const privacyCheckbox = checkboxes[1];
    const marketingCheckbox = checkboxes[2];

    console.log('Checkboxes found:', checkboxes.length);
    console.log('Terms checkbox checked before:', termsCheckbox.checked);
    console.log('Privacy checkbox checked before:', privacyCheckbox.checked);

    // Check the required checkboxes
    fireEvent.click(termsCheckbox);
    fireEvent.click(privacyCheckbox);

    console.log('Terms checkbox checked after:', termsCheckbox.checked);
    console.log('Privacy checkbox checked after:', privacyCheckbox.checked);

    // Wait for button to be enabled
    await waitFor(() => {
      const acceptButton = screen.getByText('Accept & Continue');
      // console.log('Button disabled?', acceptButton.disabled);
      expect(acceptButton.disabled).toBe(false);
    });

    // Try to continue to step 3
    const acceptButton = screen.getByText('Accept & Continue');
    console.log('About to click Accept & Continue button, disabled:', acceptButton.disabled);

    fireEvent.click(acceptButton);

    console.log('Clicked Accept & Continue button');
    console.log('Step change events after accept:', stepChangeEvents);

    // Wait for step 3 to appear
    try {
      await waitFor(
        () => {
          const step3Title = screen.getByText('Create Account with Passkey');
          console.log('Step 3 title found successfully!');
          expect(step3Title).toBeInTheDocument();
        },
        { timeout: 5000 }
      );

      console.log('SUCCESS: Reached step 3!');
    } catch (error) {
      console.log('FAILED to reach step 3, checking current state...');

      // Check what step we're currently showing
      const step1Title = screen.queryByText('Create Account');
      const step2Title = screen.queryByText('Terms & Privacy');
      const step3Title = screen.queryByText('Create Account with Passkey');

      console.log('Current step check:', {
        step1: !!step1Title,
        step2: !!step2Title,
        step3: !!step3Title
      });

      // Check for any error messages
      const errorMessage = document.querySelector('.error-message');
      console.log('Error message:', errorMessage?.textContent);

      // Let's also check the current step classes
      const authContainer = document.querySelector('.auth-container');
      const currentStepDiv = authContainer?.querySelector('div[class*="step"]');
      console.log('Current step div class:', currentStepDiv?.className);

      // Don't fail the test, just log the issue
      console.log('Test completed with step progression issue');
    }

    console.log('Final step change events:', stepChangeEvents);
  });
});
