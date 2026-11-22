// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { nudgeFor } from '../../src/app/hints';
import { sayWords } from '../../src/audio/say';
import { spokenSteps } from '../../src/audio/stepSay';
import { allGenerators, generateQuestion } from '../../src/content/registry';
import { STORY_PRONOUNS as H1_PRONOUNS } from '../../src/content/data/h1-stories';
import { STORY_NAMES as H1_NAMES } from '../../src/content/data/h1-things';
import { PRONOUN as H2_PRONOUNS, STORY_NAMES as H2_NAMES } from '../../src/content/data/h2-stories';
import { SUFFIXED } from '../../src/content/data/phonics2';
import { STORY_NAMES, STORY_PRONOUNS } from '../../src/content/data/storyProblems';
import { describeVisual, sayText } from '../../src/engine/describe';
import type { Level, Question, Say, Visual } from '../../src/engine/types';

// The owner's choices of Nov 22, 2026 that reach across grades, checked over every skill and many seeds. The golden
// files catch any change; these say what the words must be.

const SEEDS = 40;
const levelsOf = (maxLevel: number): Level[] => ([1, 2, 3, 4] as Level[]).filter((level) => level <= maxLevel);
const all = (skillId: string, level: Level, seeds = SEEDS): Question[] => Array.from({ length: seeds }, (_, i) => generateQuestion(skillId, level, i + 1));
const EVERY: readonly Question[] = allGenerators().flatMap((generator) => levelsOf(generator.maxLevel).flatMap((level) => all(generator.skillId, level)));
const options = (q: Question): Visual[] => ('options' in q && Array.isArray(q.options) ? (q.options as Visual[]) : []);

// Everything a question shows and says: its prompt, steps, hint, summary and the spoken labels of its pictures.
function everyLine(q: Question): string[] {
  const said = (say: Say | null | undefined): string[] => (say ? [sayText(say), sayWords(say)] : []);
  const pictures = [q.stimulus, ...options(q), q.explanation.visual].filter((visual): visual is Visual => visual !== undefined);
  return [
    q.prompt.text,
    ...said(q.prompt.speak),
    ...q.explanation.steps,
    ...spokenSteps(q).flatMap(said),
    ...said(q.explanation.speak),
    ...(q.explanation.hint ? [q.explanation.hint.text, ...said(q.explanation.hint.say)] : []),
    ...pictures.flatMap((visual) => said(visual.speak)),
  ];
}

