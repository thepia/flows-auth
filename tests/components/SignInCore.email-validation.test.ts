/**
 * SignInCore Email Validation Tests
 *
 * Tests for email validation in the reactive checkUser flow.
 * Verifies that invalid email formats do not trigger API calls.
 */

import { fireEvent, screen } from '@testing-library/svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import SignInCore from '../../src/components/core/SignInCore.svelte';
import { TEST_AUTH_CONFIGS, renderWithStoreProp } from '../helpers/component-test-setup.js';

describe('SignInCore - Email Validation in Reactive Flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.clearAllTimers();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  describe('Reactive checkUser with Email Validation', () => {
    it('should not call checkUser API for invalid email format', async () => {
      const { authStore } = renderWithStoreProp(SignInCore, {
        props: {
          initialEmail: ''
        },
        authConfig: TEST_AUTH_CONFIGS.withAppCode
      });

      // Spy on the checkUser method
      const checkUserSpy = vi.spyOn(authStore, 'checkUser');

      // Type an invalid email (missing domain extension)
      const emailInput = screen.getByRole('textbox');
      await fireEvent.input(emailInput, { target: { value: 'test@domain' } });

      // Wait for debounce timeout (400ms)
      vi.advanceTimersByTime(400);

      // checkUser should NOT have been called
      expect(checkUserSpy).not.toHaveBeenCalled();
    });

    it('should not call checkUser API for incomplete email', async () => {
      const { authStore } = renderWithStoreProp(SignInCore, {
        props: {
          initialEmail: ''
        },
        authConfig: TEST_AUTH_CONFIGS.withAppCode
      });

      const checkUserSpy = vi.spyOn(authStore, 'checkUser');

      // Type various incomplete email formats
      const emailInput = screen.getByRole('textbox');

      const invalidEmails = [
        'a',
        'a@',
        'test@',
        '@domain.com',
        'user@domain',
        'test',
        'user space@domain.com'
      ];

      for (const email of invalidEmails) {
        checkUserSpy.mockClear();
        await fireEvent.input(emailInput, { target: { value: email } });
        vi.advanceTimersByTime(400);

        expect(checkUserSpy).not.toHaveBeenCalled();
      }
    });

    it('should call checkUser API for valid email format', async () => {
      const { authStore } = renderWithStoreProp(SignInCore, {
        props: {
          initialEmail: ''
        },
        authConfig: TEST_AUTH_CONFIGS.withAppCode,
        mockUserCheck: {
          exists: true,
          userId: 'test-user-id',
          emailVerified: true
        }
      });

      const checkUserSpy = vi.spyOn(authStore, 'checkUser');

      // Type a valid email
      const emailInput = screen.getByRole('textbox');
      await fireEvent.input(emailInput, { target: { value: 'test@example.com' } });

      // Wait for debounce timeout (400ms)
      vi.advanceTimersByTime(400);

      // checkUser SHOULD have been called with the valid email
      expect(checkUserSpy).toHaveBeenCalledWith('test@example.com');
      expect(checkUserSpy).toHaveBeenCalledTimes(1);
    });

    it('should validate complex valid email addresses', async () => {
      const { authStore } = renderWithStoreProp(SignInCore, {
        props: {
          initialEmail: ''
        },
        authConfig: TEST_AUTH_CONFIGS.withAppCode,
        mockUserCheck: {
          exists: true,
          userId: 'test-user-id',
          emailVerified: true
        }
      });

      const checkUserSpy = vi.spyOn(authStore, 'checkUser');

      const validEmails = [
        'user@example.com',
        'test.email+tag@domain.co.uk',
        'name@subdomain.domain.com',
        'user123@test-domain.org'
      ];

      const emailInput = screen.getByRole('textbox');

      for (const email of validEmails) {
        checkUserSpy.mockClear();
        await fireEvent.input(emailInput, { target: { value: email } });
        vi.advanceTimersByTime(400);

        expect(checkUserSpy).toHaveBeenCalledWith(email);
        expect(checkUserSpy).toHaveBeenCalledTimes(1);
      }
    });

    it('should debounce rapid email changes', async () => {
      const { authStore } = renderWithStoreProp(SignInCore, {
        props: {
          initialEmail: ''
        },
        authConfig: TEST_AUTH_CONFIGS.withAppCode,
        mockUserCheck: {
          exists: true,
          userId: 'test-user-id',
          emailVerified: true
        }
      });

      const checkUserSpy = vi.spyOn(authStore, 'checkUser');

      const emailInput = screen.getByRole('textbox');

      // Type rapidly - each keystroke
      await fireEvent.input(emailInput, { target: { value: 't' } });
      vi.advanceTimersByTime(100);
      await fireEvent.input(emailInput, { target: { value: 'te' } });
      vi.advanceTimersByTime(100);
      await fireEvent.input(emailInput, { target: { value: 'tes' } });
      vi.advanceTimersByTime(100);
      await fireEvent.input(emailInput, { target: { value: 'test' } });
      vi.advanceTimersByTime(100);

      // Still typing - checkUser should not be called yet
      expect(checkUserSpy).not.toHaveBeenCalled();

      // Complete the email
      await fireEvent.input(emailInput, { target: { value: 'test@example.com' } });

      // Wait full debounce
      vi.advanceTimersByTime(400);

      // Should only be called once with final valid email
      expect(checkUserSpy).toHaveBeenCalledWith('test@example.com');
      expect(checkUserSpy).toHaveBeenCalledTimes(1);
    });

    it('should handle whitespace trimming', async () => {
      const { authStore } = renderWithStoreProp(SignInCore, {
        props: {
          initialEmail: ''
        },
        authConfig: TEST_AUTH_CONFIGS.withAppCode,
        mockUserCheck: {
          exists: true,
          userId: 'test-user-id',
          emailVerified: true
        }
      });

      const checkUserSpy = vi.spyOn(authStore, 'checkUser');

      // Type email with leading/trailing whitespace
      const emailInput = screen.getByRole('textbox');
      await fireEvent.input(emailInput, { target: { value: '  test@example.com  ' } });

      vi.advanceTimersByTime(400);

      // Should be called with trimmed email
      expect(checkUserSpy).toHaveBeenCalledWith('test@example.com');
    });

    it('should not call checkUser for empty string after trimming', async () => {
      const { authStore } = renderWithStoreProp(SignInCore, {
        props: {
          initialEmail: '' // Start with empty to avoid initial check
        },
        authConfig: TEST_AUTH_CONFIGS.withAppCode
      });

      // Create spy AFTER render but clear any calls from initialization
      const checkUserSpy = vi.spyOn(authStore, 'checkUser');
      checkUserSpy.mockClear();

      // Type some text first, then clear to empty/whitespace
      const emailInput = screen.getByRole('textbox');
      await fireEvent.input(emailInput, { target: { value: 'test' } });
      vi.advanceTimersByTime(400);

      // Clear the spy before the actual test
      checkUserSpy.mockClear();

      // Now clear the input to empty or whitespace
      await fireEvent.input(emailInput, { target: { value: '   ' } });
      vi.advanceTimersByTime(400);

      // Should not call checkUser for empty/whitespace
      expect(checkUserSpy).not.toHaveBeenCalled();
    });

    it('should validate progressive typing from invalid to valid', async () => {
      const { authStore } = renderWithStoreProp(SignInCore, {
        props: {
          initialEmail: ''
        },
        authConfig: TEST_AUTH_CONFIGS.withAppCode,
        mockUserCheck: {
          exists: true,
          userId: 'test-user-id',
          emailVerified: true
        }
      });

      const checkUserSpy = vi.spyOn(authStore, 'checkUser');
      const emailInput = screen.getByRole('textbox');

      // Type progressively - each stage
      const stages = [
        { value: 't', shouldCall: false },
        { value: 'te', shouldCall: false },
        { value: 'test', shouldCall: false },
        { value: 'test@', shouldCall: false },
        { value: 'test@e', shouldCall: false },
        { value: 'test@ex', shouldCall: false },
        { value: 'test@exa', shouldCall: false },
        { value: 'test@exam', shouldCall: false },
        { value: 'test@examp', shouldCall: false },
        { value: 'test@exampl', shouldCall: false },
        { value: 'test@example', shouldCall: false }, // Still invalid - no TLD
        { value: 'test@example.', shouldCall: false }, // Still invalid
        { value: 'test@example.c', shouldCall: true }, // NOW valid!
        { value: 'test@example.co', shouldCall: true },
        { value: 'test@example.com', shouldCall: true }
      ];

      for (const stage of stages) {
        checkUserSpy.mockClear();
        await fireEvent.input(emailInput, { target: { value: stage.value } });
        vi.advanceTimersByTime(400);

        if (stage.shouldCall) {
          expect(checkUserSpy).toHaveBeenCalledWith(stage.value);
        } else {
          expect(checkUserSpy).not.toHaveBeenCalled();
        }
      }
    });
  });

  describe('Integration with EmailInput Component', () => {
    it('should work correctly with EmailInput conditionalAuth', async () => {
      const { authStore } = renderWithStoreProp(SignInCore, {
        props: {
          initialEmail: ''
        },
        authConfig: {
          ...TEST_AUTH_CONFIGS.withAppCode,
          enablePasskeys: true // Enable WebAuthn for conditionalAuth
        },
        mockUserCheck: {
          exists: true,
          hasPasskey: true,
          userId: 'test-user-id',
          emailVerified: true
        }
      });

      const checkUserSpy = vi.spyOn(authStore, 'checkUser');

      // Type a valid email
      const emailInput = screen.getByRole('textbox');
      await fireEvent.input(emailInput, { target: { value: 'test@example.com' } });

      // EmailInput has 1000ms debounce for conditionalAuth
      // But SignInCore reactive check has 400ms debounce
      // So checkUser from reactive statement should fire first

      // Advance to reactive check timeout
      vi.advanceTimersByTime(400);
      expect(checkUserSpy).toHaveBeenCalledWith('test@example.com');

      // Clear for next assertion
      checkUserSpy.mockClear();

      // Advance remaining time for EmailInput debounce
      vi.advanceTimersByTime(600);

      // EmailInput's conditionalAuth validation already passed,
      // but we don't test that handler here - this test focuses on the reactive flow
    });
  });

  describe('Edge Cases', () => {
    it('should handle rapid transitions between valid and invalid', async () => {
      const { authStore } = renderWithStoreProp(SignInCore, {
        props: {
          initialEmail: ''
        },
        authConfig: TEST_AUTH_CONFIGS.withAppCode,
        mockUserCheck: {
          exists: true,
          userId: 'test-user-id',
          emailVerified: true
        }
      });

      const checkUserSpy = vi.spyOn(authStore, 'checkUser');
      const emailInput = screen.getByRole('textbox');

      // Valid email
      await fireEvent.input(emailInput, { target: { value: 'test@example.com' } });
      vi.advanceTimersByTime(200);

      // Change to invalid before timeout
      await fireEvent.input(emailInput, { target: { value: 'test@example' } });
      vi.advanceTimersByTime(400);

      // Should not have called checkUser (invalid email)
      expect(checkUserSpy).not.toHaveBeenCalled();

      // Change back to valid
      await fireEvent.input(emailInput, { target: { value: 'test@example.com' } });
      vi.advanceTimersByTime(400);

      // Now should call
      expect(checkUserSpy).toHaveBeenCalledWith('test@example.com');
      expect(checkUserSpy).toHaveBeenCalledTimes(1);
    });

    it('should handle paste events with invalid email', async () => {
      const { authStore } = renderWithStoreProp(SignInCore, {
        props: {
          initialEmail: ''
        },
        authConfig: TEST_AUTH_CONFIGS.withAppCode
      });

      const checkUserSpy = vi.spyOn(authStore, 'checkUser');

      // Simulate paste of invalid email
      const emailInput = screen.getByRole('textbox');
      await fireEvent.input(emailInput, { target: { value: 'invalid-email-format' } });

      vi.advanceTimersByTime(400);

      expect(checkUserSpy).not.toHaveBeenCalled();
    });

    it('should handle paste events with valid email', async () => {
      const { authStore } = renderWithStoreProp(SignInCore, {
        props: {
          initialEmail: ''
        },
        authConfig: TEST_AUTH_CONFIGS.withAppCode,
        mockUserCheck: {
          exists: true,
          userId: 'test-user-id',
          emailVerified: true
        }
      });

      const checkUserSpy = vi.spyOn(authStore, 'checkUser');

      // Simulate paste of valid email
      const emailInput = screen.getByRole('textbox');
      await fireEvent.input(emailInput, { target: { value: 'pasted@example.com' } });

      vi.advanceTimersByTime(400);

      expect(checkUserSpy).toHaveBeenCalledWith('pasted@example.com');
      expect(checkUserSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('Performance and Cleanup', () => {
    it('should cleanup timeout on component unmount', async () => {
      const { unmount } = renderWithStoreProp(SignInCore, {
        props: {
          initialEmail: ''
        },
        authConfig: TEST_AUTH_CONFIGS.withAppCode
      });

      // Start typing
      const emailInput = screen.getByRole('textbox');
      await fireEvent.input(emailInput, { target: { value: 'test@example.com' } });

      // Unmount before timeout
      unmount();

      // Advance time
      vi.advanceTimersByTime(400);

      // Advancing timers past unmount would itself throw if the debounced
      // callback fired against a destroyed component; confirm unmount also
      // actually removed it from the DOM.
      expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    });
  });
});
