// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { ANALOGY_PAIRS } from '../../src/content/data/analogies';
import { GROUP_WORDS } from '../../src/content/data/categories';
import { COUNTABLES } from '../../src/content/data/countables';
import { CVC_WORDS } from '../../src/content/data/cvc';
import { FIRST_SOUNDS } from '../../src/content/data/firstSounds';
import { CLAP_WORDS, SOUND_SPLITS, VOWEL_SETS } from '../../src/content/data/h3-sounds';
import { ANSWERS, COUNT_SENTENCES, GAP_SENTENCES, REAL_SENTENCES, SEQUENCES, WHO_SENTENCES, filled } from '../../src/content/data/h3-stories';
import { ACTIONS, BODY_PARTS, BODY_USES, FEELING_STORIES, FEELINGS, GO_PAIRS, HELPERS } from '../../src/content/data/h3-words';
import { BLEND_ENDS, BLEND_STARTS, COMPOUNDS, DIGRAPH_ENDS, DIGRAPH_STARTS, SILENT_E_PICTURES, VOWEL_TEAM_WORDS } from '../../src/content/data/phonics1';
import { RHYME_FAMILIES } from '../../src/content/data/rhymes';
import { RIDDLES } from '../../src/content/data/riddles';
import { SENTENCE_PICTURES } from '../../src/content/data/sentencePictures';
import { SYLLABLE_WORDS } from '../../src/content/data/syllables';
import { generateQuestion } from '../../src/content/registry';
import type { Level, Question, Visual } from '../../src/engine/types';
import { earlyWords } from '../oracles/waves/h3-earlyWords';

// The level rules of wave H3: Language Arts pre-K A.6 to D.2 and kindergarten A.3 to E.7 (plan section 15,
// docs/waves/h3.md), the rules of its word lists, and the earlyWords oracle.

const all = (skillId: string, level: Level): Question[] => Array.from({ length: 300 }, (_, i) => generateQuestion(skillId, level, i + 1));
const optionCount = (q: Question): number => (q.type === 'choice' || q.type === 'dragWord' ? q.options.length : 0);
const counts = (skillId: string, level: Level): number[] => [...new Set(all(skillId, level).map(optionCount))].sort();
const relations = (skillId: string, level: Level): unknown[] => [...new Set(all(skillId, level).map((q) => q.facts.relation))].sort();
const textOf = (v: Visual | undefined): string => (v?.kind === 'text' ? v.value : '');
const spoken = (v: Visual): boolean => v.speak !== undefined;

