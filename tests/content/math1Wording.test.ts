// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { nudgeFor } from '../../src/app/hints';
import { sayWords } from '../../src/audio/say';
import { spokenSteps } from '../../src/audio/stepSay';
import { STORY_COUNTABLES } from '../../src/content/data/countables';
import { PART_STORIES, STORY_PRONOUNS, THREE_STORIES } from '../../src/content/data/h1-stories';
import { DAYS, MONTHS, STORY_NAMES } from '../../src/content/data/h1-things';
import { allGenerators, generateQuestion } from '../../src/content/registry';
import type { Level, Question, Say, Visual } from '../../src/engine/types';

// The wording rules of Math grade 1 (the wording audit, round 2, Nov 22, 2026), checked over many seeds.

const SEEDS = 150;
const all = (skillId: string, level: Level): Question[] => Array.from({ length: SEEDS }, (_, i) => generateQuestion(skillId, level, i + 1));
const n = (question: Question, name: string): number => question.facts[name] as number;
const GRADE1 = allGenerators().filter((generator) => generator.skillId.startsWith('M-1-'));
const everyQuestion = (): Question[] => GRADE1.flatMap((generator) => Array.from({ length: generator.maxLevel }, (_, i) => all(generator.skillId, (i + 1) as Level)).flat());
const said = (say: Say | null): string => (say === null ? '' : sayWords(say));
const sayText = (say: Say): string => say.filter((part): part is string => typeof part === 'string').join(' ');
// What a choice option stands for, as a sum: "10 + 6" or "10 - 4" is worked out.
const worth = (code: string): number => {
  const [x, sign, y] = code.replace('plus', '+').split(' ');
  return sign === '+' ? Number(x) + Number(y) : Number(x) - Number(y);
};

describe('every grade 1 question', () => {
  const questions = everyQuestion();

  it('asks a sum naturally ("What is 9 plus 7?"), never "... equals what?"', () => {
    for (const q of questions) {
      expect(q.prompt.text, q.skillId).not.toMatch(/equals what/i);
      expect(sayText(q.prompt.speak), q.skillId).not.toMatch(/equals what/i);
    }
    for (const id of ['M-1-B1', 'M-1-B2', 'M-1-B3', 'M-1-B7', 'M-1-B8', 'M-1-B9', 'M-1-B12']) for (const q of all(id, 1)) expect(q.prompt.text, id).toMatch(/^What is \d+ (plus|minus|−) \d+/);
  });

  it('has a hint before the answer: its own, or a first step that is a real move, and never the question said again', () => {
    for (const q of questions) {
      const nudge = nudgeFor(q);
      expect(nudge, `${q.skillId} level ${q.level} seed ${q.seed}`).not.toBeNull();
      expect(q.prompt.text.includes(nudge?.text ?? ''), `${q.skillId}: "${nudge?.text}"`).toBe(false);
    }
  });

  it('never says "one one" or "o clock", and never has a step that is only a number', () => {
    for (const q of questions) {
      const steps = spokenSteps(q).map(said);
      for (const line of [...steps, said(q.explanation.speak)]) {
        expect(line, q.skillId).not.toMatch(/\bone one\b/);
        expect(line, q.skillId).not.toMatch(/\bo clock\b/);
      }
      for (const step of q.explanation.steps) expect(step, q.skillId).not.toMatch(/^\d+\.$/);
    }
  });

  it('writes units in full in its steps ("41 cents", not "41¢")', () => {
    for (const q of questions) for (const step of q.explanation.steps) expect(step, q.skillId).not.toContain('¢');
  });

  it('says counted numbers apart in the summary: never two numbers in a row, except a time such as 8:30', () => {
    for (const q of questions) {
      if (q.skillId === 'M-1-C1') continue;
      const speak = q.explanation.speak;
      const run = speak.some((part, i) => typeof part === 'object' && 'number' in part && typeof speak[i + 1] === 'object' && 'number' in (speak[i + 1] as object));
      expect(run, `${q.skillId}: ${sayWords(speak)}`).toBe(false);
    }
  });

  it('says "the same answer as" in full whenever it asks for "the same", and exactly one option has that answer', () => {
    for (const q of questions) expect(q.prompt.text, q.skillId).not.toMatch(/Which (one )?is the same/);
    for (const level of [1, 2, 3] as Level[]) {
      for (const q of all('M-1-B4', level)) {
        if (q.type !== 'choice') throw new Error('not a choice');
        const right = (q.facts.options as string[]).filter((code) => worth(code) === n(q, 'a') + n(q, 'b'));
        expect(right).toEqual([(q.facts.options as string[])[q.answerIndex]]);
      }
    }
    for (const level of [1, 2] as Level[]) {
      for (const q of all('M-1-B19', level)) {
        if (q.type !== 'choice') throw new Error('not a choice');
        const right = (q.facts.options as string[]).filter((code) => worth(code) === n(q, 'a') - n(q, 'b'));
        expect(right).toEqual([(q.facts.options as string[])[q.answerIndex]]);
      }
    }
    for (const q of all('M-1-B11', 2)) {
      if (q.type !== 'choice') throw new Error('not a choice');
      const right = (q.facts.options as string[]).filter((code) => worth(code) === n(q, 'a') + n(q, 'b'));
      expect(right).toEqual([(q.facts.options as string[])[q.answerIndex]]);
    }
  });
});

