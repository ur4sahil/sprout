// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { generateQuestion } from '../../src/content/registry';
import type { Level, Question } from '../../src/engine/types';
import { expression3, operation3, solve, valueOf } from '../oracles/waves/h5Expression';

// Wave H5, Math grade 3: the level rules in docs/waves/h5.md, and the two new oracles.

const SEEDS = 300;
const all = (skillId: string, level: Level): Question[] => Array.from({ length: SEEDS }, (_, i) => generateQuestion(skillId, level, i + 1));
const types = (questions: Question[]): string[] => [...new Set(questions.map((question) => question.type))].sort();
const n = (question: Question, name: string): number => question.facts[name] as number;
const str = (question: Question, name: string): string => question.facts[name] as string;
const digit = (x: number, place: number): number => Math.floor(x / 10 ** place) % 10;

describe('the expression3 oracle', () => {
  it('works out sentences with brackets and fractions exactly', () => {
    expect(valueOf('(2 × 3) × 4')).toEqual({ n: 24, d: 1 });
    expect(valueOf('2 + 3 × 4')).toEqual({ n: 14, d: 1 });
    expect(valueOf('2/3 × 12')).toEqual({ n: 8, d: 1 });
    expect(valueOf('3/8')).toEqual({ n: 3, d: 8 });
    expect(valueOf('400 − 156')).toEqual({ n: 244, d: 1 });
  });
  it('finds the one number for the blank, and refuses a sentence with none or many', () => {
    expect(solve('7 × 8 = 35 + □')).toBe(21);
    expect(solve('6 + □ + 6 + □ = 20')).toBe(4);
    expect(solve('□ × 8 = 0')).toBe(0);
    expect(solve('42 ÷ □ = 7')).toBe(6);
    expect(() => solve('□ × 0 = 0')).toThrow();
    expect(() => solve('□ + 1 = 0')).toThrow();
  });
  it('answers each ask', () => {
    expect(expression3({ ask: 'value', expr: '6/1' })).toEqual({ kind: 'value', value: 6 });
    expect(() => expression3({ ask: 'value', expr: '3/4' })).toThrow();
    expect(expression3({ ask: 'equal', expr: '3', options: ['3/2', '6/2', '2/6'] })).toEqual({ kind: 'value', value: '6/2' });
    expect(() => expression3({ ask: 'equal', expr: '1', options: ['2/2', '4/4'] })).toThrow();
    expect(expression3({ ask: 'parity', expr: '7 × 9' })).toEqual({ kind: 'value', value: 'odd' });
    expect(expression3({ ask: 'pickParity', want: 'odd', options: ['4 × 3', '5 × 7', '6 × 9'] })).toEqual({ kind: 'value', value: '5 × 7' });
    expect(expression3({ ask: 'most', exprs: ['2/3', '2/6'] })).toEqual({ kind: 'index', index: 0 });
    expect(expression3({ ask: 'least', exprs: ['1/4', '1/3', '1/8'] })).toEqual({ kind: 'index', index: 2 });
    expect(() => expression3({ ask: 'most', exprs: ['1/2', '2/4'] })).toThrow();
    expect(expression3({ ask: 'roundTimes', a: 4, b: 28, to: 10 })).toEqual({ kind: 'value', value: 120 });
    expect(expression3({ ask: 'roundTimes', a: 3, b: 45, to: 10 })).toEqual({ kind: 'value', value: 150 });
  });
});

describe('the operation3 oracle', () => {
  it('gives the sign for each kind of story, and the sentence', () => {
    const sign = (kind: string): unknown => operation3({ kind, ask: 'sign' });
    expect(['join', 'separate', 'compare', 'groups', 'array', 'share', 'groupsOf'].map((kind) => (sign(kind) as { value: string }).value)).toEqual(['+', '−', '−', '×', '×', '÷', '÷']);
    expect(operation3({ kind: 'share', ask: 'sentence', a: 24, b: 6 })).toEqual({ kind: 'value', value: '24 ÷ 6' });
    expect(() => operation3({ kind: 'share', ask: 'sentence', a: 25, b: 6 })).toThrow();
    expect(() => operation3({ kind: 'magic', ask: 'sign' })).toThrow();
  });
});

