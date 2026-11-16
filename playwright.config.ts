import { defineConfig } from '@playwright/test';
import { BASE_URL } from './e2e/support/paths';

// Browser tests. They run the real Worker locally over HTTPS, with a throwaway
// database and made-up addresses. Run: npm run e2e
const touch = { browserName: 'webkit' as const, hasTouch: true, deviceScaleFactor: 2 };

export default defineConfig({
  testDir: 'e2e',
  globalSetup: './e2e/support/server.ts',
  // One at a time: every test shares one Worker log, where the sign-in code is printed.
  workers: 1,
  fullyParallel: false,
  forbidOnly: true,
  retries: 0,
  timeout: 60_000,
  expect: { timeout: 15_000 },
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: BASE_URL,
    ignoreHTTPSErrors: true,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'api', testMatch: /api\.spec\.ts/ },
    { name: 'ipad-landscape', testIgnore: /api\.spec\.ts/, use: { ...touch, viewport: { width: 1024, height: 768 } } },
    { name: 'ipad-portrait', testIgnore: /api\.spec\.ts/, use: { ...touch, viewport: { width: 820, height: 1180 } } },
    { name: 'phone', testIgnore: /api\.spec\.ts/, use: { ...touch, viewport: { width: 390, height: 844 } } },
    { name: 'narrow-360', testIgnore: /api\.spec\.ts/, use: { ...touch, viewport: { width: 360, height: 640 } } },
    {
      name: 'laptop-chromium',
      testIgnore: /api\.spec\.ts/,
      use: { browserName: 'chromium', viewport: { width: 1280, height: 800 } },
    },
  ],
});
