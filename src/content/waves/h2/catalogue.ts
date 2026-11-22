import type { ItemType, Level, Say, Visual } from '../../../engine/types';
import type { Skill } from '../../catalogue';

// Catalogue rows added by plan section 15 wave H2: Math pre-K A.9 to A.13, B.3, B.4, C.4 to C.9, D.4 to D.6, and
// Math grade 2 A.7 to A.14, B.12 to B.16, C.8 to C.12, D.4. Appended to CATALOGUE after every earlier row.

interface Row {
  id: string;
  category: string;
  name: string;
  strand: string;
  ladder: string;
  icon: Visual;
  itemTypes: ItemType[];
  ccss?: string;
  speakName?: Say;
}

const PK = { A: 'A. Counting', B: 'B. Comparing', C: 'C. Shapes and sizes', D: 'D. Patterns and sorting' };
const G2 = { A: 'A. Numbers to 1,000', B: 'B. Adding and subtracting', C: 'C. Time, money and measuring', D: 'D. Shapes and parts' };
const one = (emoji: string): Visual => ({ kind: 'emojiGroup', emoji, count: 1, layout: 'row' });
const text = (value: string): Visual => ({ kind: 'text', value, size: 'l' });
const CHOICE: ItemType[] = ['choice'];
const TYPED: ItemType[] = ['choice', 'numberPad'];

