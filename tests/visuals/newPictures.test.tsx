import { render } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { allGenerators, generateFrom } from '../../src/content/registry';
import { describeVisual } from '../../src/engine/describe';
import type { Level, Question, Visual } from '../../src/engine/types';
import { CM_PER_INCH, aboutCentimeters } from '../../src/engine/units';
import { GALLERY } from '../../src/screens/dev/gallerySamples';
import VisualView from '../../src/visuals/VisualView';
import { HOLDER, THING, clipPath, holderSpots, rectBox } from '../../src/visuals/geometry';
import styles from '../../src/visuals/visuals.module.css';

// The pictures the owner chose on Nov 22, 2026: a unit on a ruler, two rulers, a title on a graph, words under a
// picture, a rectangle drawn to its sides, plates and baskets, paper clips under a thing, a measuring cup.

function draw(visual: Visual): HTMLElement {
  return render(<VisualView visual={visual} />).container;
}

// ---- Fit: what a picture draws stays inside its own frame, and its words can be read on a phone ----

// The room a question picture has across on the smallest phone the app supports (360 wide), less the margins.
const PHONE = 320;
// The smallest text a child is asked to read, in screen pixels.
const LEGIBLE = 8;

type Point = [number, number];
const n = (el: Element, name: string): number => Number(el.getAttribute(name) ?? 0);

// Points along an SVG arc of a circle (radius r), by the SVG rule for turning its end points into a centre.
function arcPoints(x1: number, y1: number, r: number, large: number, sweep: number, x2: number, y2: number): Point[] {
  const [hx, hy] = [(x1 - x2) / 2, (y1 - y2) / 2];
  const radius = Math.max(r, Math.hypot(hx, hy));
  const k = (large === sweep ? -1 : 1) * Math.sqrt(Math.max(radius * radius - hx * hx - hy * hy, 0) / Math.max(hx * hx + hy * hy, 1e-9));
  const [cx, cy] = [k * hy + (x1 + x2) / 2, -k * hx + (y1 + y2) / 2];
  const from = Math.atan2(y1 - cy, x1 - cx);
  let turn = Math.atan2(y2 - cy, x2 - cx) - from;
  if (sweep === 1 && turn < 0) turn += 2 * Math.PI;
  if (sweep === 0 && turn > 0) turn -= 2 * Math.PI;
  return Array.from({ length: 21 }, (_, i): Point => [cx + radius * Math.cos(from + (turn * i) / 20), cy + radius * Math.sin(from + (turn * i) / 20)]);
}

// Points along an SVG path written with absolute commands, as the pictures write them.
function pathPoints(d: string): Point[] {
  const tokens = d.match(/[MLHVQCAZ]|-?\d*\.?\d+/g) ?? [];
  const points: Point[] = [];
  let [i, x, y, command] = [0, 0, 0, ''];
  const take = (): number => Number(tokens[i++]);
  const bezier = (controls: Point[]): void => {
    for (let t = 0; t <= 1.0001; t += 0.05) {
      let row = controls;
      while (row.length > 1) row = row.slice(1).map((p, j): Point => [(1 - t) * (row[j] as Point)[0] + t * p[0], (1 - t) * (row[j] as Point)[1] + t * p[1]]);
      points.push(row[0] as Point);
    }
  };
  while (i < tokens.length) {
    if (/^[A-Z]$/.test(tokens[i] ?? '')) command = tokens[i++] as string;
    if (command === 'Z') continue;
    if (command === 'M' || command === 'L') [x, y] = [take(), take()];
    else if (command === 'H') x = take();
    else if (command === 'V') y = take();
    else if (command === 'Q') {
      const [cx, cy, ex, ey] = [take(), take(), take(), take()];
      bezier([[x, y], [cx, cy], [ex, ey]]);
      [x, y] = [ex, ey];
    } else if (command === 'C') {
      const [ax, ay, bx, by, ex, ey] = [take(), take(), take(), take(), take(), take()];
      bezier([[x, y], [ax, ay], [bx, by], [ex, ey]]);
      [x, y] = [ex, ey];
    } else if (command === 'A') {
      const [r, , , large, sweep, ex, ey] = [take(), take(), take(), take(), take(), take(), take()];
      points.push(...arcPoints(x, y, r, large, sweep, ex, ey));
      [x, y] = [ex, ey];
    } else throw new Error(`a path command the test cannot read: ${command}`);
    points.push([x, y]);
  }
  return points;
}

