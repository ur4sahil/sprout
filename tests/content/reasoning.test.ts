// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { ANALOGY_CLASHES, ANALOGY_PAIRS } from '../../src/content/data/analogies';
import { GROUP_WORDS } from '../../src/content/data/categories';
import { RIDDLES } from '../../src/content/data/riddles';
import { skillById } from '../../src/content/catalogue';
import { generateQuestion } from '../../src/content/registry';
import { samePicture } from '../../src/engine/canonical';
import type { Level, Question, Visual } from '../../src/engine/types';

// The level rules of the 14 Reasoning skills (plan section 8).

const SEEDS = 300;

function all(skillId: string, level: Level): Question[] {
  return Array.from({ length: SEEDS }, (_, i) => generateQuestion(skillId, level, i + 1));
}

type Choice = Extract<Question, { type: 'choice' }>;
function choices(skillId: string, level: Level): Choice[] {
  return all(skillId, level).map((question) => {
    if (question.type !== 'choice') throw new Error(`${skillId} level ${level} gave a ${question.type}`);
    return question;
  });
}

const options = <T,>(question: Question): T[] => question.facts.options as T[];
const groupOf = (word: string): string => GROUP_WORDS.find((entry) => entry.word === word)?.group ?? '?';
const CLOSE = [['animals', 'people'], ['animals', 'plants'], ['vehicles', 'things'], ['clothes', 'things']];
const close = (one: string, two: string): boolean => CLOSE.some(([x, y]) => (x === one && y === two) || (x === two && y === one));
type Shape = Extract<Visual, { kind: 'shape' }>;
const asShape = (visual: Visual | undefined): Shape => {
  if (visual?.kind !== 'shape') throw new Error('not a shape');
  return visual;
};

describe('option counts', () => {
  it('reasoning uses 3 options at levels 1 and 2, and 4 above that, except riddles with 2 pictures', () => {
    // The levels answered by choosing; A.8, A.10 and A.11 are typed from level 3.
    const maxLevel: Record<string, Level> = { 'R-A1': 4, 'R-A2': 3, 'R-A3': 3, 'R-A4': 4, 'R-A5': 4, 'R-A6': 4, 'R-A7': 3, 'R-A8': 2, 'R-A9': 3, 'R-A10': 2, 'R-A11': 2, 'R-A12': 4, 'R-A13': 4, 'R-A14': 3 };
    for (const [skillId, top] of Object.entries(maxLevel)) {
      for (let level = 1 as Level; level <= top; level = (level + 1) as Level) {
        const wanted = skillId === 'R-A14' && level === 1 ? 2 : level <= 2 ? 3 : 4;
        for (const question of choices(skillId, level)) expect(question.options.length, `${skillId} level ${level}`).toBe(wanted);
      }
    }
  });

  it('the typed levels are typed', () => {
    for (const skillId of ['R-A8', 'R-A10', 'R-A11']) {
      for (const level of [3, 4] as Level[]) expect(new Set(all(skillId, level).map((question) => question.type))).toEqual(new Set(['numberPad']));
    }
  });

  it('every one of the 14 puzzles has one level more than it first had (plan section 15, phase I)', () => {
    const tops: Record<string, number> = { 'R-A1': 4, 'R-A2': 3, 'R-A3': 3, 'R-A4': 4, 'R-A5': 4, 'R-A6': 4, 'R-A7': 3, 'R-A8': 4, 'R-A9': 3, 'R-A10': 4, 'R-A11': 4, 'R-A12': 4, 'R-A13': 4, 'R-A14': 3 };
    for (const [skillId, top] of Object.entries(tops)) expect(skillById(skillId)?.maxLevel, skillId).toBe(top);
  });
});

