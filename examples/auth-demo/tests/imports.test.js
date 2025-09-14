import { expect, test } from '@playwright/test';

/**
 * Import Validation Test
 * Validates that key functions can be imported without errors
 */

test.describe('Import Validation', () => {
  test('flows-auth imports work correctly', async ({ page }) => {
    // Use page.evaluate to test imports in browser context
    const result = await page.evaluate(async () => {
      try {
        // Dynamically import the auth library (as would be done in browser)
        const authModule = await import('@thepia/flows-auth');

        const errors = [];
        const successes = [];

        // Check for key exports that were previously failing
        const requiredExports = [
          'useAuth',
          'quickAuthSetup',
          'createDefaultAuthConfig',
          'detectDefaultApiServer',
          'createAuthStore',
          'SignInForm',
          'AccountCreationForm'
        ];

        for (const exportName of requiredExports) {
          if (
            typeof authModule[exportName] === 'function' ||
            authModule[exportName] !== undefined
          ) {
            successes.push(exportName);
          } else {
            errors.push(`${exportName} is ${typeof authModule[exportName]}`);
          }
        }

        return {
          success: errors.length === 0,
          errors,
          successes,
          totalExports: Object.keys(authModule).length
        };
      } catch (error) {
        return {
          success: false,
          errors: [error.message],
          successes: [],
          totalExports: 0
        };
      }
    });

    // Log results for debugging
    console.log('📦 Import test results:', result);

    // The test should succeed
    expect(result.success).toBe(true);

    // Should have found the critical exports
    expect(result.successes).toContain('useAuth');
    expect(result.successes).toContain('quickAuthSetup');
    expect(result.successes).toContain('createAuthStore');

    // Should have a reasonable number of exports
    expect(result.totalExports).toBeGreaterThan(10);

    // Log any errors for debugging
    if (result.errors.length > 0) {
      console.log('❌ Import errors:', result.errors);
    }
  });
});
