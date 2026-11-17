import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { COLORS, colorHex } from '../../src/content/data/colors';
import { describeVisual } from '../../src/engine/describe';
import type { Visual } from '../../src/engine/types';
import { GALLERY } from '../../src/screens/dev/gallerySamples';
import VisualView from '../../src/visuals/VisualView';
import { COIN_MM, DICE_CELLS, SHAPES, clockAngles, partShares, shapeTransform, unfoldHoles, wedge } from '../../src/visuals/geometry';

const KINDS = [
  'emojiGroup', 'text', 'shape', 'solid', 'tenFrame', 'baseTen', 'numberLine', 'equation', 'sequence', 'matrix', 'clock',
  'coins', 'graph', 'ruler', 'fraction', 'row', 'bar', 'array', 'tally', 'scale', 'foldPunch',
];

function draw(visual: Visual): HTMLElement {
  return render(<VisualView visual={visual} />).container;
}

describe('every picture', () => {
  const samples = GALLERY.flatMap((section) => section.samples.map((sample) => [`${section.title}: ${sample.label}`, sample.visual] as const));

  it('the gallery has at least one sample of every kind', () => {
    expect(GALLERY.map((section) => section.title)).toEqual(KINDS);
    for (const section of GALLERY) {
      expect(section.samples.length).toBeGreaterThan(0);
      for (const sample of section.samples) expect(sample.visual.kind, sample.label).toBe(section.title);
    }
  });

  it.each(samples)('%s draws, with an aria-label built from its fields', (_name, visual) => {
    const root = draw(visual).firstElementChild;
    expect(root).not.toBeNull();
    expect(root?.getAttribute('role')).toBe('img');
    expect(root?.getAttribute('aria-label')).toBe(describeVisual(visual));
    expect(root?.getAttribute('aria-label')?.length).toBeGreaterThan(0);
    expect(root?.getAttribute('data-visual')).toBe(visual.kind);
    // Nothing drawn is off the scale: no NaN or undefined slipped into the picture.
    expect(root?.outerHTML).not.toMatch(/NaN|undefined|Infinity/);
  });

  it('never puts a spoken label into what is drawn', () => {
    const html = draw({ kind: 'text', value: '?', size: 'l', speak: [{ word: 'secret' }] }).innerHTML;
    expect(html).not.toContain('secret');
  });

  it('pictures inside a row, sequence or grid each keep their own label', () => {
    const row = draw({ kind: 'row', children: [{ kind: 'text', value: '1', size: 'l' }, { kind: 'tally', count: 3 }] });
    expect([...row.querySelectorAll('[role="img"]')].map((el) => el.getAttribute('aria-label'))).toEqual(['1 and 3 tally marks', '1', '3 tally marks']);
  });
});

describe('clock', () => {
  it('the hour hand at 3:30 sits halfway between 3 and 4', () => {
    expect(clockAngles(3, 0).hour).toBe(90);
    expect(clockAngles(4, 0).hour).toBe(120);
    expect(clockAngles(3, 30).hour).toBe(105);
    expect(clockAngles(3, 30).minute).toBe(180);
    const hand = draw({ kind: 'clock', hour: 3, minute: 30 }).querySelector('[data-hand="hour"]');
    expect(hand?.getAttribute('data-angle')).toBe('105');
  });

  it('12 o\'clock points both hands straight up, and the hour hand keeps moving through the hour', () => {
    expect(clockAngles(12, 0)).toEqual({ hour: 0, minute: 0 });
    expect(clockAngles(12, 45)).toEqual({ hour: 22.5, minute: 270 });
    expect(clockAngles(7, 20).hour).toBe(220);
    expect(clockAngles(11, 59).hour).toBeCloseTo(359.5);
  });

  it('draws the hand tips where the angles say', () => {
    const clock = draw({ kind: 'clock', hour: 3, minute: 0 });
    const hour = clock.querySelector('[data-hand="hour"]');
    const minute = clock.querySelector('[data-hand="minute"]');
    // 3 o'clock: the hour hand points right, the minute hand points up.
    expect(Number(hour?.getAttribute('x2'))).toBeGreaterThan(65);
    expect(Number(hour?.getAttribute('y2'))).toBeCloseTo(50);
    expect(Number(minute?.getAttribute('x2'))).toBeCloseTo(50);
    expect(Number(minute?.getAttribute('y2'))).toBeLessThan(25);
    // The minute hand is clearly the longer one.
    expect(50 - Number(minute?.getAttribute('y2'))).toBeGreaterThan((Number(hour?.getAttribute('x2')) - 50) * 1.3);
    expect(clock.querySelectorAll('text')).toHaveLength(12);
  });
});

