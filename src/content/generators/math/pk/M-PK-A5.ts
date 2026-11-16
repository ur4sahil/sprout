import { findNumberSkill } from './findNumber';

// Math pre-K A.5, Find the number, 1 to 5. Family: Find the number.
// Levels: hear a number and tap its numeral, from 2 options / from 3 options.
const ONE_TO_FIVE = [1, 2, 3, 4, 5];

export const generator = findNumberSkill(
  'M-PK-A5',
  2,
  (level, rng) => {
    const values = rng.sample(ONE_TO_FIVE, level === 1 ? 2 : 3);
    return { n: rng.pick(values), values };
  },
  [2, 3, 5],
  3,
);
