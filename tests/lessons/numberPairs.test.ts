// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { numberAnalogyLesson } from '../../src/lessons/more/reasoning';
import { LESSONS as PART2 } from '../../src/lessons/part2/reasoning';
import type { Lesson, Piece, Scene } from '../../src/lessons/types';

// Number analogies (R-A8) in the lessons (the owner's choice, Nov 22, 2026): the pairs stand one a line, each in its
// own light box, as the questions draw them; and the first lesson starts with "goes up by 1" and dots.

const scenes = (lesson: Lesson): Scene[] => lesson.parts.flatMap((part) => (part.kind === 'show' ? [part.moment.scene] : part.turn.why.map((each) => each.scene)));
const inside = (piece: Piece, box: Piece): boolean => piece.x >= box.x && piece.y >= box.y && piece.x + (piece.w ?? 1) <= box.x + (box.w ?? 1) && piece.y + (piece.h ?? 1) <= box.y + (box.h ?? 1);

function checkStacked(lesson: Lesson): void {
  let stacks = 0;
  for (const scene of scenes(lesson)) {
    const byId = new Map(scene.pieces.map((piece) => [piece.id, piece]));
    const panels = scene.pieces.filter((piece) => piece.look.kind === 'panel');
    const prefixes = new Set(panels.map((panel) => panel.id.replace(/p\d+$/, '')));
    for (const p of prefixes) {
      stacks += 1;
      const boxes = panels.filter((panel) => panel.id.startsWith(`${p}p`));
      expect(boxes).toHaveLength(3);
      boxes.forEach((box, i) => {
        // Each pair's two numbers and its arrow sit inside its own box, on one line.
        const own = ['f', 'a', 't'].map((part) => byId.get(`${p}${part}${i}`));
        for (const piece of own) {
          expect(piece).toBeDefined();
          expect(inside(piece as Piece, box), `${piece?.id} in ${box.id}`).toBe(true);
          expect(piece?.y).toBe(own[0]?.y);
        }
        // The boxes are stacked: the same left edge, each under the one before with room between.
        const next = boxes[i + 1];
        if (next) {
          expect(next.x).toBe(box.x);
          expect(next.y).toBeGreaterThan(box.y + (box.h ?? 1));
        }
        // A box comes before its pieces, so it is drawn behind them.
        for (const piece of own) expect(scene.pieces.indexOf(box)).toBeLessThan(scene.pieces.indexOf(piece as Piece));
      });
      // The last pair ends in the empty box to fill, or the answer once it is found.
      expect(['box', 'numeral']).toContain(byId.get(`${p}t2`)?.look.kind);
    }
  }
  expect(stacks).toBeGreaterThan(0);
}

describe('number analogies in the lessons', () => {
  it('the first lesson stacks the pairs, one a line in its own box', () => {
    checkStacked(numberAnalogyLesson());
  });

  it('the second lesson stacks the pairs too', () => {
    const make = PART2['R-A8'];
    if (!make) throw new Error('no second lesson');
    checkStacked(make());
  });

  it('the first lesson starts with "goes up by 1" and counts dots, then "goes up by 2"', () => {
    const lesson = numberAnalogyLesson();
    const said = lesson.parts.flatMap((part) => (part.kind === 'show' ? [part.moment.text] : []));
    const byOne = said.indexOf('Each number goes up by 1.');
    const byTwo = said.indexOf('Each number goes up by 2.');
    expect(byOne).toBeGreaterThan(0);
    expect(byTwo).toBeGreaterThan(byOne);
    // No other rule before it, and dots to count from the first worked pair.
    expect(said.slice(0, byOne).some((text) => /goes up by [2-9]|double|take away/i.test(text))).toBe(false);
    const firstPair = lesson.parts.find((part) => part.kind === 'show' && part.moment.text === '2 → 3');
    if (firstPair?.kind !== 'show') throw new Error('no first pair');
    expect(firstPair.moment.say).toContain('. Count the dots.');
    expect(firstPair.moment.scene.pieces.filter((piece) => piece.look.kind === 'art' && !piece.gone)).toHaveLength(2);
    // The child's two turns are the counting levels: up by 1, then up by 2.
    const turns = lesson.parts.flatMap((part) => (part.kind === 'turn' ? [part.turn.question] : []));
    expect(turns.map((question) => question.level)).toEqual([1, 2]);
    const steps = turns.map((question) => {
      const [[a, b]] = question.facts.examples as [[number, number]];
      return b - a;
    });
    expect(steps).toEqual([1, 2]);
    for (const question of turns) expect(question.stimulus).toMatchObject({ kind: 'pairs', dots: true });
  });
});
