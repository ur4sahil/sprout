import type { ItemType, Say, Visual } from '../../../engine/types';
import type { Skill } from '../../catalogue';

// Catalogue rows added by plan section 15 wave H5. Appended to CATALOGUE after every earlier row.
// Math grade 3, 15 skills (docs/waves/h5.md).

const CATEGORIES = { B: 'B. Adding and subtracting', C: 'C. Multiplication', D: 'D. Division', E: 'E. Fractions', F: 'F. Measurement and data' } as const;

function row(code: string, name: string, speakName: Say, strand: string, ladder: string, icon: Visual, itemTypes: ItemType[], ccss: string): Skill {
  const letter = code[0] as keyof typeof CATEGORIES;
  return {
    id: `M-3-${code.replace('.', '')}`,
    subject: 'math',
    grade: '3',
    category: CATEGORIES[letter],
    code,
    name,
    strand,
    ladder,
    icon,
    speakName,
    version: 1,
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