describe('emojiGroup', () => {
  it('draws exactly as many objects as its count, in every layout', () => {
    for (const layout of ['row', 'grid5', 'dice'] as const) {
      for (const count of [1, 3, 6]) {
        expect(draw({ kind: 'emojiGroup', emoji: '🍎', count, layout }).querySelectorAll('[data-item]'), `${layout} ${count}`).toHaveLength(count);
      }
    }
    expect(draw({ kind: 'emojiGroup', emoji: '🍎', count: 12, layout: 'grid5' }).querySelectorAll('[data-item]')).toHaveLength(12);
  });

  it('scatter puts each object in its own listed place of the 5 by 4 grid', () => {
    const slots = [0, 4, 7, 13, 19];
    const items = [...draw({ kind: 'emojiGroup', emoji: '🍎', count: 5, layout: 'scatter', slots }).querySelectorAll<HTMLElement>('[data-item]')];
    const places = items.map((item) => `${item.style.gridColumnStart || item.style.gridColumn},${item.style.gridRowStart || item.style.gridRow}`);
    expect(places).toEqual(['1,1', '5,1', '3,2', '4,3', '5,4']);
    expect(new Set(places).size).toBe(5);
  });

  it('dice puts the dots where a die has them, for 1 to 6', () => {
    expect(Object.keys(DICE_CELLS)).toEqual(['1', '2', '3', '4', '5', '6']);
    for (const [count, cells] of Object.entries(DICE_CELLS)) {
      expect(cells).toHaveLength(Number(count));
      expect(new Set(cells).size).toBe(cells.length);
      // A die face looks the same turned halfway round.
      expect(cells.map((cell) => 8 - cell).sort((a, b) => a - b)).toEqual(cells);
    }
    expect(DICE_CELLS[5]).toContain(4);
    expect(DICE_CELLS[6]).not.toContain(4);
  });

  it('crosses out the last ones for a subtraction picture', () => {
    const group = draw({ kind: 'emojiGroup', emoji: '🍪', count: 6, layout: 'row', crossed: 2 });
    const marks = [...group.querySelectorAll('[data-item]')].map((item) => item.getAttribute('data-item'));
    expect(marks).toEqual(['object', 'object', 'object', 'object', 'crossed', 'crossed']);
  });

  it('numbers each object when asked, and draws a second kind after the first', () => {
    const numbered = draw({ kind: 'emojiGroup', emoji: '🐸', count: 4, layout: 'row', numbered: true });
    // Each object is the app's drawn picture for its emoji, then its number.
    const shown = (item: Element): string => `${item.querySelector('img')?.getAttribute('data-emoji') ?? ''}${item.textContent ?? ''}`;
    expect([...numbered.querySelectorAll('[data-item]')].map(shown)).toEqual(['🐸1', '🐸2', '🐸3', '🐸4']);
    expect(numbered.querySelector('img')?.getAttribute('src')).toBe('/art/1f438.svg');
    const two = draw({ kind: 'emojiGroup', emoji: '🔴', count: 3, layout: 'row', emoji2: '🔵', count2: 2 });
    expect([...two.querySelectorAll('[data-item]')].map(shown)).toEqual(['🔴', '🔴', '🔴', '🔵', '🔵']);
  });
});

