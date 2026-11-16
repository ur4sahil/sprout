// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { GROUP_WORDS } from '../../src/content/data/categories';
import { COUNTABLES } from '../../src/content/data/countables';
import { CLOSEST_VOWEL, CVC_WORDS } from '../../src/content/data/cvc';
import { WORD_FAMILIES } from '../../src/content/data/families';
import { FIRST_SOUNDS } from '../../src/content/data/firstSounds';
import { LOOK_ALIKE_LOWER } from '../../src/content/data/letters';
import { SENTENCE_PICTURES } from '../../src/content/data/sentencePictures';
import { TELLING } from '../../src/content/data/sentences';
import { ALL_SIGHT_WORDS, SIGHT_WORDS, SOUND_ALIKE, soundAlike } from '../../src/content/data/sightWords';
import { generateQuestion } from '../../src/content/registry';
import type { Level, Question, Visual } from '../../src/engine/types';
import { validateQuestion } from '../../src/engine/validate';

// The level rules of Language Arts kindergarten (plan section 8) and its word lists (section 9).

const SEEDS = 300;
const all = (skillId: string, level: Level): Question[] => Array.from({ length: SEEDS }, (_, i) => generateQuestion(skillId, level, i + 1));
const s = (question: Question, name: string): string => question.facts[name] as string;
const opts = (question: Question): string[] => question.facts.options as string[];
const ABC = 'abcdefghijklmnopqrstuvwxyz';
const looksLike = (one: string, two: string): boolean => LOOK_ALIKE_LOWER.some((set) => set.includes(one) && set.includes(two));
const spoken = (visual: Visual | undefined): boolean => visual !== undefined && (visual.speak !== undefined || (visual.kind === 'row' && visual.children.some(spoken)));
const choice = (question: Question): Extract<Question, { type: 'choice' }> => {
  if (question.type !== 'choice') throw new Error('not a choice');
  return question;
};

describe('the word lists', () => {
  it('short-vowel words are three letters with their vowel in the middle, and pot is left out', () => {
    expect(CVC_WORDS).toHaveLength(23);
    for (const entry of CVC_WORDS) expect(entry.word).toMatch(new RegExp(`^[^aeiou]${entry.vowel}[^aeiou]$`));
    expect(CVC_WORDS.some((entry) => entry.word === 'pot')).toBe(false);
    expect(new Set(CVC_WORDS.map((entry) => entry.emoji)).size).toBe(CVC_WORDS.length);
  });

  it('every family word ends in its family ending, and no word sits in two families', () => {
    const words = WORD_FAMILIES.flatMap((family) => family.words);
    expect(new Set(words).size).toBe(words.length);
    for (const family of WORD_FAMILIES) for (const each of family.words) expect(each.endsWith(family.ending)).toBe(true);
    expect(WORD_FAMILIES.map((family) => family.ending)).toEqual(['at', 'an', 'ig', 'op', 'ug', 'et', 'in', 'ot']);
  });

  it('the sight word lists are the four Dolch sets, with no word twice', () => {
    expect([SIGHT_WORDS[1].length, SIGHT_WORDS[2].length, SIGHT_WORDS[3].length, SIGHT_WORDS[4].length]).toEqual([20, 20, 52, 41]);
    expect(new Set(ALL_SIGHT_WORDS).size).toBe(ALL_SIGHT_WORDS.length);
    expect(soundAlike('to', 'two')).toBe(true);
    expect(soundAlike('an', 'on')).toBe(true);
    expect(soundAlike('to', 'to')).toBe(false);
    expect(soundAlike('to', 'me')).toBe(false);
  });

  it('every sentence picture shows a word that is in its sentence', () => {
    expect(SENTENCE_PICTURES).toHaveLength(16);
    for (const entry of SENTENCE_PICTURES) expect(entry.sentence.toLowerCase().split(/[^a-z]+/)).toContain(entry.word);
    expect(new Set(SENTENCE_PICTURES.map((entry) => entry.word)).size).toBe(16);
  });
});

