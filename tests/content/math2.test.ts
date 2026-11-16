// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { generateQuestion } from '../../src/content/registry';
import type { Level, Question, Visual } from '../../src/engine/types';

// The level rules of Math grade 2, categories A, C and D (plan section 8).

const SEEDS = 300;
const all = (skillId: string, level: Level): Question[] => Array.from({ length: SEEDS }, (_, i) => generateQuestion(skillId, level, i + 1));
const n = (question: Question, name: string): number => question.facts[name] as number;
const value = (question: Question): number => n(question, 'hundreds') * 100 + n(question, 'tens') * 10 + n(question, 'ones');
const range = (questions: Question[], of: (question: Question) => number): [number, number] => {
  const values = questions.map(of);
  return [Math.min(...values), Math.max(...values)];
};
const types = (questions: Question[]): string[] => [...new Set(questions.map((question) => question.type))];

describe('A.1 Hundreds, tens, ones and A.2 Expanded form', () => {
  it('A.1: blocks to 199, to 999, typed, then what one digit is worth', () => {
    expect(range(all('M-2-A1', 1), value)).toEqual([101, 199]);
    expect(range(all('M-2-A1', 2), value)[0]).toBeGreaterThanOrEqual(200);
    expect(range(all('M-2-A1', 2), value)[1]).toBeLessThanOrEqual(999);
    expect(types(all('M-2-A1', 3))).toEqual(['numberPad']);
    for (const level of [1, 2, 3] as Level[]) for (const question of all('M-2-A1', level)) expect(question.stimulus).toEqual({ kind: 'baseTen', hundreds: n(question, 'hundreds'), tens: n(question, 'tens'), ones: n(question, 'ones') });
    const places = new Set<string>();
    for (const question of all('M-2-A1', 4)) {
      if (question.type !== 'choice') throw new Error('not a choice');
      const ask = question.facts.ask as string;
      places.add(ask);
      const place = ask.replace('Value', '') as 'hundreds' | 'tens' | 'ones';
      const digit = n(question, place);
      // A zero is never asked about, and the three options are the digit at each worth.
      expect(digit).toBeGreaterThan(0);
      expect(question.facts.options).toEqual([digit, digit * 10, digit * 100]);
      expect(question.answerIndex).toBe(['ones', 'tens', 'hundreds'].indexOf(place));
      expect(question.prompt.text).toBe(`What is the ${digit} worth in ${value(question)}?`);
    }
    expect(places).toEqual(new Set(['hundredsValue', 'tensValue', 'onesValue']));
  });

  it('A.1 says "1 hundred" and leaves out a place with nothing in it', () => {
    const lines = new Set([...all('M-2-A1', 1), ...all('M-2-A1', 2)].map((question) => question.explanation.steps.join(' ')));
    expect(lines).toContain('1 hundred is 100. 6 tens is 60. 3 ones. That makes 163.');
    expect([...lines].some((line) => /^\d hundreds is \d00\. \d ones?\. That makes \d0\d\.$/.test(line))).toBe(true);
  });

  it('A.2: parts to numeral, numeral to parts, then one zero, typed', () => {
    for (const question of all('M-2-A2', 1)) {
      const [h, t, o] = [n(question, 'hundreds'), n(question, 'tens'), n(question, 'ones')];
      expect(Math.min(h, t, o)).toBeGreaterThanOrEqual(1);
      expect(question.stimulus).toEqual({ kind: 'equation', parts: [h * 100, '+', t * 10, '+', o, '=', 'blank'] });
      expect(question.prompt.text).toBe(`${h * 100} plus ${t * 10} plus ${o} is what number?`);
    }
    for (const question of all('M-2-A2', 2)) {
      if (question.type !== 'choice') throw new Error('not a choice');
      const [h, t, o] = [n(question, 'hundreds'), n(question, 'tens'), n(question, 'ones')];
      const options = question.facts.options as string[];
      expect(options[question.answerIndex]).toBe(`${h * 100} + ${t * 10} + ${o}`);
      expect(new Set(options).size).toBe(3);
      // Every wrong option gives one digit the wrong worth, so none adds up to the number.
      const sums = options.map((option) => option.split(' + ').reduce((sum, part) => sum + Number(part), 0));
      expect(sums.filter((sum) => sum === value(question))).toHaveLength(1);
    }
    const zeros = all('M-2-A2', 3);
    expect(types(zeros)).toEqual(['numberPad']);
    for (const question of zeros) expect([n(question, 'tens'), n(question, 'ones')].filter((digit) => digit === 0)).toHaveLength(1);
    expect(zeros.some((question) => n(question, 'tens') === 0) && zeros.some((question) => n(question, 'ones') === 0)).toBe(true);
  });
});

