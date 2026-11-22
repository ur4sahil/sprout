import type { Rng } from '../../../../engine/rng';
import { makeRng } from '../../../../engine/rng';
import type { Hint, LessonStep, Level, QuestionDraft, Say, ShapeName, SortBin, Visual } from '../../../../engine/types';
import type { ColorName } from '../../../data/colors';
import { COLOR_NAMES } from '../../../data/colors';
import type { Countable } from '../../../data/countables';
import { COUNTABLES } from '../../../data/countables';
import type { SkillGenerator } from '../../../generator';
import { PATTERN_HINT } from '../pk/M-PK-D2';
import { SORT_SHAPES, sortHint, sortedLine } from '../pk/M-PK-D3';
import { EMPTY_SPOT } from '../pk/h2-patterns';
import { a, cap, easyToTellApart, shape, tidyGroup, twoClearColors } from '../pk/parts';

// Math K F.1, F.2 and G.1. Families: Order by length, Sorting, Patterns.

// ---- F.1 Compare length and height ----
// Levels: the longer of 2 bars / the shorter or taller of 2 / the longest or shortest of 3.
type Ask = 'most' | 'least';
type Way = 'horizontal' | 'vertical';

function bar(length: number, color: ColorName, orientation: Way): Visual {
  return { kind: 'bar', length, color, orientation };
}

function lengthQuestion(word: string, ask: Ask, values: number[], color: ColorName, orientation: Way): QuestionDraft {
  const wanted = ask === 'most' ? Math.max(...values) : Math.min(...values);
  const answerIndex = values.indexOf(wanted);
  const prompt = `Which one is ${word}?`;
  return {
    type: 'choice',
    mode: 'look',
    facts: { values, ask, word, color, orientation, options: values },
    prompt: { text: prompt, speak: [prompt] },
    options: values.map((length) => bar(length, color, orientation)),
    answerIndex,
    explanation: { speak: [`This one is ${word}.`], steps: ['Line up one end, then look at the other.', `This one is ${word}.`], visual: bar(wanted, color, orientation), hint: { text: 'Line up the starting ends. Then look at the other ends.' } },
  };
}

// Lengths that differ by at least 2 units, so the difference is plain to see.
function lengths(count: number, rng: Rng): number[] {
  for (;;) {
    const values = rng.sample([1, 2, 3, 4, 5, 6, 7, 8], count);
    const sorted = values.slice().sort((x, y) => x - y);
    if (sorted.every((value, i) => i === 0 || value - (sorted[i - 1] as number) >= 2)) return values;
  }
}

function compareLength(level: Level, rng: Rng): QuestionDraft {
  const color = rng.pick(COLOR_NAMES);
  if (level === 1) return lengthQuestion('longer', 'most', lengths(2, rng), color, 'horizontal');
  if (level === 2) {
    const word = rng.pick(['shorter', 'taller']);
    return lengthQuestion(word, word === 'taller' ? 'most' : 'least', lengths(2, rng), color, word === 'taller' ? 'vertical' : rng.pick<Way>(['horizontal', 'vertical']));
  }
  const word = rng.pick(['the longest', 'the shortest']);
  return lengthQuestion(word, word === 'the longest' ? 'most' : 'least', lengths(3, rng), color, 'horizontal');
}

export const compareLengthGenerator: SkillGenerator = {
  skillId: 'M-K-F1',
  maxLevel: 3,
  itemTypes: ['choice'],
  lists: ['colors'],
  generate: compareLength,
  exampleSeed: 51,
  example: () => compareLength(1, makeRng(51)),
  lesson: (): LessonStep[] => {
    const pair: Visual = { kind: 'row', children: [bar(6, 'blue', 'horizontal'), bar(3, 'blue', 'horizontal')] };
    return [
      { beat: 'see', text: 'Some things are longer. Some are shorter.', speak: ['Some things are longer. Some are shorter.'], visual: pair },
      { beat: 'watch', text: 'Which one is longer? Line up one end, then look at the other. This one is longer.', speak: ['Which one is longer? Line up one end, then look at the other. This one is longer.'], visual: bar(6, 'blue', 'horizontal') },
      {
        beat: 'try',
        text: 'Which one is taller?',
        speak: ['Which one is taller?'],
        visual: { kind: 'row', children: [bar(2, 'green', 'vertical'), bar(5, 'green', 'vertical')] },
        reveal: { text: 'This one is taller.', speak: ['This one is taller.'], visual: bar(5, 'green', 'vertical') },
      },
      { beat: 'remember', text: 'Line up one end, then look at the other.', speak: ['Line up one end, then look at the other.'], visual: pair },
    ];
  },
  oracle: 'compare',
};

