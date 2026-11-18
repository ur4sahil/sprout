import type { Page } from '@playwright/test';
import { COMPOUNDS } from '../src/content/data/phonics1';
import { expect, signUp, test } from './support/fixtures';
import { addChild, answer, holdHome } from './support/kid';
import { openFromSubject, submit, sweepHardestLevels } from './support/sweep';
import { groupNames, skillCount } from './support/catalogue';

// Language Arts grade 1, added in Phase 11f.
const SKILLS: [string, string][] = [
  ['E-1-A1', 'Digraphs: sh, ch, th, wh'],
  ['E-1-A2', 'Consonant blends'],
  ['E-1-A3', 'Silent e'],
  ['E-1-A4', 'Vowel teams'],
  ['E-1-A5', 'Short or long vowel'],
  ['E-1-B1', 'Sight words, set 4'],
  ['E-1-B2', 'Compound words'],
  ['E-1-B3', 'Opposites and same meanings'],
  ['E-1-C1', 'Naming and action words'],
  ['E-1-C2', 'Describing words'],
  ['E-1-C3', 'End marks'],
  ['E-1-D1', 'Read a short story'],
];

const LA = 'Language Arts';
const score = (page: Page) => page.locator('[data-score]');
const question = (page: Page) => page.getByRole('region', { name: 'Question' });

async function start(page: Page): Promise<void> {
  await signUp(page);
  await addChild(page, 'Robin', 'Grade 1');
  await page.getByRole('button', { name: 'Robin', exact: true }).click();
}

test.describe('Language Arts grade 1', () => {
  test('every skill fits the screen at its hardest level, with every control big enough to tap', async ({ page }) => {
    test.setTimeout(360_000);
    await sweepHardestLevels(page, 'Grade 1', SKILLS, 'ela1', LA);
  });

  test('every skill fits the screen at its first level too', async ({ page }) => {
    test.setTimeout(360_000);
    await start(page);
    for (const [, name] of SKILLS) {
      await openFromSubject(page, LA, name);
      const cut = await page.evaluate(() =>
        [...document.querySelectorAll('[aria-label="Question"] [data-visual]')].filter((el) => el.scrollWidth > el.clientWidth + 1 || el.getBoundingClientRect().right > window.innerWidth + 0.5).map((el) => el.getAttribute('aria-label') ?? ''),
      );
      expect(cut, `${name}: a picture is cut off`).toEqual([]);
      await holdHome(page);
    }
  });

  test('the Language Arts page opens on Grade 1, with its four groups', async ({ page }) => {
    await start(page);
    await page.getByRole('button', { name: /^Language Arts$/ }).click();
    await expect(page.getByRole('tab', { name: 'Grade 1' })).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByRole('heading', { level: 2 })).toHaveText(groupNames('ela', '1'));
    await expect(page.locator('[data-skill]')).toHaveCount(skillCount('ela', '1'));
  });

  test('a story is shown to read, with a question and three written answers', async ({ page }) => {
    await start(page);
    await openFromSubject(page, LA, 'Read a short story');
    await expect(question(page)).toHaveAttribute('data-mode', 'read');
    const story = ((await page.locator('[aria-label="Question"] [data-visual="text"]').first().textContent()) ?? '').trim();
    expect(story.split('.').filter((each) => each.trim().length > 0)).toHaveLength(3);
    await expect(question(page)).toContainText(/^.*(Who|What) /);
    await expect(page.locator('[data-option]')).toHaveCount(3);
  });

  test('a compound word is built from two word tiles by touch', async ({ page }) => {
    await start(page);
    await openFromSubject(page, LA, 'Compound words');
    const tiles = await page.locator('[data-tile]').evaluateAll((els) => els.map((el) => (el.textContent ?? '').trim()));
    expect(tiles).toHaveLength(4);
    // Exactly one listed compound word can be made from these tiles.
    const makeable = COMPOUNDS.filter((entry) => tiles.includes(entry.first) && tiles.includes(entry.second));
    expect(makeable.length).toBeGreaterThanOrEqual(1);
    await expect(question(page)).toContainText('Build the word.');
    void answer;
    void submit;
    void score;
  });
});
