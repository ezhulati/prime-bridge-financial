import { test, expect } from '@playwright/test';

test.describe('Homepage', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display hero section correctly', async ({ page }) => {
    // Check hero headline
    const heroHeadline = page.getByRole('heading', { level: 1 }).first();
    await expect(heroHeadline).toContainText('Stop wasting hours');

    // Check CTA button - using role-based selector
    const ctaButton = page.getByRole('link', { name: /Try it free/i }).first();
    await expect(ctaButton).toBeVisible();

    // Take screenshot
    await expect(page).toHaveScreenshot('homepage-hero.png', { fullPage: false });
  });

  test('should display header with navigation', async ({ page }) => {
    const header = page.locator('header');
    await expect(header).toBeVisible();

    // Check logo
    const logo = page.locator('header img[alt="PrimeBridge"]');
    await expect(logo).toBeVisible();

    // Check nav links on desktop
    const howItWorks = page.locator('nav a:has-text("How It Works")');
    const uploadTape = page.locator('nav a:has-text("Upload Tape")');
    const dashboard = page.locator('nav a:has-text("Dashboard")');

    // These may be hidden on mobile
    if (await howItWorks.isVisible()) {
      await expect(howItWorks).toHaveAttribute('href', '/#how-it-works');
      await expect(uploadTape).toHaveAttribute('href', '/upload');
      await expect(dashboard).toHaveAttribute('href', '/dashboard');
    }

    await expect(header).toHaveScreenshot('homepage-header.png');
  });

  test('should display problem stats section', async ({ page }) => {
    // Check for stats with real numbers
    const stat38 = page.locator('text=38%');
    const stat36 = page.locator('text=3.6%');

    await expect(stat38).toBeVisible();
    await expect(stat36).toBeVisible();
  });

  test('should display how it works section', async ({ page }) => {
    const howItWorks = page.locator('#how-it-works');
    await expect(howItWorks).toBeVisible();

    // Scroll to section
    await howItWorks.scrollIntoViewIfNeeded();
    await expect(howItWorks).toHaveScreenshot('homepage-how-it-works.png');
  });

  test('should display features section', async ({ page }) => {
    // Check for feature cards
    const featureSection = page.locator('section:has-text("What we catch")');
    if (await featureSection.count() > 0) {
      await featureSection.scrollIntoViewIfNeeded();
      await expect(featureSection).toHaveScreenshot('homepage-features.png');
    }
  });

  test('should display footer correctly', async ({ page }) => {
    const footer = page.locator('footer');
    await footer.scrollIntoViewIfNeeded();
    await expect(footer).toBeVisible();

    // Check footer CTA
    const footerCta = footer.locator('a:has-text("Upload your first tape")');
    await expect(footerCta).toBeVisible();

    await expect(footer).toHaveScreenshot('homepage-footer.png');
  });

  test('should navigate to upload page from CTA', async ({ page }) => {
    const ctaButton = page.getByRole('link', { name: /Try it free/i }).first();
    await ctaButton.click();

    await expect(page).toHaveURL('/upload');
  });

  test('full page screenshot', async ({ page }) => {
    await expect(page).toHaveScreenshot('homepage-full.png', { fullPage: true });
  });
});
