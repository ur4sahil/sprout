import { countSkill } from './parts';

// Math pre-K A.1, Count to 3. Family: Count objects.
// Levels: 1 to 3 objects in a row / scattered.
export const generator = countSkill(
  'M-PK-A1',
  [
    { from: 1, to: 3, layout: 'row' },
    { from: 1, to: 3, layout: 'scatter' },
  ],
  1,
  3,
  [2, 3, 2],
  11,
);