describe('A.1 Odd one out and A.2 Which belongs', () => {
  it('A.1: two pictures share a group and the third does not; closer groups at level 2', () => {
    for (const level of [1, 2] as Level[]) {
      for (const question of choices('R-A1', level)) {
        const groups = options<string>(question).map(groupOf);
        const odd = groups[question.answerIndex] as string;
        const shared = groups.filter((_, i) => i !== question.answerIndex);
        expect(shared[0]).toBe(shared[1]);
        expect(odd).not.toBe(shared[0]);
        // "Things" is never what the others share, and the usual clashes are kept apart.
        expect(shared[0]).not.toBe('things');
        expect(close(odd, shared[0] as string)).toBe(level === 2);
        expect(groups.includes('plants') && groups.includes('food')).toBe(false);
        expect(options<string>(question).includes('fish') && groups.includes('food')).toBe(false);
        expect(question.explanation.steps[0]).toBe(`These are both ${shared[0]}.`);
      }
    }
  });

  it('A.1 level 3: four shapes, three the same picture and one differing in a single way', () => {
    const ways = new Set<string>();
    for (const question of choices('R-A1', 3)) {
      expect(question.twins).toBe(true);
      const odd = asShape(question.options[question.answerIndex]);
      const same = question.options.filter((_, i) => i !== question.answerIndex).map(asShape);
      expect(same.every((visual) => samePicture(visual, same[0] as Visual))).toBe(true);
      const differing = (['shape', 'color', 'size'] as const).filter((key) => odd[key] !== (same[0] as Shape)[key]);
      expect(differing).toHaveLength(1);
      ways.add(question.facts.by as string);
    }
    expect(ways).toEqual(new Set(['colour', 'shape', 'size']));
  });

  it('A.2: two examples and exactly one option from their group; wrong options are close groups at level 2', () => {
    for (const level of [1, 2] as Level[]) {
      for (const question of choices('R-A2', level)) {
        const group = question.facts.target as string;
        const examples = question.facts.examples as string[];
        expect(examples.map(groupOf)).toEqual([group, group]);
        const words = options<string>(question);
        expect(words.filter((word) => groupOf(word) === group)).toEqual([question.facts.answer]);
        expect(examples).not.toContain(question.facts.answer);
        expect(group).not.toBe('things');
        for (const word of words.filter((each) => each !== question.facts.answer)) expect(close(groupOf(word), group)).toBe(level === 2);
        // Far wrong options come from two different groups, so neither stands out as a pair.
        if (level === 1) expect(new Set(words.map(groupOf)).size).toBe(3);
        const groups = [...words, ...examples].map(groupOf);
        expect(groups.includes('plants') && groups.includes('food')).toBe(false);
        expect([...words, ...examples].includes('fish') && groups.includes('food')).toBe(false);
      }
    }
  });
});

describe('A.3 Figure analogies', () => {
  it('one attribute changes at level 1 and two at level 2, and the second pair is a different figure', () => {
    for (const [level, count] of [[1, 1], [2, 2]] as [Level, number][]) {
      for (const question of choices('R-A3', level)) {
        const [from, to, base] = [question.facts.from, question.facts.to, question.facts.base] as string[][];
        const moving = [0, 1, 2].filter((i) => (from as string[])[i] !== (to as string[])[i]);
        expect(moving).toHaveLength(count);
        for (const i of moving) expect((base as string[])[i]).toBe((from as string[])[i]);
        expect(base).not.toEqual(from);
        if (question.stimulus?.kind !== 'matrix') throw new Error('an analogy is drawn as a grid');
        expect(question.stimulus.cells[3]).toBe('blank');
        // The answer is not already on the screen as the first pair's answer.
        expect(samePicture(question.options[question.answerIndex] as Visual, question.stimulus.cells[1] as Visual)).toBe(false);
      }
    }
  });
});