describe('shape', () => {
  it('has an outline for all fourteen shapes', () => {
    expect(Object.keys(SHAPES).sort()).toEqual(
      ['arrow', 'circle', 'diamond', 'flag', 'heart', 'hexagon', 'lShape', 'oval', 'pentagon', 'rectangle', 'square', 'star', 'trapezoid', 'triangle'],
    );
  });

  it('polygons have the right number of corners', () => {
    const corners = (name: keyof typeof SHAPES): number => {
      const outline = SHAPES[name];
      return outline.type === 'polygon' ? outline.points.split(' ').length : -1;
    };
    expect([corners('triangle'), corners('square'), corners('rectangle'), corners('pentagon'), corners('hexagon'), corners('star'), corners('diamond'), corners('trapezoid')]).toEqual([3, 4, 4, 5, 6, 10, 4, 4]);
  });

  it('every polygon stays inside its box and is centred, so a turn keeps it in place', () => {
    for (const [name, outline] of Object.entries(SHAPES)) {
      if (outline.type !== 'polygon') continue;
      const points = outline.points.split(' ').map((pair) => pair.split(',').map(Number) as [number, number]);
      for (const [x, y] of points) {
        expect(x, name).toBeGreaterThanOrEqual(0);
        expect(x, name).toBeLessThanOrEqual(100);
        expect(y, name).toBeGreaterThanOrEqual(0);
        expect(y, name).toBeLessThanOrEqual(100);
      }
    }
    // The regular shapes turn about their own centre.
    for (const name of ['triangle', 'pentagon', 'hexagon', 'star', 'square', 'diamond'] as const) {
      const outline = SHAPES[name];
      if (outline.type !== 'polygon') continue;
      const points = outline.points.split(' ').map((pair) => pair.split(',').map(Number) as [number, number]);
      const cx = points.reduce((sum, [x]) => sum + x, 0) / points.length;
      const cy = points.reduce((sum, [, y]) => sum + y, 0) / points.length;
      expect(cx, name).toBeCloseTo(50, 0);
      expect(cy, name).toBeCloseTo(50, 0);
    }
  });

  it('turns clockwise and mirrors before turning', () => {
    expect(shapeTransform(0, false)).toBe('rotate(0 50 50)');
    expect(shapeTransform(90, false)).toBe('rotate(90 50 50)');
    expect(shapeTransform(90, true)).toBe('rotate(90 50 50) translate(100 0) scale(-1 1)');
    const turned = draw({ kind: 'shape', shape: 'lShape', color: 'blue', size: 'm', rotation: 90, flip: true });
    expect(turned.querySelector('g')?.getAttribute('transform')).toBe('rotate(90 50 50) translate(100 0) scale(-1 1)');
  });

  it('fills with the named colour and always has a dark outline', () => {
    const polygon = draw({ kind: 'shape', shape: 'square', color: 'green', size: 'm', rotation: 0 }).querySelector('polygon');
    expect(polygon?.getAttribute('fill')).toBe(COLORS.green);
    expect(polygon?.getAttribute('stroke')).toBe('#16213a');
    expect(colorHex('purple')).toBe('#8E24AA');
    expect(colorHex('#123456')).toBe('#123456');
  });

  it('an open shape is an outline with a gap', () => {
    const open = draw({ kind: 'shape', shape: 'circle', color: 'blue', size: 'm', rotation: 0, open: true }).querySelector('circle');
    expect(open?.getAttribute('fill')).toBe('none');
    expect(open?.getAttribute('stroke-dasharray')).toBe('86 14');
    const closed = draw({ kind: 'shape', shape: 'circle', color: 'blue', size: 'm', rotation: 0 }).querySelector('circle');
    expect(closed?.getAttribute('stroke-dasharray')).toBeNull();
  });

  it('small, medium and large are different widths', () => {
    const width = (size: 's' | 'm' | 'l'): number => Number(draw({ kind: 'shape', shape: 'circle', color: 'red', size, rotation: 0 }).querySelector('svg')?.getAttribute('width'));
    expect(width('s')).toBeLessThan(width('m'));
    expect(width('m')).toBeLessThan(width('l'));
  });
});

