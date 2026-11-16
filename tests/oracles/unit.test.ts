// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { ORACLE_FACTS } from '../../src/engine/types';
import type { Question, QuestionBase, Visual } from '../../src/engine/types';
import { add } from './add';
import { analogy } from './analogy';
import { attribute } from './attribute';
import { compare } from './compare';
import { count } from './count';
import { fold } from './fold';
import { fraction } from './fraction';
import { graph } from './graph';
import { ORACLES } from './index';
import { judge } from './judge';
import { letter } from './letter';
import { line } from './line';
import { makeTen } from './makeTen';
import { matchEqual } from './matchEqual';
import { matrix } from './matrix';
import { measure } from './measure';
import { missing } from './missing';
import { money } from './money';
import { multiply } from './multiply';
import { numberRule } from './numberRule';
import { oddOne } from './oddOne';
import { order } from './order';
import { parity } from './parity';
import { pattern } from './pattern';
import { place } from './place';
import { sentence } from './sentence';
import { sequence } from './sequence';
import { series } from './series';
import { shapeFacts } from './shapeFacts';
import { sortBy } from './sortBy';
import { spell } from './spell';
import { subtract } from './subtract';
import { time } from './time';
import { transform } from './transform';
import { truth } from './truth';
import { twoStep } from './twoStep';
import { wordSet } from './wordSet';

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
      ['add', 'analogy', 'attribute', 'compare', 'count', 'fold', 'fraction', 'graph', 'letter', 'line', 'makeTen', 'matchEqual', 'matrix', 'measure', 'missing', 'money', 'multiply', 'numberRule', 'oddOne', 'order', 'parity', 'pattern', 'place', 'sentence', 'sequence', 'series', 'shapeFacts', 'sortBy', 'spell', 'subtract', 'time', 'transform', 'truth', 'twoStep', 'wordSet'],
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

describe('place', () => {
  it('puts the digits together into the number', () => {
    expect(place({ hundreds: 0, tens: 1, ones: 4, ask: 'number' })).toEqual({ kind: 'value', value: 14 });
    expect(place({ hundreds: 3, tens: 4, ones: 2, ask: 'number' })).toEqual({ kind: 'value', value: 342 });
    expect(place({ hundreds: 0, tens: 0, ones: 0, ask: 'number' })).toEqual({ kind: 'value', value: 0 });
    expect(place({ hundreds: 5, tens: 0, ones: 7, ask: 'number' })).toEqual({ kind: 'value', value: 507 });
  });
  it('gives one digit', () => {
    expect(place({ hundreds: 0, tens: 1, ones: 6, ask: 'onesDigit' })).toEqual({ kind: 'value', value: 6 });
    expect(place({ hundreds: 0, tens: 1, ones: 6, ask: 'tensDigit' })).toEqual({ kind: 'value', value: 1 });
    expect(place({ hundreds: 9, tens: 1, ones: 6, ask: 'hundredsDigit' })).toEqual({ kind: 'value', value: 9 });
  });
  it('gives what a digit is worth', () => {
    expect(place({ hundreds: 3, tens: 4, ones: 2, ask: 'hundredsValue' })).toEqual({ kind: 'value', value: 300 });
    expect(place({ hundreds: 3, tens: 4, ones: 2, ask: 'tensValue' })).toEqual({ kind: 'value', value: 40 });
    expect(place({ hundreds: 3, tens: 4, ones: 2, ask: 'onesValue' })).toEqual({ kind: 'value', value: 2 });
  });
  it('writes the expanded form, leaving out parts that are zero', () => {
    expect(place({ hundreds: 3, tens: 4, ones: 2, ask: 'expanded' })).toEqual({ kind: 'value', value: '300 + 40 + 2' });
    expect(place({ hundreds: 3, tens: 0, ones: 2, ask: 'expanded' })).toEqual({ kind: 'value', value: '300 + 2' });
    expect(place({ hundreds: 0, tens: 1, ones: 0, ask: 'expanded' })).toEqual({ kind: 'value', value: '10' });
    expect(place({ hundreds: 0, tens: 0, ones: 0, ask: 'expanded' })).toEqual({ kind: 'value', value: '0' });
  });
  it('refuses a digit that is missing, not whole or out of range, and an ask it does not know', () => {
    expect(() => place({ tens: 1, ones: 4, ask: 'number' })).toThrow();
    expect(() => place({ hundreds: 0, tens: 10, ones: 4, ask: 'number' })).toThrow();
    expect(() => place({ hundreds: 0, tens: 1, ones: -1, ask: 'number' })).toThrow();
    expect(() => place({ hundreds: 0, tens: 1.5, ones: 4, ask: 'number' })).toThrow();
    expect(() => place({ hundreds: 0, tens: 1, ones: 4, ask: 'digits' })).toThrow();
    expect(() => place({ hundreds: 0, tens: 1, ones: 4 })).toThrow();
  });
});