describe('A.4 Figure matrices and A.13 Pattern completion', () => {
  it('A.4: the grid follows its rows and columns at every level, with the empty box anywhere', () => {
    const names: Record<number, [string, string]> = { 1: ['shape', 'color'], 2: ['number of shapes', 'size'], 3: ['color', 'turn'] };
    for (const level of [1, 2, 3] as Level[]) {
      const blanks = new Set<number>();
      for (const question of choices('R-A4', level)) {
        if (question.stimulus?.kind !== 'matrix') throw new Error('not a grid');
        const { cells } = question.stimulus;
        expect(cells).toHaveLength(4);
        const blank = question.facts.blank as number;
        blanks.add(blank);
        expect(cells.map((cell, i) => (cell === 'blank' ? i : -1)).filter((i) => i >= 0)).toEqual([blank]);
        // Putting the answer in the empty box gives four different pictures.
        const filled = cells.map((cell) => (cell === 'blank' ? (question.options[question.answerIndex] as Visual) : cell));
        for (let i = 0; i < 4; i += 1) for (let j = i + 1; j < 4; j += 1) expect(samePicture(filled[i] as Visual, filled[j] as Visual)).toBe(false);
        const [rowName, colName] = names[level] as [string, string];
        expect(question.explanation.steps.slice(0, 2)).toEqual([`Each row has the same ${rowName}.`, `Each column has the same ${colName}.`]);
        // The two cells beside the empty box are offered as wrong answers.
        const [r, c] = [Math.floor(blank / 2), blank % 2];
        for (const neighbour of [r * 2 + (1 - c), (1 - r) * 2 + c]) {
          expect(question.options.some((option) => samePicture(option, cells[neighbour] as Visual))).toBe(true);
        }
      }
      expect(blanks).toEqual(new Set([0, 1, 2, 3]));
    }
  });

  it('A.13: stripes with a corner missing, a checkerboard with the middle missing, then shape by colour', () => {
    for (const question of choices('R-A13', 1)) {
      if (question.stimulus?.kind !== 'matrix') throw new Error('not a grid');
      const blank = question.facts.blank as number;
      expect([0, 2, 6, 8]).toContain(blank);
      const colors = question.stimulus.cells.map((cell) => (cell === 'blank' ? asShape(question.options[question.answerIndex]).color : asShape(cell).color));
      const rows = [0, 1, 2].map((r) => new Set(colors.slice(r * 3, r * 3 + 3)).size);
      const cols = [0, 1, 2].map((c) => new Set([colors[c], colors[c + 3], colors[c + 6]]).size);
      // Every stripe is one colour, across or down, and there are exactly two colours.
      expect(rows.every((size) => size === 1) || cols.every((size) => size === 1)).toBe(true);
      expect(new Set(colors).size).toBe(2);
    }
    for (const question of choices('R-A13', 2)) {
      if (question.stimulus?.kind !== 'matrix') throw new Error('not a grid');
      expect(question.facts.blank).toBe(4);
      const colors = question.stimulus.cells.map((cell) => (cell === 'blank' ? asShape(question.options[question.answerIndex]).color : asShape(cell).color));
      colors.forEach((color, i) => expect(color).toBe(colors[(Math.floor(i / 3) + (i % 3)) % 2 === 0 ? 0 : 1]));
      expect(colors[0]).not.toBe(colors[1]);
    }
    const blanks = new Set<number>();
    for (const question of choices('R-A13', 3)) {
      if (question.stimulus?.kind !== 'matrix') throw new Error('not a grid');
      blanks.add(question.facts.blank as number);
      const filled = question.stimulus.cells.map((cell) => (cell === 'blank' ? asShape(question.options[question.answerIndex]) : asShape(cell)));
      for (let r = 0; r < 3; r += 1) expect(new Set(filled.slice(r * 3, r * 3 + 3).map((cell) => cell.shape)).size).toBe(1);
      for (let c = 0; c < 3; c += 1) expect(new Set([filled[c], filled[c + 3], filled[c + 6]].map((cell) => (cell as Shape).color)).size).toBe(1);
      expect(new Set(filled.map((cell) => `${cell.shape} ${cell.color}`)).size).toBe(9);
    }
    expect(blanks.size).toBe(9);
  });
});

describe('A.5 Turning shapes and A.6 Mirror images', () => {
  it('A.5: an arrow, then an L, a quarter turn a step; at level 3 a half turn a step', () => {
    for (const level of [1, 2, 3] as Level[]) {
      const starts = new Set<number>();
      for (const question of choices('R-A5', level)) {
        if (question.stimulus?.kind !== 'sequence') throw new Error('not a row');
        const shown = question.stimulus.items.slice(0, 3).map((item) => asShape(item as Visual));
        expect(question.stimulus.items[3]).toBe('blank');
        if (level === 1) expect(shown[0]?.shape).toBe('arrow');
        if (level === 2) expect(shown[0]?.shape).toBe('lShape');
        const step = level === 3 ? 180 : 90;
        expect(((shown[1] as Shape).rotation - (shown[0] as Shape).rotation + 360) % 360).toBe(step);
        expect(((shown[2] as Shape).rotation - (shown[1] as Shape).rotation + 360) % 360).toBe(step);
        expect(asShape(question.options[question.answerIndex]).rotation).toBe(((shown[2] as Shape).rotation + step) % 360);
        expect(question.explanation.steps).toEqual([level === 3 ? 'It makes a half turn each step.' : 'It makes a quarter turn each step.']);
        starts.add(question.facts.startTurn as number);
      }
      expect(starts).toEqual(new Set([0, 1, 2, 3]));
    }
  });

  it('A.6: only the flag and the L shape, and the answer is the one flipped picture', () => {
    for (const level of [1, 2, 3] as Level[]) {
      for (const question of choices('R-A6', level)) {
        const shown = asShape(question.stimulus);
        expect(['flag', 'lShape']).toContain(shown.shape);
        if (level === 1) expect(shown.shape).toBe('flag');
        if (level === 2) expect(shown.shape).toBe('lShape');
        if (level < 3) expect(shown.rotation).toBe(0);
        const flipped = question.options.map((option, i) => (asShape(option).flip ? i : -1)).filter((i) => i >= 0);
        expect(flipped).toEqual([question.answerIndex]);
        // A mirror swaps left and right, so a quarter turn runs the other way.
        expect(asShape(question.options[question.answerIndex]).rotation).toBe((360 - shown.rotation) % 360);
        const wrong = question.options.filter((_, i) => i !== question.answerIndex).map((option) => (asShape(option).rotation - shown.rotation + 360) % 360).sort((x, y) => x - y);
        // The wrong ones are the picture itself and upside down, or at level 3 its three turned copies.
        expect(wrong).toEqual(level === 3 ? [90, 180, 270] : [0, 180]);
      }
    }
  });
});

