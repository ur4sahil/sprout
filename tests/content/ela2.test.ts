// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { STORIES_2 } from '../../src/content/banks/reading2';
import { generateQuestion } from '../../src/content/registry';
import type { Level, Question } from '../../src/engine/types';

// The level rules of Language Arts grade 2 (plan section 8).
const all = (skillId: string, level: Level): Question[] => Array.from({ length: 300 }, (_, i) => generateQuestion(skillId, level, i + 1));
const relations = (questions: Question[]): unknown[] => [...new Set(questions.map((q) => q.facts.relation))].sort();
const choiceTexts = (q: Question): string[] => (q.type === 'choice' ? q.options.map((o) => (o.kind === 'text' ? o.value : '')) : []);

describe('A. Phonics', () => {
  it('A.1 reads team words, then spells the team, then igh and ie', () => {
    for (const q of all('E-2-A1', 1)) expect(q.mode).toBe('read');
    for (const q of all('E-2-A1', 3)) expect(choiceTexts(q).filter((t) => t === 'igh' || t === 'ie')).toHaveLength(2);
  });
  it('A.2 asks ar or or, then er, ir or ur, then mixed', () => {
    for (const q of all('E-2-A2', 1)) expect(choiceTexts(q)).toEqual(['ar', 'or']);
    for (const q of all('E-2-A2', 2)) expect(choiceTexts(q)).toEqual(['er', 'ir', 'ur']);
  });
  it('A.3 counts parts, then splits, then finds the two-part word', () => {
    expect(relations(all('E-2-A3', 1))).toEqual(['parts2']);
    for (const q of all('E-2-A3', 2)) expect(choiceTexts(q).every((t) => t.includes('-'))).toBe(true);
    expect(relations(all('E-2-A3', 3))).toEqual(['twoParts']);
  });
});

describe('B. Words', () => {
  it('B.1 asks un meanings, then re words, then both', () => {
    for (const q of all('E-2-B1', 1)) expect(String(q.facts.target).startsWith('un')).toBe(true);
    expect(relations(all('E-2-B1', 2))).toEqual(['prefixWord']);
    expect(relations(all('E-2-B1', 3))).toEqual(['prefixMeaning', 'prefixWord']);
  });
  it('B.2, B.3 and B.4 move from the word to its use', () => {
    expect(relations(all('E-2-B2', 2))).toEqual(['suffixSentence']);
    expect(relations(all('E-2-B3', 2))).toEqual(['contractionLong']);
    expect(relations(all('E-2-B4', 1))).toEqual(['synonym']);
    expect(relations(all('E-2-B4', 2))).toEqual(['antonym']);
    expect(relations(all('E-2-B4', 3))).toEqual(['antonym', 'synonym']);
  });
  it('B.5 homophones never speak the words, which sound alike', () => {
    for (const level of [1, 2, 3] as Level[]) for (const q of all('E-2-B5', level)) if (q.type === 'choice') expect(q.options.every((o) => o.speak === undefined)).toBe(true);
    for (const q of all('E-2-B5', 1)) expect(choiceTexts(q)).toEqual(['to', 'two', 'too']);
  });
});

describe('C. Grammar', () => {
  it('C.1 sorts 3 words, then 6, one or two of each kind', () => {
    for (const [level, n] of [[1, 3], [2, 6]] as [Level, number][]) {
      for (const q of all('E-2-C1', level)) {
        if (q.type !== 'sort') throw new Error('not a sort');
        expect(q.items).toHaveLength(n);
        expect([0, 1, 2].map((bin) => q.answerBin.filter((b) => b === bin).length)).toEqual([n / 3, n / 3, n / 3]);
      }
    }
  });
  it('C.2 to C.4 follow their levels', () => {
    for (const q of all('E-2-C2', 2)) expect(String(q.facts.target).endsWith('y')).toBe(true);
    expect(relations(all('E-2-C3', 3))).toEqual(['pastSentence']);
    for (const q of all('E-2-C4', 2)) expect(choiceTexts(q).some((t) => t.includes(','))).toBe(true);
  });
});

describe('D. Reading', () => {
  it('every story is five sentences, with three answers and four events', () => {
    for (const story of STORIES_2) {
      expect(story.text.split(/(?<=[.!?])\s+/)).toHaveLength(5);
      expect(new Set(story.who.answers).size).toBe(3);
      expect(story.events).toHaveLength(4);
    }
  });
  it('the story is to be read: it never speaks, and order asks 3 events then 4', () => {
    for (const q of all('E-2-D1', 1)) expect([q.mode, q.stimulus?.speak]).toEqual(['read', undefined]);
    for (const [level, n] of [[1, 3], [2, 4]] as [Level, number][]) for (const q of all('E-2-D3', level)) if (q.type === 'order') expect(q.items).toHaveLength(n);
  });
});
