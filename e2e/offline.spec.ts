import fs from 'node:fs';
import path from 'node:path';
import type { Page } from '@playwright/test';
import { expect, signUp, test } from './support/fixtures';
import { addChild, answerRight, freshName, holdHome, openSkill } from './support/kid';

const BUILD_FILE = path.join(process.cwd(), 'dist', 'build.json');
const PAGE_FILE = path.join(process.cwd(), 'dist', 'index.html');

// Waits until the service worker has every file and is in charge of the page.
async function workerInControl(page: Page): Promise<void> {
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    if (!navigator.serviceWorker.controller) await new Promise((resolve) => navigator.serviceWorker.addEventListener('controllerchange', resolve, { once: true }));
  });
}

test.describe('offline and updates', () => {
  // Playwright's request interception stops a new service worker from taking over in Chromium,
  // so these tests use the real backup address, and a child's name no other run has used.
  test.use({ realBackup: true });
  test('the build has a service worker that is never cached and never touches /api', async ({ page, request }) => {
    const reply = await request.get('/sw.js');
    expect(reply.status()).toBe(200);
    expect(reply.headers()['content-type']).toContain('javascript');
    expect(reply.headers()['cache-control']).toContain('no-cache');
    const source = await reply.text();
    // Pages: the server first, the kept copy of index.html only when the server cannot answer.
    expect(source).toContain('NetworkFirst');
    expect(source).toContain('sprout-pages');
    expect(source).toContain('index.html');
    expect(source).toContain('navigate');
    expect(source).toContain('api');
    expect(source).toContain('skipWaiting');
    // The current build's id is never kept, by the service worker or the browser.
    expect(source).not.toContain('build.json');
    const build = await request.get('/build.json');
    expect(build.status()).toBe(200);
    expect(build.headers()['cache-control']).toContain('no-store');
    expect(typeof ((await build.json()) as { id?: unknown }).id).toBe('string');

    // In the browser: files come from the service worker, /api answers come from the network.
    await signUp(page);
    await workerInControl(page);
    const seen: { url: string; fromWorker: boolean }[] = [];
    page.on('response', (response) => seen.push({ url: new URL(response.url()).pathname, fromWorker: response.fromServiceWorker() }));
    await page.reload();
    await expect(page.getByRole('button', { name: 'Add a child' })).toBeVisible();
    await expect.poll(() => seen.some((r) => r.url.startsWith('/api/'))).toBe(true);
    expect(seen.filter((r) => r.url.startsWith('/api/')).every((r) => !r.fromWorker)).toBe(true);
    expect(seen.filter((r) => r.url.startsWith('/assets/')).length).toBeGreaterThan(0);
    expect(seen.filter((r) => r.url.startsWith('/assets/') || r.url === '/').every((r) => r.fromWorker)).toBe(true);
  });

  test('with no network the app still opens, and a child can practise and keep their score', async ({ page, context }) => {
    const name = freshName();
    await signUp(page);
    await addChild(page, name, 'Kindergarten');
    await workerInControl(page);

    await context.setOffline(true);
    await page.reload();
    // Still signed in, with no server to ask.
    await expect(page.getByRole('button', { name, exact: true })).toBeVisible();
    expect(await page.evaluate(() => fetch('/api/auth/session').then(() => 'answered', () => 'no network'))).toBe('no network');
    await openSkill(page, name, 'Add to 10');
    await answerRight(page);
    await answerRight(page);
    await expect(page.locator('[data-score]')).toHaveAttribute('data-score', '20');

    // A deep address works offline too, and the score is still there after another reload.
    await page.goto('/home');
    await page.getByRole('button', { name, exact: true }).click();
    await expect(page.getByRole('img', { name: '2 of 15 questions today' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Add to 10. Score 20' })).toBeVisible();

    await context.setOffline(false);
    await page.reload();
    await expect(page.getByRole('button', { name, exact: true })).toBeVisible();
  });

  test('opening the app loads the page from the server, not the copy kept on the device', async ({ page }) => {
    const original = fs.readFileSync(PAGE_FILE, 'utf8');
    try {
      await signUp(page);
      await workerInControl(page);
      // A new page is published on the server. The device still holds the old one.
      fs.writeFileSync(PAGE_FILE, original.replace('<head>', '<head><meta name="sprout-test" content="newest">'));
      await page.reload();
      await expect(page.locator('meta[name="sprout-test"]')).toHaveAttribute('content', 'newest');
    } finally {
      fs.writeFileSync(PAGE_FILE, original);
    }
  });

  test('a newer build found when the app comes back to the front loads on home by itself, never mid-question', async ({ page }) => {
    const original = fs.readFileSync(BUILD_FILE, 'utf8');
    try {
      await page.clock.install();
      const name = freshName();
      await signUp(page);
      await addChild(page, name, 'Kindergarten');
      await workerInControl(page);
      await openSkill(page, name, 'Add to 10');
      await answerRight(page);
      await page.evaluate(() => {
        (window as unknown as { samePage?: boolean }).samePage = true;
      });
      const samePage = (): Promise<boolean | undefined> => page.evaluate(() => (window as unknown as { samePage?: boolean }).samePage);
      const backToFront = (): Promise<void> => page.evaluate(() => void document.dispatchEvent(new Event('visibilitychange')));
      // Requests answered through the service worker are missing from the page's resource timings, so watch them here.
      let checks = 0;
      page.on('request', (request) => {
        if (new URL(request.url()).pathname === '/build.json') checks += 1;
      });
      const asked = (): boolean => checks > 0;

      // A new build is published.
      fs.writeFileSync(BUILD_FILE, JSON.stringify({ id: `newer-${Date.now()}` }));

      // A minute later the app comes back to the front and asks the server.
      await page.clock.fastForward('01:01');
      await backToFront();
      await expect.poll(asked, { timeout: 20_000 }).toBe(true);

      // The child is in the middle of a session: nothing reloads, and practice carries on.
      await page.waitForTimeout(1500);
      await answerRight(page);
      await expect(page.locator('[data-answered]')).toHaveText('2');
      expect(await samePage()).toBe(true);

      // Back on home, the page loads again by itself, from the server, with the score kept. No button.
      await holdHome(page);
      await expect.poll(samePage, { timeout: 20_000 }).toBeUndefined();
      await expect(page.getByRole('button', { name: /Update now/ })).toHaveCount(0);
      // This test publishes only a new id, so the page that loaded is still the old build. It does not load again and again.
      await page.evaluate(() => {
        (window as unknown as { samePage?: boolean }).samePage = true;
      });
      await page.waitForTimeout(3000);
      expect(await samePage()).toBe(true);
      await page.getByRole('button', { name, exact: true }).click();
      await expect(page.getByRole('button', { name: 'Add to 10. Score 20' })).toBeVisible();
    } finally {
      fs.writeFileSync(BUILD_FILE, original);
    }
  });
});