describe('B.5 Subtract across zeros', () => {
  it('whole hundreds, then a zero in the tens, then either in columns; the hundred must always be broken', () => {
    for (const level of [1, 2, 3] as Level[]) {
      for (const question of all('M-3-B5', level)) {
        const [a, b] = [n(question, 'a'), n(question, 'b')];
        expect(digit(a, 1)).toBe(0);
        expect(digit(b, 0)).toBeGreaterThan(digit(a, 0));
        expect(b).toBeLessThan(a);
        if (level === 1) expect(a % 100).toBe(0);
        if (level === 2) expect(a % 100).toBeGreaterThan(0);
      }
    }
    expect(types(all('M-3-B5', 3))).toEqual(['columnSum']);
  });
});

describe('B.6 Which operation?', () => {
  it('times or divide, then all four signs in fixed places, then the number sentence', () => {
    const signs = (level: Level): Set<string> => new Set(all('M-3-B6', level).map((question) => (question.type === 'choice' ? str(question, 'kind') : '')));
    expect(signs(1)).toEqual(new Set(['groups', 'array', 'share', 'groupsOf']));
    expect(signs(2)).toEqual(new Set(['join', 'separate', 'compare', 'groups', 'array', 'share', 'groupsOf']));
    for (const question of all('M-3-B6', 2)) expect(question.type === 'choice' && question.fixedOrder).toBe(true);
    for (const question of all('M-3-B6', 3)) expect(str(question, 'ask')).toBe('sentence');
  });
});

describe('C.8 Properties of multiplication', () => {
  it('times 1 and 0, then grouping three factors, then the blank in a property, typed', () => {
    for (const question of all('M-3-C8', 1)) expect(str(question, 'expr')).toMatch(/^(\d+ × [01]|[01] × \d+)$/);
    for (const question of all('M-3-C8', 2)) expect(str(question, 'expr')).toMatch(/\(/);
    expect(types(all('M-3-C8', 3))).toEqual(['numberPad']);
    const answers = new Set(all('M-3-C8', 3).map((question) => (question.type === 'numberPad' ? question.answer : -1)));
    expect(answers.has(0) && answers.has(1)).toBe(true);
  });
});

describe('C.9 Split a multiplication', () => {
  it('an array split at 5 rows, then a missing part of a split, then the missing product, typed', () => {
    for (const question of all('M-3-C9', 1)) expect(question.stimulus?.kind).toBe('array');
    for (const question of all('M-3-C9', 2)) expect(str(question, 'expr')).toMatch(/× 5\)|× □\)/);
    expect(types(all('M-3-C9', 3))).toEqual(['numberPad']);
  });
});

describe('C.10 Multiplication word problems and D.4 Division word problems', () => {
  it('a picture of the story at level 1 that shows the things in the story, none later, typed at level 3', () => {
    for (const skill of ['M-3-C10', 'M-3-D4']) {
      for (const question of all(skill, 1)) {
        expect(question.stimulus, skill).toBeDefined();
        const story = str(question, 'story');
        expect(story, skill).toMatch(/\d/);
      }
      for (const question of all(skill, 2)) expect(question.stimulus, skill).toBeUndefined();
      expect(types(all(skill, 3)), skill).toEqual(['numberPad']);
    }
    for (const question of all('M-3-D4', 1)) expect(str(question, 'kind')).toBe('share');
    for (const question of all('M-3-D4', 2)) expect(str(question, 'kind')).toBe('groupsOf');
  });
});

describe('C.11 Patterns in the times table', () => {
  it('even or odd, then pick the odd or even product, then one more or one fewer group', () => {
    const odd = all('M-3-C11', 1).filter((question) => question.type === 'choice' && question.answerIndex === 1).length;
    expect(odd).toBeGreaterThan(SEEDS * 0.25);
    expect(new Set(all('M-3-C11', 2).map((question) => str(question, 'want')))).toEqual(new Set(['odd', 'even']));
    for (const question of all('M-3-C11', 3)) expect(str(question, 'ask')).toBe('value');
  });
});

