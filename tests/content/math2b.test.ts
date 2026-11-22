// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { addExplanation, borrows, carries, subtractExplanation } from '../../src/content/generators/math/g2/addSubtract';
import { generateQuestion } from '../../src/content/registry';
import type { Level, Question } from '../../src/engine/types';

// The level rules of Math grade 2, category B (plan section 8).

const SEEDS = 300;
const all = (skillId: string, level: Level): Question[] => Array.from({ length: SEEDS }, (_, i) => generateQuestion(skillId, level, i + 1));
const n = (question: Question, name: string): number => question.facts[name] as number;
const ab = (question: Question): [number, number] => [n(question, 'a'), n(question, 'b')];
const types = (questions: Question[]): string[] => [...new Set(questions.map((question) => question.type))];
// Counted here on its own, digit by digit, not with the generator's helpers.
const newTens = (a: number, b: number): number => {
  let [count, carry] = [0, 0];
  for (let p = 1; p <= 100; p *= 10) {
    carry = (Math.floor(a / p) % 10) + (Math.floor(b / p) % 10) + carry >= 10 ? 1 : 0;
    count += carry;
  }
  return count;
};
const brokenTens = (a: number, b: number): number => {
  let [count, borrow] = [0, 0];
  for (let p = 1; p <= 100; p *= 10) {
    borrow = (Math.floor(a / p) % 10) - borrow < Math.floor(b / p) % 10 ? 1 : 0;
    count += borrow;
  }
  return count;
};

describe('B.1 to B.4: within 100', () => {
  it('B.1 never makes a new ten, B.2 always makes one, and sums stay below 100', () => {
    for (const [skill, regroup] of [['M-2-B1', 0], ['M-2-B2', 1]] as [string, number][]) {
      for (const level of [1, 2, 3] as Level[]) {
        const questions = all(skill, level);
        for (const question of questions) {
          const [a, b] = ab(question);
          expect(newTens(a, b)).toBe(regroup);
          expect(a + b).toBeLessThanOrEqual(99);
          expect(a).toBeGreaterThanOrEqual(11);
          if (level === 1) expect(b).toBeLessThanOrEqual(9);
          if (level === 2) expect(b).toBeGreaterThanOrEqual(11);
        }
        expect(types(questions)).toEqual([level === 3 ? 'numberPad' : 'choice']);
      }
      // Typed questions mix one-digit and two-digit second numbers.
      expect(new Set(all(skill, 3).map((question) => n(question, 'b') < 10))).toEqual(new Set([true, false]));
    }
  });

  it('B.3 never breaks a ten, B.4 always breaks one, and nothing goes to zero or below', () => {
    for (const [skill, regroup] of [['M-2-B3', 0], ['M-2-B4', 1]] as [string, number][]) {
      for (const level of [1, 2, 3] as Level[]) {
        const questions = all(skill, level);
        for (const question of questions) {
          const [a, b] = ab(question);
          expect(brokenTens(a, b)).toBe(regroup);
          expect(a - b).toBeGreaterThanOrEqual(1);
          expect(a).toBeLessThanOrEqual(99);
          if (level === 1) expect(b).toBeLessThanOrEqual(9);
          if (level === 2) expect(b).toBeGreaterThanOrEqual(11);
        }
        expect(types(questions)).toEqual([level === 3 ? 'numberPad' : 'choice']);
      }
    }
  });

  it('B.4 offers the slip of taking the smaller digit from the bigger one', () => {
    let offered = 0;
    for (const question of all('M-2-B4', 1)) {
      const [a, b] = ab(question);
      const flipped = Math.floor(a / 10) * 10 + Math.abs((a % 10) - b);
      if ((question.facts.options as number[]).includes(flipped)) offered += 1;
    }
    expect(offered).toBeGreaterThan(SEEDS * 0.3);
  });
});