// ---- F.2 Sort and count ----
// Levels: sort 5 items into 2 groups / sort 6 items / a picture already sorted: which group has more.
const SHAPES: ShapeName[] = ['circle', 'square', 'triangle', 'star', 'heart'];

function sides(count: number, rng: Rng): number[] {
  const first = rng.int(1, count - 1);
  return rng.shuffle(Array.from({ length: count }, (_, i) => (i < first ? 0 : 1)));
}

// What each group holds, said with the group's name (as in pre-K D.3), never "these ones".
function sortExplanation(by: string, groups: readonly string[], visual: Visual): QuestionDraft['explanation'] {
  const steps = groups.map((group) => sortedLine(by, group));
  return { speak: [steps.join(' ')], steps, visual, hint: sortHint(by) };
}

function sortQuestion(count: number, rng: Rng): QuestionDraft {
  const byColour = rng.int(0, 1) === 0;
  const where = sides(count, rng);
  const prompt = SORT_SHAPES;
  if (byColour) {
    const colors = twoClearColors(rng);
    const attrs = where.map((s) => colors[s] as ColorName);
    const items = attrs.map((color) => shape(rng.pick(SHAPES), color));
    const bins: SortBin[] = colors.map((color) => ({ label: cap(color), speak: [color], icon: bar(2, color, 'horizontal') }));
    return {
      type: 'sort',
      mode: 'look',
      facts: { oracle: 'sortBy', itemAttrs: attrs, binAttrs: colors, by: 'colour' },
      prompt: { text: prompt, speak: [prompt] },
      items,
      bins,
      answerBin: attrs.map((attr) => colors.indexOf(attr)),
      explanation: sortExplanation('colour', colors, { kind: 'row', children: items.filter((_, i) => attrs[i] === colors[0]) }),
    };
  }
  const forms = rng.sample(SHAPES, 2) as [ShapeName, ShapeName];
  const attrs = where.map((s) => forms[s] as ShapeName);
  const items = attrs.map((form) => shape(form, rng.pick(COLOR_NAMES)));
  const bins: SortBin[] = forms.map((form) => ({ label: cap(`${form}s`), speak: [`${form}s`], icon: shape(form, 'black', 's') }));
  return {
    type: 'sort',
    mode: 'look',
    facts: { oracle: 'sortBy', itemAttrs: attrs, binAttrs: forms, by: 'shape' },
    prompt: { text: prompt, speak: [prompt] },
    items,
    bins,
    answerBin: attrs.map((attr) => forms.indexOf(attr)),
    explanation: sortExplanation('shape', [`${forms[0]}s`, `${forms[1]}s`], { kind: 'row', children: items.filter((_, i) => attrs[i] === forms[0]) }),
  };
}

// Two kinds of thing, already in their groups. Which group has more?
function whichHasMore(rng: Rng): QuestionDraft {
  const things = rng.sample(COUNTABLES, 2) as [Countable, Countable];
  const a = rng.int(1, 6);
  let b = rng.int(1, 6);
  while (b === a) b = rng.int(1, 6);
  const values = [a, b];
  const answerIndex = a > b ? 0 : 1;
  const more = things[answerIndex] as Countable;
  const prompt = 'Which group has more?';
  const said: Say = ['I see', { number: a }, `${a === 1 ? things[0].one : things[0].many}`, 'and', { number: b }, `${b === 1 ? things[1].one : things[1].many}.`, { number: Math.max(a, b) }, 'is more than', { number: Math.min(a, b) }, '.'];
  return {
    type: 'choice',
    mode: 'look',
    facts: { oracle: 'compare', values, ask: 'most', things: things.map((thing) => thing.one), options: values },
    prompt: { text: prompt, speak: [prompt] },
    options: values.map((n, i) => tidyGroup(things[i] as Countable, n)),
    answerIndex,
    explanation: {
      speak: said,
      steps: [`I see ${a} ${a === 1 ? things[0].one : things[0].many} and ${b} ${b === 1 ? things[1].one : things[1].many}.`, `${Math.max(a, b)} is more than ${Math.min(a, b)}.`],
      visual: tidyGroup(more, Math.max(a, b)),
      hint: { text: 'Count each group. Which count is bigger?' },
    },
  };
}

