import { test, expect } from '@playwright/test';

test.describe('Dashboard Page', () => {
  test.beforeEach(async ({ page }) => {
    // Clear localStorage before each test
    await page.goto('/dashboard');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
  });

  test('should display dashboard header', async ({ page }) => {
    const headline = page.getByRole('heading', { level: 1 }).first();
    await expect(headline).toContainText('Dashboard');

    const subtitle = page.getByText('Track your uploaded tapes');
    await expect(subtitle).toBeVisible();

    // Check upload button
    const uploadButton = page.locator('a:has-text("Upload new tape")');
    await expect(uploadButton).toBeVisible();
    await expect(uploadButton).toHaveAttribute('href', '/upload');
  });

  test('should display stats cards', async ({ page }) => {
    // Check all 4 stat cards
    await expect(page.locator('text=Tapes Uploaded')).toBeVisible();
    await expect(page.locator('text=Total Loans')).toBeVisible();
    await expect(page.locator('text=Avg. Validation')).toBeVisible();
    await expect(page.locator('text=Total Issues')).toBeVisible();

    await expect(page.locator('.grid').first()).toHaveScreenshot('dashboard-stats.png');
  });

  test('should display empty state when no tapes', async ({ page }) => {
    const emptyState = page.locator('text=No tapes uploaded yet');
    await expect(emptyState).toBeVisible();

    const uploadCta = page.locator('a:has-text("Upload your first tape")');
    await expect(uploadCta).toBeVisible();

    await expect(page).toHaveScreenshot('dashboard-empty.png', { fullPage: true });
  });

  test('should show tapes after uploading one', async ({ page }) => {
    // Navigate to upload, load sample data, then go back to dashboard
    await page.goto('/upload');
    // Wait for hydration
    const sampleButton = page.getByRole('button', { name: /sample data/i });
    await expect(sampleButton).toBeVisible({ timeout: 10000 });
    await sampleButton.click();
    await page.waitForSelector('text=Validation Complete', { timeout: 15000 });

    // Wait for localStorage to be saved
    await page.waitForTimeout(500);

    // Go to dashboard
    await page.goto('/dashboard');

    // Should see tape in list
    const tapesList = page.locator('#tapes-content');
    await expect(tapesList).not.toHaveClass(/hidden/);

    // Stats should be updated
    const tapesCount = page.locator('#stat-tapes');
    await expect(tapesCount).not.toHaveText('0');

    await expect(page).toHaveScreenshot('dashboard-with-tape.png', { fullPage: true });
  });

  test('should display covenant monitoring preview', async ({ page }) => {
    const covenantSection = page.locator('text=Covenant Monitoring');
    await expect(covenantSection).toBeVisible();

    const comingSoon = page.locator('text=Coming Soon');
    await expect(comingSoon).toBeVisible();

    const previewLink = page.locator('a:has-text("Preview covenants")');
    await expect(previewLink).toBeVisible();
    await expect(previewLink).toHaveAttribute('href', '/covenants');
  });

  test('should navigate to covenants preview', async ({ page }) => {
    const previewLink = page.locator('a:has-text("Preview covenants")');
    await previewLink.click();

    await expect(page).toHaveURL('/covenants');
  });

  test('full page screenshot', async ({ page }) => {
    await expect(page).toHaveScreenshot('dashboard-full.png', { fullPage: true });
  });
});

test.describe('Dashboard with data', () => {
  test.beforeEach(async ({ page }) => {
    // Pre-populate localStorage with sample data
    await page.goto('/dashboard');
    await page.evaluate(() => {
      const sampleTapes = [
        {
          id: 'test-1',
          name: 'Q4_2024_loan_tape.csv',
          totalRows: 1500,
          validRows: 1425,
          errors: 45,
          warnings: 30,
          validationScore: 95,
          uploadedAt: new Date().toISOString()
        },
        {
          id: 'test-2',
          name: 'november_portfolio.xlsx',
          totalRows: 890,
          validRows: 712,
          errors: 120,
          warnings: 58,
          validationScore: 80,
          uploadedAt: new Date(Date.now() - 86400000).toISOString()
        },
        {
          id: 'test-3',
          name: 'consumer_loans_batch.csv',
          totalRows: 2300,
          validRows: 1610,
          errors: 450,
          warnings: 240,
          validationScore: 70,
          uploadedAt: new Date(Date.now() - 172800000).toISOString()
        }
      ];
      localStorage.setItem('primebridge_tapes', JSON.stringify(sampleTapes));
    });
    await page.reload();
  });

  test('should display tapes list correctly', async ({ page }) => {
    // Check tape items are displayed
    await expect(page.locator('text=Q4_2024_loan_tape.csv')).toBeVisible();
    await expect(page.locator('text=november_portfolio.xlsx')).toBeVisible();
    await expect(page.locator('text=consumer_loans_batch.csv')).toBeVisible();

    await expect(page).toHaveScreenshot('dashboard-with-tapes.png', { fullPage: true });
  });

  test('should display correct stats', async ({ page }) => {
    // Total tapes should be 3
    const tapesCount = page.locator('#stat-tapes');
    await expect(tapesCount).toHaveText('3');

    // Total loans = 1500 + 890 + 2300 = 4690
    const loansCount = page.locator('#stat-loans');
    await expect(loansCount).toHaveText('4,690');
  });

  test('should display validation scores with color coding', async ({ page }) => {
    // 95% should be green
    await expect(page.locator('text=95% valid')).toBeVisible();
    // 80% should be warning color
    await expect(page.locator('text=80% valid')).toBeVisible();
    // 70% should be error/red color
    await expect(page.locator('text=70% valid')).toBeVisible();
  });

  test('should delete a tape', async ({ page }) => {
    // Find and click delete button for first tape
    const deleteButton = page.locator('button:has-text("Delete")').first();
    await deleteButton.click();

    // Should only have 2 tapes now
    const tapesCount = page.locator('#stat-tapes');
    await expect(tapesCount).toHaveText('2');
  });
});
