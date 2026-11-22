// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { STORY_COUNTABLES } from '../../src/content/data/countables';
import { generateQuestion } from '../../src/content/registry';
import type { Level, Question } from '../../src/engine/types';

// The level rules of Math grade 1, category B (plan section 8).

const SEEDS = 300;
const all = (skillId: string, level: Level): Question[] => Array.from({ length: SEEDS }, (_, i) => generateQuestion(skillId, level, i + 1));
const n = (question: Question, name: string): number => question.facts[name] as number;
const range = (questions: Question[], value: (question: Question) => number): [number, number] => {
  const values = questions.map(value);
  return [Math.min(...values), Math.max(...values)];
};
const types = (questions: Question[]): string[] => [...new Set(questions.map((question) => question.type))];
const sum = (question: Question): number => n(question, 'a') + n(question, 'b');

describe('B.1 to B.3: facts within 20', () => {
  it('B.1 adds to sums up to 12, then to 20, then typed, and says "plus"', () => {
    expect(range(all('M-1-B1', 1), sum)).toEqual([8, 12]);
    expect(range(all('M-1-B1', 2), sum)).toEqual([11, 20]);
    expect(types(all('M-1-B1', 3))).toEqual(['numberPad']);
    for (const question of [...all('M-1-B1', 1), ...all('M-1-B1', 2)]) {
      expect(Math.max(n(question, 'a'), n(question, 'b'))).toBeLessThanOrEqual(10);
      // A sum is asked naturally (the owner's choice, Nov 22, 2026), never "2 plus 9 equals what?".
      expect(question.prompt.text).toBe(`What is ${n(question, 'a')} plus ${n(question, 'b')}?`);
      expect(question.explanation.steps[0]).toBe(`Start at ${Math.max(n(question, 'a'), n(question, 'b'))}.`);
    }
  });

  it('B.2 subtracts from 12 or less, then from 20 or less, then typed, and says "minus"', () => {
    expect(range(all('M-1-B2', 1), (q) => n(q, 'a'))).toEqual([6, 12]);
    expect(range(all('M-1-B2', 2), (q) => n(q, 'a'))).toEqual([13, 20]);
    expect(types(all('M-1-B2', 3))).toEqual(['numberPad']);
    for (const level of [1, 2, 3] as Level[]) {
      for (const question of all('M-1-B2', level)) {
        expect(n(question, 'a') - n(question, 'b')).toBeGreaterThanOrEqual(1);
        expect(question.prompt.text).toBe(`What is ${n(question, 'a')} minus ${n(question, 'b')}?`);
        expect(question.prompt.text).not.toContain('take away');
      }
    }
  });

  it('B.3 is doubles to 5 plus 5, then to 10 plus 10, then near doubles typed', () => {
    for (const [level, lo, hi] of [[1, 1, 5], [2, 6, 10]] as [Level, number, number][]) {
      const questions = all('M-1-B3', level);
      expect(range(questions, (q) => n(q, 'a'))).toEqual([lo, hi]);
      for (const question of questions) {
        expect(n(question, 'a')).toBe(n(question, 'b'));
        // Doubles are said as doubles, never "two groups of", which is times-table talk.
        expect(question.explanation.steps).toEqual([`${n(question, 'a')} + ${n(question, 'a')} is a double: two ${n(question, 'a')}s.`, `Double ${n(question, 'a')} is ${sum(question)}.`]);
      }
    }
    const near = all('M-1-B3', 3);
    expect(types(near)).toEqual(['numberPad']);
    for (const question of near) {
      expect(Math.abs(n(question, 'a') - n(question, 'b'))).toBe(1);
      const small = Math.min(n(question, 'a'), n(question, 'b'));
      // A near double first says how the bigger number is the smaller one and 1 more.
      expect(question.explanation.steps).toEqual([`${small + 1} is ${small} and 1 more.`, `Double ${small} is ${small * 2}.`, `1 more is ${sum(question)}.`]);
    }
    // Either number may come first.
    expect(near.some((question) => n(question, 'a') > n(question, 'b')) && near.some((question) => n(question, 'a') < n(question, 'b'))).toBe(true);
  });
});

