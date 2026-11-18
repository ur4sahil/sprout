import type { Rng } from '../../../engine/rng';
import { makeRng } from '../../../engine/rng';
import type { LessonStep, Level, QuestionDraft, ShapeName, Visual } from '../../../engine/types';
import type { ColorName } from '../../data/colors';
import { COLOR_NAMES } from '../../data/colors';
import type { SkillGenerator } from '../../generator';
import type { Explanation } from '../ela/pk/parts';
import { pickApart, row } from '../ela/pk/parts';
import { a, easyToTellApart, shape, twoClearColors } from '../math/pk/parts';

// Reasoning A.3, A.4, A.7 and A.13: figure analogies, matrices, two-rule patterns and pattern completion.

const FORMS: ShapeName[] = ['circle', 'square', 'triangle', 'star', 'heart'];
type Size = 's' | 'l';
const SIZE_WORD: Record<string, string> = { s: 'small', m: 'big', l: 'big' };

// A figure as the oracle sees it: [shape, colour, size].
type Figure = [ShapeName, ColorName, Size];
const draw = ([form, color, size]: Figure): Visual => shape(form, color, size);
const code = (figure: readonly string[]): string => figure.join('|');

// A colour that is easy to tell from every colour given.
function clearFrom(others: ColorName[], rng: Rng): ColorName {
  return rng.pick(COLOR_NAMES.filter((color) => others.every((other) => easyToTellApart(color, other))));
}

// ---- A.3 Figure analogies ----
// Levels: one attribute changes / two change / three of four change (shape, colour, size and how many),
// and every wrong option misses one of the three changes.

const ATTRIBUTE = ['shape', 'color', 'size'] as const;
const ANALOGY = 'Look at the first pair. Which one finishes the second pair the same way?';

// The same figure with attribute `i` changed to something else.
function changed(figure: Figure, i: number, rng: Rng): Figure {
  const out: Figure = [...figure];
  if (i === 0) out[0] = rng.pick(FORMS.filter((form) => form !== figure[0]));
  else if (i === 1) out[1] = clearFrom([figure[1]], rng);
  else out[2] = figure[2] === 's' ? 'l' : 's';
  return out;
}

const worded = (i: number, value: string): string => (i === 2 ? (SIZE_WORD[value] as string) : value);

function analogyExplanation(from: Figure, to: Figure, answer: Figure): Explanation {
  const changes = [0, 1, 2].filter((i) => from[i] !== to[i]).map((i) => `${ATTRIBUTE[i]} from ${worded(i, from[i] as string)} to ${worded(i, to[i] as string)}`);
  const line = `The first pair changes ${changes.join(', and ')}.`;
  return { speak: [`${line} Do the same here.`], steps: [line, 'Do the same here.'], visual: draw(answer) };
}

function figureAnalogy(level: Level, rng: Rng): QuestionDraft {
  const from: Figure = [rng.pick(FORMS), rng.pick(COLOR_NAMES), rng.pick<Size>(['s', 'l'])];
  const moving = rng.sample([0, 1, 2], level === 1 ? 1 : 2);
  const still = [0, 1, 2].filter((i) => !moving.includes(i));
  let to = from;
  for (const i of moving) to = changed(to, i, rng);
  // The second pair starts the same way in what changes, and differs in something that does not.
  let base = from;
  for (const i of level === 1 ? rng.sample(still, rng.int(1, 2)) : still) base = changed(base, i, rng);
  const answer: Figure = [...base];
  for (const i of moving) (answer as string[])[i] = to[i] as string;
  // Wrong options: at level 1 the second pair left unchanged, and the first pair's answer copied.
  // At level 2, only one of the two changes made.
  const partly = (i: number): Figure => {
    const out: Figure = [...base];
    (out as string[])[i] = to[i] as string;
    return out;
  };
  const wrong: Figure[] = level === 1 ? [base, to] : moving.map(partly);
  const options = rng.shuffle([answer, ...wrong]);
  return {
    type: 'choice',
    mode: 'look',
    facts: { from, to, base, options: options.map(code) },
    prompt: { text: ANALOGY, speak: [ANALOGY] },
    stimulus: { kind: 'matrix', cells: [draw(from), draw(to), draw(base), 'blank'] },
    options: options.map(draw),
    answerIndex: options.indexOf(answer),
    explanation: analogyExplanation(from, to, answer),
  };
}

