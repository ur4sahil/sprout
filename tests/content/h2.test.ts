// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { CATALOGUE } from '../../src/content/catalogue';
import { COLOURED, DAY_THINGS, KINDS, LINE_ANIMALS, METRIC_THINGS, SHAPED, SOLID_THINGS, WEIGHED } from '../../src/content/data/h2-world';
import { SHOP } from '../../src/content/data/h2-stories';
import { LADDERS } from '../../src/content/ladders';
import { generateQuestion } from '../../src/content/registry';
import { ROWS } from '../../src/content/waves/h2/catalogue';
import type { Level, Question, Visual } from '../../src/engine/types';
import { ART } from '../../src/visuals/artList';
import { h2AmPm, h2Chart, h2Coins, h2Digits, h2Even, h2Metric, h2OrderBy, h2Ordinal, h2Regroup, h2SamePattern, h2Solid, h2Split, h2World } from '../oracles/waves/h2';

// The level rules of plan section 15 wave H2: Math pre-K A.9 to D.6 and Math grade 2 A.7 to D.4 (docs/waves/h2.md).

const SEEDS = 300;
const all = (skillId: string, level: Level): Question[] => Array.from({ length: SEEDS }, (_, i) => generateQuestion(skillId, level, i + 1));
const n = (question: Question, name: string): number => question.facts[name] as number;
const types = (questions: Question[]): string[] => [...new Set(questions.map((question) => question.type))];
const options = (question: Question): number => (question.type === 'choice' ? question.options.length : 0);
const digitsOf = (value: number): number[] => String(value).split('').map(Number);

describe('the wave', () => {
  it('adds 16 pre-K and 19 grade 2 skills, each with three levels', () => {
    expect(ROWS.filter((row) => row.grade === 'PK')).toHaveLength(16);
    expect(ROWS.filter((row) => row.grade === '2')).toHaveLength(19);
    for (const row of ROWS) {
      // Version 1 as shipped; 2 for the two whose wording changed (color, American spelling); one more for every
      // pre-K skill after the wording audit (Nov 22, 2026).
      const preK = ['M-PK-C6', 'M-PK-C7'].includes(row.id) ? 3 : 2;
      expect(row.version).toBe(row.grade === 'PK' ? preK : 1);
      expect(row.maxLevel).toBe(3);
      expect(CATALOGUE.filter((skill) => skill.id === row.id)).toHaveLength(1);
      if (row.grade === '2') expect(row.ccss, row.id).toMatch(/^2\./);
    }
  });

  it('puts every skill on its ladder among skills of its own grade', () => {
    for (const row of ROWS) {
      const ladder = LADDERS.find((each) => each.id === row.ladder);
      const at = ladder?.skillIds.indexOf(row.id) ?? -1;
      expect(at, row.id).toBeGreaterThan(0);
      const before = ladder?.skillIds[at - 1] ?? '';
      expect(before.startsWith(row.id.startsWith('M-PK') ? 'M-PK' : 'M-2'), `${row.id} after ${before}`).toBe(true);
    }
  });

  it('gives each picture one name, and every picture is drawn', () => {
    const names = new Map<string, Set<string>>();
    const lists: { emoji: string; name: string }[][] = [[...SHAPED], [...COLOURED], [...SOLID_THINGS], [...WEIGHED], ...Object.values(KINDS).map((list) => [...list]), [...LINE_ANIMALS], [...DAY_THINGS], [...METRIC_THINGS]];
    for (const list of lists) for (const thing of list) names.set(thing.emoji, (names.get(thing.emoji) ?? new Set()).add(thing.name));
    expect([...names].filter(([, set]) => set.size > 1).map(([emoji, set]) => `${emoji} ${[...set].join('/')}`)).toEqual([]);
    const key = (emoji: string): string => [...emoji].map((char) => char.codePointAt(0) ?? 0).filter((code) => code !== 0xfe0f).map((code) => code.toString(16)).join('-');
    const emoji = [...names.keys(), ...SHOP.map((item) => item.emoji), '🏁'];
    expect(emoji.filter((each) => !ART.has(key(each)))).toEqual([]);
  });
});

