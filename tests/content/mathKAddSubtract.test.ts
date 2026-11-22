// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { STORY_COUNTABLES } from '../../src/content/data/countables';
import { STORY_NAMES, STORY_TEMPLATES } from '../../src/content/data/storyProblems';
import { numeralChoices } from '../../src/content/generators/math/k/numerals';
import { tellStory } from '../../src/content/generators/math/k/stories';
import { generateQuestion } from '../../src/content/registry';
import { sayText } from '../../src/engine/describe';
import { makeRng } from '../../src/engine/rng';
import type { Level, Question } from '../../src/engine/types';

// The level rules of Math K categories C and D (plan section 8), checked over many seeds.

const SEEDS = 300;

function all(skillId: string, level: Level): Question[] {
  return Array.from({ length: SEEDS }, (_, i) => generateQuestion(skillId, level, i + 1));
}

const n = (question: Question, name: string): number => question.facts[name] as number;

function range(questions: Question[], value: (question: Question) => number): [number, number] {
  const values = questions.map(value);
  return [Math.min(...values), Math.max(...values)];
}

describe('numeralChoices', () => {
  it('gives three different numerals in order, inside the range, with the answer among them', () => {
    for (let seed = 1; seed <= 500; seed += 1) {
      const rng = makeRng(seed);
      const answer = rng.int(0, 10);
      const values = numeralChoices(answer, [rng.int(0, 10), rng.int(0, 10)], 0, 12, rng);
      expect(values).toHaveLength(3);
      expect(new Set(values).size).toBe(3);
      expect(values).toEqual([...values].sort((x, y) => x - y));
      expect(values).toContain(answer);
      expect(Math.min(...values)).toBeGreaterThanOrEqual(0);
      expect(Math.max(...values)).toBeLessThanOrEqual(12);
    }
  });

  it('offers the slips a child makes, and always one that is one away', () => {
    const seen = new Set<number>();
    for (let seed = 1; seed <= 300; seed += 1) {
      const values = numeralChoices(7, [3, 4], 0, 12, makeRng(seed));
      values.forEach((value) => seen.add(value));
      expect(values.every((value) => [3, 4, 6, 7, 8, 9].includes(value))).toBe(true);
    }
    expect([...seen].sort((x, y) => x - y)).toEqual([3, 4, 6, 7, 8, 9]);
  });

  it('puts the answer in every place it can take, and follows the weights', () => {
    const places = [0, 0, 0];
    const leaning = [0, 0, 0];
    for (let seed = 1; seed <= 600; seed += 1) {
      const even = numeralChoices(5, [], 0, 10, makeRng(seed)).indexOf(5);
      const last = numeralChoices(5, [], 0, 10, makeRng(seed), [0, 0, 1]).indexOf(5);
      places[even] = (places[even] ?? 0) + 1;
      leaning[last] = (leaning[last] ?? 0) + 1;
    }
    for (const count of places) expect(count).toBeGreaterThan(150);
    expect(leaning).toEqual([0, 0, 600]);
    // Zero has nothing below it, so it is always first.
    for (let seed = 1; seed <= 50; seed += 1) expect(numeralChoices(0, [4], 0, 10, makeRng(seed))[0]).toBe(0);
  });

  it('refuses a range with no room for three numerals', () => {
    expect(() => numeralChoices(1, [], 1, 2, makeRng(1))).toThrow();
  });
});