// Level 3: a figure is [shape, colour, size, how many]. Sizes are small and middle, so two fit in a box.
type Figure4 = [ShapeName, ColorName, 's' | 'm', '1' | '2'];
const ATTRIBUTE4 = ['shape', 'color', 'size', 'number of shapes'] as const;

function draw4([form, color, size, count]: Figure4): Visual {
  return count === '1' ? shape(form, color, size) : row(shape(form, color, size), shape(form, color, size));
}

function changed4(figure: Figure4, i: number, rng: Rng): Figure4 {
  const out: Figure4 = [...figure];
  if (i === 0) out[0] = rng.pick(FORMS.filter((form) => form !== figure[0]));
  else if (i === 1) out[1] = clearFrom([figure[1]], rng);
  else if (i === 2) out[2] = figure[2] === 's' ? 'm' : 's';
  else out[3] = figure[3] === '1' ? '2' : '1';
  return out;
}

const worded4 = (i: number, value: string): string => (i === 2 ? (SIZE_WORD[value] as string) : i === 3 ? (value === '1' ? 'one' : 'two') : value);

function threeChanges(rng: Rng): QuestionDraft {
  const from: Figure4 = [rng.pick(FORMS), rng.pick(COLOR_NAMES), rng.pick<'s' | 'm'>(['s', 'm']), rng.pick<'1' | '2'>(['1', '2'])];
  const still = rng.int(0, 3);
  const moving = [0, 1, 2, 3].filter((i) => i !== still);
  let to = from;
  for (const i of moving) to = changed4(to, i, rng);
  // The second pair differs from the first in the one thing that does not change.
  const base = changed4(from, still, rng);
  const answer: Figure4 = [...base];
  for (const i of moving) (answer as string[])[i] = to[i] as string;
  // Each wrong option leaves out one of the three changes.
  const missed = (i: number): Figure4 => {
    const out: Figure4 = [...answer];
    (out as string[])[i] = base[i] as string;
    return out;
  };
  const options = rng.shuffle([answer, ...moving.map(missed)]);
  const changes = moving.map((i) => `${ATTRIBUTE4[i] as string} from ${worded4(i, from[i] as string)} to ${worded4(i, to[i] as string)}`);
  const line = `The first pair changes ${changes.slice(0, -1).join(', ')}, and ${changes.at(-1) as string}.`;
  return {
    type: 'choice',
    mode: 'look',
    facts: { from, to, base, options: options.map(code) },
    prompt: { text: ANALOGY, speak: [ANALOGY] },
    stimulus: { kind: 'matrix', cells: [draw4(from), draw4(to), draw4(base), 'blank'] },
    options: options.map(draw4),
    answerIndex: options.indexOf(answer),
    explanation: { speak: [`${line} Do all three here.`], steps: [line, 'Do all three here.'], visual: draw4(answer) },
  };
}

const analogy = (level: Level, rng: Rng): QuestionDraft => (level === 3 ? threeChanges(rng) : figureAnalogy(level, rng));

function analogyLesson(): LessonStep[] {
  const [from, to, base, answer]: Figure[] = [['circle', 'red', 'l'], ['circle', 'red', 's'], ['square', 'blue', 'l'], ['square', 'blue', 's']];
  const [from2, to2, base2, answer2]: Figure[] = [['star', 'green', 'l'], ['star', 'orange', 'l'], ['heart', 'green', 'l'], ['heart', 'orange', 'l']];
  const shown = analogyExplanation(from as Figure, to as Figure, answer as Figure);
  const revealed = analogyExplanation(from2 as Figure, to2 as Figure, answer2 as Figure);
  return [
    { beat: 'see', text: 'Look at how a pair changes. The big circle becomes a small circle.', speak: ['Look at how a pair changes. The big circle becomes a small circle.'], visual: row(draw(from as Figure), draw(to as Figure)) },
    { beat: 'watch', text: shown.steps.join(' '), speak: shown.speak, visual: { kind: 'matrix', cells: [draw(from as Figure), draw(to as Figure), draw(base as Figure), draw(answer as Figure)] } },
    {
      beat: 'try',
      text: ANALOGY,
      speak: [ANALOGY],
      visual: { kind: 'matrix', cells: [draw(from2 as Figure), draw(to2 as Figure), draw(base2 as Figure), 'blank'] },
      reveal: { text: revealed.steps.join(' '), speak: revealed.speak, visual: revealed.visual },
    },
    { beat: 'remember', text: 'Find what changed, then do it again.', speak: ['Find what changed, then do it again.'], visual: row(draw(base as Figure), draw(answer as Figure)) },
  ];
}

