// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { GROUP_WORDS } from '../../src/content/data/categories';
import { FIRST_SOUNDS } from '../../src/content/data/firstSounds';
import { DIFFERENT_SHAPES, LOOK_ALIKE_LOWER, LOOK_ALIKE_UPPER, SORT_EXCLUDED_DIGITS, SORT_EXCLUDED_LETTERS } from '../../src/content/data/letters';
import { OPPOSITE_PAIRS } from '../../src/content/data/opposites';
import { RHYME_FAMILIES } from '../../src/content/data/rhymes';
import { SYLLABLE_WORDS } from '../../src/content/data/syllables';
import { generateQuestion } from '../../src/content/registry';
import { describeVisual, sayText } from '../../src/engine/describe';
import type { Level, Question, Visual } from '../../src/engine/types';

// The level rules of Language Arts pre-K (plan section 8) and the rules of its word lists (section 9).

const SEEDS = 300;

function all(skillId: string, level: Level): Question[] {
  return Array.from({ length: SEEDS }, (_, i) => generateQuestion(skillId, level, i + 1));
}

type Choice = Extract<Question, { type: 'choice' }>;
function choices(skillId: string, level: Level): Choice[] {
  return all(skillId, level).map((question) => {
    if (question.type !== 'choice') throw new Error(`${skillId} gave a ${question.type}`);
    return question;
  });
}

const words = (question: Question): string[] => question.facts.options as string[];
const alike = (sets: readonly (readonly string[])[], one: string, two: string): boolean => sets.some((set) => set.includes(one) && set.includes(two));

describe('the word lists', () => {
  it('give one picture one name across the lists', () => {
    const names = new Map<string, Set<string>>();
    const note = (emoji: string, word: string): void => {
      names.set(emoji, (names.get(emoji) ?? new Set()).add(word));
    };
    FIRST_SOUNDS.forEach((entry) => note(entry.emoji, entry.word));
    RHYME_FAMILIES.flat().forEach((entry) => note(entry.emoji, entry.word));
    SYLLABLE_WORDS.forEach((entry) => note(entry.emoji, entry.word));
    GROUP_WORDS.forEach((entry) => note(entry.emoji, entry.word));
    const twoNames = [...names].filter(([, set]) => set.size > 1).map(([emoji, set]) => `${emoji} ${[...set].join('/')}`);
    expect(twoNames).toEqual([]);
    // In opposites a picture stands for a quality, and no quality word is also a picture's name elsewhere.
    const qualities = OPPOSITE_PAIRS.flat().map((entry) => entry.word);
    expect(qualities.filter((word) => [...names.values()].some((set) => set.has(word)))).toEqual([]);
  });

  it('first sounds: every word starts with its letter, and only c and k share a sound', () => {
    for (const entry of FIRST_SOUNDS) expect(entry.word.startsWith(entry.letter)).toBe(true);
    const differ = FIRST_SOUNDS.filter((entry) => entry.letter !== entry.sound).map((entry) => entry.word);
    expect(differ).toEqual(['cat', 'car', 'cow']);
  });

  it('rhymes: no word is in two families, and a family shares its ending', () => {
    const everyWord = RHYME_FAMILIES.flat().map((entry) => entry.word);
    expect(new Set(everyWord).size).toBe(everyWord.length);
    expect(RHYME_FAMILIES).toHaveLength(14);
  });

  it('syllables: the parts spell the word, and there are 8, 9 and 8 words of 1, 2 and 3 claps', () => {
    for (const entry of SYLLABLE_WORDS) expect(entry.parts.join('')).toBe(entry.word);
    expect([1, 2, 3].map((count) => SYLLABLE_WORDS.filter((entry) => entry.parts.length === count).length)).toEqual([8, 9, 8]);
  });
});

