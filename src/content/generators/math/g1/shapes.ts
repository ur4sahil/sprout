import type { Rng } from '../../../../engine/rng';
import { makeRng } from '../../../../engine/rng';
import type { LessonStep, Level, QuestionDraft, ShapeName, Visual } from '../../../../engine/types';
import type { ColorName } from '../../../data/colors';
import { COLOR_NAMES } from '../../../data/colors';
import type { SkillGenerator } from '../../../generator';
import { a, shape } from '../pk/parts';
import { explain, joinAnd } from './wording';

// Math grade 1 D.1 and D.2: halves and fourths, and shape attributes.

// ---- D.1 Halves and fourths ----
// Levels: equal or not equal parts / pick the shape showing halves / halves or fourths.
// Family: Equal shares. Oracle: fraction.

type Whole = 'circle' | 'rectangle';
const cut = (whole: Whole, parts: number, equal: boolean): Visual => ({ kind: 'fraction', shape: whole, parts, shaded: 0, equal });
const NAME: Record<number, string> = { 2: 'halves', 4: 'fourths' };
const yesNo = (): Visual[] => [
  { kind: 'text', value: 'Yes', size: 'l', speak: ['Yes'] },
  { kind: 'text', value: 'No', size: 'l', speak: ['No'] },
];

const equalLine = (parts: number): string => `${NAME[parts]?.charAt(0).toUpperCase()}${NAME[parts]?.slice(1)} are ${parts === 2 ? 'two' : 'four'} equal parts.`;
const equalText = (parts: number): string => `${NAME[parts]?.charAt(0).toUpperCase()}${NAME[parts]?.slice(1)} are ${parts} equal parts.`;

function shares(level: Level, rng: Rng): QuestionDraft {
  const whole = rng.pick<Whole>(['circle', 'rectangle']);
  if (level === 1) {
    const parts = rng.pick([2, 4]);
    const equal = rng.bool();
    const prompt = 'Are the parts equal?';
    const lines = ['Equal parts are the same size.', equal ? 'These parts are the same size, so they are equal.' : 'These parts are not the same size, so they are not equal.'];
    return {
      type: 'choice',
      mode: 'look',
      fixedOrder: true,
      facts: { parts, equal, ask: 'equal', shape: whole, options: [true, false] },
      prompt: { text: prompt, speak: [prompt] },
      stimulus: cut(whole, parts, equal),
      options: yesNo(),
      answerIndex: equal ? 0 : 1,
      explanation: explain(lines, cut(whole, parts, true), { text: 'Look at each part. Are they all the same size?' }),
    };
  }
  const parts = level === 2 ? 2 : rng.pick([2, 4]);
  const other = parts === 2 ? 4 : 2;
  // Beside the answer: the other fraction, and a shape cut into parts that are not equal.
  const unequalParts = rng.pick([2, 4]);
  const options = rng.shuffle([
    { code: NAME[parts] as string, picture: cut(whole, parts, true) },
    { code: NAME[other] as string, picture: cut(whole, other, true) },
    { code: 'unequal', picture: cut(whole, unequalParts, false) },
  ]);
  const prompt = `Which shape shows ${NAME[parts]}?`;
  return {
    type: 'choice',
    mode: 'look',
    facts: { parts, equal: true, ask: 'name', shape: whole, unequalParts, options: options.map((option) => option.code) },
    prompt: { text: prompt, speak: [prompt] },
    options: options.map((option) => option.picture),
    answerIndex: options.findIndex((option) => option.code === NAME[parts]),
    explanation: explain([equalText(parts), `This shape has ${parts} parts, all the same size.`], cut(whole, parts, true), { text: 'Count the parts in each shape. Are they the same size?' }),
  };
}