describe('Math pre-K, counting', () => {
  it('A.9 one more: up to 4 then up to 9; the one more is shown, then not', () => {
    for (const level of [1, 2, 3] as Level[]) {
      for (const question of all('M-PK-A9', level)) {
        expect(n(question, 'b')).toBe(1);
        expect(n(question, 'a')).toBeLessThanOrEqual(level === 1 ? 4 : 9);
        expect(question.stimulus?.kind).toBe(level === 3 ? 'emojiGroup' : 'row');
      }
    }
  });

  it('A.10 one fewer: 2 to 5, then to 10; one crossed out, then none', () => {
    for (const level of [1, 2, 3] as Level[]) {
      for (const question of all('M-PK-A10', level)) {
        expect(n(question, 'a')).toBeGreaterThanOrEqual(2);
        expect(n(question, 'a')).toBeLessThanOrEqual(level === 1 ? 5 : 10);
        const stimulus = question.stimulus as Visual;
        expect(stimulus.kind === 'emojiGroup' && stimulus.crossed === 1).toBe(level !== 3);
      }
    }
  });

  it('A.11 same number: wrong groups 2 away at level 1, next to it after, scattered at level 3', () => {
    for (const question of all('M-PK-A11', 1)) {
      const counts = question.facts.options as number[];
      for (const count of counts) if (count !== n(question, 'n')) expect(Math.abs(count - n(question, 'n'))).toBeGreaterThanOrEqual(2);
    }
    for (const question of all('M-PK-A11', 3)) {
      if (question.type !== 'choice') throw new Error('not a choice');
      expect(question.options.every((option) => option.kind === 'emojiGroup' && option.layout === 'scatter')).toBe(true);
    }
  });

  it('A.12 number order: the next number to 6, a gap inside to 6, a gap anywhere to 10', () => {
    for (const level of [1, 2, 3] as Level[]) {
      for (const question of all('M-PK-A12', level)) {
        const [start, length, blank] = [n(question, 'start'), n(question, 'length'), n(question, 'blankIndex')];
        expect(start + length - 1).toBeLessThanOrEqual(level === 3 ? 10 : 6);
        if (level === 1) expect(blank).toBe(length - 1);
        if (level === 2) expect(blank > 0 && blank < length - 1).toBe(true);
      }
    }
  });

  it('A.13 first and last: a line of 3, then 4 or 5, then second or third', () => {
    const asks = (level: Level): Set<string> => new Set(all('M-PK-A13', level).map((question) => question.facts.ask as string));
    expect(asks(1)).toEqual(new Set(['first', 'last']));
    expect(asks(3)).toEqual(new Set(['second', 'third']));
    for (const question of all('M-PK-A13', 1)) expect(question.facts.line).toHaveLength(3);
    for (const question of all('M-PK-A13', 2)) expect((question.facts.line as string[]).length).toBeGreaterThanOrEqual(4);
  });
});

describe('Math pre-K, comparing and measuring', () => {
  const gap = (question: Question): number => {
    const values = [...(question.facts.values as number[])].sort((x, y) => x - y);
    return Math.min(...values.slice(1).map((value, i) => value - (values[i] as number)));
  };

  it('B.3 more or less: to 5 with dots, then to 10, then next to each other', () => {
    for (const question of all('M-PK-B3', 1)) {
      expect(Math.max(...(question.facts.values as number[]))).toBeLessThanOrEqual(5);
      expect(gap(question)).toBeGreaterThanOrEqual(2);
      expect(question.facts.ask).toBe('most');
    }
    for (const question of all('M-PK-B3', 2)) expect(gap(question)).toBeGreaterThanOrEqual(2);
    for (const question of all('M-PK-B3', 3)) expect(gap(question)).toBe(1);
  });

  it('B.4 most and fewest: three groups 2 apart, then next to each other allowed', () => {
    for (const question of all('M-PK-B4', 1)) expect([gap(question) >= 2, question.facts.ask]).toEqual([true, 'most']);
    for (const question of all('M-PK-B4', 2)) expect(gap(question)).toBeGreaterThanOrEqual(2);
    expect(all('M-PK-B4', 3).some((question) => gap(question) === 1)).toBe(true);
  });

  it('C.4 heavy and light: 2 things far apart, 2 things, then 3', () => {
    const step = (name: string): number => WEIGHED.find((thing) => thing.name === name)?.step ?? 0;
    for (const level of [1, 2, 3] as Level[]) {
      for (const question of all('M-PK-C4', level)) {
        const steps = (question.facts.options as string[]).map(step).sort();
        expect(steps).toHaveLength(level === 3 ? 3 : 2);
        expect(new Set(steps).size).toBe(steps.length);
        if (level === 1) expect((steps[1] as number) - (steps[0] as number)).toBeGreaterThanOrEqual(2);
      }
    }
  });

  it('C.9 order by size: never already in order; shapes then bars', () => {
    for (const level of [1, 2, 3] as Level[]) {
      for (const question of all('M-PK-C9', level)) {
        if (question.type !== 'order') throw new Error('not an order');
        expect(question.answerOrder).not.toEqual([0, 1, 2]);
        expect(question.items[0]?.kind).toBe(level === 3 ? 'bar' : 'shape');
        if (level < 3) expect(question.facts.dir).toBe(level === 1 ? 'up' : 'down');
      }
    }
  });
});