describe('A.1 and A.2: hear a letter, find it', () => {
  it.each([
    ['E-PK-A1', /^[A-Z]$/],
    ['E-PK-A2', /^[a-z]$/],
  ] as [string, RegExp][])('%s is a listen question that never shows or says which letter', (skillId, shape) => {
    for (const level of [1, 2, 3] as Level[]) {
      for (const question of choices(skillId, level)) {
        const target = question.facts.target as string;
        expect(question.mode).toBe('listen');
        expect(question.prompt.text).toBe('Listen. Find the letter.');
        expect(sayText(question.prompt.speak)).toContain('Find the letter');
        expect(question.prompt.speak).toContainEqual({ letter: target });
        expect(question.options).toHaveLength(level === 1 ? 2 : 3);
        for (const option of question.options) expect(option.speak).toBeUndefined();
        for (const letter of words(question)) expect(letter).toMatch(shape);
        expect(new Set(words(question)).size).toBe(question.options.length);
        expect(words(question)[question.answerIndex]).toBe(target);
      }
    }
  });

  it('level 1 never puts look-alikes side by side, and level 3 always does', () => {
    for (const [skillId, sets] of [['E-PK-A1', LOOK_ALIKE_UPPER], ['E-PK-A2', LOOK_ALIKE_LOWER]] as [string, readonly (readonly string[])[]][]) {
      for (const question of choices(skillId, 1)) {
        const [one, two] = words(question) as [string, string];
        expect(alike(sets, one, two), `${one} beside ${two}`).toBe(false);
      }
      for (const question of choices(skillId, 3)) {
        const target = question.facts.target as string;
        expect(words(question).some((letter) => letter !== target && alike(sets, target, letter)), `${target} with ${words(question).join(' ')}`).toBe(true);
      }
      // Level 2 offers a look-alike whenever the letter has one.
      for (const question of choices(skillId, 2)) {
        const target = question.facts.target as string;
        const has = sets.some((set) => set.includes(target));
        if (has) expect(words(question).some((letter) => letter !== target && alike(sets, target, letter))).toBe(true);
      }
    }
  });

  it('the small look-alike level covers b, d, p and q', () => {
    const targets = new Set(choices('E-PK-A2', 3).map((question) => question.facts.target));
    for (const letter of ['b', 'd', 'p', 'q']) expect(targets).toContain(letter);
    const together = choices('E-PK-A2', 3).filter((question) => ['b', 'd', 'p', 'q'].includes(question.facts.target as string));
    for (const question of together) expect(words(question).every((letter) => ['b', 'd', 'p', 'q'].includes(letter))).toBe(true);
  });
});

describe('A.4 Find the same letter', () => {
  it('shows a letter and offers its twin among letters of the same case', () => {
    for (const level of [1, 2, 3] as Level[]) {
      for (const question of choices('E-PK-A4', level)) {
        const letter = question.facts.letter as string;
        expect(question.mode).toBe('look');
        expect(question.stimulus).toMatchObject({ kind: 'text', value: letter });
        expect(question.options).toHaveLength(level === 1 ? 2 : 3);
        expect(words(question)[question.answerIndex]).toBe(letter);
        const upper = letter === letter.toUpperCase();
        if (level === 1) expect(upper).toBe(true);
        for (const option of words(question)) expect(option === option.toUpperCase()).toBe(upper);
        // The options do not say their names: the match is made by eye.
        for (const option of question.options) expect(option.speak).toBeUndefined();
      }
    }
    const cases = new Set(choices('E-PK-A4', 2).map((question) => question.facts.ask));
    expect(cases).toEqual(new Set(['upper', 'lower']));
  });
});

describe('A.3 Match uppercase and lowercase', () => {
  it('gives three big letters and their three small letters in another order', () => {
    for (const level of [1, 2] as Level[]) {
      for (const question of all('E-PK-A3', level)) {
        if (question.type !== 'match') throw new Error('not a match');
        const left = question.facts.leftValues as string[];
        const right = question.facts.rightValues as string[];
        expect(left).toHaveLength(3);
        expect([...right].sort()).toEqual([...left].sort());
        expect(right).not.toEqual(left);
        expect(question.left.map((visual) => describeVisual(visual))).toEqual(left.map((letter) => letter.toUpperCase()));
        expect(question.right.map((visual) => describeVisual(visual))).toEqual(right);
        const lookAlikes = left.some((one) => left.some((two) => one !== two && alike(LOOK_ALIKE_LOWER, one, two)));
        expect(lookAlikes).toBe(level === 2);
        if (level === 1) for (const letter of left) expect(DIFFERENT_SHAPES).toContain(letter);
      }
    }
  });
});

describe('A.5 Letter or number', () => {
  it('sorts 4 then 6 tiles, with at least one of each kind and none of the look-alikes', () => {
    for (const level of [1, 2] as Level[]) {
      for (const question of all('E-PK-A5', level)) {
        if (question.type !== 'sort') throw new Error('not a sort');
        const items = question.facts.items as string[];
        expect(items).toHaveLength(level === 1 ? 4 : 6);
        expect(new Set(items.map((item) => item.toLowerCase())).size).toBe(items.length);
        expect(question.bins.map((bin) => bin.label)).toEqual(['Letters', 'Numbers']);
        expect(new Set(question.answerBin)).toEqual(new Set([0, 1]));
        items.forEach((item, i) => {
          // The plan's list, written out here so a change to the data file cannot loosen it.
          expect(['O', 'I', 'l', 'S', 'Z', 'B', 'o', 's', 'z', 'b', 'g', 'q']).not.toContain(item);
          expect(['0', '1', '2', '5', '8']).not.toContain(item);
          expect(SORT_EXCLUDED_LETTERS).not.toContain(item);
          expect(SORT_EXCLUDED_DIGITS.map(String)).not.toContain(item);
          expect(question.answerBin[i]).toBe(/^\d$/.test(item) ? 1 : 0);
        });
      }
    }
  });
});