export const halvesAndFourthsGenerator: SkillGenerator = {
  skillId: 'M-1-D1',
  maxLevel: 3,
  itemTypes: ['choice'],
  lists: [],
  pool: { 2: 4 }, // a circle or a rectangle, beside unequal halves or unequal fourths
  generate: shares,
  exampleSeed: 141,
  example: () => shares(1, makeRng(141)),
  lesson: (): LessonStep[] => [
    { beat: 'see', text: 'A shape can be cut into equal parts. Equal parts are the same size.', speak: ['A shape can be cut into equal parts. Equal parts are the same size.'], visual: cut('circle', 2, true) },
    { beat: 'watch', text: equalText(2), speak: [equalLine(2)], visual: cut('rectangle', 2, true) },
    { beat: 'try', text: 'Which shape shows fourths?', speak: ['Which shape shows fourths?'], visual: { kind: 'row', children: [cut('circle', 2, true), cut('circle', 4, true)] }, reveal: { text: equalText(4), speak: [equalLine(4)], visual: cut('circle', 4, true) } },
    { beat: 'remember', text: 'Equal parts are the same size.', speak: ['Equal parts are the same size.'], visual: cut('rectangle', 4, true) },
  ],
  oracle: 'fraction',
};

// ---- D.2 Shape attributes ----
// Levels: pick the shape with 4 sides / multiSelect: pick all with 3 corners / choice: closed or open shape.
// Oracle: shapeFacts.

// Straight sides, and the corners between them. A circle has none.
const SIDES: Partial<Record<ShapeName, number>> = { circle: 0, triangle: 3, square: 4, rectangle: 4, pentagon: 5, hexagon: 6 };
const FORMS = Object.keys(SIDES) as ShapeName[];
const sidesOf = (form: ShapeName): number => SIDES[form] as number;
const numberWord = (n: number): string => ['no', 'one', 'two', 'three', 'four', 'five', 'six'][n] as string;

function attributeLine(form: ShapeName, ask: 'sides' | 'corners'): string {
  const n = sidesOf(form);
  return `${a(form).charAt(0).toUpperCase()}${a(form).slice(1)} has ${n === 0 ? 'no' : n} ${ask}.`;
}
const attributeSpoken = (form: ShapeName, ask: 'sides' | 'corners'): string => `${a(form).charAt(0).toUpperCase()}${a(form).slice(1)} has ${numberWord(sidesOf(form))} ${ask}.`;