describe('Math pre-K, shapes, colours and patterns', () => {
  it('C.5 never puts a square beside a rectangle (a square is a rectangle too)', () => {
    const shapeOf = (name: string): string => SHAPED.find((thing) => thing.name === name)?.shape ?? name;
    for (const level of [1, 2, 3] as Level[]) {
      for (const question of all('M-PK-C5', level)) {
        const shapes = (question.facts.options as string[]).map(shapeOf);
        expect(shapes.includes('square') && shapes.includes('rectangle')).toBe(false);
      }
    }
  });

  it('C.6 same shape: options share one colour, never the colour shown; turned at level 3', () => {
    for (const level of [1, 2, 3] as Level[]) {
      for (const question of all('M-PK-C6', level)) {
        if (question.type !== 'choice' || question.stimulus?.kind !== 'shape') throw new Error('not a shape choice');
        const colours = new Set(question.options.map((option) => (option.kind === 'shape' ? option.color : '')));
        expect(colours.size).toBe(1);
        expect(colours.has(question.stimulus.color)).toBe(false);
        expect(question.options.every((option) => option.kind === 'shape' && option.rotation !== 0)).toBe(level === 3);
      }
    }
  });

  it('C.7 colours: never red beside green or orange, and orange never beside yellow', () => {
    const colourOf = (name: string): string => COLOURED.find((thing) => thing.name === name)?.colour ?? name;
    for (const level of [1, 2, 3] as Level[]) {
      for (const question of all('M-PK-C7', level)) {
        const set = new Set((question.facts.options as string[]).map(colourOf));
        expect(set.size).toBe(3);
        expect(set.has('red') && (set.has('green') || set.has('orange'))).toBe(false);
        expect(set.has('orange') && set.has('yellow')).toBe(false);
      }
    }
  });

  it('D.4 fill the gap: the gap is inside the row; a third picture is offered at level 3', () => {
    for (const level of [1, 2, 3] as Level[]) {
      for (const question of all('M-PK-D4', level)) {
        expect(n(question, 'shown')).toBeGreaterThanOrEqual(1);
        expect(n(question, 'shown')).toBeLessThanOrEqual(4);
        expect(options(question)).toBe(level === 3 ? 3 : 2);
      }
    }
  });

  it('D.6 sort by kind: 4 things in 2 groups, 6 in 2, 6 in 3', () => {
    for (const level of [1, 2, 3] as Level[]) {
      for (const question of all('M-PK-D6', level)) {
        if (question.type !== 'sort') throw new Error('not a sort');
        expect([question.items.length, question.bins.length]).toEqual(level === 1 ? [4, 2] : level === 2 ? [6, 2] : [6, 3]);
        if (level === 1) expect([...(question.facts.binAttrs as string[])].sort()).toEqual(['animals', 'food']);
      }
    }
  });
});

