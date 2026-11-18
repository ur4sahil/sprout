import type { Rng } from '../../../../engine/rng';
import { makeRng } from '../../../../engine/rng';
import type { LessonStep, Level, QuestionDraft, Say, ShapeName, Visual } from '../../../../engine/types';
import type { FigureId } from '../../../../engine/figures';
import { figureFor } from '../../../../engine/figures';
import type { SkillGenerator } from '../../../generator';
import { shape } from '../pk/parts';

// Kindergarten skills added by the Nov 17, 2026 curriculum check (plan section 8): E.4 position words,
// E.5 shapes made from shapes, F.3 what can be measured.

type Explanation = { speak: Say; steps: string[]; visual: Visual };
// Words with numbers in them, said with each number as a number.
const spoken = (words: string): Say => words.split(/(\d+)/).filter((part) => part.length > 0).map((part) => (/^\d+$/.test(part) ? { number: Number(part) } : part));
const say = (value: string): Visual => ({ kind: 'text', value, size: 'l', speak: [value] });

// ---- E.4 Position words ----
// Levels: above or below / above, below or beside / which picture shows it. Oracle: position.
// Two things on a 5 by 4 grid: slot = row * 5 + column.

type Where = 'above' | 'below' | 'beside';
const THINGS = [
  { emoji: '🐱', name: 'cat' },
  { emoji: '🐶', name: 'dog' },
  { emoji: '⚽', name: 'ball' },
  { emoji: '🐦', name: 'bird' },
] as const;
const BOX = { emoji: '📦', name: 'box' };

function placed(where: Where, rng: Rng): [number, number] {
  const col = rng.int(where === 'beside' ? 0 : 1, where === 'beside' ? 3 : 3);
  const row = rng.int(where === 'above' ? 1 : 0, where === 'below' ? 2 : 3);
  const box = row * 5 + col;
  const thing = where === 'above' ? box - 5 : where === 'below' ? box + 5 : box + 1;
  return [thing, box];
}

const scene = (emoji: string, thing: number, box: number): Visual => ({ kind: 'emojiGroup', emoji, count: 1, emoji2: BOX.emoji, count2: 1, layout: 'scatter', slots: [thing, box] });

function positionExplanation(name: string, where: Where, visual: Visual): Explanation {
  const line = `The ${name} is ${where === 'beside' ? 'beside, next to,' : where} the box.`;
  return { speak: [line], steps: [line], visual };
}

function positions(level: Level, rng: Rng): QuestionDraft {
  const thing = rng.pick(THINGS);
  if (level === 3) {
    const want = rng.pick<Where>(['above', 'below', 'beside']);
    const order = rng.shuffle<Where>(['above', 'below', 'beside']);
    const slots = order.map((each) => placed(each, rng));
    const prompt = `Which picture shows the ${thing.name} ${want === 'beside' ? 'next to' : want} the box?`;
    return {
      type: 'choice',
      mode: 'look',
      facts: { ask: 'pick', want, slots: slots.map(([a, b]) => [a, b]), options: [...order] },
      prompt: { text: prompt, speak: [prompt] },
      options: slots.map(([a, b]) => scene(thing.emoji, a, b)),
      answerIndex: order.indexOf(want),
      explanation: positionExplanation(thing.name, want, scene(thing.emoji, ...(slots[order.indexOf(want)] as [number, number]))),
    };
  }
  const words: Where[] = level === 1 ? ['above', 'below'] : ['above', 'below', 'beside'];
  const where = rng.pick(words);
  const [a, b] = placed(where, rng);
  const prompt = `Where is the ${thing.name}?`;
  const visual = scene(thing.emoji, a, b);
  return {
    type: 'choice',
    mode: 'look',
    fixedOrder: true,
    facts: { ask: 'where', slots: [[a, b]], options: words.map((word) => `${word} the box`) },
    prompt: { text: prompt, speak: [prompt] },
    stimulus: visual,
    options: words.map((word) => say(`${word === 'beside' ? 'next to' : word} the box`)),
    answerIndex: words.indexOf(where),
    explanation: positionExplanation(thing.name, where, visual),
  };
}