describe('B.4 Make ten to add', () => {
  it('9 plus n, then 8 plus n, then 7 plus n, always past ten, with two ten frames', () => {
    for (const [level, first] of [[1, 9], [2, 8], [3, 7]] as [Level, number][]) {
      for (const question of all('M-1-B4', level)) {
        if (question.type !== 'choice') throw new Error('not a choice');
        const [a, b] = [n(question, 'a'), n(question, 'b')];
        expect(a).toBe(first);
        expect(a + b).toBeGreaterThan(10);
        expect(b).toBeLessThanOrEqual(9);
        expect(question.stimulus).toEqual({ kind: 'row', children: [{ kind: 'tenFrame', filled: a, frames: 1 }, { kind: 'tenFrame', filled: b, frames: 1 }] });
        const left = a + b - 10;
        expect((question.facts.options as string[])[question.answerIndex]).toBe(`10 plus ${left}`);
        // The wrong answers: the ten made with nothing taken away, and no ten made.
        expect([...(question.facts.options as string[])].sort()).toEqual([`10 plus ${left}`, `10 plus ${b}`, `${a} plus ${left}`].sort());
        expect(question.explanation.steps.at(-1)).toBe(`10 plus ${left} is ${a + b}.`);
      }
    }
    const lines = new Set(all('M-1-B4', 2).map((question) => question.explanation.steps[0]));
    expect(lines).toContain('Move 2 from the 5 to the 8.');
    expect(lines).toContain('Move 2 from one 8 to the other.');
  });
});

describe('B.5 Missing number in an equation', () => {
  it('a plus what equals a total to 10, then to 20, then a minus blank typed', () => {
    expect(range(all('M-1-B5', 1), (q) => n(q, 'total'))).toEqual([5, 10]);
    expect(range(all('M-1-B5', 2), (q) => n(q, 'total'))).toEqual([11, 20]);
    for (const level of [1, 2] as Level[]) {
      for (const question of all('M-1-B5', level)) {
        expect(n(question, 'a') + n(question, 'b')).toBe(n(question, 'total'));
        expect(question.stimulus).toEqual({ kind: 'equation', parts: [n(question, 'a'), '+', 'blank', '=', n(question, 'total')] });
        expect(Math.min(n(question, 'a'), n(question, 'b'))).toBeGreaterThanOrEqual(1);
      }
    }
    for (const question of all('M-1-B5', 3)) {
      if (question.type !== 'numberPad') throw new Error('not typed');
      const [left, taken, whole] = [n(question, 'a'), n(question, 'b'), n(question, 'total')];
      expect(question.stimulus).toEqual({ kind: 'equation', parts: [whole, '-', 'blank', '=', left] });
      expect(question.answer).toBe(whole - left);
      expect(taken).toBe(whole - left);
      expect(question.prompt.text).toBe(`${whole} minus what equals ${left}?`);
      expect(whole).toBeLessThanOrEqual(20);
    }
  });
});

describe('B.6 True or false equations', () => {
  const worth = (side: (number | string)[]): number => side.reduce<number>((total, part, i) => (typeof part === 'number' ? total + (side[i - 1] === '-' ? -part : part) : total), 0);

  it('a sum against a number, then a sum against a sum, then a sum against a difference, about half of them true', () => {
    for (const level of [1, 2, 3] as Level[]) {
      let truths = 0;
      for (const question of all('M-1-B6', level)) {
        if (question.type !== 'choice') throw new Error('not a choice');
        const [left, right] = [question.facts.left, question.facts.right] as [(number | string)[], (number | string)[]];
        const same = worth(left) === worth(right);
        if (same) truths += 1;
        expect(question.answerIndex).toBe(same ? 0 : 1);
        expect(question.fixedOrder).toBe(true);
        expect(question.stimulus).toEqual({ kind: 'equation', parts: [...left, '=', ...right] });
        // The last step answers what was asked: true or false.
        expect(question.explanation.steps).toEqual([`The left side is ${worth(left)}.`, `The right side is ${worth(right)}.`, same ? `Both sides are ${worth(left)}, so it is true.` : `${worth(left)} and ${worth(right)} are not the same, so it is false.`]);
        const numbers = [...left, ...right].filter((part): part is number => typeof part === 'number');
        expect(Math.min(...numbers)).toBeGreaterThanOrEqual(0);
        expect(Math.max(...numbers)).toBeLessThanOrEqual(level === 3 ? 20 : 10);
        if (level === 1) expect([left.length, right.length]).toEqual([3, 1]);
        if (level === 2) expect([left.length, right.length, left[1], right[1]]).toEqual([3, 3, '+', '+']);
        if (level === 3) expect([left[1], right[1]].sort()).toEqual(['+', '-']);
      }
      expect(truths).toBeGreaterThan(SEEDS * 0.35);
      expect(truths).toBeLessThan(SEEDS * 0.65);
    }
  });
});

describe('B.7 Add three numbers', () => {
  const three = (question: Question): number[] => [n(question, 'a'), n(question, 'b'), n(question, 'c')];
  const hasTenPair = ([a, b, c]: number[]): boolean => a! + b! === 10 || a! + c! === 10 || b! + c! === 10;

  it('sums to 10, then to 20 with a pair that makes ten, then typed', () => {
    expect(range(all('M-1-B7', 1), (q) => three(q).reduce((x, y) => x + y, 0))).toEqual([5, 10]);
    for (const question of all('M-1-B7', 2)) {
      expect(hasTenPair(three(question))).toBe(true);
      expect(three(question).reduce((x, y) => x + y, 0)).toBeLessThanOrEqual(20);
      expect(question.explanation.steps[0]).toBe('Find a pair that makes 10.');
    }
    expect(types(all('M-1-B7', 3))).toEqual(['numberPad']);
    // The pair that makes ten is not always the first two.
    const where = new Set(all('M-1-B7', 2).map((question) => { const [a, b, c] = three(question); return a! + b! === 10 ? 'first two' : a! + c! === 10 ? 'outer two' : 'last two'; }));
    expect(where.size).toBe(3);
  });
});

