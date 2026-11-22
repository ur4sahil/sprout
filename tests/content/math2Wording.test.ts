// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { spokenSteps } from '../../src/audio/stepSay';
import { voiceText } from '../../src/audio/voice';
import { CATALOGUE } from '../../src/content/catalogue';
import { PRONOUN, STORY_NAMES as H2_NAMES } from '../../src/content/data/h2-stories';
import { DAY_THINGS } from '../../src/content/data/h2-world';
import { STORY_NAMES } from '../../src/content/data/storyProblems';
import { addExplanation, plusPrompt, minusPrompt, subtractExplanation } from '../../src/content/generators/math/g2/addSubtract';
import { generateQuestion } from '../../src/content/registry';
import { sayText } from '../../src/engine/describe';
import type { Level, Question, Say } from '../../src/engine/types';

// The wording audit of Math grade 2 (Nov 22, 2026): one check for each rule it fixed, over 300 seeds. The golden
// files pin what each seed gives; these say why it is right.

const SEEDS = 300;
const all = (skillId: string, level: Level): Question[] => Array.from({ length: SEEDS }, (_, i) => generateQuestion(skillId, level, i + 1));
const levels = (skillId: string): Level[] => {
  const max = CATALOGUE.find((skill) => skill.id === skillId)?.maxLevel ?? 3;
  return ([1, 2, 3, 4] as Level[]).filter((level) => level <= max);
};
const every = (skillId: string): Question[] => levels(skillId).flatMap((level) => all(skillId, level));
const GRADE2 = CATALOGUE.filter((skill) => skill.id.startsWith('M-2-')).map((skill) => skill.id);
const n = (question: Question, name: string): number => question.facts[name] as number;
const said = (say: Say | null): string => (say === null ? '' : (voiceText(say) ?? sayText(say)));
const stepsSaid = (question: Question): string[] => spokenSteps(question).map(said);
const choiceOf = (question: Question): Extract<Question, { type: 'choice' }> => {
  if (question.type !== 'choice') throw new Error(`${question.skillId} is not a choice`);
  return question;
};

describe('every grade 2 skill', () => {
  it('asks a sum the natural way: "What is 21 plus 4?", never "equals what?"', () => {
    expect(plusPrompt(21, 4)).toEqual({ text: 'What is 21 plus 4?', speak: ['What is', { number: 21 }, 'plus', { number: 4 }, '?'] });
    expect(minusPrompt(98, 66).text).toBe('What is 98 minus 66?');
    for (const skillId of GRADE2) {
      for (const question of every(skillId)) {
        expect(question.prompt.text, skillId).not.toMatch(/equals what|is what number/);
        expect(question.prompt.text, skillId).not.toMatch(/\d [+−-] \d.*\?$/); // a sum asked in words, not signs
      }
    }
  });

  it('gives every question a strategy hint of its own, except skip counting, whose first step is one', () => {
    for (const skillId of GRADE2.filter((id) => id !== 'M-2-A4')) {
      for (const level of levels(skillId)) {
        for (const question of all(skillId, level).slice(0, 40)) expect(question.explanation.hint?.text, `${skillId} level ${level}`).toBeTruthy();
      }
    }
  });

  it('never says a step that repeats itself aloud or stutters: "six hundred is six hundred", "one one"', () => {
    for (const skillId of GRADE2) {
      for (const question of every(skillId)) {
        for (const line of stepsSaid(question)) {
          expect(line, skillId).not.toMatch(/\bone one\b/i);
          // A whole number or phrase on both sides of "is" or a colon: "nine is nine.", "fifteen: fifteen." A rule
          // such as "Even plus even is even." is not a repeat of a number.
          const repeat = /(?<![a-z-])(?<!(?:plus|minus) )([a-z-]+(?: [a-z-]+){0,2}) (?:is|are|:) \1(?=[.,:;!?]|$)/i.exec(line.replace(/\b(even|odd) is \1\b/gi, ''));
          expect(repeat?.[0], `${skillId}: ${line}`).toBeUndefined();
        }
      }
    }
  });

  it('writes units in full in steps and hints, so they are said as words', () => {
    for (const skillId of ['M-2-C3', 'M-2-C5', 'M-2-C6', 'M-2-C7', 'M-2-C12']) {
      for (const question of every(skillId)) {
        for (const line of [...question.explanation.steps, question.explanation.hint?.text ?? '']) expect(line, skillId).not.toMatch(/\b\d+ ?(cm|m|in|ft)\b/);
      }
    }
  });

  it('uses the singular after 1: "1 ten", "1 centimeter longer"', () => {
    for (const skillId of GRADE2) {
      for (const question of every(skillId)) {
        for (const line of question.explanation.steps) expect(line, skillId).not.toMatch(/(?<![\d,])1 (tens|ones|hundreds|centimeters|meters|inches|feet|shoes|squares|columns|rows|cents)\b/);
      }
    }
  });
});

