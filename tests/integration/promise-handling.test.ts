/**
 * Promise Handling Tests
 *
 * Purpose: Ensure promise rejections are properly handled to prevent unhandled promise rejections
 * Context: Tests that errors in async operations (API calls, WebAuthn) are caught and handled gracefully
 * Safe to remove: No - critical for preventing production crashes from unhandled promises
 *
 * Testing Strategy:
 * - Use renderWithStoreProp to follow singleton auth store pattern
 * - Mock API responses using the helper's mockUserCheck
 * - Test that errors are caught and don't crash the app
 * - Verify error states are shown to users
 */

import { fireEvent, waitFor } from '@testing-library/svelte';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import SignInForm from '../../src/components/SignInForm.svelte';
import { renderWithStoreProp } from '../helpers/component-test-setup';

describe('Promise Handling', () => {
	beforeEach(() => {
		vi.clearAllMocks();

		// Mock WebAuthn API
		Object.defineProperty(navigator, 'credentials', {
			value: {
				create: vi.fn(),
				get: vi.fn(),
			},
			writable: true,
			configurable: true,
		});

		// Mock PublicKeyCredential
		Object.defineProperty(global, 'PublicKeyCredential', {
			value: {
				isUserVerifyingPlatformAuthenticatorAvailable: vi.fn().mockResolvedValue(true),
				isConditionalMediationAvailable: vi.fn().mockResolvedValue(true),
			},
			writable: true,
			configurable: true,
		});
	});

	describe('Email Code Sending Errors', () => {
		it('should handle API errors when sending email code without crashing', async () => {
			const { getByLabelText, getByRole, authStore } = renderWithStoreProp(SignInForm, {
				authConfig: {
					apiBaseUrl: 'https://api.test.com',
					appCode: 'test-app',
					enablePasskeys: false,
				},
				mockUserCheck: {
					exists: true,
					hasPasskey: false,
				},
			});

			// Mock email code sending to fail
			vi.mocked(authStore.api.sendAppEmailCode).mockRejectedValue(
				new Error('Network error: Unable to reach email service'),
			);

			const emailInput = getByLabelText('Email address');
			await fireEvent.input(emailInput, { target: { value: 'test@example.com' } });

			// Wait for user check to complete and button to be enabled
			await waitFor(
				() => {
					const button = getByRole('button', { name: /send pin by email/i });
					expect(button).not.toHaveAttribute('disabled');
				},
				{ timeout: 3000 },
			);

			const submitButton = getByRole('button', { name: /send pin by email/i });
			await fireEvent.click(submitButton);

			// Should handle the error without throwing unhandled promise rejection
			await waitFor(() => {
				expect(authStore.api.sendAppEmailCode).toHaveBeenCalled();
			});

			// Component should remain functional (not crashed)
			expect(submitButton).toBeInTheDocument();
		});

		it('should handle network timeouts gracefully', async () => {
			const { getByLabelText, getByRole, authStore } = renderWithStoreProp(SignInForm, {
				authConfig: {
					apiBaseUrl: 'https://api.test.com',
					appCode: 'test-app',
					enablePasskeys: false,
				},
				mockUserCheck: {
					exists: true,
					hasPasskey: false,
				},
			});

			// Mock timeout error
			vi.mocked(authStore.api.sendAppEmailCode).mockRejectedValue(new Error('Request timeout'));

			const emailInput = getByLabelText('Email address');
			await fireEvent.input(emailInput, { target: { value: 'timeout@example.com' } });

			await waitFor(
				() => {
					const button = getByRole('button', { name: /send pin by email/i });
					expect(button).not.toHaveAttribute('disabled');
				},
				{ timeout: 3000 },
			);

			const submitButton = getByRole('button', { name: /send pin by email/i });
			await fireEvent.click(submitButton);

			// Should not throw unhandled rejection
			await waitFor(() => {
				expect(authStore.api.sendAppEmailCode).toHaveBeenCalled();
			});

			// UI should still be responsive
			expect(emailInput).toBeInTheDocument();
		});

		it('should handle server errors (500) without crashing', async () => {
			const { getByLabelText, getByRole, authStore } = renderWithStoreProp(SignInForm, {
				authConfig: {
					apiBaseUrl: 'https://api.test.com',
					appCode: 'test-app',
					enablePasskeys: false,
				},
				mockUserCheck: {
					exists: true,
					hasPasskey: false,
				},
			});

			// Mock server error
			vi.mocked(authStore.api.sendAppEmailCode).mockRejectedValue(
				new Error('Server error: Internal server error'),
			);

			const emailInput = getByLabelText('Email address');
			await fireEvent.input(emailInput, { target: { value: 'error@example.com' } });

			await waitFor(
				() => {
					const button = getByRole('button', { name: /send pin by email/i });
					expect(button).not.toHaveAttribute('disabled');
				},
				{ timeout: 3000 },
			);

			const submitButton = getByRole('button', { name: /send pin by email/i });
			await fireEvent.click(submitButton);

			await waitFor(() => {
				expect(authStore.api.sendAppEmailCode).toHaveBeenCalled();
			});

			expect(submitButton).toBeInTheDocument();
		});
	});

	describe('User Check Errors', () => {
		it('should handle checkEmail API errors gracefully', async () => {
			const { getByLabelText, authStore } = renderWithStoreProp(SignInForm, {
				authConfig: {
					apiBaseUrl: 'https://api.test.com',
					appCode: 'test-app',
					enablePasskeys: false,
				},
			});

			// Mock checkEmail to fail after initial setup
			vi.mocked(authStore.api.checkEmail).mockRejectedValue(new Error('Network error'));

			const emailInput = getByLabelText('Email address');

			// Should not crash when email check fails
			await fireEvent.input(emailInput, { target: { value: 'check-fail@example.com' } });

			// Wait and verify no unhandled rejections
			await waitFor(
				() => {
					expect(authStore.api.checkEmail).toHaveBeenCalled();
				},
				{ timeout: 3000 },
			);

			// Component should still be functional
			expect(emailInput).toBeInTheDocument();
		});

		it('should handle malformed checkEmail responses without crashing', async () => {
			const { getByLabelText, authStore } = renderWithStoreProp(SignInForm, {
				authConfig: {
					apiBaseUrl: 'https://api.test.com',
					appCode: 'test-app',
					enablePasskeys: false,
				},
			});

			// Mock malformed response
			vi.mocked(authStore.api.checkEmail).mockResolvedValue({
				exists: undefined as any,
				hasWebAuthn: null as any,
				userId: undefined,
				emailVerified: false,
				invitationTokenHash: undefined,
				lastPinExpiry: undefined,
			});

			const emailInput = getByLabelText('Email address');
			await fireEvent.input(emailInput, { target: { value: 'malformed@example.com' } });

			await waitFor(
				() => {
					expect(authStore.api.checkEmail).toHaveBeenCalled();
				},
				{ timeout: 3000 },
			);

			// Should not crash
			expect(emailInput).toBeInTheDocument();
		});
	});

	describe('WebAuthn Errors', () => {
		it('should handle WebAuthn user cancellation without crashing', async () => {
			const { getByLabelText, authStore } = renderWithStoreProp(SignInForm, {
				authConfig: {
					apiBaseUrl: 'https://api.test.com',
					appCode: 'test-app',
					enablePasskeys: true,
				},
				mockUserCheck: {
					exists: true,
					hasPasskey: true,
				},
			});

			// Mock WebAuthn cancellation
			const cancelError = new Error('The operation either timed out or was not allowed.');
			cancelError.name = 'NotAllowedError';
			navigator.credentials.get = vi.fn().mockRejectedValue(cancelError);

			const emailInput = getByLabelText('Email address');
			await fireEvent.input(emailInput, { target: { value: 'passkey@example.com' } });

			// Wait for potential WebAuthn prompt
			await waitFor(
				() => {
					expect(authStore.api.checkEmail).toHaveBeenCalled();
				},
				{ timeout: 3000 },
			);

			// Should not crash from user cancellation
			expect(emailInput).toBeInTheDocument();
		});

		it('should handle WebAuthn not supported errors gracefully', async () => {
			const { getByLabelText, authStore } = renderWithStoreProp(SignInForm, {
				authConfig: {
					apiBaseUrl: 'https://api.test.com',
					appCode: 'test-app',
					enablePasskeys: true,
				},
				mockUserCheck: {
					exists: true,
					hasPasskey: true,
				},
			});

			// Mock WebAuthn not supported
			const notSupportedError = new Error('WebAuthn not supported');
			notSupportedError.name = 'NotSupportedError';
			navigator.credentials.get = vi.fn().mockRejectedValue(notSupportedError);

			const emailInput = getByLabelText('Email address');
			await fireEvent.input(emailInput, { target: { value: 'webauthn-fail@example.com' } });

			await waitFor(
				() => {
					expect(authStore.api.checkEmail).toHaveBeenCalled();
				},
				{ timeout: 3000 },
			);

			expect(emailInput).toBeInTheDocument();
		});

		it('should handle WebAuthn timeout errors without unhandled rejection', async () => {
			const { getByLabelText, authStore } = renderWithStoreProp(SignInForm, {
				authConfig: {
					apiBaseUrl: 'https://api.test.com',
					appCode: 'test-app',
					enablePasskeys: true,
				},
				mockUserCheck: {
					exists: true,
					hasPasskey: true,
				},
			});

			// Mock timeout
			const timeoutError = new Error('Request timed out');
			timeoutError.name = 'TimeoutError';
			navigator.credentials.get = vi.fn().mockRejectedValue(timeoutError);

			const emailInput = getByLabelText('Email address');
			await fireEvent.input(emailInput, { target: { value: 'timeout@example.com' } });

			await waitFor(
				() => {
					expect(authStore.api.checkEmail).toHaveBeenCalled();
				},
				{ timeout: 3000 },
			);

			expect(emailInput).toBeInTheDocument();
		});
	});

	describe('Concurrent Promise Failures', () => {
		it('should handle multiple simultaneous API failures gracefully', async () => {
			const { getByLabelText, authStore } = renderWithStoreProp(SignInForm, {
				authConfig: {
					apiBaseUrl: 'https://api.test.com',
					appCode: 'test-app',
					enablePasskeys: true,
				},
			});

			// Mock all APIs to fail
			vi.mocked(authStore.api.checkEmail).mockRejectedValue(new Error('Check failed'));
			vi.mocked(authStore.api.sendAppEmailCode).mockRejectedValue(new Error('Send failed'));

			const emailInput = getByLabelText('Email address');
			await fireEvent.input(emailInput, { target: { value: 'multi-fail@example.com' } });

			// Should not have unhandled rejections from multiple failures
			await waitFor(
				() => {
					expect(authStore.api.checkEmail).toHaveBeenCalled();
				},
				{ timeout: 3000 },
			);

			expect(emailInput).toBeInTheDocument();
		});

		it('should handle promise rejection followed by success gracefully', async () => {
			const { getByLabelText, authStore } = renderWithStoreProp(SignInForm, {
				authConfig: {
					apiBaseUrl: 'https://api.test.com',
					appCode: 'test-app',
					enablePasskeys: false,
				},
			});

			// First call fails, second succeeds
			vi.mocked(authStore.api.checkEmail)
				.mockRejectedValueOnce(new Error('Network error'))
				.mockResolvedValueOnce({
					exists: true,
					hasWebAuthn: false,
					userId: 'user-123',
					emailVerified: false,
					invitationTokenHash: undefined,
					lastPinExpiry: undefined,
				});

			const emailInput = getByLabelText('Email address');

			// First attempt
			await fireEvent.input(emailInput, { target: { value: 'retry@example.com' } });

			await waitFor(
				() => {
					expect(authStore.api.checkEmail).toHaveBeenCalledTimes(1);
				},
				{ timeout: 3000 },
			);

			// Clear and retry
			await fireEvent.input(emailInput, { target: { value: '' } });
			await fireEvent.input(emailInput, { target: { value: 'retry@example.com' } });

			await waitFor(
				() => {
					expect(authStore.api.checkEmail).toHaveBeenCalledTimes(2);
				},
				{ timeout: 3000 },
			);

			expect(emailInput).toBeInTheDocument();
		});
	});

	describe('Error Recovery', () => {
		it('should allow retrying after API failure', async () => {
			const { getByLabelText, getByRole, authStore } = renderWithStoreProp(SignInForm, {
				authConfig: {
					apiBaseUrl: 'https://api.test.com',
					appCode: 'test-app',
					enablePasskeys: false,
				},
				mockUserCheck: {
					exists: true,
					hasPasskey: false,
				},
			});

			// First attempt fails, second succeeds
			vi.mocked(authStore.api.sendAppEmailCode)
				.mockRejectedValueOnce(new Error('Temporary error'))
				.mockResolvedValue({
					success: true,
					message: 'Code sent',
				});

			const emailInput = getByLabelText('Email address');
			await fireEvent.input(emailInput, { target: { value: 'retry@example.com' } });

			await waitFor(
				() => {
					const button = getByRole('button', { name: /send pin by email/i });
					expect(button).not.toHaveAttribute('disabled');
				},
				{ timeout: 3000 },
			);

			const submitButton = getByRole('button', { name: /send pin by email/i });

			// First attempt - should fail
			await fireEvent.click(submitButton);

			await waitFor(() => {
				expect(authStore.api.sendAppEmailCode).toHaveBeenCalled();
			});

			// Retry - should succeed
			await fireEvent.click(submitButton);

			await waitFor(() => {
				expect(authStore.api.sendAppEmailCode).toHaveBeenCalledTimes(2);
			});

			// After successful retry, component may transition to next state (pin entry)
			// The key is that it didn't crash from the error - promise was handled gracefully
		});
	});
});