describe('number pictures', () => {
  it('a ten frame has 10 boxes for each frame and one counter for each one filled', () => {
    for (const [filled, frames] of [[0, 1], [7, 1], [10, 1], [14, 2], [20, 2]] as const) {
      const frame = draw({ kind: 'tenFrame', filled, frames });
      expect(frame.querySelectorAll('rect'), `${filled}`).toHaveLength(frames * 10);
      expect(frame.querySelectorAll('[data-counter]'), `${filled}`).toHaveLength(filled);
    }
  });

  it('a ten frame fills the top row first', () => {
    const counters = [...draw({ kind: 'tenFrame', filled: 6, frames: 1 }).querySelectorAll('[data-counter]')];
    const ys = counters.map((counter) => Number(counter.getAttribute('cy')));
    expect(new Set(ys.slice(0, 5)).size).toBe(1);
    expect(ys[5]).toBeGreaterThan(ys[0] as number);
  });

  it('base-ten blocks: one flat for each hundred, one rod for each ten, one cube for each one', () => {
    const blocks = draw({ kind: 'baseTen', hundreds: 2, tens: 4, ones: 3 });
    expect(blocks.querySelectorAll('[data-block="hundred"]')).toHaveLength(2);
    expect(blocks.querySelectorAll('[data-block="ten"]')).toHaveLength(4);
    expect(blocks.querySelectorAll('[data-block="one"]')).toHaveLength(3);
    expect(draw({ kind: 'baseTen', hundreds: 0, tens: 0, ones: 9 }).querySelectorAll('[data-block="one"]')).toHaveLength(9);
  });

  it('a number line labels every mark, puts a dot where marked, and a box where hidden', () => {
    const line = draw({ kind: 'numberLine', min: 0, max: 50, step: 5, marked: [20], hidden: [25] });
    const labels = [...line.querySelectorAll('text')].map((text) => text.textContent);
    expect(labels).toEqual(['0', '5', '10', '15', '20', '30', '35', '40', '45', '50']);
    expect(line.querySelectorAll('[data-hidden]')).toHaveLength(1);
    expect(line.querySelectorAll('[data-dot]')).toHaveLength(1);
    expect(draw({ kind: 'numberLine', min: 0, max: 10, step: 1 }).querySelectorAll('text')).toHaveLength(11);
  });

  it('an equation shows a box for the blank and proper signs', () => {
    const equation = draw({ kind: 'equation', parts: [9, '-', 'blank', '=', 5] });
    expect(equation.querySelectorAll('[data-blank]')).toHaveLength(1);
    expect(equation.textContent).toBe('9−=5');
  });

  it('tally marks come in bundles of five', () => {
    const bundles = (count: number): string[] => [...draw({ kind: 'tally', count }).querySelectorAll('[data-bundle]')].map((g) => g.getAttribute('data-bundle') ?? '');
    expect(bundles(3)).toEqual(['3']);
    expect(bundles(5)).toEqual(['5']);
    expect(bundles(13)).toEqual(['5', '5', '3']);
    // A bundle of five is four upright strokes and one across.
    expect(draw({ kind: 'tally', count: 5 }).querySelectorAll('line')).toHaveLength(5);
    expect(draw({ kind: 'tally', count: 4 }).querySelectorAll('line')).toHaveLength(4);
  });

  it('an array has rows times columns objects', () => {
    expect(draw({ kind: 'array', rows: 3, cols: 4, emoji: '⭐' }).querySelectorAll('[data-item]')).toHaveLength(12);
  });

  it('a balance scale shows every block, with a question mark on the blank', () => {
    const scale = draw({ kind: 'scale', left: [3, 'blank'], right: [8] });
    expect([...scale.querySelectorAll('[data-block]')].map((g) => g.getAttribute('data-block'))).toEqual(['3', 'blank', '8']);
    expect([...scale.querySelectorAll('text')].map((t) => t.textContent)).toEqual(['3', '?', '8']);
  });
});

describe('coins', () => {
  it('are drawn in their true size order: dime, penny, nickel, quarter', () => {
    const coins = draw({ kind: 'coins', coins: ['penny', 'nickel', 'dime', 'quarter'] });
    const radius = (name: string): number => Number(coins.querySelector(`[data-coin="${name}"]`)?.getAttribute('data-radius'));
    expect(radius('dime')).toBeLessThan(radius('penny'));
    expect(radius('penny')).toBeLessThan(radius('nickel'));
    expect(radius('nickel')).toBeLessThan(radius('quarter'));
    expect(radius('quarter') / radius('dime')).toBeCloseTo(COIN_MM.quarter / COIN_MM.dime, 1);
  });

  it('only the dime and the quarter have ridged edges, and only the penny is copper', () => {
    const coins = draw({ kind: 'coins', coins: ['penny', 'nickel', 'dime', 'quarter'] });
    const ridged = (name: string): boolean => coins.querySelector(`[data-coin="${name}"] [data-ridged]`) !== null;
    expect([ridged('penny'), ridged('nickel'), ridged('dime'), ridged('quarter')]).toEqual([false, false, true, true]);
    const fill = (name: string): string => coins.querySelector(`[data-coin="${name}"] circle`)?.getAttribute('fill') ?? '';
    expect(fill('penny')).not.toBe(fill('nickel'));
    expect(fill('nickel')).toBe(fill('dime'));
  });

  it('carry no words or numbers that would give away the name or value', () => {
    const coins = draw({ kind: 'coins', coins: ['penny', 'nickel', 'dime', 'quarter'] });
    expect(coins.querySelectorAll('text')).toHaveLength(0);
    expect(coins.textContent).toBe('');
  });

  it('draws one coin for each coin listed, repeats included', () => {
    expect(draw({ kind: 'coins', coins: ['dime', 'dime', 'penny'] }).querySelectorAll('[data-coin]')).toHaveLength(3);
  });
});

