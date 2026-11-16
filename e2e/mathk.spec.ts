import { expect, signUp, test } from './support/fixtures';
import { addChild, answerRight, holdHome } from './support/kid';
import { openFromMath, submit, sweepHardestLevels } from './support/sweep';

// The kindergarten skills added in Phase 6b. (B.3 and C.4 are older and covered by practice.spec.ts.)
const SKILLS: [string, string][] = [
  ['M-K-A1', 'Count to 20'],
  ['M-K-A2', 'Ten frames to 10'],
  ['M-K-A3', 'Ten frames to 20'],
  ['M-K-A4', 'What comes next'],
  ['M-K-A5', 'Before and after'],
  ['M-K-A6', 'Missing number'],
  ['M-K-A7', 'Count by tens'],
  ['M-K-B1', 'More, fewer or equal'],
  ['M-K-B2', 'Compare numbers'],
  ['M-K-E1', 'Name flat shapes'],
  ['M-K-E2', 'Name solid shapes'],
  ['M-K-E3', 'Sides and corners'],
  ['M-K-F1', 'Compare length and height'],
  ['M-K-F2', 'Sort and count'],
  ['M-K-G1', 'Patterns: AAB, ABB, ABC'],
];

test.describe('Math kindergarten, part 1', () => {
  test('every skill fits the screen at its hardest level, with every control big enough to tap', async ({ page }) => {
    test.setTimeout(240_000);
    await sweepHardestLevels(page, 'Kindergarten', SKILLS, 'mathk');
  });

  test('a ten frame is read and answered by touch, and a typed answer scores', async ({ page }) => {
    await signUp(page);
    await addChild(page, 'Robin', 'Kindergarten');
    await page.getByRole('button', { name: 'Robin', exact: true }).click();
    await openFromMath(page, 'Ten frames to 10');
    const counters = Number(/with (\d+) counter/.exec((await page.locator('[data-visual="tenFrame"]').first().getAttribute('aria-label')) ?? '')?.[1]);
    await page.locator(`[data-option][aria-label="${counters}"]`).click();
    await submit(page);
    await expect(page.locator('[data-score]')).toHaveAttribute('data-score', '10');
    await holdHome(page);
    // Add to 10 is still reachable and still scores, with 15 more skills around it.
    await openFromMath(page, 'Add to 10');
    await answerRight(page);
    await expect(page.locator('[data-score]')).toHaveAttribute('data-score', '10');
  });

  test('a kindergarten child hears a shape name and must tap, then Submit: no one-tap answering above pre-K', async ({ page }) => {
    await signUp(page);
    await addChild(page, 'Robin', 'Kindergarten');
    await page.getByRole('button', { name: 'Robin', exact: true }).click();
    await openFromMath(page, 'Name flat shapes');
    const question = page.getByRole('region', { name: 'Question' });
    await expect(question).toHaveAttribute('data-mode', 'listen');
    await expect(question).toContainText('Find the shape.');
    await page.waitForTimeout(500);
    await page.locator('[data-option]').first().click();
    await page.waitForTimeout(600);
    await expect(page.locator('[data-answered]')).toHaveText('0');
    await submit(page);
    await expect(page.locator('[data-answered]')).toHaveText('1');
  });
});
