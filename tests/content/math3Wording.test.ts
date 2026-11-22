// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { nudgeFor } from '../../src/app/hints';
import { CATALOGUE } from '../../src/content/catalogue';
import { fractionSay } from '../../src/content/generators/math/g3/fractions';
import { byWord, written } from '../../src/content/generators/math/g3/numbers';
import { generateQuestion } from '../../src/content/registry';
import { describeVisual, sayText } from '../../src/engine/describe';
import type { Level, Question } from '../../src/engine/types';

// The wording audit, round 2 (Nov 22, 2026), Math grade 3: each rule it fixed, over many seeds. The golden files
// catch any change; these say what the words must be.

const SEEDS = 300;
const all = (skillId: string, level: Level, seeds = SEEDS): Question[] => Array.from({ length: seeds }, (_, i) => generateQuestion(skillId, level, i + 1));
const n = (q: Question, name: string): number => q.facts[name] as number;
const said = (q: Question): string => sayText(q.prompt.speak);
const shown = (q: Question): string => q.explanation.steps.join(' ');
const last = (q: Question): string => q.explanation.steps[q.explanation.steps.length - 1] ?? '';
const nudge = (q: Question): string => nudgeFor(q)?.text ?? '';
const options = (q: Question): string[] => (q.type === 'choice' ? q.options.map(describeVisual) : []);
const right = (q: Question): string => (q.type === 'choice' ? describeVisual(q.options[q.answerIndex] ?? 'blank') : '');
const grade3 = CATALOGUE.filter((skill) => skill.id.startsWith('M-3-'));
const levelsOf = (maxLevel: number): Level[] => ([1, 2, 3, 4] as Level[]).filter((level) => level <= maxLevel);

describe('sums are asked as they are said', () => {
  // B.1 and B.2 are asked by the grade 2 helpers (plusPrompt and minusPrompt in g2/addSubtract.ts), which grade 2 owns.
  const FROM_GRADE_2 = new Set(['M-3-B1', 'M-3-B2']);

  it('never "... equals what?" and never "... is the same as which?"', () => {
    for (const skill of grade3.filter((each) => !FROM_GRADE_2.has(each.id))) {
      for (const level of levelsOf(skill.maxLevel)) {
        for (const q of all(skill.id, level, 40)) {
          expect(q.prompt.text, skill.id).not.toMatch(/equals what\?|is the same as which/);
          expect(said(q), skill.id).not.toMatch(/equals what|is the same as which/);
        }
      }
    }
    expect(generateQuestion('M-3-C3', 1, 1).prompt.text).toBe('What is 2 × 10?');
    expect(said(generateQuestion('M-3-D2', 1, 1))).toBe('What is 10 divided by 5?');
    expect(generateQuestion('M-3-C2', 3, 1).prompt.text).toBe('Which is the same as 5 × 2?');
    expect(generateQuestion('M-3-B5', 1, 1).prompt.text).toBe('What is 700 minus 102?');
  });
});

describe('comparisons are read in the order of the question and name the sign', () => {
  it('A.3: four-digit numbers', () => {
    for (const q of all('M-3-A3', 3)) {
      const [a, b] = q.facts.values as [number, number];
      if (a === b) expect(last(q)).toBe('They are equal, so the sign is =.');
      else expect(last(q)).toBe(`${written(a)} is ${a > b ? 'greater' : 'less'} than ${written(b)}, so the sign is ${a > b ? '>' : '<'}.`);
    }
  });

  it('E.3: fractions, and "which is greater" is answered with the greater one', () => {
    for (const q of all('M-3-E3', 3)) {
      const [, a, b] = /between (\d+\/\d+) and (\d+\/\d+)\?/.exec(q.prompt.text) ?? [];
      const [va, vb] = q.facts.values as [number, number];
      const words = va > vb ? ['greater than', '>'] : va < vb ? ['less than', '<'] : ['equal to', '='];
      expect(last(q)).toBe(`${a} is ${words[0]} ${b}, so the sign is ${words[1]}.`);
    }
    for (const level of [1, 2] as Level[]) {
      for (const q of all('M-3-E3', level)) expect(last(q)).toBe(`So ${right(q)} is ${q.facts.ask === 'most' ? 'greater' : 'less'}.`);
    }
  });
});

