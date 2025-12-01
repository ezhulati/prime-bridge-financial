import { test, expect } from '@playwright/test';

test.describe('Upload Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/upload');
    // Wait for React hydration
    await page.waitForTimeout(1000);
  });

  test('should display upload hero section', async ({ page }) => {
    const headline = page.getByRole('heading', { level: 1 }).first();
    await expect(headline).toContainText('Validate your loan tape');

    // Check trust indicators (updated for signup gate flow)
    await expect(page.getByText('Free to try').first()).toBeVisible();
    await expect(page.getByText('Data stays in your browser').first()).toBeVisible();
    await expect(page.getByText('Create account to unlock exports').first()).toBeVisible();

    await expect(page).toHaveScreenshot('upload-hero.png', { fullPage: false });
  });

  test('should display file upload area', async ({ page }) => {
    // Wait for React component
    await page.waitForSelector('[class*="border-dashed"]', { timeout: 10000 });

    // Check for file input
    const fileInput = page.locator('input[type="file"]');
    await expect(fileInput).toBeAttached();
  });

  test('should display sample data button', async ({ page }) => {
    // Wait for button to be hydrated
    const sampleButton = page.getByRole('button', { name: /sample data/i });
    await expect(sampleButton).toBeVisible({ timeout: 10000 });

    await expect(page.locator('main .bg-white').first()).toHaveScreenshot('upload-dropzone.png');
  });

  test('should load sample data and show validation preview (signup gate)', async ({ page }) => {
    // Wait for button to be hydrated
    const sampleButton = page.getByRole('button', { name: /sample data/i });
    await expect(sampleButton).toBeVisible({ timeout: 10000 });
    await sampleButton.click();

    // Wait for validation to complete - shows preview for non-logged-in users
    await page.waitForSelector('text=Validation complete', { timeout: 15000 });

    // Check validation summary appears
    await expect(page.locator('main').locator('text=Validation complete').first()).toBeVisible();

    // Should show signup gate CTA for non-logged-in users
    await expect(page.getByText('Create a free account to unlock')).toBeVisible();
    await expect(page.getByRole('button', { name: /Create free account/i })).toBeVisible();

    await expect(page).toHaveScreenshot('upload-validation-results.png', { fullPage: true });
  });

  test('should show validation issues preview (blurred for non-logged-in)', async ({ page }) => {
    // Wait for and load sample data
    const sampleButton = page.getByRole('button', { name: /sample data/i });
    await expect(sampleButton).toBeVisible({ timeout: 10000 });
    await sampleButton.click();
    await page.waitForSelector('text=Validation complete', { timeout: 15000 });

    // Check for issues section - shows count but blurred for non-logged-in
    const hasIssues = await page.locator('text=/Issues found/i').isVisible().catch(() => false);
    expect(hasIssues).toBeTruthy();
  });

  test('should show signup CTA instead of export buttons for non-logged-in users', async ({ page }) => {
    // Wait for and load sample data
    const sampleButton = page.getByRole('button', { name: /sample data/i });
    await expect(sampleButton).toBeVisible({ timeout: 10000 });
    await sampleButton.click();
    await page.waitForSelector('text=Validation complete', { timeout: 15000 });

    // Non-logged-in users see signup CTA instead of export buttons
    await expect(page.getByRole('button', { name: /Create free account/i })).toBeVisible();

    // Export buttons should NOT be visible for non-logged-in users
    const exportCsvButton = page.getByRole('button', { name: /Download clean tape/i });
    await expect(exportCsvButton).not.toBeVisible();
  });

  test('should have reset functionality', async ({ page }) => {
    // Wait for and load sample data
    const sampleButton = page.getByRole('button', { name: /sample data/i });
    await expect(sampleButton).toBeVisible({ timeout: 10000 });
    await sampleButton.click();
    await page.waitForSelector('text=Validation complete', { timeout: 15000 });

    // Find and click reset/close button (X icon in header)
    const resetButton = page.getByRole('button', { name: /Start over/i });
    if (await resetButton.isVisible()) {
      await resetButton.click();

      // Should show upload area again
      await expect(page.getByText('Drop your file here')).toBeVisible({ timeout: 5000 });
    }
  });

  test('should display what we validate section', async ({ page }) => {
    const validateSection = page.locator('h2:has-text("What we validate")');
    await validateSection.scrollIntoViewIfNeeded();
    await expect(validateSection).toBeVisible();

    // Check validation items
    await expect(page.locator('text=Missing FICO Scores')).toBeVisible();
    await expect(page.locator('text=Invalid APR')).toBeVisible();
    await expect(page.locator('text=Duplicate Loan IDs')).toBeVisible();

    await expect(page.locator('section:has(h2:has-text("What we validate"))')).toHaveScreenshot('upload-validation-info.png');
  });

  test('should display CTA section at bottom', async ({ page }) => {
    const ctaSection = page.locator('text=Need more than validation?');
    await ctaSection.scrollIntoViewIfNeeded();
    await expect(ctaSection).toBeVisible();

    const demoButton = page.locator('a:has-text("Book a demo")');
    await expect(demoButton).toBeVisible();
  });

  test('full page screenshot - initial state', async ({ page }) => {
    // Wait for React hydration
    await expect(page.getByRole('button', { name: /sample data/i })).toBeVisible({ timeout: 10000 });
    await expect(page).toHaveScreenshot('upload-full-initial.png', { fullPage: true });
  });

  test('full page screenshot - after validation', async ({ page }) => {
    const sampleButton = page.getByRole('button', { name: /sample data/i });
    await expect(sampleButton).toBeVisible({ timeout: 10000 });
    await sampleButton.click();
    await page.waitForSelector('text=Validation complete', { timeout: 15000 });

    // Wait for any animations
    await page.waitForTimeout(500);

    await expect(page).toHaveScreenshot('upload-full-validated.png', { fullPage: true });
  });

  test('signup gate redirects to signup with params', async ({ page }) => {
    // Load sample data
    const sampleButton = page.getByRole('button', { name: /sample data/i });
    await expect(sampleButton).toBeVisible({ timeout: 10000 });
    await sampleButton.click();
    await page.waitForSelector('text=Validation complete', { timeout: 15000 });

    // Click the signup CTA
    const signupButton = page.getByRole('button', { name: /Create free account/i });
    await expect(signupButton).toBeVisible();
    await signupButton.click();

    // Should redirect to signup with params
    await page.waitForURL(/\/signup\?redirect=.*unlock=true/);
    expect(page.url()).toContain('/signup');
    expect(page.url()).toContain('redirect');
    expect(page.url()).toContain('unlock=true');

    // Signup page should show unlock-specific messaging
    await expect(page.getByText('Your validation is ready')).toBeVisible();
    await expect(page.getByText('One more step')).toBeVisible();
  });
});
