// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { carries, borrows } from '../../src/content/generators/math/g2/addSubtract';
import { nameOf, written } from '../../src/content/generators/math/g3/numbers';
import { generateQuestion } from '../../src/content/registry';
import type { Level, Question } from '../../src/engine/types';

// The level rules of Math grade 3, categories A and B (plan section 8).

const SEEDS = 300;
const all = (skillId: string, level: Level): Question[] => Array.from({ length: SEEDS }, (_, i) => generateQuestion(skillId, level, i + 1));
const n = (question: Question, name: string): number => question.facts[name] as number;
const value = (question: Question): number => n(question, 'thousands') * 1000 + n(question, 'hundreds') * 100 + n(question, 'tens') * 10 + n(question, 'ones');
const range = (questions: Question[], of: (question: Question) => number): [number, number] => {
  const values = questions.map(of);
  return [Math.min(...values), Math.max(...values)];
};
const types = (questions: Question[]): string[] => [...new Set(questions.map((question) => question.type))];

describe('writing big numbers', () => {
  it('puts a comma after the thousands, and names a number as it is said', () => {
    expect([written(999), written(1000), written(4306), written(9999)]).toEqual(['999', '1,000', '4,306', '9,999']);
    expect([nameOf(4006), nameOf(3047), nameOf(2615), nameOf(9999), nameOf(5100)]).toEqual([
      'four thousand six', 'three thousand forty-seven', 'two thousand six hundred fifteen', 'nine thousand nine hundred ninety-nine', 'five thousand one hundred',
    ]);
  });
});

describe('A.1 Thousands, hundreds, tens, ones', () => {
  it('blocks to 1,599, place words to 9,999, typed, then what one digit is worth', () => {
    expect(range(all('M-3-A1', 1), value)[0]).toBeGreaterThanOrEqual(1101);
    expect(range(all('M-3-A1', 1), value)[1]).toBeLessThanOrEqual(1599);
    for (const question of all('M-3-A1', 1)) expect(question.stimulus?.kind).toBe('baseTen');
    for (const question of all("M-3-A1", 2)) expect(question.stimulus).toBeUndefined();
    expect(range(all('M-3-A1', 2), value)[0]).toBeGreaterThanOrEqual(2001);
    for (const question of all('M-3-A1', 2)) expect(question.prompt.text).toMatch(/^\d thousands?, \d hundreds?, \d tens?, \d ones?\. What number is this\?$/);
    expect(types(all('M-3-A1', 3))).toEqual(['numberPad']);
    const places = new Set<string>();
    for (const question of all('M-3-A1', 4)) {
      if (question.type !== 'choice') throw new Error('not a choice');
      const place = (question.facts.ask as string).replace('Value', '');
      places.add(place);
      const digit = n(question, place);
      // A zero is never asked about, and the right worth is one of the three options.
      expect(digit).toBeGreaterThan(0);
      expect(question.facts.options).toContain(digit * { thousands: 1000, hundreds: 100, tens: 10, ones: 1 }[place]!);
    }
    expect(places).toEqual(new Set(['thousands', 'hundreds', 'tens', 'ones']));
  });
});

describe('A.2 Number names to 10,000', () => {
  it('words with no zero, words with one zero, then the numeral to its words; nothing is read aloud', () => {
    for (const question of all('M-3-A2', 1)) expect(String(n(question, 'n'))).not.toContain('0');
    for (const question of all('M-3-A2', 2)) {
      const digits = String(n(question, 'n'));
      expect(digits.slice(1, 3)).toContain('0');
      expect(digits.slice(1, 3)).not.toBe('00');
    }
    for (const level of [1, 2, 3] as Level[]) {
      for (const question of all('M-3-A2', level)) {
        expect(question.mode).toBe('read');
        if (question.type !== 'choice') throw new Error('not a choice');
        for (const option of question.options) expect(option.kind === 'text' && option.speak).toBeFalsy();
      }
    }
    for (const question of all('M-3-A2', 3)) expect(question.facts.options).toContain(nameOf(n(question, 'n')));
  });
});

describe('A.3 Compare four-digit numbers', () => {
  it('different thousands, same thousands, the sign, then three in order', () => {
    const thousands = (x: number): number => Math.floor(x / 1000);
    for (const question of all('M-3-A3', 1)) {
      const [a, b] = question.facts.values as [number, number];
      expect(thousands(a)).not.toBe(thousands(b));
    }
    for (const question of all('M-3-A3', 2)) {
      const [a, b] = question.facts.values as [number, number];
      expect(thousands(a)).toBe(thousands(b));
    }
    expect(types(all('M-3-A3', 3))).toEqual(['choice']);
    for (const question of all('M-3-A3', 3)) expect(question.type === 'choice' && question.fixedOrder).toBe(true);
    for (const question of all('M-3-A3', 4)) {
      expect(question.type).toBe('order');
      const values = question.facts.values as number[];
      expect(new Set(values.map(thousands)).size).toBe(1);
    }
  });
});