const ROWS_IN: Row[] = [
  { id: 'M-PK-A9', category: PK.A, name: 'One more', strand: 'CC', ladder: 'counting', icon: { kind: 'row', children: [{ kind: 'emojiGroup', emoji: '🍎', count: 3, layout: 'row' }, one('🍎')] }, itemTypes: CHOICE },
  { id: 'M-PK-A10', category: PK.A, name: 'One fewer', strand: 'CC', ladder: 'counting', icon: { kind: 'emojiGroup', emoji: '🐞', count: 4, layout: 'row', crossed: 1 }, itemTypes: CHOICE },
  { id: 'M-PK-A11', category: PK.A, name: 'Same number', strand: 'CC', ladder: 'counting', icon: { kind: 'row', children: [{ kind: 'emojiGroup', emoji: '⭐', count: 3, layout: 'row' }, { kind: 'emojiGroup', emoji: '🐟', count: 3, layout: 'row' }] }, itemTypes: CHOICE },
  { id: 'M-PK-A12', category: PK.A, name: 'Number order', strand: 'CC', ladder: 'counting', icon: { kind: 'sequence', items: [text('1'), text('2'), 'blank'] }, itemTypes: CHOICE },
  { id: 'M-PK-A13', category: PK.A, name: 'First and last', strand: 'CC', ladder: 'counting', icon: { kind: 'sequence', items: [one('🏁'), one('🐶'), one('🐱'), one('🦆')] }, itemTypes: CHOICE },
  { id: 'M-PK-B3', category: PK.B, name: 'More or less with numbers', strand: 'CC', ladder: 'comparing', icon: { kind: 'row', children: [text('2'), text('5')] }, itemTypes: CHOICE },
  { id: 'M-PK-B4', category: PK.B, name: 'Most and fewest', strand: 'CC', ladder: 'comparing', icon: { kind: 'row', children: [{ kind: 'emojiGroup', emoji: '🍓', count: 1, layout: 'row' }, { kind: 'emojiGroup', emoji: '🍓', count: 3, layout: 'row' }, { kind: 'emojiGroup', emoji: '🍓', count: 2, layout: 'row' }] }, itemTypes: CHOICE },
  { id: 'M-PK-C4', category: PK.C, name: 'Heavy and light', strand: 'MD', ladder: 'length', icon: { kind: 'row', children: [one('🐘'), one('🐭')] }, itemTypes: CHOICE },
  { id: 'M-PK-C5', category: PK.C, name: 'Shapes around us', strand: 'G', ladder: 'shapes', icon: { kind: 'row', children: [one('🍕'), { kind: 'shape', shape: 'triangle', color: 'blue', size: 'm', rotation: 0 }] }, itemTypes: CHOICE },
  { id: 'M-PK-C6', category: PK.C, name: 'Same shape', strand: 'G', ladder: 'shapes', icon: { kind: 'row', children: [{ kind: 'shape', shape: 'heart', color: 'red', size: 'm', rotation: 0 }, { kind: 'shape', shape: 'heart', color: 'blue', size: 's', rotation: 0 }] }, itemTypes: CHOICE },
  { id: 'M-PK-C7', category: PK.C, name: 'Colors around us', strand: 'G', ladder: 'shapes', icon: { kind: 'row', children: [one('🍌'), { kind: 'shape', shape: 'circle', color: 'yellow', size: 'm', rotation: 0 }] }, itemTypes: CHOICE },
  { id: 'M-PK-C8', category: PK.C, name: 'Ball, box or can', strand: 'G', ladder: 'shapes', icon: { kind: 'row', children: [one('⚽'), one('📦'), one('🥫')] }, itemTypes: CHOICE },
  { id: 'M-PK-C9', category: PK.C, name: 'Order by size', strand: 'MD', ladder: 'length', icon: { kind: 'row', children: [{ kind: 'shape', shape: 'star', color: 'orange', size: 's', rotation: 0 }, { kind: 'shape', shape: 'star', color: 'orange', size: 'm', rotation: 0 }, { kind: 'shape', shape: 'star', color: 'orange', size: 'l', rotation: 0 }] }, itemTypes: ['order'] },
  { id: 'M-PK-D4', category: PK.D, name: 'Fill the gap in a pattern', strand: 'PA', ladder: 'patterns', icon: { kind: 'sequence', items: [{ kind: 'shape', shape: 'circle', color: 'red', size: 's', rotation: 0 }, 'blank', { kind: 'shape', shape: 'circle', color: 'red', size: 's', rotation: 0 }, { kind: 'shape', shape: 'circle', color: 'blue', size: 's', rotation: 0 }] }, itemTypes: CHOICE },
  { id: 'M-PK-D5', category: PK.D, name: 'The same pattern', strand: 'PA', ladder: 'patterns', icon: { kind: 'sequence', items: [one('🍎'), one('🍌'), one('🍎'), one('🍌')] }, itemTypes: CHOICE },
  { id: 'M-PK-D6', category: PK.D, name: 'Sort by kind', strand: 'PA', ladder: 'patterns', icon: { kind: 'row', children: [one('🐶'), one('🍎'), one('🚗')] }, itemTypes: ['sort'] },

  { id: 'M-2-A7', category: G2.A, name: 'Number names to 1,000', strand: 'NBT', ladder: 'place-value', icon: text('three hundred'), itemTypes: TYPED, ccss: '2.NBT.A.3', speakName: ['Number names to', { number: 1000 }] },
  { id: 'M-2-A8', category: G2.A, name: 'Order three-digit numbers', strand: 'NBT', ladder: 'comparing', icon: { kind: 'sequence', items: [text('205'), text('250'), text('502')] }, itemTypes: ['order'], ccss: '2.NBT.A.4' },
  { id: 'M-2-A9', category: G2.A, name: 'Regroup hundreds, tens and ones', strand: 'NBT', ladder: 'place-value', icon: { kind: 'baseTen', hundreds: 1, tens: 2, ones: 0 }, itemTypes: TYPED, ccss: '2.NBT.A.1' },
  { id: 'M-2-A10', category: G2.A, name: 'Even numbers as doubles', strand: 'OA', ladder: 'patterns', icon: { kind: 'equation', parts: [7, '+', 7, '=', 14] }, itemTypes: TYPED, ccss: '2.OA.C.3' },
  { id: 'M-2-A11', category: G2.A, name: 'Before, after and between', strand: 'NBT', ladder: 'counting', icon: { kind: 'sequence', items: [text('399'), 'blank', text('401')] }, itemTypes: TYPED, ccss: '2.NBT.A.2' },
  { id: 'M-2-A12', category: G2.A, name: 'Show a number with blocks', strand: 'NBT', ladder: 'place-value', icon: { kind: 'baseTen', hundreds: 2, tens: 1, ones: 3 }, itemTypes: CHOICE, ccss: '2.NBT.A.1' },
  { id: 'M-2-A13', category: G2.A, name: 'Greatest and least from digits', strand: 'NBT', ladder: 'comparing', icon: { kind: 'row', children: [text('7'), text('2'), text('5')] }, itemTypes: TYPED, ccss: '2.NBT.A.4' },
  { id: 'M-2-A14', category: G2.A, name: 'Hundred chart puzzles', strand: 'NBT', ladder: 'counting', icon: { kind: 'matrix', cells: [text('34'), text('35'), text('44'), 'blank'] }, itemTypes: TYPED, ccss: '2.NBT.B.8' },
  { id: 'M-2-B12', category: G2.B, name: 'Subtract across zeros', strand: 'NBT', ladder: 'add-subtract', icon: { kind: 'equation', parts: [400, '-', 26] }, itemTypes: TYPED, ccss: '2.NBT.B.7' },
  { id: 'M-2-B13', category: G2.B, name: 'Missing numbers to 100', strand: 'OA', ladder: 'add-subtract', icon: { kind: 'equation', parts: [34, '+', 'blank', '=', 60] }, itemTypes: TYPED, ccss: '2.OA.A.1', speakName: ['Missing numbers to', { number: 100 }] },
  { id: 'M-2-B14', category: G2.B, name: 'Word problems: find the start or the change', strand: 'OA', ladder: 'add-subtract', icon: { kind: 'equation', parts: ['blank', '+', 15, '=', 52] }, itemTypes: TYPED, ccss: '2.OA.A.1' },
  { id: 'M-2-B15', category: G2.B, name: 'Add by place value', strand: 'NBT', ladder: 'add-subtract', icon: text('40 + 20 + 7 + 5'), itemTypes: TYPED, ccss: '2.NBT.B.9' },
  { id: 'M-2-B16', category: G2.B, name: 'Even and odd sums', strand: 'OA', ladder: 'patterns', icon: { kind: 'equation', parts: [3, '+', 5, '=', 8] }, itemTypes: CHOICE, ccss: '2.OA.C.3' },
  { id: 'M-2-C8', category: G2.C, name: 'A.M. and P.M.', strand: 'MD', ladder: 'time', icon: { kind: 'row', children: [one('🥞'), one('🌙')] }, itemTypes: CHOICE, ccss: '2.MD.C.7', speakName: [{ letter: 'a' }, { letter: 'm' }, 'and', { letter: 'p' }, { letter: 'm' }] },
  { id: 'M-2-C9', category: G2.C, name: 'Money word problems', strand: 'MD', ladder: 'money', icon: { kind: 'coins', coins: ['quarter', 'dime', 'nickel'] }, itemTypes: TYPED, ccss: '2.MD.C.8' },
  { id: 'M-2-C10', category: G2.C, name: 'Make an amount with coins', strand: 'MD', ladder: 'money', icon: { kind: 'coins', coins: ['dime', 'dime', 'penny'] }, itemTypes: CHOICE, ccss: '2.MD.C.8' },
  { id: 'M-2-C11', category: G2.C, name: 'Picture graph problems', strand: 'MD', ladder: 'data', icon: { kind: 'graph', type: 'picture', categories: [{ label: 'apples', emoji: '🍎', value: 3 }, { label: 'bananas', emoji: '🍌', value: 1 }] }, itemTypes: TYPED, ccss: '2.MD.D.10' },
  { id: 'M-2-C12', category: G2.C, name: 'Centimeters and meters', strand: 'MD', ladder: 'length', icon: { kind: 'ruler', lengthUnits: 4, startUnit: 0, object: 'ribbon' }, itemTypes: TYPED, ccss: '2.MD.A.1' },
  { id: 'M-2-D4', category: G2.D, name: 'Faces, edges and corners', strand: 'G', ladder: 'shapes', icon: { kind: 'solid', solid: 'cube' }, itemTypes: CHOICE, ccss: '2.G.A.1' },
];