describe('A.1 ABC order and A.2 Uppercase and lowercase', () => {
  it('A.1: next letter to G, then anywhere, then the letter before, in one case at a time', () => {
    for (const level of [1, 2, 3] as Level[]) {
      const cases = new Set<boolean>();
      for (const question of all('E-K-A1', level).map(choice)) {
        const answer = opts(question)[question.answerIndex] as string;
        const row = question.stimulus?.kind === 'sequence' ? question.stimulus.items.map((item) => (item === 'blank' ? '_' : item.kind === 'text' ? item.value : '?')) : [];
        const upper = answer === answer.toUpperCase();
        cases.add(upper);
        // Every letter on screen is in the same case.
        expect([...row.filter((each) => each !== '_'), ...opts(question)].every((each) => (each === each.toUpperCase()) === upper)).toBe(true);
        const filled = row.map((each) => (each === '_' ? answer : each)).join('').toLowerCase();
        expect(ABC).toContain(filled);
        expect(filled).toHaveLength(4);
        expect(row.indexOf('_')).toBe(level === 3 ? 0 : 3);
        if (level === 1) expect('defg').toContain(answer.toLowerCase());
        // No wrong option is already in the row.
        for (const option of opts(question)) if (option !== answer) expect(row).not.toContain(option);
      }
      expect(cases).toEqual(new Set([true, false]));
    }
    expect(new Set(all('E-K-A1', 2).map((question) => opts(question)[choice(question).answerIndex]?.toLowerCase())).size).toBeGreaterThan(20);
  });

  it('A.1 level 4: one letter is given, the next three are built, and the spare tiles are not neighbours', () => {
    for (const question of all('E-K-A1', 4)) {
      if (question.type !== 'tiles') throw new Error('not tiles');
      const start = s(question, 'letter');
      const at = ABC.indexOf(start.toLowerCase());
      expect(question.answer.toLowerCase()).toBe(ABC.slice(at + 1, at + 4));
      expect(question.slots).toBe(3);
      expect(question.bank).toHaveLength(5);
      const spare = question.bank.filter((tile) => !question.answer.includes(tile));
      expect(spare).toHaveLength(2);
      for (const tile of spare) {
        const where = ABC.indexOf(tile.toLowerCase());
        expect(where < at - 1 || where > at + 4).toBe(true);
      }
    }
  });

  it('A.2: four pairs from the whole alphabet, with look-alikes at level 2, and never I beside l', () => {
    const used = new Set<string>();
    for (const level of [1, 2] as Level[]) {
      for (const question of all('E-K-A2', level)) {
        if (question.type !== 'match') throw new Error('not a match');
        const letters = question.facts.leftValues as string[];
        letters.forEach((letter) => used.add(letter));
        expect(new Set(letters).size).toBe(4);
        expect(letters.includes('i') && letters.includes('l')).toBe(false);
        const alike = letters.some((one) => letters.some((two) => one !== two && looksLike(one, two)));
        expect(alike).toBe(level === 2);
        expect(question.facts.rightValues).not.toEqual(letters);
      }
    }
    expect(used.size).toBe(26);
  });
});

describe('B.1 to B.3: the letters of a word', () => {
  it('B.1 and B.2: the word is heard, never shown, and nothing on screen says it', () => {
    for (const [skill, list] of [['E-K-B1', FIRST_SOUNDS], ['E-K-B2', CVC_WORDS]] as const) {
      for (const level of [1, 2] as Level[]) {
        for (const question of all(skill, level).map(choice)) {
          const target = s(question, 'target');
          expect(question.mode).toBe('listen');
          expect(list.some((entry) => entry.word === target)).toBe(true);
          expect(question.prompt.text).not.toContain(target);
          expect(question.prompt.speak).toContainEqual({ word: target });
          expect(spoken(question.stimulus) || question.options.some(spoken)).toBe(false);
          const letter = skill === 'E-K-B1' ? target.charAt(0) : target.slice(-1);
          const options = opts(question);
          expect(options[question.answerIndex]).toBe(letter);
          expect(new Set(options).size).toBe(3);
          const wrong = options.filter((each) => each !== letter);
          // Level 1 never offers a look-alike. Level 2 always offers one.
          expect(wrong.some((each) => looksLike(each, letter))).toBe(level === 2);
          // c, k and s can stand for the same sound, so they are never offered against each other.
          if ('cksqx'.includes(letter)) expect(wrong.some((each) => 'cksqx'.includes(each))).toBe(false);
        }
      }
    }
  });

  it('B.3: a, i or o words with those three vowels, then every vowel with its closest sound offered', () => {
    for (const question of all('E-K-B3', 1).map(choice)) {
      const entry = CVC_WORDS.find((each) => each.word === s(question, 'target'))!;
      expect(['a', 'i', 'o']).toContain(entry.vowel);
      expect(opts(question)).toEqual(['a', 'i', 'o']);
      expect(question.stimulus).toMatchObject({ kind: 'row', children: [{ kind: 'emojiGroup', emoji: entry.emoji }, { kind: 'text', value: `${entry.word[0]}_${entry.word[2]}` }] });
      expect(spoken(question.stimulus)).toBe(false);
    }
    const vowels = new Set<string>();
    for (const question of all('E-K-B3', 2).map(choice)) {
      const entry = CVC_WORDS.find((each) => each.word === s(question, 'target'))!;
      vowels.add(entry.vowel);
      const options = opts(question);
      expect(options).toHaveLength(3);
      expect(options).toContain(CLOSEST_VOWEL[entry.vowel]);
      expect(options).toEqual([...options].sort());
      expect(options[question.answerIndex]).toBe(entry.vowel);
    }
    expect(vowels.size).toBe(5);
  });
});