// Every point each mark of an SVG covers: shapes by their corners or outline, text by the box its letters fill.
function marks(svg: Element): { what: string; points: Point[] }[] {
  const out: { what: string; points: Point[] }[] = [];
  for (const el of svg.querySelectorAll('*')) {
    const what = `${el.tagName}${el.textContent ? ` "${el.textContent}"` : ''}`;
    if (el.tagName === 'rect' || el.tagName === 'image') out.push({ what, points: [[n(el, 'x'), n(el, 'y')], [n(el, 'x') + n(el, 'width'), n(el, 'y') + n(el, 'height')]] });
    else if (el.tagName === 'line') out.push({ what, points: [[n(el, 'x1'), n(el, 'y1')], [n(el, 'x2'), n(el, 'y2')]] });
    else if (el.tagName === 'circle') out.push({ what, points: [[n(el, 'cx') - n(el, 'r'), n(el, 'cy') - n(el, 'r')], [n(el, 'cx') + n(el, 'r'), n(el, 'cy') + n(el, 'r')]] });
    else if (el.tagName === 'ellipse') out.push({ what, points: [[n(el, 'cx') - n(el, 'rx'), n(el, 'cy') - n(el, 'ry')], [n(el, 'cx') + n(el, 'rx'), n(el, 'cy') + n(el, 'ry')]] });
    else if (el.tagName === 'polygon') out.push({ what, points: (el.getAttribute('points') ?? '').split(' ').map((pair) => pair.split(',').map(Number) as Point) });
    else if (el.tagName === 'path') out.push({ what, points: pathPoints(el.getAttribute('d') ?? '') });
    else if (el.tagName === 'text') {
      const size = n(el, 'font-size');
      const wide = (el.textContent ?? '').length * size * 0.62;
      const anchor = el.getAttribute('text-anchor') ?? 'start';
      const left = anchor === 'middle' ? n(el, 'x') - wide / 2 : anchor === 'end' ? n(el, 'x') - wide : n(el, 'x');
      out.push({ what, points: [[left, n(el, 'y') - size * 0.78], [left + wide, n(el, 'y') + size * 0.22]] });
    }
  }
  return out;
}

// The SVG pictures a visual draws: one, or one for each plate or basket.
function svgsOf(container: HTMLElement): SVGSVGElement[] {
  return [...container.querySelectorAll('svg')];
}

// What is wrong with how a picture fits: a mark outside its frame, or words too small to read on a phone.
function fitProblems(visual: Visual): string[] {
  const problems: string[] = [];
  const name = describeVisual(visual);
  for (const svg of svgsOf(draw(visual))) {
    const [, , w, h] = (svg.getAttribute('viewBox') ?? '').split(' ').map(Number) as [number, number, number, number];
    for (const mark of marks(svg)) {
      for (const [x, y] of mark.points) {
        if (x < -0.01 || y < -0.01 || x > w + 0.01 || y > h + 0.01) problems.push(`${name}: ${mark.what} reaches (${x.toFixed(1)}, ${y.toFixed(1)}), outside 0 0 ${w} ${h}`);
      }
    }
    // Every picture shrinks to the width it is given (max-width: 100%) and keeps its shape (height: auto).
    const scales = (svg.getAttribute('class') ?? '').split(' ').some((name) => name === styles.svg || name === styles.holder);
    if (!scales) problems.push(`${name}: an svg that does not shrink to its frame`);
    const shown = svg.getAttribute('width') ? n(svg, 'width') : 96; // a plate or basket is --size-holder wide
    const pixel = (Math.min(shown, PHONE) / w) * 1;
    for (const text of svg.querySelectorAll('text')) {
      if (n(text, 'font-size') * pixel < LEGIBLE) problems.push(`${name}: "${text.textContent}" is ${(n(text, 'font-size') * pixel).toFixed(1)} pixels on a phone`);
    }
  }
  return problems;
}