describe('numbers, A and E', () => {
  it('A.4 reads the two numbers in the order shown, and at the sign level names the sign that is right', () => {
    for (const level of [1, 2, 3] as Level[]) {
      for (const q of all('M-1-A4', level)) {
        const [a, b] = q.facts.values as [number, number];
        const steps = q.explanation.steps;
        expect(steps.join(' ')).not.toMatch(/biggest place/);
        if (a === b) {
          expect(steps.at(-1)).toBe('So the sign is =.');
          expect(said(spokenSteps(q).at(-1) ?? null)).toBe('So the sign is equals.');
          continue;
        }
        expect(steps[1]?.startsWith(`${a} has ${a > b ? 'more' : 'fewer'} `)).toBe(true);
        if (level === 3) {
          expect(steps.at(-1)).toBe(a > b ? `${a} is greater than ${b}, so the sign is >.` : `${a} is less than ${b}, so the sign is <.`);
          // The name of the wrong sign is never said.
          expect(steps.join(' ')).not.toContain(a > b ? 'less than' : 'greater than');
        }
      }
    }
  });

  it('A.5 says which way the tens go and by how much, and the ones stay', () => {
    for (const level of [1, 2, 3] as Level[]) {
      for (const q of all('M-1-A5', level)) {
        const a = n(q, 'a');
        const more = q.facts.oracle === 'add';
        const answer = more ? a + 10 : a - 10;
        const [first, second, last] = q.explanation.steps;
        expect(first).toMatch(new RegExp(`^${a} has (no tens|1 ten|\\d tens)\\.$`));
        expect(second).toMatch(new RegExp(`^10 ${more ? 'more makes' : 'less leaves'} (no tens|1 ten|\\d tens)\\. (The ones stay ${a % 10}|There are still no ones)\\.$`));
        expect(last).toBe(`10 ${more ? 'more' : 'less'} than ${a} is ${answer}.`);
      }
    }
  });

  it('A.8 says that 3 digits beat 2 before the tens, when a number is over 100', () => {
    for (const q of all('M-1-A8', 3)) expect(q.explanation.steps[0]).toBe('A number with 3 digits is bigger than a number with 2 digits.');
    for (const q of all('M-1-A8', 1)) expect(q.explanation.steps[0]).toBe('Compare the tens first, then the ones.');
  });

  it('A.9 works the box out from the number before it, above it, or after it', () => {
    for (const level of [1, 2, 3] as Level[]) {
      for (const q of all('M-1-A9', level)) {
        const [topLeft, blank] = [n(q, 'topLeft'), n(q, 'blank')];
        const answer = topLeft + Math.floor(blank / 3) * 10 + (blank % 3);
        const near = q.explanation.steps[1];
        if (blank % 3 > 0) expect(near).toBe(`Before the box is ${answer - 1}, and 1 more is ${answer}.`);
        else if (blank >= 3) expect(near).toBe(`Above the box is ${answer - 10}, and 10 more is ${answer}.`);
        else expect(near).toBe(`After the box is ${answer + 1}, and 1 less is ${answer}.`);
      }
    }
  });

  it('A.10 reads a number word in parts and ends on how it is written, never "The word seventeen is 17."', () => {
    for (const level of [1, 2, 3] as Level[]) {
      for (const q of all('M-1-A10', level)) {
        const value = n(q, 'n');
        const steps = q.explanation.steps;
        expect(steps.join(' ')).not.toMatch(/^The word /);
        const digits = String(value).split('').map((digit) => `${digit === '8' ? 'an' : 'a'} ${digit}`);
        if (level === 3) expect(steps.at(-1)).toMatch(/^So we write [a-z-]+\.$/);
        else expect(steps.at(-1)).toBe(`We write it with ${digits[0] as string} and ${digits[1] as string}.`);
        if (level === 1) expect(steps[0]).toMatch(/^[A-Z][a-z]+teen ends in teen\. Teen means 1 ten\.$/);
      }
    }
  });
});