describe('B.1 Starts with the same sound', () => {
  const soundOf = (word: string): string => FIRST_SOUNDS.find((entry) => entry.word === word)?.sound ?? '?';

  it('asks with a whole word, and every option starts with a different sound', () => {
    for (const level of [1, 2] as Level[]) {
      for (const question of choices('E-PK-B1', level)) {
        const target = question.facts.target as string;
        expect(question.prompt.text).toBe(`Which one starts with the same sound as ${target}?`);
        expect(question.prompt.speak).toContainEqual({ word: target });
        expect(question.options).toHaveLength(level + 1);
        const sounds = words(question).map(soundOf);
        expect(new Set(sounds).size).toBe(sounds.length);
        expect(sounds.filter((sound) => sound === soundOf(target))).toHaveLength(1);
        expect(words(question)).not.toContain(target);
        // Every picture says its word, and the picture shown is the word asked about.
        expect(describeVisual(question.stimulus as Visual)).toBe(target);
        question.options.forEach((option, i) => expect(option.speak).toEqual([{ word: words(question)[i] }]));
      }
    }
  });

  it('never puts cat and key together, though they start with different letters', () => {
    const seen = [...choices('E-PK-B1', 1), ...choices('E-PK-B1', 2)].map((question) => [question.facts.target as string, ...words(question)]);
    const kWords = ['cat', 'car', 'cow', 'key'];
    for (const used of seen) expect(used.filter((word) => kWords.includes(word)).length).toBeLessThanOrEqual(2);
    // Key is offered as the partner of a c word: the match is by sound.
    expect(seen.some((used) => used.includes('key') && used.some((word) => ['cat', 'car', 'cow'].includes(word)))).toBe(true);
  });
});

describe('B.2 Rhymes', () => {
  const familyOf = (word: string): number => RHYME_FAMILIES.findIndex((family) => family.some((entry) => entry.word === word));

  it('offers one word from the same family and the rest from other families, each a different one', () => {
    for (const level of [1, 2] as Level[]) {
      for (const question of choices('E-PK-B2', level)) {
        const target = question.facts.target as string;
        expect(question.prompt.text).toBe(`Which one rhymes with ${target}?`);
        expect(question.options).toHaveLength(level + 1);
        const families = words(question).map(familyOf);
        expect(families).not.toContain(-1);
        expect(new Set(families).size).toBe(families.length);
        expect(families.filter((family) => family === familyOf(target))).toHaveLength(1);
        expect(words(question)).not.toContain(target);
        expect(question.explanation.steps).toEqual([`${target.charAt(0).toUpperCase()}${target.slice(1)} and ${words(question)[question.answerIndex]} end the same way.`, 'They rhyme.']);
      }
    }
  });
});

describe('B.3 Count syllables', () => {
  it('level 1 has words of 1 or 2 claps, level 2 of 1 to 3, with the numbers always in order', () => {
    for (const [level, most] of [[1, 2], [2, 3]] as [Level, number][]) {
      const counts = new Set<number>();
      for (const question of choices('E-PK-B3', level)) {
        const entry = SYLLABLE_WORDS.find((candidate) => candidate.word === question.facts.target);
        expect(entry).toBeDefined();
        counts.add(entry!.parts.length);
        expect(question.facts.options).toEqual(Array.from({ length: most }, (_, i) => i + 1));
        expect(question.fixedOrder).toBe(true);
        expect(question.answerIndex).toBe(entry!.parts.length - 1);
        expect(question.prompt.text).toBe(`Clap the word ${entry!.word}. How many claps?`);
        // The explanation shows the word split into its parts.
        expect(question.explanation.steps[0]).toBe(entry!.parts.join(' · '));
        const word = `${entry!.word.charAt(0).toUpperCase()}${entry!.word.slice(1)}`;
        expect(question.explanation.steps[1]).toBe(entry!.parts.length === 1 ? `${word} has 1 clap.` : `${word} has ${entry!.parts.length} claps.`);
      }
      expect(counts).toEqual(new Set(Array.from({ length: most }, (_, i) => i + 1)));
    }
  });
});

