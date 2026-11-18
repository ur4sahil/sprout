// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { skillById } from '../../src/content/catalogue';
import { numberWord } from '../../src/content/data/h1-numberWords';
import { LADDERS } from '../../src/content/ladders';
import { generateQuestion } from '../../src/content/registry';
import { ROWS } from '../../src/content/waves/h1/catalogue';
import type { Facts, Level, Question } from '../../src/engine/types';
import { WAVE } from '../oracles/waves/h1';

// The level rules of plan section 15 wave H1 (docs/waves/h1.md), and its oracles.

const SEEDS = 300;
const all = (skillId: string, level: Level): Question[] => Array.from({ length: SEEDS }, (_, i) => generateQuestion(skillId, level, i + 1));
const n = (question: Question, name: string): number => question.facts[name] as number;
const range = (questions: Question[], of: (question: Question) => number): [number, number] => {
  const values = questions.map(of);
  return [Math.min(...values), Math.max(...values)];
};
const types = (questions: Question[]): string[] => [...new Set(questions.map((question) => question.type))].sort();
const oracle = (name: string, facts: Facts): unknown => {
  const run = WAVE[name];
  if (!run) throw new Error(`no oracle ${name}`);
  return run(facts);
};

describe('the wave', () => {
  it('adds 20 kindergarten and 20 grade 1 skills, each on the ladder it names, after a skill of its grade or lower', () => {
    expect(ROWS.filter((row) => row.grade === 'K')).toHaveLength(20);
    expect(ROWS.filter((row) => row.grade === '1')).toHaveLength(20);
    const order = ['PK', 'K', '1', '2', '3'];
    for (const row of ROWS) {
      expect(skillById(row.id)).toBe(row);
      const ladder = LADDERS.find((each) => each.id === row.ladder);
      expect(ladder?.skillIds, row.id).toContain(row.id);
      const ids = ladder?.skillIds ?? [];
      const grades = ids.map((id) => order.indexOf(id.split('-')[1] as string));
      expect(grades, `${row.ladder} goes down a grade`).toEqual([...grades].sort((x, y) => x - y));
    }
  });

  it('writes number words the way the numberName oracle reads them', () => {
    expect([numberWord(7), numberWord(14), numberWord(40), numberWord(47), numberWord(100), numberWord(107), numberWord(120)]).toEqual(['seven', 'fourteen', 'forty', 'forty-seven', 'one hundred', 'one hundred seven', 'one hundred twenty']);
  });
});

