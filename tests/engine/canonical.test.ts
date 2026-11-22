// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { canonicalJson, questionKey, samePicture } from '../../src/engine/canonical';
import type { ShapeName, Visual } from '../../src/engine/types';

function shape(name: ShapeName, rotation = 0, extra: Partial<Extract<Visual, { kind: 'shape' }>> = {}): Visual {
  return { kind: 'shape', shape: name, color: 'red', size: 'm', rotation, ...extra };
}

describe('canonicalJson', () => {
  it('ignores the order of object keys, at every depth', () => {
    expect(canonicalJson({ b: 1, a: { d: [1, { z: 1, y: 2 }], c: 2 } })).toBe(canonicalJson({ a: { c: 2, d: [1, { y: 2, z: 1 }] }, b: 1 }));
  });

  it('keeps the order of arrays', () => {
    expect(canonicalJson([1, 2])).not.toBe(canonicalJson([2, 1]));
  });

  it('tells a number from the same digits as text', () => {
    expect(canonicalJson({ n: 3 })).not.toBe(canonicalJson({ n: '3' }));
  });
});

describe('questionKey', () => {
  it('leaves the option list out, so option order does not make a new question', () => {
    expect(questionKey('M-K-C4', 1, { a: 3, b: 4, options: [6, 7, 8] })).toBe(questionKey('M-K-C4', 1, { b: 4, a: 3, options: [7, 8, 9] }));
  });

  it('changes with the skill, the level and any other fact', () => {
    const key = questionKey('M-K-C4', 1, { a: 3, b: 4 });
    expect(questionKey('M-K-C5', 1, { a: 3, b: 4 })).not.toBe(key);
    expect(questionKey('M-K-C4', 2, { a: 3, b: 4 })).not.toBe(key);
    expect(questionKey('M-K-C4', 1, { a: 4, b: 3 })).not.toBe(key);
  });
});

