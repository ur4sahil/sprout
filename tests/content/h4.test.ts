// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { ACTIONS, BE_HAVE, COMMON_NOUNS, COMPLETE, DAYS, FRAGMENTS, HOW_GAPS, HOW_SENTENCES, JOINING, MONTHS, PROPER_NOUNS, QUESTIONS, SUBJECTS_MORE, SUBJECTS_ONE } from '../../src/content/data/h4-grammar';
import { C_HARD, C_SOFT, END_PART_READ, END_PART_WORDS, G_HARD, G_SOFT, NOT_SILENT, PLAIN_VERBS, SIGHT_5, SILENT_PICTURES, SILENT_WORDS, SOUND_TEAM_WORDS, Y_AS_E, Y_AS_I } from '../../src/content/data/h4-phonics';
import { FEELING_TEXTS, POEMS, PURPOSE_TEXTS, STORY_PAIRS, TOLD_BY_ME, TOLD_BY_OTHER } from '../../src/content/data/h4-reading';
import { ABC_GROUPS_2, ABC_WORDS_1, SHADES, TWO_MEANINGS, WORD_GROUPS } from '../../src/content/data/h4-words';
import { ALL_SIGHT_WORDS, SOUND_ALIKE } from '../../src/content/data/sightWords';
import { CATALOGUE } from '../../src/content/catalogue';
import { LADDERS } from '../../src/content/ladders';
import { generateQuestion } from '../../src/content/registry';
import { ROWS } from '../../src/content/waves/h4/catalogue';
import type { Level, Question, Visual } from '../../src/engine/types';

// The level rules of wave H4 (plan section 15, Language Arts grades 1 and 2: docs/waves/h4.md) and its lists.

const all = (skillId: string, level: Level): Question[] => Array.from({ length: 300 }, (_, i) => generateQuestion(skillId, level, i + 1));
const relations = (questions: Question[]): unknown[] => [...new Set(questions.map((q) => q.facts.relation))].sort();
const texts = (q: Question): string[] => (q.type === 'choice' ? q.options.map((o) => (o.kind === 'text' ? o.value : '')) : []);
const spoken = (visual: Visual | undefined): boolean => visual !== undefined && (visual.speak !== undefined || (visual.kind === 'row' && visual.children.some(spoken)));
const types = (questions: Question[]): string[] => [...new Set(questions.map((q) => q.type))].sort();

describe('the wave', () => {
  it('adds 15 grade 1 and 15 grade 2 Language Arts skills, each on a ladder of its subject', () => {
    expect(ROWS.filter((row) => row.grade === '1')).toHaveLength(15);
    expect(ROWS.filter((row) => row.grade === '2')).toHaveLength(15);
    for (const row of ROWS) {
      expect(CATALOGUE.filter((each) => each.id === row.id)).toHaveLength(1);
      const ladder = LADDERS.find((each) => each.id === row.ladder);
      expect(ladder?.subject, row.id).toBe('ela');
      expect(ladder?.skillIds, row.id).toContain(row.id);
    }
  });
  it('keeps every category numbered without a gap', () => {
    for (const grade of ['1', '2']) {
      for (const letter of ['A', 'B', 'C', 'D']) {
        const numbers = CATALOGUE.filter((row) => row.subject === 'ela' && row.grade === grade && row.code.startsWith(`${letter}.`)).map((row) => Number(row.code.slice(2))).sort((a, b) => a - b);
        expect(numbers, `${grade} ${letter}`).toEqual(numbers.map((_, i) => i + 1));
      }
    }
  });
});