describe('B.8 to B.10: bigger numbers and stories', () => {
  it('B.8 never carries a ten at level 1 and always does at level 2', () => {
    for (const [level, carries] of [[1, false], [2, true]] as [Level, boolean][]) {
      for (const question of all('M-1-B8', level)) {
        const [a, b] = [n(question, 'a'), n(question, 'b')];
        expect(a).toBeGreaterThanOrEqual(11);
        expect(b).toBeLessThanOrEqual(9);
        expect((a % 10) + b >= 10).toBe(carries);
        // A new ten, never "1 ten and 1 one", which is said "one one".
        const over = (a % 10) + b - 10;
        const tens = Math.floor(a / 10);
        expect(question.explanation.steps[1]).toBe(carries ? (over === 0 ? 'That makes a new ten.' : `That makes a new ten, with ${over} left over.`) : `The tens stay the same: ${tens} ${tens === 1 ? 'ten' : 'tens'}.`);
        expect(question.explanation.hint?.text).toBe('Add the ones first.');
      }
    }
    const typed = all('M-1-B8', 3);
    expect(types(typed)).toEqual(['numberPad']);
    expect(new Set(typed.map((question) => (n(question, 'a') % 10) + n(question, 'b') >= 10))).toEqual(new Set([true, false]));
  });

  it('B.9 adds tens, then subtracts tens, then adds tens to a number with ones, typed', () => {
    for (const question of all('M-1-B9', 1)) {
      expect([n(question, 'a') % 10, n(question, 'b') % 10, question.facts.oracle]).toEqual([0, 0, 'add']);
      expect(sum(question)).toBeLessThanOrEqual(90);
    }
    for (const question of all('M-1-B9', 2)) {
      expect([n(question, 'a') % 10, n(question, 'b') % 10, question.facts.oracle]).toEqual([0, 0, 'subtract']);
      expect(n(question, 'a') - n(question, 'b')).toBeGreaterThanOrEqual(10);
    }
    for (const question of all('M-1-B9', 3)) {
      if (question.type !== 'numberPad') throw new Error('not typed');
      expect(n(question, 'a') % 10).not.toBe(0);
      expect(n(question, 'b') % 10).toBe(0);
      expect(question.answer % 10).toBe(n(question, 'a') % 10);
      expect(question.answer).toBeLessThan(100);
      expect(question.explanation.steps[0]).toBe('Only the tens change.');
    }
  });

  it('B.10 is an add-to story, then a take-from story, then a compare story typed, all within 20', () => {
    for (const question of all('M-1-B10', 1)) {
      expect(['gets', 'table']).toContain(question.facts.story);
      expect(question.facts.oracle).toBe('add');
      expect(sum(question)).toBeGreaterThan(10);
      expect(sum(question)).toBeLessThanOrEqual(20);
    }
    for (const question of all('M-1-B10', 2)) {
      expect(['givesAway', 'takes']).toContain(question.facts.story);
      expect(question.facts.oracle).toBe('subtract');
    }
    for (const question of all('M-1-B10', 3)) {
      if (question.type !== 'numberPad') throw new Error('not typed');
      expect(question.facts.story).toBe('compare');
      // The first number is the bigger one, and two different children are named.
      expect(n(question, 'a')).toBeGreaterThan(n(question, 'b'));
      expect(question.facts.name).not.toBe(question.facts.name2);
      expect(question.prompt.text).toContain(`How many more does ${question.facts.name as string} have?`);
      expect(question.prompt.text).toContain(`${question.facts.name2 as string} has ${n(question, 'b')}.`);
      expect(question.answer).toBe(n(question, 'a') - n(question, 'b'));
      // The story's words say which way to go, then the sum, then the answer in the story's words.
      const things = STORY_COUNTABLES.find((thing) => thing.one === question.facts.thing)?.many;
      expect(question.explanation.steps).toEqual(['To find how many more, we subtract.', `${n(question, 'a')} − ${n(question, 'b')} = ${question.answer}.`, `${question.facts.name as string} has ${question.answer} more ${things as string} than ${question.facts.name2 as string}.`]);
    }
    for (const level of [1, 2, 3] as Level[]) for (const question of all('M-1-B10', level)) expect(Math.max(n(question, 'a'), n(question, 'b'))).toBeLessThanOrEqual(20);
  });
});