const NEW_KINDS = ['twoRulers', 'measuredRect', 'holders', 'clipRow', 'measuringCup'];
const isNew = (visual: Visual): boolean => NEW_KINDS.includes(visual.kind) || (visual.kind === 'ruler' && visual.unit !== undefined);

// Every new picture the content draws, from the stimulus, the options and the working, over many seeds.
function contentPictures(): Visual[] {
  const found = new Map<string, Visual>();
  const walk = (visual: Visual | 'blank' | undefined): void => {
    if (!visual || visual === 'blank') return;
    if (isNew(visual)) found.set(JSON.stringify(visual), visual);
    if (visual.kind === 'row') visual.children.forEach(walk);
  };
  const visuals = (q: Question): (Visual | undefined)[] => [q.stimulus, q.explanation.visual, ...(q.type === 'choice' ? q.options : [])];
  for (const generator of allGenerators().filter((each) => /^M-(K-F3|1-C5|2-C[356]|3-(D1|F4|F9))$/.test(each.skillId))) {
    for (let level = 1 as Level; level <= generator.maxLevel; level = (level + 1) as Level) {
      for (let seed = 1; seed <= 80; seed += 1) visuals(generateFrom(generator, level, seed)).forEach(walk);
    }
  }
  return [...found.values()];
}

describe('the new pictures fit their frame', () => {
  const samples = GALLERY.flatMap((section) => section.samples).map((sample) => sample.visual).filter(isNew);

  it('the gallery has every new kind, and a ruler with each unit', () => {
    expect(new Set(samples.map((visual) => visual.kind))).toEqual(new Set([...NEW_KINDS, 'ruler']));
    expect(new Set(samples.flatMap((visual) => (visual.kind === 'ruler' ? [visual.unit] : [])))).toEqual(new Set(['cm', 'in']));
  });

  it.each(samples.map((visual) => [describeVisual(visual), visual] as const))('%s stays inside its frame and can be read on a phone', (_name, visual) => {
    expect(fitProblems(visual)).toEqual([]);
  });

  it('every one the questions draw fits as well, the longest and the tallest too', () => {
    const pictures = contentPictures();
    expect(new Set(pictures.map((visual) => visual.kind))).toEqual(new Set([...NEW_KINDS, 'ruler']));
    expect(pictures.length).toBeGreaterThan(60);
    expect(pictures.flatMap(fitProblems)).toEqual([]);
  });

  it('the fit check finds a mark outside its frame, and words too small to read', () => {
    // A picture that does not fit, made by hand: the check must not pass everything.
    const svg = render(
      <svg className={styles.svg} viewBox="0 0 100 20" width="1000">
        <rect x="90" y="0" width="20" height="10" />
        <text x="10" y="15" fontSize="9">
          tiny
        </text>
      </svg>,
    ).container.querySelector('svg') as SVGSVGElement;
    expect(marks(svg).flatMap((mark) => mark.points).some(([x]) => x > 100)).toBe(true);
    expect(pathPoints('M 0 0 A 6 6 0 0 1 0 12').some(([x]) => x > 5.9)).toBe(true);
    expect(pathPoints('M 0 0 A 6 6 0 0 0 0 12').some(([x]) => x < -5.9)).toBe(true);
    expect(pathPoints('M 16 32 Q 48 -16 80 32').reduce((top, [, y]) => Math.min(top, y), 99)).toBeCloseTo(8, 0);
  });

  it('words under a picture and over a graph wrap inside their box, never past the screen', () => {
    const css = readFileSync('src/visuals/visuals.module.css', 'utf8');
    const block = (name: string): string => new RegExp(`\\.${name} \\{([^}]*)\\}`).exec(css)?.[1] ?? '';
    for (const name of ['caption', 'graphTitle']) {
      expect(block(name), name).toMatch(/white-space: normal/);
      expect(block(name), name).toMatch(/overflow-wrap: break-word/);
      expect(block(name), name).toMatch(/max-width: (100%|var\(--width-caption\))/);
    }
    expect(block('captioned')).toMatch(/max-width: 100%/);
    expect(block('holders')).toMatch(/flex-wrap: wrap/);
    const tokens = readFileSync('src/styles/tokens.css', 'utf8');
    const rem = (name: string): number => Number(new RegExp(`${name}: ([\\d.]+)rem`).exec(tokens)?.[1] ?? 'NaN');
    // A caption and a plate are each narrower than a phone.
    expect(rem('--width-caption') * 16).toBeLessThan(PHONE / 2);
    expect(rem('--size-holder') * 16).toBeLessThan(PHONE / 2);
  });
});

