import { expect, signUp, test } from './support/fixtures';
import { addChild, answerAnything } from './support/kid';
import { checkScreen } from './support/layout';
import { saveScores } from './support/sweep';

// The Mixed bag (plan section 17): questions from topics in progress, mixed so the topic changes every time.
test('the Mixed bag switches topic with every question, by touch, and fits the screen', async ({ page }) => {
  test.setTimeout(180_000);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await signUp(page);
  await addChild(page, 'Robin', 'Kindergarten');
  // Two kindergarten skills in progress, from two topics: adding and comparing.
  await saveScores(page, ['M-K-C1', 'M-K-B1'], 40);
  await page.getByRole('button', { name: 'Robin', exact: true }).click();
  const stickers = page.locator('[data-card="new-stickers"]');
  await stickers.waitFor({ state: 'visible', timeout: 4000 }).catch(() => undefined);
  if (await stickers.isVisible()) await page.getByRole('button', { name: /Yay/ }).click();
  await expect(page.locator('[data-plan-part="mixed"]')).toBeVisible();
  await page.getByRole('button', { name: 'Mixed bag', exact: true }).click();
  const titles: string[] = [];
  for (let i = 0; i < 4; i += 1) {
    await expect(page.getByRole('region', { name: 'Question' })).toBeVisible();
    if (i === 0) await checkScreen(page, 'mixed bag', 64);
    titles.push((await page.locator('h1').textContent()) ?? '');
    await answerAnything(page);
  }
  for (let i = 1; i < titles.length; i += 1) expect(titles[i]).not.toBe(titles[i - 1]);
  await expect(page.locator('[data-mixed-count]')).toHaveText(/^4 of 10$/);
});
