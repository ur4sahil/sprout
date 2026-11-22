// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { generateQuestion } from '../../src/content/registry';
import type { Level, Question, Visual } from '../../src/engine/types';

// The level rules of Math grade 1, categories A, C, D and E (plan section 8).

const SEEDS = 300;
const all = (skillId: string, level: Level): Question[] => Array.from({ length: SEEDS }, (_, i) => generateQuestion(skillId, level, i + 1));
const n = (question: Question, name: string): number => question.facts[name] as number;
const range = (questions: Question[], value: (question: Question) => number): [number, number] => {
  const values = questions.map(value);
  return [Math.min(...values), Math.max(...values)];
};
const types = (questions: Question[]): string[] => [...new Set(questions.map((question) => question.type))];

describe('A.1 Count to 120', () => {
  it('next number to 50, to 100, across 100 typed, then before and after to 120 typed', () => {
    expect(range(all('M-1-A1', 1), (q) => n(q, 'n'))).toEqual([20, 49]);
    expect(range(all('M-1-A1', 2), (q) => n(q, 'n'))).toEqual([50, 99]);
    expect(range(all('M-1-A1', 3), (q) => n(q, 'n'))).toEqual([95, 109]);
    expect([types(all('M-1-A1', 1)), types(all('M-1-A1', 2)), types(all('M-1-A1', 3)), types(all('M-1-A1', 4))]).toEqual([['choice'], ['choice'], ['numberPad'], ['numberPad']]);
    for (const level of [1, 2, 3] as Level[]) for (const question of all('M-1-A1', level)) expect(question.facts.side).toBe('after');
    const top = all('M-1-A1', 4);
    expect(new Set(top.map((question) => question.facts.side))).toEqual(new Set(['after', 'before']));
    for (const question of top) {
      if (question.type !== 'numberPad') throw new Error('not typed');
      expect(question.answer).toBe(question.facts.side === 'after' ? n(question, 'n') + 1 : n(question, 'n') - 1);
      expect(question.answer).toBeGreaterThanOrEqual(60);
      expect(question.answer).toBeLessThanOrEqual(120);
    }
    expect(Math.max(...top.map((question) => (question.type === 'numberPad' ? question.answer : 0)))).toBeGreaterThan(100);
  });
});

describe('A.2 Skip counting and E.1 Number patterns', () => {
  const shown = (question: Question): (number | null)[] => {
    if (question.stimulus?.kind !== 'sequence') throw new Error('not a row');
    return question.stimulus.items.map((item) => (item === 'blank' ? null : Number((item as Extract<Visual, { kind: 'text' }>).value)));
  };

  it('A.2: by 10s, by 5s, by 2s, starting on a number in the count; then a missing number anywhere, typed', () => {
    for (const [level, step] of [[1, 10], [2, 5], [3, 2]] as [Level, number][]) {
      for (const question of all('M-1-A2', level)) {
        expect(n(question, 'step')).toBe(step);
        expect(n(question, 'start') % step).toBe(0);
        const row = shown(question);
        expect(row).toHaveLength(5);
        expect(row[4]).toBeNull();
        expect(question.prompt.text).toBe('What comes next?');
        // The same words as E.1 for the same idea, then the count itself.
        expect(question.explanation.steps[0]).toBe(`The numbers go up by ${step}.`);
        expect(question.explanation.steps[1]).toMatch(new RegExp(`^Count by ${step}s: `));
      }
    }
    const top = all('M-1-A2', 4);
    expect(types(top)).toEqual(['numberPad']);
    expect(new Set(top.map((question) => n(question, 'step')))).toEqual(new Set([2, 5, 10]));
    expect(new Set(top.map((question) => n(question, 'blankIndex')))).toEqual(new Set([0, 1, 2, 3]));
    for (const question of top) {
      expect(question.prompt.text).toBe('Which number is missing?');
      expect(shown(question).filter((value) => value === null)).toHaveLength(1);
    }
  });

  it('E.1: plus 1 or 2, then plus 5 or 10 from any start, then minus patterns typed that never go below zero', () => {
    expect(new Set(all('M-1-E1', 1).map((question) => n(question, 'step')))).toEqual(new Set([1, 2]));
    expect(new Set(all('M-1-E1', 2).map((question) => n(question, 'step')))).toEqual(new Set([5, 10]));
    // A pattern, unlike skip counting, may start anywhere.
    expect(all('M-1-E1', 2).some((question) => n(question, 'start') % n(question, 'step') !== 0)).toBe(true);
    const top = all('M-1-E1', 3);
    expect(types(top)).toEqual(['numberPad']);
    expect(new Set(top.map((question) => n(question, 'step')))).toEqual(new Set([-1, -2, -5, -10]));
    for (const question of top) {
      if (question.type !== 'numberPad') throw new Error('not typed');
      expect(question.answer).toBeGreaterThanOrEqual(1);
      expect(question.explanation.steps[0]).toBe(`The numbers go down by ${-n(question, 'step')}.`);
      const row = shown(question).slice(0, 4) as number[];
      row.slice(1).forEach((value, i) => expect(value - (row[i] as number)).toBe(n(question, 'step')));
    }
  });
});

