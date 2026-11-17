import { test } from './support/fixtures';
import { sweepHardestLevels } from './support/sweep';

// Plan section 15 wave H4: Language Arts grades 1 and 2, 30 skills.
const GRADE_1: [string, string][] = [
  ['E-1-A6', 'Endings s, ed, ing'],
  ['E-1-A7', 'Endings ck, ng, nk'],
  ['E-1-A8', 'Y as a vowel'],
  ['E-1-B4', 'Sight words, set 5'],
  ['E-1-B5', 'ABC order'],
  ['E-1-B6', 'Word groups'],
  ['E-1-C4', 'Pronouns'],
  ['E-1-C5', 'One or more: runs or run'],
  ['E-1-C6', 'Capitals for days and months'],
  ['E-1-C7', 'Common and proper nouns'],
  ['E-1-C8', 'Question words'],
  ['E-1-C9', 'Joining words: and, but, or'],
  ['E-1-D6', 'Story or facts'],
  ['E-1-D7', 'Who is telling the story'],
  ['E-1-D8', 'Feelings in a story'],
];
const GRADE_2: [string, string][] = [
  ['E-2-A4', 'Vowel sounds oi, oy, ou, ow'],
  ['E-2-A5', 'Soft and hard c and g'],
  ['E-2-A6', 'Silent letters: kn, wr, mb'],
  ['E-2-B6', 'Shades of meaning'],
  ['E-2-B7', 'Words with two meanings'],
  ['E-2-B8', 'ABC order to the second letter'],
  ['E-2-B9', 'Guide words'],
  ['E-2-C5', 'Group names'],
  ['E-2-C6', 'Myself, himself, herself'],
  ['E-2-C7', 'Adverbs'],
  ['E-2-C8', 'Complete sentences'],
  ['E-2-D7', 'Text features'],
  ['E-2-D8', 'Poems: rhyme and repeated lines'],
  ['E-2-D9', 'Compare two stories'],
  ['E-2-D10', "Author's purpose"],
];

test.describe('Language Arts grades 1 and 2, wave H4', () => {
  test('every grade 1 skill fits the screen at its hardest level, with every control big enough to tap', async ({ page }) => {
    test.setTimeout(600_000);
    await sweepHardestLevels(page, 'Grade 1', GRADE_1, 'h4-g1', 'Language Arts');
  });

  test('every grade 2 skill fits the screen at its hardest level, with every control big enough to tap', async ({ page }) => {
    test.setTimeout(600_000);
    await sweepHardestLevels(page, 'Grade 2', GRADE_2, 'h4-g2', 'Language Arts');
  });
});