export const figureAnalogiesGenerator: SkillGenerator = {
  skillId: 'R-A3',
  maxLevel: 3,
  itemTypes: ['choice'],
  lists: ['colors'],
  generate: analogy,
  exampleSeed: 83,
  example: () => analogy(1, makeRng(83)),
  lesson: analogyLesson,
  oracle: 'analogy',
};

// ---- A.4 Figure matrices ----
// Levels: 2 by 2 grid, rows share shape and columns share colour / size and count / rotation /
// 3 by 3 grid: each row shares a colour, and each row and column holds each of three shapes once.

const MATRIX = 'Which one goes in the empty box?';

interface Grid {
  rowAttrs: (string | number)[];
  colAttrs: (string | number)[];
  rowName: string; // what each row shares, as said aloud
  colName: string;
  cell: (rowAttr: string | number, colAttr: string | number) => Visual;
  needs: (rowAttr: string | number, colAttr: string | number) => string; // "a blue square"
  extra: Record<string, string>;
  spare?: [string | number, string | number]; // a fourth option that is in no row or column of the grid
}

function gridFor(level: Level, rng: Rng): Grid {
  if (level === 1) {
    const forms = rng.sample(FORMS, 2);
    const colors = twoClearColors(rng);
    return {
      rowAttrs: forms,
      colAttrs: colors,
      rowName: 'shape',
      colName: 'color',
      cell: (form, color) => shape(form as ShapeName, color as ColorName),
      needs: (form, color) => `${a(String(color))} ${form}`,
      extra: {},
    };
  }
  if (level === 2) {
    const form = rng.pick(FORMS);
    const color = rng.pick(COLOR_NAMES);
    const many = (count: number, size: string): Visual => row(...Array.from({ length: count }, () => shape(form, color, size as 's' | 'm')));
    return {
      rowAttrs: rng.shuffle([1, 2]),
      colAttrs: rng.shuffle(['s', 'm']),
      rowName: 'number of shapes',
      colName: 'size',
      cell: (count, size) => many(count as number, size as string),
      needs: (count, size) => `${count === 1 ? 'one' : 'two'} ${SIZE_WORD[size as string]} ${form}${count === 1 ? '' : 's'}`,
      extra: { shape: form, color },
    };
  }
  const colors = twoClearColors(rng);
  const turns = rng.sample([0, 1, 2, 3], 3) as [number, number, number];
  return {
    rowAttrs: colors,
    colAttrs: [turns[0], turns[1]],
    rowName: 'color',
    colName: 'turn',
    cell: (color, turn) => shape('arrow', color as ColorName, 'm', (turn as number) * 90),
    needs: (color) => `${a(String(color))} arrow that points the same way as the other one in its column`,
    extra: {},
    spare: [colors[0], turns[2]],
  };
}

function matrixExplanation(grid: Grid, rowAttr: string | number, colAttr: string | number): Explanation {
  const lines = [`Each row has the same ${grid.rowName}.`, `Each column has the same ${grid.colName}.`, `The box needs ${grid.needs(rowAttr, colAttr)}.`];
  return { speak: [lines.join(' ')], steps: lines, visual: grid.cell(rowAttr, colAttr) };
}

function figureMatrix(level: Level, rng: Rng): QuestionDraft {
  const grid = gridFor(level, rng);
  const blank = rng.int(0, 3);
  const [r, c] = [Math.floor(blank / 2), blank % 2];
  const at = (rowIndex: number, colIndex: number): [string | number, string | number] => [grid.rowAttrs[rowIndex] as string | number, grid.colAttrs[colIndex] as string | number];
  // The wrong options are the cells beside the empty box: right row and wrong column, wrong row and right column.
  const offered: [string | number, string | number][] = [at(r, c), at(r, 1 - c), at(1 - r, c)];
  if (level === 3) {
    // A fourth: the right colour, turned a way that is nowhere in the grid.
    const spare = grid.spare as [string | number, string | number];
    offered.push([grid.rowAttrs[r] as string, spare[1]]);
  }
  const options = rng.shuffle(offered);
  const answer = offered[0] as [string | number, string | number];
  const cells = [0, 1, 2, 3].map((i) => (i === blank ? ('blank' as const) : grid.cell(...at(Math.floor(i / 2), i % 2))));
  return {
    type: 'choice',
    mode: 'look',
    facts: { rowAttrs: grid.rowAttrs, colAttrs: grid.colAttrs, blank, ...grid.extra, options: options.map(([rowAttr, colAttr]) => `${rowAttr}|${colAttr}`) },
    prompt: { text: MATRIX, speak: [MATRIX] },
    stimulus: { kind: 'matrix', cells },
    options: options.map(([rowAttr, colAttr]) => grid.cell(rowAttr, colAttr)),
    answerIndex: options.indexOf(answer),
    explanation: matrixExplanation(grid, ...answer),
  };
}

