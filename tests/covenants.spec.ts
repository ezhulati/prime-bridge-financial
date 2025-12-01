import { test, expect } from '@playwright/test';

test.describe('Covenants Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/covenants');
  });

  test('should display page header', async ({ page }) => {
    const headline = page.getByRole('heading', { level: 1 }).first();
    await expect(headline).toContainText('Covenant Monitor');

    // Check demo badge
    const demoBadge = page.getByText('Demo').first();
    await expect(demoBadge).toBeVisible();

    const subtitle = page.getByText('Track portfolio triggers');
    await expect(subtitle).toBeVisible();
  });

  test('should display demo banner', async ({ page }) => {
    const demoBanner = page.locator('text=This is a demo with sample data');
    await expect(demoBanner).toBeVisible();

    await expect(page.locator('.bg-primary\\/5').first()).toHaveScreenshot('covenants-demo-banner.png');
  });

  test('should display summary stats', async ({ page }) => {
    // Check status summary cards
    await expect(page.locator('p:has-text("OK")').first()).toBeVisible();
    await expect(page.locator('p:has-text("Warning")').first()).toBeVisible();
    await expect(page.locator('p:has-text("Breach")').first()).toBeVisible();

    // Check counts
    const okCount = page.locator('text=4').first();
    await expect(okCount).toBeVisible();

    await expect(page.locator('.grid.grid-cols-3')).toHaveScreenshot('covenants-summary.png');
  });

  test('should display all covenant cards', async ({ page }) => {
    // Check for all 6 covenants
    await expect(page.locator('text=Debt Service Coverage Ratio')).toBeVisible();
    await expect(page.locator('text=30+ Day Delinquency Rate')).toBeVisible();
    await expect(page.locator('text=60+ Day Delinquency Rate')).toBeVisible();
    await expect(page.locator('text=Charge-Off Rate')).toBeVisible();
    await expect(page.locator('text=Advance Rate')).toBeVisible();
    await expect(page.locator('text=Weighted Average FICO')).toBeVisible();
  });

  test('should display DSCR covenant correctly', async ({ page }) => {
    const dscrCard = page.locator('main div:has(h3:has-text("Debt Service Coverage Ratio"))').first();
    await expect(dscrCard).toBeVisible();

    // Check threshold
    await expect(dscrCard.locator('text=≥ 1.25x')).toBeVisible();

    // Check current value
    await expect(dscrCard.locator('text=1.42x')).toBeVisible();

    // Check OK status badge
    await expect(dscrCard.locator('span:has-text("OK")')).toBeVisible();

    await expect(dscrCard).toHaveScreenshot('covenant-dscr.png');
  });

  test('should display warning covenant correctly', async ({ page }) => {
    const warningCard = page.locator('main div:has(h3:has-text("60+ Day Delinquency Rate"))').first();
    await expect(warningCard).toBeVisible();

    // Check warning status badge
    await expect(warningCard.locator('span:has-text("Warning")')).toBeVisible();

    await expect(warningCard).toHaveScreenshot('covenant-warning.png');
  });

  test('should display breached covenant correctly', async ({ page }) => {
    const breachCard = page.locator('main div:has(h3:has-text("Charge-Off Rate"))').first();
    await expect(breachCard).toBeVisible();

    // Check breach status badge
    await expect(breachCard.locator('span:has-text("Breach")')).toBeVisible();

    // Current value should be red
    await expect(breachCard.locator('text=2.3%')).toBeVisible();

    await expect(breachCard).toHaveScreenshot('covenant-breach.png');
  });

  test('should display trend indicators', async ({ page }) => {
    // Check for trend text
    const upTrends = page.locator('text=up');
    const stableTrends = page.locator('text=stable');
    const downTrends = page.locator('text=down');

    // At least one of each should exist
    expect(await upTrends.count()).toBeGreaterThan(0);
    expect(await stableTrends.count()).toBeGreaterThan(0);
    expect(await downTrends.count()).toBeGreaterThan(0);
  });

  test('should display progress bars', async ({ page }) => {
    // Each covenant card should have a progress bar
    const progressBars = page.locator('.h-2.bg-lightest');
    expect(await progressBars.count()).toBe(6);
  });

  test('should display CTA section', async ({ page }) => {
    const ctaSection = page.locator('text=Want real-time covenant monitoring?');
    await ctaSection.scrollIntoViewIfNeeded();
    await expect(ctaSection).toBeVisible();

    // Check both CTA buttons
    const uploadButton = page.locator('a:has-text("Upload your tape")');
    const demoButton = page.locator('a:has-text("Book a demo")');

    await expect(uploadButton).toBeVisible();
    await expect(demoButton).toBeVisible();

    await expect(page.locator('section:has(h2:has-text("Want real-time"))')).toHaveScreenshot('covenants-cta.png');
  });

  test('should navigate to upload page from CTA', async ({ page }) => {
    const uploadButton = page.locator('a:has-text("Upload your tape")');
    await uploadButton.scrollIntoViewIfNeeded();
    await uploadButton.click();

    await expect(page).toHaveURL('/upload');
  });

  test('full page screenshot', async ({ page }) => {
    await expect(page).toHaveScreenshot('covenants-full.png', { fullPage: true });
  });

  test('covenant cards grid screenshot', async ({ page }) => {
    const cardsGrid = page.locator('.grid.grid-cols-1.md\\:grid-cols-2').first();
    await expect(cardsGrid).toHaveScreenshot('covenants-cards-grid.png');
  });
});
