import { CATALOGUE } from '../src/content/catalogue';
import { test } from './support/fixtures';
import { sweepHardestLevels } from './support/sweep';

// Plan 15 phase I: every Reasoning puzzle at its new top level (a score of 95 asks level 4), at every screen
// size, with every control big enough to tap.
const PUZZLES: [string, string][] = CATALOGUE.filter((skill) => skill.subject === 'reasoning').map((skill) => [skill.id, skill.name]);

test.describe('Reasoning, top levels', () => {
  test('every puzzle fits the screen at its top level', async ({ page }) => {
    test.setTimeout(900_000);
    await sweepHardestLevels(page, 'Grade 2', PUZZLES, 'puzzlesTop', 'Reasoning', 95);
  });
});
