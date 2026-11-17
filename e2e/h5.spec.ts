import { test } from './support/fixtures';
import { sweepHardestLevels } from './support/sweep';

// Wave H5 (plan section 15.2): 15 more Math grade 3 skills.
const SKILLS: [string, string][] = [
  ['M-3-B5', 'Subtract across zeros'],
  ['M-3-B6', 'Which operation?'],
  ['M-3-C8', 'Properties of multiplication'],
  ['M-3-C9', 'Split a multiplication'],
  ['M-3-C10', 'Multiplication word problems'],
  ['M-3-C11', 'Patterns in the times table'],
  ['M-3-C12', 'Estimate products'],
  ['M-3-D4', 'Division word problems'],
  ['M-3-D5', 'Missing numbers in division'],
  ['M-3-E5', 'Whole numbers as fractions'],
  ['M-3-E6', 'Fractions of a group'],
  ['M-3-E7', 'Compare fractions in stories'],
  ['M-3-F8', 'Area of two rectangles'],
  ['M-3-F9', 'Perimeter and area problems'],
  ['M-3-F10', 'Time problems and schedules'],
];

test.describe('Math grade 3, wave H5', () => {
  test('every skill fits the screen at its hardest level, with every control big enough to tap', async ({ page }) => {
    test.setTimeout(600_000);
    await sweepHardestLevels(page, 'Grade 3', SKILLS, 'h5');
  });
});