describe('the word lists', () => {
  it('give one picture one name, across the wave lists and the section 9 lists', () => {
    const names = new Map<string, Set<string>>();
    const note = (emoji: string, word: string): void => void names.set(emoji, (names.get(emoji) ?? new Set()).add(word));
    [...FIRST_SOUNDS, ...RHYME_FAMILIES.flat(), ...SYLLABLE_WORDS, ...GROUP_WORDS, ...CVC_WORDS, ...SENTENCE_PICTURES, ...SILENT_E_PICTURES, ...RIDDLES].forEach((e) => note(e.emoji, e.word));
    [...DIGRAPH_STARTS, ...DIGRAPH_ENDS, ...BLEND_STARTS, ...BLEND_ENDS, ...VOWEL_TEAM_WORDS].forEach((e) => note(e.emoji, e.word));
    COMPOUNDS.forEach((e) => note(e.emoji, e.first + e.second));
    COUNTABLES.forEach((e) => note(e.emoji, e.one));
    ANALOGY_PAIRS.forEach((e) => [e.first, e.second].forEach((p) => note(p.emoji, p.word)));
    // The wave's own lists.
    GO_PAIRS.forEach((e) => [e.first, e.second].forEach((p) => note(p.emoji, p.word)));
    HELPERS.forEach((e) => [e.thing, e.helper].forEach((p) => note(p.emoji, p.word)));
    [...BODY_PARTS, ...SOUND_SPLITS, ...CLAP_WORDS, ...ANSWERS].forEach((e) => note(e.emoji, e.word));
    SEQUENCES.forEach((s) => s.steps.forEach((p) => note(p.emoji, p.word)));
    WHO_SENTENCES.forEach((s) => [s.answer, ...s.others].forEach((p) => note(p.emoji, p.word)));
    REAL_SENTENCES.forEach((s) => note(s.subject.emoji, s.subject.word));
    const twoNames = [...names].filter(([, set]) => set.size > 1).map(([emoji, set]) => `${emoji} ${[...set].join('/')}`);
    expect(twoNames).toEqual([]);
    // Faces and actions stand for a feeling or a doing word: no other list names those pictures.
    for (const e of [...FEELINGS.filter((f) => f.word !== 'happy' && f.word !== 'sad'), ...ACTIONS]) expect(names.has(e.emoji), e.emoji).toBe(false);
  });

  it('splits spell their words, and every sound count from 2 to 4 has words', () => {
    for (const e of [...SOUND_SPLITS]) expect(e.sounds.join('')).toBe(e.word);
    for (const e of CLAP_WORDS) expect(e.parts.join('')).toBe(e.word);
    expect([2, 3, 4].map((n) => SOUND_SPLITS.filter((e) => e.sounds.length === n).length).every((n) => n >= 8)).toBe(true);
    expect([2, 3, 4].map((n) => CLAP_WORDS.filter((e) => e.parts.length === n).length)).toEqual([6, 5, 6]);
  });

  it('vowel sets differ only in the middle letter', () => {
    for (const set of VOWEL_SETS) for (const word of set) expect([word.charAt(0), word.charAt(2)]).toEqual([set[0]?.charAt(0), set[0]?.charAt(2)]);
  });

  it('count sentences: eight of each length from 2 to 6 words', () => {
    expect([2, 3, 4, 5, 6].map((n) => COUNT_SENTENCES.filter((s) => s.split(' ').length === n).length)).toEqual([8, 8, 8, 8, 8]);
  });

  it('gap sentences never end on the gap, and never offer their own word as a wrong one', () => {
    for (const gap of GAP_SENTENCES) {
      expect(gap.after.length).toBeGreaterThan(1);
      expect(gap.wrong).not.toContain(gap.answer);
      expect(filled(gap)).toMatch(/[.?!]$/);
    }
  });

  it('real and make-believe: as many of each, for animals and for things', () => {
    for (const thing of [false, true]) {
      const some = REAL_SENTENCES.filter((s) => s.thing === thing);
      expect(some.filter((s) => s.real).length).toBe(some.filter((s) => !s.real).length);
    }
  });

  it('feeling stories and body uses never list their answer as one to keep out', () => {
    for (const s of FEELING_STORIES) expect(s.also).not.toContain(s.feeling);
    for (const u of BODY_USES) expect(u.also).not.toContain(u.part);
  });

  it('sequences have different pictures at every step, and two-character sentences name the other one', () => {
    for (const s of SEQUENCES) expect(new Set(s.steps.map((p) => p.word)).size).toBe(s.steps.length);
    for (const s of WHO_SENTENCES) for (const p of [s.answer, ...s.others]) expect(s.sentence.includes(p.word)).toBe(true);
  });
});