describe('the lists', () => {
  it('phonics: parts sit in their words, and the y, c and g words follow their rules', () => {
    for (const entry of [...END_PART_WORDS, ...END_PART_READ]) expect(entry.word.endsWith(entry.part), entry.word).toBe(true);
    for (const entry of SOUND_TEAM_WORDS) expect(entry.word.split(entry.part), entry.word).toHaveLength(2);
    for (const word of Y_AS_I) expect(/[aeiou]/.test(word.slice(0, -1)), word).toBe(false);
    for (const word of Y_AS_E) expect(/[aeiou]/.test(word.slice(0, -1)), word).toBe(true);
    for (const word of [...C_SOFT, ...C_HARD]) expect(word.split('c').length - 1 + word.split('g').length - 1, word).toBe(1);
    for (const word of [...G_SOFT, ...G_HARD]) expect(word.split('g').length - 1 + word.split('c').length - 1, word).toBe(1);
    for (const entry of SILENT_WORDS) expect(entry.heard.every((letter) => entry.word.includes(letter) && letter !== entry.silent), entry.word).toBe(true);
    for (const entry of SILENT_PICTURES) expect(/^(kn|wr)|mb$/.test(entry.word), entry.word).toBe(true);
    for (const word of NOT_SILENT) expect(/^(kn|wr)|mb$/.test(word)).toBe(false);
  });
  it('sight words set 5 are new and never sound like another word', () => {
    expect(SIGHT_5.filter((word) => ALL_SIGHT_WORDS.includes(word))).toEqual([]);
    expect(SIGHT_5.filter((word) => SOUND_ALIKE.some((group) => group.includes(word)))).toEqual([]);
  });
  it('words: ABC lists start with different letters, groups share one first letter but never a second', () => {
    expect(new Set(ABC_WORDS_1.map((word) => word[0])).size).toBe(ABC_WORDS_1.length);
    for (const group of ABC_GROUPS_2) {
      expect(new Set(group.map((word) => word[0])).size).toBe(1);
      expect(new Set(group.map((word) => word[1])).size).toBe(group.length);
    }
    const grouped = WORD_GROUPS.flatMap((group) => group.words);
    expect(new Set(grouped).size).toBe(grouped.length);
    expect(new Set(SHADES.flat()).size).toBe(SHADES.length * 3);
    for (const entry of TWO_MEANINGS) for (const sentence of entry.sentences) expect(sentence.toLowerCase().split(/[^a-z]+/), entry.word).toContain(entry.word);
  });
  it('grammar: the one-or-more subjects, question answers and joining words are what the rules expect', () => {
    for (const subject of SUBJECTS_MORE) expect(/s$| and |^(We|They)$/.test(subject), subject).toBe(true);
    for (const subject of SUBJECTS_ONE) expect(/s$/.test(subject), subject).toBe(false);
    for (const [one, more] of [...ACTIONS, ...BE_HAVE]) expect(one).not.toBe(more);
    for (const entry of QUESTIONS) expect(entry.question.startsWith('___')).toBe(true);
    for (const entry of JOINING) expect(entry.sentence).toContain('___');
    for (const word of PROPER_NOUNS) expect(/^[A-Z]/.test(word)).toBe(true);
    for (const word of COMMON_NOUNS) expect(/^[a-z]/.test(word)).toBe(true);
    for (const entry of HOW_SENTENCES) {
      expect(entry.adverb.endsWith('ly')).toBe(true);
      for (const word of [entry.adjective, entry.noun, entry.verb]) expect(word.endsWith('ly'), word).toBe(false);
      expect(entry.sentence.split(/[^A-Za-z]+/)).toEqual(expect.arrayContaining([entry.adjective, entry.noun, entry.verb, entry.adverb]));
    }
    for (const entry of HOW_GAPS) expect(entry.adverb.endsWith('ly') && !entry.adjective.endsWith('ly')).toBe(true);
    expect(new Set([...COMPLETE, ...FRAGMENTS]).size).toBe(COMPLETE.length + FRAGMENTS.length);
    expect(DAYS).toHaveLength(7);
    expect(MONTHS).toHaveLength(12);
  });
  it('reading: tellers say I or never do, clues are in their texts, poems repeat their first line', () => {
    for (const entry of TOLD_BY_ME) expect(/\b(I|my)\b/.test(entry.text), entry.id).toBe(true);
    for (const entry of TOLD_BY_OTHER) expect(/\b(I|me|my)\b/i.test(entry.text), entry.id).toBe(false);
    for (const entry of FEELING_TEXTS) expect(entry.text).toContain(entry.clue);
    for (const poem of POEMS) {
      expect(poem.lines[3].replace(/[,.]$/, '').toLowerCase()).toBe(poem.lines[0].replace(/[,.]$/, '').toLowerCase());
      const words = poem.lines.join(' ').toLowerCase().split(/[^a-z']+/);
      for (const word of [...poem.rhyme, ...poem.others]) expect(words, poem.id).toContain(word);
    }
    for (const pair of STORY_PAIRS) expect(new Set([...pair.same, ...pair.differ]).size).toBe(6);
    for (const purpose of ['To tell a story', 'To teach facts', 'To get you to do something', 'To tell how to do something']) expect(PURPOSE_TEXTS.filter((each) => each.purpose === purpose)).toHaveLength(3);
  });
});

describe('grade 1', () => {
  it('A.6 finds the ending, then fits a sentence, then finds the root; nothing to read is spoken', () => {
    expect(relations(all('E-1-A6', 1))).toEqual(['ending']);
    expect(relations(all('E-1-A6', 2))).toEqual(['endingSentence']);
    expect(relations(all('E-1-A6', 3))).toEqual(['root']);
    for (const q of all('E-1-A6', 2)) if (q.type === 'choice') expect(q.options.some(spoken)).toBe(false);
    for (const q of all('E-1-A6', 3)) expect(PLAIN_VERBS).toContain(String(q.facts.target).replace(/(s|ed|ing)$/, ''));
  });
  it('A.7 is heard: ck or ng, then ck, ng or nk, in fixed places; level 3 is read', () => {
    for (const q of all('E-1-A7', 1)) expect([q.mode, texts(q)]).toEqual(['listen', ['ck', 'ng']]);
    for (const q of all('E-1-A7', 2)) expect(texts(q)).toEqual(['ck', 'ng', 'nk']);
    for (const q of all('E-1-A7', 3)) expect(q.mode).toBe('read');
  });
  it('A.8 sorts 4 words, then 6, then picks from 3, all read', () => {
    for (const [level, n] of [[1, 4], [2, 6]] as [Level, number][]) for (const q of all('E-1-A8', level)) expect(q.type === 'sort' ? q.items.length : 0).toBe(n);
    for (const level of [1, 2, 3] as Level[]) for (const q of all('E-1-A8', level)) expect(q.mode).toBe('read');
  });
  it('B.4 is heard with 3 words, then 4; the words never speak', () => {
    for (const [level, n] of [[1, 3], [2, 4]] as [Level, number][]) for (const q of all('E-1-B4', level)) {
      expect(q.mode).toBe('listen');
      expect(texts(q)).toHaveLength(n);
    }
  });
  it('B.5 picks the first word, then orders 3, then 4', () => {
    expect(types(all('E-1-B5', 1))).toEqual(['choice']);
    for (const [level, n] of [[2, 3], [3, 4]] as [Level, number][]) for (const q of all('E-1-B5', level)) expect(q.type === 'order' ? q.items.length : 0).toBe(n);
  });
  it('B.6 and C.4 to C.9 follow their levels', () => {
    expect([1, 2, 3].map((level) => relations(all('E-1-B6', level as Level)))).toEqual([['groupFits'], ['oddWord'], ['groupName']]);
    for (const q of all('E-1-C4', 1)) expect(texts(q).every((t) => t === t.toLowerCase())).toBe(true);
    for (const q of all('E-1-C4', 3)) expect(texts(q)).toHaveLength(4);
    for (const q of all('E-1-C5', 2)) for (const t of texts(q)) expect(['is', 'are', 'has', 'have', 'was', 'were']).toContain(t);
    for (const q of all('E-1-C6', 1)) expect(DAYS.some((day) => String(q.facts.target).includes(day))).toBe(true);
    for (const q of all('E-1-C6', 2)) expect(MONTHS.some((month) => String(q.facts.target).includes(month))).toBe(true);
    expect(types(all('E-1-C7', 2))).toEqual(['sort']);
    for (const q of all('E-1-C8', 1)) expect(texts(q).sort()).toEqual(['What', 'Where', 'Who']);
    for (const q of all('E-1-C9', 1)) expect(texts(q)).toEqual(['and', 'but']);
    for (const q of all('E-1-C9', 2)) expect(texts(q)).toEqual(['and', 'but', 'or']);
  });
  it('D.6 to D.8 are read: the text and the answers never speak', () => {
    for (const id of ['E-1-D6', 'E-1-D7', 'E-1-D8']) for (const level of [1, 2] as Level[]) for (const q of all(id, level)) {
      expect(q.mode).toBe('read');
      expect(spoken(q.stimulus)).toBe(false);
      expect(texts(q).length).toBeGreaterThan(1);
      if (q.type === 'choice') expect(q.options.some(spoken)).toBe(false);
    }
  });
});

describe('grade 2', () => {
  it('A.4 is heard: oi or oy, then ou or ow, then all four', () => {
    for (const [level, shown] of [[1, ['oi', 'oy']], [2, ['ou', 'ow']], [3, ['oi', 'oy', 'ou', 'ow']]] as [Level, string[]][]) for (const q of all('E-2-A4', level)) expect([q.mode, texts(q)]).toEqual(['listen', shown]);
  });
  it('A.5 sorts c words, then g words, then 6 of both, read', () => {
    for (const [level, letter] of [[1, 'c'], [2, 'g']] as [Level, string][]) for (const q of all('E-2-A5', level)) {
      expect(q.type === 'sort' && q.items.every((item) => item.kind === 'text' && item.value.includes(letter))).toBe(true);
    }
    for (const q of all('E-2-A5', 3)) expect([q.mode, q.type === 'sort' ? q.items.length : 0]).toEqual(['read', 6]);
  });
  it('A.6 asks the silent letter, then the spelling of a picture, then which word has one', () => {
    expect([1, 2, 3].map((level) => relations(all('E-2-A6', level as Level)))).toEqual([['silentLetter'], ['silentSpelling'], ['hasSilent']]);
  });
  it('B.6 to B.9 follow their levels', () => {
    expect([1, 2, 3].map((level) => types(all('E-2-B6', level as Level)))).toEqual([['choice'], ['choice'], ['order']]);
    for (const q of all('E-2-B7', 1)) expect(texts(q)).toHaveLength(2);
    for (const q of all('E-2-B7', 2)) expect(texts(q)).toHaveLength(3);
    for (const level of [1, 2, 3] as Level[]) for (const q of all('E-2-B8', level)) {
      const words = q.type === 'order' ? q.items.map((item) => (item.kind === 'text' ? item.value : '')) : texts(q);
      expect(new Set(words.map((word) => word[0])).size).toBe(1);
    }
    for (const q of all('E-2-B9', 2)) {
      const [a, b] = String(q.facts.target).split(' ') as [string, string];
      expect(a[0]).toBe(b[0]);
    }
    for (const q of all('E-2-B9', 3)) expect(texts(q)).toHaveLength(4);
  });
  it('C.5 to C.8 follow their levels', () => {
    expect(relations(all('E-2-C5', 2))).toEqual(['collectiveThings']);
    for (const q of all('E-2-C6', 1)) expect(texts(q).sort()).toEqual(['herself', 'himself', 'myself']);
    expect(relations(all('E-2-C7', 2))).toEqual(['adverbGap']);
    for (const q of all('E-2-C7', 3)) expect(texts(q)).toHaveLength(4);
    for (const q of all('E-2-C8', 1)) expect([q.mode, texts(q)]).toEqual(['read', ['Yes', 'No']]);
    for (const q of all('E-2-C8', 3)) expect(texts(q)).toHaveLength(4);
  });
  it('D.7 has 3 choices, then 4; D.8 to D.10 are read and never speak', () => {
    for (const q of all('E-2-D7', 3)) expect(texts(q)).toHaveLength(4);
    for (const id of ['E-2-D8', 'E-2-D9', 'E-2-D10']) for (const level of [1, 2] as Level[]) for (const q of all(id, level)) {
      expect(q.mode).toBe('read');
      expect(spoken(q.stimulus)).toBe(false);
    }
    for (const q of all('E-2-D10', 1)) expect(texts(q)).toHaveLength(3);
    for (const q of all('E-2-D10', 2)) expect(texts(q)).toHaveLength(4);
  });
});