export const positionWordsGenerator: SkillGenerator = {
  skillId: 'M-K-E4',
  maxLevel: 3,
  itemTypes: ['choice'],
  lists: [],
  generate: positions,
  exampleSeed: 641,
  example: () => positions(1, makeRng(641)),
  lesson: (): LessonStep[] => [
    { beat: 'see', text: 'Above means higher up. Below means lower down. Next to means at the side.', speak: ['Above means higher up. Below means lower down. Next to means at the side.'], visual: scene('🐱', 7, 12) },
    { beat: 'watch', text: 'The cat is above the box.', speak: ['The cat is above the box.'], visual: scene('🐱', 7, 12) },
    { beat: 'try', text: 'Where is the ball?', speak: ['Where is the ball?'], visual: scene('⚽', 13, 12), reveal: { text: 'The ball is next to the box.', speak: ['The ball is next to the box.'], visual: scene('⚽', 13, 12) } },
    { beat: 'remember', text: 'Above, below, next to.', speak: ['Above, below, next to.'], visual: scene('🐦', 2, 7) },
  ],
  oracle: 'position',
};

// ---- E.5 Shapes made from shapes ----
// Levels: two pieces / more pieces / which pieces make it. Oracle: composeShape.

const MADE: readonly { piece: ShapeName; count: number; makes: ShapeName }[] = [
  { piece: 'square', count: 2, makes: 'rectangle' },
  { piece: 'triangle', count: 2, makes: 'square' },
  { piece: 'trapezoid', count: 2, makes: 'hexagon' },
  { piece: 'triangle', count: 6, makes: 'hexagon' },
  { piece: 'square', count: 4, makes: 'square' },
];
const CANNOT: ShapeName[] = ['circle', 'heart', 'oval', 'star'];
// The pieces of a shape, drawn as the real pieces that fit it (pulled a little apart), never as loose shapes of
// the same name: two triangles that make a square are the square's two halves.
function figureOf(piece: ShapeName, count: number, makes: ShapeName): FigureId {
  const found = figureFor(makes, piece, count);
  if (!found) throw new Error(`No figure for ${count} ${piece}s making a ${makes}`);
  return found;
}
const pieces = (piece: ShapeName, count: number, makes: ShapeName): Visual => ({ kind: 'figure', figure: figureOf(piece, count, makes), show: 'pieces' });

function composeExplanation(entry: (typeof MADE)[number]): Explanation {
  const line = `${entry.count} ${entry.piece}s put together make a ${entry.makes === 'square' && entry.piece === 'square' ? 'bigger square' : entry.makes}.`;
  return { speak: spoken(line), steps: [line], visual: { kind: 'figure', figure: figureOf(entry.piece, entry.count, entry.makes), show: 'cut' } };
}

function composeShapes(level: Level, rng: Rng): QuestionDraft {
  const pool = level === 1 ? MADE.filter((each) => each.count === 2) : MADE;
  const entry = rng.pick(pool);
  if (level === 3) {
    // Which pieces make this shape? The other piece sets make something else.
    const others = MADE.filter((each) => each.makes !== entry.makes);
    const choices = rng.shuffle([entry, ...rng.sample(others, 2)]);
    const prompt = `Which pieces can make a ${entry.makes}?`;
    return {
      type: 'choice',
      mode: 'look',
      facts: { ask: 'pieces', makes: entry.makes, options: choices.map((each) => `${each.count} ${each.piece}`) },
      prompt: { text: prompt, speak: [prompt] },
      stimulus: shape(entry.makes, 'orange', 'l'),
      options: choices.map((each) => pieces(each.piece, each.count, each.makes)),
      answerIndex: choices.indexOf(entry),
      explanation: composeExplanation(entry),
    };
  }
  const choices = rng.shuffle([entry.makes, ...rng.sample(CANNOT, 2)]);
  const prompt = `Put the ${entry.piece}s together. Which shape can they make?`;
  return {
    type: 'choice',
    mode: 'look',
    facts: { ask: 'makes', piece: entry.piece, count: entry.count, options: choices },
    prompt: { text: prompt, speak: [prompt] },
    stimulus: pieces(entry.piece, entry.count, entry.makes),
    options: choices.map((each) => ({ ...shape(each, 'orange', 'm'), speak: [each] }) as Visual),
    answerIndex: choices.indexOf(entry.makes),
    explanation: composeExplanation(entry),
  };
}