describe('adding and subtracting, B', () => {
  it('B.2 shows a way to take away, never "Start with 16. Take away 7. 9 are left."', () => {
    for (const level of [1, 2, 3] as Level[]) {
      for (const q of all('M-1-B2', level)) {
        const [a, b] = [n(q, 'a'), n(q, 'b')];
        const steps = q.explanation.steps;
        expect(steps).not.toContain(`Take away ${b}.`);
        if (b <= 3) expect(steps[1]).toMatch(new RegExp(`^Count back ${b}: `));
        else if (a > 10 && b > a - 10) expect(steps[1]).toBe(`Take away ${a - 10} to get to 10: ${a} − ${a - 10} = 10.`);
        else if (a > 10) expect(steps[0]).toBe(`${a} is 10 and ${a - 10}.`);
        else expect(steps[0]).toBe(`Think: ${b} plus what makes ${a}?`);
        expect(steps.at(-1)).toMatch(new RegExp(`${a} − ${b} = ${a - b}\\.$|make ${a - b}\\.$`));
      }
    }
  });

  it('B.3 says doubles as doubles, never "groups of"', () => {
    for (const level of [1, 2, 3] as Level[]) for (const q of all('M-1-B3', level)) expect(q.explanation.steps.join(' ')).not.toMatch(/groups of/);
  });

  it('B.5 at level 4 reads the number sentence aloud and calls the gap a box; level 3 thinks of adding, as B.12 does', () => {
    for (const q of all('M-1-B5', 4)) {
      expect(q.prompt.text).toBe('Drag the number that goes in the box.');
      expect(sayText(q.prompt.speak)).toMatch(/plus what equals|What plus/);
    }
    for (const q of all('M-1-B5', 3)) expect(q.explanation.steps[0]).toBe(`Think: ${n(q, 'a')} plus what makes ${n(q, 'total')}?`);
    for (const q of all('M-1-B12', 2)) expect(q.explanation.steps[0]).toBe(`Think: ${n(q, 'b')} plus what makes ${n(q, 'a')}?`);
  });

  it('B.10 links the story\'s words to adding or taking away, and answers in the story\'s words', () => {
    const clue: Record<string, RegExp> = { gets: /gets more, so we add\./, table: /^In all means put them together, so we add\./, givesAway: /gives some away, so we subtract\./, takes: /takes some, so we subtract\./, compare: /^To find how many more, we subtract\./ };
    for (const level of [1, 2, 3] as Level[]) {
      for (const q of all('M-1-B10', level)) {
        const kind = q.facts.story as string;
        const things = STORY_COUNTABLES.find((thing) => thing.one === q.facts.thing)?.many as string;
        expect(q.explanation.steps[0]).toMatch(clue[kind] as RegExp);
        expect(q.explanation.steps.at(-1)).toContain(things);
      }
    }
  });

  it('B.13 and B.18 ask "What number do you get to?" when there is no number line to land on', () => {
    for (const id of ['M-1-B13', 'M-1-B18']) {
      for (const q of all(id, 3)) expect(q.prompt.text.endsWith('What number do you get to?')).toBe(true);
      for (const q of all(id, 1)) expect(q.prompt.text.endsWith('Where do you land?')).toBe(true);
    }
  });

  it('B.14 asks "not" last, and its last step says why the fact is in the family or not', () => {
    for (const q of all('M-1-B14', 1)) {
      if (q.type !== 'choice') throw new Error('not a choice');
      const right = ((q.facts.options as string[])[q.answerIndex] as string).replace(/ - /g, ' − ');
      expect(q.explanation.steps.at(-1)).toBe(`So ${right} is in the family.`);
    }
    for (const q of all('M-1-B14', 2)) {
      if (q.type !== 'choice') throw new Error('not a choice');
      expect(q.prompt.text.endsWith('Which one is not?')).toBe(true);
      const right = ((q.facts.options as string[])[q.answerIndex] as string).replace(/ - /g, ' − ');
      expect(q.explanation.steps.at(-1)).toMatch(new RegExp(`^${right.replace(/[+]/g, '\\+')} (uses \\d+|is not true), so it is not in the family\\.$`));
    }
    for (const q of all('M-1-B14', 3)) expect(q.prompt.text).toMatch(/^\d+ \+ \d+ = \d+\. So what is \d+ − \d+\?$/);
  });

  it('B.15 and B.16 say a name once, then "she" or "he"; every name has its word', () => {
    for (const name of STORY_NAMES) expect(STORY_PRONOUNS[name], name).toBeDefined();
    for (const story of [...PART_STORIES, ...THREE_STORIES]) expect(story.text.split('{name}').length - 1, story.id).toBeLessThanOrEqual(1);
    for (const id of ['M-1-B15', 'M-1-B16']) {
      for (const level of [1, 2, 3] as Level[]) {
        for (const q of all(id, level)) {
          const name = q.facts.name as string;
          expect(q.prompt.text.split(name).length - 1, q.prompt.text).toBeLessThanOrEqual(1);
        }
      }
    }
  });

  it('B.16 has no picture to count, starts a "how many at the start" story with what was added, and answers in the story\'s words', () => {
    for (const level of [1, 2, 3] as Level[]) {
      for (const q of all('M-1-B16', level)) {
        expect(q.stimulus).toBeUndefined();
        const story = PART_STORIES.find((each) => each.id === q.facts.story);
        if (!story) throw new Error('no story');
        if (story.kind === 'start') expect(q.explanation.steps[0]).toBe(`${n(q, 'b')} more were added, and now there are ${n(q, 'total')}.`);
        expect(q.explanation.steps.at(-1)).toMatch(new RegExp(`\\b(${story.thing}|${story.things})\\b`));
        expect(q.explanation.steps.join(' ')).not.toMatch(/The answer is/);
      }
    }
  });
});