describe('numbers to 1,000', () => {
  it('A.1 level 4 asks only about a digit that shows once, so "the 9" means one place', () => {
    for (const question of all('M-2-A1', 4)) {
      const digits = [n(question, 'hundreds'), n(question, 'tens'), n(question, 'ones')];
      const place = (question.facts.ask as string).replace('Value', '') as 'hundreds' | 'tens' | 'ones';
      expect(digits.filter((digit) => digit === n(question, place))).toHaveLength(1);
    }
  });

  it('A.1 names the blocks, and a place with none holds a 0', () => {
    for (const question of [...all('M-2-A1', 2), ...all('M-2-A1', 3)]) {
      const [first, tens, ones] = question.explanation.steps;
      expect(first).toMatch(/^\d big squares? (is|are) \d00\.$/);
      expect(tens).toBe(n(question, 'tens') === 0 ? 'There are no long blocks, so a 0 holds the tens place.' : `${n(question, 'tens')} long block${n(question, 'tens') === 1 ? ' is' : 's are'} ${n(question, 'tens') * 10}.`);
      if (n(question, 'ones') === 0) expect(ones).toBe('There are no small blocks, so a 0 holds the ones place.');
    }
  });

  it('A.3 says the sign in the order the question reads, and names it', () => {
    for (const question of all('M-2-A3', 3)) {
      const [a, b] = question.facts.values as [number, number];
      const last = question.explanation.steps.at(-1) ?? '';
      if (a === b) {
        expect(last).toBe('They are equal, so the sign is =.');
        expect(said(spokenSteps(question)[1] ?? null)).toBe('They are equal, so the sign is equals.');
      } else expect(last).toBe(`${a} is ${a > b ? 'greater' : 'less'} than ${b}, so the sign is ${a > b ? '>' : '<'}.`);
    }
    for (const level of [1, 2, 3] as Level[]) for (const question of all('M-2-A3', level)) expect(question.explanation.hint?.text).toBe('Compare the hundreds first.');
  });

  it('A.5 counts a numeral by 2s, since it has nothing to pair; pictures are paired', () => {
    for (const question of all('M-2-A5', 2)) {
      const value = (question.facts.values as number[])[0] as number;
      expect(question.explanation.steps[0]).toMatch(/^Count by 2s: 2(, \d+)*\.$/);
      expect(question.explanation.steps[1]).toBe(`${value} is ${value % 2 === 0 ? '' : 'not '}in the count.`);
      // A count of 1 never takes a plural (Nov 22, 2026): one dot has no partner.
      expect(question.explanation.hint?.text).toBe(value === 1 ? 'Draw 1 dot. Does it have a partner?' : `Draw ${value} dots in pairs. Is one left over?`);
    }
    expect(all('M-2-A5', 2).some((question) => (question.facts.values as number[])[0] === 1)).toBe(true);
    for (const question of all('M-2-A5', 1)) expect(question.explanation.steps[0]).toBe('Make pairs.');
  });

  it('A.6 shows the count, from the first number up to the dot', () => {
    for (const level of [1, 2, 3, 4] as Level[]) {
      for (const question of all('M-2-A6', level)) {
        const [min, step, index] = [n(question, 'min'), n(question, 'step'), n(question, 'index')];
        const counted = Array.from({ length: index }, (_, i) => min + step * (i + 1));
        expect(question.explanation.steps[1]).toBe(`Count by ${step}s from ${min}: ${counted.join(', ')}.`);
      }
    }
  });

  it('A.7 asks the typed level as a question, and its hint never says the words to read', () => {
    for (const question of all('M-2-A7', 3)) expect(question.prompt.text).toBe('What number do these words name?');
    for (const level of [2, 3] as Level[]) {
      for (const question of all('M-2-A7', level)) {
        const words = (question.facts.read as string[])[0] as string;
        const hint = question.explanation.hint?.text ?? '';
        expect(words.split(/[ -]/).every((word) => hint.toLowerCase().split(/[^a-z]+/).includes(word)), hint).toBe(false);
      }
    }
  });

  it('A.9 says a hundred is 10 tens when it asks for tens in all, and opens on the rule, not a sum', () => {
    for (const question of all('M-2-A9', 3)) expect(question.prompt.text).toBe(`A hundred is 10 tens. How many tens are in ${n(question, 'hundreds') * 100 + n(question, 'tens') * 10} in all?`);
    for (const level of [1, 2] as Level[]) {
      for (const question of all('M-2-A9', level)) {
        expect(question.explanation.steps[0]).toBe(n(question, 'tens') >= 10 ? '10 tens make 1 hundred.' : '10 ones make 1 ten.');
        expect(question.explanation.hint?.text).toBe(question.explanation.steps[0]);
      }
    }
  });

  it('A.10 asks for a double plainly; A.13 asks which number when the child taps; A.14 past 100 is a number chart', () => {
    for (const question of all('M-2-A10', 3)) expect(question.prompt.text).toBe(`What number plus itself makes ${n(question, 'total')}?`);
    for (const level of [1, 2] as Level[]) for (const question of all('M-2-A13', level)) expect(question.prompt.text).toBe(`Use each digit once. Which is the ${question.facts.ask as string} number you can make?`);
    for (const question of all('M-2-A13', 2)) expect(question.explanation.steps[1]).toBe('Put the next smallest in the tens place.');
    for (const question of all('M-2-A14', 3)) expect(question.prompt.text).toBe('This is part of a number chart. Which number is missing?');
    for (const level of [1, 2] as Level[]) for (const question of all('M-2-A14', level)) expect(question.prompt.text).toMatch(/^This is part of a hundred chart\./);
  });
});