describe('letter', () => {
  it('gives a letter in the case asked for', () => {
    expect(letter({ letter: 'b', ask: 'upper' })).toEqual({ kind: 'value', value: 'B' });
    expect(letter({ letter: 'B', ask: 'upper' })).toEqual({ kind: 'value', value: 'B' });
    expect(letter({ letter: 'Q', ask: 'lower' })).toEqual({ kind: 'value', value: 'q' });
    expect(letter({ letter: 'q', ask: 'lower' })).toEqual({ kind: 'value', value: 'q' });
  });
  it('gives the neighbour in the alphabet, in the same case', () => {
    expect(letter({ letter: 'b', ask: 'next' })).toEqual({ kind: 'value', value: 'c' });
    expect(letter({ letter: 'B', ask: 'next' })).toEqual({ kind: 'value', value: 'C' });
    expect(letter({ letter: 'y', ask: 'next' })).toEqual({ kind: 'value', value: 'z' });
    expect(letter({ letter: 'b', ask: 'before' })).toEqual({ kind: 'value', value: 'a' });
    expect(letter({ letter: 'Z', ask: 'before' })).toEqual({ kind: 'value', value: 'Y' });
  });
  it('tells a letter from a number', () => {
    expect(letter({ letter: 'm', ask: 'kind' })).toEqual({ kind: 'value', value: 'letter' });
    expect(letter({ letter: 'M', ask: 'kind' })).toEqual({ kind: 'value', value: 'letter' });
    expect(letter({ letter: '7', ask: 'kind' })).toEqual({ kind: 'value', value: 'number' });
  });
  it('refuses the ends of the alphabet, more than one letter, and an ask it does not know', () => {
    expect(() => letter({ letter: 'z', ask: 'next' })).toThrow();
    expect(() => letter({ letter: 'A', ask: 'before' })).toThrow();
    expect(() => letter({ letter: 'ab', ask: 'upper' })).toThrow();
    expect(() => letter({ letter: '7', ask: 'upper' })).toThrow();
    expect(() => letter({ letter: '?', ask: 'kind' })).toThrow();
    expect(() => letter({ letter: 'a', ask: 'sound' })).toThrow();
    expect(() => letter({ ask: 'upper' })).toThrow();
  });
});

describe('wordSet', () => {
  it('firstSound: the option that starts with the same sound, by sound and not by letter', () => {
    expect(wordSet({ target: 'ball', relation: 'firstSound', options: ['cat', 'bear'] })).toEqual({ kind: 'index', index: 1 });
    // Cat and key start with the same sound and different letters.
    expect(wordSet({ target: 'cat', relation: 'firstSound', options: ['key', 'sun', 'dog'] })).toEqual({ kind: 'index', index: 0 });
    // Two options with the target's sound, or none, is a broken question.
    expect(() => wordSet({ target: 'cat', relation: 'firstSound', options: ['key', 'cow'] })).toThrow();
    expect(() => wordSet({ target: 'cat', relation: 'firstSound', options: ['sun', 'dog'] })).toThrow();
    // The target itself is not an answer.
    expect(() => wordSet({ target: 'cat', relation: 'firstSound', options: ['cat', 'dog'] })).toThrow();
    expect(() => wordSet({ target: 'xylophone', relation: 'firstSound', options: ['cat', 'dog'] })).toThrow();
  });
  it('rhyme: the option in the same rhyme family', () => {
    expect(wordSet({ target: 'cat', relation: 'rhyme', options: ['dog', 'hat'] })).toEqual({ kind: 'index', index: 1 });
    expect(wordSet({ target: 'sock', relation: 'rhyme', options: ['clock', 'fox', 'bee'] })).toEqual({ kind: 'index', index: 0 });
    expect(() => wordSet({ target: 'cat', relation: 'rhyme', options: ['hat', 'bat'] })).toThrow();
    expect(() => wordSet({ target: 'cat', relation: 'rhyme', options: ['dog', 'bee'] })).toThrow();
    expect(() => wordSet({ target: 'cat', relation: 'rhyme', options: ['cat', 'bee'] })).toThrow();
  });
  it('category: the option that belongs to the group named', () => {
    expect(wordSet({ target: 'animals', relation: 'category', options: ['car', 'dog'] })).toEqual({ kind: 'index', index: 1 });
    expect(wordSet({ target: 'clothes', relation: 'category', options: ['sock', 'apple', 'bus'] })).toEqual({ kind: 'index', index: 0 });
    expect(() => wordSet({ target: 'animals', relation: 'category', options: ['cat', 'dog'] })).toThrow();
    expect(() => wordSet({ target: 'animals', relation: 'category', options: ['car', 'bus'] })).toThrow();
    expect(() => wordSet({ target: 'toys', relation: 'category', options: ['car', 'dog'] })).toThrow();
  });
  it('opposite: the option that is the opposite, both ways round, and big with small', () => {
    expect(wordSet({ target: 'hot', relation: 'opposite', options: ['cold', 'night', 'slow'] })).toEqual({ kind: 'index', index: 0 });
    expect(wordSet({ target: 'cold', relation: 'opposite', options: ['night', 'hot'] })).toEqual({ kind: 'index', index: 1 });
    expect(wordSet({ target: 'big', relation: 'opposite', options: ['night', 'small'] })).toEqual({ kind: 'index', index: 1 });
    expect(wordSet({ target: 'small', relation: 'opposite', options: ['big', 'sad'] })).toEqual({ kind: 'index', index: 0 });
    expect(() => wordSet({ target: 'hot', relation: 'opposite', options: ['night', 'slow'] })).toThrow();
    expect(() => wordSet({ target: 'warm', relation: 'opposite', options: ['cold', 'slow'] })).toThrow();
  });
  it('syllables: the number of parts in the word', () => {
    expect(wordSet({ target: 'cat', relation: 'syllables' })).toEqual({ kind: 'value', value: 1 });
    expect(wordSet({ target: 'apple', relation: 'syllables' })).toEqual({ kind: 'value', value: 2 });
    expect(wordSet({ target: 'umbrella', relation: 'syllables' })).toEqual({ kind: 'value', value: 3 });
    expect(() => wordSet({ target: 'hippopotamus', relation: 'syllables' })).toThrow();
  });
  it('refuses a relation that is not written yet, and options that are not words', () => {
    expect(() => wordSet({ target: 'cat', relation: 'homophone', options: ['a', 'b'] })).toThrow(/not written yet/);
    expect(() => wordSet({ target: 'cat', relation: 'rhyme', options: [1, 2] })).toThrow();
    expect(() => wordSet({ relation: 'rhyme', options: ['hat'] })).toThrow();
  });
});

