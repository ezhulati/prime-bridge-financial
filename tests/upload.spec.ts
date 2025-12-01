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

    // Check trust indicators
    await expect(page.getByText('No signup required').first()).toBeVisible();
    await expect(page.getByText('Data stays in your browser').first()).toBeVisible();

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

  test('should load sample data and show validation results', async ({ page }) => {
    // Wait for button to be hydrated
    const sampleButton = page.getByRole('button', { name: /sample data/i });
    await expect(sampleButton).toBeVisible({ timeout: 10000 });
    await sampleButton.click();

    // Wait for validation to complete
    await page.waitForSelector('text=Validation Complete', { timeout: 15000 });

    // Check validation summary appears
    await expect(page.locator('main').locator('text=Validation Complete').first()).toBeVisible();

    await expect(page).toHaveScreenshot('upload-validation-results.png', { fullPage: true });
  });

  test('should show validation issues list', async ({ page }) => {
    // Wait for and load sample data
    const sampleButton = page.getByRole('button', { name: /sample data/i });
    await expect(sampleButton).toBeVisible({ timeout: 10000 });
    await sampleButton.click();
    await page.waitForSelector('text=Validation Complete', { timeout: 15000 });

    // Check for issues section - may say "Issues Found" or show error count
    const hasIssues = await page.locator('text=/\\d+ errors?/i').isVisible().catch(() => false);
    expect(hasIssues).toBeTruthy();
  });

  test('should have export buttons after validation', async ({ page }) => {
    // Wait for and load sample data
    const sampleButton = page.getByRole('button', { name: /sample data/i });
    await expect(sampleButton).toBeVisible({ timeout: 10000 });
    await sampleButton.click();
    await page.waitForSelector('text=Validation Complete', { timeout: 15000 });

    // Check export buttons
    const exportCsvButton = page.getByRole('button', { name: /Download Clean CSV/i });
    const exportReportButton = page.getByRole('button', { name: /Download Report/i });

    await expect(exportCsvButton).toBeVisible();
    await expect(exportReportButton).toBeVisible();
  });

  test('should have reset functionality', async ({ page }) => {
    // Wait for and load sample data
    const sampleButton = page.getByRole('button', { name: /sample data/i });
    await expect(sampleButton).toBeVisible({ timeout: 10000 });
    await sampleButton.click();
    await page.waitForSelector('text=Validation Complete', { timeout: 15000 });

    // Find and click reset/new file button
    const resetButton = page.getByRole('button', { name: /Upload New File|Start Over/i });
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
    await page.waitForSelector('text=Validation Complete', { timeout: 15000 });

    // Wait for any animations
    await page.waitForTimeout(500);

    await expect(page).toHaveScreenshot('upload-full-validated.png', { fullPage: true });
  });
});