describe('B.4 to B.7: reading, spelling and rhyming', () => {
  const apart = (one: string, two: string): number => one.split('').filter((letter, i) => letter !== two[i]).length;

  it('B.4: the written word is never spoken, and the pictures get closer at level 3', () => {
    for (const level of [1, 2, 3] as Level[]) {
      let close = 0;
      for (const question of all('E-K-B4', level).map(choice)) {
        const target = s(question, 'target');
        expect(question.mode).toBe('read');
        expect(question.stimulus).toEqual({ kind: 'text', value: target, size: 'xl' });
        expect(question.facts.read).toEqual([target]);
        if (level === 1) expect(target[1]).toBe('a');
        const wrong = opts(question).filter((each) => each !== target);
        expect(wrong).toHaveLength(2);
        if (level < 3) for (const each of wrong) expect(apart(each, target)).toBeGreaterThanOrEqual(2);
        else if (wrong.some((each) => apart(each, target) === 1)) close += 1;
        // Every picture says its own word when tapped.
        expect(question.options.every((option) => option.speak !== undefined)).toBe(true);
      }
      if (level === 3) expect(close).toBe(SEEDS);
    }
  });

  it('B.5: three letter tiles in order, with 2 spare letters, then 4 with the closest vowel among them', () => {
    for (const [level, spare] of [[1, 2], [2, 4]] as [Level, number][]) {
      for (const question of all('E-K-B5', level)) {
        if (question.type !== 'tiles') throw new Error('not tiles');
        const entry = CVC_WORDS.find((each) => each.word === question.answer)!;
        expect(question.mode).toBe('listen');
        expect(question.slots).toBe(3);
        expect(question.bank).toHaveLength(3 + spare);
        expect(new Set(question.bank).size).toBe(question.bank.length);
        const extra = question.bank.filter((tile) => !entry.word.includes(tile));
        expect(extra).toHaveLength(spare);
        expect(extra.includes(CLOSEST_VOWEL[entry.vowel])).toBe(level === 2);
        if (level === 1) expect(extra.some((tile) => 'aeiou'.includes(tile) || entry.word.split('').some((own) => looksLike(own, tile)))).toBe(false);
        expect(spoken(question.stimulus)).toBe(false);
        expect(question.prompt.text).toBe('Spell the word.');
      }
    }
  });

  it('B.6: a word from the same family, then the one of three that is from another family', () => {
    const familyOf = (value: string): string => WORD_FAMILIES.find((family) => family.words.includes(value))!.ending;
    for (const question of all('E-K-B6', 1).map(choice)) {
      const target = s(question, 'target');
      const options = opts(question);
      expect(options).not.toContain(target);
      expect(options.filter((each) => familyOf(each) === familyOf(target))).toEqual([options[question.answerIndex]]);
      expect(new Set(options.map(familyOf)).size).toBe(3);
      expect(question.mode).toBe('read');
      expect(spoken(question.stimulus) || question.options.some(spoken)).toBe(false);
    }
    for (const question of all('E-K-B6', 2).map(choice)) {
      const options = opts(question);
      expect(options).toHaveLength(3);
      const families = options.map(familyOf);
      expect(families.filter((each) => each === s(question, 'target'))).toHaveLength(2);
      expect(families[question.answerIndex]).not.toBe(s(question, 'target'));
    }
  });

  it('B.7: four words in two families with different vowels, then six words in any two families', () => {
    for (const [level, count] of [[1, 4], [2, 6]] as [Level, number][]) {
      let sameVowel = 0;
      for (const question of all('E-K-B7', level)) {
        if (question.type !== 'sort') throw new Error('not a sort');
        const words = question.facts.read as string[];
        const endings = question.facts.binAttrs as string[];
        expect(words).toHaveLength(count);
        expect(question.bins.map((bin) => bin.label)).toEqual(endings.map((each) => `-${each}`));
        // Each word goes in the bin it ends with, and each family gets the same number of words.
        expect(question.answerBin).toEqual(words.map((each) => endings.findIndex((end) => each.endsWith(end))));
        expect(question.answerBin.filter((bin) => bin === 0)).toHaveLength(count / 2);
        expect(question.items.some(spoken)).toBe(false);
        if (endings[0]?.[0] === endings[1]?.[0]) sameVowel += 1;
      }
      if (level === 1) expect(sameVowel).toBe(0);
      else expect(sameVowel).toBeGreaterThan(0);
    }
  });
});

