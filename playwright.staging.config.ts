import { defineConfig } from '@playwright/test';

// Checks against the test copy of the app (sprout-staging), which has its own database and the real voice.
// It signs up a made-up account each run; the sign-in code is read from the Worker's log, which
// `wrangler tail` must be writing into .e2e/worker.log. Deploy first: npm run deploy:staging
// The shared helpers check addresses against this.
process.env.SPROUT_BASE_URL = 'https://sprout-staging.logstocks.com';

export default defineConfig({
  testDir: 'e2e-staging',
  workers: 1,
  forbidOnly: true,
  timeout: 240_000,
  expect: { timeout: 20_000 },
  reporter: [['list']],
  // The service worker is blocked, as in the main suite, so a page never reloads itself to take a new build mid-test.
  use: { baseURL: 'https://sprout-staging.logstocks.com', serviceWorkers: 'block', trace: 'retain-on-failure', screenshot: 'only-on-failure' },
  projects: [{ name: 'ipad-webkit', use: { browserName: 'webkit', hasTouch: true, deviceScaleFactor: 2, viewport: { width: 1024, height: 768 } } }],
});
