// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { ORACLE_FACTS } from '../../src/engine/types';
import type { Question, QuestionBase, Visual } from '../../src/engine/types';
import { add } from './add';
import { attribute } from './attribute';
import { compare } from './compare';
import { count } from './count';
import { ORACLES } from './index';
import { judge } from './judge';
import { matchEqual } from './matchEqual';
import { missing } from './missing';
import { oddOne } from './oddOne';
import { order } from './order';
import { pattern } from './pattern';
import { sequence } from './sequence';
import { shapeFacts } from './shapeFacts';
import { sortBy } from './sortBy';
import { subtract } from './subtract';

describe('count', () => {
  it('is n', () => {
    expect(count({ n: 4 })).toEqual({ kind: 'value', value: 4 });
    expect(count({ n: 0 })).toEqual({ kind: 'value', value: 0 });
  });
  it('refuses a count that is missing, negative or not whole', () => {
    expect(() => count({})).toThrow();
    expect(() => count({ n: -1 })).toThrow();
    expect(() => count({ n: 2.5 })).toThrow();
    expect(() => count({ n: '3' })).toThrow();
  });
});

describe('add', () => {
  it('adds two or three addends', () => {
    expect(add({ a: 3, b: 4 })).toEqual({ kind: 'value', value: 7 });
    expect(add({ a: 3, b: 4, c: 5 })).toEqual({ kind: 'value', value: 12 });
    expect(add({ a: 0, b: 0 })).toEqual({ kind: 'value', value: 0 });
    expect(add({ a: 48, b: 37 })).toEqual({ kind: 'value', value: 85 });
  });
  it('refuses a missing addend', () => {
    expect(() => add({ a: 3 })).toThrow();
    expect(() => add({ a: 3, b: 'four' })).toThrow();
  });
});

describe('subtract', () => {
  it('takes b from a', () => {
    expect(subtract({ a: 9, b: 4 })).toEqual({ kind: 'value', value: 5 });
    expect(subtract({ a: 4, b: 4 })).toEqual({ kind: 'value', value: 0 });
  });
  it('is not the other way round, and never goes below zero', () => {
    expect(subtract({ a: 9, b: 4 })).not.toEqual(subtract({ a: 9, b: 5 }));
    expect(() => subtract({ a: 4, b: 9 })).toThrow();
  });
});

describe('missing', () => {
  it('finds whichever of the three is blank', () => {
    expect(missing({ a: 3, b: 4, total: 7, blank: 'a' })).toEqual({ kind: 'value', value: 3 });
    expect(missing({ a: 3, b: 4, total: 7, blank: 'b' })).toEqual({ kind: 'value', value: 4 });
    expect(missing({ a: 3, b: 4, total: 7, blank: 'total' })).toEqual({ kind: 'value', value: 7 });
  });
  it('works it out from the other two, not from the hidden value', () => {
    // The hidden value is written wrongly on purpose. The oracle must not copy it.
    expect(missing({ a: 99, b: 4, total: 7, blank: 'a' })).toEqual({ kind: 'value', value: 3 });
    expect(missing({ a: 3, b: 99, total: 7, blank: 'b' })).toEqual({ kind: 'value', value: 4 });
    expect(missing({ a: 3, b: 4, total: 99, blank: 'total' })).toEqual({ kind: 'value', value: 7 });
  });
  it('refuses an unknown blank', () => {
    expect(() => missing({ a: 3, b: 4, total: 7, blank: 'c' })).toThrow();
  });
});

describe('compare', () => {
  it('finds the most and the least', () => {
    expect(compare({ values: [3, 7, 5], ask: 'most' })).toEqual({ kind: 'index', index: 1 });
    expect(compare({ values: [3, 7, 5], ask: 'least' })).toEqual({ kind: 'index', index: 0 });
  });
  it('refuses a tie for most or least', () => {
    expect(() => compare({ values: [7, 7, 5], ask: 'most' })).toThrow();
    expect(() => compare({ values: [3, 3, 5], ask: 'least' })).toThrow();
  });
  it('says whether groups are equal', () => {
    expect(compare({ values: [4, 4], ask: 'equal' })).toEqual({ kind: 'value', value: true });
    expect(compare({ values: [4, 5], ask: 'equal' })).toEqual({ kind: 'value', value: false });
    expect(compare({ values: [4, 4, 5], ask: 'equal' })).toEqual({ kind: 'value', value: false });
  });
  it('gives the sign between two values', () => {
    expect(compare({ values: [8, 3], ask: 'sign' })).toEqual({ kind: 'value', value: '>' });
    expect(compare({ values: [3, 8], ask: 'sign' })).toEqual({ kind: 'value', value: '<' });
    expect(compare({ values: [8, 8], ask: 'sign' })).toEqual({ kind: 'value', value: '=' });
    expect(() => compare({ values: [1, 2, 3], ask: 'sign' })).toThrow();
  });
  it('refuses an unknown ask', () => {
    expect(() => compare({ values: [1, 2], ask: 'biggest' })).toThrow();
  });
});