describe('time, measuring and money, C', () => {
  it('C.2 names every bar by where it goes, never "this one", and shows them all in order', () => {
    for (const level of [1, 2, 3] as Level[]) {
      for (const q of all('M-1-C2', level)) {
        expect(q.prompt.text).toBe('Put the bars in order, shortest first.');
        expect(q.explanation.steps.join(' ')).not.toMatch(/[Tt]his one/);
        const sorted = (q.facts.values as number[]).slice().sort((x, y) => x - y);
        expect(q.explanation.visual).toEqual({ kind: 'row', children: sorted.map((length) => ({ kind: 'bar', length, color: q.facts.color, orientation: 'horizontal' })) });
      }
    }
  });

  it('C.3 says who chose before it asks, and names each row', () => {
    for (const level of [1, 2, 3] as Level[]) for (const q of all('M-1-C3', level)) expect(q.prompt.text.startsWith('Children chose their favorite thing. ')).toBe(true);
    for (const q of all('M-1-C3', 1)) expect(q.explanation.steps[0]).toMatch(/^Find the [a-z]+ row\.$/);
  });

  it('C.4 names the coin only in the last step, and compares two coins in the order shown', () => {
    for (const level of [1, 2] as Level[]) {
      for (const q of all('M-1-C4', level)) {
        const [coin] = q.facts.coins as [string];
        q.explanation.steps.slice(0, -1).forEach((step) => expect(step).not.toContain(coin));
        expect(q.explanation.steps.at(-1)).toMatch(new RegExp(`^This is a ${coin}\\.`));
      }
    }
    for (const q of all('M-1-C4', 3)) {
      const [first, second] = q.facts.coins as [string, string];
      expect(q.explanation.steps[0]).toMatch(new RegExp(`^The first coin is a ${first},`));
      expect(q.explanation.steps[1]).toMatch(new RegExp(`^The second coin is a ${second},`));
    }
  });

  it('C.5 level 2 has one row lined up the right way: the others have a gap, or are not straight', () => {
    const cells = (visual: Visual): number[] => (visual.kind === 'emojiGroup' ? (visual.slots ?? []) : []);
    for (const q of all('M-1-C5', 2)) {
      if (q.type !== 'choice') throw new Error('not a choice');
      expect(q.prompt.text).toBe('Which paper clips are lined up the right way?');
      // Lined up: every clip in one row of the grid, each touching the next. A row that starts a space late is
      // lined up too, and could be argued for, so none may be offered beside the right one.
      const lined = q.options.map((option) => cells(option)).map((slots) => slots.every((slot) => Math.floor(slot / 5) === Math.floor((slots[0] ?? 0) / 5)) && slots.every((slot, i) => i === 0 || slot === (slots[i - 1] as number) + 1));
      expect(lined.filter(Boolean)).toHaveLength(1);
      expect(lined[q.answerIndex]).toBe(true);
      expect(q.explanation.steps.join(' ')).not.toMatch(/very end|from the start/);
    }
  });

  it('C.6 has one step for each clock, in the order the clocks stand', () => {
    for (const level of [1, 2, 3] as Level[]) {
      for (const q of all('M-1-C6', level)) {
        const times = q.facts.leftValues as string[];
        expect(q.explanation.steps).toHaveLength(1 + times.length);
        // As a digital clock is read (the owner's choice, Nov 22, 2026): "5 o'clock: 5:00" on the hour, and "5:30",
        // said "five thirty", on the half hour.
        times.forEach((time, i) => {
          const hour = time.split(':')[0] as string;
          const shows = time.endsWith(':00') ? `${hour} o'clock: ${time}` : time;
          expect(q.explanation.steps[i + 1]).toBe(`The ${['first', 'second', 'third'][i] as string} clock shows ${shows}.`);
        });
      }
    }
  });

  it('C.7 and C.8 say only the part of the list that matters', () => {
    for (const [id, names] of [['M-1-C7', DAYS], ['M-1-C8', MONTHS]] as [string, readonly string[]][]) {
      for (const level of [1, 2, 3] as Level[]) {
        for (const q of all(id, level)) for (const step of q.explanation.steps) expect(names.filter((name) => step.includes(name)).length, step).toBeLessThanOrEqual(3);
      }
    }
  });

  it('C.9 asks about votes only on charts that were voted on, and says "than by car"', () => {
    for (const level of [1, 2, 3] as Level[]) {
      for (const q of all('M-1-C9', level)) {
        const school = (q.facts.vote as string).includes('came to school');
        if (school) expect(q.prompt.text).not.toMatch(/votes/);
        if (school && level === 3) expect(q.prompt.text).toMatch(/came by [a-z]+ than by [a-z]+\?$/);
      }
    }
    for (const q of all('M-1-C9', 1)) expect(q.explanation.steps[0]).toMatch(/^Find the [a-z]+ row\.$/);
  });

  it('C.10 names its groups in easy words and gives a reason for each', () => {
    for (const level of [1, 2, 3] as Level[]) {
      for (const q of all('M-1-C10', level)) {
        if (q.type !== 'sort') throw new Error('not a sort');
        expect(q.bins.map((bin) => bin.label)).not.toContain('Vehicles');
        for (const step of q.explanation.steps) expect(step).toMatch(/\. (They are living things|They take us places|We wear them|We eat them)\.$/);
      }
    }
  });

  it('C.11 asks for cents when the answer is typed', () => {
    for (const q of all('M-1-C11', 3)) expect(q.prompt.text).toBe('How many cents is this?');
  });

  it('C.12 draws the three towers once each, never four towers for three colours', () => {
    for (const level of [1, 2] as Level[]) {
      for (const q of all('M-1-C12', level)) {
        if (q.stimulus?.kind !== 'row') throw new Error('not a row');
        const colors = q.stimulus.children.map((child) => (child.kind === 'bar' ? child.color : ''));
        expect(colors).toEqual(q.facts.options);
      }
    }
  });
});

