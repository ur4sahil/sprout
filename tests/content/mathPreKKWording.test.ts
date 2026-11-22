// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { spokenSteps } from '../../src/audio/stepSay';
import { CATALOGUE } from '../../src/content/catalogue';
import { COUNTABLES } from '../../src/content/data/countables';
import { generateQuestion } from '../../src/content/registry';
import { sayText } from '../../src/engine/describe';
import type { Level, Question } from '../../src/engine/types';

// The wording audit's rules for Math pre-K and kindergarten (Nov 22, 2026), checked over many seeds. The golden
// files catch any change; these say each rule is right.

const SEEDS = 200;
const all = (skillId: string, level: Level): Question[] => Array.from({ length: SEEDS }, (_, i) => generateQuestion(skillId, level, i + 1));
const MINE = CATALOGUE.filter((skill) => skill.id.startsWith('M-PK-') || skill.id.startsWith('M-K-'));
const levels = (skillId: string): Level[] => {
  const most = MINE.find((skill) => skill.id === skillId)?.maxLevel ?? 1;
  return Array.from({ length: most }, (_, i) => (i + 1) as Level);
};
const everyQuestion = (skillIds: readonly string[]): Question[] => skillIds.flatMap((id) => levels(id).flatMap((level) => all(id, level)));
const QUESTIONS = everyQuestion(MINE.map((skill) => skill.id));
const said = (q: Question): string[] => spokenSteps(q).map((say) => (say ? sayText(say) : ''));
const steps = (q: Question): string => q.explanation.steps.join(' ');
const n = (q: Question, name: string): number => q.facts[name] as number;
const optionNames = (q: Question): string[] => (Array.isArray(q.facts.options) ? q.facts.options.map(String) : []);