describe('kindergarten', () => {
  it('A.8 counts one kind among others: 3 to 7, 6 to 12, 8 to 15 typed, never more than 20 objects', () => {
    expect(range(all('M-K-A8', 1), (q) => n(q, 'n'))).toEqual([3, 7]);
    expect(range(all('M-K-A8', 2), (q) => n(q, 'n'))).toEqual([6, 12]);
    expect(range(all('M-K-A8', 3), (q) => n(q, 'n'))).toEqual([8, 15]);
    expect(types(all('M-K-A8', 3))).toEqual(['numberPad']);
    for (const level of [1, 2, 3] as Level[]) for (const q of all('M-K-A8', level)) expect(n(q, 'n') + n(q, 'm')).toBeLessThanOrEqual(20);
  });

  it('A.9 is a listen skill to 20; level 1 options are 3 or more apart', () => {
    for (const level of [1, 2, 3] as Level[]) for (const q of all('M-K-A9', level)) expect(q.mode).toBe('listen');
    for (const q of all('M-K-A9', 1)) {
      const values = q.facts.options as number[];
      expect(values[1]! - values[0]!).toBeGreaterThanOrEqual(3);
      expect(values[2]! - values[1]!).toBeGreaterThanOrEqual(3);
    }
  });

  it('A.10 reads words one to five, then to ten, then picks the word; nothing says the word', () => {
    expect(range(all('M-K-A10', 1), (q) => n(q, 'n'))).toEqual([1, 5]);
    expect(range(all('M-K-A10', 2), (q) => n(q, 'n'))).toEqual([1, 10]);
    for (const level of [1, 2, 3] as Level[]) {
      for (const q of all('M-K-A10', level)) {
        expect(q.mode).toBe('read');
        if (q.type !== 'choice') throw new Error('not a choice');
        for (const option of q.options) expect(option.speak).toBeUndefined();
        expect(q.stimulus?.speak).toBeUndefined();
      }
    }
    for (const q of all('M-K-A10', 3)) expect(q.facts.ask).toBe('words');
  });

  it('A.11 lines up 3 animals, then 5, then asks for the place word', () => {
    for (const q of all('M-K-A11', 1)) expect((q.facts.line as string[]).length).toBe(3);
    for (const q of all('M-K-A11', 2)) expect((q.facts.line as string[]).length).toBe(5);
    for (const q of all('M-K-A11', 3)) expect(q.facts.ask).toBe('place');
  });

  it('A.12 counts back: gap at the end from 10 or less, anywhere from 20, typed from 30', () => {
    for (const q of all('M-K-A12', 1)) expect(n(q, 'blankIndex')).toBe(3);
    expect(range(all('M-K-A12', 1), (q) => n(q, 'start'))[1]).toBe(10);
    expect(range(all('M-K-A12', 2), (q) => n(q, 'start'))[1]).toBe(20);
    expect(types(all('M-K-A12', 3))).toEqual(['numberPad']);
    for (const level of [1, 2, 3] as Level[]) for (const q of all('M-K-A12', level)) expect(n(q, 'step')).toBe(-1);
  });

  it('A.13 counts tally marks 1 to 5, 6 to 10, then 11 to 20 typed', () => {
    expect(range(all('M-K-A13', 1), (q) => n(q, 'n'))).toEqual([1, 5]);
    expect(range(all('M-K-A13', 2), (q) => n(q, 'n'))).toEqual([6, 10]);
    expect(range(all('M-K-A13', 3), (q) => n(q, 'n'))).toEqual([11, 20]);
  });

  it('B.4 asks yes or no, then how many more, then typed with none needed sometimes', () => {
    const yes = all('M-K-B4', 1).filter((q) => q.type === 'choice' && q.answerIndex === 0).length;
    expect(yes).toBeGreaterThan(90);
    expect(yes).toBeLessThan(210);
    for (const q of all('M-K-B4', 2)) expect(n(q, 'have')).toBeLessThan(n(q, 'need'));
    expect(all('M-K-B4', 3).some((q) => q.type === 'numberPad' && q.answer === 0)).toBe(true);
  });

  it('B.5 compares a group with a numeral: 2 or more apart to 5, to 10, then 1 apart asking more or fewer', () => {
    for (const q of all('M-K-B5', 1)) {
      const [a, b] = q.facts.values as [number, number];
      expect(Math.abs(a - b)).toBeGreaterThanOrEqual(2);
      expect(Math.max(a, b)).toBeLessThanOrEqual(5);
    }
    for (const q of all('M-K-B5', 3)) {
      const [a, b] = q.facts.values as [number, number];
      expect(Math.abs(a - b)).toBe(1);
    }
    expect(new Set(all('M-K-B5', 3).map((q) => q.facts.ask))).toEqual(new Set(['most', 'least']));
  });

  it('C.12 and C.13 hop on a line from 0 to 5, then 0 to 10, then typed', () => {
    for (const id of ['M-K-C12', 'M-K-C13']) {
      for (const q of all(id, 1)) expect(q.stimulus).toMatchObject({ kind: 'numberLine', min: 0, max: 5 });
      for (const q of all(id, 2)) expect(q.stimulus).toMatchObject({ kind: 'numberLine', min: 0, max: 10 });
      expect(types(all(id, 3))).toEqual(['numberPad']);
    }
    for (const q of all('M-K-C12', 2)) expect(n(q, 'a') + n(q, 'b')).toBeLessThanOrEqual(10);
    for (const q of all('M-K-C13', 2)) expect(n(q, 'b')).toBeLessThanOrEqual(n(q, 'a'));
  });

  it('C.14 shows a picture first, then a sign to pick within 5, then within 10', () => {
    for (const q of all('M-K-C14', 1)) expect(q.stimulus?.kind).not.toBe('equation');
    for (const q of all('M-K-C14', 2)) expect(n(q, 'a') + n(q, 'b')).toBeLessThanOrEqual(10);
    expect(range(all('M-K-C14', 3), (q) => Math.max(n(q, 'a'), n(q, 'result')))[1]).toBe(10);
  });

  it('C.15 and C.16 never offer the turned-around sum, which would also be right', () => {
    for (const level of [1, 2, 3] as Level[]) {
      for (const q of all('M-K-C15', level)) {
        const turned = level === 3 ? `${n(q, 'b')} + ${n(q, 'a')}` : `${n(q, 'b')} + ${n(q, 'a')} = ${n(q, 'a') + n(q, 'b')}`;
        if (n(q, 'a') !== n(q, 'b')) expect(q.facts.options).not.toContain(turned);
      }
    }
    for (const q of all('M-K-C16', 2)) expect(n(q, 'a')).toBeLessThanOrEqual(10);
  });

  it('C.17 makes 5 from dots, from pictures, then typed with the gap on either side', () => {
    for (const level of [1, 2, 3] as Level[]) for (const q of all('M-K-C17', level)) expect(n(q, 'total')).toBe(5);
    expect(new Set(all('M-K-C17', 3).map((q) => q.facts.blank))).toEqual(new Set(['a', 'b']));
  });

  it('E.6 asks flat shapes, then the shape of a thing, then solids', () => {
    for (const q of all('M-K-E6', 1)) expect(['circle', 'triangle', 'rectangle']).toContain(q.facts.target);
    for (const q of all('M-K-E6', 3)) expect(['sphere', 'cylinder', 'cube']).toContain(q.facts.target);
  });

  it('E.7 and F.4 to F.6 keep to their asks', () => {
    for (const q of all('M-K-E7', 1)) expect(q.facts.ask).toBe('roll');
    for (const q of all('M-K-E7', 2)) expect(q.facts.ask).toBe('stack');
    for (const q of all('M-K-F4', 1)) expect(q.facts.ask).toBe('most');
    for (const q of all('M-K-F4', 2)) expect(q.facts.ask).toBe('least');
    for (const q of all('M-K-F4', 3)) expect((q.facts.options as string[]).length).toBe(3);
    for (const q of all('M-K-F6', 1)) expect(q.facts.options).toEqual(['by color', 'by shape']);
  });

  it('G.2 offers three rows with three different patterns', () => {
    for (const level of [1, 2, 3] as Level[]) for (const q of all('M-K-G2', level)) expect(new Set(q.facts.options as string[]).size).toBe(3);
  });
});