describe('Math grade 2, numbers to 1,000', () => {
  it('A.7 number names: no zero, then one zero; the words are never spoken', () => {
    for (const question of all('M-2-A7', 1)) expect(digitsOf(n(question, 'n'))).not.toContain(0);
    for (const question of all('M-2-A7', 2)) expect(digitsOf(n(question, 'n')).slice(1).filter((d) => d === 0)).toHaveLength(1);
    for (const level of [1, 2, 3] as Level[]) for (const question of all('M-2-A7', level)) expect(question.mode).toBe('read');
    expect(types(all('M-2-A7', 3))).toEqual(['numberPad']);
  });

  it('A.8 order: different hundreds, then the same hundreds, then 4 numbers largest first', () => {
    for (const question of all('M-2-A8', 1)) expect(new Set((question.facts.values as number[]).map((value) => Math.floor(value / 100))).size).toBe(3);
    for (const question of all('M-2-A8', 2)) expect(new Set((question.facts.values as number[]).map((value) => Math.floor(value / 100))).size).toBe(1);
    for (const question of all('M-2-A8', 3)) expect([(question.facts.values as number[]).length, question.facts.dir]).toEqual([4, 'down']);
  });

  it('A.9 regroup: 10 or more tens, then 10 or more of one place, then tens in a number, typed', () => {
    for (const question of all('M-2-A9', 1)) expect([n(question, 'tens') >= 10, n(question, 'ones')]).toEqual([true, 0]);
    for (const question of all('M-2-A9', 2)) expect((n(question, 'tens') >= 10) !== (n(question, 'ones') >= 10)).toBe(true);
    for (const question of all('M-2-A9', 3)) {
      expect(question.facts.ask).toBe('tensIn');
      expect(question.type).toBe('numberPad');
    }
  });

  it('A.10 doubles stay within 20', () => {
    for (const level of [1, 3] as Level[]) for (const question of all('M-2-A10', level)) expect(n(question, 'total')).toBeLessThanOrEqual(20);
    for (const question of all('M-2-A10', 2)) expect(n(question, 'n')).toBeLessThanOrEqual(20);
  });

  it('A.11 before and after cross a ten or a hundred about two times in three', () => {
    const crossing = all('M-2-A11', 1).filter((question) => (n(question, 'start') + 1) % 10 === 0).length;
    expect(crossing).toBeGreaterThan(SEEDS * 0.5);
    for (const question of all('M-2-A11', 3)) expect(n(question, 'length')).toBe(3);
  });

  it('A.12 blocks: 100 to 199, then 200 to 999, then a zero', () => {
    for (const question of all('M-2-A12', 1)) expect(n(question, 'hundreds')).toBe(1);
    for (const question of all('M-2-A12', 2)) expect(n(question, 'hundreds')).toBeGreaterThanOrEqual(2);
    for (const question of all('M-2-A12', 3)) expect(n(question, 'tens') === 0 || n(question, 'ones') === 0).toBe(true);
  });

  it('A.13 digits: the greatest, the least, then either with a zero, typed', () => {
    for (const question of all('M-2-A13', 1)) expect(question.facts.ask).toBe('greatest');
    for (const question of all('M-2-A13', 2)) expect([question.facts.ask, (question.facts.digits as number[]).includes(0)]).toEqual(['least', false]);
    for (const question of all('M-2-A13', 3)) {
      expect((question.facts.digits as number[]).includes(0)).toBe(true);
      if (question.type === 'numberPad') expect(question.answer).toBeGreaterThanOrEqual(100);
    }
  });

  it('A.14 hundred chart: the middle, then any cell, then past 100, typed', () => {
    for (const question of all('M-2-A14', 1)) expect(n(question, 'blank')).toBe(4);
    for (const question of all('M-2-A14', 2)) expect(n(question, 'blank')).not.toBe(4);
    for (const question of all('M-2-A14', 3)) expect(n(question, 'topLeft')).toBeGreaterThan(100);
    // Every piece sits inside one row of ten on the chart: no row wraps.
    for (const level of [1, 2, 3] as Level[]) for (const question of all('M-2-A14', level)) expect([1, 2, 3, 4, 5, 6, 7, 8]).toContain(n(question, 'topLeft') % 10);
  });
});