describe('story templates', () => {
  const apple = STORY_COUNTABLES[0]!;

  it('uses the one-thing word and "is" for 1, and the plural everywhere else', () => {
    // A story names a person once, then says he or she (the owner's choice, Nov 22, 2026).
    expect(tellStory({ kind: 'gets', name: 'Sam', thing: apple, a: 1, b: 1 }).text).toBe('Sam has 1 apple. He gets 1 more. How many apples does he have now?');
    expect(tellStory({ kind: 'gets', name: 'Mia', thing: apple, a: 3, b: 2 }).text).toBe('Mia has 3 apples. She gets 2 more. How many apples does she have now?');
    expect(tellStory({ kind: 'table', name: 'Sam', thing: apple, a: 1, b: 1 }).text).toBe('1 apple is on the table. 1 more is in the box. How many apples are there in all?');
    expect(tellStory({ kind: 'table', name: 'Sam', thing: apple, a: 2, b: 3 }).text).toBe('2 apples are on the table. 3 more are in the box. How many apples are there in all?');
    expect(tellStory({ kind: 'givesAway', name: 'Leo', thing: apple, a: 4, b: 1 }).text).toBe('Leo has 4 apples. He gives away 1. How many apples are left?');
    expect(tellStory({ kind: 'takes', name: 'Zoe', thing: apple, a: 5, b: 2 }).text).toBe('There are 5 apples. Zoe takes 2. How many are left?');
  });

  it('names a person once, then says he or she; two people keep their names', () => {
    expect(tellStory({ kind: 'addAdd', name: 'Ava', thing: apple, a: 2, b: 3, c: 4 }).text).toBe('Ava has 2 apples. She gets 3 more. Then she gets 4 more. How many apples does she have now?');
    expect(tellStory({ kind: 'addSub', name: 'Max', thing: apple, a: 6, b: 3, c: 4 }).text).toBe('Max has 6 apples. He gets 3 more. Then he gives away 4. How many apples does he have now?');
    expect(tellStory({ kind: 'compare', name: 'Sam', name2: 'Leo', thing: apple, a: 5, b: 2 }).text).toBe('Sam has 5 apples. Leo has 2. How many more does Sam have?');
    // Every name has its pronoun, and the speech says the same words as the screen.
    for (const name of STORY_NAMES) {
      for (const kind of Object.keys(STORY_TEMPLATES) as (keyof typeof STORY_TEMPLATES)[]) {
        const story = tellStory({ kind, name, name2: name === 'Sam' ? 'Mia' : 'Sam', thing: apple, a: 7, b: 3, c: 2 });
        const times = (story.text.match(new RegExp(`\\b${name}\\b`, 'g')) ?? []).length;
        expect(times, `${kind}: ${story.text}`).toBeLessThanOrEqual(kind === 'compare' ? 2 : 1);
        expect(sayText(story.speak).replace(/\s+/g, ' ').replace(/ \./g, '.')).toBe(story.text);
      }
    }
  });

  it('says every number as a number part, and the same words as the screen shows', () => {
    const story = tellStory({ kind: 'givesAway', name: 'Ava', thing: apple, a: 7, b: 3 });
    expect(story.speak.filter((part) => typeof part === 'object')).toEqual([{ number: 7 }, { number: 3 }]);
    expect(story.speak.filter((part) => typeof part === 'string').join(' ')).not.toMatch(/\d/);
    expect(sayText(story.speak).replace(/\s+/g, ' ').replace(/ \./g, '.')).toBe(story.text);
  });

  it('has the six names and the seven templates of the plan, and refuses a template it cannot fill', () => {
    expect(STORY_NAMES).toEqual(['Sam', 'Mia', 'Leo', 'Ava', 'Max', 'Zoe']);
    expect(Object.keys(STORY_TEMPLATES).sort()).toEqual(['addAdd', 'addSub', 'compare', 'gets', 'givesAway', 'table', 'takes']);
    expect(() => tellStory({ kind: 'compare', name: 'Sam', thing: apple, a: 5, b: 2 })).toThrow(/name2/);
  });
});