describe('grade 1', () => {
  it('A.6 hears 21 to 99, then 100 to 120, then any to 120', () => {
    expect(range(all('M-1-A6', 1), (q) => n(q, 'target'))).toEqual([21, 99]);
    expect(range(all('M-1-A6', 2), (q) => n(q, 'target'))).toEqual([100, 120]);
    for (const q of all('M-1-A6', 3)) expect(q.mode).toBe('listen');
  });

  it('A.7 shows blocks to 50, to 99, then trades a ten for ten ones', () => {
    expect(range(all('M-1-A7', 1), (q) => n(q, 'n'))[1]).toBeLessThanOrEqual(50);
    for (const q of all('M-1-A7', 3)) {
      if (q.type !== 'choice') throw new Error('not a choice');
      const right = (q.facts.options as number[][])[q.answerIndex] as number[];
      expect(right[1]).toBeGreaterThanOrEqual(10);
    }
  });

  it('A.8 orders 3 numbers to 50, then 4 to 99 with two sharing tens, then 4 with one over 100', () => {
    for (const q of all('M-1-A8', 1)) expect((q.facts.values as number[]).length).toBe(3);
    for (const q of all('M-1-A8', 2)) {
      const values = q.facts.values as number[];
      expect(new Set(values.map((v) => Math.floor(v / 10))).size).toBeLessThan(4);
    }
    for (const q of all('M-1-A8', 3)) expect((q.facts.values as number[]).some((v) => v >= 100)).toBe(true);
  });

  it('A.9 keeps the chart piece inside one row of ten, and inside 120', () => {
    for (const level of [1, 2, 3] as Level[]) {
      for (const q of all('M-1-A9', level)) {
        expect(((n(q, 'topLeft') - 1) % 10) + 1).toBeLessThanOrEqual(8);
        expect(n(q, 'topLeft') + 22).toBeLessThanOrEqual(120);
      }
    }
    for (const q of all('M-1-A9', 1)) expect([3, 5]).toContain(n(q, 'blank'));
  });

  it('A.10 reads teen words, then to 99, then picks the words; nothing says them', () => {
    expect(range(all('M-1-A10', 1), (q) => n(q, 'n'))).toEqual([13, 19]);
    for (const level of [1, 2, 3] as Level[]) for (const q of all('M-1-A10', level)) expect(q.mode).toBe('read');
  });

  it('B.14 asks in the family, then not in it, then typed', () => {
    for (const q of all('M-1-B14', 1)) expect(q.facts.ask).toBe('in');
    for (const q of all('M-1-B14', 2)) expect(q.facts.ask).toBe('notIn');
    expect(types(all('M-1-B14', 3))).toEqual(['numberPad']);
  });

  it('B.15 adds three numbers: to 10 with a picture, then 11 to 20', () => {
    for (const q of all('M-1-B15', 1)) {
      expect(n(q, 'a') + n(q, 'b') + n(q, 'c')).toBeLessThanOrEqual(10);
      expect(q.stimulus).toBeDefined();
    }
    for (const q of all('M-1-B15', 2)) expect(n(q, 'a') + n(q, 'b') + n(q, 'c')).toBeGreaterThanOrEqual(11);
  });

  it('B.16 asks how many came, then how many went, then any kind typed', () => {
    for (const q of all('M-1-B16', 1)) expect(q.facts.blank).toBe('b');
    for (const q of all('M-1-B16', 2)) expect(q.facts.oracle).toBe('subtract');
    expect(new Set(all('M-1-B16', 3).map((q) => q.facts.oracle ?? q.facts.blank))).toEqual(new Set(['b', 'a', 'subtract']));
  });

  it('B.17 hides the last number to 10, then any number to 20, then mixes in a minus', () => {
    for (const q of all('M-1-B17', 1)) expect((q.facts.right as unknown[])[2]).toBe('blank');
    expect(all('M-1-B17', 3).some((q) => [...(q.facts.left as unknown[]), ...(q.facts.right as unknown[])].includes('-'))).toBe(true);
  });

  it('B.18 and B.19 keep to their ranges', () => {
    for (const q of all('M-1-B18', 1)) expect(n(q, 'b')).toBeLessThanOrEqual(2);
    for (const q of all('M-1-B18', 2)) expect(n(q, 'b')).toBeGreaterThanOrEqual(2);
    for (const q of all('M-1-B19', 1)) expect(n(q, 'a')).toBeLessThanOrEqual(14);
    for (const q of all('M-1-B19', 2)) expect(n(q, 'b')).toBeGreaterThan(n(q, 'a') - 10);
  });

  it('C.6 matches hours, half hours, then both with two at the same hour', () => {
    for (const q of all('M-1-C6', 1)) for (const t of q.facts.leftValues as string[]) expect(t.endsWith(':00')).toBe(true);
    for (const q of all('M-1-C6', 2)) for (const t of q.facts.leftValues as string[]) expect(t.endsWith(':30')).toBe(true);
  });

  it('C.7 and C.8 ask after, before, then two away', () => {
    for (const id of ['M-1-C7', 'M-1-C8']) {
      for (const q of all(id, 1)) expect(n(q, 'shift')).toBe(1);
      for (const q of all(id, 2)) expect(n(q, 'shift')).toBe(-1);
      expect(new Set(all(id, 3).map((q) => n(q, 'shift')))).toEqual(new Set([2, -2, 1, -1]));
    }
  });

  it('C.9 to C.12 keep to their asks', () => {
    for (const q of all('M-1-C9', 1)) expect(q.facts.ask).toBe('value');
    for (const q of all('M-1-C9', 3)) expect(q.facts.ask).toBe('difference');
    for (const q of all('M-1-C10', 3)) expect((q.facts.itemAttrs as string[]).length).toBe(9);
    for (const q of all('M-1-C11', 1)) expect((q.facts.coins as string[]).every((coin) => coin === 'dime')).toBe(true);
    for (const q of all('M-1-C12', 3)) expect(q.stimulus).toBeUndefined();
  });

  it('D.4 and D.5 keep to their asks', () => {
    for (const q of all('M-1-D4', 1)) expect(q.facts.ask).toBe('faceShape');
    for (const q of all('M-1-D4', 3)) expect(q.facts.ask).toBe('faces');
    for (const q of all('M-1-D5', 1)) expect(q.facts.ask).toBe('bigger');
  });
});