describe('analogy', () => {
  it('applies the change of the first pair to the second', () => {
    expect(analogy({ from: ['circle', 'red', 'l'], to: ['circle', 'red', 's'], base: ['square', 'blue', 'l'] })).toEqual({ kind: 'value', value: 'square|blue|s' });
    expect(analogy({ from: ['circle', 'red', 'l'], to: ['circle', 'green', 'l'], base: ['star', 'red', 's'] })).toEqual({ kind: 'value', value: 'star|green|s' });
    // Two attributes change at once.
    expect(analogy({ from: ['circle', 'red', 'l'], to: ['circle', 'blue', 's'], base: ['heart', 'red', 'l'] })).toEqual({ kind: 'value', value: 'heart|blue|s' });
  });
  it('refuses a first pair with no change, a second pair that starts differently, and the same pair twice', () => {
    expect(() => analogy({ from: ['circle', 'red', 'l'], to: ['circle', 'red', 'l'], base: ['square', 'blue', 'l'] })).toThrow();
    expect(() => analogy({ from: ['circle', 'red', 'l'], to: ['circle', 'red', 's'], base: ['square', 'blue', 's'] })).toThrow();
    expect(() => analogy({ from: ['circle', 'red', 'l'], to: ['circle', 'red', 's'], base: ['circle', 'red', 'l'] })).toThrow();
    expect(() => analogy({ from: ['circle', 'red'], to: ['circle', 'red', 's'], base: ['circle', 'red', 'l'] })).toThrow();
  });
});

describe('matrix', () => {
  it('gives the cell that fits its row and its column', () => {
    const facts = { rowAttrs: ['circle', 'square'], colAttrs: ['red', 'blue'] };
    expect(matrix({ ...facts, blank: 3 })).toEqual({ kind: 'value', value: 'square|blue' });
    expect(matrix({ ...facts, blank: 0 })).toEqual({ kind: 'value', value: 'circle|red' });
    expect(matrix({ ...facts, blank: 1 })).toEqual({ kind: 'value', value: 'circle|blue' });
    expect(matrix({ ...facts, blank: 2 })).toEqual({ kind: 'value', value: 'square|red' });
    expect(matrix({ rowAttrs: ['a', 'b', 'c'], colAttrs: ['x', 'y', 'z'], blank: 5 })).toEqual({ kind: 'value', value: 'b|z' });
    // Stripes: every column is the same, the rows differ.
    expect(matrix({ rowAttrs: ['red', 'blue', 'red'], colAttrs: ['square', 'square', 'square'], blank: 8 })).toEqual({ kind: 'value', value: 'red|square' });
  });
  it('gives the colour of a checkerboard square', () => {
    const facts = { rowAttrs: [0, 1, 2], colAttrs: [0, 1, 2], rule: 'checker', colors: ['red', 'blue'] };
    expect(matrix({ ...facts, blank: 4 })).toEqual({ kind: 'value', value: 'red' });
    expect(matrix({ ...facts, blank: 1 })).toEqual({ kind: 'value', value: 'blue' });
    expect(matrix({ ...facts, blank: 8 })).toEqual({ kind: 'value', value: 'red' });
    expect(() => matrix({ ...facts, colors: ['red', 'red'], blank: 4 })).toThrow();
  });
  it('refuses a grid of the wrong size, a box outside it, and a grid where every cell is the same', () => {
    expect(() => matrix({ rowAttrs: ['a'], colAttrs: ['x'], blank: 0 })).toThrow();
    expect(() => matrix({ rowAttrs: ['a', 'b'], colAttrs: ['x', 'y', 'z'], blank: 0 })).toThrow();
    expect(() => matrix({ rowAttrs: ['a', 'b'], colAttrs: ['x', 'y'], blank: 4 })).toThrow();
    expect(() => matrix({ rowAttrs: ['a', 'a'], colAttrs: ['x', 'x'], blank: 0 })).toThrow();
  });
});

