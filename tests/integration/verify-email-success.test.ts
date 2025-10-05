import { beforeEach, describe, expect, test, vi } from 'vitest';
import { AuthApiClient } from '../../src/api/auth-api';

/**
 * Integration test for actual server response from /demo/verify-email
 *
 * This test uses the EXACT response from the server to ensure we handle it correctly:
 * POST https://dev.thepia.com:8443/demo/verify-email
 * Body: { "email": "henrik@thepia.com", "code": "012911" }
 *
 * Response:
 * {
 *   "user": { "id": "workos|user_01K4DDYMKSK82XKFYAKBG54AH9", "email": "henrik@thepia.com", "name": "henrik", "emailVerified": true },
 *   "step": "authenticated",
 *   "accessToken": "eyJ...",
 *   "refreshToken": "KQoT4VRzciiN1AI96tHBv1PEp",
 *   "message": "Welcome back! You're now signed in."
 * }
 */
describe('Verify Email Success - Real Server Response', () => {
  let apiClient: AuthApiClient;

  beforeEach(() => {
    apiClient = new AuthApiClient({
      apiBaseUrl: 'https://dev.thepia.com:8443',
      domain: 'thepia.net',
      appCode: 'demo'
    });
  });

  test('should handle actual server success response with step=authenticated', async () => {
    // Mock the exact server response
    const mockResponse = {
      user: {
        id: 'workos|user_01K4DDYMKSK82XKFYAKBG54AH9',
        email: 'henrik@thepia.com',
        name: 'henrik',
        emailVerified: true
      },
      step: 'authenticated',
      accessToken: 'eyJhbGciOiJSUzI1NiIsImtpZCI6InNzb19vaWRjX2tleV9wYWlyXzAxSzRBQlNDRUFBQVhYODZRN0I3OE43MDQ1In0.eyJpc3MiOiJodHRwczovL2FwaS53b3Jrb3MuY29tL3VzZXJfbWFuYWdlbWVudC9jbGllbnRfMDFLNEFCU0NQS0VZM0ZRS0NFUUQ0VjdKU00iLCJzdWIiOiJ1c2VyXzAxSzRERFlNS1NLODJYS0ZZQUtCRzU0QUg5Iiwic2lkIjoic2Vzc2lvbl8wMUs2V0NBTURLMUpHSlFXNDI3UDc4NjBNOSIsImp0aSI6IjAxSzZXQ0FNRlY2Q0FTNzdaNEtYS0hRV1lBIiwiZXhwIjoxNzU5NzQxODYzLCJpYXQiOjE3NTk3NDE1NjN9.0-9xQnVAoFE07fVtUWC322o0qJfKUXAsQ7URMoNdoqzwu5ESbWBO1N-Vlp8DyPP3j1hlx7_J07Bmhg27Zk2QEX0xHlJUse3wPiJ7D7-ECgYiQ_ZAs_sAONTanhTYrr-Ww8zpWqbVxF3P6UFhPv7DEIbB4r1oPLtui1JfuLXWlCmrwqjcBPwItN1vpuKdXHDGjhThbdssLJy4yDUq6Zfvyqmkw1zMVpwAuWU51kzbMRnZb2vhLaxw3vyVzgWyqOF0XrHH0xdFsfCecoCvvdJsboRk6EVvVR__mLWnLmv7givWMVIMtp2ZblBZZSn_GWQhozNvIsgtko4B5BQlD-zz4A',
      refreshToken: 'KQoT4VRzciiN1AI96tHBv1PEp',
      message: 'Welcome back! You\'re now signed in.'
    };

    // Mock fetch to return exact server response
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => mockResponse
    } as Response);

    // Call the verify method
    const result = await apiClient.verifyAppEmailCode('henrik@thepia.com', '012911');

    // Verify it recognizes this as success
    expect(result).toBeDefined();
    expect(result.step).toBe('success'); // Should transform 'authenticated' to 'success'
    expect(result.user).toBeDefined();
    expect(result.user?.email).toBe('henrik@thepia.com');
    expect(result.accessToken).toBe(mockResponse.accessToken);
    expect(result.refreshToken).toBe(mockResponse.refreshToken);
  });

  test('should NOT throw error when server returns success with message field', async () => {
    const mockResponse = {
      user: {
        id: 'workos|user_01K4DDYMKSK82XKFYAKBG54AH9',
        email: 'henrik@thepia.com',
        name: 'henrik',
        emailVerified: true
      },
      step: 'authenticated',
      accessToken: 'test-token',
      refreshToken: 'test-refresh-token',
      message: 'Welcome back! You\'re now signed in.'
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => mockResponse
    } as Response);

    // This should NOT throw
    await expect(
      apiClient.verifyAppEmailCode('henrik@thepia.com', '012911')
    ).resolves.toBeDefined();
  });

  test('should handle success detection correctly', async () => {
    const mockResponse = {
      user: {
        id: 'test-user-id',
        email: 'test@example.com',
        name: 'Test User',
        emailVerified: true
      },
      step: 'authenticated',
      accessToken: 'access-token-here',
      refreshToken: 'refresh-token-here',
      message: 'Welcome back! You\'re now signed in.'
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => mockResponse
    } as Response);

    const result = await apiClient.verifyAppEmailCode('test@example.com', '123456');

    // The condition should be: response.user && response.accessToken
    // Both exist, so this should be detected as success
    expect(result.step).toBe('success');
    expect(result.user).toEqual(mockResponse.user);
    expect(result.accessToken).toBe(mockResponse.accessToken);
  });

  test('should throw error only when user or accessToken is missing', async () => {
    const mockErrorResponse = {
      step: 'error',
      error: 'invalid_code',
      message: 'Invalid verification code'
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => mockErrorResponse
    } as Response);

    await expect(
      apiClient.verifyAppEmailCode('test@example.com', 'wrong-code')
    ).rejects.toThrow();
  });
});
