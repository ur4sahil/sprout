import type { ItemType, Say, Visual } from '../../../engine/types';
import type { Skill } from '../../catalogue';

// Catalogue rows added by plan section 15 wave H5. Appended to CATALOGUE after every earlier row.
// Math grade 3, 15 skills (docs/waves/h5.md).

const CATEGORIES = { B: 'B. Adding and subtracting', C: 'C. Multiplication', D: 'D. Division', E: 'E. Fractions', F: 'F. Measurement and data' } as const;

// Skills whose questions have changed since the wave shipped, and the version each is on now. The wording audit,
// round 2 (Nov 22, 2026), changed every skill but C.11; C.10 and E.6 read data/h5-stories.ts, which changed. After the
// merge (Nov 22, 2026), the stories name a person once and B.6, C.8, C.10, C.11, E.5, E.6, F.9 and F.10 have their own
// hints, so every reader of h5-stories.ts and those skills went up one more.
const VERSIONS: Record<string, number> = {
  'M-3-B5': 2, 'M-3-B6': 3, 'M-3-C8': 3, 'M-3-C9': 3, 'M-3-C10': 3, 'M-3-C12': 3, 'M-3-D4': 3, 'M-3-D5': 2,
  'M-3-E5': 3, 'M-3-E6': 3, 'M-3-E7': 3, 'M-3-F8': 3, 'M-3-F9': 3, 'M-3-F10': 3, 'M-3-C11': 2,
};

// Skills changed by the new pictures (Nov 22, 2026): F.9's rectangle drawn to its sides. Read before VERSIONS. F.9 is
// on 4: the pictures and its own hint (each 3 on its branch) were merged the same day.
const PICTURE_VERSIONS: Record<string, number> = { 'M-3-F9': 4 };

function row(code: string, name: string, speakName: Say, strand: string, ladder: string, icon: Visual, itemTypes: ItemType[], ccss: string): Skill {
  const letter = code[0] as keyof typeof CATEGORIES;
  const id = `M-3-${code.replace('.', '')}`;
  return {
    id,
    subject: 'math',
    grade: '3',
    category: CATEGORIES[letter],
    code,
    name,
    strand,
    ladder,
    icon,
    speakName,
    version: PICTURE_VERSIONS[id] ?? VERSIONS[id] ?? 1,
    itemTypes,
    maxLevel: 3,
    prereqs: [],
    ccss,
  };
}

const CHOICE_TYPED: ItemType[] = ['choice', 'numberPad'];

export const ROWS: readonly Skill[] = [
  row('B.5', 'Subtract across zeros', ['Subtract across zeros'], 'NBT', 'add-subtract', { kind: 'equation', parts: [400, '-', 156] }, ['choice', 'columnSum'], '3.NBT.A.2'),
  row('B.6', 'Which operation?', ['Which operation?'], 'OA', 'add-subtract', { kind: 'text', value: '+ − × ÷', size: 'm' }, ['choice'], '3.OA.D.8'),
  row('C.8', 'Properties of multiplication', ['Properties of multiplication'], 'OA', 'multiply-divide', { kind: 'equation', parts: [7, '×', 1, '=', 7] }, CHOICE_TYPED, '3.OA.B.5'),
  row('C.9', 'Split a multiplication', ['Split a multiplication'], 'OA', 'multiply-divide', { kind: 'equation', parts: [7, '×', 4, '=', 20, '+', 8] }, CHOICE_TYPED, '3.OA.B.5'),
  row('C.10', 'Multiplication word problems', ['Multiplication word problems'], 'OA', 'multiply-divide', { kind: 'array', rows: 3, cols: 5, emoji: '🍎' }, CHOICE_TYPED, '3.OA.A.3'),
  row('C.11', 'Patterns in the times table', ['Patterns in the times table'], 'OA', 'multiply-divide', { kind: 'equation', parts: [3, '×', 5, '=', 15] }, ['choice'], '3.OA.D.9'),
  row('C.12', 'Estimate products', ['Estimate products'], 'OA', 'multiply-divide', { kind: 'equation', parts: [4, '×', 28] }, CHOICE_TYPED, '3.OA.D.8'),
  row('D.4', 'Division word problems', ['Division word problems'], 'OA', 'multiply-divide', { kind: 'emojiGroup', emoji: '🍪', count: 12, layout: 'grid5' }, CHOICE_TYPED, '3.OA.A.3'),
  row('D.5', 'Missing numbers in division', ['Missing numbers in division'], 'OA', 'multiply-divide', { kind: 'equation', parts: ['blank', '÷', 4, '=', 6] }, CHOICE_TYPED, '3.OA.A.4'),
  row('E.5', 'Whole numbers as fractions', ['Whole numbers as fractions'], 'NF', 'fractions', { kind: 'fraction', shape: 'circle', parts: 4, shaded: 4, equal: true }, ['choice'], '3.NF.A.3.c'),
  row('E.6', 'Fractions of a group', ['Fractions of a group'], 'NF', 'fractions', { kind: 'emojiGroup', emoji: '🍓', count: 6, layout: 'dice' }, CHOICE_TYPED, '3.NF.A.1'),
  row('E.7', 'Compare fractions in stories', ['Compare fractions in stories'], 'NF', 'fractions', { kind: 'row', children: [{ kind: 'fraction', shape: 'circle', parts: 8, shaded: 3, equal: true }, { kind: 'fraction', shape: 'circle', parts: 8, shaded: 5, equal: true }] }, ['choice'], '3.NF.A.3.d'),
  row('F.8', 'Area of two rectangles', ['Area of two rectangles'], 'MD', 'length', { kind: 'row', children: [{ kind: 'array', rows: 3, cols: 4, emoji: '🟩' }, { kind: 'array', rows: 2, cols: 2, emoji: '🟩' }] }, CHOICE_TYPED, '3.MD.C.7.d'),
  row('F.9', 'Perimeter and area problems', ['Perimeter and area problems'], 'MD', 'length', { kind: 'row', children: [{ kind: 'array', rows: 1, cols: 5, emoji: '🟩' }, { kind: 'array', rows: 3, cols: 3, emoji: '🟩' }] }, CHOICE_TYPED, '3.MD.D.8'),
  row('F.10', 'Time problems and schedules', ['Time problems and schedules'], 'MD', 'time', { kind: 'clock', hour: 9, minute: 45 }, CHOICE_TYPED, '3.MD.A.1'),
];