describe('B.5 to B.7: within 1,000', () => {
  it('B.5: plus whole hundreds, then no regrouping, then exactly one regroup typed', () => {
    for (const question of all('M-2-B5', 1)) expect(n(question, 'b') % 100).toBe(0);
    for (const [level, regroup] of [[2, 0], [3, 1]] as [Level, number][]) {
      for (const question of all('M-2-B5', level)) {
        const [a, b] = ab(question);
        expect(newTens(a, b)).toBe(regroup);
        expect(b % 100).not.toBe(0);
      }
    }
    for (const level of [1, 2, 3] as Level[]) for (const question of all('M-2-B5', level)) expect(n(question, 'a') + n(question, 'b')).toBeLessThanOrEqual(999);
    expect(types(all('M-2-B5', 3))).toEqual(['numberPad']);
    // The regroup is sometimes in the ones and sometimes in the tens.
    expect(new Set(all('M-2-B5', 3).map((question) => (n(question, 'a') % 10) + (n(question, 'b') % 10) >= 10))).toEqual(new Set([true, false]));
  });

  it('B.6: minus whole hundreds, then no regrouping, then exactly one regroup typed', () => {
    for (const question of all('M-2-B6', 1)) expect(n(question, 'b') % 100).toBe(0);
    for (const [level, regroup] of [[2, 0], [3, 1]] as [Level, number][]) {
      for (const question of all('M-2-B6', level)) {
        const [a, b] = ab(question);
        expect(brokenTens(a, b)).toBe(regroup);
        expect(a - b).toBeGreaterThanOrEqual(1);
      }
    }
    expect(types(all('M-2-B6', 3))).toEqual(['numberPad']);
  });

  it('B.7: 10 inside the hundred, then 100, then 10 across a hundred typed, both adding and subtracting', () => {
    for (const [level, by] of [[1, 10], [2, 100], [3, 10]] as [Level, number][]) {
      const questions = all('M-2-B7', level);
      expect(new Set(questions.map((question) => question.facts.oracle))).toEqual(new Set(['add', 'subtract']));
      for (const question of questions) {
        const [a, b] = ab(question);
        expect(b).toBe(by);
        const answer = question.facts.oracle === 'add' ? a + b : a - b;
        expect(answer).toBeGreaterThanOrEqual(0);
        expect(answer).toBeLessThanOrEqual(999);
        expect(question.prompt.text).toBe(`What is ${a} ${question.facts.oracle === 'add' ? 'plus' : 'minus'} ${b}?`);
        // Level 1 stays in its hundred. Level 3 always leaves it.
        if (by === 10) expect(Math.floor(a / 100) === Math.floor(answer / 100)).toBe(level === 1);
      }
    }
    expect(types(all('M-2-B7', 3))).toEqual(['numberPad']);
  });
});

describe('the explanations, place by place', () => {
  it('adding: place by place from the ones, the one place that changes said first, a new ten added in the next place', () => {
    expect(addExplanation(21, 4).steps).toEqual(['Only the ones change.', 'Add the ones: 1 + 4 = 5.', 'The answer is 25.']);
    expect(addExplanation(38, 24).steps).toEqual(['Add the ones: 8 + 4 = 12. That is 1 ten and 2 ones.', 'Add the tens and the new ten: 3 + 2 + 1 = 6.', 'The answer is 62.']);
    expect(addExplanation(52, 9).steps).toEqual(['Add the ones: 2 + 9 = 11. That is 1 ten and 1 more.', 'Add the new ten: 5 + 1 = 6.', 'The answer is 61.']);
    expect(addExplanation(431, 200).steps).toEqual(['Only the hundreds change.', 'Add the hundreds: 4 + 2 = 6.', 'The answer is 631.']);
    expect(addExplanation(295, 10).steps).toEqual(['The ones stay the same.', 'Add the tens: 9 + 1 = 10. That is 1 hundred and no tens.', 'Add the new hundred: 2 + 1 = 3.', 'The answer is 305.']);
  });

  it('subtracting: a ten or a hundred is broken up when there are not enough, and the step says how many there are now', () => {
    expect(subtractExplanation(68, 25).steps).toEqual(['Subtract the ones: 8 − 5 = 3.', 'Subtract the tens: 6 − 2 = 4.', 'The answer is 43.']);
    expect(subtractExplanation(53, 26).steps).toEqual(['There are not enough ones, so break a ten. Now there are 13 ones: 13 − 6 = 7.', 'Now there are 4 tens. Subtract the tens: 4 − 2 = 2.', 'The answer is 27.']);
    expect(subtractExplanation(21, 5).steps).toEqual(['There are not enough ones, so break a ten. Now there are 11 ones: 11 − 5 = 6.', 'Now there is 1 ten.', 'The answer is 16.']);
    expect(subtractExplanation(105, 10).steps).toEqual(['The ones stay the same.', 'There are not enough tens, so break a hundred. Now there are 10 tens: 10 − 1 = 9.', 'Now there are no hundreds.', 'The answer is 95.']);
  });

  it('the spoken words say each number as a number', () => {
    expect(addExplanation(21, 4).speak).toEqual(['Only the ones change.', 'Add the ones:', { number: 1 }, 'plus', { number: 4 }, 'is', { number: 5 }, '.', 'The answer is', { number: 25 }, '.']);
  });

  it('never runs past four steps, for any pair the skills can make', () => {
    for (const skill of ['M-2-B1', 'M-2-B2', 'M-2-B3', 'M-2-B4', 'M-2-B5', 'M-2-B6', 'M-2-B7']) {
      for (const level of [1, 2, 3] as Level[]) for (const question of all(skill, level)) expect(question.explanation.steps.length).toBeLessThanOrEqual(4);
    }
  });

  it('the helpers that find a new ten or a broken ten agree with a count made here', () => {
    for (let a = 100; a <= 999; a += 37) {
      for (let b = 1; b < a; b += 29) {
        if (a + b <= 999) expect(carries(a, b).length).toBe(newTens(a, b));
        expect(borrows(a, b).length).toBe(brokenTens(a, b));
      }
    }
  });
});