describe('shapes and parts, D', () => {
  it('D.2 names every shape that has the corners asked for', () => {
    for (const q of all('M-1-D2', 2)) {
      if (q.type !== 'multiSelect') throw new Error('not a multiSelect');
      for (const index of q.answerIndexes) {
        const option = q.options[index];
        if (option?.kind !== 'shape') throw new Error('not a shape');
        expect(q.explanation.steps[1]).toContain(option.shape);
      }
    }
  });

  it('D.4 says "the" flat face of a cone, which has only one', () => {
    for (const q of all('M-1-D4', 1)) expect(q.prompt.text).toBe(q.facts.solid === 'cone' ? 'What shape is the flat face of a cone?' : `What shape is a flat face of a ${q.facts.solid as string}?`);
  });

  it('D.5 ends on the part the question asks for', () => {
    for (const level of [1, 2, 3] as Level[]) {
      for (const q of all('M-1-D5', level)) expect(q.explanation.steps.at(-1)).toBe(q.facts.ask === 'bigger' ? 'So one half is bigger than one fourth.' : 'So one fourth is smaller than one half.');
    }
  });
});

describe('the old four-beat lessons', () => {
  it('spell o\'clock and never read a word ending such as "ty" as a word', () => {
    for (const generator of GRADE1) {
      for (const beat of generator.lesson()) {
        expect(`${beat.text} ${sayText(beat.speak)}`, generator.skillId).not.toMatch(/\bo clock\b|\bin ty\b/);
      }
    }
  });
});