describe('Math grade 2, adding and subtracting', () => {
  it('B.12 always breaks a hundred into tens: the tens of the first number are 0 and its ones too few', () => {
    for (const level of [1, 2, 3] as Level[]) {
      for (const question of all('M-2-B12', level)) {
        const [a, b] = [n(question, 'a'), n(question, 'b')];
        expect(Math.floor(a / 10) % 10).toBe(0);
        expect(a % 10).toBeLessThan(b % 10);
        expect(a - b).toBeGreaterThan(0);
        expect(b < 10).toBe(level === 1);
        expect(b >= 100).toBe(level === 3);
      }
    }
  });

  it('B.13 missing numbers stay within 100; the first number is missing only when typed', () => {
    for (const level of [1, 2, 3] as Level[]) {
      for (const question of all('M-2-B13', level)) {
        expect(n(question, 'total')).toBeLessThanOrEqual(100);
        if (level < 3) expect(question.facts.blank).toBe('b');
        if (level === 1) expect(n(question, 'a') % 10).toBe(0);
      }
    }
    expect(new Set(all('M-2-B13', 3).map((question) => question.facts.blank))).toEqual(new Set(['a', 'b']));
  });

  it('B.14 stories: the change, then the start, then all four kinds, typed', () => {
    for (const question of all('M-2-B14', 1)) expect([question.facts.form, n(question, 'total') <= 60]).toEqual(['gotSome', true]);
    for (const question of all('M-2-B14', 2)) expect([question.facts.form, n(question, 'total') <= 100]).toEqual(['hadSome', true]);
    expect(new Set(all('M-2-B14', 3).map((question) => question.facts.form)).size).toBe(4);
  });

  it('B.15 place value: two-digit numbers, then three-digit numbers typed', () => {
    for (const question of all('M-2-B15', 2)) expect(n(question, 'x')).toBeLessThan(100);
    for (const question of all('M-2-B15', 3)) expect([n(question, 'x') >= 100, question.type]).toEqual([true, 'numberPad']);
  });

  it('B.16 sums to 20, then to 100; level 3 asks for both even and odd sums', () => {
    for (const question of all('M-2-B16', 1)) expect(n(question, 'a') + n(question, 'b')).toBeLessThanOrEqual(20);
    expect(new Set(all('M-2-B16', 3).map((question) => question.facts.want))).toEqual(new Set(['even', 'odd']));
  });
});

describe('Math grade 2, time, money, measuring and shapes', () => {
  it('C.8 a.m. and p.m. are fixed in place: a.m. first', () => {
    for (const level of [1, 2] as Level[]) {
      for (const question of all('M-2-C8', level)) {
        if (question.type !== 'choice') throw new Error('not a choice');
        expect(question.fixedOrder).toBe(true);
        expect(question.answerIndex).toBe(DAY_THINGS.find((thing) => thing.name === question.facts.thing)?.half === 'am' ? 0 : 1);
      }
    }
  });

  it('C.9 money stays under a dollar', () => {
    for (const level of [1, 2, 3] as Level[]) for (const question of all('M-2-C9', level)) expect(question.facts.oracle === 'subtract' ? n(question, 'a') : n(question, 'a') + n(question, 'b')).toBeLessThan(100);
  });

  it('C.10 coins: dimes and pennies, then nickels, then quarters', () => {
    const kinds = (level: Level): Set<string> => new Set(all('M-2-C10', level).flatMap((question) => (question.facts.sets as string[][]).flat()));
    expect(kinds(1)).toEqual(new Set(['dime', 'penny']));
    expect(kinds(2).has('nickel') && !kinds(2).has('quarter')).toBe(true);
    expect(kinds(3).has('quarter')).toBe(true);
  });

  it('C.11 picture graphs have 3 rows, then 4 when typed, never more than 6 pictures in a row', () => {
    for (const level of [1, 2, 3] as Level[]) {
      for (const question of all('M-2-C11', level)) {
        const values = question.facts.values as number[];
        expect(values).toHaveLength(level === 3 ? 4 : 3);
        expect(Math.max(...values)).toBeLessThanOrEqual(6);
      }
    }
  });

  it('D.4 never asks for the corners or edges schools disagree on', () => {
    for (const question of all('M-2-D4', 3)) expect(question.facts.solid === 'cone' || (question.facts.solid === 'cylinder' && question.facts.ask === 'edges')).toBe(false);
  });
});

