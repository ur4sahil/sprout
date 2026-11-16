import { expect, signUp, test } from './support/fixtures';
import { addChild, answer } from './support/kid';
import { openFromMath, sweepHardestLevels } from './support/sweep';

// Math grade 1, part 1 (Phase 11a): categories A, C, D and E.
const SKILLS: [string, string][] = [
  ['M-1-A1', 'Count to 120'],
  ['M-1-A2', 'Skip count by 2s, 5s, 10s'],
  ['M-1-A3', 'Tens and ones'],
  ['M-1-A4', 'Compare two-digit numbers'],
  ['M-1-A5', 'Ten more, ten less'],
  ['M-1-C1', 'Tell time: hour and half hour'],
  ['M-1-C2', 'Order by length'],
  ['M-1-C3', 'Picture graphs'],
  ['M-1-C4', 'Coins'],
  ['M-1-D1', 'Halves and fourths'],
  ['M-1-D2', 'Shape attributes'],
  ['M-1-E1', 'Number patterns'],
];

test.describe('Math grade 1, part 1', () => {
  test('every skill fits the screen at its hardest level, with every control big enough to tap', async ({ page }) => {
    test.setTimeout(300_000);
    await sweepHardestLevels(page, 'Grade 1', SKILLS, 'math1');
  });

  test('the Math page opens on Grade 1 for a grade 1 child, with its four groups', async ({ page }) => {
    await signUp(page);
    await addChild(page, 'Robin', 'Grade 1');
    await page.getByRole('button', { name: 'Robin', exact: true }).click();
    await page.getByRole('button', { name: /Math/ }).click();
    await expect(page.getByRole('tab', { name: 'Grade 1' })).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByRole('heading', { level: 2 })).toHaveText(['A. Numbers to 120', 'C. Time, measuring and money', 'D. Shapes and parts', 'E. Patterns']);
    await expect(page.locator('[data-skill]')).toHaveCount(12);
  });

  test('blocks are read as tens and ones, and a clock is read by touch', async ({ page }) => {
    await signUp(page);
    await addChild(page, 'Robin', 'Grade 1');
    await page.getByRole('button', { name: 'Robin', exact: true }).click();
    await openFromMath(page, 'Tens and ones');
    const blocks = (await page.locator('[aria-label="Question"] [data-visual="baseTen"]').getAttribute('aria-label')) ?? '';
    const tens = Number(/(\d+) tens?/.exec(blocks)?.[1] ?? 0);
    const ones = Number(/(\d+) ones?/.exec(blocks)?.[1] ?? 0);
    // The picture has that many long blocks and small blocks.
    await expect(page.locator('[aria-label="Question"] [data-block="ten"]')).toHaveCount(tens);
    await expect(page.locator('[aria-label="Question"] [data-block="one"]')).toHaveCount(ones);
    await answer(page, tens * 10 + ones);
    await expect(page.locator('[data-score]')).not.toHaveAttribute('data-score', '0');
  });
});