describe('graph, ruler and fraction', () => {
  it('a picture graph draws one mark for each one counted', () => {
    const graph = draw({ kind: 'graph', type: 'picture', categories: [{ label: 'apples', emoji: '🍎', value: 4 }, { label: 'bananas', emoji: '🍌', value: 0 }] });
    expect(graph.querySelectorAll('[data-row="apples"] [data-mark]')).toHaveLength(4);
    expect(graph.querySelectorAll('[data-row="bananas"] [data-mark]')).toHaveLength(0);
  });

  it('a bar graph draws bars in proportion, with a numbered scale', () => {
    const graph = draw({ kind: 'graph', type: 'bar', categories: [{ label: 'ducks', emoji: '🦆', value: 3 }, { label: 'frogs', emoji: '🐸', value: 6 }] });
    const widths = [...graph.querySelectorAll('[data-bar]')].map((bar) => Number(bar.getAttribute('width')));
    expect(widths[1]).toBe((widths[0] as number) * 2);
    expect([...graph.querySelectorAll('text')].map((t) => t.textContent)).toEqual(['0', '1', '2', '3', '4', '5', '6']);
  });

  it('the object on a ruler runs from its start mark to its end mark exactly', () => {
    for (const object of ['pencil', 'crayon', 'ribbon'] as const) {
      const ruler = draw({ kind: 'ruler', lengthUnits: 3, startUnit: 2, object });
      const thing = ruler.querySelector('[data-object]');
      const marks = [...ruler.querySelectorAll('line')].map((line) => Number(line.getAttribute('x1')));
      expect(Number(thing?.getAttribute('data-from')), object).toBe(marks[2]);
      expect(Number(thing?.getAttribute('data-to')), object).toBe(marks[5]);
      expect([...ruler.querySelectorAll('text')].map((t) => t.textContent).slice(0, 7)).toEqual(['0', '1', '2', '3', '4', '5', '6']);
    }
  });

  it('a fraction draws every part and shades the right number', () => {
    for (const shape of ['circle', 'rectangle'] as const) {
      const fraction = draw({ kind: 'fraction', shape, parts: 4, shaded: 3, equal: true });
      expect(fraction.querySelectorAll('[data-part]')).toHaveLength(4);
      expect(fraction.querySelectorAll('[data-part="shaded"]')).toHaveLength(3);
    }
    expect(draw({ kind: 'fraction', shape: 'circle', parts: 2, shaded: 0, equal: true }).querySelectorAll('[data-part="shaded"]')).toHaveLength(0);
  });

  it('equal parts are the same size, unequal parts are clearly different, and both fill the whole shape', () => {
    for (const parts of [2, 3, 4, 6, 8]) {
      const equal = partShares(parts, true);
      expect(new Set(equal.map((share) => share.toFixed(6))).size).toBe(1);
      expect(equal.reduce((a, b) => a + b, 0)).toBeCloseTo(1);
      const unequal = partShares(parts, false);
      expect(unequal.reduce((a, b) => a + b, 0)).toBeCloseTo(1);
      expect(Math.max(...unequal) / Math.min(...unequal), `${parts} parts`).toBeGreaterThan(1.6);
    }
    const widths = [...draw({ kind: 'fraction', shape: 'rectangle', parts: 4, shaded: 1, equal: false }).querySelectorAll('rect')].map((r) => Number(r.getAttribute('width')));
    expect(Math.max(...widths) / Math.min(...widths)).toBeGreaterThan(1.6);
  });

  it('a wedge is a slice of the circle, and a whole circle is drawn as a full round', () => {
    expect(wedge(50, 50, 40, 0, 90)).toBe('M 50 50 L 50.00 10.00 A 40 40 0 0 1 90.00 50.00 Z');
    expect(wedge(50, 50, 40, 0, 270)).toContain(' 0 1 1 ');
    expect(wedge(50, 50, 40, 0, 360)).not.toContain('L');
  });

  it('a bar is as long as its units, flat or upright', () => {
    const length = (visual: Visual): [number, number] => {
      const rect = draw(visual).querySelector('rect');
      return [Number(rect?.getAttribute('width')), Number(rect?.getAttribute('height'))];
    };
    const [w3] = length({ kind: 'bar', length: 3, color: 'red', orientation: 'horizontal' });
    const [w7, h7] = length({ kind: 'bar', length: 7, color: 'red', orientation: 'horizontal' });
    expect(w7 / w3).toBeCloseTo(7 / 3);
    const [wUp, hUp] = length({ kind: 'bar', length: 7, color: 'red', orientation: 'vertical' });
    expect([wUp, hUp]).toEqual([h7, w7]);
  });
});