describe('A.3 to A.6', () => {
  it('A.3: different hundreds, then the same hundreds, then the sign', () => {
    for (const [level, same] of [[1, false], [2, true]] as [Level, boolean][]) {
      for (const question of all('M-2-A3', level)) {
        const [a, b] = question.facts.values as [number, number];
        expect(Math.floor(a / 100) === Math.floor(b / 100)).toBe(same);
        expect(Math.min(a, b)).toBeGreaterThanOrEqual(100);
        expect(a).not.toBe(b);
      }
    }
    let equal = 0;
    for (const question of all('M-2-A3', 3)) {
      if (question.type !== 'choice') throw new Error('not a choice');
      const [a, b] = question.facts.values as [number, number];
      expect(question.answerIndex).toBe(a > b ? 0 : a < b ? 1 : 2);
      if (a === b) equal += 1;
    }
    expect(equal).toBeGreaterThan(SEEDS * 0.1);
    expect(equal).toBeLessThan(SEEDS * 0.3);
    const lines = new Set(all('M-2-A3', 2).map((question) => question.explanation.steps[0]));
    expect(lines).toEqual(new Set(['The hundreds are the same. Look at the tens.', 'The hundreds and tens are the same. Look at the ones.']));
  });

  it('A.4: by 100s from any ten, by 10s from any number, by 5s typed', () => {
    for (const [level, step] of [[1, 100], [2, 10], [3, 5]] as [Level, number][]) {
      for (const question of all('M-2-A4', level)) {
        expect(n(question, 'step')).toBe(step);
        expect(n(question, 'blankIndex')).toBe(4);
        expect(n(question, 'start') + step * 4).toBeLessThanOrEqual(1000);
      }
    }
    expect(all('M-2-A4', 1).every((question) => n(question, 'start') % 10 === 0)).toBe(true);
    expect(all('M-2-A4', 1).some((question) => n(question, 'start') % 100 !== 0)).toBe(true);
    expect(all('M-2-A4', 2).some((question) => n(question, 'start') % 10 !== 0)).toBe(true);
    expect(all('M-2-A4', 3).every((question) => n(question, 'start') % 5 === 0)).toBe(true);
    expect(types(all('M-2-A4', 3))).toEqual(['numberPad']);
  });

  it('A.5: things in pairs to 10, numerals to 20, then four numerals sorted into even and odd', () => {
    for (const question of all('M-2-A5', 1)) {
      if (question.type !== 'choice') throw new Error('not a choice');
      const [number] = question.facts.values as [number];
      expect(number).toBeGreaterThanOrEqual(2);
      expect(number).toBeLessThanOrEqual(10);
      expect(question.answerIndex).toBe(number % 2);
      // The picture shows the things two by two, with one on its own when the number is odd.
      if (question.stimulus?.kind !== 'row') throw new Error('not pairs');
      const groups = question.stimulus.children.map((child) => (child.kind === 'emojiGroup' ? child.count : -1));
      expect(groups.reduce((sum, count) => sum + count, 0)).toBe(number);
      expect(groups.filter((count) => count === 1)).toHaveLength(number % 2);
      expect(groups.every((count) => count === 1 || count === 2)).toBe(true);
    }
    expect(range(all('M-2-A5', 2), (question) => (question.facts.values as number[])[0] as number)).toEqual([1, 20]);
    for (const question of all('M-2-A5', 3)) {
      if (question.type !== 'sort') throw new Error('not a sort');
      const values = question.facts.values as number[];
      expect(values).toHaveLength(4);
      expect(question.bins.map((bin) => bin.label)).toEqual(['Even', 'Odd']);
      expect(question.answerBin).toEqual(values.map((each) => each % 2));
      expect(new Set(question.answerBin).size).toBe(2);
      expect(Math.max(...values)).toBeLessThanOrEqual(100);
    }
  });

  it('A.6: the dot sits on a mark whose number is hidden, in steps of 10, then 5, then 1 typed', () => {
    for (const [level, step] of [[1, 10], [2, 5], [3, 1]] as [Level, number][]) {
      for (const question of all('M-2-A6', level)) {
        const [min, index] = [n(question, 'min'), n(question, 'index')];
        const at = min + step * index;
        expect(n(question, 'step')).toBe(step);
        expect(question.stimulus).toEqual({ kind: 'numberLine', min, max: min + step * 10, step, marked: [at], hidden: [at] });
        // Never an end of the line, and never past 100.
        expect(index).toBeGreaterThanOrEqual(1);
        expect(index).toBeLessThanOrEqual(9);
        expect(min + step * 10).toBeLessThanOrEqual(100);
      }
    }
    expect(types(all('M-2-A6', 3))).toEqual(['numberPad']);
  });
});

