import { test } from './support/fixtures';
import { sweepHardestLevels } from './support/sweep';

// Plan 15 phase G (curriculum gaps) and phase I's new puzzles: every skill at its hardest level, at every
// screen size, with every control big enough to tap.

test.describe('curriculum gaps and new puzzles', () => {
  test('Kindergarten Math gaps', async ({ page }) => {
    test.setTimeout(300_000);
    await sweepHardestLevels(page, 'Kindergarten', [['M-K-E4', 'Position words'], ['M-K-E5', 'Shapes made from shapes'], ['M-K-F3', 'What can be measured']], 'gapsK');
  });

  test('Grade 1 Math gaps', async ({ page }) => {
    test.setTimeout(400_000);
    await sweepHardestLevels(page, 'Grade 1', [['M-1-B11', 'Order does not matter'], ['M-1-B12', 'Subtract by thinking of adding'], ['M-1-B13', 'Count on to add'], ['M-1-C5', 'Measure with paper clips'], ['M-1-D3', 'How many pieces make a shape']], 'gaps1');
  });

  test('Grade 2 Math gaps', async ({ page }) => {
    test.setTimeout(400_000);
    await sweepHardestLevels(page, 'Grade 2', [['M-2-B11', 'Add up to four numbers'], ['M-2-C5', 'Inches, feet and centimeters'], ['M-2-C6', 'Compare lengths'], ['M-2-C7', 'Line plots'], ['M-2-D3', 'Rows and columns of squares']], 'gaps2');
  });

  test('reading comprehension, Kindergarten to Grade 2', async ({ page }) => {
    test.setTimeout(300_000);
    await sweepHardestLevels(page, 'Kindergarten', [['E-K-E2', 'Characters and setting'], ['E-K-E3', 'Facts from a text']], 'gapsElaK', 'Language Arts');
  });

  test('reading comprehension, Grade 1', async ({ page }) => {
    test.setTimeout(400_000);
    await sweepHardestLevels(page, 'Grade 1', [['E-1-D2', 'Characters and setting'], ['E-1-D3', 'Retell in order'], ['E-1-D4', 'True or false'], ['E-1-D5', 'Fact texts']], 'gapsEla1', 'Language Arts');
  });

  test('reading comprehension, Grade 2', async ({ page }) => {
    test.setTimeout(300_000);
    await sweepHardestLevels(page, 'Grade 2', [['E-2-D4', 'Retell a story'], ['E-2-D5', 'Fact texts'], ['E-2-D6', 'Words in context']], 'gapsEla2', 'Language Arts');
  });

  test('new Reasoning puzzles', async ({ page }) => {
    test.setTimeout(300_000);
    await sweepHardestLevels(page, 'Grade 2', [['R-A15', 'Word analogies'], ['R-A16', 'Which word does not belong'], ['R-A17', 'Number grids']], 'puzzles', 'Reasoning');
  });
});
