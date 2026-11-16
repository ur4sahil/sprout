import { defineConfig } from '@playwright/test';

// Read-only checks against the live site. They never ask for a sign-in code,
// so no email is sent. Run: npm run e2e:live
export default defineConfig({
  testDir: 'e2e-live',
  workers: 1,
  forbidOnly: true,
  timeout: 60_000,
  expect: { timeout: 15_000 },
  reporter: [['list']],
  use: { baseURL: 'https://sprout.logstocks.com', trace: 'retain-on-failure' },
  projects: [
    { name: 'ipad-webkit', use: { browserName: 'webkit', hasTouch: true, viewport: { width: 1024, height: 768 } } },
    { name: 'laptop-chromium', use: { browserName: 'chromium', viewport: { width: 1280, height: 800 } } },
  ],
});
