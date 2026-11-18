import { expect, signUp, test } from './support/fixtures';
import { addChild } from './support/kid';
import { sweepHardestLevels } from './support/sweep';

// Plan section 15 wave H2: 16 more Math pre-K skills and 19 more Math grade 2 skills.
const PREK: [string, string][] = [
  ['M-PK-A9', 'One more'],
  ['M-PK-A10', 'One fewer'],
  ['M-PK-A11', 'Same number'],
  ['M-PK-A12', 'Number order'],
  ['M-PK-A13', 'First and last'],
  ['M-PK-B3', 'More or less with numbers'],
  ['M-PK-B4', 'Most and fewest'],
  ['M-PK-C4', 'Heavy and light'],
  ['M-PK-C5', 'Shapes around us'],
  ['M-PK-C6', 'Same shape'],
  ['M-PK-C7', 'Colours around us'],
  ['M-PK-C8', 'Ball, box or can'],
  ['M-PK-C9', 'Order by size'],
  ['M-PK-D4', 'Fill the gap in a pattern'],
  ['M-PK-D5', 'The same pattern'],
  ['M-PK-D6', 'Sort by kind'],
];

const GRADE2: [string, string][] = [
  ['M-2-A7', 'Number names to 1,000'],
  ['M-2-A8', 'Order three-digit numbers'],
  ['M-2-A9', 'Regroup hundreds, tens and ones'],
  ['M-2-A10', 'Even numbers as doubles'],
  ['M-2-A11', 'Before, after and between'],
  ['M-2-A12', 'Show a number with blocks'],
  ['M-2-A13', 'Greatest and least from digits'],
  ['M-2-A14', 'Hundred chart puzzles'],
  ['M-2-B12', 'Subtract across zeros'],
  ['M-2-B13', 'Missing numbers to 100'],
  ['M-2-B14', 'Word problems: find the start or the change'],
  ['M-2-B15', 'Add by place value'],
  ['M-2-B16', 'Even and odd sums'],
  ['M-2-C8', 'A.M. and P.M.'],
  ['M-2-C9', 'Money word problems'],
  ['M-2-C10', 'Make an amount with coins'],
  ['M-2-C11', 'Picture graph problems'],
  ['M-2-C12', 'Centimeters and meters'],
  ['M-2-D4', 'Faces, edges and corners'],
];

test.describe('Math wave H2', () => {
  test('every new pre-K skill fits the screen at its hardest level, with every control big enough to tap', async ({ page }) => {
    test.setTimeout(480_000);
    await sweepHardestLevels(page, 'Pre-K', PREK, 'h2-prek');
  });

  test('every new grade 2 skill fits the screen at its hardest level, with every control big enough to tap', async ({ page }) => {
    test.setTimeout(600_000);
    await sweepHardestLevels(page, 'Grade 2', GRADE2, 'h2-math2');
  });

  test('the Math page shows the new pre-K skills in their groups', async ({ page }) => {
    await signUp(page);
    await addChild(page, 'Robin', 'Pre-K');
    await page.getByRole('button', { name: 'Robin', exact: true }).click();
    await page.getByRole('button', { name: /^Math$/ }).click();
    await expect(page.getByRole('tab', { name: 'Pre-K' })).toHaveAttribute('aria-selected', 'true');
    for (const [id] of PREK) await expect(page.locator(`[data-skill="${id}"]`)).toHaveCount(1);
  });
});