function shapeAttributes(level: Level, rng: Rng): QuestionDraft {
  const color = rng.pick(COLOR_NAMES);
  if (level === 1) {
    // One shape with the number of sides asked for, beside three with other numbers.
    const answer = rng.pick(FORMS.filter((form) => sidesOf(form) >= 3));
    const others = rng.sample(FORMS.filter((form) => sidesOf(form) !== sidesOf(answer)), 3).filter((form, i, list) => list.findIndex((other) => sidesOf(other) === sidesOf(form)) === i);
    const options = rng.shuffle([answer, ...others]);
    const prompt = `Which shape has ${sidesOf(answer)} sides?`;
    return {
      type: 'choice',
      mode: 'look',
      facts: { shape: answer, ask: 'sides', color, options: options.map(sidesOf) },
      prompt: { text: prompt, speak: ['Which shape has', { number: sidesOf(answer) }, 'sides?'] },
      options: options.map((form) => shape(form, color)),
      answerIndex: options.indexOf(answer),
      explanation: explain(['Count the sides of each shape.', attributeLine(answer, 'sides')], shape(answer, color, 'l'), { text: 'Count the sides of each shape.' }),
    };
  }
  if (level === 2) {
    // Pick every shape with the number of corners asked for: one or two of the four, told apart by colour and size.
    const answer = rng.pick<ShapeName>(['triangle', 'square', 'rectangle']);
    const same = FORMS.filter((form) => sidesOf(form) === sidesOf(answer));
    const [color2] = rng.sample(COLOR_NAMES.filter((each) => each !== color), 1) as [ColorName];
    const right: Visual[] = rng.bool() ? [shape(answer, color)] : [shape(answer, color), shape(rng.pick(same), color2, 'l')];
    const wrongForms = rng.sample(FORMS.filter((form) => sidesOf(form) !== sidesOf(answer)), 4 - right.length);
    const all = rng.shuffle([...right.map((picture) => ({ picture, corners: sidesOf(answer) })), ...wrongForms.map((form) => ({ picture: shape(form, color), corners: sidesOf(form) }))]);
    const prompt = `Pick all the shapes with ${sidesOf(answer)} corners.`;
    // Every right shape is named: two triangles, or a square with a rectangle.
    const forms = right.flatMap((picture) => (picture.kind === 'shape' ? [picture.shape] : []));
    const kinds = [...new Set(forms)];
    const named = kinds.length > 1 ? `The ${joinAnd(kinds)} have` : forms.length > 1 ? `Both ${kinds[0] as string}s have` : `The ${kinds[0] as string} has`;
    return {
      type: 'multiSelect',
      mode: 'look',
      facts: { shape: answer, ask: 'corners', color, options: all.map((option) => option.corners) },
      prompt: { text: prompt, speak: ['Pick all the shapes with', { number: sidesOf(answer) }, 'corners.'] },
      options: all.map((option) => option.picture),
      answerIndexes: all.flatMap((option, index) => (option.corners === sidesOf(answer) ? [index] : [])),
      explanation: explain(['Count the corners of each shape.', `${named} ${sidesOf(answer)} corners.`], shape(answer, color, 'l'), { text: 'Count the corners of each shape.' }),
    };
  }
  const form = rng.pick<ShapeName>(['triangle', 'square', 'rectangle', 'pentagon', 'hexagon', 'circle']);
  const open = rng.bool();
  const prompt = 'Is this shape closed or open?';
  const drawn: Visual = open ? { kind: 'shape', shape: form, color, size: 'l', rotation: 0, open: true } : shape(form, color, 'l');
  const lines = ['Trace around the shape with your finger.', open ? 'There is a gap, so it is open.' : 'There is no gap, so it is closed.'];
  const facts: QuestionDraft['facts'] = open ? { shape: form, ask: 'closed', open: true, color, options: [true, false] } : { shape: form, ask: 'closed', color, options: [true, false] };
  return {
    type: 'choice',
    mode: 'look',
    fixedOrder: true,
    facts,
    prompt: { text: prompt, speak: [prompt] },
    stimulus: drawn,
    options: [
      { kind: 'text', value: 'Closed', size: 'l', speak: ['Closed'] },
      { kind: 'text', value: 'Open', size: 'l', speak: ['Open'] },
    ],
    answerIndex: open ? 1 : 0,
    explanation: explain(lines, drawn, { text: 'Trace around the shape. Is there a gap?' }),
  };
}

export const shapeAttributesGenerator: SkillGenerator = {
  skillId: 'M-1-D2',
  maxLevel: 3,
  itemTypes: ['choice', 'multiSelect'],
  lists: ['colors'],
  generate: shapeAttributes,
  exampleSeed: 142,
  example: () => shapeAttributes(1, makeRng(142)),
  lesson: (): LessonStep[] => [
    { beat: 'see', text: 'Shapes have sides and corners. A triangle has 3 sides and 3 corners.', speak: ['Shapes have sides and corners. A triangle has three sides and three corners.'], visual: shape('triangle', 'blue', 'l') },
    { beat: 'watch', text: `Which shape has 4 sides? ${attributeLine('square', 'sides')}`, speak: ['Which shape has', { number: 4 }, 'sides?', attributeSpoken('square', 'sides')], visual: { kind: 'row', children: [shape('triangle', 'blue'), shape('square', 'blue')] } },
    { beat: 'try', text: 'Which shape has 6 sides?', speak: ['Which shape has', { number: 6 }, 'sides?'], visual: { kind: 'row', children: [shape('hexagon', 'green'), shape('rectangle', 'green')] }, reveal: { text: attributeLine('hexagon', 'sides'), speak: [attributeSpoken('hexagon', 'sides')], visual: shape('hexagon', 'green', 'l') } },
    { beat: 'remember', text: 'Trace round the shape and count.', speak: ['Trace round the shape and count.'], visual: shape('pentagon', 'blue', 'l') },
  ],
  oracle: 'shapeFacts',
};