describe('a ruler with its unit', () => {
  it('prints the unit after its last number, inside the ruler, and keeps its numbers and marks where they were', () => {
    const plain = draw({ kind: 'ruler', lengthUnits: 4, startUnit: 0, object: 'pencil' });
    const cm = draw({ kind: 'ruler', lengthUnits: 4, startUnit: 0, object: 'pencil', unit: 'cm' });
    expect(plain.querySelector('[data-unit]')).toBeNull();
    const label = cm.querySelector('[data-unit="cm"]') as Element;
    expect(label.textContent).toBe('cm');
    const numbers = [...cm.querySelectorAll('text')].filter((text) => !text.hasAttribute('data-unit'));
    expect(numbers.map((text) => text.textContent)).toEqual([...plain.querySelectorAll('text')].map((text) => text.textContent));
    // Clear of the last number, and inside the body of the ruler.
    expect(n(label, 'x')).toBeGreaterThan(n(numbers.at(-1) as Element, 'x') + 12);
    const body = cm.querySelector('rect[y="38"]') as Element;
    expect(n(body, 'x') + n(body, 'width')).toBeGreaterThan(n(label, 'x') + 2 * 12 * 0.62);
    // The thing still runs from its start mark to its end mark.
    const ticks = [...cm.querySelectorAll('line')].map((line) => n(line, 'x1'));
    const thing = cm.querySelector('[data-object]') as Element;
    expect([n(thing, 'data-from'), n(thing, 'data-to')]).toEqual([ticks[0], ticks[4]]);
    expect(draw({ kind: 'ruler', lengthUnits: 2, startUnit: 1, object: 'crayon', unit: 'in' }).querySelector('[data-unit]')?.textContent).toBe('in');
  });

  it('says its unit in words, and the numbers a child reads off it', () => {
    expect(describeVisual({ kind: 'ruler', lengthUnits: 4, startUnit: 2, object: 'pencil', unit: 'cm' })).toBe('pencil on a centimeter ruler from 2 to 6');
    expect(describeVisual({ kind: 'ruler', lengthUnits: 3, startUnit: 0, object: 'ribbon', unit: 'in' })).toBe('ribbon on an inch ruler from 0 to 3');
    expect(describeVisual({ kind: 'ruler', lengthUnits: 4, startUnit: 2, object: 'pencil' })).toBe('pencil on a ruler from 2 to 6');
  });
});