// A 3 by 3 grid of figures, written for the figureGrid oracle: "shape|colour" in each cell.
interface Piece {
  code: string;
  picture: Visual;
}
const piece = (form: ShapeName, color: ColorName): Piece => ({ code: `${form}|${color}`, picture: shape(form, color) });

function gridQuestion(grid: Piece[], blank: number, offered: Piece[], prompt: string, lines: string[], rng: Rng): QuestionDraft {
  const answer = offered[0] as Piece;
  const options = rng.shuffle(offered);
  const cells = grid.map((cell, i) => (i === blank ? ('blank' as const) : cell.picture));
  return {
    type: 'choice',
    mode: 'look',
    facts: { oracle: 'figureGrid', cells: grid.map((cell, i) => (i === blank ? 'blank' : cell.code)), blank, options: options.map((option) => option.code) },
    prompt: { text: prompt, speak: [prompt] },
    stimulus: { kind: 'matrix', cells },
    options: options.map((option) => option.picture),
    answerIndex: options.indexOf(answer),
    explanation: { speak: [lines.join(' ')], steps: lines, visual: { kind: 'matrix', cells: grid.map((cell) => cell.picture) } },
  };
}

function latinMatrix(rng: Rng): QuestionDraft {
  const forms = rng.sample(FORMS, 3) as [ShapeName, ShapeName, ShapeName];
  const colors = threeColors(rng);
  // The shapes run on a slant: one step along each row, one or two steps down each column.
  const slant = rng.pick([1, 2]);
  const formAt = (r: number, c: number): ShapeName => forms[(c + slant * r) % 3] as ShapeName;
  const at = (r: number, c: number): Piece => piece(formAt(r, c), colors[r] as ColorName);
  const grid = Array.from({ length: 9 }, (_, i) => at(Math.floor(i / 3), i % 3));
  const blank = rng.int(0, 8);
  const [r, c] = [Math.floor(blank / 3), blank % 3];
  const otherRow = rng.pick([0, 1, 2].filter((i) => i !== r));
  const otherCol = rng.pick([0, 1, 2].filter((i) => i !== c));
  // Right shape and another row's colour, a shape already in the row, and both wrong.
  const offered = [at(r, c), piece(formAt(r, c), colors[otherRow] as ColorName), at(r, otherCol), piece(formAt(r, otherCol), colors[otherRow] as ColorName)];
  const lines = ['Each row has the same color.', 'Each row and each column has every shape once.', `The box needs ${a(colors[r] as string)} ${formAt(r, c)}.`];
  return gridQuestion(grid, blank, offered, MATRIX, lines, rng);
}

const matrixOf = (level: Level, rng: Rng): QuestionDraft => (level === 4 ? latinMatrix(rng) : figureMatrix(level, rng));

function matrixLesson(): LessonStep[] {
  const cell = (form: ShapeName, color: ColorName): Visual => shape(form, color);
  const full: Visual = { kind: 'matrix', cells: [cell('circle', 'red'), cell('circle', 'blue'), cell('square', 'red'), cell('square', 'blue')] };
  const lines = ['Each row has the same shape.', 'Each column has the same color.', 'The box needs a blue square.'];
  const tryLines = ['Each row has the same shape.', 'Each column has the same color.', 'The box needs a green star.'];
  return [
    { beat: 'see', text: 'A grid has rows and columns. Rows go across. Columns go down.', speak: ['A grid has rows and columns. Rows go across. Columns go down.'], visual: full },
    { beat: 'watch', text: lines.join(' '), speak: [lines.join(' ')], visual: { kind: 'matrix', cells: [cell('circle', 'red'), cell('circle', 'blue'), cell('square', 'red'), 'blank'] } },
    {
      beat: 'try',
      text: MATRIX,
      speak: [MATRIX],
      visual: { kind: 'matrix', cells: [cell('star', 'orange'), 'blank', cell('heart', 'orange'), cell('heart', 'green')] },
      reveal: { text: tryLines.join(' '), speak: [tryLines.join(' ')], visual: cell('star', 'green') },
    },
    { beat: 'remember', text: 'Check across, then check down.', speak: ['Check across, then check down.'], visual: full },
  ];
}

