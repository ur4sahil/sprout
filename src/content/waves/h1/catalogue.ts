import type { ItemType, Say, SkillGrade, Visual } from '../../../engine/types';
import type { Skill } from '../../catalogue';

// Catalogue rows added by plan section 15 wave H1 (Math kindergarten and grade 1, docs/waves/h1.md).
// Appended to CATALOGUE after every earlier row.

const K = {
  A: 'A. Counting',
  B: 'B. Comparing',
  C: 'C. Adding and subtracting',
  E: 'E. Shapes',
  F: 'F. Measuring and sorting',
  G: 'G. Patterns',
};
const G1 = {
  A: 'A. Numbers to 120',
  B: 'B. Adding and subtracting',
  C: 'C. Time, measuring and money',
  D: 'D. Shapes and parts',
};

const pic = (emoji: string): Visual => ({ kind: 'emojiGroup', emoji, count: 1, layout: 'row' });

// Skills whose questions have changed since the wave shipped, and the version each is on now.
const VERSIONS: Record<string, number> = { 'M-K-F6': 2, 'M-1-C9': 2 };

function row(id: string, category: string, name: string, strand: string, ladder: string, icon: Visual, itemTypes: ItemType[], ccss?: string, speakName?: Say): Skill {
  const [, grade, code] = id.split('-') as [string, string, string];
  const skill: Skill = {
    id,
    subject: 'math',
    grade: grade as SkillGrade,
    category,
    code: `${code.charAt(0)}.${code.slice(1)}`,
    name,
    strand,
    ladder,
    icon,
    speakName: speakName ?? [name],
    version: VERSIONS[id] ?? 1,
    itemTypes,
    maxLevel: 3,
    prereqs: [],
  };
  if (ccss) skill.ccss = ccss;
  return skill;
}

const CHOICE: ItemType[] = ['choice'];
const TYPED: ItemType[] = ['choice', 'numberPad'];

