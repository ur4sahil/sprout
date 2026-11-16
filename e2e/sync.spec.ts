import { PASSWORD, expect, fillSignIn, isSilent, quiet, signUp, test } from './support/fixtures';
import type { Response } from '@playwright/test';
import { addChild, answerRight, freshName, openSkill } from './support/kid';

test.describe('backup sync between two iPads', () => {
  test.use({ realBackup: true });

  test('progress made on one iPad appears on a second one after sign-in, and flows both ways', async ({ page, browser }) => {
    test.skip(!['ipad-landscape', 'laptop-chromium'].includes(test.info().project.name), 'sync does not depend on the screen size');
    test.setTimeout(120_000);

    // The first iPad: sign up, add a child, practise.
    // Every run of this test adds to the one test family's backup, so the child gets a name no other run used.
    const name = freshName();
    const isUpload = (reply: Response): boolean => reply.url().endsWith('/api/backup') && reply.request().method() === 'PUT';
    const isDownload = (reply: Response): boolean => reply.url().includes('/api/backup') && reply.request().method() === 'GET' && reply.headers()['content-type'] === 'application/gzip';
    const email = await signUp(page);
    await addChild(page, name, 'Kindergarten');
    await openSkill(page, name, 'Add to 10');
    await answerRight(page);
    await answerRight(page);
    // The app is closed and opened again: the launch sync backs the practice up.
    const uploaded = page.waitForResponse(isUpload);
    await page.reload();
    expect((await uploaded).status()).toBe(200);

    // A second iPad: its own storage, the same family account.
    const second = await browser.newContext({ ...test.info().project.use, baseURL: test.info().project.use.baseURL });
    try {
      await quiet(second);
      const other = await second.newPage();
      await other.goto('/');
      await fillSignIn(other, email, PASSWORD);
      await other.getByRole('button', { name: 'Sign in' }).click();
      // The family's progress is there when the picker opens.
      await other.getByRole('button', { name, exact: true }).click();
      expect(await isSilent(other)).toBe(true);
      await expect(other.getByRole('button', { name: 'Add to 10. Score 20' })).toBeVisible();

      // Practice on the second iPad goes back to the first.
      await other.getByRole('button', { name: /^Add to 10\./ }).click();
      await expect(other.locator('[data-phase="asking"]')).toBeVisible();
      await answerRight(other);
      const sent = other.waitForResponse(isUpload);
      await other.reload();
      expect((await sent).status()).toBe(200);

      const fetched = page.waitForResponse(isDownload);
      await page.reload();
      await fetched;
      await page.getByRole('button', { name, exact: true }).click();
      // Two answers here and one there: all three count, and the score is the one from the last practice.
      await expect(page.getByRole('img', { name: '3 of 15 questions today' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Add to 10. Score 31' })).toBeVisible();
    } finally {
      await second.close();
    }
  });

  test('the backup address refuses anyone who is not signed in', async ({ request }) => {
    expect((await request.get('/api/backup')).status()).toBe(401);
    const put = await request.put('/api/backup', { headers: { 'Content-Type': 'application/gzip', 'X-Backup-Base': 'none' }, data: Buffer.from([0x1f, 0x8b, 0x08]) });
    expect(put.status()).toBe(401);
  });
});