export const figureMatricesGenerator: SkillGenerator = {
  skillId: 'R-A4',
  maxLevel: 4,
  itemTypes: ['choice'],
  lists: ['colors'],
  generate: matrixOf,
  exampleSeed: 84,
  example: () => matrixOf(1, makeRng(84)),
  lesson: matrixLesson,
  oracle: 'matrix',
};

// ---- A.7 Two-rule patterns ----
// Levels: colour and size alternate on different beats / colour and shape / colour, size and shape at once.
// One rule changes every step and the other every second step, so the pattern repeats after four.
// At level 3 the shape also goes round three shapes, one a step, so the whole pattern repeats after twelve.

const NEXT = 'What comes next?';

interface Beat {
  code: string; // what the oracle compares: "red|l"
  picture: Visual;
  name: string; // "small red circle"
}

interface TwoRules {
  unit: Beat[]; // the four steps before the pattern repeats
  slowName: string;
  slowGoes: string; // "red, red, blue, blue"
  fastName: string;
  fastGoes: string; // "big, small"
}

function twoRules(level: Level, rng: Rng): TwoRules {
  const colors = twoClearColors(rng);
  // Which rule moves on every step is chosen at random.
  const colourIsSlow = rng.bool();
  if (level === 1) {
    const form = rng.pick(FORMS);
    const sizes = rng.shuffle<Size>(['l', 's']);
    const beat = (color: ColorName, size: Size): Beat => ({ code: `${color}|${size}`, picture: shape(form, color, size), name: `${SIZE_WORD[size]} ${color} ${form}` });
    const order: [ColorName, Size][] = [0, 1, 2, 3].map((i) => (colourIsSlow ? [colors[i >> 1] as ColorName, sizes[i % 2] as Size] : [colors[i % 2] as ColorName, sizes[i >> 1] as Size]));
    const colourGoes = (slow: boolean): string => (slow ? [colors[0], colors[0], colors[1], colors[1]] : colors).join(', ');
    const sizeGoes = (slow: boolean): string => (slow ? [sizes[0], sizes[0], sizes[1], sizes[1]] : sizes).map((size) => SIZE_WORD[size as string]).join(', ');
    return {
      unit: order.map(([color, size]) => beat(color, size)),
      slowName: colourIsSlow ? 'color' : 'size',
      slowGoes: colourIsSlow ? colourGoes(true) : sizeGoes(true),
      fastName: colourIsSlow ? 'size' : 'color',
      fastGoes: colourIsSlow ? sizeGoes(false) : colourGoes(false),
    };
  }
  const forms = rng.sample(FORMS, 2) as [ShapeName, ShapeName];
  const beat = (color: ColorName, form: ShapeName): Beat => ({ code: `${color}|${form}`, picture: shape(form, color), name: `${color} ${form}` });
  const order: [ColorName, ShapeName][] = [0, 1, 2, 3].map((i) => (colourIsSlow ? [colors[i >> 1] as ColorName, forms[i % 2] as ShapeName] : [colors[i % 2] as ColorName, forms[i >> 1] as ShapeName]));
  const goes = (values: readonly string[], slow: boolean): string => (slow ? [values[0], values[0], values[1], values[1]] : values).join(', ');
  return {
    unit: order.map(([color, form]) => beat(color, form)),
    slowName: colourIsSlow ? 'color' : 'shape',
    slowGoes: colourIsSlow ? goes(colors, true) : goes(forms, true),
    fastName: colourIsSlow ? 'shape' : 'color',
    fastGoes: colourIsSlow ? goes(forms, false) : goes(colors, false),
  };
}

function patternExplanation(rules: TwoRules, answer: Beat): Explanation {
  const lines = [`The ${rules.slowName} goes ${rules.slowGoes}.`, `The ${rules.fastName} goes ${rules.fastGoes}.`, `Next is ${a(answer.name)}.`];
  return { speak: [lines.join(' ')], steps: lines, visual: answer.picture };
}

