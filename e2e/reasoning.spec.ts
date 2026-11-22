import type { Page } from '@playwright/test';
import { GROUP_WORDS } from '../src/content/data/categories';
import { RIDDLES } from '../src/content/data/riddles';
import { expect, signUp, test } from './support/fixtures';
import { addChild, answer, holdHome, shoot } from './support/kid';
import { checkScreen } from './support/layout';
import { openFromSubject, sweepHardestLevels } from './support/sweep';
import { skillCount } from './support/catalogue';

// The 14 Reasoning skills, added in Phase 6e. They belong to every grade.
const SKILLS: [string, string][] = [
  ['R-A1', 'Odd one out'],
  ['R-A2', 'Which belongs'],
  ['R-A3', 'Figure analogies'],
  ['R-A4', 'Figure matrices'],
  ['R-A5', 'Turning shapes'],
  ['R-A6', 'Mirror images'],
  ['R-A7', 'Two-rule patterns'],
  ['R-A8', 'Number analogies'],
  ['R-A9', 'Picture analogies'],
  ['R-A10', 'Number series'],
  ['R-A11', 'Number puzzles'],
  ['R-A12', 'Paper folding'],
  ['R-A13', 'Pattern completion'],
  ['R-A14', 'Picture riddles'],
];

const R = 'Reasoning';
const score = (page: Page) => page.locator('[data-score]');
const question = (page: Page) => page.getByRole('region', { name: 'Question' });
const optionLabels = (page: Page): Promise<string[]> => page.locator('[data-option]').evaluateAll((els) => els.map((el) => el.getAttribute('aria-label') ?? ''));
const pictureLabel = async (page: Page, kind: string): Promise<string> => (await page.locator(`[aria-label="Question"] [data-visual="${kind}"]`).first().getAttribute('aria-label')) ?? '';

async function start(page: Page, grade = 'Kindergarten'): Promise<void> {
  await signUp(page);
  await addChild(page, 'Robin', grade);
  await page.getByRole('button', { name: 'Robin', exact: true }).click();
}

test.describe('Reasoning', () => {
  test('every skill fits the screen at its hardest level, with every control big enough to tap', async ({ page }) => {
    test.setTimeout(300_000);
    await sweepHardestLevels(page, 'Kindergarten', SKILLS, 'reasoning', R);
  });

  test('every skill fits the screen at its first level too, where a child starts', async ({ page }) => {
    test.setTimeout(300_000);
    await start(page, 'Pre-K');
    for (const [id, name] of SKILLS) {
      await openFromSubject(page, R, name);
      await checkScreen(page, `${id} at level 1`, 64);
      await holdHome(page);
    }
  });

  test('Reasoning is one page for every grade, with no grade tabs', async ({ page }) => {
    await start(page, 'Pre-K');
    await page.getByRole('button', { name: /^Reasoning$/ }).click();
    await expect(page.getByRole('heading', { name: /Reasoning/ })).toBeVisible();
    await expect(page.getByRole('tab')).toHaveCount(0);
    await expect(page.getByRole('heading', { level: 2 })).toHaveText(['A. Thinking puzzles']);
    // A pre-K child is not offered the two word puzzles (the owner's choice, Nov 22, 2026).
    await expect(page.locator('[data-skill]')).toHaveCount(skillCount('reasoning', 'all', 'PK'));
    await checkScreen(page, 'Reasoning page', 64);
    await shoot(page, 'reasoning-subject');
  });

  test('number questions are answered from the scale and from the row of numbers', async ({ page }) => {
    await start(page);
    await openFromSubject(page, R, 'Number puzzles');
    const scale = await pictureLabel(page, 'scale');
    const [left, right] = (scale.match(/\d+/g) ?? []).map(Number);
    expect(scale).toContain('□');
    await answer(page, (right ?? 0) - (left ?? 0));
    await expect(score(page)).toHaveAttribute('data-score', '10');
    await holdHome(page);

    await openFromSubject(page, R, 'Number series');
    const shown = ((await pictureLabel(page, 'sequence')).match(/\d+/g) ?? []).map(Number);
    expect(shown).toHaveLength(4);
    await answer(page, (shown[3] ?? 0) + ((shown[1] ?? 0) - (shown[0] ?? 0)));
    await expect(score(page)).toHaveAttribute('data-score', '10');
  });

  test('picture questions say what each picture is, and the right one scores', async ({ page }) => {
    test.setTimeout(120_000);
    await start(page);
    await openFromSubject(page, R, 'Picture riddles');
    const text = (await question(page).textContent()) ?? '';
    const riddle = RIDDLES.find((candidate) => text.includes(candidate.riddle));
    expect(riddle, text).toBeDefined();
    let labels = await optionLabels(page);
    expect(labels).toHaveLength(2);
    await answer(page, labels.indexOf(riddle?.word ?? ''), 'index');
    await expect(score(page)).toHaveAttribute('data-score', '10');
    await holdHome(page);

    await openFromSubject(page, R, 'Odd one out');
    labels = await optionLabels(page);
    const groups = labels.map((label) => GROUP_WORDS.find((entry) => entry.word === label)?.group);
    for (const group of groups) expect(group).toBeDefined();
    const odd = groups.findIndex((group) => groups.filter((other) => other === group).length === 1);
    await answer(page, odd, 'index');
    await expect(score(page)).toHaveAttribute('data-score', '10');
  });

  test('paper folding: the unfolded paper with a hole on each side of the fold is right', async ({ page }) => {
    await start(page);
    await openFromSubject(page, R, 'Paper folding');
    const folded = await pictureLabel(page, 'foldPunch');
    const vertical = folded.includes('vertical');
    const [col, row] = (/\((\d),(\d)\)/.exec(folded) ?? []).slice(1).map(Number);
    const copy = vertical ? `(${3 - (col ?? 0)},${row})` : `(${col},${3 - (row ?? 0)})`;
    const labels = await optionLabels(page);
    expect(labels).toHaveLength(3);
    const right = labels.findIndex((label) => label.includes(`(${col},${row})`) && label.includes(copy));
    expect(right).toBeGreaterThanOrEqual(0);
    await shoot(page, 'reasoning-folding');
    await answer(page, right, 'index');
    await expect(score(page)).toHaveAttribute('data-score', '10');
  });

  test('a wrong mirror answer shows both pictures side by side in the explanation', async ({ page }) => {
    await start(page);
    await openFromSubject(page, R, 'Mirror images');
    const labels = await optionLabels(page);
    // The mirror picture is the only flipped one. Tap one that is not.
    await answer(page, labels.findIndex((label) => !label.includes('flipped')), 'index');
    await expect(page.getByText('A mirror flips left and right.')).toBeVisible();
    await checkScreen(page, 'Mirror images explanation', 64);
    await shoot(page, 'reasoning-mirror-explained');
  });
});
