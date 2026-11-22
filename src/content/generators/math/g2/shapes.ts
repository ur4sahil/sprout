import type { Rng } from '../../../../engine/rng';
import { makeRng } from '../../../../engine/rng';
import type { LessonStep, Level, QuestionDraft, ShapeName, Visual } from '../../../../engine/types';
import { COLOR_NAMES } from '../../../data/colors';
import type { SkillGenerator } from '../../../generator';
import { a, shape } from '../pk/parts';

// Math grade 2 D.1 and D.2: naming shapes by their sides, and halves, thirds and fourths.

// ---- D.1 Name shapes by sides ----
// Levels: triangle or four-sided shape (square, rectangle, trapezoid, diamond) / pentagon, hexagon /
// pick by number of corners. Family: Name shapes by sides. Oracle: shapeFacts.

const SIDES: Partial<Record<ShapeName, number>> = { triangle: 3, square: 4, rectangle: 4, trapezoid: 4, diamond: 4, pentagon: 5, hexagon: 6 };
const FOUR_SIDED: ShapeName[] = ['square', 'rectangle', 'trapezoid', 'diamond'];
const sidesOf = (form: ShapeName): number => SIDES[form] as number;
const WORD = ['no', 'one', 'two', 'three', 'four', 'five', 'six'];
const cap = (text: string): string => text.charAt(0).toUpperCase() + text.slice(1);

const SIDES_HINT = { text: 'Count the sides of each shape.' };

// One shape for each number of sides, so no two options tie.
function oneOfEach(counts: number[], rng: Rng): ShapeName[] {
  return counts.map((count) => rng.pick((Object.keys(SIDES) as ShapeName[]).filter((form) => sidesOf(form) === count)));
}

function nameBySides(level: Level, rng: Rng): QuestionDraft {
  const color = rng.pick(COLOR_NAMES);
  if (level === 3) {
    // Pick the shape with the number of corners asked for.
    const forms = oneOfEach(rng.sample([3, 4, 5, 6], 3), rng);
    const answer = forms[0] as ShapeName;
    const options = rng.shuffle(forms);
    const corners = sidesOf(answer);
    const line = `${cap(a(answer))} has ${corners} corners.`;
    return {
      type: 'choice',
      mode: 'look',
      facts: { shape: answer, ask: 'corners', color, options: options.map(sidesOf) },
      prompt: { text: `Which shape has ${corners} corners?`, speak: ['Which shape has', { number: corners }, 'corners?'] },
      options: options.map((form) => shape(form, color)),
      answerIndex: options.indexOf(answer),
      explanation: { speak: [`${cap(a(answer))} has ${WORD[corners]} corners.`], steps: [line], visual: shape(answer, color, 'l'), hint: { text: 'Count the corners of each shape.' } },
    };
  }
  // Level 1: a triangle against four-sided shapes, or one four-sided shape against others. Level 2: pentagon or hexagon.
  const fourSided = level === 1 && rng.bool();
  const answer: ShapeName = level === 2 ? rng.pick<ShapeName>(['pentagon', 'hexagon']) : fourSided ? rng.pick(FOUR_SIDED) : 'triangle';
  const others: ShapeName[] = level === 2 ? [answer === 'pentagon' ? 'hexagon' : 'pentagon', rng.pick<ShapeName>(['triangle', ...FOUR_SIDED])] : fourSided ? ['triangle', rng.pick<ShapeName>(['pentagon', 'hexagon'])] : rng.sample(FOUR_SIDED, 2);
  const options = rng.shuffle([answer, ...others]);
  const sides = sidesOf(answer);
  const line = `${cap(a(answer))} has ${sides} sides.`;
  const spoken = `${cap(a(answer))} has ${WORD[sides]} sides.`;
  if (fourSided) {
    return {
      type: 'choice',
      mode: 'look',
      facts: { shape: answer, ask: 'sides', color, options: options.map(sidesOf) },
      prompt: { text: 'Which shape has 4 sides?', speak: ['Which shape has', { number: 4 }, 'sides?'] },
      options: options.map((form) => shape(form, color)),
      answerIndex: options.indexOf(answer),
      explanation: { speak: [spoken], steps: [line], visual: shape(answer, color, 'l'), hint: SIDES_HINT },
    };
  }
  const prompt = `Which shape is ${a(answer)}?`;
  return {
    type: 'choice',
    mode: 'look',
    facts: { shape: answer, ask: 'name', color, options },
    prompt: { text: prompt, speak: [prompt] },
    options: options.map((form) => shape(form, color)),
    answerIndex: options.indexOf(answer),
    explanation: { speak: [spoken], steps: [line], visual: shape(answer, color, 'l'), hint: SIDES_HINT },
  };
}

export const nameBySidesGenerator: SkillGenerator = {
  skillId: 'M-2-D1',
  maxLevel: 3,
  itemTypes: ['choice'],
  lists: ['colors'],
  generate: nameBySides,
  exampleSeed: 241,
  example: () => nameBySides(1, makeRng(241)),
  lesson: (): LessonStep[] => [
    { beat: 'see', text: 'A shape gets its name from its sides. Three sides make a triangle.', speak: ['A shape gets its name from its sides. Three sides make a triangle.'], visual: shape('triangle', 'blue', 'l') },
    { beat: 'watch', text: 'Which shape is a pentagon? A pentagon has 5 sides.', speak: ['Which shape is a pentagon? A pentagon has five sides.'], visual: { kind: 'row', children: [shape('pentagon', 'green'), shape('square', 'green')] } },
    { beat: 'try', text: 'Which shape is a hexagon?', speak: ['Which shape is a hexagon?'], visual: { kind: 'row', children: [shape('pentagon', 'orange'), shape('hexagon', 'orange')] }, reveal: { text: 'A hexagon has 6 sides.', speak: ['A hexagon has six sides.'], visual: shape('hexagon', 'orange', 'l') } },
    { beat: 'remember', text: 'The number of sides gives the name.', speak: ['The number of sides gives the name.'], visual: { kind: 'row', children: [shape('triangle', 'blue'), shape('square', 'blue'), shape('pentagon', 'blue'), shape('hexagon', 'blue')] } },
  ],
  oracle: 'shapeFacts',
};

