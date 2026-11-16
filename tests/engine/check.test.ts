// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { check } from '../../src/engine/check';
import type { Question, QuestionBase, Response, Visual } from '../../src/engine/types';

const base: QuestionBase = {
  skillId: 'T-1',
  level: 1,
  seed: 1,
  key: 'T-1|1|{}',
  facts: { id: 'x' },
  mode: 'look',
  prompt: { text: 'Pick one.', speak: ['Pick one.'] },
  explanation: { speak: ['This one.'], steps: ['This one.'] },
};
const t = (value: string): Visual => ({ kind: 'text', value, size: 'l' });

const choice: Question = { ...base, type: 'choice', options: [t('a'), t('b'), t('c')], answerIndex: 1 };
const multi: Question = { ...base, type: 'multiSelect', options: [t('a'), t('b'), t('c'), t('d')], answerIndexes: [0, 2] };
const tap: Question = { ...base, type: 'tapCount', emoji: '🍎', shown: 6, answer: 3 };
const pad: Question = { ...base, type: 'numberPad', answer: 12, maxDigits: 2 };
const order: Question = { ...base, type: 'order', items: [t('3'), t('1'), t('2')], answerOrder: [1, 2, 0] };
const sort: Question = {
  ...base,
  type: 'sort',
  items: [t('a'), t('b'), t('c')],
  bins: [
    { label: 'One', speak: ['One'] },
    { label: 'Two', speak: ['Two'] },
  ],
  answerBin: [0, 1, 0],
};
const match: Question = {
  ...base,
  type: 'match',
  left: [t('A'), t('B'), t('C')],
  right: [t('c'), t('a'), t('b')],
  answerPairs: [
    [0, 1],
    [1, 2],
    [2, 0],
  ],
};
const tiles: Question = { ...base, type: 'tiles', slots: 3, bank: ['c', 'a', 't', 'x', 'o'], answer: 'cat' };

describe('check', () => {
  it('choice: only the answer index is right', () => {
    expect(check(choice, { index: 1 })).toBe(true);
    expect(check(choice, { index: 0 })).toBe(false);
    expect(check(choice, { index: 2 })).toBe(false);
    expect(check(choice, { index: -1 })).toBe(false);
  });

  it('multiSelect: the set must match, in any order, with nothing extra or missing', () => {
    expect(check(multi, { indexes: [0, 2] })).toBe(true);
    expect(check(multi, { indexes: [2, 0] })).toBe(true);
    expect(check(multi, { indexes: [0] })).toBe(false);
    expect(check(multi, { indexes: [0, 2, 3] })).toBe(false);
    expect(check(multi, { indexes: [0, 0, 2] })).toBe(false);
    expect(check(multi, { indexes: [] })).toBe(false);
  });

  it('tapCount: the count must equal the answer', () => {
    expect(check(tap, { count: 3 })).toBe(true);
    expect(check(tap, { count: 2 })).toBe(false);
    expect(check(tap, { count: 4 })).toBe(false);
  });

  it('numberPad: the value must equal the answer', () => {
    expect(check(pad, { value: 12 })).toBe(true);
    expect(check(pad, { value: 21 })).toBe(false);
    expect(check(pad, { value: 1 })).toBe(false);
  });

  it('order: the whole order must match', () => {
    expect(check(order, { order: [1, 2, 0] })).toBe(true);
    expect(check(order, { order: [1, 0, 2] })).toBe(false);
    expect(check(order, { order: [1, 2] })).toBe(false);
    expect(check(order, { order: [1, 2, 0, 0] })).toBe(false);
  });

  it('sort: every item must be in its bin', () => {
    expect(check(sort, { bins: [0, 1, 0] })).toBe(true);
    expect(check(sort, { bins: [0, 1, 1] })).toBe(false);
    expect(check(sort, { bins: [0, 1] })).toBe(false);
  });

  it('match: the pairs must match, in any order', () => {
    expect(check(match, { pairs: [[0, 1], [1, 2], [2, 0]] })).toBe(true);
    expect(check(match, { pairs: [[2, 0], [0, 1], [1, 2]] })).toBe(true);
    expect(check(match, { pairs: [[0, 0], [1, 2], [2, 1]] })).toBe(false);
    expect(check(match, { pairs: [[0, 1], [1, 2]] })).toBe(false);
    expect(check(match, { pairs: [[0, 1], [0, 1], [1, 2], [2, 0]] })).toBe(false);
  });

  it('tiles: the tiles joined with nothing between them must spell the answer', () => {
    expect(check(tiles, { tiles: ['c', 'a', 't'] })).toBe(true);
    expect(check(tiles, { tiles: ['ca', 't'] })).toBe(true);
    expect(check(tiles, { tiles: ['c', 'o', 't'] })).toBe(false);
    expect(check(tiles, { tiles: ['c', 'a'] })).toBe(false);
    expect(check(tiles, { tiles: [] })).toBe(false);
  });

  it('a response of the wrong shape is wrong for every type, and never throws', () => {
    const questions = [choice, multi, tap, pad, order, sort, match, tiles];
    const responses: Response[] = [
      { index: 1 },
      { indexes: [0, 2] },
      { count: 3 },
      { value: 12 },
      { order: [1, 2, 0] },
      { bins: [0, 1, 0] },
      { pairs: [[0, 1], [1, 2], [2, 0]] },
      { tiles: ['c', 'a', 't'] },
    ];
    questions.forEach((question, q) => {
      responses.forEach((response, r) => {
        expect(check(question, response), `${question.type} with response ${r}`).toBe(q === r);
      });
      // Junk from a broken screen.
      for (const junk of [{}, { index: 'one' }, { indexes: 'all' }, { pairs: [[1]] }, { tiles: [1, 2] }, { order: [1.5] }]) {
        expect(() => check(question, junk as unknown as Response)).not.toThrow();
        expect(check(question, junk as unknown as Response)).toBe(false);
      }
    });
  });
});