describe('A.4 Round to 10 and 100', () => {
  it('to the nearest ten on a line, ten, hundred, then typed; both round numbers either side are offered', () => {
    for (const question of all('M-3-A4', 1)) {
      expect(n(question, 'to')).toBe(10);
      expect(question.stimulus?.kind).toBe('numberLine');
    }
    for (const question of all('M-3-A4', 2)) expect(n(question, 'to')).toBe(10);
    for (const question of all('M-3-A4', 3)) expect(n(question, 'to')).toBe(100);
    for (const level of [1, 2, 3] as Level[]) {
      for (const question of all('M-3-A4', level)) {
        const [x, to] = [n(question, 'n'), n(question, 'to')];
        const below = x - (x % to);
        expect(question.facts.options).toEqual(expect.arrayContaining([below, below + to]));
      }
    }
    expect(new Set(all('M-3-A4', 4).map((question) => n(question, 'to')))).toEqual(new Set([10, 100]));
    // Halfway rounds up.
    const halfway = all('M-3-A4', 2).find((question) => n(question, 'n') % 10 === 5);
    if (halfway && halfway.type === 'choice') expect((halfway.facts.options as number[])[halfway.answerIndex]).toBe(n(halfway, 'n') + 5);
  });
});

describe('B.1 and B.2 Add and subtract within 1,000, regrouping', () => {
  it('adding: one regroup, then two, then typed; the sum stays below 1,000', () => {
    for (const question of all('M-3-B1', 1)) expect(carries(n(question, 'a'), n(question, 'b'))).toHaveLength(1);
    for (const question of all('M-3-B1', 2)) expect(carries(n(question, 'a'), n(question, 'b'))).toHaveLength(2);
    for (const level of [1, 2, 3] as Level[]) for (const question of all('M-3-B1', level)) expect(n(question, 'a') + n(question, 'b')).toBeLessThanOrEqual(999);
    expect(types(all('M-3-B1', 3))).toEqual(['numberPad']);
  });

  it('subtracting: one regroup, then two, then typed, never across a zero', () => {
    for (const question of all('M-3-B2', 1)) expect(borrows(n(question, 'a'), n(question, 'b'))).toHaveLength(1);
    for (const level of [2, 3] as Level[]) for (const question of all('M-3-B2', level)) expect(borrows(n(question, 'a'), n(question, 'b'))).toHaveLength(2);
    for (const level of [1, 2, 3] as Level[]) {
      for (const question of all('M-3-B2', level)) {
        const a = n(question, 'a');
        if (borrows(a, n(question, 'b')).includes(0)) expect(Math.floor(a / 10) % 10).toBeGreaterThan(0);
        // The explanation never says a negative number of anything.
        expect(question.explanation.steps.join(' ')).not.toMatch(/-\d/);
      }
    }
  });
});

describe('B.3 Estimate sums and differences', () => {
  it('tens and adding, hundreds and either sign, then "is it reasonable" about half yes', () => {
    for (const question of all('M-3-B3', 1)) expect([n(question, 'to'), question.facts.op]).toEqual([10, '+']);
    for (const question of all('M-3-B3', 2)) expect(n(question, 'to')).toBe(100);
    expect(new Set(all('M-3-B3', 2).map((question) => question.facts.op))).toEqual(new Set(['+', '-']));
    const yes = all('M-3-B3', 3).filter((question) => question.type === 'choice' && question.answerIndex === 0).length;
    expect(yes / SEEDS).toBeGreaterThan(0.35);
    expect(yes / SEEDS).toBeLessThan(0.65);
  });
});

describe('B.4 Two-step word problems', () => {
  it('add and subtract, then one multiplication, then one division that shares exactly', () => {
    for (const question of all('M-3-B4', 1)) expect([question.facts.op1, question.facts.op2]).toEqual(['+', '-']);
    for (const question of all('M-3-B4', 2)) expect(question.facts.op1).toBe('×');
    for (const question of all('M-3-B4', 3)) {
      expect(question.facts.op1).toBe('÷');
      expect(n(question, 'a') % n(question, 'b')).toBe(0);
    }
    for (const level of [1, 2, 3] as Level[]) for (const question of all('M-3-B4', level)) expect(question.explanation.steps.length).toBeLessThanOrEqual(4);
  });
});