describe('Math K category C, the level rules', () => {
  const sum = (question: Question): number => n(question, 'a') + n(question, 'b');
  const start = (question: Question): number => n(question, 'a');

  it.each([
    ['M-K-C1', 1, 2, 3],
    ['M-K-C1', 2, 4, 5],
    ['M-K-C2', 1, 2, 5],
    ['M-K-C2', 2, 1, 5],
    ['M-K-C2', 3, 1, 5],
    ['M-K-C3', 1, 4, 7],
    ['M-K-C3', 2, 6, 10],
    ['M-K-C10', 1, 2, 5],
    ['M-K-C10', 2, 6, 10],
    ['M-K-C10', 3, 2, 10],
  ] as [string, Level, number, number][])('%s level %i adds to sums from %i to %i', (skillId, level, lo, hi) => {
    expect(range(all(skillId, level), sum)).toEqual([lo, hi]);
  });

  it.each([
    ['M-K-C5', 1, 2, 3],
    ['M-K-C5', 2, 4, 5],
    ['M-K-C6', 1, 2, 5],
    ['M-K-C6', 2, 1, 5],
    ['M-K-C6', 3, 1, 5],
    ['M-K-C7', 1, 2, 7],
    ['M-K-C7', 2, 8, 10],
    ['M-K-C7', 3, 2, 10],
    ['M-K-C11', 1, 2, 5],
    ['M-K-C11', 2, 6, 10],
    ['M-K-C11', 3, 2, 10],
  ] as [string, Level, number, number][])('%s level %i takes away from a start of %i to %i, never more than it has', (skillId, level, lo, hi) => {
    const questions = all(skillId, level);
    expect(range(questions, start)).toEqual([lo, hi]);
    for (const question of questions) expect(n(question, 'b')).toBeLessThanOrEqual(n(question, 'a'));
  });

  it('the "with zero" levels always have a zero in the question, and both kinds turn up', () => {
    const adding = all('M-K-C2', 2);
    for (const question of adding) expect(Math.min(n(question, 'a'), n(question, 'b'))).toBe(0);
    expect(adding.some((question) => n(question, 'a') === 0)).toBe(true);
    expect(adding.some((question) => n(question, 'b') === 0)).toBe(true);
    const taking = all('M-K-C6', 2);
    for (const question of taking) expect(n(question, 'b') === 0 || n(question, 'b') === n(question, 'a')).toBe(true);
    const toZero = taking.filter((question) => n(question, 'b') === n(question, 'a')).length;
    expect(toZero).toBeGreaterThan(SEEDS * 0.15);
    expect(toZero).toBeLessThan(SEEDS * 0.35);
  });

  it('levels without zero in their rule never use it, and picture levels always leave something', () => {
    for (const [skillId, level] of [['M-K-C1', 1], ['M-K-C1', 2], ['M-K-C2', 1], ['M-K-C3', 1], ['M-K-C3', 2], ['M-K-C10', 1], ['M-K-C10', 3]] as [string, Level][]) {
      for (const question of all(skillId, level)) expect(Math.min(n(question, 'a'), n(question, 'b'))).toBeGreaterThanOrEqual(1);
    }
    for (const [skillId, level] of [['M-K-C5', 1], ['M-K-C5', 2], ['M-K-C6', 1], ['M-K-C7', 1], ['M-K-C7', 2], ['M-K-C11', 1], ['M-K-C11', 3]] as [string, Level][]) {
      for (const question of all(skillId, level)) {
        expect(n(question, 'b')).toBeGreaterThanOrEqual(1);
        expect(n(question, 'a') - n(question, 'b')).toBeGreaterThanOrEqual(1);
      }
    }
  });

  it('the typed levels are typed, and the others are choices', () => {
    const typed: [string, Level][] = [['M-K-C2', 3], ['M-K-C6', 3], ['M-K-C7', 3], ['M-K-C8', 3], ['M-K-C10', 3], ['M-K-C11', 3]];
    for (const [skillId, level] of typed) expect(new Set(all(skillId, level).map((question) => question.type))).toEqual(new Set(['numberPad']));
    for (const [skillId, level] of [['M-K-C2', 2], ['M-K-C6', 2], ['M-K-C8', 2], ['M-K-C10', 2], ['M-K-C11', 2], ['M-K-C9', 3], ['M-K-D1', 3]] as [string, Level][]) {
      expect(new Set(all(skillId, level).map((question) => question.type))).toEqual(new Set(['choice']));
    }
  });

  it('pictures show exactly the numbers in the question', () => {
    for (const question of [...all('M-K-C1', 2), ...all('M-K-C3', 2), ...all('M-K-C10', 2)]) {
      const stimulus = question.stimulus;
      if (stimulus?.kind !== 'row') throw new Error('an adding picture is two groups side by side');
      expect(stimulus.children.map((child) => (child.kind === 'emojiGroup' ? child.count : -1))).toEqual([n(question, 'a'), n(question, 'b')]);
    }
    for (const question of [...all('M-K-C5', 2), ...all('M-K-C11', 2)]) {
      const stimulus = question.stimulus;
      if (stimulus?.kind !== 'emojiGroup') throw new Error('a take-away picture is one group');
      expect([stimulus.count, stimulus.crossed]).toEqual([n(question, 'a'), n(question, 'b')]);
    }
    // The top story level has no picture to count.
    for (const question of [...all('M-K-C10', 3), ...all('M-K-C11', 3)]) expect(question.stimulus).toBeUndefined();
  });

  it('a story on screen holds its numbers, its thing and, when it names someone, the name', () => {
    for (const question of [...all('M-K-C10', 2), ...all('M-K-C11', 2)]) {
      const text = question.prompt.text;
      expect(text).toContain(String(n(question, 'a')));
      expect(text).toContain(String(n(question, 'b')));
      const thing = STORY_COUNTABLES.find((candidate) => candidate.one === question.facts.thing);
      expect(thing, 'a story thing can sit on a table').toBeDefined();
      expect(text).toContain(thing!.many);
      if (question.facts.story === 'table') expect(question.facts.name).toBeUndefined();
      else expect(text).toContain(question.facts.name as string);
    }
  });

  it('Make 10: the frame shows a, the parts make 10, and level 1 starts from 5 or more', () => {
    expect(range(all('M-K-C8', 1), start)).toEqual([5, 9]);
    expect(range(all('M-K-C8', 2), start)).toEqual([1, 9]);
    expect(range(all('M-K-C8', 3), start)).toEqual([1, 9]);
    for (const level of [1, 2, 3] as Level[]) {
      for (const question of all('M-K-C8', level)) {
        expect(sum(question)).toBe(10);
        expect(question.facts.total).toBe(10);
        if (level < 3) expect(question.stimulus).toEqual({ kind: 'tenFrame', filled: n(question, 'a'), frames: 1 });
        else expect(question.stimulus).toEqual({ kind: 'equation', parts: [n(question, 'a'), '+', 'blank', '=', 10] });
      }
    }
  });

  it('Break apart: totals to 5, then to 8, then to 10, with two parts of at least 1', () => {
    const total = (question: Question): number => n(question, 'total');
    expect(range(all('M-K-C9', 1), total)).toEqual([2, 5]);
    expect(range(all('M-K-C9', 2), total)).toEqual([6, 8]);
    expect(range(all('M-K-C9', 3), total)).toEqual([9, 10]);
    for (const level of [1, 2, 3] as Level[]) {
      for (const question of all('M-K-C9', level)) {
        expect(sum(question)).toBe(total(question));
        expect(Math.min(n(question, 'a'), n(question, 'b'))).toBeGreaterThanOrEqual(1);
        expect(question.stimulus).toEqual({ kind: 'equation', parts: [total(question), '=', n(question, 'a'), '+', 'blank'] });
      }
    }
  });
});

