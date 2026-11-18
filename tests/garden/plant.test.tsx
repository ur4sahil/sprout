import { act, render } from '@testing-library/react';
import { createRef } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import type { PlantHandle } from '../../src/garden/Plant';
import Plant from '../../src/garden/Plant';
import { partsAt } from '../../src/garden/plantParts';
import { GARDEN } from '../../src/worlds/garden';
import type { FlowerHead, FlowerKind, GrowthStage } from '../../src/worlds/types';

// One plant of the garden (game feel, phase 4), in each of its five stages.
const STAGES: readonly GrowthStage[] = [0, 1, 2, 3, 4];
const kinds = Object.values(GARDEN.home?.areas ?? {}).flatMap((area) => area.kinds);
const daisy = kinds[0] as FlowerKind;
const shown = (svg: Element, part: string): boolean => [...svg.querySelectorAll(`[data-part="${part}"]`)].some((el) => el.hasAttribute('data-on'));
const draw = (stage: GrowthStage, droop = false, kind: FlowerKind = daisy): SVGElement => render(<Plant stage={stage} kind={kind} droop={droop} />).container.querySelector('svg') as SVGElement;

afterEach(() => {
  delete document.documentElement.dataset.calm;
});

describe('which parts a plant shows', () => {
  it('each stage is its own picture: seed packet, sprout, plant with a bud, bud opening, bloom with a visitor', () => {
    expect(partsAt(0, false)).toMatchObject({ packet: true, stem: 0, seedLeaves: false, leaves: false, bud: false, open: 0, visitor: false, can: false });
    expect(partsAt(1, false)).toMatchObject({ packet: false, seedLeaves: true, leaves: false, bud: false, open: 0, visitor: false });
    expect(partsAt(2, false)).toMatchObject({ packet: false, seedLeaves: false, leaves: true, bud: true, open: 0, visitor: false });
    expect(partsAt(3, false)).toMatchObject({ leaves: true, bud: true, visitor: false });
    expect(partsAt(4, false)).toMatchObject({ leaves: true, bud: false, open: 1, visitor: true });
    expect(partsAt(3, false).open).toBeGreaterThan(0);
    expect(partsAt(3, false).open).toBeLessThan(1);
  });

  it('the stem only ever gets taller, and the head rides at its top', () => {
    const stems = STAGES.map((stage) => partsAt(stage, false).stem);
    expect(stems).toEqual([...stems].sort((a, b) => a - b));
    expect(new Set(stems).size).toBe(5);
    expect(partsAt(4, false).rise).toBe(0);
    for (const stage of STAGES) {
      const parts = partsAt(stage, false);
      // rise is a share of the picture's height (90); the full stem is 54 of it.
      expect(parts.rise).toBeCloseTo(((1 - parts.stem) * 54 * 100) / 90, 1);
    }
  });

  it('a drooping plant gets a watering can and no visitor, at any stage', () => {
    for (const stage of STAGES) expect(partsAt(stage, true)).toMatchObject({ can: true, visitor: false });
    expect(partsAt(4, false).can).toBe(false);
  });
});

describe('Plant', () => {
  it('draws every stage, hidden from screen readers, with the parts of that stage on', () => {
    for (const stage of STAGES) {
      const svg = draw(stage);
      expect(svg.getAttribute('data-stage')).toBe(String(stage));
      expect(svg.getAttribute('aria-hidden')).toBe('true');
      expect(svg.getAttribute('viewBox')).toBe('0 0 60 90');
      const parts = partsAt(stage, false);
      expect(shown(svg, 'packet'), `packet at ${stage}`).toBe(parts.packet);
      expect(shown(svg, 'seed-leaves')).toBe(parts.seedLeaves);
      expect(shown(svg, 'leaf')).toBe(parts.leaves);
      expect(shown(svg, 'bud')).toBe(parts.bud);
      expect(shown(svg, 'bloom')).toBe(parts.open > 0);
      expect(shown(svg, 'visitor')).toBe(parts.visitor);
      expect(shown(svg, 'can')).toBe(false);
      expect(svg.style.getPropertyValue('--set-grow')).toBe(String(parts.stem));
      expect(svg.style.getPropertyValue('--set-open')).toBe(String(parts.open));
      // Every part is in the picture at every stage, so a change of stage is a glide and not a swap.
      for (const part of ['packet', 'stem', 'leaf', 'head', 'seed-leaves', 'bud', 'bloom', 'visitor', 'can']) expect(svg.querySelector(`[data-part="${part}"]`), part).not.toBeNull();
    }
  });

  it('draws the same in Calm mode: the picture does not depend on movement', () => {
    const normal = STAGES.map((stage) => draw(stage).outerHTML);
    document.documentElement.dataset.calm = '';
    const calm = STAGES.map((stage) => draw(stage).outerHTML);
    expect(calm).toEqual(normal);
  });

  it('a drooping plant is marked, with its watering can', () => {
    const svg = draw(4, true);
    expect(svg.hasAttribute('data-droop')).toBe(true);
    expect(shown(svg, 'can')).toBe(true);
    expect(shown(svg, 'visitor')).toBe(false);
    // It keeps its bloom.
    expect(shown(svg, 'bloom')).toBe(true);
    expect(draw(4).hasAttribute('data-droop')).toBe(false);
  });

  it('every flower kind of the world draws its own head in its own colours', () => {
    expect(kinds).toHaveLength(12);
    const heads = new Set<FlowerHead>();
    for (const kind of kinds) {
      const svg = draw(4, false, kind);
      expect(svg.getAttribute('data-kind')).toBe(kind.id);
      const head = svg.querySelector(`[data-part="bloom"] [data-head="${kind.head}"]`);
      expect(head, kind.id).not.toBeNull();
      expect(head?.querySelector(`[fill="${kind.petal}"]`), `${kind.id} petal`).not.toBeNull();
      heads.add(kind.head);
    }
    expect([...heads].sort()).toEqual(['bell', 'cattail', 'daisy', 'puff', 'star', 'tulip']);
  });

  it('a butterfly or a bee visits a bloom', () => {
    const butterfly = render(<Plant stage={4} kind={daisy} visitor="butterfly" />).container;
    const bee = render(<Plant stage={4} kind={daisy} visitor="bee" />).container;
    expect(butterfly.querySelector('[data-visitor="butterfly"][data-on]')).not.toBeNull();
    expect(bee.querySelector('[data-visitor="bee"][data-on]')).not.toBeNull();
    expect(bee.innerHTML).not.toBe(butterfly.innerHTML);
  });

  it('growTo moves the plant to another stage, and a new stage from outside takes over again', () => {
    const handle = createRef<PlantHandle>();
    const { container, rerender } = render(<Plant ref={handle} stage={1} kind={daisy} />);
    const svg = container.querySelector('svg') as SVGElement;
    expect(svg.getAttribute('data-stage')).toBe('1');
    act(() => handle.current?.growTo(2));
    expect(svg.getAttribute('data-stage')).toBe('2');
    expect(shown(svg, 'bud')).toBe(true);
    act(() => handle.current?.growTo(4));
    expect(svg.getAttribute('data-stage')).toBe('4');
    expect(shown(svg, 'visitor')).toBe(true);
    // The same element all the way: it grew, it was not swapped.
    expect(container.querySelector('svg')).toBe(svg);
    rerender(<Plant ref={handle} stage={3} kind={daisy} />);
    expect(svg.getAttribute('data-stage')).toBe('3');
  });
});