describe('a clock time is said as a digital clock is read', () => {
  it('never "half past", "quarter past" or "quarter to", in any question, step or hint', () => {
    for (const q of EVERY) for (const line of everyLine(q)) expect(line, `${q.skillId} level ${q.level}`).not.toMatch(/half past|quarter past|quarter to|half-past/i);
  });

  it('"o\'clock" only ever follows the hour it names ("8 o\'clock", "eight o\'clock")', () => {
    const hour = /(\b(\d{1,2}|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)|\bit is|\bon 12 it is|\bmeans) o'clock/i;
    for (const q of EVERY) {
      for (const line of everyLine(q)) {
        for (const at of line.matchAll(/o'clock/gi)) {
          const before = line.slice(0, (at.index ?? 0) + "o'clock".length);
          expect(hour.test(before.slice(-30)), `${q.skillId}: ${line}`).toBe(true);
        }
      }
    }
  });

  it('a time on a half hour is said "eight thirty" wherever it is said', () => {
    const halves = EVERY.filter((q) => q.skillId === 'M-1-C1' && q.level === 2);
    expect(halves.length).toBeGreaterThan(0);
    for (const q of halves) {
      const hour = q.facts.hour as number;
      const words = sayWords(spokenSteps(q)[2] ?? []);
      expect(words).toMatch(/^It is [a-z]+ thirty\.$/);
      expect(q.explanation.steps[2]).toBe(`It is ${hour}:30.`);
    }
    expect(nudgeFor(generateQuestion('M-3-F1', 3, 1))?.text).toBe('Start at the hour the question names. Then move the long hand on, or back, by the minutes.');
  });
});

describe('a story names a person once, then says he or she', () => {
  const NAMES = [...new Set([...STORY_NAMES, ...H1_NAMES, ...H2_NAMES])];
  const pronounOf = (name: string): string | undefined => STORY_PRONOUNS[name] ?? H1_PRONOUNS[name] ?? H2_PRONOUNS[name];
  const count = (text: string, word: string): number => (text.match(new RegExp(`\\b${word}\\b`, 'g')) ?? []).length;
  const MATH = EVERY.filter((q) => q.skillId.startsWith('M-'));

  it('every name has one pronoun, the same in every list', () => {
    for (const name of NAMES) {
      const all = [STORY_PRONOUNS[name], H1_PRONOUNS[name], H2_PRONOUNS[name]].filter((each) => each !== undefined);
      expect(all.length, name).toBeGreaterThan(0);
      expect(new Set(all).size, name).toBe(1);
    }
    for (const name of STORY_NAMES) expect(STORY_PRONOUNS[name], name).toBeDefined();
  });

  it('a story with one person in it says the name once, then that person\'s own "he" or "she"', () => {
    let told = 0;
    for (const q of MATH) {
      const people = NAMES.filter((name) => count(q.prompt.text, name) > 0);
      if (people.length !== 1) continue;
      const [name] = people as [string];
      told += 1;
      expect(count(q.prompt.text, name), `${q.skillId}: ${q.prompt.text}`).toBe(1);
      const other = pronounOf(name) === 'he' ? /\b(she|her|She|Her)\b/ : /\b(he|him|his|He|Him|His)\b/;
      expect(q.prompt.text, `${q.skillId}: ${q.prompt.text}`).not.toMatch(other);
      expect(sayText(q.prompt.speak), q.skillId).not.toMatch(other);
    }
    expect(told).toBeGreaterThan(500);
    expect(generateQuestion('M-3-B3', 3, 1).prompt.text).toMatch(/^Sam says .* Is his answer reasonable\?$/);
  });

  it('a story with two people says a name again only where "he" or "she" could mean either of them', () => {
    const two = MATH.filter((q) => NAMES.filter((name) => count(q.prompt.text, name) > 0).length === 2);
    expect(two.length).toBeGreaterThan(50);
    for (const q of two) {
      // The only name said twice is the one the question asks about, at its end: "How many more does Sam have?"
      const twice = NAMES.filter((name) => count(q.prompt.text, name) === 2);
      expect(twice.length, q.prompt.text).toBeLessThanOrEqual(1);
      for (const name of twice) expect(q.prompt.text.slice(q.prompt.text.lastIndexOf('. ') + 2), q.prompt.text).toContain(name);
    }
  });
});

describe('a count of 1 never takes a plural', () => {
  // "1 rows of 7", "1 clips longer", "It is 1 minutes past the 12", "There are 1 pictures": all gone (Nov 22, 2026).
  // A word after "1" that ends in s is a verb ("1 times 3", "1 goes with 1 bee") or one of these.
  const VERBS = new Set(['is', 'has', 'was', 'does', 'goes', 'comes', 'equals', 'gives', 'tells', 'changes', 'makes', 'means', 'shows', 'stays', 'times', 'plus', 'minus', 'doubles', 'rounds', 'opens', 'lives', 'finishes', 'less']);
  const written = (q: Question): string[] => {
    const typed = (say: Say | null | undefined): string[] => (say ? [sayText(say)] : []);
    const pictures = [q.stimulus, ...options(q), q.explanation.visual].filter((visual): visual is Visual => visual !== undefined);
    return [
      q.prompt.text,
      ...typed(q.prompt.speak),
      ...q.explanation.steps,
      ...(q.explanation.stepsSay ?? []).flatMap(typed),
      ...typed(q.explanation.speak),
      ...(q.explanation.hint ? [q.explanation.hint.text, ...typed(q.explanation.hint.say)] : []),
      ...pictures.flatMap((visual) => [describeVisual(visual), ...typed(visual.speak)]),
    ];
  };

  it('in any question, step, hint or picture description', () => {
    for (const q of EVERY) {
      for (const line of written(q)) {
        for (const match of line.matchAll(/(?<![\d,./:$-])\b1 ([a-z]+s)\b/g)) {
          expect(VERBS.has(match[1] as string), `${q.skillId}: "${line}"`).toBe(true);
        }
      }
    }
  });

  it('the ones the owner found: one row, one clip, one minute, one picture, one dot', () => {
    expect(describeVisual({ kind: 'array', rows: 1, cols: 7, emoji: '🟩' })).toBe('1 row of 7 🟩');
    const minutes = all('M-3-F1', 1, 300).filter((q) => (q.facts.minute as number) === 1);
    expect(minutes.length).toBeGreaterThan(0);
    for (const q of minutes) expect(q.explanation.steps[1]).toBe('The long hand is the minute hand. It is 1 minute past the 12.');
    const split = all('M-3-C9', 1, 300).filter((q) => String(q.facts.expr).startsWith('6 '));
    expect(split.length).toBeGreaterThan(0);
    for (const q of split) expect(q.prompt.text).toMatch(/^Split the 6 rows into 5 rows and 1 row\./);
  });
});

describe('grade 3: every question offers a hint before the worked example', () => {
  // The 19 skills the merge found without a nudge (2-step workings, or a first step that names the answer), and F.6,
  // whose one-picture questions had none: each now gives every question its own hint (the owner's list, Nov 22, 2026).
  const OWN = ['M-3-A3', 'M-3-A4', 'M-3-A5', 'M-3-B6', 'M-3-C2', 'M-3-C3', 'M-3-C8', 'M-3-C10', 'M-3-C11', 'M-3-D2', 'M-3-E5', 'M-3-E6', 'M-3-F2', 'M-3-F5', 'M-3-F6', 'M-3-F7', 'M-3-F9', 'M-3-F10', 'M-3-G1', 'M-3-G2'];
  const GRADE3 = allGenerators().filter((generator) => generator.skillId.startsWith('M-3-'));

  it('every grade 3 question has a nudge', () => {
    for (const generator of GRADE3) {
      for (const level of levelsOf(generator.maxLevel)) {
        for (const q of all(generator.skillId, level, 150)) expect(nudgeFor(q), `${q.skillId} level ${level} seed ${q.seed}`).not.toBeNull();
      }
    }
  });

  it('the twenty skills give every question a hint of its own, never the question said again', () => {
    for (const id of OWN) {
      const generator = GRADE3.find((each) => each.skillId === id);
      expect(generator, id).toBeDefined();
      for (const level of levelsOf(generator?.maxLevel ?? 1)) {
        for (const q of all(id, level, 150)) {
          const hint = q.explanation.hint;
          expect(hint, `${id} level ${level} seed ${q.seed}`).toBeDefined();
          expect(hint?.text, id).not.toBe(q.prompt.text);
          expect(q.prompt.text.includes(hint?.text ?? ''), id).toBe(false);
        }
      }
    }
  });

  it('a times or division hint never says the answer, even when a factor is the answer too', () => {
    expect(nudgeFor(generateQuestion('M-3-C3', 2, 1))?.text).toMatch(/^Count by fives\. Say \d+ numbers\.$/);
    const squares = all('M-3-D2', 1, 300).filter((q) => q.facts.rows === q.facts.cols);
    expect(squares.length).toBeGreaterThan(0);
    for (const q of squares) expect(q.explanation.hint?.text).toMatch(/^Think: which number times itself makes \d+\?$/);
  });
});

describe('grade 2 B.2: -er and -est with real words', () => {
  const B2 = EVERY.filter((q) => q.skillId === 'E-2-B2');
  const cap = (word: string): string => `${word.charAt(0).toUpperCase()}${word.slice(1)}`;

  it('the meanings are the owner\'s: "Taller means more tall. Tallest means the most tall of all of them."', () => {
    for (const entry of SUFFIXED.filter((each) => each.suffix === 'er')) expect(entry.meaning).toBe(`more ${entry.base}`);
    for (const entry of SUFFIXED.filter((each) => each.suffix === 'est')) expect(entry.meaning).toBe(`the most ${entry.base} of all of them`);
    const steps = B2.map((q) => q.explanation.steps[0]);
    expect(steps).toContain('Taller means more tall.');
    expect(steps).toContain('Tallest means the most tall of all of them.');
  });

  it('a real word first, then what its ending adds', () => {
    expect(B2.length).toBeGreaterThan(100);
    for (const q of B2) {
      const entry = SUFFIXED.find((each) => each.word === q.facts.target || each.sentence === q.facts.target);
      expect(entry, String(q.facts.target)).toBeDefined();
      expect(q.explanation.steps[0]).toBe(`${cap(entry?.word ?? '')} means ${entry?.meaning ?? ''}.`);
      expect(q.explanation.steps[1]).toMatch(new RegExp(`^The ending ${entry?.suffix ?? ''} means `));
    }
  });

  it('never "more tall than another", in an option, a step or what is said', () => {
    for (const q of B2) {
      for (const line of [...everyLine(q), ...options(q).map((option) => describeVisual(option))]) expect(line, q.skillId).not.toMatch(/than another/);
    }
  });
});
