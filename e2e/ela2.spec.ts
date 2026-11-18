import { expect, signUp, test } from './support/fixtures';
import { addChild } from './support/kid';
import { sweepHardestLevels } from './support/sweep';
import { groupNames, skillCount } from './support/catalogue';

// Language Arts grade 2 (plan section 15, phase F).
const SKILLS: [string, string][] = [
  ['E-2-A1', 'More vowel teams'],
  ['E-2-A2', 'Bossy r: ar, or, er, ir, ur'],
  ['E-2-A3', 'Two-syllable words'],
  ['E-2-B1', 'Prefixes un and re'],
  ['E-2-B2', 'Suffixes ful, less, er, est'],
  ['E-2-B3', 'Contractions'],
  ['E-2-B4', 'Synonyms and antonyms'],
  ['E-2-B5', 'Homophones'],
  ['E-2-C1', 'Nouns, verbs, adjectives'],
  ['E-2-C2', 'Plurals'],
  ['E-2-C3', 'Past tense'],
  ['E-2-C4', 'Punctuation'],
  ['E-2-D1', 'Read a story'],
  ['E-2-D2', 'Main idea'],
  ['E-2-D3', 'Order of events'],
];

test.describe('Language Arts grade 2', () => {
  test('every skill fits the screen at its hardest level, with every control big enough to tap', async ({ page }) => {
    test.setTimeout(600_000);
    await sweepHardestLevels(page, 'Grade 2', SKILLS, 'ela2', 'Language Arts');
  });

  test('the Language Arts page opens on Grade 2 with its four groups', async ({ page }) => {
    await signUp(page);
    await addChild(page, 'Robin', 'Grade 2');
    await page.getByRole('button', { name: 'Robin', exact: true }).click();
    await page.getByRole('button', { name: /^Language Arts$/ }).click();
    await expect(page.getByRole('tab', { name: 'Grade 2' })).toHaveAttribute('aria-selected', 'true');
    await expect(page.locator('[data-skill]')).toHaveCount(skillCount('ela', '2'));
    await expect(page.getByRole('heading', { level: 2 })).toHaveText(groupNames('ela', '2'));
  });
});