describe('A.7 Two-rule patterns', () => {
  it('one rule changes every step and the other every second step, and the wrong options break one rule each', () => {
    for (const level of [1, 2] as Level[]) {
      for (const question of choices('R-A7', level)) {
        const unit = (question.facts.unit as string[]).map((beat) => beat.split('|'));
        expect(unit).toHaveLength(4);
        expect(new Set(unit.map((beat) => beat.join('|'))).size).toBe(4);
        const periods = [0, 1].map((part) => (unit[0]?.[part] === unit[1]?.[part] ? 'slow' : 'fast')).sort();
        expect(periods).toEqual(['fast', 'slow']);
        const shown = question.facts.shown as number;
        expect(shown).toBeGreaterThanOrEqual(5);
        expect(shown).toBeLessThanOrEqual(7);
        const answer = (options<string>(question)[question.answerIndex] as string).split('|');
        for (const option of options<string>(question).filter((_, i) => i !== question.answerIndex)) {
          expect(option.split('|').filter((part, i) => part === answer[i])).toHaveLength(1);
        }
        // Level 1 is colour with size, level 2 colour with shape.
        expect(['s', 'l'].includes(unit[0]?.[1] as string)).toBe(level === 1);
      }
    }
  });
});

describe('A.8, A.10 and A.11: numbers', () => {
  it('A.8: two examples with different starts, plus n at level 1 and double at level 2', () => {
    for (const level of [1, 2, 3] as Level[]) {
      const kinds = new Set<string>();
      for (const question of all('R-A8', level)) {
        const examples = question.facts.examples as [number, number][];
        const base = question.facts.base as number;
        expect(examples).toHaveLength(2);
        expect(new Set([examples[0]?.[0], examples[1]?.[0], base]).size).toBe(3);
        const [[a, b], [c, d]] = examples as [[number, number], [number, number]];
        const kind = b === a * 2 && d === c * 2 ? 'double' : b - a === d - c ? (b > a ? 'plus' : 'minus') : 'none';
        kinds.add(kind);
        expect(Math.min(b, d)).toBeGreaterThanOrEqual(1);
      }
      if (level === 1) expect(kinds).toEqual(new Set(['plus']));
      if (level === 2) expect(kinds).toEqual(new Set(['double']));
      if (level === 3) expect(kinds).toEqual(new Set(['plus', 'minus', 'double']));
    }
  });

  it('A.10: plus 1 or 2, then plus 5, plus 10 or minus 1, then two steps that take turns', () => {
    const stepsAt = (level: Level): Set<string> => new Set(all('R-A10', level).map((question) => (question.facts.steps as number[]).join(',')));
    expect(stepsAt(1)).toEqual(new Set(['1', '2']));
    expect(stepsAt(2)).toEqual(new Set(['5', '10', '-1']));
    for (const steps of stepsAt(3)) expect(steps.split(',')).toHaveLength(2);
    for (const level of [1, 2, 3] as Level[]) {
      for (const question of all('R-A10', level)) {
        if (question.stimulus?.kind !== 'sequence') throw new Error('not a row');
        const shown = question.stimulus.items.slice(0, -1).map((item) => Number((item as Extract<Visual, { kind: 'text' }>).value));
        expect(shown).toHaveLength(level === 3 ? 5 : 4);
        expect(question.stimulus.items.at(-1)).toBe('blank');
        const steps = question.facts.steps as number[];
        shown.slice(1).forEach((value, i) => expect(value - (shown[i] as number)).toBe(steps[i % steps.length]));
        expect(Math.min(...shown)).toBeGreaterThanOrEqual(1);
        // Counting by fives or tens starts on a five or a ten.
        if (steps[0] === 5 || steps[0] === 10) expect((shown[0] as number) % (steps[0] as number)).toBe(0);
      }
    }
  });

  it('A.11: the two sides balance; level 2 has a sum on the right that does not give the answer away', () => {
    for (const level of [1, 2, 3] as Level[]) {
      const sizes = new Set<number>();
      for (const question of all('R-A11', level)) {
        const { a, b, total } = question.facts as { a: number; b: number; total: number };
        const right = question.facts.right as number[];
        sizes.add(right.length);
        expect(a + b).toBe(total);
        expect(right.reduce((sum, value) => sum + value, 0)).toBe(total);
        expect(Math.min(a, b, ...right)).toBeGreaterThanOrEqual(1);
        expect(question.stimulus).toEqual({ kind: 'scale', left: [a, 'blank'], right });
        if (right.length === 2) {
          expect(right).not.toContain(a);
          expect(right).not.toContain(b);
        }
      }
      expect(sizes).toEqual(new Set(level === 1 ? [1] : level === 2 ? [2] : [1, 2]));
    }
  });
});

