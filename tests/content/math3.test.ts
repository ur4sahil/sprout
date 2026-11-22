// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { carries, borrows } from '../../src/content/generators/math/g2/addSubtract';
import { nameOf, written } from '../../src/content/generators/math/g3/numbers';
import { generateQuestion } from '../../src/content/registry';
import type { Level, Question } from '../../src/engine/types';

// The level rules of Math grade 3 (plan section 8).

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
    for (const question of all('M-3-A1', 2)) expect(question.prompt.text).toMatch(/^What number has \d thousands?, \d hundreds?, \d tens? and \d ones?\?$/);
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

describe('C. Multiplication', () => {
  it('C.1 equal groups: words, then the times sign, then how many in all; never a square, so the swapped words are wrong', () => {
    for (const level of [1, 2, 3] as Level[]) for (const question of all('M-3-C1', level)) expect(n(question, 'rows')).not.toBe(n(question, 'cols'));
    expect(new Set(all('M-3-C1', 1).map((question) => question.facts.ask))).toEqual(new Set(['groupsOf']));
    expect(new Set(all('M-3-C1', 2).map((question) => question.facts.ask))).toEqual(new Set(['sentence']));
    expect(types(all('M-3-C1', 3))).toEqual(['numberPad']);
    // As a times sentence the swap is right too (2 × 4 is 8 as well), so it is never offered as a wrong one.
    for (const question of all('M-3-C1', 2)) expect(question.facts.options).not.toContain(`${n(question, 'cols')} × ${n(question, 'rows')}`);
  });

  it('C.3 to C.5 use only their own tables, the table number on either side, and level 3 mixes them, typed', () => {
    const tableOf = (question: Question): number[] => [n(question, 'rows'), n(question, 'cols')];
    const uses = (skillId: string, level: Level, tables: number[]): void => {
      for (const question of all(skillId, level)) expect(tableOf(question).some((value) => tables.includes(value)), JSON.stringify(question.facts)).toBe(true);
    };
    uses('M-3-C3', 1, [2, 10]);
    uses('M-3-C3', 2, [5]);
    uses('M-3-C4', 1, [3]);
    uses('M-3-C4', 2, [4]);
    uses('M-3-C5', 1, [6, 7]);
    uses('M-3-C5', 2, [8, 9]);
    for (const skillId of ['M-3-C3', 'M-3-C4', 'M-3-C5']) expect(types(all(skillId, 3))).toEqual(['numberPad']);
    // Both orders appear.
    expect(new Set(all('M-3-C5', 1).map((question) => [6, 7].includes(n(question, 'rows'))))).toEqual(new Set([true, false]));
  });

  it('C.6 asks for either factor, with an array picture only at level 1', () => {
    expect(new Set(all('M-3-C6', 2).map((question) => question.facts.blank))).toEqual(new Set(['rows', 'cols']));
    for (const question of all('M-3-C6', 1)) expect(question.stimulus?.kind).toBe('row');
    for (const question of all('M-3-C6', 2)) expect(question.stimulus?.kind).toBe('equation');
  });
});

describe('D. Division', () => {
  it('D.1 shares into 2 or 3, then up to 5, always exactly', () => {
    for (const question of all('M-3-D1', 1)) expect([2, 3]).toContain(n(question, 'by'));
    for (const level of [1, 2, 3] as Level[]) for (const question of all('M-3-D1', level)) expect(n(question, 'total') % n(question, 'by')).toBe(0);
  });

  it('D.2 divides by 2, 5, 10, then 3 and 4, then 6 to 9, typed', () => {
    for (const question of all('M-3-D2', 1)) expect([2, 5, 10]).toContain(n(question, 'by'));
    for (const question of all('M-3-D2', 2)) expect([3, 4]).toContain(n(question, 'by'));
    for (const question of all('M-3-D2', 3)) expect([6, 7, 8, 9]).toContain(n(question, 'by'));
    expect(types(all('M-3-D2', 3))).toEqual(['numberPad']);
  });

  it('D.3 offers exactly one division of the family, then the missing member, then one fact that does not belong', () => {
    expect(new Set(all('M-3-D3', 1).map((question) => question.facts.ask))).toEqual(new Set(['inFamily']));
    expect(new Set(all('M-3-D3', 2).map((question) => question.facts.ask))).toEqual(new Set(['quotient']));
    for (const question of all('M-3-D3', 3)) expect((question.facts.options as string[]).length).toBe(4);
  });
});