describe('adding and subtracting', () => {
  it('says first when only one place changes, so the first step works nothing out', () => {
    for (const skillId of ['M-2-B1', 'M-2-B3', 'M-2-B5', 'M-2-B6', 'M-2-B7']) {
      let only = 0;
      for (const question of every(skillId)) {
        const first = question.explanation.steps[0] ?? '';
        if (/^Only the/.test(first)) {
          only += 1;
          expect(first).toMatch(/^Only the (ones|tens|hundreds) change\.$/);
          expect(question.explanation.hint?.text).toBe(first);
        }
      }
      expect(only, skillId).toBeGreaterThan(0);
    }
    expect(addExplanation(500, 300).steps).toEqual(['Only the hundreds change.', 'Add the hundreds: 5 + 3 = 8.', 'The answer is 800.']);
  });

  it('subtracts place by place from the ones, says "subtract", and says how many there are after a break', () => {
    expect(subtractExplanation(43, 5).steps[0]).toBe('There are not enough ones, so break a ten. Now there are 13 ones: 13 − 5 = 8.');
    expect(subtractExplanation(835, 393).steps[1]).toBe('There are not enough tens, so break a hundred. Now there are 13 tens: 13 − 9 = 4.');
    expect(subtractExplanation(974, 260).steps).toEqual(['The ones stay the same.', 'Subtract the tens: 7 − 6 = 1.', 'Subtract the hundreds: 9 − 2 = 7.', 'The answer is 714.']);
    for (const skillId of ['M-2-B3', 'M-2-B4', 'M-2-B6', 'M-2-B7']) {
      for (const question of every(skillId)) {
        const steps = question.explanation.steps.join(' ');
        expect(steps, skillId).not.toMatch(/Take away/);
        // The places are talked through in order: ones, then tens, then hundreds.
        const order = [...steps.matchAll(/\b(ones|tens|hundreds) stay the same|Subtract the (ones|tens|hundreds)|not enough (ones|tens)/g)].map((match) => ['ones', 'tens', 'hundreds'].indexOf(match[1] ?? match[2] ?? match[3] ?? ''));
        expect(order, steps).toEqual([...order].sort((x, y) => x - y));
        if (/not enough/.test(steps)) expect(steps).toMatch(/so break a (ten|hundred)\. Now there are \d+ (ones|tens): /);
      }
    }
  });

  it('never says "1 ten and 1 one" or "0 ones" when a new ten is made', () => {
    expect(addExplanation(52, 9).steps[0]).toBe('Add the ones: 2 + 9 = 11. That is 1 ten and 1 more.');
    expect(addExplanation(46, 44).steps[0]).toBe('Add the ones: 6 + 4 = 10. That is 1 ten and no ones.');
    for (const skillId of ['M-2-B2', 'M-2-B5']) for (const question of every(skillId)) expect(question.explanation.steps.join(' '), skillId).not.toMatch(/1 ten and 1 one\b|and 0 ones/);
  });

  it('B.8 asks which addition adds up the rows, and shows one number for each row', () => {
    for (const question of all('M-2-B8', 2)) {
      expect(question.prompt.text).toBe('Which addition adds up the rows?');
      expect(question.explanation.steps[0]).toBe(`Each row has ${n(question, 'cols')}.`);
      expect(question.explanation.steps[2]).toBe(`That is ${Array.from({ length: n(question, 'rows') }, () => n(question, 'cols')).join(' + ')}.`);
    }
  });

  it('a story with one person names them once, then says he or she', () => {
    for (const name of [...STORY_NAMES, ...H2_NAMES]) expect(PRONOUN[name], name).toBeDefined();
    for (const [skillId, levelsOf] of [['M-2-B9', [1, 2]], ['M-2-B10', [1, 2]], ['M-2-B14', [1, 2, 3]], ['M-2-C9', [1]]] as [string, Level[]][]) {
      for (const level of levelsOf) {
        for (const question of all(skillId, level)) {
          const name = question.facts.name as string | undefined;
          if (name === undefined) continue;
          expect(question.prompt.text.split(new RegExp(`\\b${name}\\b`)).length - 1, question.prompt.text).toBe(1);
          expect(question.prompt.speak.filter((part): part is string => typeof part === 'string').join(' ').split(new RegExp(`\\b${name}\\b`)).length - 1).toBe(1);
        }
      }
    }
    // A compare story has two people, so both keep their names.
    for (const question of all('M-2-B9', 3)) expect(question.prompt.text).toContain(`does ${question.facts.name as string} have?`);
  });

  it('B.11 does one sum a step, and makes a ten first when two one-digit numbers do', () => {
    let tens = 0;
    for (const level of [1, 2, 3] as Level[]) {
      for (const question of all('M-2-B11', level)) {
        for (const step of question.explanation.steps.slice(0, -1)) expect(step).toMatch(/^(Make a ten first: )?\d+ \+ \d+ = \d+\.$/);
        if (question.explanation.steps[0]?.startsWith('Make a ten first:')) {
          tens += 1;
          expect(question.explanation.steps[0]).toMatch(/: \d \+ \d = 10\.$/);
        }
      }
    }
    expect(tens).toBeGreaterThan(20);
  });

  it('B.12 says the amounts after breaking, and never subtracts a 0', () => {
    for (const level of [1, 2, 3] as Level[]) {
      for (const question of all('M-2-B12', level)) {
        expect(question.explanation.steps[1]).toMatch(/^Now there are \d hundreds?, 9 tens and \d+ ones\. Subtract the ones: /);
        expect(question.explanation.steps.join(' ')).not.toMatch(/− 0 =/);
      }
    }
  });

  it('B.14 says why it subtracts, or adds back what was given away', () => {
    const second: Record<string, RegExp> = { gotSome: /^To find the change, subtract: /, gaveSome: /^To find the change, subtract: /, hadSome: /^Take away the \d+ (he|she) got: /, hadSomeGave: /^Put back the \d+ (he|she) gave away: /};
    for (const question of all('M-2-B14', 3)) expect(question.explanation.steps[1]).toMatch(second[question.facts.form as string] as RegExp);
  });

  it('B.16 says the rule in the order of the sum, and writes the choices Even and Odd as A.5 does', () => {
    for (const question of all('M-2-B16', 2)) {
      const [a, b] = [n(question, 'a'), n(question, 'b')];
      const kind = (x: number): string => (x % 2 === 0 ? 'even' : 'odd');
      expect(question.explanation.steps[1]).toBe(`${kind(a).charAt(0).toUpperCase()}${kind(a).slice(1)} plus ${kind(b)} is ${kind(a + b)}.`);
      expect(choiceOf(question).options.map((option) => (option.kind === 'text' ? option.value : ''))).toEqual(['Even', 'Odd']);
      expect(question.facts.options).toEqual(['even', 'odd']);
    }
  });
});

