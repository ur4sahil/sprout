// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { canonicalVisual, questionKey, samePicture } from '../../src/engine/canonical';
import type { Question, Visual } from '../../src/engine/types';
import { validateQuestion } from '../../src/engine/validate';

// The rules the pictures of Nov 22, 2026 add: words printed under a picture or over a graph are words on screen.
// A listen question never shows its target in them (rule 14), and a read question's picture never says the words
// it prints (rule 15). The words are part of the picture, so two pictures with different words are different.

const picture = (emoji: string, caption?: string, speak = false): Visual => ({
  kind: 'emojiGroup',
  emoji,
  count: 1,
  layout: 'row',
  ...(caption ? { caption } : {}),
  ...(speak ? { speak: [caption ?? 'thing'] } : {}),
});

function choice(change: Partial<Extract<Question, { type: 'choice' }>>): Question {
  const question = {
    skillId: 'T-1',
    level: 1,
    seed: 1,
    key: '',
    mode: 'look',
    facts: { target: 'cat', options: ['cat', 'dog'] },
    prompt: { text: 'Which one?', speak: ['Which one?'] },
    explanation: { speak: ['It is the cat.'], steps: ['It is the cat.'] },
    type: 'choice',
    options: [picture('🐱'), picture('🐶')],
    answerIndex: 0,
    ...change,
  } as Question;
  return { ...question, key: questionKey(question.skillId, question.level, question.facts) };
}

const rules = (question: Question): string[] => [...new Set(validateQuestion(question).map((problem) => problem.split(':')[0] ?? ''))].sort();

describe('words printed in a picture', () => {
  it('14: a listen question never shows its target under a picture or over a graph', () => {
    const listen = (change: Partial<Extract<Question, { type: 'choice' }>>): Question => choice({ mode: 'listen', prompt: { text: 'Listen. Tap the picture.', speak: ['Listen. Tap the', { word: 'cat' }] }, ...change });
    expect(rules(listen({}))).toEqual([]);
    expect(rules(listen({ options: [picture('🐱', 'a cat'), picture('🐶', 'a dog')] }))).toContain('14');
    expect(rules(listen({ options: [picture('🐱', 'pet'), picture('🐶', 'pet too')] }))).toEqual([]);
    // "cat" inside another word is not the target shown.
    expect(rules(listen({ options: [picture('🐱', 'catch it'), picture('🐶', 'run')] }))).toEqual([]);
    const graph: Visual = { kind: 'graph', type: 'picture', title: 'Cat or dog?', categories: [{ label: 'pets', emoji: '🐱', value: 2 }] };
    expect(rules(listen({ stimulus: graph }))).toContain('14');
    expect(rules(listen({ stimulus: { ...graph, title: 'Our pets' } }))).toEqual([]);
    // Inside a row it still counts.
    expect(rules(listen({ stimulus: { kind: 'row', children: [picture('🐟', 'cat food')] } }))).toContain('14');
  });

  it('15: a read question never lets a picture say the words printed under it', () => {
    const read = (change: Partial<Extract<Question, { type: 'choice' }>>): Question =>
      choice({ mode: 'read', facts: { target: 'cat', read: ['cat'], options: ['cat', 'dog'] }, prompt: { text: 'Which picture matches the word?', speak: ['Which picture matches the word?'] }, stimulus: { kind: 'text', value: 'cat', size: 'l' }, ...change });
    expect(rules(read({}))).toEqual([]);
    // Printed and silent is fine: the child reads it.
    expect(rules(read({ options: [picture('🐱', 'cat'), picture('🐶', 'dog')] }))).toEqual([]);
    // Printed and said on a tap reads the words for the child.
    expect(rules(read({ options: [picture('🐱', 'cat', true), picture('🐶', 'dog', true)] }))).toContain('15');
    expect(rules(read({ options: [picture('🐱', 'a cat nap', true), picture('🐶', 'dog', false)] }))).toContain('15');
    expect(rules(read({ options: [picture('🐱', 'pet', true), picture('🐶', 'dog')] }))).toEqual([]);
  });

  it('two pictures with different words under them are different pictures; the same words, the same picture', () => {
    expect(samePicture(picture('🛏️', 'go to bed'), picture('🛏️', 'get up'))).toBe(false);
    expect(samePicture(picture('🛏️', 'go to bed', true), picture('🛏️', 'go to bed'))).toBe(true);
    expect(canonicalVisual(picture('🥞', 'eat breakfast'))).toMatchObject({ caption: 'eat breakfast' });
    // Two choices that differ only in their words are allowed; the same words twice are not.
    expect(rules(choice({ options: [picture('🛏️', 'go to bed'), picture('🛏️', 'get up')] }))).toEqual([]);
    expect(rules(choice({ options: [picture('🛏️', 'go to bed'), picture('🛏️', 'go to bed')] }))).toContain('3');
  });

  it('a graph title and a ruler unit are part of the picture too', () => {
    const graph = (title?: string): Visual => ({ kind: 'graph', type: 'bar', categories: [{ label: 'cats', emoji: '🐱', value: 2 }], ...(title ? { title } : {}) });
    expect(samePicture(graph('Our pets'), graph())).toBe(false);
    expect(samePicture({ kind: 'ruler', object: 'pencil', startUnit: 0, lengthUnits: 3, unit: 'cm' }, { kind: 'ruler', object: 'pencil', startUnit: 0, lengthUnits: 3, unit: 'in' })).toBe(false);
  });
});
