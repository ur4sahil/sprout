import type { LadderStep } from '../../ladders';

// Where wave H2's skills go on the ladders: each one right after the skill named in `after`.
// Pre-K skills sit among the pre-K skills and grade 2 skills among the grade 2 skills, so no ladder goes down a grade.
export const LADDER_STEPS: readonly LadderStep[] = [
  // Math pre-K
  { ladder: 'counting', skillId: 'M-PK-A12', after: 'M-PK-A3' },
  { ladder: 'counting', skillId: 'M-PK-A9', after: 'M-PK-A8' },
  { ladder: 'counting', skillId: 'M-PK-A10', after: 'M-PK-A9' },
  { ladder: 'counting', skillId: 'M-PK-A11', after: 'M-PK-A7' },
  { ladder: 'counting', skillId: 'M-PK-A13', after: 'M-PK-A10' },
  { ladder: 'comparing', skillId: 'M-PK-B3', after: 'M-PK-B2' },
  { ladder: 'comparing', skillId: 'M-PK-B4', after: 'M-PK-B3' },
  { ladder: 'length', skillId: 'M-PK-C9', after: 'M-PK-C3' },
  { ladder: 'length', skillId: 'M-PK-C4', after: 'M-PK-C9' },
  { ladder: 'shapes', skillId: 'M-PK-C6', after: 'M-PK-C1' },
  { ladder: 'shapes', skillId: 'M-PK-C7', after: 'M-PK-C2' },
  { ladder: 'shapes', skillId: 'M-PK-C5', after: 'M-PK-C7' },
  { ladder: 'shapes', skillId: 'M-PK-C8', after: 'M-PK-C5' },
  { ladder: 'patterns', skillId: 'M-PK-D4', after: 'M-PK-D2' },
  { ladder: 'patterns', skillId: 'M-PK-D5', after: 'M-PK-D4' },
  { ladder: 'patterns', skillId: 'M-PK-D6', after: 'M-PK-D3' },
  // Math grade 2
  { ladder: 'place-value', skillId: 'M-2-A12', after: 'M-2-A1' },
  { ladder: 'place-value', skillId: 'M-2-A9', after: 'M-2-A12' },
  { ladder: 'place-value', skillId: 'M-2-A7', after: 'M-2-A2' },
  { ladder: 'comparing', skillId: 'M-2-A8', after: 'M-2-A3' },
  { ladder: 'comparing', skillId: 'M-2-A13', after: 'M-2-A8' },
  { ladder: 'counting', skillId: 'M-2-A11', after: 'M-2-A4' },
  { ladder: 'counting', skillId: 'M-2-A14', after: 'M-2-A11' },
  { ladder: 'patterns', skillId: 'M-2-A10', after: 'M-2-A5' },
  { ladder: 'patterns', skillId: 'M-2-B16', after: 'M-2-A10' },
  { ladder: 'add-subtract', skillId: 'M-2-B15', after: 'M-2-B2' },
  { ladder: 'add-subtract', skillId: 'M-2-B13', after: 'M-2-B4' },
  { ladder: 'add-subtract', skillId: 'M-2-B12', after: 'M-2-B6' },
  { ladder: 'add-subtract', skillId: 'M-2-B14', after: 'M-2-B9' },
  { ladder: 'time', skillId: 'M-2-C8', after: 'M-2-C1' },
  { ladder: 'money', skillId: 'M-2-C10', after: 'M-2-C2' },
  { ladder: 'money', skillId: 'M-2-C9', after: 'M-2-C10' },
  { ladder: 'data', skillId: 'M-2-C11', after: 'M-2-C4' },
  { ladder: 'length', skillId: 'M-2-C12', after: 'M-2-C5' },
  { ladder: 'shapes', skillId: 'M-2-D4', after: 'M-2-D1' },
];