describe('two rulers', () => {
  const marksOf = (root: HTMLElement, unit: 'in' | 'cm'): number[] => [...root.querySelectorAll(`[data-ruler="${unit}"] line[data-mark]`)].map((line) => n(line, 'x1'));

  it("draw the inch and the centimeter to true scale, both from 0 at the thing's left end", () => {
    const root = draw({ kind: 'twoRulers', object: 'ribbon', inches: 4 });
    const [inch, cm] = [marksOf(root, 'in'), marksOf(root, 'cm')];
    expect(inch[0]).toBe(cm[0]);
    expect(((inch[1] as number) - (inch[0] as number)) / ((cm[1] as number) - (cm[0] as number))).toBeCloseTo(CM_PER_INCH, 5);
    const thing = root.querySelector('[data-object="ribbon"]') as Element;
    expect(n(thing, 'data-from')).toBe(inch[0]);
    // It ends on the 4 inch mark, and within a quarter of a centimeter of the 10 centimeter mark.
    expect(n(thing, 'data-to')).toBeCloseTo(inch[4] as number, 5);
    expect(Math.abs(n(thing, 'data-to') - (cm[10] as number))).toBeLessThan(((cm[1] as number) - (cm[0] as number)) / 4);
    // A dashed line drops from its end to each ruler.
    expect(n(root.querySelector('[data-guide]') as Element, 'x1')).toBe(n(thing, 'data-to'));
  });

  it("print both units, and run each ruler past the thing's end", () => {
    for (const inches of [2, 4, 6]) {
      const root = draw({ kind: 'twoRulers', object: 'pencil', inches });
      expect([...root.querySelectorAll('[data-unit]')].map((text) => text.textContent)).toEqual(['in', 'cm']);
      expect(marksOf(root, 'in').length).toBeGreaterThan(inches + 1);
      expect(marksOf(root, 'cm').length).toBeGreaterThan(aboutCentimeters(inches) + 1);
      const numbers = [...root.querySelectorAll('[data-ruler="cm"] text:not([data-unit])')].map((text) => Number(text.textContent));
      expect(numbers.slice(0, 3)).toEqual([0, 1, 2]);
    }
  });

  it('say both lengths, the centimeters as about', () => {
    expect(describeVisual({ kind: 'twoRulers', object: 'ribbon', inches: 4 })).toBe('ribbon 4 inches long on an inch ruler, and about 10 centimeters on a centimeter ruler');
    expect(describeVisual({ kind: 'twoRulers', object: 'pencil', inches: 6 })).toBe('pencil 6 inches long on an inch ruler, and about 15 centimeters on a centimeter ruler');
    expect([2, 4, 6].map(aboutCentimeters)).toEqual([5, 10, 15]);
  });
});

describe('a graph with a title', () => {
  const categories = [{ label: 'cars', emoji: '🚗', value: 3 }, { label: 'balls', emoji: '⚽', value: 5 }];

  it('draws the title above its rows, on picture graphs and bar graphs', () => {
    for (const type of ['picture', 'bar'] as const) {
      const graph = draw({ kind: 'graph', type, categories, title: 'Our favorite things' }).querySelector('[data-visual="graph"]') as Element;
      const title = graph.querySelector('[data-title]');
      expect(title?.textContent).toBe('Our favorite things');
      expect(graph.firstElementChild).toBe(title);
      expect(title?.getAttribute('class')).toBe(styles.graphTitle);
    }
    expect(draw({ kind: 'graph', type: 'bar', categories }).querySelector('[data-title]')).toBeNull();
  });

  it('says the title first', () => {
    expect(describeVisual({ kind: 'graph', type: 'picture', categories, title: 'Our favorite things' })).toBe('Our favorite things, picture graph: cars 3, balls 5');
    expect(describeVisual({ kind: 'graph', type: 'bar', categories, scale: 5, title: 'Things we counted' })).toBe('Things we counted, bar graph, each step is 5: cars 3, balls 5');
    expect(describeVisual({ kind: 'graph', type: 'bar', categories })).toBe('bar graph: cars 3, balls 5');
  });
});

