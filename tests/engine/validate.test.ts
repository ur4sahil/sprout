// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { questionKey } from '../../src/engine/canonical';
import type { Question, QuestionBase, Visual } from '../../src/engine/types';
import { validateQuestion, validateRepeatable, validateSeries } from '../../src/engine/validate';

const t = (value: string, speak = false): Visual =>
  speak ? { kind: 'text', value, size: 'l', speak: [{ word: 'thing' }] } : { kind: 'text', value, size: 'l' };

function stamp<T extends Question>(question: T): T {
  return { ...question, key: questionKey(question.skillId, question.level, question.facts) };
}

function base(facts: QuestionBase['facts']): QuestionBase {
  return {
    skillId: 'T-1',
    level: 1,
    seed: 1,
    key: '',
    facts,
    mode: 'look',
    prompt: { text: 'How many are there?', speak: ['How many are there?'] },
    explanation: { speak: ['There are', { number: 3 }, '.'], steps: ['There are 3.'] },
  };
}

function choice(change: Partial<Extract<Question, { type: 'choice' }>> = {}): Question {
  return stamp({
    ...base({ n: 3, options: [2, 3, 4] }),
    type: 'choice',
    options: [t('2'), t('3'), t('4')],
    answerIndex: 1,
    ...change,
  } as Question);
}

// The numbers of the invariants a question breaks.
function broken(question: Question, options: Parameters<typeof validateQuestion>[1] = {}): string[] {
  return [...new Set(validateQuestion(question, options).map((problem) => problem.split(':')[0] ?? ''))].sort();
}

