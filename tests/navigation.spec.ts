import { test, expect } from '@playwright/test';

test.describe('Navigation Flow', () => {
  test('complete user journey: homepage -> upload -> validate -> dashboard', async ({ page }) => {
    // Step 1: Start at homepage
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 }).first()).toContainText('Stop wasting hours');

    // Step 2: Click CTA to go to upload
    await page.getByRole('link', { name: /Try it free/i }).first().click();
    await expect(page).toHaveURL('/upload');
    await expect(page.getByRole('heading', { level: 1 }).first()).toContainText('Validate your loan tape');

    // Step 3: Load sample data - wait for hydration first
    const sampleButton = page.getByRole('button', { name: /sample data/i });
    await expect(sampleButton).toBeVisible({ timeout: 10000 });
    await sampleButton.click();
    await page.waitForSelector('text=Validation Complete', { timeout: 15000 });

    // Step 4: Navigate to dashboard
    await page.goto('/dashboard');
    await expect(page.getByRole('heading', { level: 1 }).first()).toContainText('Dashboard');

    // Verify tape appears in dashboard
    const tapesCount = page.locator('#stat-tapes');
    await expect(tapesCount).not.toHaveText('0');

    // Step 5: Go to covenants
    await page.getByRole('link', { name: /Preview covenants/i }).click();
    await expect(page).toHaveURL('/covenants');
    await expect(page.getByRole('heading', { level: 1 }).first()).toContainText('Covenant Monitor');
  });

  test('header navigation works on all pages', async ({ page }) => {
    const pages = ['/', '/upload', '/dashboard', '/covenants'];

    for (const pageUrl of pages) {
      await page.goto(pageUrl);

      // Check header exists
      const header = page.locator('header');
      await expect(header).toBeVisible();

      // Check logo links to homepage
      const logo = page.locator('header a:has(img[alt="PrimeBridge"])');
      await expect(logo).toHaveAttribute('href', '/');
    }
  });

  test('footer appears on all pages', async ({ page }) => {
    const pages = ['/', '/upload', '/dashboard', '/covenants'];

    for (const pageUrl of pages) {
      await page.goto(pageUrl);

      const footer = page.locator('footer');
      await footer.scrollIntoViewIfNeeded();
      await expect(footer).toBeVisible();
    }
  });

  test('mobile menu navigation', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');

    // Header should still be visible
    const header = page.locator('header');
    await expect(header).toBeVisible();

    // Upload button should be visible (even on mobile)
    const uploadButton = page.locator('header a:has-text("Upload")');
    await expect(uploadButton).toBeVisible();
  });
});

test.describe('Responsive Layout', () => {
  const viewports = [
    { name: 'Mobile', width: 375, height: 667 },
    { name: 'Tablet', width: 768, height: 1024 },
    { name: 'Desktop', width: 1280, height: 800 },
    { name: 'Large Desktop', width: 1920, height: 1080 },
  ];

  for (const viewport of viewports) {
    test(`homepage renders correctly at ${viewport.name} (${viewport.width}x${viewport.height})`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto('/');

      // Hero should be visible
      await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();

      // CTA should be visible - using role-based selector
      const cta = page.getByRole('link', { name: /Try it free/i }).first();
      await expect(cta).toBeVisible();

      await expect(page).toHaveScreenshot(`responsive-homepage-${viewport.name.toLowerCase().replace(' ', '-')}.png`);
    });

    test(`upload page renders correctly at ${viewport.name}`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto('/upload');

      // Upload area should be visible
      await expect(page.locator('text=Drag and drop')).toBeVisible();

      await expect(page).toHaveScreenshot(`responsive-upload-${viewport.name.toLowerCase().replace(' ', '-')}.png`);
    });

    test(`dashboard renders correctly at ${viewport.name}`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto('/dashboard');

      // Stats cards should be visible
      await expect(page.locator('text=Tapes Uploaded')).toBeVisible();

      await expect(page).toHaveScreenshot(`responsive-dashboard-${viewport.name.toLowerCase().replace(' ', '-')}.png`);
    });

    test(`covenants page renders correctly at ${viewport.name}`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto('/covenants');

      // Covenant cards should be visible
      await expect(page.locator('text=Debt Service Coverage')).toBeVisible();

      await expect(page).toHaveScreenshot(`responsive-covenants-${viewport.name.toLowerCase().replace(' ', '-')}.png`);
    });
  }
});