describe('C.1 to C.4', () => {
  it('C.1: quarter hours, then any five minutes, then a written time matched to a clock, never on the hour', () => {
    expect(new Set(all('M-2-C1', 1).map((question) => n(question, 'minute')))).toEqual(new Set([15, 30, 45]));
    for (const level of [2, 3] as Level[]) {
      const minutes = new Set(all('M-2-C1', level).map((question) => n(question, 'minute')));
      expect(minutes.size).toBe(11);
      expect([...minutes].every((minute) => minute % 5 === 0 && minute > 0)).toBe(true);
    }
    for (const level of [1, 2, 3] as Level[]) {
      for (const question of all('M-2-C1', level)) {
        if (question.type !== 'choice') throw new Error('not a choice');
        const right = `${n(question, 'hour')}:${String(n(question, 'minute')).padStart(2, '0')}`;
        const options = question.facts.options as string[];
        expect(options[question.answerIndex]).toBe(right);
        expect(new Set(options).size).toBe(3);
        if (level === 3) {
          expect(question.options.every((option) => option.kind === 'clock')).toBe(true);
          // Clock options are all on a five-minute mark: a clock at 3 minutes past would look like one at 5 past.
          expect(options.every((option) => Number(option.split(':')[1]) % 5 === 0)).toBe(true);
        }
      }
    }
  });

  it('C.1 says where the short hand sits: just past, halfway, or getting close to the next hour', () => {
    const line = (hour: number, minute: number): string | undefined => all('M-2-C1', 2).find((question) => n(question, 'hour') === hour && n(question, 'minute') === minute)?.explanation.steps[0];
    const lines = new Set(all('M-2-C1', 2).map((question) => (n(question, 'minute') < 30 ? 'past' : n(question, 'minute') === 30 ? 'half' : 'close') + '|' + (question.explanation.steps[0] ?? '').replace(/\d+/g, '#')));
    expect(lines).toEqual(new Set(['past|The short hand is just past #.', 'half|The short hand is halfway between # and #.', 'close|The short hand is past # and getting close to #.']));
    void line;
    // After 12 comes 1.
    expect(all('M-2-C1', 2).some((question) => question.explanation.steps[0] === 'The short hand is past 12 and getting close to 1.')).toBe(true);
  });

  it('C.2: one kind of coin, then two kinds, then three kinds typed, biggest first and under a dollar', () => {
    const CENTS: Record<string, number> = { penny: 1, nickel: 5, dime: 10, quarter: 25 };
    for (const level of [1, 2, 3] as Level[]) {
      for (const question of all('M-2-C2', level)) {
        const coins = question.facts.coins as string[];
        expect(new Set(coins).size).toBe(level);
        const worth = coins.map((coin) => CENTS[coin] as number);
        expect(worth).toEqual([...worth].sort((x, y) => y - x));
        const total = worth.reduce((sum, each) => sum + each, 0);
        expect(total).toBeLessThan(100);
        expect(coins.length).toBeLessThanOrEqual(7);
        expect(question.stimulus).toEqual({ kind: 'coins', coins });
        if (question.type === 'numberPad') expect(question.answer).toBe(total);
        else if (question.type === 'choice') expect((question.facts.options as number[])[question.answerIndex]).toBe(total);
        expect(question.explanation.steps.at(-1)).toBe(`${total} cents.`);
      }
    }
    expect(types(all('M-2-C2', 3))).toEqual(['numberPad']);
  });

  it('C.3: from zero, then typed, then starting part-way with the end mark offered as a wrong answer', () => {
    for (const level of [1, 2] as Level[]) for (const question of all('M-2-C3', level)) expect(n(question, 'startUnit')).toBe(0);
    expect(types(all('M-2-C3', 2))).toEqual(['numberPad']);
    let endOffered = 0;
    for (const question of all('M-2-C3', 3)) {
      if (question.type !== 'choice') throw new Error('not a choice');
      const [start, length] = [n(question, 'startUnit'), n(question, 'lengthUnits')];
      expect(start).toBeGreaterThanOrEqual(1);
      expect((question.facts.options as number[])[question.answerIndex]).toBe(length);
      if ((question.facts.options as number[]).includes(start + length)) endOffered += 1;
      expect(question.explanation.steps[0]).toBe(`It starts at ${start} and ends at ${start + length}.`);
    }
    expect(endOffered).toBeGreaterThan(SEEDS * 0.5);
  });

  it('C.4: a bar graph with values to 10: read a bar, the most or fewest, how many more typed', () => {
    for (const level of [1, 2, 3] as Level[]) {
      for (const question of all('M-2-C4', level)) {
        if (question.stimulus?.kind !== 'graph') throw new Error('not a graph');
        expect(question.stimulus.type).toBe('bar');
        const values = question.facts.values as number[];
        expect(new Set(values).size).toBe(3);
        expect(Math.max(...values)).toBeLessThanOrEqual(10);
      }
    }
    expect(Math.max(...all('M-2-C4', 1).flatMap((question) => question.facts.values as number[]))).toBe(10);
    expect(all('M-2-C4', 1)[0]?.explanation.steps[1]).toMatch(/^Read the end of its bar: \d+\.$/);
    expect(types(all('M-2-C4', 3))).toEqual(['numberPad']);
  });
});