describe('transform', () => {
  it('turns by quarter turns, round and round', () => {
    expect(transform({ shape: 'arrow', startTurn: 0, turns: 3, flip: false })).toEqual({ kind: 'value', value: '3' });
    expect(transform({ shape: 'arrow', startTurn: 2, turns: 3, flip: false })).toEqual({ kind: 'value', value: '1' });
    expect(transform({ shape: 'lShape', startTurn: 1, turns: 6, flip: false })).toEqual({ kind: 'value', value: '3' });
    expect(transform({ shape: 'lShape', startTurn: 3, turns: 0, flip: false })).toEqual({ kind: 'value', value: '3' });
  });
  it('mirrors left to right, which reverses a quarter turn', () => {
    expect(transform({ shape: 'flag', startTurn: 0, turns: 0, flip: true })).toEqual({ kind: 'value', value: '0f' });
    expect(transform({ shape: 'flag', startTurn: 1, turns: 0, flip: true })).toEqual({ kind: 'value', value: '3f' });
    expect(transform({ shape: 'flag', startTurn: 2, turns: 0, flip: true })).toEqual({ kind: 'value', value: '2f' });
    expect(transform({ shape: 'flag', startTurn: 3, turns: 0, flip: true })).toEqual({ kind: 'value', value: '1f' });
  });
  it('refuses turns that are not whole, and a flip that is not yes or no', () => {
    expect(() => transform({ shape: 'flag', startTurn: 0.5, turns: 0, flip: true })).toThrow();
    expect(() => transform({ shape: 'flag', startTurn: 0, turns: -1, flip: false })).toThrow();
    expect(() => transform({ shape: 'flag', startTurn: 0, turns: 1 })).toThrow();
    expect(() => transform({ startTurn: 0, turns: 1, flip: false })).toThrow();
  });
});

describe('numberRule', () => {
  it('finds plus n, minus n or double, and applies it', () => {
    expect(numberRule({ examples: [[2, 5], [4, 7]], base: 6 })).toEqual({ kind: 'value', value: 9 });
    expect(numberRule({ examples: [[3, 6], [5, 10]], base: 4 })).toEqual({ kind: 'value', value: 8 });
    expect(numberRule({ examples: [[9, 7], [5, 3]], base: 8 })).toEqual({ kind: 'value', value: 6 });
  });
  it('fails when two rules fit: "2 is to 4" alone is plus 2 and double', () => {
    expect(() => numberRule({ examples: [[2, 4]], base: 6 })).toThrow(/2 rules/);
    expect(() => numberRule({ examples: [[2, 4], [2, 4]], base: 6 })).toThrow(/2 rules/);
  });
  it('fails when no rule fits, and on broken examples', () => {
    expect(() => numberRule({ examples: [[2, 5], [4, 8]], base: 6 })).toThrow(/0 rules/);
    expect(() => numberRule({ examples: [[3, 3], [5, 5]], base: 6 })).toThrow();
    expect(() => numberRule({ examples: [[2]], base: 6 })).toThrow();
    expect(() => numberRule({ examples: [], base: 6 })).toThrow();
  });
});

describe('series', () => {
  it('follows one step, or steps that take turns', () => {
    expect(series({ start: 3, steps: [2], blankIndex: 4 })).toEqual({ kind: 'value', value: 11 });
    expect(series({ start: 10, steps: [-1], blankIndex: 3 })).toEqual({ kind: 'value', value: 7 });
    expect(series({ start: 1, steps: [1, 2], blankIndex: 4 })).toEqual({ kind: 'value', value: 7 }); // 1 2 4 5 7
    expect(series({ start: 1, steps: [1, 2], blankIndex: 5 })).toEqual({ kind: 'value', value: 8 });
    expect(series({ start: 5, steps: [5], blankIndex: 0 })).toEqual({ kind: 'value', value: 5 });
  });
  it('refuses a row that never changes and a blank that is not a place', () => {
    expect(() => series({ start: 3, steps: [0], blankIndex: 2 })).toThrow();
    expect(() => series({ start: 3, steps: [2], blankIndex: -1 })).toThrow();
    expect(() => series({ start: 3, steps: [], blankIndex: 2 })).toThrow();
  });
});

describe('fold', () => {
  it('copies each hole across a vertical fold to column 3 minus its column', () => {
    expect(fold({ fold: 'vertical', holes: [{ col: 0, row: 0 }] })).toEqual({ kind: 'value', value: '0,0 3,0' });
    expect(fold({ fold: 'vertical', holes: [{ col: 1, row: 2 }] })).toEqual({ kind: 'value', value: '1,2 2,2' });
    expect(fold({ fold: 'vertical', holes: [{ col: 0, row: 3 }, { col: 1, row: 0 }] })).toEqual({ kind: 'value', value: '0,3 1,0 2,0 3,3' });
  });
  it('copies each hole across a horizontal fold to row 3 minus its row', () => {
    expect(fold({ fold: 'horizontal', holes: [{ col: 0, row: 0 }] })).toEqual({ kind: 'value', value: '0,0 0,3' });
    expect(fold({ fold: 'horizontal', holes: [{ col: 2, row: 1 }] })).toEqual({ kind: 'value', value: '2,1 2,2' });
  });
  it('refuses a hole off the folded paper, two holes in one place, and an unknown fold', () => {
    expect(() => fold({ fold: 'vertical', holes: [{ col: 2, row: 0 }] })).toThrow();
    expect(() => fold({ fold: 'horizontal', holes: [{ col: 0, row: 2 }] })).toThrow();
    expect(() => fold({ fold: 'vertical', holes: [{ col: 0, row: 0 }, { col: 0, row: 0 }] })).toThrow();
    expect(() => fold({ fold: 'diagonal', holes: [{ col: 0, row: 0 }] })).toThrow();
    expect(() => fold({ fold: 'vertical', holes: [{ col: 0 }] })).toThrow();
  });
});