describe('a fraction over 1 is said as it is written, "seven over one"', () => {
  it('so the question never says the whole number it asks for', () => {
    expect(fractionSay(7, 1)).toEqual([{ number: 7 }, 'over', { number: 1 }]);
    for (const level of [1, 2] as Level[]) {
      for (const q of all('M-3-E5', level)) {
        expect(said(q)).not.toMatch(/wholes/);
        if (q.type !== 'choice') continue;
        for (const option of q.options) if (option.kind === 'text' && option.value.endsWith('/1')) expect(sayText(option.speak ?? [])).toMatch(/^\d+ over 1$/);
      }
    }
    const overOne = all('M-3-E5', 2).filter((q) => String(q.facts.expr).endsWith('/1'));
    expect(overOne.length).toBeGreaterThan(50);
    for (const q of overOne) expect(sayText(q.explanation.speak)).toMatch(/^\d+ over 1 means \d+ wholes, each in one part\./);
  });
});

describe('hints say what to do, and never leave only one option', () => {
  it('C.1 and C.2 never name the groups, the rows or the turned array', () => {
    for (const level of [1, 2] as Level[]) for (const q of all('M-3-C1', level)) expect(nudge(q)).not.toMatch(/\d/);
    for (const q of all('M-3-C2', 3)) expect(nudge(q)).toBe('Picture the array turned on its side. How many rows would it have?');
  });

  it('C.6 never lists the counts, so they cannot be counted for the answer', () => {
    for (const level of [1, 2, 3] as Level[]) {
      for (const q of all('M-3-C6', level)) {
        const known = q.facts.blank === 'rows' ? n(q, 'cols') : n(q, 'rows');
        expect(nudge(q)).toBe(`Count by ${byWord(known)} until you reach ${n(q, 'rows') * n(q, 'cols')}. Keep track of how many numbers you say.`);
      }
    }
  });

  it('E.1, E.2 and F.1 never say how many parts or which hour', () => {
    for (const level of [1, 2, 3] as Level[]) for (const q of all('M-3-E1', level)) expect(nudge(q)).not.toMatch(/\d/);
    for (const level of [1, 2, 3] as Level[]) for (const q of all('M-3-E2', level)) for (const digits of nudge(q).match(/\d+/g) ?? []) expect(['0', '1']).toContain(digits);
    for (const level of [1, 2] as Level[]) for (const q of all('M-3-F1', level)) expect(nudge(q)).toBe('Look at the short hand first. Which number has it just passed?');
  });

  it('B.4 points at the first step without doing it', () => {
    const work = (x: number, op: string, y: number): number => (op === '+' ? x + y : op === '-' ? x - y : op === '×' ? x * y : x / y);
    for (const level of [1, 2, 3] as Level[]) {
      for (const q of all('M-3-B4', level)) {
        expect(nudge(q)).toMatch(/^First find how many /);
        expect(nudge(q)).not.toMatch(new RegExp(`\\b${work(n(q, 'a'), String(q.facts.op1), n(q, 'b'))}\\b`));
      }
    }
  });

  it('a hint that only repeats the question is replaced by one that says how', () => {
    expect(nudge(generateQuestion('M-3-B3', 1, 1))).toBe('Look at the ones digit of each number. 5 or more rounds up. Less than 5 rounds down.');
    expect(nudge(generateQuestion('M-3-F9', 1, 1))).toBe('Find the area of each rectangle: count its squares, or multiply its sides.');
    expect(nudge(generateQuestion('M-3-C9', 1, 1))).toBe('Each part is a times fact: its rows times the number in each row.');
    expect(nudge(generateQuestion('M-3-D4', 1, 1))).toBe('Think: 4 times what is 8?');
    expect(nudge(generateQuestion('M-3-D5', 1, 1))).toBe('Think: 4 times 2 is what number?');
    expect(nudge(generateQuestion('M-3-F7', 3, 1))).toBe('Count the X marks above every length, then add them all up.');
    // "42 ÷ □ = 7" asks "what times 7 is 42?"; when the answer is 7 as well (a square number), the hint asks for the
    // number times itself, so it never names the answer.
    const answerOf = (q: Question): number => (q.type === 'numberPad' ? q.answer : q.type === 'choice' ? ((q.facts.options as number[])[q.answerIndex] ?? -1) : -1);
    const byBlank = [...all('M-3-D5', 2), ...all('M-3-D5', 3)].filter((q) => String(q.facts.expr).includes('÷ □'));
    for (const q of byBlank) expect(nudge(q)).not.toMatch(new RegExp(`\\b${answerOf(q)}\\b`));
    expect(byBlank.some((q) => nudge(q).startsWith('Think: which number times itself makes'))).toBe(true);
  });

  it('D.3 asks the times question at level 2, and no step stops at a colon', () => {
    for (const q of all('M-3-D3', 2)) expect(nudge(q)).toBe(`Think: ${n(q, 'rows')} times what is ${n(q, 'total')}?`);
    for (const level of [1, 2, 3] as Level[]) for (const q of all('M-3-D3', level)) for (const step of q.explanation.steps) expect(step).not.toMatch(/:$/);
  });
});