describe('C.12 Estimate products', () => {
  it('never a number that is halfway or already a ten; a story at level 2; typed at level 3', () => {
    for (const level of [1, 2, 3] as Level[]) for (const question of all('M-3-C12', level)) expect([0, 5]).not.toContain(n(question, 'b') % 10);
    for (const question of all('M-3-C12', 2)) expect(question.facts.story).toBeDefined();
    expect(types(all('M-3-C12', 3))).toEqual(['numberPad']);
  });
});

describe('D.5 Missing numbers in division', () => {
  it('the number divided, then the number divided by, then either, typed', () => {
    for (const question of all('M-3-D5', 1)) expect(str(question, 'expr')).toMatch(/^□ ÷/);
    for (const question of all('M-3-D5', 2)) expect(str(question, 'expr')).toMatch(/÷ □/);
    expect(types(all('M-3-D5', 3))).toEqual(['numberPad']);
  });
});

describe('E.5 to E.7 fractions', () => {
  it('E.5: a whole shape, then n/1 and n/n, then the fraction equal to a whole number', () => {
    for (const question of all('M-3-E5', 1)) expect(question.stimulus?.kind).toBe('fraction');
    for (const question of all('M-3-E5', 2)) expect(str(question, 'expr')).toMatch(/^(\d+)\/(1|\1)$/);
    for (const question of all('M-3-E5', 3)) expect(Number(str(question, 'expr'))).toBeGreaterThanOrEqual(2);
  });
  it('E.6: unit fractions of up to 12 with a picture, unit fractions to 60, then two thirds and the like, typed', () => {
    for (const question of all('M-3-E6', 1)) {
      expect(str(question, 'expr')).toMatch(/^1\/[234] × (\d|1[0-2])$/);
      expect(question.stimulus?.kind).toBe('emojiGroup');
    }
    for (const question of all('M-3-E6', 2)) expect(str(question, 'expr')).toMatch(/^1\//);
    for (const question of all('M-3-E6', 3)) {
      expect(str(question, 'expr')).not.toMatch(/^1\//);
      expect(question.type).toBe('numberPad');
    }
  });
  it('E.7: same bottom, then same top, then three people; nobody ties', () => {
    const fractions = (question: Question): [number, number][] => (question.facts.exprs as string[]).map((each) => each.split('/').map(Number) as [number, number]);
    for (const question of all('M-3-E7', 1)) expect(new Set(fractions(question).map(([, d]) => d)).size).toBe(1);
    for (const question of all('M-3-E7', 2)) expect(new Set(fractions(question).map(([top]) => top)).size).toBe(1);
    for (const question of all('M-3-E7', 3)) {
      expect(fractions(question)).toHaveLength(3);
      expect(new Set(fractions(question).map(([top, d]) => top / d)).size).toBe(3);
    }
  });
});

describe('F.8 to F.10 measurement', () => {
  it('F.8: two grids, then a story, then typed', () => {
    for (const question of all('M-3-F8', 1)) expect(question.stimulus?.kind).toBe('row');
    for (const question of all('M-3-F8', 2)) expect(question.stimulus).toBeUndefined();
    expect(types(all('M-3-F8', 3))).toEqual(['numberPad']);
  });
  it('F.9: two rectangles with the same perimeter and different areas, then a missing side', () => {
    for (const question of all('M-3-F9', 1)) {
      if (question.type !== 'choice') throw new Error('not a choice');
      const sides = question.options.map((option) => (option.kind === 'array' ? 2 * (option.rows + option.cols) : 0));
      expect(sides[0]).toBe(sides[1]);
      expect(new Set(question.options.map((option) => (option.kind === 'array' ? option.rows * option.cols : 0))).size).toBe(2);
    }
    for (const question of all('M-3-F9', 2)) expect(str(question, 'expr')).toMatch(/\+ □ \+/);
    expect(types(all('M-3-F9', 3))).toEqual(['numberPad']);
  });
  it('F.10: one thing on a schedule, then an end time, then across two things, typed', () => {
    for (const question of all('M-3-F10', 1)) expect(question.stimulus?.kind).toBe('text');
    for (const question of all('M-3-F10', 2)) expect(str(question, 'ask')).toBe('end');
    for (const question of all('M-3-F10', 3)) {
      expect(question.type).toBe('numberPad');
      expect(question.type === 'numberPad' && question.answer).toBeGreaterThan(30);
    }
  });
});