describe('pre-K', () => {
  it('A.6 shows a big letter, then a small one, with 2, then 3 pictures', () => {
    expect([counts('E-PK-A6', 1), counts('E-PK-A6', 2), counts('E-PK-A6', 3)]).toEqual([[2], [3], [3]]);
    for (const q of all('E-PK-A6', 1)) expect(textOf(q.stimulus)).toMatch(/^[A-Z]$/);
    for (const q of all('E-PK-A6', 3)) expect(textOf(q.stimulus)).toMatch(/^[a-z]$/);
  });
  it('A.7 uses short names, then longer ones, and its letters never speak', () => {
    for (const q of all('E-PK-A7', 2)) expect(String(q.facts.target)).toHaveLength(3);
    for (const q of all('E-PK-A7', 3)) {
      expect(String(q.facts.target).length).toBeGreaterThan(3);
      if (q.type === 'choice') expect(q.options.some(spoken)).toBe(false);
    }
  });
  it('B.4 shows the word first, then asks for the odd one out of three', () => {
    expect(relations('E-PK-B4', 1)).toEqual(['notLike']);
    expect(relations('E-PK-B4', 2)).toEqual(['oddSound']);
    for (const q of all('E-PK-B4', 2)) expect(q.stimulus).toBeUndefined();
  });
  it('B.5 asks yes or no about half the time each, then the one that does not rhyme', () => {
    const yes = all('E-PK-B5', 1).filter((q) => q.type === 'choice' && q.answerIndex === 0).length;
    expect(yes).toBeGreaterThan(120);
    expect(yes).toBeLessThan(180);
    expect(relations('E-PK-B5', 2)).toEqual(['oddRhyme']);
  });
  it('B.6 sorts 4 pictures into 2 letters, then 6 into 3, two each', () => {
    for (const [level, n] of [[1, 2], [2, 3]] as [Level, number][]) {
      for (const q of all('E-PK-B6', level)) {
        if (q.type !== 'sort') throw new Error('not a sort');
        expect(q.bins).toHaveLength(n);
        expect(Array.from({ length: n }, (_, b) => q.answerBin.filter((each) => each === b).length)).toEqual(new Array<number>(n).fill(2));
      }
    }
  });
  it('C.3 and C.7 offer 2, then 3 spoken pictures', () => {
    for (const id of ['E-PK-C3', 'E-PK-C7']) expect([counts(id, 1), counts(id, 2)]).toEqual([[2], [3]]);
  });
  it('C.4 to C.6 are heard: no picture speaks, and the screen never shows the word', () => {
    for (const id of ['E-PK-C4', 'E-PK-C5', 'E-PK-C6']) {
      for (const q of all(id, 2)) {
        expect(q.mode).toBe('listen');
        if (q.type === 'choice') expect(q.options.some(spoken)).toBe(false);
      }
    }
    expect(relations('E-PK-C4', 3)).toEqual(['feelingStory']);
    expect(relations('E-PK-C5', 3)).toEqual(['bodyUse']);
  });
  it('D.1 offers 2, then 3 pictures; D.2 asks about one character, then two', () => {
    expect([counts('E-PK-D1', 1), counts('E-PK-D1', 2)]).toEqual([[2], [3]]);
    for (const q of all('E-PK-D2', 2)) expect(WHO_SENTENCES.find((s) => s.sentence === q.facts.story)?.others.length).toBe(1);
  });
});