describe('F.1 asks for both hands', () => {
  it('one wrong time is an hour out and one is ten minutes out', () => {
    for (const level of [1, 2] as Level[]) {
      for (const q of all('M-3-F1', level)) {
        const times = (q.facts.options as string[]).map((each) => each.split(':').map(Number) as [number, number]);
        expect(times.filter(([hour]) => hour === n(q, 'hour'))).toHaveLength(2);
        expect(times.filter(([, minute]) => minute === n(q, 'minute'))).toHaveLength(2);
      }
    }
  });
});

describe('C.12 has one estimate', () => {
  it('the story says how to estimate, and no wrong option is one away or nearer the exact product', () => {
    for (const q of all('M-3-C12', 2)) expect(q.prompt.text).toContain(`Round ${n(q, 'b')} to the nearest ten, then multiply.`);
    for (const level of [1, 2] as Level[]) {
      for (const q of all('M-3-C12', level)) {
        if (q.type !== 'choice') throw new Error('not a choice');
        const values = q.facts.options as number[];
        const answer = values[q.answerIndex] as number;
        const exact = n(q, 'a') * n(q, 'b');
        for (const value of values.filter((each) => each !== answer)) {
          expect(Math.abs(value - answer)).toBeGreaterThan(1);
          expect(Math.abs(value - exact)).toBeGreaterThan(Math.abs(answer - exact));
        }
      }
    }
  });
});

describe('one, and more than one', () => {
  it('"10 is 1 ten", "1 liter", "a 1 kilogram weight", "an 8 kilogram weight"', () => {
    for (const level of [1, 2, 3] as Level[]) for (const q of all('M-3-C7', level)) expect(shown(q)).not.toMatch(/\b1 tens\b/);
    expect(all('M-3-C7', 1).some((q) => shown(q).startsWith('10 is 1 ten.'))).toBe(true);
    for (const level of [2, 3] as Level[]) {
      for (const q of all('M-3-F5', level)) {
        expect(`${q.prompt.text} ${shown(q)}`).not.toMatch(/\b1 (kilograms|liters)\b/);
        expect(q.prompt.text).not.toMatch(/\ba 8\b/);
      }
    }
    expect(all('M-3-F5', 2).some((q) => q.prompt.text.includes('a 1 kilogram weight'))).toBe(true);
    expect(all('M-3-F5', 2).some((q) => q.prompt.text.includes('an 8 kilogram weight'))).toBe(true);
    expect(all('M-3-F5', 3).some((q) => / 1 (liter|kilogram)\./.test(q.prompt.text))).toBe(true);
  });

  it('E.1: "1 is a flower", "1 is an apple"', () => {
    const ones = all('M-3-E1', 3).filter((q) => n(q, 'n') === 1);
    expect(ones.length).toBeGreaterThan(20);
    for (const q of ones) expect(q.explanation.steps[1]).toMatch(/^1 is (a [b-df-hj-np-tv-z]|an [aeiou])[a-z]+\. That is the top number\.$/);
  });
});

