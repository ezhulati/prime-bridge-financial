import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',

  use: {
    baseURL: 'http://localhost:4323',
    trace: 'on-first-retry',
    screenshot: 'on',
  },

  projects: [
    // Desktop viewports
    {
      name: 'Desktop Chrome',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'Desktop Large',
      use: {
        viewport: { width: 1920, height: 1080 },
        deviceScaleFactor: 1,
      },
    },

    // Tablet viewports
    {
      name: 'iPad',
      use: { ...devices['iPad'] },
    },
    {
      name: 'iPad Pro',
      use: { ...devices['iPad Pro'] },
    },

    // Mobile viewports
    {
      name: 'iPhone 14',
      use: { ...devices['iPhone 14'] },
    },
    {
      name: 'iPhone SE',
      use: { ...devices['iPhone SE'] },
    },
    {
      name: 'Pixel 7',
      use: { ...devices['Pixel 7'] },
    },
  ],

  // Don't start webserver - we'll use the existing dev server
  webServer: undefined,
});