describe('C.1 to C.3 Sight words', () => {
  const first = (value: string): string => value[0]!.toLowerCase();

  it('the word is heard and never shown, and the other words get closer level by level', () => {
    for (const [skill, set] of [['E-K-C1', 1], ['E-K-C2', 2], ['E-K-C3', 3]] as [string, 1 | 2 | 3][]) {
      for (const level of [1, 2, 3] as Level[]) {
        const targets = new Set<string>();
        for (const question of all(skill, level).map(choice)) {
          const target = s(question, 'target');
          targets.add(target);
          expect(SIGHT_WORDS[set]).toContain(target);
          expect(question.mode).toBe('listen');
          expect(question.prompt.text.toLowerCase().split(/[^a-z]+/)).not.toContain(target.toLowerCase());
          expect(question.options.some(spoken)).toBe(false);
          const options = opts(question);
          expect(new Set(options).size).toBe(3);
          const wrong = options.filter((each) => each !== target);
          for (const each of wrong) {
            if (level === 1) expect(first(each) !== first(target) && each.length !== target.length).toBe(true);
            if (level === 2) {
              expect(first(each)).not.toBe(first(target));
              // The same length where the list has two such words, or else the nearest lengths.
              const others = SIGHT_WORDS[set].filter((other) => other !== target && first(other) !== first(target) && !soundAlike(other, target));
              const sameLength = others.filter((other) => other.length === target.length).length;
              if (sameLength >= 2) expect(each.length).toBe(target.length);
              else expect(Math.abs(each.length - target.length)).toBeLessThanOrEqual(2);
            }
            if (level === 3) expect(first(each)).toBe(first(target));
            if (level < 3) expect(SIGHT_WORDS[set]).toContain(each);
          }
          // Words that sound alike never share a question.
          for (const one of options) for (const two of options) expect(soundAlike(one, two)).toBe(false);
        }
        // Every word of the list is asked for at levels 1 and 2.
        if (level < 3) expect(targets.size).toBe(SIGHT_WORDS[set].length);
        else expect(targets.size).toBeGreaterThan(8);
      }
    }
  });

  it('C.3 level 4: the word is built from tiles that can never spell a word sounding the same', () => {
    const targets = new Set<string>();
    for (const question of all('E-K-C3', 4)) {
      if (question.type !== 'tiles') throw new Error('not tiles');
      targets.add(question.answer);
      expect(SIGHT_WORDS[3]).toContain(question.answer);
      expect(question.facts.oracle).toBe('spell');
      expect(question.slots).toBe(question.answer.length);
      expect(question.bank).toHaveLength(question.answer.length + 2);
      expect(question.prompt.text).toBe('Listen. Spell the word.');
      expect(validateQuestion(question, { soundAlikes: SOUND_ALIKE })).toEqual([]);
    }
    expect(targets.size).toBeGreaterThan(40);
  });
});