describe('wordSet, the reasoning relations', () => {
  it('analogyPair: the second half of the pair the target starts', () => {
    expect(wordSet({ target: 'glove', relation: 'analogyPair', options: ['hand', 'honey', 'tree'] })).toEqual({ kind: 'index', index: 0 });
    expect(wordSet({ target: 'bee', relation: 'analogyPair', options: ['milk', 'egg', 'honey'] })).toEqual({ kind: 'index', index: 2 });
    expect(() => wordSet({ target: 'bee', relation: 'analogyPair', options: ['milk', 'egg'] })).toThrow();
    expect(() => wordSet({ target: 'honey', relation: 'analogyPair', options: ['bee', 'egg'] })).toThrow();
  });
  it('riddle: the answer to the riddle', () => {
    expect(wordSet({ target: 'Which one tells the time?', relation: 'riddle', options: ['shoe', 'clock'] })).toEqual({ kind: 'index', index: 1 });
    expect(wordSet({ target: 'Which one can fly?', relation: 'riddle', options: ['bird', 'fish', 'car'] })).toEqual({ kind: 'index', index: 0 });
    expect(() => wordSet({ target: 'Which one can fly?', relation: 'riddle', options: ['fish', 'car'] })).toThrow();
    expect(() => wordSet({ target: 'Which one can swim?', relation: 'riddle', options: ['fish', 'car'] })).toThrow();
  });
});

describe('time', () => {
  it('writes the time with two digits for the minutes', () => {
    expect(time({ hour: 3, minute: 0 })).toEqual({ kind: 'value', value: '3:00' });
    expect(time({ hour: 3, minute: 30 })).toEqual({ kind: 'value', value: '3:30' });
    expect(time({ hour: 12, minute: 5 })).toEqual({ kind: 'value', value: '12:05' });
  });
  it('refuses an hour or minute no clock shows', () => {
    expect(() => time({ hour: 0, minute: 0 })).toThrow();
    expect(() => time({ hour: 13, minute: 0 })).toThrow();
    expect(() => time({ hour: 3, minute: 60 })).toThrow();
    expect(() => time({ hour: 3.5, minute: 0 })).toThrow();
    expect(() => time({ hour: 3 })).toThrow();
  });
});

describe('graph', () => {
  const values = [4, 7, 2];
  it('reads one category, finds the most and the least, and takes the difference', () => {
    expect(graph({ values, ask: 'value', index: 1 })).toEqual({ kind: 'value', value: 7 });
    expect(graph({ values, ask: 'most' })).toEqual({ kind: 'index', index: 1 });
    expect(graph({ values, ask: 'least' })).toEqual({ kind: 'index', index: 2 });
    expect(graph({ values, ask: 'difference', index: 1, other: 0 })).toEqual({ kind: 'value', value: 3 });
  });
  it('refuses a tie for most or least, "how many more" asked the wrong way round, and a category that is not there', () => {
    expect(() => graph({ values: [4, 4, 2], ask: 'most' })).toThrow();
    expect(() => graph({ values: [4, 2, 2], ask: 'least' })).toThrow();
    expect(() => graph({ values, ask: 'difference', index: 0, other: 1 })).toThrow();
    expect(() => graph({ values, ask: 'difference', index: 1, other: 1 })).toThrow();
    expect(() => graph({ values, ask: 'value', index: 3 })).toThrow();
    expect(() => graph({ values, ask: 'middle' })).toThrow();
  });
});

describe('money', () => {
  it('knows what each coin is worth, and adds them up', () => {
    expect(money({ coins: ['penny'], ask: 'value' })).toEqual({ kind: 'value', value: 1 });
    expect(money({ coins: ['nickel'], ask: 'value' })).toEqual({ kind: 'value', value: 5 });
    expect(money({ coins: ['dime'], ask: 'value' })).toEqual({ kind: 'value', value: 10 });
    expect(money({ coins: ['quarter'], ask: 'value' })).toEqual({ kind: 'value', value: 25 });
    expect(money({ coins: ['quarter', 'dime', 'dime', 'nickel', 'penny'], ask: 'total' })).toEqual({ kind: 'value', value: 51 });
    expect(money({ coins: ['dime'], ask: 'name' })).toEqual({ kind: 'value', value: 'dime' });
  });
  it('says which coin is worth more: a dime beats a nickel though it is smaller', () => {
    expect(money({ coins: ['nickel', 'dime'], ask: 'worthMore' })).toEqual({ kind: 'index', index: 1 });
    expect(money({ coins: ['quarter', 'penny'], ask: 'worthMore' })).toEqual({ kind: 'index', index: 0 });
    expect(() => money({ coins: ['dime', 'dime'], ask: 'worthMore' })).toThrow();
    expect(() => money({ coins: ['dime'], ask: 'worthMore' })).toThrow();
  });
  it('refuses a coin it does not know and naming two coins at once', () => {
    expect(() => money({ coins: ['dollar'], ask: 'total' })).toThrow();
    expect(() => money({ coins: ['dime', 'penny'], ask: 'name' })).toThrow();
    expect(() => money({ coins: ['dime'], ask: 'colour' })).toThrow();
  });
});

