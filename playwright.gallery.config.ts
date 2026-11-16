import { defineConfig } from '@playwright/test';

// The picture gallery, drawn by the development server in WebKit. Run: npm run e2e:gallery
// It saves review/gallery.png for a person to look at.
const PORT = 5197;

export default defineConfig({
  testDir: 'e2e-gallery',
  workers: 1,
  forbidOnly: true,
  timeout: 90_000,
  expect: { timeout: 15_000 },
  reporter: [['list']],
  webServer: { command: `npx vite --port ${PORT} --strictPort`, url: `http://localhost:${PORT}/`, reuseExistingServer: false, timeout: 60_000 },
  use: { baseURL: `http://localhost:${PORT}`, browserName: 'webkit', deviceScaleFactor: 2 },
  projects: [
    { name: 'ipad', use: { viewport: { width: 1024, height: 768 }, hasTouch: true } },
    { name: 'phone', use: { viewport: { width: 390, height: 844 }, hasTouch: true } },
  ],
});