describe('samePicture', () => {
  it('number pairs are the same picture only with the same pairs in the same order, dots and all', () => {
    const pairs = (list: [number, number | 'blank'][], dots?: true): Visual => ({ kind: 'pairs', pairs: list.map(([from, to]) => ({ from, to })), ...(dots ? { dots } : {}) });
    expect(samePicture(pairs([[6, 9], [5, 'blank']]), pairs([[6, 9], [5, 'blank']]))).toBe(true);
    expect(samePicture(pairs([[6, 9], [5, 'blank']]), pairs([[5, 'blank'], [6, 9]]))).toBe(false);
    expect(samePicture(pairs([[6, 9], [5, 'blank']]), pairs([[6, 9], [5, 8]]))).toBe(false);
    expect(samePicture(pairs([[6, 7]], true), pairs([[6, 7]]))).toBe(false);
    // A spoken label is not part of the picture.
    expect(samePicture({ ...pairs([[6, 7]]), speak: ['six'] }, pairs([[6, 7]]))).toBe(true);
  });

  it('a turned circle is still a circle', () => {
    expect(samePicture(shape('circle', 0), shape('circle', 137))).toBe(true);
  });

  it('a square turned a quarter turn is the same square, and an eighth turn is not', () => {
    expect(samePicture(shape('square', 0), shape('square', 90))).toBe(true);
    expect(samePicture(shape('square', 0), shape('square', 270))).toBe(true);
    expect(samePicture(shape('square', 0), shape('square', 45))).toBe(false);
  });

  it('knows each shape\'s turn symmetry', () => {
    expect(samePicture(shape('rectangle', 0), shape('rectangle', 180))).toBe(true);
    expect(samePicture(shape('rectangle', 0), shape('rectangle', 90))).toBe(false);
    expect(samePicture(shape('triangle', 0), shape('triangle', 120))).toBe(true);
    expect(samePicture(shape('triangle', 0), shape('triangle', 180))).toBe(false);
    expect(samePicture(shape('hexagon', 0), shape('hexagon', 60))).toBe(true);
    expect(samePicture(shape('star', 0), shape('star', 72))).toBe(true);
    expect(samePicture(shape('heart', 0), shape('heart', 180))).toBe(false);
    expect(samePicture(shape('arrow', 0), shape('arrow', 90))).toBe(false);
    expect(samePicture(shape('arrow', 0), shape('arrow', 360))).toBe(true);
    expect(samePicture(shape('arrow', -90), shape('arrow', 270))).toBe(true);
  });

  it('a diamond is a square standing on a corner: the same picture as a square turned 45 degrees', () => {
    expect(samePicture(shape('diamond', 0), shape('square', 45))).toBe(true);
    expect(samePicture(shape('diamond', 45), shape('square', 0))).toBe(true);
    expect(samePicture(shape('diamond', 0), shape('diamond', 90))).toBe(true);
    // Upright, they are two different pictures a child can tell apart.
    expect(samePicture(shape('diamond', 0), shape('square', 0))).toBe(false);
  });

  it('a flipped symmetric shape is unchanged, a flipped L or flag is not', () => {
    expect(samePicture(shape('heart'), shape('heart', 0, { flip: true }))).toBe(true);
    expect(samePicture(shape('square'), shape('square', 0, { flip: true }))).toBe(true);
    expect(samePicture(shape('lShape'), shape('lShape', 0, { flip: true }))).toBe(false);
    expect(samePicture(shape('flag'), shape('flag', 0, { flip: true }))).toBe(false);
    expect(samePicture(shape('lShape', 90), shape('lShape', 0))).toBe(false);
  });

  it('colour, size, kind of shape and an open outline all make a different picture', () => {
    expect(samePicture(shape('circle'), { ...shape('circle'), color: 'blue' } as Visual)).toBe(false);
    expect(samePicture(shape('circle'), { ...shape('circle'), size: 'l' } as Visual)).toBe(false);
    expect(samePicture(shape('circle'), shape('oval'))).toBe(false);
    expect(samePicture(shape('circle'), shape('circle', 0, { open: true }))).toBe(false);
  });

  it('ignores spoken labels', () => {
    const a: Visual = { kind: 'text', value: '3', size: 'xl', speak: [{ number: 3 }] };
    const b: Visual = { kind: 'text', value: '3', size: 'xl' };
    expect(samePicture(a, b)).toBe(true);
    expect(samePicture(a, { kind: 'text', value: '4', size: 'xl' })).toBe(false);
  });

  it('scattered groups are the same when they fill the same places, in any listed order', () => {
    const a: Visual = { kind: 'emojiGroup', emoji: '🍎', count: 3, layout: 'scatter', slots: [1, 5, 9] };
    const b: Visual = { kind: 'emojiGroup', emoji: '🍎', count: 3, layout: 'scatter', slots: [9, 1, 5] };
    const c: Visual = { kind: 'emojiGroup', emoji: '🍎', count: 3, layout: 'scatter', slots: [1, 5, 10] };
    expect(samePicture(a, b)).toBe(true);
    expect(samePicture(a, c)).toBe(false);
    expect(samePicture(a, { kind: 'emojiGroup', emoji: '🍎', count: 3, layout: 'row' })).toBe(false);
    expect(samePicture(a, { ...a, emoji: '⭐' } as Visual)).toBe(false);
  });

  it('looks inside rows, sequences and grids', () => {
    const row = (turn: number): Visual => ({ kind: 'row', children: [shape('square', turn), shape('lShape')] });
    expect(samePicture(row(0), row(90))).toBe(true);
    expect(samePicture(row(0), { kind: 'row', children: [shape('lShape'), shape('square')] })).toBe(false);
    const sequence = (last: Visual | 'blank'): Visual => ({ kind: 'sequence', items: [shape('circle'), last] });
    expect(samePicture(sequence('blank'), sequence('blank'))).toBe(true);
    expect(samePicture(sequence('blank'), sequence(shape('circle')))).toBe(false);
  });

  it('coins and punched holes do not depend on the order they are listed in', () => {
    expect(samePicture({ kind: 'coins', coins: ['dime', 'penny'] }, { kind: 'coins', coins: ['penny', 'dime'] })).toBe(true);
    expect(samePicture({ kind: 'coins', coins: ['dime', 'penny'] }, { kind: 'coins', coins: ['dime', 'dime'] })).toBe(false);
    const paper = (holes: { col: number; row: number }[]): Visual => ({ kind: 'foldPunch', fold: 'vertical', state: 'unfolded', holes });
    expect(samePicture(paper([{ col: 0, row: 0 }, { col: 3, row: 0 }]), paper([{ col: 3, row: 0 }, { col: 0, row: 0 }]))).toBe(true);
    expect(samePicture(paper([{ col: 0, row: 0 }, { col: 3, row: 0 }]), paper([{ col: 0, row: 0 }, { col: 0, row: 3 }]))).toBe(false);
  });
});
