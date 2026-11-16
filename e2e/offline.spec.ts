import fs from 'node:fs';
import path from 'node:path';
import type { Page } from '@playwright/test';
import { expect, signUp, test } from './support/fixtures';
import { addChild, answerRight, freshName, holdHome, openSkill } from './support/kid';

const SW_FILE = path.join(process.cwd(), 'dist', 'sw.js');

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
    expect(source).toContain('index.html');
    expect(source).toMatch(/denylist:\[\/\^\\\/api/);
    expect(source).not.toMatch(/registerRoute\([^)]*api/);

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

  test('a newer build is fetched when the app comes back to the front, and applied on home, never mid-question', async ({ page }) => {
    const original = fs.readFileSync(SW_FILE, 'utf8');
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
      const waiting = (): Promise<boolean> => page.evaluate(async () => Boolean((await navigator.serviceWorker.getRegistration())?.waiting));
      const backToFront = (): Promise<void> => page.evaluate(() => void document.dispatchEvent(new Event('visibilitychange')));

      // A new build is published.
      fs.writeFileSync(SW_FILE, `${original}\n// build ${Date.now()}\n`);

      // Back to the front within the hour: the app does not ask the server.
      await backToFront();
      await page.waitForTimeout(1500);
      expect(await waiting()).toBe(false);

      // Over an hour later it asks, and fetches the new build in the background.
      await page.clock.fastForward('01:01:00');
      await backToFront();
      await expect.poll(waiting, { timeout: 20_000 }).toBe(true);

      // The child is in the middle of a session: nothing reloads, and practice carries on.
      await answerRight(page);
      await expect(page.locator('[data-answered]')).toHaveText('2');
      expect(await page.evaluate(() => (window as unknown as { samePage?: boolean }).samePage)).toBe(true);
      expect(await waiting()).toBe(true);

      // Back on home, the new build takes over and the page loads again, with the score kept.
      await holdHome(page);
      await expect(page.getByRole('button', { name, exact: true })).toBeVisible();
      expect(await page.evaluate(() => (window as unknown as { samePage?: boolean }).samePage)).toBeUndefined();
      await expect.poll(waiting).toBe(false);
      await page.getByRole('button', { name, exact: true }).click();
      await expect(page.getByRole('button', { name: 'Add to 10. Score 20' })).toBeVisible();
    } finally {
      fs.writeFileSync(SW_FILE, original);
    }
  });
});