describe('kindergarten', () => {
  it('A.3 matches words that start differently, then start the same, then differ only in the middle', () => {
    const lefts = (level: Level): string[][] => all('E-K-A3', level).map((q) => q.facts.leftValues as string[]);
    for (const words of lefts(1)) expect(new Set(words.map((w) => w.charAt(0))).size).toBe(3);
    for (const words of lefts(2)) expect(new Set(words.map((w) => w.charAt(0))).size).toBe(1);
    for (const words of lefts(3)) expect(new Set(words.map((w) => w.charAt(0) + w.charAt(2))).size).toBe(1);
  });
  it('A.4 finds the vowel among 2, then 3, then the letter that is not a vowel', () => {
    expect([counts('E-K-A4', 1), counts('E-K-A4', 2), counts('E-K-A4', 3)]).toEqual([[2], [3], [3]]);
    expect([...new Set(all('E-K-A4', 3).map((q) => q.facts.target))]).toEqual(['consonant']);
  });
  it('A.5 sorts 4 cards into 2 groups, then 6 into 3', () => {
    for (const [level, n] of [[1, 4], [2, 6]] as [Level, number][]) for (const q of all('E-K-A5', level)) if (q.type === 'sort') expect(q.items).toHaveLength(n);
  });
  it('B.8 never answers with a rhyme, and level 3 always offers the closest vowel', () => {
    for (const q of all('E-K-B8', 2)) expect(String(q.facts.answer).slice(1)).not.toBe(String(q.facts.target).slice(1));
    expect(counts('E-K-B8', 1)).toEqual([2]);
  });
  it('B.9 never uses words ending in s or x', () => {
    for (const q of all('E-K-B9', 2)) for (const w of q.facts.options as string[]) expect(w).not.toMatch(/[sx]$/);
  });
  it('B.10 asks 3 or 4 with one letter for each sound, then 2, 3 or 4', () => {
    for (const q of all('E-K-B10', 1)) expect(q.facts.options).toEqual([3, 4]);
    for (const q of all('E-K-B10', 2)) expect(q.facts.options).toEqual([2, 3, 4]);
  });
  it('B.11 changes the first, then the last, then the middle letter', () => {
    for (const [level, at] of [[1, 0], [2, 2], [3, 1]] as [Level, number][]) {
      for (const q of all('E-K-B11', level)) {
        const from = String(q.facts.from);
        const to = String(q.facts.target);
        expect([...to].flatMap((l, i) => (l === from.charAt(i) ? [] : [i]))).toEqual([at]);
      }
    }
  });
  it('B.12 compares 1 with more, then 2 with 3, then 3 with 4 claps', () => {
    expect(relations('E-K-B12', 3)).toEqual(['moreClaps']);
    for (const q of all('E-K-B12', 3)) expect(CLAP_WORDS.find((w) => w.word === q.facts.target)?.parts.length).toBe(4);
  });
  it('B.13 asks first or last, then first, middle or last', () => {
    for (const q of all('E-K-B13', 1)) expect(q.facts.options).toEqual(['first', 'last']);
    for (const q of all('E-K-B13', 2)) expect(q.facts.options).toEqual(['first', 'middle', 'last']);
  });
  it('C.4 is read: 2, then 3 words, none of them spoken', () => {
    expect([counts('E-K-C4', 1), counts('E-K-C4', 2)]).toEqual([[2], [3]]);
    for (const q of all('E-K-C4', 2)) if (q.type === 'dragWord') expect(q.options.some(spoken)).toBe(false);
  });
  it('D.4 asks about names, then names in sentences with the word I', () => {
    expect([counts('E-K-D4', 1), counts('E-K-D4', 2), counts('E-K-D4', 3)]).toEqual([[2], [3], [3]]);
    for (const q of all('E-K-D4', 3)) expect(String(q.facts.target)).toMatch(/\bi\b/);
  });
  it('D.5 asks who or where, then who, what or where, then the question a picture answers', () => {
    for (const q of all('E-K-D5', 1)) expect(['who', 'where']).toContain(q.facts.target);
    expect(relations('E-K-D5', 3)).toEqual(['questionFor']);
  });
  it('D.6 counts 2 to 4 words, then 3 to 6', () => {
    const lengths = (level: Level): number[] => [...new Set(all('E-K-D6', level).map((q) => String(q.facts.target).split(' ').length))].sort();
    expect([lengths(1), lengths(2)]).toEqual([[2, 3, 4], [3, 4, 5, 6]]);
  });
  it('D.7, E.6 and E.7 are read: nothing that shows the words speaks', () => {
    for (const id of ['E-K-D7', 'E-K-E6', 'E-K-E7']) {
      for (const q of all(id, 2)) {
        expect(q.mode).toBe('read');
        if (q.type === 'choice') expect(q.options.some(spoken)).toBe(false);
        expect(q.stimulus?.speak).toBeUndefined();
      }
    }
  });
  it('E.4 asks which comes first, then the whole order', () => {
    expect(relations('E-K-E4', 1)).toEqual(['storyFirst']);
    for (const q of all('E-K-E4', 2)) expect(q.type).toBe('order');
  });
  it('E.5 is about animals, then things', () => {
    for (const q of all('E-K-E5', 1)) expect(REAL_SENTENCES.find((s) => s.sentence === q.facts.target)?.thing).toBe(false);
    for (const q of all('E-K-E5', 2)) expect(REAL_SENTENCES.find((s) => s.sentence === q.facts.target)?.thing).toBe(true);
  });
});