describe('validateQuestion', () => {
  it('passes a well-formed question of every type', () => {
    const good: Question[] = [
      choice(),
      stamp({ ...base({ id: 'm', options: ['a', 'b', 'c'] }), type: 'multiSelect', options: [t('a'), t('b'), t('c')], answerIndexes: [0, 2] }),
      stamp({ ...base({ n: 3 }), type: 'tapCount', emoji: '🍎', shown: 6, answer: 3 }),
      stamp({ ...base({ a: 3, b: 4 }), type: 'numberPad', answer: 7, maxDigits: 2 }),
      stamp({ ...base({ values: [3, 1, 2] }), type: 'order', items: [t('3'), t('1'), t('2')], answerOrder: [1, 2, 0] }),
      stamp({
        ...base({ itemAttrs: ['x', 'y'], binAttrs: ['x', 'y'] }),
        type: 'sort',
        items: [t('a'), t('b')],
        bins: [
          { label: 'X', speak: ['X group'] },
          { label: 'Y', speak: ['Y group'] },
        ],
        answerBin: [0, 1],
      }),
      stamp({
        ...base({ leftValues: ['a', 'b'], rightValues: ['b', 'a'] }),
        type: 'match',
        left: [t('A'), t('B')],
        right: [t('b'), t('a')],
        answerPairs: [
          [0, 1],
          [1, 0],
        ],
      }),
      stamp({ ...base({ word: 'cat', parts: ['c', 'a', 't'] }), type: 'tiles', slots: 3, bank: ['c', 'a', 't', 'x', 'o'], answer: 'cat' }),
    ];
    for (const question of good) expect(validateQuestion(question), question.type).toEqual([]);
  });

  it('1: rejects spoken text with digits or symbols, and empty speech', () => {
    expect(broken(choice({ prompt: { text: 'How many?', speak: ['How many of the 3 are there?'] } }))).toContain('1');
    for (const symbol of ['+', '=', '□', '<', '>', '_']) {
      expect(broken(choice({ prompt: { text: 'x', speak: [`two ${symbol} two`] } })), symbol).toContain('1');
    }
    expect(broken(choice({ explanation: { speak: [], steps: ['x'] } }))).toContain('1');
    expect(broken(choice({ prompt: { text: 'x', speak: [{ letter: 'ab' }] } }))).toContain('1');
    expect(broken(choice({ prompt: { text: 'x', speak: [{ number: 1.5 }] } }))).toContain('1');
    expect(broken(choice({ prompt: { text: 'x', speak: [{ time: { hour: 13, minute: 0 } }] } }))).toContain('1');
    // A spoken label on an option is held to the same rule.
    expect(broken(choice({ options: [{ kind: 'text', value: '2', size: 'l', speak: ['2'] }, t('3'), t('4')] }))).toContain('1');
    // Hyphens inside words and typed parts are fine.
    expect(broken(choice({ prompt: { text: 'x', speak: ['forty-seven take away', { number: 3 }, { letter: 'a' }, { word: 'a' }, { cents: 25 }] } }))).toEqual([]);
  });

  it('2: rejects undefined, NaN and empty arrays anywhere', () => {
    expect(broken(choice({ stimulus: undefined }))).toContain('2');
    expect(broken(choice({ facts: { n: Number.NaN, options: [2, 3, 4] } }))).toContain('2');
    expect(broken(choice({ stimulus: { kind: 'row', children: [] } }))).toContain('2');
    expect(broken(choice({ explanation: { speak: ['Yes.'], steps: [] } }))).toContain('2');
    expect(broken(choice({ explanation: { speak: ['Yes.'], steps: ['a', 'b', 'c', 'd', 'e'] } }))).toContain('2');
    expect(broken(choice({ prompt: { text: '  ', speak: ['Hello.'] } }))).toContain('2');
  });

  it('3: rejects a choice with too few or too many options, a bad index, or two options that look the same', () => {
    expect(broken(choice({ options: [t('3')], answerIndex: 0, facts: { n: 3, options: [3] } }))).toContain('3');
    expect(broken(choice({ options: [t('1'), t('2'), t('3'), t('4'), t('5')], facts: { n: 3, options: [1, 2, 3, 4, 5] } }))).toContain('3');
    expect(broken(choice({ answerIndex: 3 }))).toContain('3');
    expect(broken(choice({ answerIndex: -1 }))).toContain('3');
    expect(broken(choice({ options: [t('2'), t('3'), t('3')] }))).toContain('3');
    // A square and the same square turned a quarter turn are one picture.
    const square = (rotation: number): Visual => ({ kind: 'shape', shape: 'square', color: 'red', size: 'm', rotation });
    expect(broken(choice({ options: [square(0), square(90), t('4')] }))).toContain('3');
  });

  it('3: a twins question needs matching wrong options and a different answer', () => {
    const dog = t('dog');
    const cat = t('cat');
    expect(broken(choice({ twins: true, options: [dog, cat, dog], answerIndex: 1 }))).toEqual([]);
    expect(broken(choice({ twins: true, options: [dog, cat, t('cow')], answerIndex: 1 }))).toContain('3');
    expect(broken(choice({ twins: true, options: [dog, dog, dog], answerIndex: 1 }))).toContain('3');
    expect(broken(choice({ twins: true, options: [dog, cat], answerIndex: 1, facts: { n: 3, options: [1, 2] } }))).toContain('3');
  });

  it('4: rejects a multiSelect with nothing right or nothing wrong', () => {
    const multi = (answerIndexes: number[]): Question =>
      stamp({ ...base({ id: 'm', options: ['a', 'b', 'c'] }), type: 'multiSelect', options: [t('a'), t('b'), t('c')], answerIndexes });
    expect(broken(multi([]))).toContain('4');
    expect(broken(multi([0, 1, 2]))).toContain('4');
    expect(broken(multi([0, 0]))).toContain('4');
    expect(broken(multi([5]))).toContain('4');
  });

  it('5: rejects a tapCount outside 1 <= answer <= shown <= 12', () => {
    const tap = (shown: number, answer: number): Question => stamp({ ...base({ n: answer }), type: 'tapCount', emoji: '🍎', shown, answer });
    expect(broken(tap(6, 0))).toContain('5');
    expect(broken(tap(6, 7))).toContain('5');
    expect(broken(tap(13, 3))).toContain('5');
    expect(broken(tap(12, 12))).toEqual([]);
    expect(broken(tap(1, 1))).toEqual([]);
  });

  it('6: rejects a numberPad answer that is negative, not whole, or too long', () => {
    const pad = (answer: number, maxDigits: number): Question => stamp({ ...base({ a: 1, b: 1 }), type: 'numberPad', answer, maxDigits });
    expect(broken(pad(-1, 2))).toContain('6');
    expect(broken(pad(2.5, 2))).toContain('6');
    expect(broken(pad(100, 2))).toContain('6');
    expect(broken(pad(0, 1))).toEqual([]);
    expect(broken(pad(99, 2))).toEqual([]);
  });

  it('7: rejects order, sort and match answers that do not cover every item once', () => {
    const order = (answerOrder: number[]): Question =>
      stamp({ ...base({ values: [3, 1, 2] }), type: 'order', items: [t('3'), t('1'), t('2')], answerOrder });
    expect(broken(order([1, 2]))).toContain('7');
    expect(broken(order([1, 1, 0]))).toContain('7');
    expect(broken(order([1, 2, 3]))).toContain('7');

    const sort = (answerBin: number[]): Question =>
      stamp({
        ...base({ itemAttrs: ['x', 'y', 'x'], binAttrs: ['x', 'y'] }),
        type: 'sort',
        items: [t('a'), t('b'), t('c')],
        bins: [
          { label: 'X', speak: ['X group'] },
          { label: 'Y', speak: ['Y group'] },
        ],
        answerBin,
      });
    expect(broken(sort([0, 1]))).toContain('7');
    expect(broken(sort([0, 2, 0]))).toContain('7');
    expect(broken(sort([0, 0, 0]))).toContain('7'); // a bin nobody uses

    const match = (answerPairs: [number, number][]): Question =>
      stamp({ ...base({ leftValues: ['a', 'b'], rightValues: ['b', 'a'] }), type: 'match', left: [t('A'), t('B')], right: [t('b'), t('a')], answerPairs });
    expect(broken(match([[0, 1]]))).toContain('7');
    expect(broken(match([[0, 1], [1, 1]]))).toContain('7');
    expect(broken(match([[0, 1], [0, 0]]))).toContain('7');
  });

  it('8: rejects tiles that cannot spell the answer, too few spare tiles, or a sound-alike that can also be spelled', () => {
    const tiles = (bank: string[], answer: string, slots: number): Question =>
      stamp({ ...base({ word: answer, parts: answer.split('') }), type: 'tiles', slots, bank, answer });
    expect(broken(tiles(['c', 'a', 'x', 'o', 'p'], 'cat', 3))).toContain('8');
    expect(broken(tiles(['c', 'a', 't', 'x'], 'cat', 3))).toContain('8');
    expect(broken(tiles(['c', 'a', 't', 'x', 'o'], 'cat', 2))).toContain('8');
    // Each tile can be used once: "see" needs two e tiles.
    expect(broken(tiles(['s', 'e', 'a', 'x'], 'see', 3))).toContain('8');
    expect(broken(tiles(['s', 'e', 'e', 'a', 'x'], 'see', 3))).toEqual([]);
    // With the sound-alike list, a bank that can also spell "sea" is refused.
    expect(broken(tiles(['s', 'e', 'e', 'a', 'x'], 'see', 3), { soundAlikes: [['see', 'sea']] })).toContain('8');
    expect(broken(tiles(['s', 'e', 'e', 'o', 'x'], 'see', 3), { soundAlikes: [['see', 'sea']] })).toEqual([]);
  });

  it('9: rejects two different questions from one seed', () => {
    expect(validateRepeatable(choice(), choice())).toEqual([]);
    expect(validateRepeatable(choice(), choice({ answerIndex: 2 }))[0]).toMatch(/^9:/);
  });

  it('10: rejects a level with too few different questions, or more than its pool', () => {
    const many = (count: number): Question[] => Array.from({ length: 300 }, (_, i) => choice({ facts: { n: i % count, options: [2, 3, 4] }, answerIndex: i % 3 }));
    expect(validateSeries(many(8))).toEqual([]);
    expect(validateSeries(many(7)).some((problem) => problem.startsWith('10:'))).toBe(true);
    expect(validateSeries(many(2), 2)).toEqual([]);
    expect(validateSeries(many(1), 2).some((problem) => problem.startsWith('10:'))).toBe(true);
    expect(validateSeries(many(3), 2).some((problem) => problem.startsWith('10:'))).toBe(true);
    expect(validateSeries(many(9), 12)).toEqual([]);
    expect(validateSeries(many(7), 12).some((problem) => problem.startsWith('10:'))).toBe(true);
  });

  it('11: rejects an answer that sits in one place too often, and a fixed-order answer that is hardly ever right', () => {
    const series = (indexes: number[], change: Partial<Extract<Question, { type: 'choice' }>> = {}): Question[] =>
      indexes.map((answerIndex, i) => choice({ facts: { n: i, options: [2, 3, 4] }, answerIndex, ...change }));
    const share = (first: number): number[] => Array.from({ length: 300 }, (_, i) => (i < first ? 0 : 1 + (i % 2)));
    expect(validateSeries(series(share(100)))).toEqual([]);
    expect(validateSeries(series(share(143)))).toEqual([]); // 47.7%, under the 48% line
    expect(validateSeries(series(share(150))).some((problem) => problem.startsWith('11:'))).toBe(true); // 50%
    // Fixed order: an option that is right under 10% of the time is a problem, an uneven spread is not.
    expect(validateSeries(series(share(200), { fixedOrder: true }))).toEqual([]);
    expect(validateSeries(series(share(20), { fixedOrder: true })).some((problem) => problem.startsWith('11:'))).toBe(true);
    // Two options: up to 65% is allowed.
    const two = (first: number): Question[] =>
      Array.from({ length: 300 }, (_, i) => choice({ facts: { n: i, options: [2, 3] }, options: [t('2'), t('3')], answerIndex: i < first ? 0 : 1 }));
    expect(validateSeries(two(190))).toEqual([]);
    expect(validateSeries(two(200)).some((problem) => problem.startsWith('11:'))).toBe(true);
  });

  it('12: rejects more options than the grade allows', () => {
    const four = choice({ options: [t('1'), t('2'), t('3'), t('4')], facts: { n: 3, options: [1, 2, 3, 4] }, answerIndex: 2 });
    expect(broken(four, { grade: 'PK' })).toContain('12');
    expect(broken(four, { grade: 'K' })).toContain('12');
    expect(broken(four, { grade: '1' })).toEqual([]);
    expect(broken(four, { grade: '2' })).toEqual([]);
    expect(broken(four, { grade: 'all' })).toContain('12'); // level 1
    expect(broken(stamp({ ...four, level: 3 }), { grade: 'all' })).toEqual([]);
    expect(broken(choice(), { grade: 'PK' })).toEqual([]);
  });

  it('13: rejects missing facts, facts the oracle needs, a missing option list and a key that does not match', () => {
    expect(broken(choice({ facts: {} }))).toContain('13');
    expect(broken(choice(), { oracle: 'add' })).toContain('13'); // facts has n, not a and b
    expect(broken(choice(), { oracle: 'count' })).toEqual([]);
    expect(broken(choice({ facts: { n: 3 } }))).toContain('13');
    expect(broken(choice({ facts: { n: 3, options: [2, 3] } }))).toContain('13');
    expect(broken({ ...choice(), key: 'T-1|1|{"n":4}' })).toContain('13');
    // A question can name its own oracle.
    expect(broken(choice({ facts: { n: 3, options: [2, 3, 4], oracle: 'subtract' } }), { oracle: 'count' })).toContain('13');
    expect(broken(choice({ facts: { n: 3, options: [2, 3, 4], oracle: 'nothing' } }))).toContain('13');
  });

  it('14: rejects a listen question that shows its target or lets an option speak', () => {
    const listen = (change: Partial<Extract<Question, { type: 'choice' }>> = {}): Question =>
      choice({
        mode: 'listen',
        facts: { target: 'B', options: ['B', 'M'] },
        prompt: { text: 'Find the letter.', speak: ['Find the letter', { letter: 'B' }] },
        options: [t('B'), t('M')],
        answerIndex: 0,
        ...change,
      });
    expect(broken(listen())).toEqual([]);
    expect(broken(listen({ prompt: { text: 'Find the letter B.', speak: ['Find the letter', { letter: 'B' }] } }))).toContain('14');
    expect(broken(listen({ options: [t('B', true), t('M')] }))).toContain('14');
    expect(broken(listen({ stimulus: t('?', true) }))).toContain('14');
    expect(broken(listen({ facts: { options: ['B', 'M'], letter: 'B' } }))).toContain('14');
    // A spoken label hidden inside a row still counts.
    expect(broken(listen({ stimulus: { kind: 'row', children: [t('x', true)] } }))).toContain('14');
    // The target as part of another word is not the target being shown.
    expect(broken(listen({ facts: { target: 'at', options: ['B', 'M'] }, prompt: { text: 'Look at the letters.', speak: ['Find', { word: 'at' }] } }))).toContain('14');
    expect(broken(listen({ facts: { target: 'at', options: ['B', 'M'] }, prompt: { text: 'Find the matching word.', speak: ['Find', { word: 'at' }] } }))).toEqual([]);
  });

  it('15: rejects a read question whose words are spoken', () => {
    const read = (change: Partial<Extract<Question, { type: 'choice' }>> = {}): Question =>
      choice({
        mode: 'read',
        facts: { target: 'cat', read: ['cat'], options: ['cat', 'dog'] },
        prompt: { text: 'Which picture matches this word?', speak: ['Which picture matches this word?'] },
        stimulus: t('cat'),
        options: [t('🐱', true), t('🐶', true)],
        answerIndex: 0,
        ...change,
      });
    expect(broken(read())).toEqual([]);
    expect(broken(read({ stimulus: t('cat', true) }))).toContain('15');
    expect(broken(read({ prompt: { text: 'Which picture matches this word?', speak: ['Which picture matches', { word: 'cat' }] } }))).toContain('15');
    expect(broken(read({ prompt: { text: 'x', speak: ['Find the cat.'] } }))).toContain('15');
    expect(broken(read({ facts: { target: 'cat', options: ['cat', 'dog'] } }))).toContain('15');
  });

  it('16: rejects look-alike characters in one question', () => {
    const letters = (values: string[]): Question =>
      choice({ options: values.map((value) => t(value)), facts: { n: 3, options: values }, answerIndex: 0 });
    expect(broken(letters(['I', 'l', 'T']))).toContain('16');
    expect(broken(letters(['I', '1', 'T']))).toContain('16');
    expect(broken(letters(['O', '0', 'T']))).toContain('16');
    expect(broken(letters(['l', '1', 'T']))).toContain('16');
    expect(broken(letters(['I', 'T', 'L']))).toEqual([]);
    expect(broken(letters(['O', 'Q', 'C']))).toEqual([]);
    // Inside whole words the letters are fine.
    expect(broken(letters(['Ill', 'Oil', '10']))).toEqual([]);
    const tiles: Question = stamp({ ...base({ word: 'IT', parts: ['I', 'T'] }), type: 'tiles', slots: 2, bank: ['I', 'T', 'l', 'x'], answer: 'IT' });
    expect(broken(tiles)).toContain('16');
  });
});
