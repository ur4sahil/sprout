import type { Page } from '@playwright/test';
import { expect, signUp, test } from './support/fixtures';
import { addChild, answer, holdHome, shoot } from './support/kid';
import { checkScreen } from './support/layout';
import { openFromMath, saveScores, sweepHardestLevels } from './support/sweep';

// The kindergarten skills added in Phase 6c: adding, subtracting, stories and teen numbers.
const SKILLS: [string, string][] = [
  ['M-K-C1', 'Add with pictures to 5'],
  ['M-K-C2', 'Add to 5'],
  ['M-K-C3', 'Add with pictures to 10'],
  ['M-K-C5', 'Subtract with pictures to 5'],
  ['M-K-C6', 'Subtract to 5'],
  ['M-K-C7', 'Subtract to 10'],
  ['M-K-C8', 'Make 10'],
  ['M-K-C9', 'Break apart numbers'],
  ['M-K-C10', 'Addition stories'],
  ['M-K-C11', 'Subtraction stories'],
  ['M-K-D1', 'Teen numbers'],
];

const score = (page: Page) => page.locator('[data-score]');

// The numbers in the first picture of the question, read from its description.
async function pictureNumbers(page: Page, kind: string): Promise<number[]> {
  const labels = await page.locator(`[aria-label="Question"] [data-visual="${kind}"]`).evaluateAll((els) => els.map((el) => el.getAttribute('aria-label') ?? ''));
  return labels.flatMap((label) => (label.match(/\d+/g) ?? []).map(Number));
}

async function start(page: Page): Promise<void> {
  await signUp(page);
  await addChild(page, 'Robin', 'Kindergarten');
  await page.getByRole('button', { name: 'Robin', exact: true }).click();
}

test.describe('Math kindergarten, part 2', () => {
  test('every skill fits the screen at its hardest level, with every control big enough to tap', async ({ page }) => {
    test.setTimeout(240_000);
    await sweepHardestLevels(page, 'Kindergarten', SKILLS, 'mathk2');
  });

  test('the Math page lists adding and subtracting together, then tens and ones', async ({ page }) => {
    await start(page);
    await page.getByRole('button', { name: /Math/ }).click();
    await expect(page.getByRole('heading', { level: 2 })).toHaveText(['A. Counting', 'B. Comparing', 'C. Adding and subtracting', 'D. Tens and ones', 'E. Shapes', 'F. Measuring and sorting', 'G. Patterns']);
    await expect(page.locator('[data-skill]')).toHaveCount(28);
    await checkScreen(page, 'Math page with all 28 kindergarten skills', 64);
    await shoot(page, 'mathk2-subject');
  });

  test('two groups are added by touch, and crossed-out pictures are taken away', async ({ page }) => {
    await start(page);
    await openFromMath(page, 'Add with pictures to 5');
    const groups = await pictureNumbers(page, 'emojiGroup');
    expect(groups).toHaveLength(2);
    await answer(page, (groups[0] ?? 0) + (groups[1] ?? 0));
    await expect(score(page)).toHaveAttribute('data-score', '10');
    await holdHome(page);

    await openFromMath(page, 'Subtract with pictures to 5');
    await expect(page.getByRole('region', { name: 'Question' })).toContainText('How many are left?');
    const [had, gone] = await pictureNumbers(page, 'emojiGroup');
    // The crossed-out ones are drawn crossed out, one for each taken away.
    await expect(page.locator('[aria-label="Question"] [data-item="crossed"]')).toHaveCount(gone ?? -1);
    await answer(page, (had ?? 0) - (gone ?? 0));
    await expect(score(page)).toHaveAttribute('data-score', '10');
  });

  test('a story is shown in full with its picture, fits the screen, and its answer scores', async ({ page }) => {
    await start(page);
    for (const [name, sign] of [['Addition stories', 1], ['Subtraction stories', -1]] as [string, number][]) {
      await openFromMath(page, name);
      const question = page.getByRole('region', { name: 'Question' });
      await expect(question).toContainText(/How many .*(now|in all|left)\?/);
      await checkScreen(page, `${name} with its picture`, 64);
      await shoot(page, `mathk2-${name.split(' ')[0]?.toLowerCase()}-story`);
      const [a, b] = await pictureNumbers(page, 'emojiGroup');
      // The story itself holds the same two numbers as the picture.
      const text = (await question.textContent()) ?? '';
      expect(text).toContain(String(a));
      expect(text).toContain(String(b));
      await answer(page, (a ?? 0) + sign * (b ?? 0));
      await expect(score(page)).toHaveAttribute('data-score', '10');
      await holdHome(page);
    }
  });

  test('Make 10 is answered from the ten frame', async ({ page }) => {
    await start(page);
    await openFromMath(page, 'Make 10');
    const [filled] = await pictureNumbers(page, 'tenFrame');
    await answer(page, 10 - (filled ?? 0));
    await expect(score(page)).toHaveAttribute('data-score', '10');
  });

  test('at the hardest level, Make 10 and Subtract to 10 are typed, and a typed answer scores', async ({ page }) => {
    await signUp(page);
    await addChild(page, 'Robin', 'Kindergarten');
    await saveScores(page, ['M-K-C8', 'M-K-C7'], 85);
    await page.getByRole('button', { name: 'Robin', exact: true }).click();
    await openFromMath(page, 'Make 10');
    await expect(page.getByRole('region', { name: 'Question' })).toHaveAttribute('data-type', 'numberPad');
    const [a] = await pictureNumbers(page, 'equation');
    await answer(page, 10 - (a ?? 0));
    await expect(score(page)).not.toHaveAttribute('data-score', '85');
    expect(Number(await score(page).getAttribute('data-score'))).toBeGreaterThan(85);
    await holdHome(page);

    await openFromMath(page, 'Subtract to 10');
    await expect(page.getByRole('region', { name: 'Question' })).toHaveAttribute('data-type', 'numberPad');
    const [from, away] = await pictureNumbers(page, 'equation');
    await answer(page, (from ?? 0) - (away ?? 0));
    await expect(score(page)).not.toHaveAttribute('data-score', '85');
    expect(Number(await score(page).getAttribute('data-score'))).toBeGreaterThan(85);
  });

  test('a teen number is read from two ten frames', async ({ page }) => {
    await start(page);
    await openFromMath(page, 'Teen numbers');
    const [counters] = await pictureNumbers(page, 'tenFrame');
    expect(counters).toBeGreaterThan(10);
    await answer(page, counters ?? 0);
    await expect(score(page)).toHaveAttribute('data-score', '10');
  });
});