describe('A.9 Picture analogies and A.14 Picture riddles', () => {
  it('A.9: the example and the question come from one relation; wrong options from others, then from the same', () => {
    const relationOf = (second: string): string => ANALOGY_PAIRS.find((pair) => pair.second.word === second)?.relation ?? '?';
    for (const level of [1, 2] as Level[]) {
      for (const question of choices('R-A9', level)) {
        const target = ANALOGY_PAIRS.find((pair) => pair.first.word === question.facts.target);
        const example = question.facts.example as [string, string];
        expect(target).toBeDefined();
        expect(relationOf(example[1])).toBe(target!.relation);
        expect(example[0]).not.toBe(target!.first.word);
        const words = options<string>(question);
        expect(words[question.answerIndex]).toBe(target!.second.word);
        const wrong = words.filter((_, i) => i !== question.answerIndex);
        for (const word of wrong) expect(relationOf(word) === target!.relation).toBe(level === 2);
        if (level === 2) expect(wrong).toContain(example[1]);
        for (const [first, second] of ANALOGY_CLASHES) expect(target!.first.word === first && words.includes(second)).toBe(false);
        expect(question.prompt.text).toBe(`${example[0].charAt(0).toUpperCase()}${example[0].slice(1)} goes with ${example[1]}. ${target!.first.word.charAt(0).toUpperCase()}${target!.first.word.slice(1)} goes with what?`);
      }
    }
  });

  it('the clash list names real words, and a clash is something that would otherwise be offered', () => {
    for (const [first, second] of ANALOGY_CLASHES) {
      const from = ANALOGY_PAIRS.find((pair) => pair.first.word === first);
      const to = ANALOGY_PAIRS.find((pair) => pair.second.word === second);
      expect(from, first).toBeDefined();
      expect(to, second).toBeDefined();
      expect(from!.relation).not.toBe(to!.relation);
    }
  });

  it('A.14: the riddle is the prompt, the wrong pictures answer other riddles, and every riddle comes up', () => {
    for (const level of [1, 2] as Level[]) {
      const asked = new Set<string>();
      for (const question of choices('R-A14', level)) {
        const riddle = RIDDLES.find((candidate) => candidate.riddle === question.prompt.text);
        expect(riddle).toBeDefined();
        asked.add(riddle!.riddle);
        const words = options<string>(question);
        expect(words[question.answerIndex]).toBe(riddle!.word);
        for (const word of words) expect(RIDDLES.some((candidate) => candidate.word === word)).toBe(true);
        expect(new Set(words).size).toBe(words.length);
        expect(question.explanation.steps).toEqual([`The ${riddle!.word} is the one that ${riddle!.fact}.`]);
      }
      expect(asked.size).toBe(12);
    }
    expect(new Set(RIDDLES.map((riddle) => riddle.word)).size).toBe(12);
  });
});

describe('A.12 Paper folding', () => {
  type Hole = { col: number; row: number };
  it('one hole at an outer corner, then one beside the fold, then two holes, then three', () => {
    for (const level of [1, 2, 3, 4] as Level[]) {
      const folds = new Set<string>();
      for (const question of choices('R-A12', level)) {
        const fold = question.facts.fold as string;
        const holes = question.facts.holes as Hole[];
        folds.add(fold);
        expect(holes).toHaveLength(level >= 3 ? level - 1 : 1);
        expect(question.stimulus).toEqual({ kind: 'foldPunch', fold, state: 'folded', holes });
        for (const hole of holes) {
          const away = fold === 'vertical' ? hole.col : hole.row; // 0 at the outer edge, 1 beside the fold
          const along = fold === 'vertical' ? hole.row : hole.col;
          expect([0, 1]).toContain(away);
          if (level === 1) expect([away, [0, 3].includes(along)]).toEqual([0, true]);
          if (level === 2) expect(away).toBe(1);
        }
        // The answer has each hole and its copy the same distance from the fold, on the other side.
        const answer = question.options[question.answerIndex] as Extract<Visual, { kind: 'foldPunch' }>;
        expect(answer.state).toBe('unfolded');
        const want = holes.flatMap((hole) => [hole, fold === 'vertical' ? { col: 3 - hole.col, row: hole.row } : { col: hole.col, row: 3 - hole.row }]);
        const key = (list: Hole[]): string => list.map((hole) => `${hole.col},${hole.row}`).sort().join(' ');
        expect(key(answer.holes)).toBe(key(want));
        // One wrong option shows the punch going through one layer only.
        expect(question.options.some((option) => option.kind === 'foldPunch' && key(option.holes) === key(holes))).toBe(true);
        for (const option of question.options) {
          if (option.kind !== 'foldPunch') throw new Error('not paper');
          for (const hole of option.holes) expect(Math.min(hole.col, hole.row) >= 0 && Math.max(hole.col, hole.row) <= 3).toBe(true);
        }
      }
      expect(folds).toEqual(new Set(['vertical', 'horizontal']));
    }
  });
});