export const composeShapesGenerator: SkillGenerator = {
  skillId: 'M-K-E5',
  maxLevel: 3,
  itemTypes: ['choice'],
  lists: [],
  pool: { 1: 3, 2: 5, 3: 3 },
  generate: composeShapes,
  exampleSeed: 642,
  example: () => composeShapes(1, makeRng(642)),
  lesson: (): LessonStep[] => [
    { beat: 'see', text: 'Small shapes can be put together to make bigger shapes.', speak: ['Small shapes can be put together to make bigger shapes.'], visual: pieces('square', 2, 'rectangle') },
    { beat: 'watch', text: '2 squares side by side make a rectangle.', speak: ['Two squares side by side make a rectangle.'], visual: shape('rectangle', 'blue', 'l') },
    { beat: 'try', text: 'Put the triangles together. Which shape can they make?', speak: ['Put the triangles together. Which shape can they make?'], visual: pieces('triangle', 2, 'square'), reveal: { text: '2 triangles make a square.', speak: ['Two triangles make a square.'], visual: { kind: 'figure', figure: 'square-2tri', show: 'cut' } } },
    { beat: 'remember', text: 'Shapes fit together to make new shapes.', speak: ['Shapes fit together to make new shapes.'], visual: pieces('trapezoid', 2, 'hexagon') },
  ],
  oracle: 'composeShape',
};

// ---- F.3 What can be measured ----
// Levels: what a ruler or a scale tells / and a measuring cup / which tool to use. Oracle: measureTool.

const TOOLS = [
  { emoji: '📏', name: 'a ruler', tells: 'how long' },
  { emoji: '⚖️', name: 'a scale', tells: 'how heavy' },
  { emoji: '🥛', name: 'a measuring cup', tells: 'how much it holds' },
] as const;

function measurable(level: Level, rng: Rng): QuestionDraft {
  const tools = level === 1 ? TOOLS.slice(0, 2) : TOOLS;
  const tool = rng.pick(tools);
  const why: Explanation = { speak: [`${tool.name} tells ${tool.tells}.`], steps: [`${tool.name.replace(/^a/, 'A')} tells ${tool.tells}.`], visual: { kind: 'emojiGroup', emoji: tool.emoji, count: 1, layout: 'row' } };
  if (level === 3) {
    const prompt = `What do you use to find ${tool.tells}?`;
    return {
      type: 'choice',
      mode: 'look',
      fixedOrder: true,
      facts: { ask: 'tool', want: tool.tells, options: TOOLS.map((each) => each.name) },
      prompt: { text: prompt, speak: [prompt] },
      options: TOOLS.map((each): Visual => ({ kind: 'emojiGroup', emoji: each.emoji, count: 1, layout: 'row', speak: [each.name] })),
      answerIndex: TOOLS.indexOf(tool),
      explanation: why,
    };
  }
  const prompt = `What can ${tool.name} tell you?`;
  return {
    type: 'choice',
    mode: 'look',
    fixedOrder: true,
    facts: { ask: 'tells', tool: tool.name, options: tools.map((each) => each.tells) },
    prompt: { text: prompt, speak: [prompt] },
    stimulus: { kind: 'emojiGroup', emoji: tool.emoji, count: 1, layout: 'row', speak: [tool.name] },
    options: tools.map((each) => say(each.tells)),
    answerIndex: tools.indexOf(tool),
    explanation: why,
  };
}

export const measurableGenerator: SkillGenerator = {
  skillId: 'M-K-F3',
  maxLevel: 3,
  itemTypes: ['choice'],
  lists: [],
  pool: { 1: 2, 2: 3, 3: 3 },
  generate: measurable,
  exampleSeed: 643,
  example: () => measurable(1, makeRng(643)),
  lesson: (): LessonStep[] => [
    { beat: 'see', text: 'We can measure how long, how heavy, and how much something holds.', speak: ['We can measure how long, how heavy, and how much something holds.'], visual: { kind: 'row', children: TOOLS.map((each): Visual => ({ kind: 'emojiGroup', emoji: each.emoji, count: 1, layout: 'row' })) } },
    { beat: 'watch', text: 'A ruler tells how long.', speak: ['A ruler tells how long.'], visual: { kind: 'emojiGroup', emoji: '📏', count: 1, layout: 'row' } },
    { beat: 'try', text: 'What can a scale tell you?', speak: ['What can a scale tell you?'], visual: { kind: 'emojiGroup', emoji: '⚖️', count: 1, layout: 'row' }, reveal: { text: 'A scale tells how heavy.', speak: ['A scale tells how heavy.'], visual: { kind: 'emojiGroup', emoji: '⚖️', count: 1, layout: 'row' } } },
    { beat: 'remember', text: 'Ruler: long. Scale: heavy. Cup: holds.', speak: ['Ruler: long. Scale: heavy. Cup: holds.'], visual: { kind: 'emojiGroup', emoji: '🥛', count: 1, layout: 'row' } },
  ],
  oracle: 'measureTool',
};