describe('D.1 Name shapes by sides and D.2 Halves, thirds, fourths', () => {
  const SIDES: Record<string, number> = { triangle: 3, square: 4, rectangle: 4, trapezoid: 4, diamond: 4, pentagon: 5, hexagon: 6 };
  const sides = (visual: Visual): number => (visual.kind === 'shape' ? (SIDES[visual.shape] as number) : -1);

  it('D.1: a triangle or a four-sided shape, then pentagon or hexagon, then by corners', () => {
    const asked = new Set<string>();
    for (const question of all('M-2-D1', 1)) {
      if (question.type !== 'choice') throw new Error('not a choice');
      const answer = sides(question.options[question.answerIndex] as Visual);
      expect([3, 4]).toContain(answer);
      asked.add(question.prompt.text);
      // Exactly one option fits what was asked.
      if (question.prompt.text === 'Which shape has 4 sides?') expect(question.options.map(sides).filter((count) => count === 4)).toHaveLength(1);
      else expect(question.options.map(sides).filter((count) => count === 3)).toHaveLength(1);
    }
    expect(asked).toEqual(new Set(['Which shape is a triangle?', 'Which shape has 4 sides?']));
    for (const question of all('M-2-D1', 2)) {
      if (question.type !== 'choice') throw new Error('not a choice');
      expect([5, 6]).toContain(sides(question.options[question.answerIndex] as Visual));
      // The other of the two is always offered.
      expect(question.options.map(sides).sort().slice(-2)).toEqual([5, 6]);
    }
    // Both five-sided and six-sided shapes are asked for.
    expect(new Set(all('M-2-D1', 2).map((question) => question.facts.shape))).toEqual(new Set(['pentagon', 'hexagon']));
    for (const question of all('M-2-D1', 3)) {
      if (question.type !== 'choice') throw new Error('not a choice');
      const counts = question.options.map(sides);
      expect(new Set(counts).size).toBe(3);
      expect(question.prompt.text).toBe(`Which shape has ${counts[question.answerIndex]} corners?`);
    }
  });

  it('D.2: names one shaded part, then finds the shape with the share asked for, then among circles and rectangles', () => {
    const NAME: Record<number, string> = { 2: 'halves', 3: 'thirds', 4: 'fourths' };
    for (const question of all('M-2-D2', 1)) {
      if (question.type !== 'choice') throw new Error('not a choice');
      expect(question.stimulus).toMatchObject({ kind: 'fraction', parts: n(question, 'parts'), shaded: 1, equal: true });
      expect(question.options.map((option) => (option.kind === 'text' ? option.value : ''))).toEqual(['one half', 'one third', 'one fourth']);
      expect(question.answerIndex).toBe(n(question, 'parts') - 2);
    }
    for (const level of [2, 3] as Level[]) {
      const mixed = new Set<number>();
      for (const question of all('M-2-D2', level)) {
        if (question.type !== 'choice') throw new Error('not a choice');
        const parts = n(question, 'parts');
        const pictures = question.options as Extract<Visual, { kind: 'fraction' }>[];
        const answer = pictures[question.answerIndex]!;
        expect([answer.parts, answer.equal]).toEqual([parts, true]);
        expect(question.prompt.text).toBe(`Which shape shows ${NAME[parts]}?`);
        const wrong = pictures.filter((_, i) => i !== question.answerIndex);
        // One wrong shape has the right number of parts but they are not equal. The other has a different share.
        expect(wrong.filter((picture) => !picture.equal && picture.parts === parts)).toHaveLength(1);
        expect(wrong.filter((picture) => picture.equal && picture.parts !== parts)).toHaveLength(1);
        mixed.add(new Set(pictures.map((picture) => picture.shape)).size);
      }
      expect(mixed.has(2)).toBe(level === 3);
    }
    expect(new Set(all('M-2-D2', 2).map((question) => n(question, 'parts')))).toEqual(new Set([2, 3, 4]));
  });
});