describe('order', () => {
  it('gives the positions smallest first', () => {
    expect(order({ values: [5, 2, 9] })).toEqual({ kind: 'order', order: [1, 0, 2] });
    expect(order({ values: [1, 2, 3] })).toEqual({ kind: 'order', order: [0, 1, 2] });
    expect(order({ values: [20, 3, 11, 7] })).toEqual({ kind: 'order', order: [1, 3, 2, 0] });
  });
  it('sorts as numbers, not as text', () => {
    expect(order({ values: [10, 9, 100] })).toEqual({ kind: 'order', order: [1, 0, 2] });
  });
  it('refuses a tie', () => {
    expect(() => order({ values: [2, 2, 3] })).toThrow();
  });
});

describe('sequence', () => {
  it('finds the value at the blank, counting up or down', () => {
    expect(sequence({ start: 4, step: 1, length: 5, blankIndex: 2 })).toEqual({ kind: 'value', value: 6 });
    expect(sequence({ start: 10, step: 10, length: 5, blankIndex: 4 })).toEqual({ kind: 'value', value: 50 });
    expect(sequence({ start: 9, step: -1, length: 4, blankIndex: 3 })).toEqual({ kind: 'value', value: 6 });
    expect(sequence({ start: 7, step: 2, length: 4, blankIndex: 0 })).toEqual({ kind: 'value', value: 7 });
  });
  it('refuses a blank outside the row and a step of zero', () => {
    expect(() => sequence({ start: 4, step: 1, length: 5, blankIndex: 5 })).toThrow();
    expect(() => sequence({ start: 4, step: 1, length: 5, blankIndex: -1 })).toThrow();
    expect(() => sequence({ start: 4, step: 0, length: 5, blankIndex: 1 })).toThrow();
  });
});

describe('pattern', () => {
  it('gives the next item of a repeating unit', () => {
    expect(pattern({ unit: ['red', 'blue'], shown: 4 })).toEqual({ kind: 'value', value: 'red' });
    expect(pattern({ unit: ['red', 'blue'], shown: 5 })).toEqual({ kind: 'value', value: 'blue' });
    expect(pattern({ unit: ['a', 'a', 'b'], shown: 5 })).toEqual({ kind: 'value', value: 'b' });
    expect(pattern({ unit: ['a', 'b', 'c'], shown: 7 })).toEqual({ kind: 'value', value: 'b' });
  });
  it('refuses a unit with one kind of item', () => {
    expect(() => pattern({ unit: ['a', 'a'], shown: 2 })).toThrow();
    expect(() => pattern({ unit: [], shown: 2 })).toThrow();
  });
});

describe('attribute', () => {
  it('finds the one option with the target attribute', () => {
    expect(attribute({ target: 'circle', optionAttrs: ['square', 'circle', 'triangle'] })).toEqual({ kind: 'index', index: 1 });
    expect(attribute({ target: 7, optionAttrs: [7, 1, 4] })).toEqual({ kind: 'index', index: 0 });
  });
  it('refuses none or more than one', () => {
    expect(() => attribute({ target: 'star', optionAttrs: ['square', 'circle'] })).toThrow();
    expect(() => attribute({ target: 'circle', optionAttrs: ['circle', 'circle', 'square'] })).toThrow();
    expect(() => attribute({ optionAttrs: ['circle'] })).toThrow();
  });
  it('does not treat the number 1 and the text "1" as the same', () => {
    expect(() => attribute({ target: 1, optionAttrs: ['1', '2'] })).toThrow();
  });
});