describe('every pre-K and kindergarten Math question', () => {
  it('has a hint of its own, said aloud', () => {
    for (const q of QUESTIONS) {
      expect(q.explanation.hint?.text, `${q.skillId} L${q.level}`).toMatch(/\S/);
    }
  });

  it('asks a sum the natural way, never "equals what?"', () => {
    for (const q of QUESTIONS) expect(q.prompt.text, q.skillId).not.toMatch(/equals what/);
    for (const [id, level] of [['M-K-C2', 1], ['M-K-C4', 1], ['M-K-C4', 3], ['M-K-C6', 1], ['M-K-C7', 2], ['M-K-D1', 2]] as [string, Level][]) {
      for (const q of all(id, level)) expect(q.prompt.text, id).toMatch(/^What is \d+ (plus|take away) \d+\?$/);
    }
    // The box on the left is read the same way round, and so is the last step.
    for (const q of all('M-K-C4', 4)) {
      expect(q.prompt.text).toBe(`What number equals ${n(q, 'a')} plus ${n(q, 'b')}?`);
      expect(q.explanation.steps.at(-1)).toBe(`${n(q, 'a') + n(q, 'b')} = ${n(q, 'a')} + ${n(q, 'b')}`);
    }
    // The parts first, as the steps say them.
    for (const q of all('M-K-C9', 2)) expect(q.prompt.text).toBe(`${n(q, 'a')} and what make ${n(q, 'total')}?`);
    for (const q of all('M-K-D1', 3)) expect(q.prompt.text).toBe(`10 and what make ${10 + n(q, 'ones')}?`);
  });

  it('says "take away" for the minus sign in kindergarten, never "minus"', () => {
    for (const q of QUESTIONS.filter((each) => each.skillId.startsWith('M-K-'))) {
      const words = [...said(q), sayText(q.prompt.speak), q.explanation.hint?.text ?? ''].join(' ');
      expect(words, `${q.skillId} L${q.level}`).not.toMatch(/\bminus\b/);
    }
    const taking = all('M-K-C13', 1).concat(all('M-K-C16', 1), all('M-K-C14', 2).filter((q) => q.facts.result === n(q, 'a') - n(q, 'b')));
    for (const q of taking) expect(said(q).join(' '), q.skillId).toMatch(/\btake away\b/);
  });

  it('says what to tap when the answer is a sort, an order or a match', () => {
    const tapped = QUESTIONS.filter((q) => q.type === 'sort' || q.type === 'order' || q.type === 'match');
    expect(new Set(tapped.map((q) => q.skillId))).toEqual(new Set(['M-PK-A7', 'M-PK-C9', 'M-PK-D3', 'M-PK-D6', 'M-K-B3', 'M-K-F2']));
    for (const q of tapped) expect(q.prompt.text, q.skillId).toMatch(/^Tap /);
  });

  it('names groups and things in its steps, never "this group", "these ones" or "these two"', () => {
    for (const q of QUESTIONS) expect(steps(q), `${q.skillId} L${q.level}`).not.toMatch(/\b(this group|these ones|these two|this row|the right row)\b/i);
  });

  it('says "fewer" of things, never of a bare number, and one thing is one', () => {
    for (const q of QUESTIONS) {
      const words = `${q.prompt.text} ${steps(q)}`;
      expect(words, q.skillId).not.toMatch(/\b\d+ (is|are) (fewer|the fewest)\b/);
      expect(words, q.skillId).not.toMatch(/\b1 (are|more are)\b|There are 1 |\bcactus are\b/);
    }
    expect(all('M-PK-B2', 3).some((q) => /^1 \w+ is fewer than 2 \w+\.$/.test(q.explanation.steps[2] ?? ''))).toBe(true);
    expect(all('M-K-C17', 1).some((q) => q.explanation.steps.includes('1 more is needed.'))).toBe(true);
    expect(all('M-PK-C7', 3).some((q) => q.prompt.text === 'What color is the cactus?')).toBe(true);
  });

  it('uses the words a four- or five-year-old knows: dots, the empty spot, sides that are all the same', () => {
    for (const q of [...everyQuestion(['M-K-A2', 'M-K-A3'])]) expect(`${q.prompt.text} ${steps(q)}`).not.toMatch(/counter/);
    for (const q of [...everyQuestion(['M-PK-D4', 'M-K-G1'])]) expect(`${q.prompt.text} ${steps(q)}`).not.toMatch(/\bgap\b/);
    for (const q of all('M-PK-D4', 1)) expect(q.prompt.text).toBe('What goes in the empty spot?');
    for (const q of all('M-K-G1', 3)) expect(q.prompt.text).toBe('What goes in the empty spot?');
    for (const q of everyQuestion(['M-PK-C1'])) expect(steps(q)).not.toMatch(/equal/);
  });
});

describe('one right answer', () => {
  it('never offers a square with a diamond (M-K-E1), nor a square with a rectangle in pre-K (M-PK-C1)', () => {
    for (const q of everyQuestion(['M-K-E1'])) expect(optionNames(q).includes('square') && optionNames(q).includes('diamond'), JSON.stringify(q.facts)).toBe(false);
    for (const q of everyQuestion(['M-PK-C1'])) expect(optionNames(q).includes('square') && optionNames(q).includes('rectangle'), JSON.stringify(q.facts)).toBe(false);
  });

  it('asks which pieces make the shape drawn (M-K-E5 level 3)', () => {
    for (const q of all('M-K-E5', 3)) {
      const made = q.facts.makes as string;
      expect(q.prompt.text).toBe(`Which pieces make this ${made}?`);
      expect(q.stimulus).toMatchObject({ kind: 'shape', shape: made });
    }
  });

  it('counts the two colours of a dot card together (M-PK-A8 level 3)', () => {
    for (const q of all('M-PK-A8', 3)) expect(q.prompt.text).toBe('How many dots are there in all? Count the red and the blue.');
  });

  it('says where the line starts, and what to match (M-PK-A13, M-PK-A11, M-PK-C6)', () => {
    for (const q of everyQuestion(['M-PK-A13'])) expect(q.prompt.text).toMatch(/^The line starts at the flag\. Which animal is (first|last|second|third)\?$/);
    for (const q of everyQuestion(['M-PK-A11'])) {
      const thing = COUNTABLES.find((each) => each.one === q.facts.thing);
      expect(q.prompt.text).toBe(`Which group has the same number as the ${thing?.many}?`);
    }
    for (const q of everyQuestion(['M-PK-C6'])) expect(q.prompt.text).toBe('Which one is the same shape as this one?');
  });

  it('calls a pizza slice a pizza slice in a shapes question (M-PK-C5)', () => {
    const named = everyQuestion(['M-PK-C5']).filter((q) => steps(q).includes('pizza'));
    expect(named.length).toBeGreaterThan(0);
    for (const q of named) expect(steps(q)).toMatch(/pizza slice/);
  });

  it('asks what can sit on top of a shape, never "can you stack it" (M-K-E7)', () => {
    for (const q of all('M-K-E7', 2)) expect(q.prompt.text).toBe('Can this shape hold another shape on top?');
    for (const q of everyQuestion(['M-K-E7'])) {
      expect(q.explanation.steps[0]).toMatch(/^This is a (cube|sphere|cone|cylinder)\.$/);
      if (q.explanation.steps[0] === 'This is a sphere.') expect(q.explanation.steps[1]).toBe('It is round all over, so it can roll.');
    }
  });
});