function twoRulePattern(level: Level, rng: Rng): QuestionDraft {
  const rules = twoRules(level, rng);
  // Five to seven shown: the whole pattern has been seen once before the child is asked.
  const shown = rng.int(5, 7);
  const answer = rules.unit[shown % 4] as Beat;
  // The wrong options keep one rule and break the other.
  const wrong = rules.unit.filter((beat) => beat !== answer && beat.code.split('|').some((part, i) => part === answer.code.split('|')[i]));
  const options = rng.shuffle([answer, ...wrong]);
  return {
    type: 'choice',
    mode: 'look',
    facts: { unit: rules.unit.map((beat) => beat.code), shown, options: options.map((beat) => beat.code) },
    prompt: { text: NEXT, speak: [NEXT] },
    stimulus: { kind: 'sequence', items: [...Array.from({ length: shown }, (_, i) => (rules.unit[i % 4] as Beat).picture), 'blank'] },
    options: options.map((beat) => beat.picture),
    answerIndex: options.indexOf(answer),
    explanation: patternExplanation(rules, answer),
  };
}

function threeRulePattern(rng: Rng): QuestionDraft {
  const colors = twoClearColors(rng);
  const sizes = rng.shuffle<Size>(['l', 's']);
  const forms = rng.sample(FORMS, 3) as [ShapeName, ShapeName, ShapeName];
  const colourIsSlow = rng.bool();
  const beat = (color: ColorName, size: Size, form: ShapeName): Beat => ({ code: `${color}|${size}|${form}`, picture: shape(form, color, size), name: `${SIZE_WORD[size] as string} ${color} ${form}` });
  const fast = (i: number): number => i % 2;
  const slow = (i: number): number => Math.floor(i / 2) % 2;
  const parts = (i: number): [ColorName, Size, ShapeName] => [colors[colourIsSlow ? slow(i) : fast(i)] as ColorName, sizes[colourIsSlow ? fast(i) : slow(i)] as Size, forms[i % 3] as ShapeName];
  const unit = Array.from({ length: 12 }, (_, i) => beat(...parts(i)));
  const shown = rng.int(6, 7);
  const [color, size, form] = parts(shown);
  const answer = unit[shown] as Beat;
  // Each wrong option breaks one rule: the other colour, the other size, or the last shape again.
  const wrong = [
    beat(colors[colors[0] === color ? 1 : 0] as ColorName, size, form),
    beat(color, sizes[sizes[0] === size ? 1 : 0] as Size, form),
    beat(color, size, forms[(shown - 1) % 3] as ShapeName),
  ];
  const options = rng.shuffle([answer, ...wrong]);
  const goes = (values: readonly string[], isSlow: boolean): string => (isSlow ? [values[0], values[0], values[1], values[1]] : values).join(', ');
  const sizeWords = sizes.map((each) => SIZE_WORD[each] as string);
  const lines = [`The color goes ${goes(colors, colourIsSlow)}.`, `The size goes ${goes(sizeWords, !colourIsSlow)}.`, `The shape goes ${forms.join(', ')}.`, `Next is ${a(answer.name)}.`];
  return {
    type: 'choice',
    mode: 'look',
    facts: { unit: unit.map((each) => each.code), shown, options: options.map((each) => each.code) },
    prompt: { text: NEXT, speak: [NEXT] },
    stimulus: { kind: 'sequence', items: [...unit.slice(0, shown).map((each) => each.picture), 'blank'] },
    options: options.map((each) => each.picture),
    answerIndex: options.indexOf(answer),
    explanation: { speak: [lines.join(' ')], steps: lines, visual: answer.picture },
  };
}

const patternOf = (level: Level, rng: Rng): QuestionDraft => (level === 3 ? threeRulePattern(rng) : twoRulePattern(level, rng));