describe('grids and paper', () => {
  it('a matrix has 4 or 9 boxes with one empty', () => {
    const cell: Visual = { kind: 'text', value: 'a', size: 'm' };
    const two = draw({ kind: 'matrix', cells: [cell, cell, cell, 'blank'] });
    expect(two.querySelectorAll('[data-cell]')).toHaveLength(4);
    expect(two.querySelectorAll('[data-cell="blank"]')).toHaveLength(1);
    const three = draw({ kind: 'matrix', cells: [cell, cell, cell, cell, cell, cell, cell, cell, 'blank'] });
    expect(three.querySelectorAll('[data-cell]')).toHaveLength(9);
  });

  it('a sequence shows its items in order with a box for the missing one', () => {
    const sequence = draw({ kind: 'sequence', items: [{ kind: 'text', value: '5', size: 'l' }, 'blank', { kind: 'text', value: '15', size: 'l' }] });
    expect(sequence.querySelectorAll('[data-blank]')).toHaveLength(1);
    expect(sequence.textContent).toBe('5?15');
  });

  it('unfolding a vertical fold copies each hole to column 3 minus its column', () => {
    expect(unfoldHoles('vertical', [{ col: 0, row: 0 }])).toEqual([{ col: 0, row: 0 }, { col: 3, row: 0 }]);
    expect(unfoldHoles('vertical', [{ col: 1, row: 2 }])).toEqual([{ col: 1, row: 2 }, { col: 2, row: 2 }]);
  });

  it('unfolding a horizontal fold copies each hole to row 3 minus its row', () => {
    expect(unfoldHoles('horizontal', [{ col: 0, row: 0 }])).toEqual([{ col: 0, row: 0 }, { col: 0, row: 3 }]);
    expect(unfoldHoles('horizontal', [{ col: 1, row: 1 }, { col: 3, row: 0 }])).toEqual([
      { col: 3, row: 0 },
      { col: 1, row: 1 },
      { col: 1, row: 2 },
      { col: 3, row: 3 },
    ]);
  });

  it('folded paper shows only the half that shows, with its holes; unfolded shows the whole square', () => {
    const folded = draw({ kind: 'foldPunch', fold: 'vertical', state: 'folded', holes: [{ col: 0, row: 0 }] });
    expect(folded.querySelector('rect')?.getAttribute('width')).toBe('48'); // two of four columns
    expect(folded.querySelector('[data-fold]')?.getAttribute('data-fold')).toBe('edge');
    expect(folded.querySelectorAll('[data-hole]')).toHaveLength(1);
    const open = draw({ kind: 'foldPunch', fold: 'vertical', state: 'unfolded', holes: unfoldHoles('vertical', [{ col: 0, row: 0 }]) });
    expect(open.querySelector('rect')?.getAttribute('width')).toBe('96');
    expect(open.querySelector('[data-fold]')?.getAttribute('data-fold')).toBe('crease');
    expect([...open.querySelectorAll('[data-hole]')].map((hole) => hole.getAttribute('data-hole'))).toEqual(['0,0', '3,0']);
    const flat = draw({ kind: 'foldPunch', fold: 'horizontal', state: 'folded', holes: [{ col: 3, row: 1 }] });
    expect(flat.querySelector('rect')?.getAttribute('height')).toBe('48');
  });
});
