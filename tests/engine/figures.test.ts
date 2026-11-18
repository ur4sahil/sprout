// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { FIGURES, area, figureFor, inside } from '../../src/engine/figures';
import type { FigureId } from '../../src/engine/figures';

// The pieces of every figure fit it exactly (the owner's request, Nov 18, 2026: no triangle that cannot fit the square).
describe.each(Object.keys(FIGURES) as FigureId[])('the figure %s', (id) => {
  const figure = FIGURES[id];

  it('is covered by its pieces exactly: their areas add up to the whole, and each piece lies inside it', () => {
    const total = figure.slots.reduce((sum, slot) => sum + area(slot), 0);
    expect(Math.abs(total - area(figure.outline))).toBeLessThan(0.5);
    for (const slot of figure.slots) {
      const [cx, cy] = [slot.reduce((s, [x]) => s + x, 0) / slot.length, slot.reduce((s, [, y]) => s + y, 0) / slot.length];
      expect(inside([cx, cy], figure.outline)).toBe(true);
    }
  });

  it('has pieces all the same size, and an odd piece that is not that size and shape', () => {
    const sizes = figure.slots.map(area);
    for (const size of sizes) expect(Math.abs(size - (sizes[0] ?? 0))).toBeLessThan(0.5);
    expect(Math.abs(area(figure.odd) - (sizes[0] ?? 0))).toBeGreaterThan(1);
  });

  it('stays inside its 100 by 100 box', () => {
    for (const [x, y] of [...figure.outline, ...figure.slots.flat()]) {
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThanOrEqual(100);
      expect(y).toBeGreaterThanOrEqual(0);
      expect(y).toBeLessThanOrEqual(100);
    }
  });

  it('is found by what it is made of', () => {
    expect(figureFor(figure.whole, figure.piece, figure.slots.length)).toBeTruthy();
  });
});