const facts = (question: Question): Record<string, unknown> => question.facts as Record<string, unknown>;
const set = (questions: Question[], of: (question: Question) => unknown): unknown[] => [...new Set(questions.map(of))].sort();

describe('A.5 and C.7', () => {
  it('A.5 counts by 2, 5, 10, then 3, 4, 6, 25 up or down, then 50 or 100 to 1,000, typed', () => {
    expect(set(all('M-3-A5', 1), (q) => facts(q).step)).toEqual([10, 2, 5]);
    expect(set(all('M-3-A5', 2), (q) => Math.abs(facts(q).step as number))).toEqual([25, 3, 4, 6]);
    expect(all('M-3-A5', 2).some((q) => (facts(q).step as number) < 0)).toBe(true);
    for (const q of all('M-3-A5', 3)) {
      expect(q.type).toBe('numberPad');
      const { start, step } = facts(q) as { start: number; step: number };
      expect([start, start + step * 4].every((x) => x >= 0 && x <= 1000)).toBe(true);
    }
  });

  it('C.7 multiplies by a multiple of ten: tens rods first, to 9 × 90 typed', () => {
    for (const level of [1, 2, 3] as Level[]) for (const q of all('M-3-C7', level)) expect((facts(q).cols as number) % 10).toBe(0);
    for (const q of all('M-3-C7', 1)) expect(q.stimulus?.kind).toBe('row');
    expect(range(all('M-3-C7', 3), (q) => n(q, 'rows') * n(q, 'cols'))[1]).toBeLessThanOrEqual(810);
    expect(types(all('M-3-C7', 3))).toEqual(['numberPad']);
  });
});

describe('E. Fractions', () => {
  it('E.1 names unit fractions, then any fraction of a shape, then of a set', () => {
    for (const q of all('M-3-E1', 1)) expect(n(q, 'n')).toBe(1);
    for (const q of all('M-3-E1', 2)) expect(q.stimulus?.kind).toBe('fraction');
    for (const q of all('M-3-E1', 3)) expect(q.stimulus?.kind).toBe('emojiGroup');
  });

  it('E.2 uses halves and fourths, then thirds and sixths, then eighths, the dot on a hidden mark', () => {
    expect(set(all('M-3-E2', 1), (q) => n(q, 'd'))).toEqual([2, 4]);
    expect(set(all('M-3-E2', 2), (q) => n(q, 'd'))).toEqual([3, 6]);
    expect(set(all('M-3-E2', 3), (q) => n(q, 'd'))).toEqual([8]);
    for (const q of all('M-3-E2', 1)) {
      const line = q.stimulus;
      if (line?.kind !== 'numberLine') throw new Error('not a number line');
      expect(line.hidden).toEqual(line.marked);
    }
  });

  it('E.3 compares same bottom numbers, then same top numbers, then picks a sign, sometimes =', () => {
    for (const q of all('M-3-E3', 1)) expect(new Set(facts(q).values as number[]).size).toBe(2);
    for (const q of all('M-3-E3', 2)) expect(new Set(facts(q).values as number[]).size).toBe(2);
    expect(set(all('M-3-E3', 3), (q) => facts(q).ask)).toEqual(['sign']);
    expect(all('M-3-E3', 3).some((q) => (facts(q).values as number[])[0] === (facts(q).values as number[])[1])).toBe(true);
  });

  it('E.4 offers exactly one equal fraction, as pictures, on number lines, then in numerals', () => {
    for (const level of [1, 2, 3] as Level[]) {
      for (const q of all('M-3-E4', level)) {
        const equal = (facts(q).options as string[]).filter((o) => {
          const [a, b] = o.split('/').map(Number) as [number, number];
          return a * n(q, 'd') === n(q, 'n') * b;
        });
        expect(equal).toHaveLength(1);
      }
    }
    for (const q of all('M-3-E4', 1)) if (q.type === 'choice') expect(q.options[0]?.kind).toBe('fraction');
  });
});