describe('words under a picture', () => {
  const breakfast: Visual = { kind: 'emojiGroup', emoji: '🥞', count: 1, layout: 'row', caption: 'eat breakfast', speak: ['eat breakfast'] };

  it('prints the words under the picture, and the two are one picture with one label', () => {
    const root = draw(breakfast).firstElementChild as Element;
    expect(root.getAttribute('data-visual')).toBe('emojiGroup');
    expect(root.getAttribute('role')).toBe('img');
    expect(root.getAttribute('aria-label')).toBe('eat breakfast');
    expect(root.querySelectorAll('[data-item]')).toHaveLength(1);
    const caption = root.querySelector('[data-caption]');
    expect(caption?.textContent).toBe('eat breakfast');
    expect(caption?.getAttribute('class')).toBe(styles.caption);
    // Under the picture: the words come after it, and nothing inside has a label of its own.
    expect(root.lastElementChild).toBe(caption);
    expect(root.querySelectorAll('[role="img"]')).toHaveLength(0);
    // Without words, the picture is drawn as before.
    expect(draw({ kind: 'emojiGroup', emoji: '🥞', count: 1, layout: 'row' }).querySelector('[data-caption]')).toBeNull();
  });

  it('is described by its words, and a group keeps its count', () => {
    expect(describeVisual(breakfast)).toBe('eat breakfast');
    expect(describeVisual({ kind: 'emojiGroup', emoji: '🥞', count: 1, layout: 'row', caption: 'eat breakfast' })).toBe('eat breakfast');
    expect(describeVisual({ kind: 'emojiGroup', emoji: '🍎', count: 3, layout: 'row', caption: 'snack' })).toBe('3 🍎: snack');
  });
});

describe('a rectangle drawn to its sides', () => {
  it('is drawn in the shape of its sides, the longer side 160 across', () => {
    for (const [length, width] of [[6, 4], [9, 2], [3, 9], [7, 7]] as const) {
      const rect = draw({ kind: 'measuredRect', length, width, unit: 'cm' }).querySelector('rect') as Element;
      expect(n(rect, 'width') / n(rect, 'height')).toBeCloseTo(length / width, 5);
      expect(Math.max(n(rect, 'width'), n(rect, 'height'))).toBe(160);
      expect(rectBox(length, width, 160)).toEqual({ w: n(rect, 'width'), h: n(rect, 'height') });
    }
  });

  it('labels the top with its length and the side with its width, and every side when asked', () => {
    const labels = (visual: Visual): Record<string, string> => Object.fromEntries([...draw(visual).querySelectorAll('[data-side]')].map((text) => [text.getAttribute('data-side') ?? '', text.textContent ?? '']));
    expect(labels({ kind: 'measuredRect', length: 6, width: 4, unit: 'cm' })).toEqual({ top: '6 cm', left: '4 cm' });
    expect(labels({ kind: 'measuredRect', length: 7, width: 2, unit: 'm', allSides: true })).toEqual({ top: '7 m', left: '2 m', bottom: '7 m', right: '2 m' });
    // The side to find shows "?", and its length is nowhere in the picture or its label.
    const hidden: Visual = { kind: 'measuredRect', length: 3, width: 8, unit: 'cm', unknown: 'width' };
    expect(labels(hidden)).toEqual({ top: '3 cm', left: '?' });
    expect(draw(hidden).textContent).not.toMatch(/8/);
    expect(describeVisual(hidden)).not.toMatch(/8/);
    expect(labels({ kind: 'measuredRect', length: 3, width: 8, unit: 'cm', unknown: 'length' })).toEqual({ top: '?', left: '8 cm' });
  });

  it('is described by its sides', () => {
    expect(describeVisual({ kind: 'measuredRect', length: 6, width: 4, unit: 'cm' })).toBe('rectangle 6 cm by 4 cm');
    expect(describeVisual({ kind: 'measuredRect', length: 6, width: 4, unit: 'cm', unknown: 'width' })).toBe('rectangle 6 cm by ?');
    expect(describeVisual({ kind: 'measuredRect', length: 9, width: 2, unit: 'cm', allSides: true })).toBe('rectangle 9 cm by 2 cm, every side labelled');
  });
});

