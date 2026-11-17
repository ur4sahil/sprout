import { test } from './support/fixtures';
import { sweepHardestLevels } from './support/sweep';

// Plan section 15 wave H1: the new Math kindergarten and grade 1 skills fit the screen at their hardest level.
const KINDERGARTEN: [string, string][] = [
  ['M-K-A8', 'Count one kind'],
  ['M-K-A9', 'Find the number to 20'],
  ['M-K-A10', 'Number words to ten'],
  ['M-K-A11', 'First to fifth'],
  ['M-K-A12', 'Count back'],
  ['M-K-A13', 'Tally marks'],
  ['M-K-B4', 'Are there enough?'],
  ['M-K-B5', 'Compare a group and a number'],
  ['M-K-C12', 'Add on a number line'],
  ['M-K-C13', 'Take away on a number line'],
  ['M-K-C14', 'Plus or take away?'],
  ['M-K-C15', 'Addition sentences for pictures'],
  ['M-K-C16', 'Take away sentences for pictures'],
  ['M-K-C17', 'Make 5'],
  ['M-K-E6', 'Shapes all around us'],
  ['M-K-E7', 'Roll and stack'],
  ['M-K-F4', 'Heavier and lighter'],
  ['M-K-F5', 'Holds more, holds less'],
  ['M-K-F6', 'How were they sorted?'],
  ['M-K-G2', 'Same pattern, new pictures'],
];

const GRADE_1: [string, string][] = [
  ['M-1-A6', 'Hear and find numbers to 120'],
  ['M-1-A7', 'Show tens and ones'],
  ['M-1-A8', 'Put numbers to 120 in order'],
  ['M-1-A9', 'Hundred chart puzzles'],
  ['M-1-A10', 'Number words to 100'],
  ['M-1-B14', 'Fact families'],
  ['M-1-B15', 'Stories with three numbers'],
  ['M-1-B16', 'Stories with a missing part'],
  ['M-1-B17', 'Make both sides equal'],
  ['M-1-B18', 'Count back to subtract'],
  ['M-1-B19', 'Go down to ten to subtract'],
  ['M-1-C6', 'Match clocks to times'],
  ['M-1-C7', 'Days of the week'],
  ['M-1-C8', 'Months of the year'],
  ['M-1-C9', 'Tally charts'],
  ['M-1-C10', 'Sort into three groups'],
  ['M-1-C11', 'Count dimes and pennies'],
  ['M-1-C12', 'Taller than, shorter than'],
  ['M-1-D4', 'Faces of solid shapes'],
  ['M-1-D5', 'Halves are bigger than fourths'],
];

test.describe('Math wave H1', () => {
  test('every new kindergarten skill fits the screen at its hardest level, with every control big enough to tap', async ({ page }) => {
    test.setTimeout(600_000);
    await sweepHardestLevels(page, 'Kindergarten', KINDERGARTEN, 'h1k');
  });

  test('every new grade 1 skill fits the screen at its hardest level, with every control big enough to tap', async ({ page }) => {
    test.setTimeout(600_000);
    await sweepHardestLevels(page, 'Grade 1', GRADE_1, 'h1g1');
  });
});