// Grade 2 rows whose questions changed in the wording audit (Nov 22, 2026), and the version each is on now.
// Kept apart from VERSIONS below, so changes to pre-K and to grade 2 never touch the same line.
const GRADE2_VERSIONS: Record<string, number> = Object.fromEntries(
  ['A7', 'A8', 'A9', 'A10', 'A11', 'A12', 'A13', 'A14', 'B12', 'B13', 'B14', 'B15', 'B16', 'C8', 'C9', 'C10', 'C11', 'C12', 'D4'].map((code) => [`M-2-${code}`, 2]),
);

// Skills whose questions have changed since the wave shipped, and the version each is on now.
const VERSIONS: Record<string, number> = { 'M-PK-C6': 3, 'M-PK-C7': 3, 'M-PK-A9': 2, 'M-PK-A10': 2, 'M-PK-A11': 2, 'M-PK-A12': 2, 'M-PK-A13': 2, 'M-PK-B3': 2, 'M-PK-B4': 2, 'M-PK-C4': 2, 'M-PK-C5': 2, 'M-PK-C8': 2, 'M-PK-C9': 2, 'M-PK-D4': 2, 'M-PK-D5': 2, 'M-PK-D6': 2 };

function codeOf(id: string): string {
  const part = id.split('-')[2] ?? '';
  return `${part.charAt(0)}.${part.slice(1)}`;
}

export const ROWS: readonly Skill[] = ROWS_IN.map((row) => ({
  id: row.id,
  subject: 'math',
  grade: row.id.startsWith('M-PK') ? 'PK' : '2',
  category: row.category,
  code: codeOf(row.id),
  name: row.name,
  strand: row.strand,
  ladder: row.ladder,
  icon: row.icon,
  speakName: row.speakName ?? [row.name],
  version: VERSIONS[row.id] ?? GRADE2_VERSIONS[row.id] ?? 1,
  itemTypes: row.itemTypes,
  maxLevel: 3 as Level,
  prereqs: [],
  ...(row.ccss ? { ccss: row.ccss } : {}),
}));
