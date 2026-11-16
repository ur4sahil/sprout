import { countSkill } from './parts';

// Math pre-K A.3, Count to 10. Family: Count objects.
// Levels: 4 to 7 in a row / 6 to 10 in rows of five / scattered, to 10.
export const generator = countSkill(
  'M-PK-A3',
  [
    { from: 4, to: 7, layout: 'row' },
    { from: 6, to: 10, layout: 'grid5' },
    { from: 5, to: 10, layout: 'scatter' },
  ],
  1,
  10,
  [6, 7, 8],
  13,
);