describe('oddOne', () => {
  it('finds the one that differs when the others match', () => {
    expect(oddOne({ optionAttrs: ['dog', 'dog', 'cat'] })).toEqual({ kind: 'index', index: 2 });
    expect(oddOne({ optionAttrs: ['big', 'small', 'small', 'small'] })).toEqual({ kind: 'index', index: 0 });
  });
  it('refuses when nothing or more than one thing differs', () => {
    expect(() => oddOne({ optionAttrs: ['dog', 'dog', 'dog'] })).toThrow();
    expect(() => oddOne({ optionAttrs: ['dog', 'cat', 'cow'] })).toThrow();
    expect(() => oddOne({ optionAttrs: ['dog', 'cat'] })).toThrow();
    expect(() => oddOne({ optionAttrs: ['dog', 'dog', 'cat', 'cat'] })).toThrow();
  });
});

describe('sortBy', () => {
  it('puts each item in the bin with its attribute', () => {
    expect(sortBy({ itemAttrs: ['red', 'blue', 'red'], binAttrs: ['red', 'blue'] })).toEqual({ kind: 'bins', bins: [0, 1, 0] });
    expect(sortBy({ itemAttrs: ['b', 'a'], binAttrs: ['a', 'b'] })).toEqual({ kind: 'bins', bins: [1, 0] });
  });
  it('refuses an item that fits no bin or two bins', () => {
    expect(() => sortBy({ itemAttrs: ['green'], binAttrs: ['red', 'blue'] })).toThrow();
    expect(() => sortBy({ itemAttrs: ['red'], binAttrs: ['red', 'red'] })).toThrow();
  });
});

describe('matchEqual', () => {
  it('pairs each left item with its equal on the right', () => {
    expect(matchEqual({ leftValues: [2, 5, 3], rightValues: [3, 2, 5] })).toEqual({
      kind: 'pairs',
      pairs: [
        [0, 1],
        [1, 2],
        [2, 0],
      ],
    });
  });
  it('refuses an item with no partner, two partners, or sides of different sizes', () => {
    expect(() => matchEqual({ leftValues: [2, 5], rightValues: [2, 6] })).toThrow();
    expect(() => matchEqual({ leftValues: [2, 5], rightValues: [2, 2] })).toThrow();
    expect(() => matchEqual({ leftValues: [2, 2], rightValues: [2, 5] })).toThrow();
    expect(() => matchEqual({ leftValues: [2], rightValues: [2, 5] })).toThrow();
  });
});

describe('the oracle list', () => {
  it('has all twelve Phase 1 oracles and the ones content phases added, each naming facts the engine knows about', () => {
    const written = Object.keys(ORACLES).sort();
    expect(written).toEqual(
      ['add', 'attribute', 'compare', 'count', 'matchEqual', 'missing', 'oddOne', 'order', 'pattern', 'sequence', 'shapeFacts', 'sortBy', 'subtract'],
    );
    for (const name of written) expect(ORACLE_FACTS).toHaveProperty(name);
  });
});