const sortAndCount = (level: Level, rng: Rng): QuestionDraft => (level === 1 ? sortQuestion(5, rng) : level === 2 ? sortQuestion(6, rng) : whichHasMore(rng));

export const sortAndCountGenerator: SkillGenerator = {
  skillId: 'M-K-F2',
  maxLevel: 3,
  itemTypes: ['sort', 'choice'],
  lists: ['colors', 'countables'],
  generate: sortAndCount,
  exampleSeed: 52,
  example: () => sortAndCount(1, makeRng(52)),
  lesson: (): LessonStep[] => {
    const reds: Visual = { kind: 'row', children: [shape('circle', 'red'), shape('star', 'red'), shape('heart', 'red')] };
    const blues: Visual = { kind: 'row', children: [shape('square', 'blue'), shape('triangle', 'blue')] };
    return [
      { beat: 'see', text: 'First sort. Then count each group.', speak: ['First sort. Then count each group.'], visual: { kind: 'row', children: [shape('circle', 'red'), shape('square', 'blue'), shape('star', 'red')] } },
      { beat: 'watch', text: sortExplanation('colour', ['red', 'blue'], reds).steps.join(' '), speak: sortExplanation('colour', ['red', 'blue'], reds).speak, visual: reds },
      {
        beat: 'try',
        text: 'Which group has more?',
        speak: ['Which group has more?'],
        visual: { kind: 'row', children: [reds, blues] },
        reveal: { text: 'I see 3 red and 2 blue. 3 is more than 2.', speak: ['I see', { number: 3 }, 'red and', { number: 2 }, 'blue.', { number: 3 }, 'is more than', { number: 2 }, '.'], visual: reds },
      },
      { beat: 'remember', text: 'Things in a group share something.', speak: ['Things in a group share something.'], visual: reds },
    ];
  },
  oracle: 'sortBy',
};

// ---- G.1 Patterns: AAB, ABB, ABC ----
// Levels: ABB or AAB / ABC / a blank in the middle.
interface Part {
  name: string;
  picture: Visual;
}

// A shape is said with "a" ("a square"); a colour on its own ("red"). Several of one: "two squares", "two reds".
const called = (part: Part, by: string): string => (by === 'shape' ? a(part.name) : part.name);

// What comes next, as a rule that is always true of the pattern (the wording audit, Nov 21, 2026). With a part that
// comes once in the unit, the part before the gap is enough: "After a circle comes a square." With a part that
// comes twice (AAB, ABB), it is not: in square, square, circle the first square is followed by a square. So say
// how many came before: "After two squares comes a circle." or "After one square comes a second square."
export function nextRule(unit: Part[], order: number[], blankAt: number, by: string): string {
  const at = (i: number): number => order[((i % order.length) + order.length) % order.length] as number;
  const before = unit[at(blankAt - 1)] as Part;
  const answer = unit[at(blankAt)] as Part;
  if (order.filter((i) => i === at(blankAt - 1)).length === 1) return `After ${called(before, by)} comes ${called(answer, by)}.`;
  if (at(blankAt - 2) === at(blankAt - 1)) return `After two ${before.name}s comes ${called(answer, by)}.`;
  return `After one ${before.name} comes a second ${before.name}.`;
}

// Two or three colours, each easy to tell from the others.
function clearColors(count: 2 | 3, rng: Rng): ColorName[] {
  const [one, two] = twoClearColors(rng);
  if (count === 2) return [one, two];
  for (;;) {
    const third = rng.pick(COLOR_NAMES);
    if (easyToTellApart(one, third) && easyToTellApart(two, third)) return [one, two, third];
  }
}

function patternExplanation(unit: Part[], order: number[], blankAt: number, total: number, by: string): { speak: Say; steps: string[]; visual: Visual; hint: Hint } {
  const at = (i: number): Part => unit[order[i % order.length] as number] as Part;
  const names = order.map((i) => (unit[i] as Part).name).join(', ');
  const answer = at(blankAt);
  const last = blankAt === total - 1;
  const ending = last ? nextRule(unit, order, blankAt, by) : `${cap(called(answer, by))} goes in the empty spot.`;
  return {
    speak: [`The pattern is ${names}, and it repeats. ${ending}`],
    steps: [`The pattern is ${names}, and it repeats.`, ending],
    visual: { kind: 'sequence', items: Array.from({ length: total }, (_, i) => at(i).picture) },
    hint: last ? PATTERN_HINT : { text: 'Say the pattern out loud. What fits in the empty spot?' },
  };
}