function patternLesson(): LessonStep[] {
  const beat = (color: ColorName, size: Size): Beat => ({ code: `${color}|${size}`, picture: shape('circle', color, size), name: `${SIZE_WORD[size]} ${color} circle` });
  const unit = [beat('red', 'l'), beat('red', 's'), beat('blue', 'l'), beat('blue', 's')];
  const rules: TwoRules = { unit, slowName: 'color', slowGoes: 'red, red, blue, blue', fastName: 'size', fastGoes: 'big, small' };
  const shownRow = (count: number, last: Visual | 'blank'): Visual => ({ kind: 'sequence', items: [...Array.from({ length: count }, (_, i) => (unit[i % 4] as Beat).picture), last] });
  const watch = patternExplanation(rules, unit[1] as Beat);
  const tryIt = patternExplanation(rules, unit[2] as Beat);
  return [
    { beat: 'see', text: 'A pattern can follow two rules at once. Watch the color, then watch the size.', speak: ['A pattern can follow two rules at once. Watch the color, then watch the size.'], visual: shownRow(4, (unit[0] as Beat).picture) },
    { beat: 'watch', text: watch.steps.join(' '), speak: watch.speak, visual: shownRow(5, (unit[1] as Beat).picture) },
    { beat: 'try', text: NEXT, speak: [NEXT], visual: shownRow(6, 'blank'), reveal: { text: tryIt.steps.join(' '), speak: tryIt.speak, visual: tryIt.visual } },
    { beat: 'remember', text: 'Follow one rule at a time.', speak: ['Follow one rule at a time.'], visual: shownRow(4, (unit[0] as Beat).picture) },
  ];
}

export const twoRulePatternsGenerator: SkillGenerator = {
  skillId: 'R-A7',
  maxLevel: 3,
  itemTypes: ['choice'],
  lists: ['colors'],
  generate: patternOf,
  exampleSeed: 87,
  example: () => patternOf(1, makeRng(87)),
  lesson: patternLesson,
  oracle: 'pattern',
};

// ---- A.13 Pattern completion ----
// Levels: 3 by 3 striped tile with a missing corner / checkerboard with a missing middle / two attributes /
// two attributes that both run on a slant, so each row and column holds every shape and every colour once,
// with the middle missing.

const PIECE = 'Which piece finishes the picture?';
const tile = (color: string): Visual => shape('square', color as ColorName);

function threeColors(rng: Rng): [ColorName, ColorName, ColorName] {
  return pickApart(COLOR_NAMES, 3, rng, (color, picked) => picked.every((other) => easyToTellApart(color, other))) as [ColorName, ColorName, ColorName];
}

const COMPLETE: Explanation['steps'] = ['Follow the lines and colors into the gap.'];

function completion(level: Level, rng: Rng): QuestionDraft {
  const [one, two, three] = threeColors(rng);
  let facts: QuestionDraft['facts'];
  let cells: (Visual | 'blank')[];
  let options: { code: string; picture: Visual }[];
  let blank: number;
  let answer: { code: string; picture: Visual };
  if (level === 1) {
    // Stripes of two colours, across or down, with a corner missing.
    const across = rng.bool();
    const stripes = [one, two, one];
    blank = rng.pick([0, 2, 6, 8]);
    const colorAt = (i: number): ColorName => stripes[across ? Math.floor(i / 3) : i % 3] as ColorName;
    const piece = (color: ColorName): { code: string; picture: Visual } => ({ code: across ? `${color}|square` : `square|${color}`, picture: tile(color) });
    cells = Array.from({ length: 9 }, (_, i) => (i === blank ? 'blank' : tile(colorAt(i))));
    answer = piece(colorAt(blank));
    options = [answer, piece(colorAt(blank) === one ? two : one), piece(three)];
    const same = ['square', 'square', 'square'];
    facts = { rowAttrs: across ? stripes : same, colAttrs: across ? same : stripes, blank };
  } else if (level === 2) {
    // A checkerboard of two colours with the middle missing.
    blank = 4;
    const colorAt = (i: number): ColorName => ((Math.floor(i / 3) + (i % 3)) % 2 === 0 ? one : two);
    const piece = (color: ColorName): { code: string; picture: Visual } => ({ code: color, picture: tile(color) });
    cells = Array.from({ length: 9 }, (_, i) => (i === blank ? 'blank' : tile(colorAt(i))));
    answer = piece(one);
    options = [answer, piece(two), piece(three)];
    facts = { rowAttrs: [0, 1, 2], colAttrs: [0, 1, 2], blank, rule: 'checker', colors: [one, two] };
  } else {
    // Rows share a shape and columns share a colour. Any box may be missing.
    const forms = rng.sample(FORMS, 3) as [ShapeName, ShapeName, ShapeName];
    const colors = [one, two, three];
    blank = rng.int(0, 8);
    const [r, c] = [Math.floor(blank / 3), blank % 3];
    const piece = (rowIndex: number, colIndex: number): { code: string; picture: Visual } => ({ code: `${forms[rowIndex]}|${colors[colIndex]}`, picture: shape(forms[rowIndex] as ShapeName, colors[colIndex] as ColorName) });
    cells = Array.from({ length: 9 }, (_, i) => (i === blank ? 'blank' : piece(Math.floor(i / 3), i % 3).picture));
    const otherRow = rng.pick([0, 1, 2].filter((i) => i !== r));
    const otherCol = rng.pick([0, 1, 2].filter((i) => i !== c));
    answer = piece(r, c);
    // Right shape and wrong colour, wrong shape and right colour, and both wrong.
    options = [answer, piece(r, otherCol), piece(otherRow, c), piece(otherRow, otherCol)];
    facts = { rowAttrs: forms, colAttrs: colors, blank };
  }
  const offered = rng.shuffle(options);
  return {
    type: 'choice',
    mode: 'look',
    facts: { ...facts, options: offered.map((option) => option.code) },
    prompt: { text: PIECE, speak: [PIECE] },
    stimulus: { kind: 'matrix', cells },
    options: offered.map((option) => option.picture),
    answerIndex: offered.indexOf(answer),
    explanation: { speak: COMPLETE, steps: COMPLETE, visual: { kind: 'matrix', cells: cells.map((cell) => (cell === 'blank' ? answer.picture : cell)) } },
  };
}