describe('the patterns', () => {
  // The rule a step states, checked on the pattern itself: wherever what comes before is seen, what comes next is
  // the same. "After square comes circle" is no rule in square, square, circle; "After two squares" is.
  function holds(unit: string[], before: string[], next: string): boolean {
    const at = (i: number): string => unit[((i % unit.length) + unit.length) % unit.length] as string;
    for (let i = unit.length * 2; i < unit.length * 4; i += 1) {
      const matches = before.every((name, k) => (name.startsWith('!') ? at(i - before.length + k) !== name.slice(1) : at(i - before.length + k) === name));
      if (matches && at(i) !== next) return false;
    }
    return true;
  }

  it('says a rule for what comes next that is true wherever the gap is (M-K-G1)', () => {
    let doubled = 0;
    for (const q of [...all('M-K-G1', 1), ...all('M-K-G1', 2)]) {
      const unit = q.facts.unit as string[];
      const rule = q.explanation.steps[1] ?? '';
      const two = /^After two (\w+)s comes (?:an? )?(\w+)\.$/.exec(rule);
      const second = /^After one (\w+) comes a second (\w+)\.$/.exec(rule);
      const plain = /^After (?:an? )?(\w+) comes (?:an? )?(\w+)\.$/.exec(rule);
      if (two) expect(holds(unit, [two[1] as string, two[1] as string], two[2] as string), rule).toBe(true);
      else if (second) expect(holds(unit, [`!${second[1]}`, second[1] as string], second[2] as string), rule).toBe(true);
      else if (plain) expect(holds(unit, [plain[1] as string], plain[2] as string), `${unit.join(' ')}: ${rule}`).toBe(true);
      else throw new Error(`not a rule: ${rule}`);
      if (two || second) doubled += 1;
    }
    expect(doubled).toBeGreaterThan(50);
  });

  it('says "a" before a shape or a picture, never before a colour', () => {
    for (const q of [...all('M-PK-D2', 2), ...all('M-PK-D2', 3)]) expect(q.explanation.steps[1]).toMatch(/^After an? \w+ comes an? \w+\.$/);
    for (const q of all('M-PK-D2', 1)) expect(q.explanation.steps[1]).toMatch(/^After \w+ comes \w+\.$/);
    for (const q of [...all('M-PK-D4', 2), ...all('M-PK-D4', 3)]) expect(q.explanation.steps[1]).toMatch(/^An? \w+ goes in the empty spot\.$/);
  });

  it('says each row with its names, never letter codes (M-PK-D5, M-K-G2)', () => {
    for (const q of everyQuestion(['M-PK-D5'])) {
      expect(q.explanation.steps[0]).toMatch(/^The top row goes (\w+, )+\w+\.$/);
      expect(q.explanation.steps[1]).toMatch(/goes the same way\.$/);
    }
    for (const q of everyQuestion(['M-K-G2'])) expect(steps(q)).not.toMatch(/\b[ABC] [ABC]\b/);
  });
});