describe('D.1 to D.3 and E.1', () => {
  it('D.1: the wrong sentences lack the capital, then the period, then either or both', () => {
    for (const level of [1, 2, 3] as Level[]) {
      for (const question of all('E-K-D1', level).map(choice)) {
        const options = opts(question);
        const right = options[question.answerIndex] as string;
        expect(TELLING).toContain(right);
        expect(options).toHaveLength(level === 3 ? 3 : 2);
        for (const each of options.filter((option) => option !== right)) {
          const noCapital = each[0] !== right[0];
          const noPeriod = !each.endsWith('.');
          expect(each.toLowerCase().replace('.', '')).toBe(right.toLowerCase().replace('.', ''));
          if (level === 1) expect([noCapital, noPeriod]).toEqual([true, false]);
          if (level === 2) expect([noCapital, noPeriod]).toEqual([false, true]);
          if (level === 3) expect(noCapital || noPeriod).toBe(true);
        }
      }
    }
    expect(new Set(all('E-K-D1', 1).map((question) => s(question, 'base'))).size).toBe(12);
  });

  it('D.2: four or six pictures with their words, sorted into people, animals and things, every group used', () => {
    for (const [level, count] of [[1, 4], [2, 6]] as [Level, number][]) {
      for (const question of all('E-K-D2', level)) {
        if (question.type !== 'sort') throw new Error('not a sort');
        const words = question.facts.items as string[];
        expect(new Set(words).size).toBe(count);
        expect(question.bins.map((bin) => bin.label)).toEqual(['People', 'Animals', 'Things']);
        expect(question.answerBin).toEqual(words.map((each) => ['people', 'animals', 'things'].indexOf(GROUP_WORDS.find((entry) => entry.word === each)!.group)));
        expect(new Set(question.answerBin).size).toBe(3);
        if (level === 2) expect([0, 1, 2].map((bin) => question.answerBin.filter((each) => each === bin).length)).toEqual([2, 2, 2]);
        // Each card shows the picture and its word, and says the word.
        question.items.forEach((item, i) => expect(item).toMatchObject({ kind: 'row', children: [{ kind: 'emojiGroup' }, { kind: 'text', value: words[i] }], speak: [{ word: words[i] }] }));
      }
    }
  });

  it('D.3: one thing or several beside the two words, then the two words alone, and never fish', () => {
    const things = new Set<string>();
    for (const question of all('E-K-D3', 1).map(choice)) {
      const thing = COUNTABLES.find((each) => each.one === s(question, 'target'))!;
      things.add(thing.one);
      expect(thing.many).toBe(`${thing.one}s`);
      const many = question.facts.many as boolean;
      const count = question.facts.count as number;
      expect(many ? count >= 2 && count <= 4 : count === 1).toBe(true);
      expect(question.stimulus).toEqual({ kind: 'emojiGroup', emoji: thing.emoji, count, layout: 'row' });
      expect([...opts(question)].sort()).toEqual([thing.one, thing.many]);
      expect(opts(question)[question.answerIndex]).toBe(many ? thing.many : thing.one);
    }
    expect(things.has('fish') || things.has('strawberry')).toBe(false);
    expect(things.size).toBe(14);
    for (const question of all('E-K-D3', 2).map(choice)) {
      expect(question.stimulus).toBeUndefined();
      expect(question.mode).toBe('read');
      expect(question.options.some(spoken)).toBe(false);
      expect(question.prompt.text).toBe(question.facts.many ? 'Which word means more than one?' : 'Which word means just one?');
    }
  });

  it('E.1: a sentence to read, with two pictures, then three, from other sentences on the list', () => {
    for (const [level, count] of [[1, 2], [2, 3]] as [Level, number][]) {
      for (const question of all('E-K-E1', level).map(choice)) {
        const entry = SENTENCE_PICTURES.find((each) => each.sentence === s(question, 'target'))!;
        expect(question.mode).toBe('read');
        expect(question.stimulus).toEqual({ kind: 'text', value: entry.sentence, size: 'l' });
        expect(opts(question)).toHaveLength(count);
        expect(opts(question)[question.answerIndex]).toBe(entry.word);
        for (const each of opts(question)) expect(SENTENCE_PICTURES.some((other) => other.word === each)).toBe(true);
        expect(question.explanation.steps).toEqual([`The sentence says ${entry.word}.`]);
      }
    }
    expect(new Set(all('E-K-E1', 2).map((question) => s(question, 'target'))).size).toBe(16);
  });
});
