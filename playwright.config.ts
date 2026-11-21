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
    // Only the offline project runs the service worker, so every other test sees the app with nothing cached.
    serviceWorkers: 'block',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'api', testMatch: /api\.spec\.ts/ },
    { name: 'ipad-landscape', testIgnore: /(api|offline)\.spec\.ts/, use: { ...touch, viewport: { width: 1024, height: 768 } } },
    { name: 'ipad-portrait', testIgnore: /(api|offline)\.spec\.ts/, use: { ...touch, viewport: { width: 820, height: 1180 } } },
    { name: 'phone', testIgnore: /(api|offline)\.spec\.ts/, use: { ...touch, viewport: { width: 390, height: 844 } } },
    // iPhone Duo, the foldable (Sept 2026): 7.6-inch inner screen 1878 x 2670 pixels at 3x, so 626 x 890 open. Closed,
    // its 5.4-inch outer screen is phone sized, which 'phone' and 'narrow-360' already cover.
    { name: 'fold-open', testIgnore: /(api|offline)\.spec\.ts/, use: { ...touch, deviceScaleFactor: 3, viewport: { width: 626, height: 890 } } },
    { name: 'narrow-360', testIgnore: /(api|offline)\.spec\.ts/, use: { ...touch, viewport: { width: 360, height: 640 } } },
    {
      name: 'laptop-chromium',
      testIgnore: /(api|offline)\.spec\.ts/,
      use: { browserName: 'chromium', viewport: { width: 1280, height: 800 } },
    },
    {
      // Offline use and updates. Playwright's WebKit cannot run a service worker reliably, so this runs in Chromium.
      name: 'offline-chromium',
      testMatch: /offline\.spec\.ts/,
      use: { browserName: 'chromium', viewport: { width: 1024, height: 768 }, serviceWorkers: 'allow', launchOptions: { args: ['--ignore-certificate-errors'] } },
    },
  ],
});