// ---- D.2 Halves, thirds, fourths ----
// Levels: name the fraction shown / pick the shape showing thirds / equal shares of different shapes.
// Families: Name a fraction, and Equal shares. Oracle: fraction.

type Whole = 'circle' | 'rectangle';
const NAMES: Record<number, string> = { 2: 'halves', 3: 'thirds', 4: 'fourths' };
const ONE: Record<number, string> = { 2: 'one half', 3: 'one third', 4: 'one fourth' };
const PARTS = [2, 3, 4];
const cut = (whole: Whole, parts: number, shaded: number, equal = true): Visual => ({ kind: 'fraction', shape: whole, parts, shaded, equal });
const equalLine = (parts: number): string => `${cap(NAMES[parts] as string)} are ${parts} equal parts.`;
const equalSpoken = (parts: number): string => `${cap(NAMES[parts] as string)} are ${WORD[parts]} equal parts.`;

function shares(level: Level, rng: Rng): QuestionDraft {
  const whole = rng.pick<Whole>(['circle', 'rectangle']);
  const parts = rng.pick(PARTS);
  if (level === 1) {
    const prompt = 'What part is shaded?';
    return {
      type: 'choice',
      mode: 'look',
      fixedOrder: true,
      facts: { parts, equal: true, ask: 'name', shape: whole, options: PARTS.map((each) => NAMES[each] as string) },
      prompt: { text: prompt, speak: [prompt] },
      stimulus: cut(whole, parts, 1),
      options: PARTS.map((each): Visual => ({ kind: 'text', value: ONE[each] as string, size: 'l', speak: [ONE[each] as string] })),
      answerIndex: PARTS.indexOf(parts),
      explanation: {
        speak: [`The shape has ${WORD[parts]} equal parts. One is shaded. That is ${ONE[parts]}.`],
        steps: [`The shape has ${parts} equal parts.`, '1 is shaded.', `That is ${ONE[parts]}.`],
        visual: cut(whole, parts, 1),
        hint: { text: 'Count the equal parts. Then count the shaded ones.' },
      },
    };
  }
  // Level 2: three shapes of one kind. Level 3: circles and rectangles mixed, so the share is found in a shape of either kind.
  const other = rng.pick(PARTS.filter((each) => each !== parts));
  const wholeFor = (): Whole => (level === 3 ? rng.pick<Whole>(['circle', 'rectangle']) : whole);
  const options = rng.shuffle([
    { code: NAMES[parts] as string, picture: cut(wholeFor(), parts, 0) },
    { code: NAMES[other] as string, picture: cut(wholeFor(), other, 0) },
    // A shape cut into the right number of parts that are not equal.
    { code: 'unequal', picture: cut(wholeFor(), parts, 0, false) },
  ]);
  const prompt = `Which shape shows ${NAMES[parts]}?`;
  const answerAt = options.findIndex((option) => option.code === NAMES[parts]);
  return {
    type: 'choice',
    mode: 'look',
    facts: { parts, equal: true, ask: 'name', shapes: options.map((option) => (option.picture.kind === 'fraction' ? option.picture.shape : '')), other, options: options.map((option) => option.code) },
    prompt: { text: prompt, speak: [prompt] },
    options: options.map((option) => option.picture),
    answerIndex: answerAt,
    explanation: { speak: [equalSpoken(parts)], steps: [equalLine(parts)], visual: options[answerAt]?.picture ?? cut(whole, parts, 0), hint: { text: 'Look for parts that are all the same size. Then count them.' } },
  };
}

export const halvesThirdsFourthsGenerator: SkillGenerator = {
  skillId: 'M-2-D2',
  maxLevel: 3,
  itemTypes: ['choice'],
  lists: [],
  pool: { 1: 6 }, // halves, thirds or fourths of a circle or a rectangle
  generate: shares,
  exampleSeed: 242,
  example: () => shares(1, makeRng(242)),
  lesson: (): LessonStep[] => [
    { beat: 'see', text: 'Equal parts have names. Two equal parts are halves. Three are thirds. Four are fourths.', speak: ['Equal parts have names. Two equal parts are halves. Three are thirds. Four are fourths.'], visual: { kind: 'row', children: [cut('circle', 2, 0), cut('circle', 3, 0), cut('circle', 4, 0)] } },
    { beat: 'watch', text: 'What part is shaded? The shape has 3 equal parts. 1 is shaded. That is one third.', speak: ['What part is shaded? The shape has three equal parts. One is shaded. That is one third.'], visual: cut('rectangle', 3, 1) },
    { beat: 'try', text: 'Which shape shows fourths?', speak: ['Which shape shows fourths?'], visual: { kind: 'row', children: [cut('circle', 3, 0), cut('circle', 4, 0)] }, reveal: { text: equalLine(4), speak: [equalSpoken(4)], visual: cut('circle', 4, 0) } },
    { beat: 'remember', text: 'Count the equal parts.', speak: ['Count the equal parts.'], visual: cut('rectangle', 4, 1) },
  ],
  oracle: 'fraction',
};
