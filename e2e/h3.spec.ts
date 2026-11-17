import { test } from './support/fixtures';
import { sweepHardestLevels } from './support/sweep';

// Plan section 15 wave H3: Language Arts pre-K and kindergarten, 30 skills.
const PRE_K: [string, string][] = [
  ['E-PK-A6', 'Pictures that start with a letter'],
  ['E-PK-A7', 'Letters in a name'],
  ['E-PK-B4', 'Which one starts differently'],
  ['E-PK-B5', 'Rhyme or not'],
  ['E-PK-B6', 'Sort by first letter'],
  ['E-PK-C3', 'Things that go together'],
  ['E-PK-C4', 'Feelings'],
  ['E-PK-C5', 'Body words'],
  ['E-PK-C6', 'Action words'],
  ['E-PK-C7', 'Helpers and their things'],
  ['E-PK-D1', 'What comes next'],
  ['E-PK-D2', 'Who did it'],
];

const KINDERGARTEN: [string, string][] = [
  ['E-K-A3', 'Match big and small words'],
  ['E-K-A4', 'Vowels'],
  ['E-K-A5', 'Letter, word or sentence'],
  ['E-K-B8', 'Same middle sound'],
  ['E-K-B9', 'Same last sound'],
  ['E-K-B10', 'Count the sounds'],
  ['E-K-B11', 'Change one letter'],
  ['E-K-B12', 'Which word has more claps'],
  ['E-K-B13', 'Where is the letter'],
  ['E-K-C4', 'Sight words in a sentence'],
  ['E-K-D4', 'Names start with a capital'],
  ['E-K-D5', 'Question words: who, what, where'],
  ['E-K-D6', 'Count the words'],
  ['E-K-D7', 'Read an action word'],
  ['E-K-E4', 'Story order'],
  ['E-K-E5', 'Real or make-believe'],
  ['E-K-E6', 'Which sentence matches the picture'],
  ['E-K-E7', 'Read and answer'],
];

test.describe('Language Arts wave H3', () => {
  test('every new pre-K skill fits the screen at its hardest level, with every control big enough to tap', async ({ page }) => {
    test.setTimeout(600_000);
    await sweepHardestLevels(page, 'Pre-K', PRE_K, 'h3-prek', 'Language Arts');
  });

  test('every new kindergarten skill fits the screen at its hardest level, with every control big enough to tap', async ({ page }) => {
    test.setTimeout(900_000);
    await sweepHardestLevels(page, 'Kindergarten', KINDERGARTEN, 'h3-k', 'Language Arts');
  });
});