describe('judge', () => {
  const base: QuestionBase = {
    skillId: 'T-1',
    level: 1,
    seed: 1,
    key: 'k',
    facts: { a: 3, b: 4, options: [6, 7, 8] },
    mode: 'look',
    prompt: { text: 'x', speak: ['x'] },
    explanation: { speak: ['x'], steps: ['x'] },
  };
  const t = (value: string): Visual => ({ kind: 'text', value, size: 'l' });
  const choice = (answerIndex: number, options = [6, 7, 8]): Question => ({
    ...base,
    facts: { a: 3, b: 4, options },
    type: 'choice',
    options: options.map((value) => t(String(value))),
    answerIndex,
  });

  it('agrees when the marked option is the right value', () => {
    expect(judge(choice(1), { kind: 'value', value: 7 })).toEqual([]);
  });
  it('catches a wrongly marked option', () => {
    expect(judge(choice(0), { kind: 'value', value: 7 })).not.toEqual([]);
  });
  it('catches a wrong option that is also right', () => {
    expect(judge(choice(1, [7, 7, 8]), { kind: 'value', value: 7 })).not.toEqual([]);
  });
  it('catches a question with no right option', () => {
    expect(judge(choice(1, [5, 6, 8]), { kind: 'value', value: 7 })).not.toEqual([]);
  });
  it('catches an option list that does not match the options', () => {
    expect(judge({ ...choice(1), facts: { a: 3, b: 4, options: [6, 7] } }, { kind: 'value', value: 7 })).not.toEqual([]);
  });
  it('checks typed answers', () => {
    const pad: Question = { ...base, facts: { a: 3, b: 4 }, type: 'numberPad', answer: 7, maxDigits: 2 };
    expect(judge(pad, { kind: 'value', value: 7 })).toEqual([]);
    expect(judge({ ...pad, answer: 8 }, { kind: 'value', value: 7 })).not.toEqual([]);
  });
  it('checks an index, an order, bins and pairs', () => {
    expect(judge(choice(2), { kind: 'index', index: 2 })).toEqual([]);
    expect(judge(choice(2), { kind: 'index', index: 1 })).not.toEqual([]);
    const order: Question = { ...base, type: 'order', items: [t('3'), t('1')], answerOrder: [1, 0] };
    expect(judge(order, { kind: 'order', order: [1, 0] })).toEqual([]);
    expect(judge(order, { kind: 'order', order: [0, 1] })).not.toEqual([]);
    const sort: Question = { ...base, type: 'sort', items: [t('a'), t('b')], bins: [{ label: 'A', speak: ['A'] }, { label: 'B', speak: ['B'] }], answerBin: [0, 1] };
    expect(judge(sort, { kind: 'bins', bins: [0, 1] })).toEqual([]);
    expect(judge(sort, { kind: 'bins', bins: [1, 0] })).not.toEqual([]);
    const match: Question = { ...base, type: 'match', left: [t('a'), t('b')], right: [t('b'), t('a')], answerPairs: [[1, 0], [0, 1]] };
    expect(judge(match, { kind: 'pairs', pairs: [[0, 1], [1, 0]] })).toEqual([]);
    expect(judge(match, { kind: 'pairs', pairs: [[0, 0], [1, 1]] })).not.toEqual([]);
  });
  it('reports an answer whose shape does not fit the question', () => {
    expect(judge(choice(1), { kind: 'order', order: [0, 1, 2] })).not.toEqual([]);
    const pad: Question = { ...base, facts: { a: 3, b: 4 }, type: 'numberPad', answer: 7, maxDigits: 2 };
    expect(judge(pad, { kind: 'index', index: 0 })).not.toEqual([]);
  });
});

describe('shapeFacts', () => {
  it('knows the sides and corners of flat shapes', () => {
    expect(shapeFacts({ shape: 'triangle', ask: 'sides' })).toEqual({ kind: 'value', value: 3 });
    expect(shapeFacts({ shape: 'square', ask: 'corners' })).toEqual({ kind: 'value', value: 4 });
    expect(shapeFacts({ shape: 'rectangle', ask: 'sides' })).toEqual({ kind: 'value', value: 4 });
    expect(shapeFacts({ shape: 'hexagon', ask: 'corners' })).toEqual({ kind: 'value', value: 6 });
    expect(shapeFacts({ shape: 'pentagon', ask: 'sides' })).toEqual({ kind: 'value', value: 5 });
    expect(shapeFacts({ shape: 'circle', ask: 'sides' })).toEqual({ kind: 'value', value: 0 });
    expect(shapeFacts({ shape: 'oval', ask: 'corners' })).toEqual({ kind: 'value', value: 0 });
  });
  it('tells a solid from a flat shape, and gives a shape its name', () => {
    expect(shapeFacts({ shape: 'cube', ask: 'solid' })).toEqual({ kind: 'value', value: true });
    expect(shapeFacts({ shape: 'cylinder', ask: 'solid' })).toEqual({ kind: 'value', value: true });
    expect(shapeFacts({ shape: 'circle', ask: 'solid' })).toEqual({ kind: 'value', value: false });
    expect(shapeFacts({ shape: 'cone', ask: 'name' })).toEqual({ kind: 'value', value: 'cone' });
  });
  it('tells an open outline from a closed one', () => {
    expect(shapeFacts({ shape: 'square', ask: 'closed' })).toEqual({ kind: 'value', value: true });
    expect(shapeFacts({ shape: 'square', ask: 'closed', open: true })).toEqual({ kind: 'value', value: false });
  });
  it('refuses what it does not know', () => {
    expect(() => shapeFacts({ shape: 'blob', ask: 'sides' })).toThrow();
    expect(() => shapeFacts({ shape: 'cube', ask: 'sides' })).toThrow();
    expect(() => shapeFacts({ shape: 'sphere', ask: 'closed' })).toThrow();
    expect(() => shapeFacts({ shape: 'star', ask: 'sides' })).toThrow(); // points, not plain sides: never asked
    expect(() => shapeFacts({ shape: 'square', ask: 'colour' })).toThrow();
    expect(() => shapeFacts({ shape: 'square' })).toThrow();
  });
});