describe('fraction', () => {
  it('says whether the parts are equal, and names equal parts', () => {
    expect(fraction({ parts: 2, equal: true, ask: 'equal' })).toEqual({ kind: 'value', value: true });
    expect(fraction({ parts: 2, equal: false, ask: 'equal' })).toEqual({ kind: 'value', value: false });
    expect(fraction({ parts: 2, equal: true, ask: 'name' })).toEqual({ kind: 'value', value: 'halves' });
    expect(fraction({ parts: 3, equal: true, ask: 'name' })).toEqual({ kind: 'value', value: 'thirds' });
    expect(fraction({ parts: 4, equal: true, ask: 'name' })).toEqual({ kind: 'value', value: 'fourths' });
  });
  it('gives unequal parts no name, and refuses what it does not know', () => {
    expect(() => fraction({ parts: 2, equal: false, ask: 'name' })).toThrow();
    expect(() => fraction({ parts: 5, equal: true, ask: 'name' })).toThrow();
    expect(() => fraction({ parts: 2, ask: 'equal' })).toThrow();
    expect(() => fraction({ parts: 2, equal: true, ask: 'size' })).toThrow();
  });
});

describe('makeTen', () => {
  it('writes the sum as ten and what is left over', () => {
    expect(makeTen({ a: 9, b: 4 })).toEqual({ kind: 'value', value: '10 plus 3' });
    expect(makeTen({ a: 8, b: 5 })).toEqual({ kind: 'value', value: '10 plus 3' });
    expect(makeTen({ a: 7, b: 4 })).toEqual({ kind: 'value', value: '10 plus 1' });
    expect(makeTen({ a: 9, b: 9 })).toEqual({ kind: 'value', value: '10 plus 8' });
  });
  it('refuses a sum that does not go past ten, and numbers that are not 1 to 9', () => {
    expect(() => makeTen({ a: 6, b: 4 })).toThrow();
    expect(() => makeTen({ a: 3, b: 4 })).toThrow();
    expect(() => makeTen({ a: 10, b: 4 })).toThrow();
    expect(() => makeTen({ a: 9 })).toThrow();
  });
});

describe('truth', () => {
  it('says whether the two sides are worth the same', () => {
    expect(truth({ left: [4, '+', 1], right: [5] })).toEqual({ kind: 'value', value: true });
    expect(truth({ left: [4, '+', 1], right: [6] })).toEqual({ kind: 'value', value: false });
    expect(truth({ left: [3, '+', 2], right: [2, '+', 3] })).toEqual({ kind: 'value', value: true });
    expect(truth({ left: [9, '-', 4], right: [2, '+', 3] })).toEqual({ kind: 'value', value: true });
    expect(truth({ left: [12, '-', 4], right: [15, '-', 8] })).toEqual({ kind: 'value', value: false });
    expect(truth({ left: [7], right: [7] })).toEqual({ kind: 'value', value: true });
    expect(truth({ left: [2, '+', 3, '+', 4], right: [9] })).toEqual({ kind: 'value', value: true });
  });
  it('refuses a side that is not numbers joined by plus or minus', () => {
    expect(() => truth({ left: [4, '+'], right: [5] })).toThrow();
    expect(() => truth({ left: [4, 'x', 2], right: [8] })).toThrow();
    expect(() => truth({ left: ['+', 4], right: [4] })).toThrow();
    expect(() => truth({ left: [4, '+', 1] })).toThrow();
  });
});

describe('parity', () => {
  it('names one number even or odd, and sorts several into even (0) and odd (1)', () => {
    expect(parity({ values: [6] })).toEqual({ kind: 'value', value: 'even' });
    expect(parity({ values: [7] })).toEqual({ kind: 'value', value: 'odd' });
    expect(parity({ values: [0] })).toEqual({ kind: 'value', value: 'even' });
    expect(parity({ values: [12, 35, 40, 99] })).toEqual({ kind: 'bins', bins: [0, 1, 0, 1] });
  });
  it('refuses a number that is not whole or is below zero', () => {
    expect(() => parity({ values: [2.5] })).toThrow();
    expect(() => parity({ values: [-3] })).toThrow();
    expect(() => parity({ values: [] })).toThrow();
  });
});

describe('line', () => {
  it('gives the number at a mark', () => {
    expect(line({ min: 0, step: 10, index: 4 })).toEqual({ kind: 'value', value: 40 });
    expect(line({ min: 20, step: 5, index: 3 })).toEqual({ kind: 'value', value: 35 });
    expect(line({ min: 37, step: 1, index: 0 })).toEqual({ kind: 'value', value: 37 });
  });
  it('refuses a step of zero and a mark that is not on the line', () => {
    expect(() => line({ min: 0, step: 0, index: 2 })).toThrow();
    expect(() => line({ min: 0, step: 10, index: -1 })).toThrow();
    expect(() => line({ min: 0, step: 10, index: 1.5 })).toThrow();
  });
});

describe('measure', () => {
  it('gives the length in units, wherever the object starts', () => {
    expect(measure({ startUnit: 0, lengthUnits: 5 })).toEqual({ kind: 'value', value: 5 });
    // Starting at 2 and ending at 7 is 5 long, not 7.
    expect(measure({ startUnit: 2, lengthUnits: 5 })).toEqual({ kind: 'value', value: 5 });
  });
  it('refuses an object with no length or a start off the ruler', () => {
    expect(() => measure({ startUnit: 0, lengthUnits: 0 })).toThrow();
    expect(() => measure({ startUnit: -1, lengthUnits: 3 })).toThrow();
    expect(() => measure({ startUnit: 0 })).toThrow();
  });
});