function patternQuestion(unit: Part[], order: number[], blankAt: number, total: number, by: string, rng: Rng): QuestionDraft {
  const at = (i: number): Part => unit[order[i % order.length] as number] as Part;
  const offered = rng.shuffle(unit);
  const answer = at(blankAt);
  // A blank inside the pattern is asked the same way as in pre-K D.4.
  const prompt = blankAt === total - 1 ? 'What comes next?' : EMPTY_SPOT;
  return {
    type: 'choice',
    mode: 'look',
    facts: { unit: order.map((i) => (unit[i] as Part).name), shown: blankAt, total, by, options: offered.map((part) => part.name) },
    prompt: { text: prompt, speak: [prompt] },
    stimulus: { kind: 'sequence', items: Array.from({ length: total }, (_, i) => (i === blankAt ? 'blank' : at(i).picture)) },
    options: offered.map((part) => part.picture),
    answerIndex: offered.indexOf(answer),
    explanation: patternExplanation(unit, order, blankAt, total, by),
  };
}

function parts(count: 2 | 3, rng: Rng): { by: string; unit: Part[] } {
  if (rng.int(0, 1) === 0) {
    const form = rng.pick(SHAPES);
    return { by: 'colour', unit: clearColors(count, rng).map((color) => ({ name: color, picture: shape(form, color, 's') })) };
  }
  const color = rng.pick(COLOR_NAMES);
  return { by: 'shape', unit: rng.sample(SHAPES, count).map((form) => ({ name: form, picture: shape(form, color, 's') })) };
}

function threePartPatterns(level: Level, rng: Rng): QuestionDraft {
  if (level === 1) {
    const { by, unit } = parts(2, rng);
    const order = rng.pick([[0, 1, 1], [0, 0, 1]]);
    const total = rng.int(7, 9); // two full turns of the pattern, then the blank
    return patternQuestion(unit, order, total - 1, total, by, rng);
  }
  const { by, unit } = parts(3, rng);
  const total = level === 2 ? rng.int(7, 9) : 8;
  return patternQuestion(unit, [0, 1, 2], level === 2 ? total - 1 : rng.int(3, 6), total, by, rng);
}

export const patternsGenerator: SkillGenerator = {
  skillId: 'M-K-G1',
  maxLevel: 3,
  itemTypes: ['choice'],
  lists: ['colors'],
  generate: threePartPatterns,
  exampleSeed: 61,
  example: () => threePartPatterns(1, makeRng(61)),
  lesson: (): LessonStep[] => {
    const red: Part = { name: 'red', picture: shape('circle', 'red', 's') };
    const blue: Part = { name: 'blue', picture: shape('circle', 'blue', 's') };
    const yellow: Part = { name: 'yellow', picture: shape('circle', 'yellow', 's') };
    const abb = patternExplanation([red, blue], [0, 1, 1], 6, 7, 'colour');
    const abc = patternExplanation([red, blue, yellow], [0, 1, 2], 7, 8, 'colour');
    return [
      { beat: 'see', text: 'A pattern has a part that repeats: red, blue, blue.', speak: ['A pattern has a part that repeats: red, blue, blue.'], visual: { kind: 'sequence', items: [red.picture, blue.picture, blue.picture, red.picture, blue.picture, blue.picture] } },
      { beat: 'watch', text: abb.steps.join(' '), speak: abb.speak, visual: abb.visual },
      {
        beat: 'try',
        text: 'What comes next?',
        speak: ['What comes next?'],
        visual: { kind: 'sequence', items: [red.picture, blue.picture, yellow.picture, red.picture, blue.picture, yellow.picture, red.picture, 'blank'] },
        reveal: { text: abc.steps.join(' '), speak: abc.speak, visual: abc.visual },
      },
      { beat: 'remember', text: 'Find the part that repeats.', speak: ['Find the part that repeats.'], visual: { kind: 'sequence', items: [red.picture, blue.picture, blue.picture] } },
    ];
  },
  oracle: 'pattern',
};
