import { expect, signUp, test } from './support/fixtures';
import { addChild } from './support/kid';
import { openFromMath, sweepHardestLevels } from './support/sweep';

// Math grade 3: numbers to 10,000, adding and subtracting, multiplication, division, fractions, measurement and shapes.
const SKILLS: [string, string][] = [
  ['M-3-A1', 'Thousands, hundreds, tens, ones'],
  ['M-3-A2', 'Number names to 10,000'],
  ['M-3-A3', 'Compare four-digit numbers'],
  ['M-3-A4', 'Round to 10 and 100'],
  ['M-3-A5', 'Number patterns'],
  ['M-3-B1', 'Add within 1,000, regrouping'],
  ['M-3-B2', 'Subtract within 1,000, regrouping'],
  ['M-3-B3', 'Estimate sums and differences'],
  ['M-3-B4', 'Two-step word problems'],
  ['M-3-C1', 'Equal groups'],
  ['M-3-C2', 'Arrays'],
  ['M-3-C3', 'Multiply by 2, 5 and 10'],
  ['M-3-C4', 'Multiply by 3 and 4'],
  ['M-3-C5', 'Multiply by 6, 7, 8 and 9'],
  ['M-3-C6', 'Missing factor'],
  ['M-3-C7', 'Times multiples of 10'],
  ['M-3-D1', 'Share equally'],
  ['M-3-D2', 'Division facts'],
  ['M-3-D3', 'Fact families'],
  ['M-3-E1', 'Name fractions'],
  ['M-3-E2', 'Fractions on a number line'],
  ['M-3-E3', 'Compare fractions'],
  ['M-3-E4', 'Equal fractions'],
  ['M-3-F1', 'Time to the minute'],
  ['M-3-F2', 'Elapsed time'],
  ['M-3-F3', 'Area'],
  ['M-3-F4', 'Perimeter'],
  ['M-3-F5', 'Mass and volume'],
  ['M-3-F6', 'Scaled graphs'],
  ['M-3-F7', 'Line plots'],
  ['M-3-G1', 'Quadrilaterals'],
  ['M-3-G2', 'Equal-area parts'],
];

test.describe('Math grade 3', () => {
  test('every skill fits the screen at its hardest level, with every control big enough to tap', async ({ page }) => {
    test.setTimeout(900_000);
    await sweepHardestLevels(page, 'Grade 3', SKILLS, 'math3');
  });

  test('every skill fits the screen at its first level too, thousand blocks included', async ({ page }) => {
    test.setTimeout(900_000);
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
    await expect(page.locator('[data-skill]')).toHaveCount(32);
    await expect(page.getByRole('heading', { level: 2 })).toHaveText(['A. Numbers to 10,000', 'B. Adding and subtracting', 'C. Multiplication', 'D. Division', 'E. Fractions', 'F. Measurement and data', 'G. Shapes']);
  });
});