describe('multiply', () => {
  it('counts an array, and writes it as one number added for each row', () => {
    expect(multiply({ rows: 3, cols: 4, ask: 'total' })).toEqual({ kind: 'value', value: 12 });
    expect(multiply({ rows: 3, cols: 4, ask: 'addition' })).toEqual({ kind: 'value', value: '4 + 4 + 4' });
    expect(multiply({ rows: 2, cols: 5, ask: 'addition' })).toEqual({ kind: 'value', value: '5 + 5' });
    expect(multiply({ rows: 5, cols: 5, ask: 'total' })).toEqual({ kind: 'value', value: 25 });
  });
  it('refuses an array with no rows, and an ask it does not know', () => {
    expect(() => multiply({ rows: 0, cols: 4, ask: 'total' })).toThrow();
    expect(() => multiply({ rows: 2.5, cols: 4, ask: 'total' })).toThrow();
    expect(() => multiply({ rows: 2, cols: 4, ask: 'area' })).toThrow();
  });
});

describe('twoStep', () => {
  it('does one step, then the next', () => {
    expect(twoStep({ a: 5, op1: '+', b: 3, op2: '+', c: 4 })).toEqual({ kind: 'value', value: 12 });
    expect(twoStep({ a: 5, op1: '+', b: 3, op2: '-', c: 4 })).toEqual({ kind: 'value', value: 4 });
    expect(twoStep({ a: 9, op1: '-', b: 3, op2: '+', c: 4 })).toEqual({ kind: 'value', value: 10 });
  });
  it('refuses a story that goes below zero, and a sign it does not know', () => {
    expect(() => twoStep({ a: 2, op1: '-', b: 5, op2: '+', c: 9 })).toThrow();
    expect(() => twoStep({ a: 2, op1: '+', b: 1, op2: '-', c: 9 })).toThrow();
    expect(() => twoStep({ a: 2, op1: 'x', b: 1, op2: '+', c: 9 })).toThrow();
    expect(() => twoStep({ a: 2, op1: '+', b: 1, op2: '+' })).toThrow();
  });
});

describe('spell', () => {
  it('takes a word letter by letter, or a compound word as its two words', () => {
    expect(spell({ word: 'cat', parts: ['c', 'a', 't'] })).toEqual({ kind: 'value', value: 'cat' });
    expect(spell({ word: 'sunflower', parts: ['sun', 'flower'] })).toEqual({ kind: 'value', value: 'sunflower' });
    expect(spell({ word: 'at', parts: ['a', 't'] })).toEqual({ kind: 'value', value: 'at' });
  });
  it('refuses parts that do not make the word, or that are neither letters nor two words', () => {
    expect(() => spell({ word: 'cat', parts: ['c', 't', 'a'] })).toThrow();
    expect(() => spell({ word: 'cat', parts: ['ca', 't'] })).toThrow();
    expect(() => spell({ word: 'sunflower', parts: ['sun', 'flow', 'er'] })).toThrow();
    expect(() => spell({ word: 'cat', parts: [] })).toThrow();
  });
});

describe('sentence', () => {
  it('writes a telling sentence with its capital and its period', () => {
    expect(sentence({ base: 'the cat is big', ask: 'capital' })).toEqual({ kind: 'value', value: 'The cat is big.' });
    expect(sentence({ base: 'we go to the bus', ask: 'period' })).toEqual({ kind: 'value', value: 'We go to the bus.' });
    expect(sentence({ base: 'i see a red hat', ask: 'both' })).toEqual({ kind: 'value', value: 'I see a red hat.' });
  });
  it('gives the end mark of a telling, asking or shouting sentence', () => {
    expect(sentence({ base: 'the sun is hot', ask: 'endMark' })).toEqual({ kind: 'value', value: '.' });
    expect(sentence({ base: 'is the sun hot', ask: 'endMark' })).toEqual({ kind: 'value', value: '?' });
    expect(sentence({ base: 'look out', ask: 'endMark' })).toEqual({ kind: 'value', value: '!' });
  });
  it('refuses a sentence that is not in the lists, and an asking sentence where a telling one is needed', () => {
    expect(() => sentence({ base: 'the cow is big', ask: 'capital' })).toThrow();
    expect(() => sentence({ base: 'is the sun hot', ask: 'both' })).toThrow();
    expect(() => sentence({ base: 'the cat is big', ask: 'comma' })).toThrow();
  });
});

describe('letter: a run of letters', () => {
  it('gives the letters that follow, in the same case', () => {
    expect(letter({ letter: 'd', ask: 'run', length: 3 })).toEqual({ kind: 'value', value: 'efg' });
    expect(letter({ letter: 'W', ask: 'run', length: 3 })).toEqual({ kind: 'value', value: 'XYZ' });
  });
  it('refuses a run past z, and a run with no length', () => {
    expect(() => letter({ letter: 'x', ask: 'run', length: 3 })).toThrow();
    expect(() => letter({ letter: 'd', ask: 'run' })).toThrow();
  });
});