describe('plates and baskets', () => {
  it('draws one plate or basket for each, empty or each holding its share', () => {
    const empty = draw({ kind: 'holders', holder: 'plate', count: 3 });
    expect(empty.querySelectorAll('[data-holder="plate"]')).toHaveLength(3);
    expect(empty.querySelectorAll('[data-item]')).toHaveLength(0);
    const full = draw({ kind: 'holders', holder: 'basket', count: 4, filled: { emoji: '⚽', each: 5 } });
    const baskets = [...full.querySelectorAll('[data-holder="basket"]')];
    expect(baskets).toHaveLength(4);
    for (const basket of baskets) expect(basket.querySelectorAll('[data-item]')).toHaveLength(5);
    // The things are the app's own drawn pictures.
    expect(full.querySelector('image')?.getAttribute('href')).toBe('/art/26bd.svg');
    // Each plate or basket is its own picture, so they wrap on a phone.
    expect(full.firstElementChild?.getAttribute('class')).toBe(styles.holders);
  });

  it('never piles one thing over another, for any share up to 6', () => {
    for (let each = 1; each <= HOLDER.most; each += 1) {
      const spots = holderSpots(each);
      expect(spots).toHaveLength(each);
      for (const spot of spots) {
        expect(spot.x).toBeGreaterThanOrEqual(0);
        expect(spot.x + THING).toBeLessThanOrEqual(HOLDER.width);
        expect(spot.y).toBeGreaterThanOrEqual(0);
        expect(spot.y + THING).toBeLessThanOrEqual(HOLDER.height);
      }
      // The gallery's rule: two pictures may not cover more than a third of each other both ways.
      for (let i = 0; i < spots.length; i += 1) {
        for (let j = i + 1; j < spots.length; j += 1) {
          const [a, b] = [spots[i] as { x: number; y: number }, spots[j] as { x: number; y: number }];
          const overX = Math.min(a.x, b.x) + THING - Math.max(a.x, b.x);
          const overY = Math.min(a.y, b.y) + THING - Math.max(a.y, b.y);
          expect(overX > THING * 0.35 && overY > THING * 0.35, `${each}: ${i} and ${j}`).toBe(false);
        }
      }
    }
  });

  it('are described by what they hold', () => {
    expect(describeVisual({ kind: 'holders', holder: 'plate', count: 3 })).toBe('3 empty plates');
    expect(describeVisual({ kind: 'holders', holder: 'basket', count: 1 })).toBe('1 empty basket');
    expect(describeVisual({ kind: 'holders', holder: 'plate', count: 3, filled: { emoji: '🍎', each: 4 } })).toBe('3 plates with 4 🍎 on each');
    expect(describeVisual({ kind: 'holders', holder: 'basket', count: 2, filled: { emoji: '⚽', each: 6 } })).toBe('2 baskets with 6 ⚽ in each');
  });
});