describe('steps show how, in the words of the question', () => {
  it('A.1 says why a zero is written', () => {
    for (const level of [1, 2, 3] as Level[]) {
      for (const q of all('M-3-A1', level)) {
        for (const place of ['hundreds', 'tens', 'ones']) if (n(q, place) === 0) expect(shown(q)).toMatch(new RegExp(`0 ${place}`));
        if (['hundreds', 'tens', 'ones'].some((place) => n(q, place) === 0)) expect(shown(q)).toMatch(/so (a zero holds the \w+ place|zeros hold those places)\./);
        // "1 thousand is 1,000" is said "one thousand is one thousand": the steps count blocks and write digits instead.
        expect(shown(q)).not.toMatch(/thousands? is \d/);
      }
    }
  });

  it('C.3 to C.5 start with the way to work it out and end with the sum in the order it was asked', () => {
    for (const skillId of ['M-3-C3', 'M-3-C4', 'M-3-C5']) {
      for (const level of [1, 2, 3] as Level[]) {
        for (const q of all(skillId, level)) {
          const [x, y] = [n(q, 'rows'), n(q, 'cols')];
          expect(last(q), skillId).toBe(`So ${x} × ${y} = ${x * y}.`);
          if (q.explanation.steps.length >= 3) expect(q.explanation.steps[0], skillId).toMatch(/^(Times \d is|Split 7 into 5 and 2\.)/);
        }
      }
    }
  });

  it('F.2 counts on hour by hour, and stops at the o\'clock when it passes one', () => {
    for (const q of all('M-3-F2', 1)) expect(q.explanation.steps[0]).toMatch(/^Count on \d hours?: \d{1,2}:\d\d(, \d{1,2}:\d\d)*\.$/);
    const crossing = all('M-3-F2', 3).filter((q) => n(q, 'endHour') !== n(q, 'hour') && n(q, 'endMinute') !== 0);
    expect(crossing.length).toBeGreaterThan(30);
    for (const q of crossing) expect(q.explanation.steps[0]).toMatch(/^\d{1,2}:\d\d to \d{1,2}:00 is \d+ minutes\.$/);
  });

  it('F.10 says when the thing ends, last', () => {
    for (const q of all('M-3-F10', 2)) {
      expect(last(q)).toMatch(new RegExp(`^${String(q.facts.name)} ends at \\d{1,2}:\\d\\d\\.$`));
      expect(shown(q)).not.toMatch(/minutes long|minutes later/);
    }
  });

  it('F.7 says the length with the most pencils', () => {
    for (const q of all('M-3-F7', 2)) expect(sayText(q.explanation.speak)).toMatch(/^The tallest stack of X marks is at \d+( and a half)? inches\./);
    expect(generateQuestion('M-3-F7', 2, 1).prompt.text).toBe('Which length has the most pencils?');
  });

  it('E.4 cuts each part into smaller equal pieces, and asks for a picture when the options are pictures', () => {
    for (const level of [1, 2, 3] as Level[]) for (const q of all('M-3-E4', level)) expect(q.explanation.steps[0]).toMatch(/^Cut each (half|third|fourth) into \d equal pieces\.$/);
    for (const q of all('M-3-E4', 1)) expect(q.prompt.text).toMatch(/^Which picture shows the same amount as \d\/\d\?$/);
  });

  it('E.2 reads the line, or says where to put the dot', () => {
    for (const level of [1, 2, 3, 4] as Level[]) for (const q of all('M-3-E2', level)) expect(q.explanation.steps[0]).toMatch(/^The line from 0 to 1 is cut into \d equal parts\.$/);
    for (const q of all('M-3-E2', 4)) {
      expect(q.prompt.text).toMatch(/^Tap the line to put the dot on \d\/\d\.$/);
      expect(q.explanation.steps[1]).toMatch(/^Count \d parts? from 0, and put the dot there\.$/);
    }
  });

  it('E.7 uses the story\'s own words: more or less for two people, the most or the least for three', () => {
    for (const level of [1, 2, 3] as Level[]) {
      for (const q of all('M-3-E7', level)) {
        const three = level === 3;
        expect(`${q.prompt.text} ${shown(q)}`).toMatch(three ? /the (most|least|farthest|shortest)/ : /^(?!.*the (most|least|farthest|shortest)).*$/);
        expect(last(q)).toMatch(/, so (Sam|Mia|Leo|Ava|Max|Zoe) (ate|painted|drank|walked) /);
        expect(q.explanation.steps.length).toBe(4);
      }
    }
  });

  it('B.3 says what makes an answer reasonable', () => {
    for (const q of all('M-3-B3', 3)) {
      const reasonable = q.type === 'choice' && q.answerIndex === 0;
      const [, claim, guess] = /^(\d+) is (?:less|more) than 100 away from (\d+), so Sam's answer is/.exec(last(q)) ?? [];
      const away = Math.abs(Number(claim) - Number(guess));
      // What the step says is true: a right answer is under 100 away from the estimate, a wrong one over 100.
      if (reasonable) expect(away, last(q)).toBeLessThan(100);
      else expect(away, last(q)).toBeGreaterThan(100);
      expect(last(q)).toMatch(reasonable ? /less than 100 away .* is reasonable\.$/ : /more than 100 away .* is not reasonable\.$/);
    }
  });

  it('B.5 takes away in words, as B.2 does, and names the amounts after breaking', () => {
    for (const level of [1, 2, 3] as Level[]) {
      for (const q of all('M-3-B5', level)) {
        expect(shown(q)).not.toContain('−');
        expect(q.explanation.steps[1]).toMatch(/^Now there are \d hundreds, 9 tens and \d+ ones\.$/);
      }
    }
  });

  it('B.6 asks one question, and no step quotes words the story did not say', () => {
    for (const level of [1, 2, 3] as Level[]) {
      for (const q of all('M-3-B6', level)) {
        expect(q.prompt.text.match(/\?/g), q.prompt.text).toHaveLength(1);
        expect(q.prompt.text).toMatch(/ To find .+, which (sign|number sentence) would you use\?$/);
        expect(shown(q)).not.toMatch(/"/);
      }
    }
    for (const q of all('M-3-F5', 3)) expect(shown(q)).not.toMatch(/"|take away/);
  });

  it('F.6 counts pictures on a picture graph and steps on a bar graph, in words', () => {
    for (const q of all('M-3-F6', 3)) {
      const picture = q.stimulus?.kind === 'graph' && q.stimulus.type === 'picture';
      expect(q.explanation.steps[0]).toBe(picture ? 'Each picture stands for 5.' : 'Each step on the scale is 5.');
    }
    for (const q of all('M-3-F6', 2)) expect(q.explanation.steps[0]).toBe('The scale counts up by fives.');
  });

  it('G.1 asks for the best name, as a square is a rectangle too', () => {
    for (const q of all('M-3-G1', 3)) {
      expect(q.prompt.text).toMatch(/\. What is the best name for it\?$/);
      if (q.facts.equalSides === true) expect(shown(q)).toContain('A square is a rectangle too, but square is its best name.');
    }
  });

  it('F.9 finds a side from the area with the side next to it, never "side × side"', () => {
    const fromArea = all('M-3-F9', 3).filter((q) => /area of/.test(q.prompt.text));
    expect(fromArea.length).toBeGreaterThan(50);
    for (const q of fromArea) {
      expect(q.explanation.steps[0]).toBe('The area is one side times the side next to it.');
      expect(shown(q)).not.toMatch(/side × side/);
    }
  });

  it('C.8 lets the picture carry brackets that group times signs, and C.9 shows the box it asks about', () => {
    for (const level of [2, 3] as Level[]) {
      for (const q of all('M-3-C8', level)) {
        expect(said(q)).not.toMatch(/the answer to/);
        if (/[×÷]\s*\(|\)\s*[×÷]/.test(String(q.facts.expr))) expect(said(q)).toMatch(/^Look at the number sentence\./);
      }
    }
    for (const q of all('M-3-C9', 3)) expect(q.prompt.text).toMatch(/^\d × \d = \d+ \+ □\. .* What number goes in the box\?$/);
  });

  it('D.1 says how to share, and when to stop', () => {
    for (const level of [1, 2, 3] as Level[]) {
      for (const q of all('M-3-D1', level)) {
        expect(q.prompt.text).toMatch(/^Put \d+ [a-z]+ into \d equal groups\. How many go in each group\?$/);
        expect(q.explanation.steps[0]).toBe('Give one to each group, and keep going until none are left.');
      }
    }
  });

  it('counting by a number is written in words on screen, as it is said', () => {
    for (const skill of grade3) {
      for (const level of levelsOf(skill.maxLevel)) {
        for (const q of all(skill.id, level, 40)) expect(`${shown(q)} ${q.explanation.hint?.text ?? ''}`, skill.id).not.toMatch(/\b\d+s\b/);
      }
    }
  });
});

describe('options', () => {
  it('every option of a grade 3 choice is still different from the others', () => {
    for (const skillId of ['M-3-C1', 'M-3-F1', 'M-3-C12']) {
      for (const level of [1, 2] as Level[]) for (const q of all(skillId, level)) expect(new Set(options(q)).size, skillId).toBe(options(q).length);
    }
  });
});
