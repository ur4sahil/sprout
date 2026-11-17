import { expect, signUp, test } from './support/fixtures';
import { addChild } from './support/kid';
import { checkScreen } from './support/layout';

// Fast facts (plan section 15.5): the set list and a race, at every screen size, with big enough keys.
test.describe('fast facts', () => {
  test('a grade 1 child opens Fast facts from home, sees the grids, and races: the car moves and the clock runs', async ({ page }) => {
    test.setTimeout(180_000);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await signUp(page);
    await addChild(page, 'Robin', 'Grade 1');
    await page.getByRole('button', { name: 'Robin', exact: true }).click();
    await page.getByRole('button', { name: 'Fast facts', exact: true }).click();
    await expect(page.getByRole('region', { name: 'Adding within 10' })).toBeVisible();
    await expect(page.locator('[data-fact-set="add10"] [data-fact]')).toHaveCount(66);
    await checkScreen(page, 'Fast facts', 64);
    await page.locator('[data-fact-set="add10"]').getByRole('button', { name: 'Race' }).click();
    await expect(page.locator('[data-phase="asking"]')).toBeVisible();
    await checkScreen(page, 'Race', 64);
    // Answer three facts right: the track counts them.
    for (let i = 1; i <= 3; i += 1) {
      await expect(page.locator('[data-phase="asking"]')).toBeVisible();
      const text = (await page.locator('[data-fact-text]').textContent()) ?? '';
      const [, a, op, b] = /^(\d+) ([+−]) (\d+)/.exec(text) ?? [];
      const answer = op === '+' ? Number(a) + Number(b) : Number(a) - Number(b);
      for (const digit of String(answer)) await page.getByRole('button', { name: digit, exact: true }).click();
      await expect(page.locator('[data-right]')).toHaveAttribute('data-right', String(i));
    }
    await expect(page.locator('[data-clock]')).toHaveText(/^\d:\d\d$/);
  });
});