// The level each puzzle gained in plan section 15, phase I, part 2.
describe('the harder top levels', () => {
  type Grid = Extract<Visual, { kind: 'matrix' }>;
  const filledGrid = (question: Choice): Shape[] => {
    if (question.stimulus?.kind !== 'matrix') throw new Error('not a grid');
    return (question.stimulus as Grid).cells.map((cell) => asShape(cell === 'blank' ? question.options[question.answerIndex] : cell));
  };
  const lines = (cells: Shape[]): Shape[][] => [
    ...[0, 1, 2].map((r) => cells.slice(r * 3, r * 3 + 3)),
    ...[0, 1, 2].map((c) => [cells[c], cells[c + 3], cells[c + 6]] as Shape[]),
  ];

  it('A.1 level 4: four different shapes, and exactly one hidden rule splits them three to one', () => {
    const ways = new Set<string>();
    const round = (visual: Shape): string => (['circle', 'oval'].includes(visual.shape) ? 'round' : visual.shape === 'heart' ? 'heart' : 'corners');
    const tests: Record<string, (visual: Shape) => string> = { shape: (v) => v.shape, colour: (v) => v.color, size: (v) => v.size, round };
    for (const question of choices('R-A1', 4)) {
      const shapes = question.options.map(asShape);
      for (let i = 0; i < 4; i += 1) for (let j = i + 1; j < 4; j += 1) expect(samePicture(shapes[i] as Visual, shapes[j] as Visual)).toBe(false);
      const splits = Object.entries(tests).flatMap(([name, value]) => {
        const values = shapes.map(value);
        const odd = values.flatMap((each, i) => (values.filter((other) => other === each).length === 1 && new Set(values.filter((_, j) => j !== i)).size === 1 ? [i] : []));
        return odd.map((i) => [name, i] as const);
      });
      expect(splits).toEqual([[question.facts.by, question.answerIndex]]);
      ways.add(question.facts.by as string);
    }
    expect(ways).toEqual(new Set(['round', 'colour', 'shape']));
  });

  it('A.2 level 3: three examples, one option from their group, two from close groups and one from a far group', () => {
    for (const question of choices('R-A2', 3)) {
      const group = question.facts.target as string;
      const examples = question.facts.examples as string[];
      expect(examples.map(groupOf)).toEqual([group, group, group]);
      const words = options<string>(question);
      expect(words.filter((word) => groupOf(word) === group)).toEqual([question.facts.answer]);
      expect(words[question.answerIndex]).toBe(question.facts.answer);
      expect(examples).not.toContain(question.facts.answer);
      const wrong = words.filter((word) => word !== question.facts.answer).map(groupOf);
      expect(wrong.filter((other) => close(other, group))).toHaveLength(2);
      expect(wrong.filter((other) => !close(other, group))).toHaveLength(1);
      const groups = [...words, ...examples].map(groupOf);
      expect(groups.includes('plants') && groups.includes('food')).toBe(false);
      expect([...words, ...examples].includes('fish') && groups.includes('food')).toBe(false);
    }
  });

  it('A.3 level 3: three of four things change, and each wrong option misses one change', () => {
    const changes = new Set<number>();
    for (const question of choices('R-A3', 3)) {
      const [from, to, base] = [question.facts.from, question.facts.to, question.facts.base] as string[][];
      const moving = [0, 1, 2, 3].filter((i) => from?.[i] !== to?.[i]);
      expect(moving).toHaveLength(3);
      const still = [0, 1, 2, 3].find((i) => !moving.includes(i)) as number;
      changes.add(still);
      expect([0, 1, 2, 3].filter((i) => base?.[i] !== from?.[i])).toEqual([still]);
      const codes = options<string>(question).map((each) => each.split('|'));
      const answer = codes[question.answerIndex] as string[];
      const missed = codes.filter((_, i) => i !== question.answerIndex).map((each) => [0, 1, 2, 3].filter((i) => each[i] !== answer[i]));
      expect(missed.map((each) => each.length)).toEqual([1, 1, 1]);
      expect(missed.flat().sort()).toEqual(moving);
    }
    expect(changes).toEqual(new Set([0, 1, 2, 3]));
  });

  it('A.4 level 4: a 3 by 3 grid, each row one colour, each row and column every shape once', () => {
    const blanks = new Set<number>();
    for (const question of choices('R-A4', 4)) {
      blanks.add(question.facts.blank as number);
      const cells = filledGrid(question);
      expect(cells).toHaveLength(9);
      for (let r = 0; r < 3; r += 1) expect(new Set(cells.slice(r * 3, r * 3 + 3).map((cell) => cell.color)).size).toBe(1);
      for (const line of lines(cells)) expect(new Set(line.map((cell) => cell.shape)).size).toBe(3);
      expect(new Set(cells.map((cell) => cell.color)).size).toBe(3);
    }
    expect(blanks.size).toBe(9);
  });

  it('A.5 level 4: a quarter turn and a change of colour every step', () => {
    for (const question of choices('R-A5', 4)) {
      if (question.stimulus?.kind !== 'sequence') throw new Error('not a row');
      const shown = question.stimulus.items.slice(0, 3).map((item) => asShape(item as Visual));
      shown.slice(1).forEach((item, i) => {
        expect((item.rotation - (shown[i] as Shape).rotation + 360) % 360).toBe(90);
        expect(item.color).not.toBe((shown[i] as Shape).color);
      });
      expect(shown[0]?.color).toBe(shown[2]?.color);
      const want = { rotation: ((shown[2] as Shape).rotation + 90) % 360, color: (shown[1] as Shape).color };
      const fits = question.options.map(asShape).flatMap((option, i) => (option.rotation === want.rotation && option.color === want.color ? [i] : []));
      expect(fits).toEqual([question.answerIndex]);
    }
  });

  it('A.6 level 4: two pieces in two colours; the mirror swaps them and flips each one', () => {
    const pieces = (visual: Visual | undefined): Shape[] => {
      if (visual?.kind !== 'row') throw new Error('not a row');
      return visual.children.map(asShape);
    };
    for (const question of choices('R-A6', 4)) {
      const shown = pieces(question.stimulus);
      expect(shown).toHaveLength(2);
      expect(shown[0]?.color).not.toBe(shown[1]?.color);
      for (const piece of shown) expect(['flag', 'lShape']).toContain(piece.shape);
      const mirror = [...shown].reverse().map((piece) => `${piece.shape} ${piece.color} ${(360 - piece.rotation) % 360} flipped`);
      const fits = question.options.map((option, i) => (pieces(option).map((piece) => `${piece.shape} ${piece.color} ${piece.rotation} ${piece.flip ? 'flipped' : ''}`).join() === mirror.join() ? i : -1)).filter((i) => i >= 0);
      expect(fits).toEqual([question.answerIndex]);
    }
  });

  it('A.7 level 3: the colour, the size and the shape each follow their own rule; each wrong option breaks one', () => {
    for (const question of choices('R-A7', 3)) {
      const unit = (question.facts.unit as string[]).map((beat) => beat.split('|'));
      expect(unit).toHaveLength(12);
      const period = (part: number): number => [1, 2, 3, 4].find((p) => unit.every((beat, i) => beat[part] === unit[i % p]?.[part])) ?? 0;
      expect([period(0), period(1)].sort()).toEqual([2, 4]);
      expect(period(2)).toBe(3);
      const shown = question.facts.shown as number;
      expect([6, 7]).toContain(shown);
      const answer = options<string>(question)[question.answerIndex]?.split('|') as string[];
      expect(answer).toEqual(unit[shown]);
      const broken = options<string>(question).filter((_, i) => i !== question.answerIndex).map((option) => [0, 1, 2].filter((part) => option.split('|')[part] !== answer[part]));
      expect(broken.map((parts) => parts.join()).sort()).toEqual(['0', '1', '2']);
    }
  });

  it('A.8 level 4: times 3, 4 or 5, or double and then add or take away up to 3', () => {
    const kinds = new Set<string>();
    for (const question of all('R-A8', 4)) {
      if (question.type !== 'numberPad') throw new Error('not typed');
      const [[a, b], [c, d]] = question.facts.examples as [[number, number], [number, number]];
      const base = question.facts.base as number;
      expect(new Set([a, c, base]).size).toBe(3);
      const times = [3, 4, 5].find((n) => b === a * n && d === c * n);
      const after = b - 2 * a;
      if (times) {
        kinds.add('times');
        expect(question.answer).toBe(base * times);
      } else {
        kinds.add('twoStep');
        expect(d - 2 * c).toBe(after);
        expect([-3, -2, -1, 1, 2, 3]).toContain(after);
        expect(question.answer).toBe(base * 2 + after);
      }
      // Never a rule from the levels below.
      expect(b - a === d - c || (b === 2 * a && d === 2 * c)).toBe(false);
      expect(Math.min(b, d, question.answer)).toBeGreaterThanOrEqual(1);
    }
    expect(kinds).toEqual(new Set(['times', 'twoStep']));
  });

  it('A.9 level 3: the pairs run backwards, with the other first halves of the relation among four options', () => {
    for (const question of choices('R-A9', 3)) {
      const target = ANALOGY_PAIRS.find((pair) => pair.second.word === question.facts.target);
      expect(target).toBeDefined();
      const words = options<string>(question);
      expect(words[question.answerIndex]).toBe(target!.first.word);
      const relationOf = (first: string): string => ANALOGY_PAIRS.find((pair) => pair.first.word === first)?.relation ?? '?';
      expect(words.filter((word) => relationOf(word) === target!.relation)).toHaveLength(3);
      const example = question.facts.example as [string, string];
      expect(words).toContain(example[1]);
      for (const [first, second] of ANALOGY_CLASHES) expect(second === target!.second.word && words.includes(first)).toBe(false);
      const cap = (word: string): string => `${word.charAt(0).toUpperCase()}${word.slice(1)}`;
      expect(question.prompt.text).toBe(`${cap(example[0])} is to ${example[1]} as ${target!.second.word} is to what?`);
    }
  });

  it('A.10 level 4: jumps that grow, or each number 2 or 3 times the one before', () => {
    const rules = new Set<string>();
    for (const question of all('R-A10', 4)) {
      if (question.stimulus?.kind !== 'sequence' || question.type !== 'numberPad') throw new Error('not a typed row');
      const shown = question.stimulus.items.slice(0, -1).map((item) => Number((item as Extract<Visual, { kind: 'text' }>).value));
      const values = [...shown, question.answer];
      rules.add(question.facts.rule as string);
      if (question.facts.rule === 'times') {
        const factor = (values[1] as number) / (values[0] as number);
        expect([2, 3]).toContain(factor);
        values.slice(1).forEach((value, i) => expect(value).toBe((values[i] as number) * factor));
      } else {
        const jumps = values.slice(1).map((value, i) => value - (values[i] as number));
        const grow = (jumps[1] as number) - (jumps[0] as number);
        expect([1, 2]).toContain(grow);
        jumps.slice(1).forEach((jump, i) => expect(jump - (jumps[i] as number)).toBe(grow));
      }
      expect(question.answer).toBeLessThan(1000);
    }
    expect(rules).toEqual(new Set(['grow', 'times']));
  });

  it('A.11 level 4: two or three empty boxes that hold the same number, and the scale balances', () => {
    const boxes = new Set<number>();
    for (const question of all('R-A11', 4)) {
      if (question.type !== 'numberPad' || question.stimulus?.kind !== 'scale') throw new Error('not a typed scale');
      const { left, right } = question.stimulus;
      const blanks = left.filter((value) => value === 'blank').length;
      boxes.add(blanks);
      const known = left.filter((value): value is number => value !== 'blank');
      expect(known.length).toBeLessThanOrEqual(1);
      expect(blanks * question.answer + known.reduce((sum, value) => sum + value, 0)).toBe(right.reduce((sum, value) => sum + value, 0));
      if (right.length === 2) expect(right).not.toContain(question.answer);
      expect(question.answer).toBeGreaterThanOrEqual(2);
    }
    expect(boxes).toEqual(new Set([2, 3]));
  });

  it('A.13 level 4: the middle is missing, and each row and column has every shape and every colour once', () => {
    for (const question of choices('R-A13', 4)) {
      expect(question.facts.blank).toBe(4);
      const cells = filledGrid(question);
      for (const line of lines(cells)) {
        expect(new Set(line.map((cell) => cell.shape)).size).toBe(3);
        expect(new Set(line.map((cell) => cell.color)).size).toBe(3);
      }
      expect(new Set(cells.map((cell) => `${cell.shape} ${cell.color}`)).size).toBe(9);
    }
  });

  it('A.14 level 3: four pictures, each the answer to a riddle, and every riddle comes up', () => {
    const asked = new Set<string>();
    for (const question of choices('R-A14', 3)) {
      const riddle = RIDDLES.find((candidate) => candidate.riddle === question.prompt.text);
      asked.add(riddle!.riddle);
      const words = options<string>(question);
      expect(words[question.answerIndex]).toBe(riddle!.word);
      expect(new Set(words).size).toBe(4);
      for (const word of words) expect(RIDDLES.some((candidate) => candidate.word === word)).toBe(true);
    }
    expect(asked.size).toBe(12);
  });
});