describe('time, money, measuring and shapes', () => {
  it('C.1 reads the minutes first, then the hour; setting the clock says what to move', () => {
    for (const level of [1, 2, 3] as Level[]) {
      for (const question of all('M-2-C1', level)) {
        expect(question.explanation.steps[0]).toBe(`The long hand points to ${n(question, 'minute') / 5}.`);
        expect(question.explanation.steps[2]).toMatch(/^The short hand is .*, so the hour is \d+\.$/);
        expect(question.explanation.hint?.text).toBe('The long hand shows the minutes. Count by fives.');
      }
    }
    for (const question of all('M-2-C1', 4)) expect(question.explanation.steps[0]).toMatch(/^Move the long hand to \d+: /);
    expect(all('M-2-C1', 4).flatMap((question) => question.explanation.steps)).not.toContain('Count by fives to 5.');
  });

  it('C.2 and C.10 say what each coin is worth and start with the coin worth the most, never "the biggest coin"', () => {
    for (const skillId of ['M-2-C2', 'M-2-C10']) {
      for (const question of every(skillId)) {
        const steps = question.explanation.steps.join(' ');
        expect(steps).not.toMatch(/biggest/);
        expect(question.explanation.steps[0]).toMatch(/^(A (penny|nickel|dime|quarter) is \d+ cents?\. ?)+$/);
        const kinds = new Set(skillId === 'M-2-C2' ? (question.facts.coins as string[]) : (choiceOf(question).options[choiceOf(question).answerIndex] as { coins: string[] }).coins);
        // One kind of coin is counted by its worth: "worth the most" would mean nothing.
        expect(/Start with the coin worth the most/.test(steps)).toBe(kinds.size > 1);
      }
    }
  });

  it('C.3 measures in centimeters and says so', () => {
    for (const question of every('M-2-C3')) {
      expect(question.prompt.text).toBe(`How many centimeters long is the ${question.facts.object as string}?`);
      expect(question.explanation.steps.at(-1)).toBe(`The ${question.facts.object as string} is ${n(question, 'lengthUnits')} centimeters long.`);
    }
  });

  it('C.4 and C.11 say who chose: kids picked a favorite', () => {
    for (const skillId of ['M-2-C4', 'M-2-C11']) {
      for (const level of [1, 2, 3] as Level[]) {
        for (const question of all(skillId, level)) {
          expect(question.prompt.text, skillId).toMatch(/^Kids picked their favorite thing\. /);
          expect(question.prompt.text, skillId).not.toMatch(/chose|vote/);
        }
      }
    }
  });

  it('C.5 level 2 shows the thing on an inch ruler and a centimeter ruler, never an unmarked ruler, and its steps end on the side the question asks', () => {
    for (const question of all('M-2-C5', 2)) {
      const asked = /bigger\?$/.test(question.prompt.text) ? 'bigger' : 'smaller';
      // The same line measured both ways (the owner's choice, Nov 22, 2026): both rulers print their unit.
      const picture = question.stimulus;
      if (picture?.kind !== 'twoRulers') throw new Error('not measured on two rulers');
      expect(question.prompt.text.startsWith(`The ${picture.object} is measured in inches and in centimeters. `)).toBe(true);
      // It ends close to a whole centimeter, so the centimeter ruler can be read.
      const cm = Math.round(picture.inches * 2.54);
      expect(Math.abs(picture.inches * 2.54 - cm)).toBeLessThan(0.3);
      expect(question.explanation.steps[0]).toBe('An inch is longer than a centimeter.');
      expect(question.explanation.steps).toContain(`The ${picture.object} is ${picture.inches} inches long, and about ${cm} centimeters long.`);
      expect(question.explanation.steps.at(-1)).toBe(asked === 'bigger' ? 'The centimeters number is bigger.' : 'The inches number is smaller.');
    }
  });

  it('C.5 and C.12 ask how tall a door is, and how long everything else is', () => {
    for (const skillId of ['M-2-C5', 'M-2-C12']) {
      const asked = new Set<string>();
      for (const question of all(skillId, skillId === 'M-2-C5' ? 3 : 2)) {
        const door = /door/.test(question.prompt.text);
        expect(question.prompt.text).toMatch(door ? /^About how tall is a door\?$/ : /^About how long is /);
        asked.add(door ? 'tall' : 'long');
      }
      expect(asked, skillId).toEqual(new Set(['tall', 'long']));
    }
  });

  it('C.6 says the units in full and a length of 1 as "1 centimeter"', () => {
    for (const question of all('M-2-C6', 1)) expect(question.explanation.steps[0]).toBe(`The pencil is ${(question.facts.values as number[])[0]} centimeters long.`);
    for (const question of [...all('M-2-C6', 2), ...all('M-2-C6', 3)]) {
      const difference = n(question, 'a') - n(question, 'b');
      expect(question.explanation.steps.at(-1)).toMatch(new RegExp(`is ${difference} ${difference === 1 ? 'centimeter' : 'centimeters'} longer\\.$`));
    }
  });

  it('C.7 asks plainly which length has the most shoes', () => {
    for (const question of all('M-2-C7', 2)) expect(question.prompt.text).toBe('Which length has the most shoes?');
  });

  it('C.8 says a.m. and p.m. by their letters in the steps, and offers no picture that fits both halves of the day', () => {
    for (const level of [1, 2, 3] as Level[]) {
      for (const question of all('M-2-C8', level)) {
        expect(question.explanation.stepsSay).toHaveLength(question.explanation.steps.length);
        for (const line of stepsSaid(question)) expect(line).not.toMatch(/[ap]\.m/i);
      }
    }
    const half = (name: string): string => DAY_THINGS.find((thing) => thing.name === name)?.half ?? '';
    for (const question of all('M-2-C8', 3)) {
      const want = question.facts.want === 'a.m.' ? 'am' : 'pm';
      const wrong = (question.facts.options as string[]).filter((name) => half(name) !== want);
      expect(wrong).toHaveLength(2);
      for (const name of wrong) expect(want === 'am' ? ['bed', 'moon'] : ['school'], `${name} offered against ${want}`).not.toContain(name);
      expect(question.prompt.text).toMatch(/^Which one do you do in the [ap]\.m\.\?$/);
      // Each picture says what you do: "eat breakfast".
      for (const option of choiceOf(question).options) expect(sayText(option.speak ?? [])).toMatch(/^(eat|get|hear|go|look|take) /);
    }
  });

  it('C.12 starts with the rule, never the thing asked about, so the first step names no answer', () => {
    for (const level of [1, 2] as Level[]) {
      for (const question of all('M-2-C12', level)) {
        expect(question.explanation.steps[0]).toBe('Centimeters are for small things. Meters are for big things.');
        if (level === 1) expect(question.explanation.hint?.text).toBe('Could you hold it in one hand?');
      }
    }
  });

  it('D.3 adds the rows, as B.8 does, and counts the rows or columns when those are asked', () => {
    for (const question of every('M-2-D3')) expect(question.explanation.steps.join(' ')).not.toMatch(/×|times/);
    for (const question of all('M-2-D3', 2)) {
      const rows = question.facts.blank === 'rows';
      const count = rows ? n(question, 'rows') : n(question, 'cols');
      expect(question.explanation.steps[0]).toBe(rows ? 'Rows go across.' : 'Columns go up and down.');
      expect(question.explanation.steps[2]).toBe(`There are ${count} ${rows ? 'rows' : 'columns'}.`);
      expect(question.explanation.steps.join(' ')).not.toMatch(/squares\.$/);
    }
  });
});
