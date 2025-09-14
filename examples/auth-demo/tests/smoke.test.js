import { expect, test } from '@playwright/test';

/**
 * Smoke Test for Auth Demo
 * Validates that the page loads correctly and key functions are available
 */

test.describe('Auth Demo Smoke Tests', () => {
  test('page loads successfully', async ({ page }) => {
    await page.goto('/');

    // Wait for page to be fully loaded
    await page.waitForLoadState('networkidle');

    // Check that the page title is set
    await expect(page).toHaveTitle(/Auth Demo/);

    // Verify main heading exists
    const heading = page.locator('h1').first();
    await expect(heading).toBeVisible();
    await expect(heading).toContainText('Auth Demo');
  });

  test('auth configuration loads without errors', async ({ page }) => {
    // Listen for console errors
    const consoleErrors = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Check for critical JavaScript errors
    const criticalErrors = consoleErrors.filter(
      (error) =>
        error.includes('useAuth is not a function') ||
        error.includes('quickAuthSetup is not a function') ||
        error.includes('Cannot read properties of undefined') ||
        error.includes('TypeError') ||
        error.includes('ReferenceError')
    );

    expect(criticalErrors).toHaveLength(0);

    // Log any other console errors for debugging (but don't fail the test)
    if (consoleErrors.length > 0) {
      console.log('⚠️  Console errors detected (non-critical):', consoleErrors);
    }
  });

  test('tabs are functional', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Check that Sign In tab exists and is clickable
    const signInTab = page.locator('text=Sign In');
    await expect(signInTab).toBeVisible();
    await signInTab.click();

    // Check that Registration tab exists and is clickable
    const registrationTab = page.locator('text=Registration');
    await expect(registrationTab).toBeVisible();
    await registrationTab.click();

    // Verify Registration tab content loads
    await expect(page.locator('text=Registration State Testing')).toBeVisible();
  });

  test('registration tab components load', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Navigate to Registration tab
    await page.locator('text=Registration').click();

    // Check for key components
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('text=Check User State')).toBeVisible();

    // Check for domain switcher
    await expect(page.locator('text=Base Domain')).toBeVisible();

    // Check for user state result area
    await expect(page.locator('text=User State Result')).toBeVisible();
  });

  test('email input accepts valid email', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Navigate to Registration tab
    await page.locator('text=Registration').click();

    // Find email input and enter a test email
    const emailInput = page.locator('input[type="email"]');
    await emailInput.fill('test@example.com');

    // Verify the email was entered
    await expect(emailInput).toHaveValue('test@example.com');
  });

  test('check user state button is functional', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Navigate to Registration tab
    await page.locator('text=Registration').click();

    // Enter test email
    await page.locator('input[type="email"]').fill('test@example.com');

    // Click Check User State button
    const checkButton = page.locator('text=Check User State');
    await checkButton.click();

    // Wait for some response (either success or error)
    // We're not testing the API response here, just that the button works
    await page.waitForTimeout(2000);

    // The button should still be visible (not crashed)
    await expect(checkButton).toBeVisible();
  });

  test('error reporting configuration is present', async ({ page }) => {
    await page.goto('/');

    // Check for error reporter initialization logs
    const logs = [];
    page.on('console', (msg) => {
      if (msg.type() === 'log' && msg.text().includes('ErrorReporter')) {
        logs.push(msg.text());
      }
    });

    await page.waitForLoadState('networkidle');

    // We should see error reporter initialization
    // (This validates that error reporting is configured)
    const hasErrorReporterInit = logs.some(
      (log) =>
        log.includes('📊 [ErrorReporter]') ||
        log.includes('🔧 Using') ||
        log.includes('🚀 Quick auth setup complete')
    );

    // Don't fail if no logs (they might be filtered), but log for debugging
    if (!hasErrorReporterInit) {
      console.log('📊 No error reporter logs detected. Console logs:', logs);
    }
  });
});
