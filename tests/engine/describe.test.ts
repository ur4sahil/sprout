// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { describeVisual, sayText } from '../../src/engine/describe';
import type { Visual } from '../../src/engine/types';

describe('sayText', () => {
  it('writes every kind of part and tidies the spaces round punctuation', () => {
    expect(sayText(['Start at', { number: 4 }, '. Count on', { number: 2 }, 'more.'])).toBe('Start at 4. Count on 2 more.');
    expect(sayText(['Find the letter', { letter: 'B' }])).toBe('Find the letter B');
    expect(sayText([{ word: 'cat' }, 'and', { time: { hour: 3, minute: 5 } }, 'and', { cents: 25 }])).toBe('cat and 3:05 and 25¢');
    // A letter sound is written between slashes.
    expect(sayText(['Bat starts with', { sound: 'b' }, '.'])).toBe('Bat starts with /b/.');
    expect(sayText(['Cake has', { sound: 'long-a' }, ', and cat has', { sound: 'a' }, '.'])).toBe('Cake has /ā/, and cat has /a/.');
    expect(describeVisual({ kind: 'text', value: 'b', size: 'l', speak: [{ sound: 'b' }] })).toBe('b');
  });
});

describe('describeVisual', () => {
  const cases: [Visual | 'blank', string][] = [
    ['blank', 'blank'],
    [{ kind: 'emojiGroup', emoji: '🍎', count: 3, layout: 'row' }, '3 🍎'],
    [{ kind: 'emojiGroup', emoji: '🍎', count: 5, layout: 'row', crossed: 2 }, '5 🍎, 2 crossed out'],
    [{ kind: 'emojiGroup', emoji: '🍎', count: 2, layout: 'row', emoji2: '🍌', count2: 3 }, '2 🍎 and 3 🍌'],
    [{ kind: 'emojiGroup', emoji: '🍎', count: 4, layout: 'scatter', slots: [1, 2, 3, 4] }, '4 🍎, scattered'],
    [{ kind: 'emojiGroup', emoji: '🍎', count: 4, layout: 'dice' }, '4 🍎, as dots on a die'],
    [{ kind: 'emojiGroup', emoji: '🍎', count: 8, layout: 'grid5' }, '8 🍎, in rows of five'],
    [{ kind: 'text', value: '7', size: 'xl' }, '7'],
    [{ kind: 'shape', shape: 'circle', color: 'red', size: 'm', rotation: 0 }, 'red circle'],
    [{ kind: 'shape', shape: 'lShape', color: 'blue', size: 'l', rotation: 90, flip: true }, 'large blue lShape, flipped, turned 90 degrees'],
    [{ kind: 'solid', solid: 'cube' }, 'cube'],
    [{ kind: 'tenFrame', filled: 7, frames: 1 }, 'ten frame with 7 counters'],
    [{ kind: 'tenFrame', filled: 1, frames: 2 }, 'two ten frames with 1 counter'],
    [{ kind: 'baseTen', hundreds: 0, tens: 3, ones: 4 }, '3 tens, 4 ones'],
    [{ kind: 'baseTen', hundreds: 1, tens: 0, ones: 1 }, '1 hundred, 1 one'],
    [{ kind: 'numberLine', min: 0, max: 10, step: 1, marked: [4] }, 'number line from 0 to 10 by 1, dot at 4'],
    [{ kind: 'equation', parts: [3, '+', 'blank', '=', 7] }, '3 + □ = 7'],
    [{ kind: 'sequence', items: [{ kind: 'text', value: 'A', size: 'l' }, 'blank'] }, 'A, blank'],
    [{ kind: 'clock', hour: 3, minute: 30 }, 'clock showing 3:30'],
    [{ kind: 'coins', coins: ['dime', 'penny'] }, 'dime, penny'],
    [{ kind: 'ruler', lengthUnits: 4, startUnit: 2, object: 'pencil' }, 'pencil on a ruler from 2 to 6'],
    [{ kind: 'fraction', shape: 'circle', parts: 4, shaded: 1, equal: true }, 'circle in 4 equal parts, 1 shaded'],
    [{ kind: 'row', children: [{ kind: 'text', value: '1', size: 'l' }, { kind: 'text', value: '2', size: 'l' }] }, '1 and 2'],
    [{ kind: 'bar', length: 1, color: 'red', orientation: 'horizontal' }, 'red bar 1 unit long'],
    [{ kind: 'array', rows: 2, cols: 3, emoji: '⭐' }, '2 rows of 3 ⭐'],
    // A count of 1 never takes a plural (the owner's list, Nov 22, 2026): "1 row of 7", not "1 rows of 7".
    [{ kind: 'array', rows: 1, cols: 7, emoji: '🟩' }, '1 row of 7 🟩'],
    [{ kind: 'fraction', shape: 'rectangle', parts: 1, shaded: 1, equal: true }, 'rectangle in 1 equal part, 1 shaded'],
    [{ kind: 'tally', count: 7 }, '7 tally marks'],
    [{ kind: 'tally', count: 1 }, '1 tally mark'],
    [{ kind: 'scale', left: [3, 'blank'], right: [8] }, 'balance scale: 3 and □ on the left, 8 on the right'],
    [{ kind: 'foldPunch', fold: 'vertical', state: 'folded', holes: [{ col: 0, row: 0 }] }, 'folded paper, vertical fold, hole at (0,0)'],
    [{ kind: 'foldPunch', fold: 'vertical', state: 'unfolded', holes: [{ col: 0, row: 0 }, { col: 1, row: 0 }] }, 'unfolded paper, vertical fold, holes at (0,0) (1,0)'],
    [{ kind: 'graph', type: 'bar', categories: [{ label: 'cats', emoji: '🐱', value: 3 }, { label: 'dogs', emoji: '🐶', value: 5 }] }, 'bar graph: cats 3, dogs 5'],
    [{ kind: 'matrix', cells: [{ kind: 'text', value: 'a', size: 'm' }, 'blank'] }, 'grid: a | blank'],
  ];
  it.each(cases)('describes %j', (visual, expected) => {
    expect(describeVisual(visual)).toBe(expected);
  });

  it('never includes the spoken label, which could give away an answer', () => {
    expect(describeVisual({ kind: 'text', value: '?', size: 'l', speak: [{ word: 'secret' }] })).toBe('?');
  });
});
