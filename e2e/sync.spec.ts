import type { Response } from '@playwright/test';
import { PASSWORD, expect, fillSignIn, isSilent, quiet, signUp, test } from './support/fixtures';
import { addChild, answerRight, openSkill } from './support/kid';

// The server holds the main copy of the family's records. Two signed-in devices stay the same.
test.describe('two iPads, one family', () => {
  test('a child and their progress on one iPad appear on a second one, and progress flows both ways', async ({ page, browser }) => {
    test.skip(!['ipad-landscape', 'laptop-chromium'].includes(test.info().project.name), 'this does not depend on the screen size');
    test.setTimeout(120_000);
    const isSave = (reply: Response): boolean => reply.url().endsWith('/api/data') && reply.request().method() === 'POST';

    // The first iPad: sign up, add a child, practise. Each change is sent as it happens.
    const email = await signUp(page);
    await addChild(page, 'Robin', 'Kindergarten');
    await openSkill(page, 'Robin', 'Add to 10');
    const sent = page.waitForResponse(isSave);
    await answerRight(page);
    expect((await sent).status()).toBe(200);
    const sentAgain = page.waitForResponse(isSave);
    await answerRight(page);
    expect((await sentAgain).status()).toBe(200);

    // A second iPad: its own storage, the same family account.
    const second = await browser.newContext({ ...test.info().project.use, baseURL: test.info().project.use.baseURL });
    try {
      await quiet(second);
      const other = await second.newPage();
      await other.goto('/');
      await fillSignIn(other, email, PASSWORD);
      await other.getByRole('button', { name: 'Sign in' }).click();
      // The family's child is there when the picker opens, with the score from the first iPad.
      await other.getByRole('button', { name: 'Robin', exact: true }).click();
      expect(await isSilent(other)).toBe(true);
      // Today's plan there counts the two answers from the first iPad (Add to 10, started today, is the new skill).
      await expect(other.getByRole('button', { name: /\. Add to 10 · 2 of \d+/ })).toBeVisible();

      // Practice on the second iPad goes back to the first.
      await other.getByRole('button', { name: /\. Add to 10 · / }).click();
      await expect(other.locator('[data-phase="asking"]')).toBeVisible();
      const back = other.waitForResponse(isSave);
      await answerRight(other);
      expect((await back).status()).toBe(200);

      // The first iPad is opened again: it fetches, and shows all three answers.
      await page.reload();
      await page.getByRole('button', { name: 'Robin', exact: true }).click();
      await expect(page.getByRole('button', { name: /^Your garden\. Open it\. 3 of \d+ questions today\.$/ })).toBeVisible();
      await expect(page.getByRole('button', { name: /\. Add to 10 · 3 of \d+/ })).toBeVisible();
    } finally {
      await second.close();
    }
  });

  test('the records address refuses anyone who is not signed in', async ({ request }) => {
    expect((await request.get('/api/data')).status()).toBe(401);
    expect((await request.post('/api/data', { data: { puts: [] } })).status()).toBe(401);
  });
});