describe('the wave H2 oracles, on cases worked by hand', () => {
  const value = (answer: unknown): unknown => (answer as { value: unknown }).value;
  it('h2World knows shapes, colours, solids, weights and kinds', () => {
    expect(value(h2World({ ask: 'shape', thing: 'tent' }))).toBe('triangle');
    expect(value(h2World({ ask: 'colour', want: 'purple', options: ['apple', 'grapes', 'banana'] }))).toBe('grapes');
    expect(value(h2World({ ask: 'solid', want: 'cylinder', options: ['drum', 'present', 'basketball'] }))).toBe('drum');
    expect(value(h2World({ ask: 'heavy', want: 'least', options: ['cow', 'ant', 'cat'] }))).toBe('ant');
    expect(h2World({ ask: 'kind', items: ['bus', 'dog', 'cap'], binAttrs: ['animals', 'vehicles', 'clothes'] })).toEqual({ kind: 'bins', bins: [1, 0, 2] });
    expect(() => h2World({ ask: 'shape', want: 'circle', options: ['cookie', 'clock'] })).toThrow();
  });
  it('h2Ordinal, h2SamePattern and h2OrderBy', () => {
    expect(value(h2Ordinal({ line: ['dog', 'cat', 'pig', 'duck'], ask: 'last' }))).toBe('duck');
    expect(value(h2Ordinal({ line: ['dog', 'cat', 'pig'], ask: 'second' }))).toBe('cat');
    expect(h2SamePattern({ target: ['red', 'red', 'blue', 'red', 'red', 'blue'], rows: [['a', 'b', 'a', 'b'], ['x', 'x', 'y', 'x', 'x', 'y'], ['p', 'q', 'q']] })).toEqual({ kind: 'index', index: 1 });
    expect(h2OrderBy({ values: [5, 1, 3], dir: 'down' })).toEqual({ kind: 'order', order: [0, 2, 1] });
  });
  it('h2Regroup, h2Even, h2Digits and h2Chart', () => {
    expect(value(h2Regroup({ hundreds: 3, tens: 14, ones: 5, ask: 'number' }))).toBe(445);
    expect(value(h2Regroup({ hundreds: 3, tens: 4, ones: 0, ask: 'tensIn' }))).toBe(34);
    expect(value(h2Even({ ask: 'double', total: 14 }))).toBe('7 + 7');
    expect(value(h2Even({ ask: 'isDouble', n: 15 }))).toBe('no');
    expect(value(h2Even({ ask: 'sumParity', a: 7, b: 9 }))).toBe('even');
    expect(value(h2Even({ ask: 'pickSum', want: 'odd', options: ['2 + 4', '3 + 4', '5 + 5'] }))).toBe('3 + 4');
    expect(value(h2Digits({ digits: [6, 0, 1], ask: 'least' }))).toBe(106);
    expect(value(h2Digits({ digits: [6, 0, 1], ask: 'greatest' }))).toBe(610);
    expect(value(h2Chart({ topLeft: 34, blank: 7 }))).toBe(55);
  });
  it('h2AmPm, h2Coins, h2Metric, h2Solid and h2Split', () => {
    expect(value(h2AmPm({ ask: 'time', thing: 'dinner', hour: 6 }))).toBe('6:00 p.m.');
    expect(h2Coins({ target: 36, sets: [['dime', 'dime', 'dime', 'nickel', 'penny'], ['quarter', 'dime']] })).toEqual({ kind: 'index', index: 0 });
    expect(value(h2Metric({ ask: 'estimate', thing: 'bus' }))).toBe('12 m');
    expect(value(h2Metric({ ask: 'convert', meters: 4 }))).toBe(400);
    expect(value(h2Solid({ solid: 'cube', ask: 'edges' }))).toBe(12);
    expect(() => h2Solid({ solid: 'cone', ask: 'corners' })).toThrow();
    expect(value(h2Split({ a: 47, b: 25, options: ['4 + 2 + 7 + 5', '40 + 20 + 7 + 5'] }))).toBe('40 + 20 + 7 + 5');
  });
});