export const ROWS: readonly Skill[] = [
  row('M-K-A8', K.A, 'Count one kind', 'CC', 'counting', { kind: 'emojiGroup', emoji: '🦆', count: 3, emoji2: '🐸', count2: 2, layout: 'scatter', slots: [0, 6, 13, 3, 9] }, TYPED, 'K.CC.B.5'),
  row('M-K-A9', K.A, 'Find the number to 20', 'CC', 'counting', { kind: 'text', value: '17', size: 'xl' }, CHOICE, 'K.CC.A.3', ['Find the number to', { number: 20 }]),
  row('M-K-A10', K.A, 'Number words to ten', 'CC', 'counting', { kind: 'text', value: 'six', size: 'l' }, CHOICE, 'K.CC.A.3'),
  row('M-K-A11', K.A, 'First to fifth', 'CC', 'counting', { kind: 'row', children: [pic('🏁'), pic('🐶'), pic('🐱')] }, CHOICE),
  row('M-K-A12', K.A, 'Count back', 'CC', 'counting', { kind: 'text', value: '5, 4, 3', size: 'l' }, TYPED),
  row('M-K-A13', K.A, 'Tally marks', 'CC', 'counting', { kind: 'tally', count: 7 }, TYPED, 'K.CC.B.5'),
  row('M-K-B4', K.B, 'Are there enough?', 'CC', 'comparing', { kind: 'emojiGroup', emoji: '🐰', count: 2, emoji2: '🥕', count2: 2, layout: 'scatter', slots: [0, 1, 5, 6] }, TYPED, 'K.CC.C.6'),
  row('M-K-B5', K.B, 'Compare a group and a number', 'CC', 'comparing', { kind: 'row', children: [{ kind: 'emojiGroup', emoji: '🍎', count: 3, layout: 'row' }, { kind: 'text', value: '5', size: 'l' }] }, CHOICE, 'K.CC.C.6'),
  row('M-K-C12', K.C, 'Add on a number line', 'OA', 'add-subtract', { kind: 'numberLine', min: 0, max: 5, step: 1, marked: [2, 4] }, TYPED, 'K.OA.A.2'),
  row('M-K-C13', K.C, 'Take away on a number line', 'OA', 'add-subtract', { kind: 'numberLine', min: 0, max: 5, step: 1, marked: [4, 1] }, TYPED, 'K.OA.A.2'),
  row('M-K-C14', K.C, 'Plus or take away?', 'OA', 'add-subtract', { kind: 'equation', parts: [4, 'blank', 1, '=', 3] }, CHOICE, 'K.OA.A.1'),
  row('M-K-C15', K.C, 'Addition sentences for pictures', 'OA', 'add-subtract', { kind: 'emojiGroup', emoji: '🍎', count: 2, emoji2: '🍌', count2: 1, layout: 'row' }, CHOICE, 'K.OA.A.1'),
  row('M-K-C16', K.C, 'Take away sentences for pictures', 'OA', 'add-subtract', { kind: 'emojiGroup', emoji: '🍎', count: 4, layout: 'row', crossed: 1 }, CHOICE, 'K.OA.A.1'),
  row('M-K-C17', K.C, 'Make 5', 'OA', 'add-subtract', { kind: 'emojiGroup', emoji: '⚫', count: 3, emoji2: '⚪', count2: 2, layout: 'row' }, TYPED, 'K.OA.A.3', ['Make', { number: 5 }]),
  row('M-K-E6', K.E, 'Shapes all around us', 'G', 'shapes', pic('🕐'), CHOICE, 'K.G.A.1'),
  row('M-K-E7', K.E, 'Roll and stack', 'G', 'shapes', { kind: 'solid', solid: 'cylinder' }, CHOICE, 'K.G.B.4'),
  row('M-K-F4', K.F, 'Heavier and lighter', 'MD', 'length', pic('🐘'), CHOICE, 'K.MD.A.2'),
  row('M-K-F5', K.F, 'Holds more, holds less', 'MD', 'length', pic('🛁'), CHOICE, 'K.MD.A.2'),
  row('M-K-F6', K.F, 'How were they sorted?', 'MD', 'data', { kind: 'row', children: [{ kind: 'shape', shape: 'circle', color: 'red', size: 's', rotation: 0 }, { kind: 'shape', shape: 'square', color: 'blue', size: 's', rotation: 0 }] }, CHOICE, 'K.MD.B.3'),
  row('M-K-G2', K.G, 'Same pattern, new pictures', 'PA', 'patterns', { kind: 'sequence', items: [pic('🍎'), pic('🍌'), pic('🍎'), pic('🍌')] }, CHOICE),

  row('M-1-A6', G1.A, 'Hear and find numbers to 120', 'NBT', 'counting', { kind: 'text', value: '107', size: 'xl' }, CHOICE, '1.NBT.A.1', ['Hear and find numbers to', { number: 120 }]),
  row('M-1-A7', G1.A, 'Show tens and ones', 'NBT', 'place-value', { kind: 'baseTen', hundreds: 0, tens: 3, ones: 4 }, CHOICE, '1.NBT.B.2'),
  row('M-1-A8', G1.A, 'Put numbers to 120 in order', 'NBT', 'comparing', { kind: 'text', value: '23, 41, 108', size: 'l' }, ['order'], '1.NBT.B.3', ['Put numbers to', { number: 120 }, 'in order']),
  row('M-1-A9', G1.A, 'Hundred chart puzzles', 'NBT', 'place-value', { kind: 'matrix', cells: [{ kind: 'text', value: '34', size: 'm' }, { kind: 'text', value: '35', size: 'm' }, { kind: 'text', value: '44', size: 'm' }, 'blank'] }, TYPED, '1.NBT.C.5'),
  row('M-1-A10', G1.A, 'Number words to 100', 'NBT', 'counting', { kind: 'text', value: 'forty', size: 'l' }, CHOICE, '1.NBT.A.1', ['Number words to', { number: 100 }]),
  row('M-1-B14', G1.B, 'Fact families', 'OA', 'add-subtract', { kind: 'text', value: '3, 5, 8', size: 'l' }, TYPED, '1.OA.C.6'),
  row('M-1-B15', G1.B, 'Stories with three numbers', 'OA', 'add-subtract', { kind: 'row', children: [pic('🐝'), pic('🐞'), pic('🦋')] }, TYPED, '1.OA.A.2'),
  row('M-1-B16', G1.B, 'Stories with a missing part', 'OA', 'add-subtract', { kind: 'equation', parts: [5, '+', 'blank', '=', 9] }, TYPED, '1.OA.A.1'),
  row('M-1-B17', G1.B, 'Make both sides equal', 'OA', 'add-subtract', { kind: 'equation', parts: [4, '+', 4, '=', 6, '+', 'blank'] }, TYPED, '1.OA.D.7'),
  row('M-1-B18', G1.B, 'Count back to subtract', 'OA', 'add-subtract', { kind: 'numberLine', min: 5, max: 10, step: 1, marked: [9, 7] }, TYPED, '1.OA.C.5'),
  row('M-1-B19', G1.B, 'Go down to ten to subtract', 'OA', 'add-subtract', { kind: 'tenFrame', filled: 13, frames: 2 }, TYPED, '1.OA.C.6'),
  row('M-1-C6', G1.C, 'Match clocks to times', 'MD', 'time', { kind: 'clock', hour: 4, minute: 30 }, ['match'], '1.MD.B.3'),
  row('M-1-C7', G1.C, 'Days of the week', 'MD', 'time', { kind: 'text', value: 'Monday', size: 'm' }, CHOICE),
  row('M-1-C8', G1.C, 'Months of the year', 'MD', 'time', { kind: 'text', value: 'May', size: 'm' }, CHOICE),
  row('M-1-C9', G1.C, 'Tally charts', 'MD', 'data', { kind: 'row', children: [pic('🐶'), { kind: 'tally', count: 6 }] }, TYPED, '1.MD.C.4'),
  row('M-1-C10', G1.C, 'Sort into three groups', 'MD', 'data', { kind: 'row', children: [pic('🐶'), pic('🚗'), pic('👕')] }, ['sort'], '1.MD.C.4'),
  row('M-1-C11', G1.C, 'Count dimes and pennies', 'MD', 'money', { kind: 'coins', coins: ['dime', 'dime', 'penny'] }, TYPED, '2.MD.C.8'),
  row('M-1-C12', G1.C, 'Taller than, shorter than', 'MD', 'length', { kind: 'row', children: [{ kind: 'bar', length: 5, color: 'blue', orientation: 'vertical' }, { kind: 'bar', length: 3, color: 'orange', orientation: 'vertical' }] }, CHOICE, '1.MD.A.1'),
  row('M-1-D4', G1.D, 'Faces of solid shapes', 'G', 'shapes', { kind: 'solid', solid: 'cube' }, TYPED, '1.G.A.2'),
  row('M-1-D5', G1.D, 'Halves are bigger than fourths', 'G', 'fractions', { kind: 'fraction', shape: 'circle', parts: 2, shaded: 1, equal: true }, CHOICE, '1.G.A.3'),
];