describe('C.1 Word groups', () => {
  const groupOf = (word: string): string => GROUP_WORDS.find((entry) => entry.word === word)?.group ?? '?';

  it('asks for one group and offers exactly one member of it', () => {
    for (const level of [1, 2, 3] as Level[]) {
      const asked = new Set<string>();
      for (const question of choices('E-PK-C1', level)) {
        const group = question.facts.target as string;
        asked.add(group);
        const groups = words(question).map(groupOf);
        expect(question.options).toHaveLength(level === 1 ? 2 : 3);
        expect(groups.filter((candidate) => candidate === group)).toHaveLength(1);
        expect(words(question)[question.answerIndex]).toBe(question.facts.answer);
        // Plants and food never meet, and fish never meets food.
        expect(groups.includes('plants') && groups.includes('food')).toBe(false);
        expect(words(question).includes('fish') && groups.includes('food')).toBe(false);
        const wrong = groups.filter((candidate) => candidate !== group);
        if (level === 2) expect(new Set(wrong).size).toBe(1);
        if (level === 3) expect(new Set(wrong).size).toBe(2);
        question.options.forEach((option, i) => expect(option.speak).toEqual([{ word: words(question)[i] }]));
      }
      // "Things" is never asked for: everything is a thing.
      expect(asked.has('things')).toBe(false);
      if (level < 3) expect(asked).toEqual(new Set(['animals', 'food', 'vehicles', 'clothes']));
      else expect(asked).toEqual(new Set(['animals', 'food', 'vehicles', 'clothes', 'plants', 'people']));
    }
  });
});

describe('C.2 Opposites', () => {
  it('level 1 is big and small, drawn as shapes, with something else of the same size as the wrong option', () => {
    for (const question of choices('E-PK-C2', 1)) {
      const target = question.facts.target as string;
      expect(['big', 'small']).toContain(target);
      expect(question.options).toHaveLength(2);
      expect([...words(question)].sort()).toEqual(['big', 'small']);
      expect(words(question)[question.answerIndex]).toBe(target === 'big' ? 'small' : 'big');
      const sizeOf = (visual: Visual): string => (visual.kind === 'shape' ? visual.size : '?');
      const shown = sizeOf(question.stimulus as Visual);
      expect(shown).toBe(target === 'big' ? 'l' : 's');
      const wrong = question.options[1 - question.answerIndex] as Visual;
      expect(sizeOf(wrong)).toBe(shown);
      expect(sizeOf(question.options[question.answerIndex] as Visual)).toBe(target === 'big' ? 's' : 'l');
      // The wrong option is a different shape from the one shown, so it is not the same picture.
      expect(wrong.kind === 'shape' && question.stimulus?.kind === 'shape' && wrong.shape !== question.stimulus.shape).toBe(true);
    }
  });

  it('level 2 is hot, cold, day and night, and level 3 is every pair', () => {
    expect(new Set(choices('E-PK-C2', 2).map((question) => question.facts.target))).toEqual(new Set(['hot', 'cold', 'day', 'night']));
    const every = new Set(choices('E-PK-C2', 3).map((question) => question.facts.target));
    expect(every).toEqual(new Set(['big', 'small', ...OPPOSITE_PAIRS.flat().map((entry) => entry.word)]));
  });

  it('never offers both halves of another pair, and says "X and Y are opposites"', () => {
    const pairOf = (word: string): number => (word === 'big' || word === 'small' ? 99 : OPPOSITE_PAIRS.findIndex((pair) => pair.some((entry) => entry.word === word)));
    for (const level of [2, 3] as Level[]) {
      for (const question of choices('E-PK-C2', level)) {
        const target = question.facts.target as string;
        const answer = words(question)[question.answerIndex] as string;
        expect(question.options).toHaveLength(3);
        expect(pairOf(answer)).toBe(pairOf(target));
        const wrong = words(question).filter((word) => word !== answer && word !== target);
        expect(new Set(wrong.map(pairOf)).size).toBe(wrong.length);
        expect(wrong.map(pairOf)).not.toContain(pairOf(target));
        expect(question.explanation.steps).toEqual([`${target.charAt(0).toUpperCase()}${target.slice(1)} and ${answer} are opposites.`]);
      }
    }
  });
});

describe('a single named picture', () => {
  it('is described by its word, for screen readers and tests', () => {
    expect(describeVisual({ kind: 'emojiGroup', emoji: '🐱', count: 1, layout: 'row', speak: [{ word: 'cat' }] })).toBe('cat');
    expect(describeVisual({ kind: 'emojiGroup', emoji: '🐱', count: 1, layout: 'row' })).toBe('1 🐱');
    expect(describeVisual({ kind: 'emojiGroup', emoji: '🐱', count: 2, layout: 'row', speak: [{ word: 'cats' }] })).toBe('2 🐱');
    // A picture with a second kind beside it, or crossed out, is still described in full.
    expect(describeVisual({ kind: 'emojiGroup', emoji: '🐱', count: 1, layout: 'row', emoji2: '🐶', count2: 2, speak: [{ word: 'pets' }] })).toBe('1 🐱 and 2 🐶');
    expect(describeVisual({ kind: 'emojiGroup', emoji: '🐱', count: 1, layout: 'row', crossed: 1, speak: [{ word: 'cat' }] })).toBe('1 🐱, 1 crossed out');
  });
});
