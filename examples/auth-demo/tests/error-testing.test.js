/**
 * Playwright tests for Error Testing Feature
 * Validates that the error testing menu works correctly
 */

import { expect, test } from '@playwright/test';

test.describe('Error Testing Feature', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to signin page
    await page.goto('/signin');

    // Wait for the page to load
    await page.waitForSelector('.signin-page-simple');
  });

  test('should display error test menu button', async ({ page }) => {
    // Check that the error test menu button is visible
    const menuButton = page.locator('.error-test-menu .menu-trigger');
    await expect(menuButton).toBeVisible();
    await expect(menuButton).toContainText('🧪 Test Errors');
  });

  test('should open error test menu when clicked', async ({ page }) => {
    // Click the menu button
    await page.click('.error-test-menu .menu-trigger');

    // Check that the dropdown is visible
    const dropdown = page.locator('.error-test-menu .menu-dropdown');
    await expect(dropdown).toBeVisible();

    // Check that error types are listed
    await expect(page.locator('.menu-item')).toHaveCount(7); // 6 error types + clear button
  });

  test('should display error type options', async ({ page }) => {
    // Open the menu
    await page.click('.error-test-menu .menu-trigger');

    // Check that all error types are present
    const errorTypes = [
      'Technical API Error (404)',
      'Passkey Challenge Error',
      'WebAuthn Cancelled',
      'Security Error',
      'Generic Auth Error',
      'Email Code Error',
      'Clear All Errors'
    ];

    for (const errorType of errorTypes) {
      await expect(page.locator('.menu-item', { hasText: errorType })).toBeVisible();
    }
  });

  test('should show instructions in menu footer', async ({ page }) => {
    // Open the menu
    await page.click('.error-test-menu .menu-trigger');

    // Check that instructions are visible
    const instructions = page.locator('.menu-footer .instructions');
    await expect(instructions).toBeVisible();
    await expect(instructions).toContainText('How to test:');
  });

  test('should close menu when clicking outside', async ({ page }) => {
    // Open the menu
    await page.click('.error-test-menu .menu-trigger');

    // Verify menu is open
    await expect(page.locator('.menu-dropdown')).toBeVisible();

    // Click outside the menu
    await page.click('.signin-page-simple');

    // Verify menu is closed
    await expect(page.locator('.menu-dropdown')).not.toBeVisible();
  });

  test('should display SignInCore component', async ({ page }) => {
    // Check that SignInCore component is rendered
    const signInDemo = page.locator('.signin-demo');
    await expect(signInDemo).toBeVisible();

    // Check card header
    await expect(page.locator('.card-header h3')).toContainText('Live Sign-In Component');
    await expect(page.locator('.card-header .text-secondary')).toContainText('floating menu');
  });

  test('should have simplified layout without sidebars', async ({ page }) => {
    // Check that old sidebar elements are not present
    await expect(page.locator('.config-sidebar')).not.toBeVisible();
    await expect(page.locator('.state-machine-sidebar')).not.toBeVisible();

    // Check that simplified layout is used
    await expect(page.locator('.signin-page-simple')).toBeVisible();
    await expect(page.locator('.demo-main-centered')).toBeVisible();
  });

  test('should show test instructions in page header', async ({ page }) => {
    // Check that test instructions are visible
    const instructions = page.locator('.test-instructions');
    await expect(instructions).toBeVisible();
    await expect(instructions).toContainText('Use the floating menu');
    await expect(instructions).toContainText('test friendly error messages');
  });

  test('should be responsive on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    // Check that components are still visible and properly sized
    await expect(page.locator('.signin-page-simple')).toBeVisible();
    await expect(page.locator('.error-test-menu')).toBeVisible();
    await expect(page.locator('.signin-demo')).toBeVisible();

    // Check that signin demo takes full width on mobile
    const signInDemo = page.locator('.signin-demo');
    const boundingBox = await signInDemo.boundingBox();
    expect(boundingBox.width).toBeGreaterThan(300); // Should be close to full width
  });

  test('should maintain menu button position when scrolling', async ({ page }) => {
    // Add some height to force scrolling
    await page.addStyleTag({
      content: '.signin-page-simple { min-height: 2000px; }'
    });

    // Scroll down
    await page.evaluate(() => window.scrollTo(0, 500));

    // Check that menu button is still visible (fixed position)
    const menuButton = page.locator('.error-test-menu .menu-trigger');
    await expect(menuButton).toBeVisible();

    // Check that it's in the expected position (top-right)
    const boundingBox = await menuButton.boundingBox();
    expect(boundingBox.x).toBeGreaterThan(page.viewportSize().width - 200);
    expect(boundingBox.y).toBeLessThan(200);
  });
});