describe('Math K D.1 Teen numbers', () => {
  it('asks about 11 to 19 only: frames, then 10 plus ones, then the ones that go with 10', () => {
    for (const level of [1, 2, 3] as Level[]) {
      const questions = all('M-K-D1', level);
      expect(range(questions, (question) => n(question, 'ones'))).toEqual([1, 9]);
      for (const question of questions) {
        const ones = n(question, 'ones');
        expect([question.facts.hundreds, question.facts.tens]).toEqual([0, 1]);
        if (level === 1) expect(question.stimulus).toEqual({ kind: 'tenFrame', filled: 10 + ones, frames: 2 });
        if (level === 2) expect(question.stimulus).toEqual({ kind: 'equation', parts: [10, '+', ones, '=', 'blank'] });
        if (level === 3) expect(question.stimulus).toEqual({ kind: 'equation', parts: [10 + ones, '=', 10, '+', 'blank'] });
        const options = question.facts.options as number[];
        expect(options).toContain(level === 3 ? ones : 10 + ones);
        // Teen number options stay between 10 and 20.
        if (level < 3) expect(options.every((value) => value >= 10 && value <= 20)).toBe(true);
      }
    }
  });
});

describe('explanations read as a sentence', () => {
  const shown = (question: Question): string => question.explanation.steps.join(' ');

  it('"1 is left", "3 are left" and "None are left"', () => {
    const lines = new Set([...all('M-K-C5', 1), ...all('M-K-C6', 2), ...all('M-K-C7', 1)].map((question) => `${n(question, 'a') - n(question, 'b')}|${question.explanation.steps[2]}`));
    expect(lines).toContain('1|1 is left.');
    expect(lines).toContain('3|3 are left.');
    expect(lines).toContain('0|None are left.');
    for (const line of lines) expect(line).toMatch(/^(0\|None are left\.|1\|1 is left\.|([2-9])\|\2 are left\.)$/);
  });

  it('adding zero is explained as adding none, never as counting on', () => {
    for (const question of all('M-K-C2', 2)) {
      expect(shown(question)).toContain('Zero means none.');
      expect(sayText(question.explanation.speak)).not.toContain('Count on');
    }
    for (const question of all('M-K-C2', 1)) expect(shown(question)).toContain('Count on');
  });

  it('Make 10 says "1 box is full" and "1 is empty"', () => {
    const lines = new Set(all('M-K-C8', 2).map(shown));
    expect(lines).toContain('1 box is full. 9 are empty. 1 and 9 make 10.');
    expect(lines).toContain('9 boxes are full. 1 is empty. 9 and 1 make 10.');
    expect(lines).toContain('7 boxes are full. 3 are empty. 7 and 3 make 10.');
  });

  it('each family keeps its wording from the plan', () => {
    expect(generateQuestion('M-K-C1', 1, 1).prompt.text).toBe('How many in all?');
    expect(generateQuestion('M-K-C5', 1, 1).prompt.text).toBe('How many are left?');
    expect(generateQuestion('M-K-C8', 1, 1).prompt.text).toBe('How many more to make 10?');
    // The owner's wording (Nov 22, 2026) in place of the plan's "5 take away 1 equals what?" and "4 is 1 and what?".
    for (const question of all('M-K-C6', 1)) expect(question.prompt.text).toBe(`What is ${n(question, 'a')} take away ${n(question, 'b')}?`);
    for (const question of all('M-K-C9', 1)) expect(question.prompt.text).toBe(`${n(question, 'a')} and what make ${n(question, 'total')}?`);
    for (const question of all('M-K-C10', 1)) expect(shown(question)).toBe(`${n(question, 'a')} plus ${n(question, 'b')} is ${n(question, 'a') + n(question, 'b')}.`);
    for (const question of all('M-K-C11', 1)) expect(shown(question)).toBe(`${n(question, 'a')} take away ${n(question, 'b')} is ${n(question, 'a') - n(question, 'b')}.`);
    for (const question of all('M-K-D1', 1)) expect(shown(question)).toBe(`A full ten and ${n(question, 'ones')} more is ${10 + n(question, 'ones')}.`);
  });
});