describe('paper clips under a thing', () => {
  it('lays each clip where it is listed, one clip length apart, under a thing as long as it says', () => {
    const root = draw({ kind: 'clipRow', object: 'crayon', length: 4, clips: [0, 2, 3] });
    const thing = root.querySelector('[data-object="crayon"]') as Element;
    const clips = [...root.querySelectorAll('[data-clip]')];
    expect(clips.map((clip) => clip.getAttribute('data-clip'))).toEqual(['0', '2', '3']);
    const unit = (n(thing, 'data-to') - n(thing, 'data-from')) / 4;
    for (const clip of clips) {
      expect(n(clip, 'data-from')).toBeCloseTo(n(thing, 'data-from') + n(clip, 'data-clip') * unit + 0.5, 5);
      expect(n(clip, 'data-to') - n(clip, 'data-from')).toBeCloseTo(unit - 1, 5);
    }
    // A dashed line marks each end of the thing.
    expect([...root.querySelectorAll('[data-end]')].map((line) => n(line, 'x1'))).toEqual([n(thing, 'data-from'), n(thing, 'data-to')]);
  });

  it("end to end, the clips reach the thing's other end; a bent row drops every other clip", () => {
    const lined = draw({ kind: 'clipRow', object: 'pencil', length: 3, clips: [0, 1, 2] });
    const last = [...lined.querySelectorAll('[data-clip]')].at(-1) as Element;
    expect(n(last, 'data-to') + 0.5).toBeCloseTo(n(lined.querySelector('[data-object]') as Element, 'data-to'), 5);
    expect(new Set([...lined.querySelectorAll('[data-clip]')].map((clip) => clip.getAttribute('data-y'))).size).toBe(1);
    const bent = [...draw({ kind: 'clipRow', object: 'pencil', length: 3, clips: [0, 1, 2], bent: true }).querySelectorAll('[data-clip]')].map((clip) => n(clip, 'data-y'));
    expect(bent[1]).toBeGreaterThan(bent[0] as number);
    expect(bent[2]).toBe(bent[0]);
  });

  it('draws a paper clip as one wire inside its own box', () => {
    const points = pathPoints(clipPath(10, 20, 33));
    expect(Math.min(...points.map(([x]) => x))).toBeGreaterThanOrEqual(10 - 1e-6);
    expect(Math.max(...points.map(([x]) => x))).toBeCloseTo(43, 5);
    expect(Math.min(...points.map(([, y]) => y))).toBeCloseTo(20, 5);
    expect(Math.max(...points.map(([, y]) => y))).toBeCloseTo(32, 5);
    expect(clipPath(10, 20, 33).match(/M/g)).toHaveLength(1);
  });

  it('is described as a child would say how the clips lie', () => {
    expect(describeVisual({ kind: 'clipRow', object: 'pencil', length: 4, clips: [0, 1, 2, 3] })).toBe('pencil 4 paper clips long, with 4 paper clips under it, end to end');
    expect(describeVisual({ kind: 'clipRow', object: 'crayon', length: 4, clips: [0, 2, 3] })).toBe('crayon 4 paper clips long, with 3 paper clips under it, with a gap');
    expect(describeVisual({ kind: 'clipRow', object: 'crayon', length: 3, clips: [0, 1, 2], bent: true })).toBe('crayon 3 paper clips long, with 3 paper clips under it, not in a straight line');
    expect(describeVisual({ kind: 'clipRow', object: 'spoon', length: 3, clips: [1, 2, 3] })).toBe('spoon 3 paper clips long, with 3 paper clips under it, not starting at its end');
  });
});

describe('a measuring cup', () => {
  it('is a jug with a handle, lines up its side and water in it, and carries no words or numbers', () => {
    const cup = draw({ kind: 'measuringCup', speak: ['a measuring cup'] });
    expect(cup.querySelector('[data-jug]')).not.toBeNull();
    expect(cup.querySelector('[data-handle]')).not.toBeNull();
    expect(cup.querySelector('[data-water]')).not.toBeNull();
    expect(cup.querySelectorAll('[data-line]').length).toBeGreaterThanOrEqual(4);
    expect(cup.querySelectorAll('text')).toHaveLength(0);
    expect(cup.textContent).toBe('');
    // Drawn, never the glass of milk that stands for a glass.
    expect(cup.querySelector('img')).toBeNull();
    expect(describeVisual({ kind: 'measuringCup', speak: ['a measuring cup'] })).toBe('a measuring cup');
    expect(describeVisual({ kind: 'measuringCup' })).toBe('measuring cup');
  });
});
