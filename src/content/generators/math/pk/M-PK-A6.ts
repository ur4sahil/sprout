import type { Rng } from '../../../../engine/rng';
import { findNumberSkill } from './findNumber';

// Math pre-K A.6, Find the number, 1 to 10. Family: Find the number.
// Levels: 3 options far apart / 3 neighbours / options that include 6 and 9, which look alike upside down.

function farApart(rng: Rng): number[] {
  // Each at least 3 away from the others.
  for (;;) {
    const values = rng.sample([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 3).sort((x, y) => x - y);
    if ((values[1] as number) - (values[0] as number) >= 3 && (values[2] as number) - (values[1] as number) >= 3) return values;
  }
}

export const generator = findNumberSkill(
  'M-PK-A6',
  3,
  (level, rng) => {
    if (level === 1) {
      const values = farApart(rng);
      return { n: rng.pick(values), values };
    }
    if (level === 2) {
      const start = rng.int(1, 8);
      const values = [start, start + 1, start + 2];
      return { n: rng.pick(values), values };
    }
    const values = [6, 9, rng.pick([1, 2, 3, 4, 5, 7, 8, 10])];
    return { n: rng.pick(values), values };
  },
  [7, 9, 6],
  4,
);