describe('the wave H1 oracles', () => {
  it('work answers out from the facts', () => {
    expect(oracle('h1Ordinal', { line: ['dog', 'cat', 'pig'], ask: 'which', want: 'second' })).toEqual({ kind: 'value', value: 'cat' });
    expect(oracle('h1Ordinal', { line: ['dog', 'cat', 'pig'], ask: 'place', target: 'pig' })).toEqual({ kind: 'value', value: 'third' });
    expect(oracle('h1Enough', { need: 4, have: 5, ask: 'enough' })).toEqual({ kind: 'value', value: 'Yes' });
    expect(oracle('h1Enough', { need: 4, have: 1, ask: 'more' })).toEqual({ kind: 'value', value: 3 });
    expect(oracle('h1WhichSign', { a: 5, b: 2, result: 3 })).toEqual({ kind: 'value', value: '-' });
    expect(oracle('h1SentenceFor', { a: 3, b: 2, op: '+', ask: 'sentence' })).toEqual({ kind: 'value', value: '3 + 2 = 5' });
    expect(oracle('h1ObjectShape', { ask: 'object', target: 'triangle', options: ['clock', 'tent', 'door'] })).toEqual({ kind: 'value', value: 'tent' });
    expect(oracle('h1Solids', { ask: 'which', want: 'both', options: ['cube', 'cylinder', 'sphere'] })).toEqual({ kind: 'value', value: 'cylinder' });
    expect(oracle('h1Solids', { ask: 'faces', solid: 'cube' })).toEqual({ kind: 'value', value: 6 });
    expect(oracle('h1MeasureOrder', { kind: 'weight', ask: 'least', options: ['horse', 'key', 'dog'] })).toEqual({ kind: 'value', value: 'key' });
    expect(oracle('h1SortRule', { groups: [[['circle', 'red', 's'], ['square', 'red', 'l']], [['circle', 'blue', 'l'], ['square', 'blue', 's']]] })).toEqual({ kind: 'value', value: 'by color' });
    expect(oracle('h1PatternKind', { target: 'circle circle square circle circle square', options: ['a b a b', 'a a b a a b', 'a b b a b b'] })).toEqual({ kind: 'value', value: 'a a b a a b' });
    expect(oracle('h1TensOnes', { n: 46, options: [[4, 6], [6, 4]] })).toEqual({ kind: 'value', value: [4, 6] });
    expect(oracle('h1Chart', { topLeft: 34, blank: 8 })).toEqual({ kind: 'value', value: 56 });
    expect(oracle('h1FactFamily', { numbers: [3, 5, 8], ask: 'in', options: ['8 - 3 = 5', '3 + 6 = 9', '3 + 5 = 9'] })).toEqual({ kind: 'value', value: '8 - 3 = 5' });
    expect(oracle('h1FactFamily', { numbers: [3, 5, 8], ask: 'notIn', options: ['8 - 3 = 5', '5 + 3 = 8', '3 + 6 = 9'] })).toEqual({ kind: 'value', value: '3 + 6 = 9' });
    expect(oracle('h1Balance', { left: [4, '+', 4], right: [6, '+', 'blank'] })).toEqual({ kind: 'value', value: 2 });
    expect(oracle('h1Balance', { left: [4, '+', 3], right: [9, '-', 'blank'] })).toEqual({ kind: 'value', value: 2 });
    expect(oracle('h1DownToTen', { a: 13, b: 5 })).toEqual({ kind: 'value', value: '10 - 2' });
    expect(oracle('h1Calendar', { kind: 'day', start: 'Saturday', shift: 2 })).toEqual({ kind: 'value', value: 'Monday' });
    expect(oracle('h1Calendar', { kind: 'month', start: 'January', shift: -1 })).toEqual({ kind: 'value', value: 'December' });
    expect(oracle('h1Transitive', { pairs: [['blue', 'green'], ['red', 'blue']], ask: 'most', options: ['green', 'red', 'blue'] })).toEqual({ kind: 'value', value: 'red' });
    expect(oracle('h1Transitive', { pairs: [['blue', 'green'], ['red', 'blue']], ask: 'least', options: ['green', 'red', 'blue'] })).toEqual({ kind: 'value', value: 'green' });
    expect(oracle('h1ShareSize', { parts: [4, 2], ask: 'bigger' })).toEqual({ kind: 'index', index: 1 });
  });

  it('refuse facts with no single answer', () => {
    expect(() => oracle('h1WhichSign', { a: 3, b: 0, result: 3 })).toThrow();
    expect(() => oracle('h1SortRule', { groups: [[['circle', 'red', 's']], [['square', 'blue', 's']]] })).toThrow();
    expect(() => oracle('h1Chart', { topLeft: 9, blank: 0 })).toThrow();
    expect(() => oracle('h1Transitive', { pairs: [['red', 'blue'], ['red', 'green']], ask: 'least', options: ['red', 'blue', 'green'] })).toThrow();
    expect(() => oracle('h1DownToTen', { a: 13, b: 2 })).toThrow();
  });
});
