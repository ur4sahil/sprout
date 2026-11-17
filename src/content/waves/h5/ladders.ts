import type { LadderStep } from '../../ladders';

// Where wave H5's skills go on the ladders: each one right after the skill named in `after`.
// Every anchor is a grade 3 skill, so a lower-grade skill another wave adds never lands after one of these.
export const LADDER_STEPS: readonly LadderStep[] = [
  { ladder: 'add-subtract', skillId: 'M-3-B5', after: 'M-3-B2' },
  { ladder: 'add-subtract', skillId: 'M-3-B6', after: 'M-3-B4' },
  { ladder: 'multiply-divide', skillId: 'M-3-C8', after: 'M-3-C7' },
  { ladder: 'multiply-divide', skillId: 'M-3-C9', after: 'M-3-C8' },
  { ladder: 'multiply-divide', skillId: 'M-3-C11', after: 'M-3-C9' },
  { ladder: 'multiply-divide', skillId: 'M-3-C10', after: 'M-3-C11' },
  { ladder: 'multiply-divide', skillId: 'M-3-D4', after: 'M-3-C10' },
  { ladder: 'multiply-divide', skillId: 'M-3-D5', after: 'M-3-D4' },
  { ladder: 'multiply-divide', skillId: 'M-3-C12', after: 'M-3-D5' },
  { ladder: 'fractions', skillId: 'M-3-E5', after: 'M-3-E4' },
  { ladder: 'fractions', skillId: 'M-3-E6', after: 'M-3-E5' },
  { ladder: 'fractions', skillId: 'M-3-E7', after: 'M-3-E6' },
  { ladder: 'length', skillId: 'M-3-F8', after: 'M-3-F3' },
  { ladder: 'length', skillId: 'M-3-F9', after: 'M-3-F8' },
  { ladder: 'time', skillId: 'M-3-F10', after: 'M-3-F2' },
];