describe('wordSet: kindergarten relations', () => {
  it('finds the first letter, the last letter and the middle vowel of a word', () => {
    expect(wordSet({ target: 'cat', relation: 'firstLetter' })).toEqual({ kind: 'value', value: 'c' });
    expect(wordSet({ target: 'key', relation: 'firstLetter' })).toEqual({ kind: 'value', value: 'k' });
    expect(wordSet({ target: 'bus', relation: 'lastLetter' })).toEqual({ kind: 'value', value: 's' });
    expect(wordSet({ target: 'hen', relation: 'middleVowel' })).toEqual({ kind: 'value', value: 'e' });
    expect(() => wordSet({ target: 'zebra', relation: 'lastLetter' })).toThrow();
    expect(() => wordSet({ target: 'pot', relation: 'middleVowel' })).toThrow();
  });
  it('finds a written word, a family member and the word outside a family', () => {
    expect(wordSet({ target: 'pin', relation: 'cvc', options: ['pan', 'pin', 'pen'] })).toEqual({ kind: 'index', index: 1 });
    expect(wordSet({ target: 'cat', relation: 'family', options: ['can', 'hat', 'cup'] })).toEqual({ kind: 'index', index: 1 });
    expect(() => wordSet({ target: 'cat', relation: 'family', options: ['hat', 'bat', 'cup'] })).toThrow();
    expect(wordSet({ target: 'ug', relation: 'notFamily', options: ['bug', 'hug', 'big', 'rug'] })).toEqual({ kind: 'index', index: 2 });
    expect(() => wordSet({ target: 'ug', relation: 'notFamily', options: ['bug', 'hug', 'rug'] })).toThrow();
  });
  it('finds a sight word, and refuses a question that offers a word sounding like it', () => {
    expect(wordSet({ target: 'said', relation: 'sightWord', options: ['see', 'said', 'red'] })).toEqual({ kind: 'index', index: 1 });
    expect(() => wordSet({ target: 'to', relation: 'sightWord', options: ['to', 'two', 'me'] })).toThrow();
    expect(() => wordSet({ target: 'in', relation: 'sightWord', options: ['in', 'on', 'me'] })).toThrow();
    expect(() => wordSet({ target: 'zebra', relation: 'sightWord', options: ['zebra', 'me'] })).toThrow();
  });
  it('gives the word for one or for many, and skips fish', () => {
    expect(wordSet({ target: 'apple', relation: 'plural', many: true })).toEqual({ kind: 'value', value: 'apples' });
    expect(wordSet({ target: 'apple', relation: 'plural', many: false })).toEqual({ kind: 'value', value: 'apple' });
    expect(() => wordSet({ target: 'fish', relation: 'plural', many: true })).toThrow();
    expect(() => wordSet({ target: 'apple', relation: 'plural' })).toThrow();
  });
  it('finds the picture a sentence is about', () => {
    expect(wordSet({ target: 'It is a red bus.', relation: 'sentencePicture', options: ['van', 'bus'] })).toEqual({ kind: 'index', index: 1 });
    expect(() => wordSet({ target: 'It is a blue bus.', relation: 'sentencePicture', options: ['van', 'bus'] })).toThrow();
  });
});

describe('wordSet: grade 1 relations', () => {
  it('finds the letters missing from a digraph, blend or vowel team word', () => {
    expect(wordSet({ target: 'ship', relation: 'digraph' })).toEqual({ kind: 'value', value: 'sh' });
    expect(wordSet({ target: 'tooth', relation: 'digraph' })).toEqual({ kind: 'value', value: 'th' });
    expect(wordSet({ target: 'frog', relation: 'blend' })).toEqual({ kind: 'value', value: 'fr' });
    expect(wordSet({ target: 'hand', relation: 'blend' })).toEqual({ kind: 'value', value: 'nd' });
    expect(wordSet({ target: 'boat', relation: 'vowelTeam' })).toEqual({ kind: 'value', value: 'oa' });
    expect(() => wordSet({ target: 'boat', relation: 'digraph' })).toThrow();
  });
  it('finds a vowel team word and a silent e word among the options', () => {
    expect(wordSet({ target: 'rain', relation: 'teamWord', options: ['bee', 'rain', 'goat'] })).toEqual({ kind: 'index', index: 1 });
    expect(wordSet({ target: 'cape', relation: 'silentE', options: ['cap', 'cape'] })).toEqual({ kind: 'index', index: 1 });
    expect(() => wordSet({ target: 'cat', relation: 'silentE', options: ['cat', 'cape'] })).toThrow();
  });
  it('finds an opposite and a word that means the same', () => {
    expect(wordSet({ target: 'hot', relation: 'opposite1', options: ['glad', 'cold', 'up'] })).toEqual({ kind: 'index', index: 1 });
    expect(wordSet({ target: 'shut', relation: 'opposite1', options: ['open', 'close', 'wet'] })).toEqual({ kind: 'index', index: 0 });
    expect(wordSet({ target: 'big', relation: 'same', options: ['small', 'large', 'up'] })).toEqual({ kind: 'index', index: 1 });
    expect(() => wordSet({ target: 'hot', relation: 'same', options: ['cold', 'up'] })).toThrow();
    expect(() => wordSet({ target: 'hot', relation: 'opposite1', options: ['glad', 'up'] })).toThrow();
  });
  it('finds the describing word of a sentence, and of a picture', () => {
    expect(wordSet({ target: 'The big dog ran.', relation: 'describing', options: ['dog', 'ran', 'big'] })).toEqual({ kind: 'index', index: 2 });
    expect(wordSet({ target: 'cold', relation: 'describingPicture', options: ['happy', 'cold', 'red'] })).toEqual({ kind: 'index', index: 1 });
    expect(() => wordSet({ target: 'big', relation: 'describingPicture', options: ['big', 'tall', 'red'] })).toThrow();
    expect(() => wordSet({ target: 'wet', relation: 'describingPicture', options: ['wet', 'red'] })).toThrow();
  });
});