describe('the earlyWords oracle', () => {
  it('works answers out from the lists', () => {
    expect(earlyWords({ relation: 'letterPicture', target: 'b', options: ['moon', 'ball'] })).toEqual({ kind: 'index', index: 1 });
    expect(earlyWords({ relation: 'rhymePair', target: 'cat|hat' })).toEqual({ kind: 'value', value: 'Yes' });
    expect(earlyWords({ relation: 'rhymePair', target: 'cat|dog' })).toEqual({ kind: 'value', value: 'No' });
    expect(earlyWords({ relation: 'oddSound', target: 'x', options: ['ball', 'moon', 'bus'] })).toEqual({ kind: 'index', index: 1 });
    expect(earlyWords({ relation: 'soundCount', target: 'fish' })).toEqual({ kind: 'value', value: 3 });
    expect(earlyWords({ relation: 'swapLetter', target: 'hat', from: 'cat' })).toEqual({ kind: 'value', value: 'h' });
    expect(earlyWords({ relation: 'capitalName', target: 'sam and i play.' })).toEqual({ kind: 'value', value: 'Sam and I play.' });
    expect(earlyWords({ relation: 'wordCount', target: 'The dog can jump.' })).toEqual({ kind: 'value', value: 4 });
    expect(earlyWords({ relation: 'letterPlace', target: 'cat', letter: 'a' })).toEqual({ kind: 'value', value: 'middle' });
    expect(earlyWords({ relation: 'storyOrder', target: 'grow', items: ['man', 'baby', 'boy'] })).toEqual({ kind: 'order', order: [1, 2, 0] });
    expect(earlyWords({ relation: 'printKind', target: 'x', items: ['k', 'cat', 'We can run.'], bins: ['letter', 'word', 'sentence'] })).toEqual({ kind: 'bins', bins: [0, 1, 2] });
    expect(earlyWords({ relation: 'moreClaps', target: 'x', options: ['cat', 'watermelon'] })).toEqual({ kind: 'index', index: 1 });
  });

  it('refuses an option that could be argued for, or a question with two answers', () => {
    expect(() => earlyWords({ relation: 'goesWith', target: 'dog', options: ['bone', 'shoe'] })).toThrow();
    expect(() => earlyWords({ relation: 'goesWith', target: 'dog', options: ['bone', 'cheese'] })).toThrow();
    expect(() => earlyWords({ relation: 'feelingStory', target: 'sad', story: 'Mia drops her ice cream on the ground.', options: ['sad', 'angry'] })).toThrow();
    expect(() => earlyWords({ relation: 'bodyUse', target: 'foot', ask: 'Which one do you kick with?', options: ['foot', 'leg'] })).toThrow();
    expect(() => earlyWords({ relation: 'sameEnd', target: 'cat', options: ['nut', 'hat'] })).toThrow();
    expect(() => earlyWords({ relation: 'sameEnd', target: 'cat', options: ['nut', 'bus'] })).toThrow();
    expect(() => earlyWords({ relation: 'swapLetter', target: 'hat', from: 'dog' })).toThrow();
    expect(() => earlyWords({ relation: 'moreClaps', target: 'x', options: ['cat', 'dog'] })).toThrow();
    expect(() => earlyWords({ relation: 'unknown', target: 'x' })).toThrow();
  });
});