describe('A.3 Tens and ones', () => {
  it('blocks to 30, to 99, typed, then "how many tens"', () => {
    const value = (question: Question): number => n(question, 'tens') * 10 + n(question, 'ones');
    expect(range(all('M-1-A3', 1), value)).toEqual([11, 30]);
    expect(range(all('M-1-A3', 2), value)).toEqual([31, 99]);
    for (const level of [1, 2, 3] as Level[]) {
      for (const question of all('M-1-A3', level)) {
        expect(question.stimulus).toEqual({ kind: 'baseTen', hundreds: 0, tens: n(question, 'tens'), ones: n(question, 'ones') });
        expect(question.facts.ask).toBe('number');
      }
    }
    expect(types(all('M-1-A3', 3))).toEqual(['numberPad']);
    for (const question of all('M-1-A3', 4)) {
      if (question.type !== 'numberPad') throw new Error('not typed');
      expect(question.answer).toBe(n(question, 'tens'));
      expect(question.prompt.text).toBe(`How many tens are in ${value(question)}?`);
      // The number is shown as a numeral, not as blocks to count.
      expect(question.stimulus?.kind).toBe('text');
    }
  });

  it('offers the digits the wrong way round as a wrong answer', () => {
    const swapped = all('M-1-A3', 2).filter((question) => {
      const reverse = n(question, 'ones') * 10 + n(question, 'tens');
      return (question.facts.options as number[]).includes(reverse) && reverse !== n(question, 'tens') * 10 + n(question, 'ones');
    });
    expect(swapped.length).toBeGreaterThan(30);
  });

  it('says "1 ten" and "no ones" where that is what the blocks show, and never "1 more one"', () => {
    const lines = new Set([...all('M-1-A3', 1), ...all('M-1-A3', 2)].map((question) => question.explanation.steps.join(' ')));
    expect(lines).toContain('1 ten makes 10. 10 and 4 more is 14.');
    expect(lines).toContain('2 tens make 20. There are no ones, so it is 20.');
    expect(lines).toContain('2 tens make 20. 20 and 1 more is 21.');
    for (const line of lines) expect(line).not.toMatch(/1 more one\b/);
  });
});

describe('A.4 Compare two-digit numbers', () => {
  const tens = (value: number): number => Math.floor(value / 10);
  it('different tens, then the same tens, then the sign with equal numbers one time in five', () => {
    for (const question of all('M-1-A4', 1)) {
      const [a, b] = question.facts.values as [number, number];
      expect(tens(a)).not.toBe(tens(b));
      expect(Math.min(a, b)).toBeGreaterThanOrEqual(10);
    }
    for (const question of all('M-1-A4', 2)) {
      const [a, b] = question.facts.values as [number, number];
      expect(tens(a)).toBe(tens(b));
      expect(a).not.toBe(b);
      expect(question.explanation.steps[0]).toBe('The tens are the same, so look at the ones.');
    }
    const signs = all('M-1-A4', 3);
    let equal = 0;
    for (const question of signs) {
      if (question.type !== 'choice') throw new Error('not a choice');
      const [a, b] = question.facts.values as [number, number];
      expect(question.facts.options).toEqual(['>', '<', '=']);
      expect(question.fixedOrder).toBe(true);
      expect(question.answerIndex).toBe(a > b ? 0 : a < b ? 1 : 2);
      if (a === b) equal += 1;
    }
    expect(equal).toBeGreaterThan(SEEDS * 0.1);
    expect(equal).toBeLessThan(SEEDS * 0.3);
  });

  it('asked for the smaller number, the explanation ends by naming it', () => {
    const least = all('M-1-A4', 1).filter((question) => question.facts.ask === 'least');
    expect(least.length).toBeGreaterThan(100);
    for (const question of least) {
      const [a, b] = question.facts.values as [number, number];
      expect(question.explanation.steps.at(-1)).toBe(`${Math.min(a, b)} is less than ${Math.max(a, b)}.`);
    }
  });
});

describe('A.5 Ten more, ten less', () => {
  it('ten more, then ten less, then either typed, never below zero or past 99', () => {
    for (const [level, oracle] of [[1, 'add'], [2, 'subtract']] as [Level, string][]) {
      for (const question of all('M-1-A5', level)) {
        expect(question.facts.oracle).toBe(oracle);
        expect(n(question, 'b')).toBe(10);
        const answer = oracle === 'add' ? n(question, 'a') + 10 : n(question, 'a') - 10;
        expect(answer).toBeGreaterThanOrEqual(1);
        expect(answer).toBeLessThanOrEqual(99);
        expect(question.prompt.text).toBe(`What is 10 ${oracle === 'add' ? 'more' : 'less'} than ${n(question, 'a')}?`);
      }
    }
    expect(types(all('M-1-A5', 3))).toEqual(['numberPad']);
    expect(new Set(all('M-1-A5', 3).map((question) => question.facts.oracle))).toEqual(new Set(['add', 'subtract']));
  });
});