function slantedTile(rng: Rng): QuestionDraft {
  const forms = rng.sample(FORMS, 3) as [ShapeName, ShapeName, ShapeName];
  const colors = threeColors(rng);
  // Shape and colour run on different slants, so all nine pieces differ.
  const shapeSlant = rng.pick([1, 2]);
  const at = (r: number, c: number): Piece => piece(forms[(r + shapeSlant * c) % 3] as ShapeName, colors[(r + (3 - shapeSlant) * c) % 3] as ColorName);
  const grid = Array.from({ length: 9 }, (_, i) => at(Math.floor(i / 3), i % 3));
  const blank = 4;
  const parts = (i: number): [ShapeName, ColorName] => (grid[i] as Piece).code.split('|') as [ShapeName, ColorName];
  const [form, color] = parts(blank);
  // The wrong shapes and colours are ones already in the middle row.
  const side = rng.pick([3, 5]);
  const [sideForm, sideColor] = parts(side);
  const [farForm, farColor] = parts(8 - side);
  const offered = [piece(form, color), piece(form, sideColor), piece(farForm, color), piece(sideForm, farColor)];
  const lines = ['Each row and each column has every shape once.', 'Each row and each column has every color once.', `The gap needs ${a(color)} ${form}.`];
  return gridQuestion(grid, blank, offered, PIECE, lines, rng);
}

const completionOf = (level: Level, rng: Rng): QuestionDraft => (level === 4 ? slantedTile(rng) : completion(level, rng));

function completionLesson(): LessonStep[] {
  const stripes = (missing: number | null): Visual => ({ kind: 'matrix', cells: Array.from({ length: 9 }, (_, i) => (i === missing ? 'blank' : tile(Math.floor(i / 3) === 1 ? 'blue' : 'yellow'))) });
  const checks = (missing: number | null): Visual => ({ kind: 'matrix', cells: Array.from({ length: 9 }, (_, i) => (i === missing ? 'blank' : tile((Math.floor(i / 3) + (i % 3)) % 2 === 0 ? 'green' : 'orange'))) });
  return [
    { beat: 'see', text: 'This picture is made of stripes. Each stripe is one color.', speak: ['This picture is made of stripes. Each stripe is one color.'], visual: stripes(null) },
    { beat: 'watch', text: 'A piece is missing. Follow the lines and colors into the gap. The stripe is yellow, so the piece is yellow.', speak: ['A piece is missing. Follow the lines and colors into the gap. The stripe is yellow, so the piece is yellow.'], visual: stripes(8) },
    { beat: 'try', text: PIECE, speak: [PIECE], visual: checks(4), reveal: { text: COMPLETE.join(' '), speak: COMPLETE, visual: checks(null) } },
    { beat: 'remember', text: 'The piece must match every edge.', speak: ['The piece must match every edge.'], visual: stripes(null) },
  ];
}

export const patternCompletionGenerator: SkillGenerator = {
  skillId: 'R-A13',
  maxLevel: 4,
  itemTypes: ['choice'],
  lists: ['colors'],
  generate: completionOf,
  exampleSeed: 93,
  example: () => completionOf(1, makeRng(93)),
  lesson: completionLesson,
  oracle: 'matrix',
};