describe('the steps and hints of single skills', () => {
  it('says the missing number is missing, even at the end of the row (M-K-A7)', () => {
    for (const q of all('M-K-A7', 3)) expect(q.explanation.steps.at(-1)).toMatch(/^The missing number is \d+\.$/);
  });

  it('counts tally marks in groups of five, by ones only when there are ones (M-K-A13)', () => {
    for (const q of everyQuestion(['M-K-A13'])) {
      expect(steps(q)).not.toMatch(/bundle|1 across/);
      if (n(q, 'n') > 5) expect(steps(q).includes('then by ones')).toBe(n(q, 'n') % 5 !== 0);
    }
  });

  it('starts counting on at the bigger number, and says why (M-K-C2, M-K-C4)', () => {
    for (const q of [...all('M-K-C4', 1), ...all('M-K-C2', 1)]) {
      const [a, b] = [n(q, 'a'), n(q, 'b')];
      expect(q.explanation.steps[0]).toBe(a === b ? `Start at ${a}.` : `Start at the bigger number, ${Math.max(a, b)}.`);
    }
  });

  it('nudges the equation levels to count up from the number shown (M-K-C8, M-K-C17)', () => {
    for (const q of all('M-K-C8', 3)) expect(q.explanation.hint?.text).toBe(n(q, 'a') === 5 ? 'Count up from the first number to 10.' : `Start at ${n(q, 'a')}. Count up to 10.`);
    for (const q of all('M-K-C17', 3)) {
      expect(q.prompt.text).toMatch(/^(What plus \d equals 5\?|\d plus what equals 5\?)$/);
      expect(q.explanation.hint?.text).not.toMatch(/boxes|are there/);
    }
  });

  it('says why a sign is plus or take away, then names it (M-K-C14)', () => {
    for (const q of [...all('M-K-C14', 2), ...all('M-K-C14', 3)]) {
      expect(q.explanation.steps[0]).toMatch(/^\d+ is (bigger|smaller) than \d+, so we (add|take away)\.$/);
      expect(said(q)[1]).toMatch(/The sign is (plus|take away)\.$/);
    }
  });

  it('uses the word the question asks about (M-K-F4, M-K-F5, M-PK-C4)', () => {
    for (const q of all('M-K-F4', 2)) expect(q.explanation.steps[0]).toMatch(/ is lighter than /);
    for (const q of all('M-K-F5', 2)) expect(q.explanation.steps[0]).toMatch(/ holds less than /);
    // The heaviest is heavier than both the others.
    for (const q of all('M-PK-C4', 3)) expect(q.explanation.steps[0]).toMatch(/^An? [\w ]+ is (heavier|lighter) than an? [\w ]+ and an? [\w ]+\.$/);
  });

  it('says the words of kindergarten in whole sentences (M-K-A10, M-K-E4, M-K-E5, M-K-F3)', () => {
    for (const q of everyQuestion(['M-K-A10'])) expect(q.explanation.steps[0]).toMatch(/^This word says [a-z]+\.$/);
    for (const q of everyQuestion(['M-K-E4'])) expect(steps(q)).not.toMatch(/beside/);
    for (const q of [...all('M-K-E5', 1), ...all('M-K-E5', 2)]) expect(q.prompt.text).toMatch(/^These \d+ \w+s fit together\. Which shape do they make\?$/);
    for (const q of all('M-K-F3', 3)) expect(q.prompt.text).toMatch(/^What do you use to find out how (long something is|heavy something is|much something holds)\?$/);
    for (const q of everyQuestion(['M-K-F3'])) expect(q.explanation.steps[0]).toMatch(/ tells you how (long something is|heavy something is|much something holds)\.$/);
  });

  it('counts with the same words in every grade (M-K-A5, M-PK-C8)', () => {
    for (const q of everyQuestion(['M-K-A5'])) expect(q.explanation.steps[0]).toMatch(/^Let's count: /);
    for (const q of all('M-PK-C8', 3)) expect(q.prompt.text).toMatch(/^What shape is the [\w ]+\?$/);
  });
});