describe('C.1 Tell time', () => {
  it('hours, then half hours, then a written time matched to a clock', () => {
    for (const [level, minutes] of [[1, [0]], [2, [30]], [3, [0, 30]]] as [Level, number[]][]) {
      const hours = new Set<number>();
      for (const question of all('M-1-C1', level)) {
        if (question.type !== 'choice') throw new Error('not a choice');
        hours.add(n(question, 'hour'));
        expect(minutes).toContain(n(question, 'minute'));
        const right = `${n(question, 'hour')}:${String(n(question, 'minute')).padStart(2, '0')}`;
        expect((question.facts.options as string[])[question.answerIndex]).toBe(right);
        expect(new Set(question.facts.options as string[]).size).toBe(3);
        if (level === 3) {
          expect(question.options.every((option) => option.kind === 'clock')).toBe(true);
          expect(question.stimulus).toMatchObject({ kind: 'text', value: right });
        } else {
          expect(question.stimulus).toEqual({ kind: 'clock', hour: n(question, 'hour'), minute: n(question, 'minute') });
        }
      }
      expect(hours.size).toBe(12);
    }
  });

  it('twelve thirty is halfway between 12 and 1', () => {
    const half = all('M-1-C1', 2).find((question) => n(question, 'hour') === 12);
    // A time is read as on a digital clock (the owner's choice, Nov 22, 2026): "twelve thirty", never "half past 12".
    expect(half?.explanation.steps).toEqual(['The long hand points to 6. That means 30 minutes.', 'The short hand is halfway between 12 and 1, so the hour is 12.', 'It is 12:30.']);
    // On the hour, the last step joins the time in words to the written time the options show.
    const hour = all('M-1-C1', 1).find((question) => n(question, 'hour') === 3);
    expect(hour?.explanation.steps).toEqual(['The long hand points to 12.', 'The short hand points to 3.', "It is 3 o'clock. We write 3:00."]);
  });
});

describe('C.2 Order by length', () => {
  it('3 bars, then 4, then 4 that are one unit apart, never already in order', () => {
    for (const [level, count] of [[1, 3], [2, 4], [3, 4]] as [Level, number][]) {
      for (const question of all('M-1-C2', level)) {
        if (question.type !== 'order') throw new Error('not an order');
        const values = question.facts.values as number[];
        const sorted = values.slice().sort((x, y) => x - y);
        expect(values).toHaveLength(count);
        expect(values).not.toEqual(sorted);
        const gaps = sorted.slice(1).map((value, i) => value - (sorted[i] as number));
        if (level === 3) expect(new Set(gaps)).toEqual(new Set([1]));
        else expect(Math.min(...gaps)).toBeGreaterThanOrEqual(2);
        expect(question.answerOrder.map((index) => values[index])).toEqual(sorted);
        expect(question.items.map((item) => (item.kind === 'bar' ? item.length : -1))).toEqual(values);
      }
    }
  });
});

describe('C.3 Picture graphs', () => {
  it('reads one row, then the most or fewest, then how many more, typed', () => {
    for (const level of [1, 2, 3] as Level[]) {
      for (const question of all('M-1-C3', level)) {
        const values = question.facts.values as number[];
        expect(new Set(values).size).toBe(3);
        if (question.stimulus?.kind !== 'graph') throw new Error('not a graph');
        expect(question.stimulus.categories.map((category) => category.value)).toEqual(values);
        if (level === 1 && question.type === 'choice') expect((question.facts.options as number[])[question.answerIndex]).toBe(values[n(question, 'index')]);
        if (level === 2 && question.type === 'choice') {
          const wanted = question.facts.ask === 'most' ? Math.max(...values) : Math.min(...values);
          expect(values[question.answerIndex]).toBe(wanted);
          expect(question.prompt.text).toBe(`Children chose their favorite thing. Which one has the ${question.facts.ask === 'most' ? 'most' : 'fewest'}?`);
        }
        if (level === 3) {
          if (question.type !== 'numberPad') throw new Error('not typed');
          expect(question.answer).toBe((values[n(question, 'index')] as number) - (values[n(question, 'other')] as number));
          expect(question.answer).toBeGreaterThanOrEqual(1);
        }
      }
    }
    expect(new Set(all('M-1-C3', 2).map((question) => question.facts.ask))).toEqual(new Set(['most', 'least']));
  });
});