describe('F. Measurement and data', () => {
  it('F.1 reads minutes that are not fives, then matches clocks, then quarter past and quarter to', () => {
    for (const q of all('M-3-F1', 1)) expect(n(q, 'minute') % 5).not.toBe(0);
    for (const q of all('M-3-F1', 2)) if (q.type === 'choice') expect(q.options[0]?.kind).toBe('clock');
    expect(set(all('M-3-F1', 3), (q) => n(q, 'minute'))).toEqual([15, 30, 45]);
  });

  it('F.2 adds whole hours, then half hours, then counts minutes, typed', () => {
    for (const q of all('M-3-F2', 1)) expect(n(q, 'plus') % 60).toBe(0);
    for (const q of all('M-3-F2', 2)) expect(n(q, 'plus') % 60).toBe(30);
    for (const q of all('M-3-F2', 3)) expect(q.type).toBe('numberPad');
  });

  it('F.3 and F.4 use a rectangle that is never a square, typed at level 3', () => {
    for (const id of ['M-3-F3', 'M-3-F4']) {
      for (const level of [1, 2, 3] as Level[]) for (const q of all(id, level)) expect(n(q, 'length')).not.toBe(n(q, 'width'));
      expect(types(all(id, 3))).toEqual(['numberPad']);
    }
  });

  it('F.5 picks a unit, then reads a balance, then compares two', () => {
    expect(set(all('M-3-F5', 1), (q) => facts(q).kind)).toEqual(['mass', 'volume']);
    for (const q of all('M-3-F5', 2)) expect(q.stimulus?.kind).toBe('scale');
    expect(set(all('M-3-F5', 3), (q) => facts(q).oracle)).toEqual(['subtract']);
  });

  it('F.6 counts by 2 on picture graphs, by 5 on bar graphs, then asks how many more, typed', () => {
    for (const q of all('M-3-F6', 1)) expect(q.stimulus).toMatchObject({ kind: 'graph', type: 'picture', scale: 2 });
    for (const q of all('M-3-F6', 2)) expect(q.stimulus).toMatchObject({ kind: 'graph', type: 'bar', scale: 5 });
    expect(types(all('M-3-F6', 3))).toEqual(['numberPad']);
  });

  it('F.7 plots halves, then fourths for the total, with one length always the most', () => {
    for (const q of all('M-3-F7', 1)) expect(q.stimulus).toMatchObject({ kind: 'linePlot', denominator: 2 });
    for (const q of all('M-3-F7', 3)) expect(q.stimulus).toMatchObject({ kind: 'linePlot', denominator: 4 });
  });
});

describe('G. Shapes', () => {
  it('G.1 finds a quadrilateral, then the shape that is not, then names one from a clue', () => {
    expect(set(all('M-3-G1', 1), (q) => facts(q).ask)).toEqual(['four']);
    expect(set(all('M-3-G1', 2), (q) => facts(q).ask)).toEqual(['notFour']);
    for (const q of all('M-3-G1', 3)) expect(q.mode).toBe('read');
  });

  it('G.2 names one equal part, then finds equal parts, then counts the parts in the whole', () => {
    for (const q of all('M-3-G2', 1)) expect(n(q, 'n')).toBe(1);
    expect(set(all('M-3-G2', 2), (q) => facts(q).oracle)).toEqual(['fraction']);
    expect(types(all('M-3-G2', 3))).toEqual(['numberPad']);
  });
});
