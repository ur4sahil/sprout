import type { LadderStep } from '../../ladders';

// Where wave H4's skills go on the ladders: each one right after the skill named in `after`.
export const LADDER_STEPS: readonly LadderStep[] = [
  // Phonics: grade 1 after A.5, grade 2 after A.3.
  { ladder: 'phonics', skillId: 'E-1-A6', after: 'E-1-A5' },
  { ladder: 'phonics', skillId: 'E-1-A7', after: 'E-1-A6' },
  { ladder: 'phonics', skillId: 'E-1-A8', after: 'E-1-A7' },
  { ladder: 'phonics', skillId: 'E-2-A4', after: 'E-2-A3' },
  { ladder: 'phonics', skillId: 'E-2-A5', after: 'E-2-A4' },
  { ladder: 'phonics', skillId: 'E-2-A6', after: 'E-2-A5' },
  // Sight words: set 5 after set 4.
  { ladder: 'sight-words', skillId: 'E-1-B4', after: 'E-1-B1' },
  // Vocabulary: grade 1 after B.3, grade 2 after B.5.
  { ladder: 'vocabulary', skillId: 'E-1-B5', after: 'E-1-B3' },
  { ladder: 'vocabulary', skillId: 'E-1-B6', after: 'E-1-B5' },
  { ladder: 'vocabulary', skillId: 'E-2-B6', after: 'E-2-B5' },
  { ladder: 'vocabulary', skillId: 'E-2-B7', after: 'E-2-B6' },
  { ladder: 'vocabulary', skillId: 'E-2-B8', after: 'E-2-B7' },
  { ladder: 'vocabulary', skillId: 'E-2-B9', after: 'E-2-B8' },
  // Grammar: grade 1 after C.3, grade 2 after C.4.
  { ladder: 'grammar', skillId: 'E-1-C4', after: 'E-1-C3' },
  { ladder: 'grammar', skillId: 'E-1-C5', after: 'E-1-C4' },
  { ladder: 'grammar', skillId: 'E-1-C6', after: 'E-1-C5' },
  { ladder: 'grammar', skillId: 'E-1-C7', after: 'E-1-C6' },
  { ladder: 'grammar', skillId: 'E-1-C8', after: 'E-1-C7' },
  { ladder: 'grammar', skillId: 'E-1-C9', after: 'E-1-C8' },
  { ladder: 'grammar', skillId: 'E-2-C5', after: 'E-2-C4' },
  { ladder: 'grammar', skillId: 'E-2-C6', after: 'E-2-C5' },
  { ladder: 'grammar', skillId: 'E-2-C7', after: 'E-2-C6' },
  { ladder: 'grammar', skillId: 'E-2-C8', after: 'E-2-C7' },
  // Reading: grade 1 after D.5, grade 2 after D.6.
  { ladder: 'reading', skillId: 'E-1-D6', after: 'E-1-D5' },
  { ladder: 'reading', skillId: 'E-1-D7', after: 'E-1-D6' },
  { ladder: 'reading', skillId: 'E-1-D8', after: 'E-1-D7' },
  { ladder: 'reading', skillId: 'E-2-D7', after: 'E-2-D6' },
  { ladder: 'reading', skillId: 'E-2-D8', after: 'E-2-D7' },
  { ladder: 'reading', skillId: 'E-2-D9', after: 'E-2-D8' },
  { ladder: 'reading', skillId: 'E-2-D10', after: 'E-2-D9' },
];