describe('C.4 Coins', () => {
  const CENTS: Record<string, number> = { penny: 1, nickel: 5, dime: 10, quarter: 25 };
  it('names the coin, then its worth, then which of two is worth more', () => {
    for (const question of all('M-1-C4', 1)) {
      if (question.type !== 'choice') throw new Error('not a choice');
      const [coin] = question.facts.coins as [string];
      expect(question.facts.options).toEqual(['penny', 'nickel', 'dime', 'quarter']);
      expect((question.facts.options as string[])[question.answerIndex]).toBe(coin);
      expect(question.stimulus).toEqual({ kind: 'coins', coins: [coin] });
    }
    for (const question of all('M-1-C4', 2)) {
      if (question.type !== 'choice') throw new Error('not a choice');
      const [coin] = question.facts.coins as [string];
      expect(question.facts.options).toEqual([1, 5, 10, 25]);
      expect((question.facts.options as number[])[question.answerIndex]).toBe(CENTS[coin]);
    }
    const pairs = new Set<string>();
    for (const question of all('M-1-C4', 3)) {
      if (question.type !== 'choice') throw new Error('not a choice');
      const coins = question.facts.coins as [string, string];
      pairs.add(coins.join('>'));
      expect(coins[0]).not.toBe(coins[1]);
      expect(CENTS[coins[question.answerIndex] as string]).toBe(Math.max(CENTS[coins[0]] as number, CENTS[coins[1]] as number));
    }
    // Every pair, both ways round. The dime against the nickel is among them: smaller, but worth more.
    expect(pairs.size).toBe(12);
  });
});

describe('D.1 Halves and fourths, and D.2 Shape attributes', () => {
  it('D.1: equal or not, then the shape showing halves, then halves or fourths', () => {
    for (const question of all('M-1-D1', 1)) {
      if (question.type !== 'choice') throw new Error('not a choice');
      expect(question.stimulus).toMatchObject({ kind: 'fraction', parts: n(question, 'parts'), equal: question.facts.equal });
      expect(question.answerIndex).toBe(question.facts.equal ? 0 : 1);
    }
    expect(new Set(all('M-1-D1', 2).map((question) => n(question, 'parts')))).toEqual(new Set([2]));
    expect(new Set(all('M-1-D1', 3).map((question) => n(question, 'parts')))).toEqual(new Set([2, 4]));
    for (const level of [2, 3] as Level[]) {
      for (const question of all('M-1-D1', level)) {
        if (question.type !== 'choice') throw new Error('not a choice');
        const answer = question.options[question.answerIndex] as Extract<Visual, { kind: 'fraction' }>;
        expect([answer.parts, answer.equal]).toEqual([n(question, 'parts'), true]);
        // One wrong shape has the other number of equal parts, and one has parts that are not equal.
        const wrong = question.options.filter((_, i) => i !== question.answerIndex) as Extract<Visual, { kind: 'fraction' }>[];
        expect(wrong.filter((option) => !option.equal)).toHaveLength(1);
        expect(wrong.filter((option) => option.equal && option.parts !== answer.parts)).toHaveLength(1);
      }
    }
  });

  it('D.2: one shape with the sides asked for, then every shape with the corners asked for, then closed or open', () => {
    const SIDES: Record<string, number> = { circle: 0, triangle: 3, square: 4, rectangle: 4, pentagon: 5, hexagon: 6 };
    const sides = (visual: Visual): number => (visual.kind === 'shape' ? (SIDES[visual.shape] as number) : -1);
    for (const question of all('M-1-D2', 1)) {
      if (question.type !== 'choice') throw new Error('not a choice');
      const wanted = SIDES[question.facts.shape as string];
      expect(question.options.map(sides).filter((count) => count === wanted)).toHaveLength(1);
      expect(sides(question.options[question.answerIndex] as Visual)).toBe(wanted);
      expect(question.options.map(sides)).toEqual(question.facts.options);
    }
    const counts = new Set<number>();
    for (const question of all('M-1-D2', 2)) {
      if (question.type !== 'multiSelect') throw new Error('not a multiSelect');
      const wanted = SIDES[question.facts.shape as string];
      expect(question.options).toHaveLength(4);
      expect(question.options.map(sides)).toEqual(question.facts.options);
      expect(question.answerIndexes).toEqual(question.options.flatMap((option, i) => (sides(option) === wanted ? [i] : [])));
      counts.add(question.answerIndexes.length);
    }
    expect(counts).toEqual(new Set([1, 2]));
    for (const question of all('M-1-D2', 3)) {
      if (question.type !== 'choice') throw new Error('not a choice');
      const open = question.stimulus?.kind === 'shape' && question.stimulus.open === true;
      expect(question.answerIndex).toBe(open ? 1 : 0);
      expect(question.facts.open === true).toBe(open);
    }
  });
});