describe('B.8 Arrays, B.9 and B.10 stories', () => {
  it('B.8: counts to 3 by 3, matches the adding to the rows, then to 5 by 5 typed', () => {
    for (const question of all('M-2-B8', 1)) {
      expect(Math.max(n(question, 'rows'), n(question, 'cols'))).toBeLessThanOrEqual(3);
      expect(Math.min(n(question, 'rows'), n(question, 'cols'))).toBeGreaterThanOrEqual(2);
      expect(question.stimulus).toMatchObject({ kind: 'array', rows: n(question, 'rows'), cols: n(question, 'cols') });
    }
    for (const question of all('M-2-B8', 2)) {
      if (question.type !== 'choice') throw new Error('not a choice');
      const [rows, cols] = [n(question, 'rows'), n(question, 'cols')];
      expect(rows).not.toBe(cols);
      const options = question.facts.options as string[];
      expect(options[question.answerIndex]).toBe(Array.from({ length: rows }, () => cols).join(' + '));
      // The rows and columns swapped is always offered.
      expect(options).toContain(Array.from({ length: cols }, () => rows).join(' + '));
      expect(new Set(options).size).toBe(3);
    }
    const big = all('M-2-B8', 3);
    expect(types(big)).toEqual(['numberPad']);
    for (const question of big) {
      expect(Math.max(n(question, 'rows'), n(question, 'cols'))).toBeGreaterThanOrEqual(4);
      expect(Math.max(n(question, 'rows'), n(question, 'cols'))).toBeLessThanOrEqual(5);
    }
    expect(Math.max(...big.map((question) => n(question, 'rows') * n(question, 'cols')))).toBe(25);
  });

  it('B.9: adding stories, then taking-away stories, then compare stories typed, with two-digit numbers to 100', () => {
    const kinds = (level: Level): Set<unknown> => new Set(all('M-2-B9', level).map((question) => question.facts.story));
    expect(kinds(1)).toEqual(new Set(['gets', 'table']));
    expect(kinds(2)).toEqual(new Set(['givesAway', 'takes']));
    expect(kinds(3)).toEqual(new Set(['compare']));
    for (const level of [1, 2, 3] as Level[]) {
      for (const question of all('M-2-B9', level)) {
        const [a, b] = ab(question);
        expect(Math.min(a, b)).toBeGreaterThanOrEqual(11);
        const answer = level === 1 ? a + b : a - b;
        expect(answer).toBeGreaterThanOrEqual(1);
        expect(answer).toBeLessThanOrEqual(99);
        expect(level === 1 ? newTens(a, b) : brokenTens(a, b)).toBeLessThanOrEqual(1);
        expect(question.prompt.text).toContain(String(a));
        expect(question.prompt.text).toContain(String(b));
      }
    }
    expect(types(all('M-2-B9', 3))).toEqual(['numberPad']);
    expect(all('M-2-B9', 3)[0]?.explanation.steps[0]).toBe('How many more means subtract.');
  });

  it('B.10: add then add, then add then give away, always typed, never below zero', () => {
    for (const [level, op2] of [[1, '+'], [2, '-']] as [Level, string][]) {
      const questions = all('M-2-B10', level);
      expect(types(questions)).toEqual(['numberPad']);
      for (const question of questions) {
        if (question.type !== 'numberPad') throw new Error('not typed');
        const [a, b, c] = [n(question, 'a'), n(question, 'b'), n(question, 'c')];
        expect([question.facts.op1, question.facts.op2]).toEqual(['+', op2]);
        const answer = op2 === '+' ? a + b + c : a + b - c;
        expect(question.answer).toBe(answer);
        expect(answer).toBeGreaterThanOrEqual(1);
        expect(answer).toBeLessThanOrEqual(99);
        expect(question.prompt.text).toMatch(op2 === '+' ? /Then \w+ gets \d+ more\./ : /Then \w+ gives away \d+\./);
        expect(question.explanation.steps).toEqual([`First step: ${a} + ${b} = ${a + b}.`, `Second step: ${a + b} ${op2 === '+' ? '+' : '−'} ${c} = ${answer}.`]);
      }
    }
  });
});
