import { expect, signUp, test } from './support/fixtures';
import { addChild } from './support/kid';
import { openFromMath, sweepHardestLevels } from './support/sweep';

// Math grade 3, step 1: numbers to 10,000, adding and subtracting.
const SKILLS: [string, string][] = [
  ['M-3-A1', 'Thousands, hundreds, tens, ones'],
  ['M-3-A2', 'Number names to 10,000'],
  ['M-3-A3', 'Compare four-digit numbers'],
  ['M-3-A4', 'Round to 10 and 100'],
  ['M-3-B1', 'Add within 1,000, regrouping'],
  ['M-3-B2', 'Subtract within 1,000, regrouping'],
  ['M-3-B3', 'Estimate sums and differences'],
  ['M-3-B4', 'Two-step word problems'],
];

test.describe('Math grade 3', () => {
  test('every skill fits the screen at its hardest level, with every control big enough to tap', async ({ page }) => {
    test.setTimeout(480_000);
    await sweepHardestLevels(page, 'Grade 3', SKILLS, 'math3');
  });

  test('every skill fits the screen at its first level too, thousand blocks included', async ({ page }) => {
    test.setTimeout(480_000);
    await signUp(page);
    await addChild(page, 'Robin', 'Grade 3');
    await page.getByRole('button', { name: 'Robin', exact: true }).click();
    for (const [, name] of SKILLS) {
      await openFromMath(page, name);
      const cut = await page.evaluate(() =>
        [...document.querySelectorAll('[aria-label="Question"] [data-visual]')].filter((el) => el.scrollWidth > el.clientWidth + 1 || el.getBoundingClientRect().right > window.innerWidth + 0.5).map((el) => el.getAttribute('aria-label') ?? ''),
      );
      expect(cut, `${name}: a picture is cut off`).toEqual([]);
      await page.getByRole('button', { name: /^Back to home\. Press and hold/ }).dispatchEvent('pointerdown');
      await expect(page.getByRole('group', { name: "Today's picks" })).toBeVisible({ timeout: 8000 });
    }
  });

  test('a grade 3 child can be added, and the Math page opens on Grade 3', async ({ page }) => {
    await signUp(page);
    await addChild(page, 'Robin', 'Grade 3');
    await page.getByRole('button', { name: 'Robin', exact: true }).click();
    await page.getByRole('button', { name: /Math/ }).click();
    await expect(page.getByRole('tab', { name: 'Grade 3' })).toHaveAttribute('aria-selected', 'true');
    await expect(page.locator('[data-skill]')).toHaveCount(8);
    await expect(page.getByRole('heading', { level: 2 })).toHaveText(['A. Numbers to 10,000', 'B. Adding and subtracting']);
  });
});
