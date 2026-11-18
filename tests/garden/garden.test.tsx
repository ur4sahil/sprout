import { fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { PlanPart } from '../../src/app/todaysPlan';
import { CATALOGUE, skillById } from '../../src/content/catalogue';
import Garden from '../../src/garden/Garden';
import { layoutGarden } from '../../src/garden/layout';
import type { GardenPlace } from '../../src/garden/Signpost';
import { freezeClock } from '../../src/lib/clock';
import { LADDERS } from '../../src/content/ladders';
import type { Grade, SkillState } from '../../src/storage/schema';
import { newSkillState } from '../../src/storage/schema';

// The garden screen (game feel, phase 4), drawn for a child with a few plants and for one with hundreds.
const NOW = '2026-11-18T15:00:00.000Z';
const scored = (skillId: string, score: number): SkillState => ({ ...newSkillState('kid-1', skillId, NOW), attempts: 4, correct: 3, score, bestScore: score, masteredAt: score >= 100 ? NOW : null });

const SMALL_PLAN: PlanPart[] = [
  { kind: 'review', skillIds: ['M-K-A1'], answered: 0, done: false },
  { kind: 'keepGoing', subject: 'math', skillId: 'M-K-A2', answered: 0, done: false },
  { kind: 'new', skillId: 'M-K-A3', answered: 0, done: false },
  { kind: 'mixed', answered: 0, done: false, locked: true },
];
const small = { grade: 'K' as Grade, day: { states: [scored('M-K-A1', 100), scored('M-K-A2', 40)], plan: SMALL_PLAN, reviewsDue: ['M-K-A1'] } };
const BIG_PLAN: PlanPart[] = [
  { kind: 'keepGoing', subject: 'math', skillId: 'M-3-A1', answered: 4, done: false },
  { kind: 'keepGoing', subject: 'ela', skillId: 'E-2-A1', answered: 0, done: false },
  { kind: 'mixed', answered: 0, done: false, locked: false },
];
const big = { grade: '3' as Grade, day: { states: CATALOGUE.filter((skill) => !skill.retired).slice(0, 300).map((skill, i) => scored(skill.id, (i * 13) % 101)), plan: BIG_PLAN, reviewsDue: [] as string[] } };

function show(child: typeof small, change: Partial<Parameters<typeof Garden>[0]> = {}) {
  const calls = { onOpen: vi.fn(), onSkill: vi.fn(), onPlace: vi.fn(), onSpeak: vi.fn() };
  const view = render(<Garden grade={child.grade} day={child.day} {...calls} {...change} />);
  return { ...view, ...calls };
}
const plantButtons = (root: HTMLElement): HTMLElement[] => [...root.querySelectorAll<HTMLElement>('[data-plant-button]')];

afterEach(() => {
  delete document.documentElement.dataset.calm;
});

for (const mode of ['normal', 'calm'] as const) {
  describe(`Garden, ${mode} mode`, () => {
    const setMode = (): void => {
      if (mode === 'calm') document.documentElement.dataset.calm = '';
    };

    it('draws a small garden: three layers, the three areas, the plants, the path, the sun and Sprout', () => {
      setMode();
      const { container } = show(small);
      const garden = container.querySelector('[data-garden]') as HTMLElement;
      expect(garden.getAttribute('aria-label')).toBe('Your garden');
      expect(garden.hasAttribute('data-still')).toBe(mode === 'calm');
      expect(['far', 'mid', 'near'].map((layer) => container.querySelectorAll(`[data-layer="${layer}"]`).length)).toEqual([1, 1, 1]);
      // In Calm mode the layers move together; otherwise the far ones are slower.
      expect(container.querySelector('[data-layer="far"]')?.getAttribute('data-speed')).toBe(mode === 'calm' ? '1' : '0.25');
      expect(container.querySelector('[data-layer="mid"]')?.getAttribute('data-speed')).toBe(mode === 'calm' ? '1' : '0.55');
      expect([...container.querySelectorAll('[data-area]')].map((area) => area.getAttribute('data-area'))).toEqual(['math', 'ela', 'reasoning']);
      expect(container.querySelector('[data-layer="near"]')?.textContent).toContain('Number Meadow');
      expect(container.querySelectorAll('[data-landmark]')).toHaveLength(3);
      expect(plantButtons(container).length).toBeGreaterThan(5);
      expect(container.querySelector('[data-sprout]')?.getAttribute('data-on-stone')).toBe('0');
      expect(container.querySelector('[data-sprout] svg')).not.toBeNull();
      expect(container.querySelector('[data-sun]')?.getAttribute('aria-label')).toBe("Today's sun: 0 of 18");
      expect(container.querySelector('[data-sun-count]')?.textContent).toBe('0/18');
    });

    it("a plant shows its skill's stage, and one due a review droops", () => {
      setMode();
      const { container } = show(small);
      const due = container.querySelector('[data-plant-button][data-skill="M-K-A1"]') as HTMLElement;
      expect(due.getAttribute('data-stage')).toBe('4');
      expect(due.hasAttribute('data-droop')).toBe(true);
      expect(due.getAttribute('aria-label')).toBe(`${skillById('M-K-A1')?.name}. In full bloom. Ready for some water`);
      expect(due.querySelector('[data-part="can"][data-on]')).not.toBeNull();
      const growing = container.querySelector('[data-plant-button][data-skill="M-K-A2"]') as HTMLElement;
      expect(growing.getAttribute('data-stage')).toBe('2');
      expect(growing.hasAttribute('data-today')).toBe(true);
      expect(growing.hasAttribute('data-droop')).toBe(false);
      const seed = container.querySelector('[data-plant-button][data-skill="M-K-A3"]') as HTMLElement;
      expect(seed.getAttribute('data-stage')).toBe('0');
    });

    it("the path's stones follow the plan, the locked basket cannot be opened, and a stone opens its part", () => {
      setMode();
      const { container, onOpen } = show(small);
      const stones = [...container.querySelectorAll<HTMLButtonElement>('[data-stone]')];
      expect(stones.map((stone) => stone.getAttribute('data-stone-part'))).toEqual(['review', 'keepGoing', 'new', 'mixed']);
      expect(stones.map((stone) => stone.getAttribute('data-stone-state'))).toEqual(['next', 'ahead', 'ahead', 'locked']);
      expect(stones.map((stone) => stone.querySelector('[data-stone-icon]')?.getAttribute('data-stone-icon'))).toEqual(['can', 'pencil', 'seed', 'basket']);
      expect(stones[3]?.disabled).toBe(true);
      expect(stones[3]?.querySelector('[data-stone-icon="padlock"]')).not.toBeNull();
      expect(stones[3]?.getAttribute('aria-label')).toBe('The basket opens after you practice two topics');
      expect(stones[1]?.getAttribute('aria-label')).toBe(`Practice: ${skillById('M-K-A2')?.name}`);
      fireEvent.click(stones[1] as HTMLElement);
      expect(onOpen).toHaveBeenCalledWith(SMALL_PLAN[1]);
      fireEvent.click(stones[3] as HTMLElement);
      expect(onOpen).toHaveBeenCalledTimes(1);
    });

    it('the big button follows the path: it opens the next part of the plan', () => {
      setMode();
      const { onOpen } = show(small);
      const button = screen.getByRole('button', { name: 'Follow the path' });
      expect(button.querySelector('svg[data-icon="play"]')).not.toBeNull();
      fireEvent.click(button);
      expect(onOpen).toHaveBeenCalledWith(SMALL_PLAN[0]);
    });

    it('tapping a plant says its name and opens its card, with Practice and Lesson', () => {
      setMode();
      const { container, onSkill, onSpeak } = show(small);
      expect(container.querySelector('[data-plant-card]')).toBeNull();
      const plant = container.querySelector('[data-plant-button][data-skill="M-K-A2"]') as HTMLElement;
      fireEvent.click(plant);
      const skill = skillById('M-K-A2');
      expect(onSpeak).toHaveBeenCalledWith(skill?.speakName);
      expect(plant.hasAttribute('data-picked')).toBe(true);
      const card = screen.getByRole('dialog', { name: skill?.name });
      expect(within(card).getByRole('heading').textContent).toBe(skill?.name);
      expect(card.querySelector('[data-card-stage]')?.textContent).toBe('A plant with a bud');
      expect(card.querySelector('[data-card-thirsty]')).toBeNull();
      fireEvent.click(within(card).getByRole('button', { name: 'Practice' }));
      expect(onSkill).toHaveBeenLastCalledWith('M-K-A2', 'practice');
      fireEvent.click(within(card).getByRole('button', { name: 'Lesson' }));
      expect(onSkill).toHaveBeenLastCalledWith('M-K-A2', 'learn');
      // Hear it again: the name, then the stage in the world's words.
      fireEvent.click(within(card).getByRole('button', { name: `Hear it: ${skill?.name}` }));
      expect(onSpeak).toHaveBeenLastCalledWith([...(skill?.speakName ?? []), 'is a plant with a bud.']);
      fireEvent.click(within(card).getByRole('button', { name: 'Close' }));
      expect(container.querySelector('[data-plant-card]')).toBeNull();
      // A plant due a review says so on its card.
      fireEvent.click(container.querySelector('[data-plant-button][data-skill="M-K-A1"]') as HTMLElement);
      expect(container.querySelector('[data-card-thirsty]')?.textContent).toBe('Ready for some water');
    });

    it('the signpost offers each place, and tells the screen which one was chosen', () => {
      setMode();
      const { container, onPlace } = show(small);
      expect(container.querySelector('[data-signpost]')).toBeNull();
      fireEvent.click(screen.getByRole('button', { name: 'Places' }));
      const board = screen.getByRole('dialog', { name: 'Places' });
      const places: GardenPlace[] = ['subjects:math', 'subjects:ela', 'subjects:reasoning', 'stickers', 'facts', 'switch'];
      expect([...board.querySelectorAll('[data-place]')].map((row) => row.getAttribute('data-place'))).toEqual(places);
      for (const place of places) {
        fireEvent.click(board.querySelector(`[data-place="${place}"]`) as HTMLElement);
        expect(onPlace).toHaveBeenLastCalledWith(place);
      }
      expect(onPlace).toHaveBeenCalledTimes(6);
      fireEvent.click(within(board).getByRole('button', { name: 'Back to the garden' }));
      expect(container.querySelector('[data-signpost]')).toBeNull();
    });

    it('the screen that shows the garden can leave places off the signpost', () => {
      setMode();
      const { container } = show(small, { places: ['subjects:math', 'stickers', 'switch'] });
      fireEvent.click(screen.getByRole('button', { name: 'Places' }));
      expect([...container.querySelectorAll('[data-place]')].map((row) => row.getAttribute('data-place'))).toEqual(['subjects:math', 'stickers', 'switch']);
    });

    it('a child who cannot read can use everything: every control carries a picture', () => {
      setMode();
      const { container } = show(small);
      fireEvent.click(container.querySelector('[data-plant-button][data-skill="M-K-A2"]') as HTMLElement);
      for (const button of container.querySelectorAll('button')) expect(button.querySelector('svg'), button.getAttribute('aria-label') ?? button.textContent ?? '').not.toBeNull();
      fireEvent.click(screen.getByRole('button', { name: 'Places' }));
      for (const button of container.querySelectorAll('button')) expect(button.querySelector('svg'), button.getAttribute('aria-label') ?? button.textContent ?? '').not.toBeNull();
      // And every plant and stone has a name for a screen reader.
      for (const button of container.querySelectorAll('[data-plant-button], [data-stone]')) expect((button.getAttribute('aria-label') ?? '').length).toBeGreaterThan(3);
    });

    it('a large garden draws only the beds near the screen, and opens on Sprout', () => {
      setMode();
      const layout = layoutGarden({ grade: big.grade, states: big.day.states, skills: CATALOGUE, ladders: LADDERS, plan: BIG_PLAN, reviewsDue: [] });
      const all = layout.beds.flatMap((bed) => bed.plants).length;
      expect(all).toBeGreaterThanOrEqual(300);
      const { container } = show(big);
      const drawn = plantButtons(container);
      expect(drawn.length).toBeGreaterThan(0);
      expect(drawn.length).toBeLessThan(all / 2);
      // No plant is drawn twice, and the plant the next stone leads to is among them.
      expect(new Set(drawn.map((plant) => plant.getAttribute('data-skill'))).size).toBe(drawn.length);
      expect(container.querySelector('[data-plant-button][data-skill="M-3-A1"]')).not.toBeNull();
      expect(container.querySelectorAll('[data-bed]').length).toBeLessThan(layout.beds.length);
      // The path is under way, so the button says so.
      expect(screen.getByRole('button', { name: 'Keep going' }).getAttribute('data-follow')).toBe('going');
      expect(container.querySelector('[data-sun-count]')?.textContent).toBe('4/30');
    });

    it('when the path is done the button gives way to "Path done!" and the sun is full', () => {
      setMode();
      const done = SMALL_PLAN.map((part): PlanPart => (part.kind === 'mixed' ? part : { ...part, done: true, answered: 10 }));
      const { container, onOpen } = show({ ...small, day: { ...small.day, plan: done, reviewsDue: [] } });
      expect(container.querySelector('[data-follow="done"]')?.textContent).toBe('Path done!');
      expect(container.querySelector('button[data-follow]')).toBeNull();
      expect(container.querySelector('[data-sun]')?.hasAttribute('data-full')).toBe(true);
      expect(container.querySelectorAll('[data-stone-icon="flowers"]')).toHaveLength(3);
      // Sprout cheers, but not in Calm mode.
      expect(container.querySelector('[data-sprout]')?.getAttribute('data-mood')).toBe(mode === 'calm' ? 'idle' : 'cheering');
      expect(onOpen).not.toHaveBeenCalled();
    });

    it('with no plan there is no path and no button, and the garden still stands', () => {
      setMode();
      const { container } = show({ grade: 'K', day: { states: [], plan: [], reviewsDue: [] } });
      expect(container.querySelector('[data-follow]')).toBeNull();
      expect(container.querySelectorAll('[data-stone]')).toHaveLength(0);
      expect(container.querySelector('[data-sun-count]')).toBeNull();
      expect(container.querySelector('[data-sprout]')).not.toBeNull();
      expect(plantButtons(container).length).toBeGreaterThan(0);
    });
  });
}

describe('Garden: light and Calm', () => {
  it('the light follows the real clock: stars and a dimmed scene at night, neither at noon', () => {
    freezeClock(new Date(2026, 10, 18, 22, 0));
    const night = show(small).container;
    expect(night.querySelector('[data-garden]')?.getAttribute('data-light')).toBe('night');
    expect(night.querySelectorAll('[data-star]').length).toBeGreaterThan(10);
    expect(night.querySelector('[data-tint="night"]')).not.toBeNull();
    freezeClock(new Date(2026, 10, 18, 13, 0));
    const noon = show(small).container;
    expect(noon.querySelector('[data-garden]')?.getAttribute('data-light')).toBe('afternoon');
    expect(noon.querySelectorAll('[data-star]')).toHaveLength(0);
    expect(noon.querySelector('[data-tint]')).toBeNull();
    freezeClock(new Date(2026, 10, 18, 7, 0));
    expect(show(small).container.querySelector('[data-garden]')?.getAttribute('data-light')).toBe('morning');
    freezeClock(new Date(2026, 10, 18, 18, 0));
    expect(show(small).container.querySelector('[data-tint="evening"]')).not.toBeNull();
  });

  it("the child's own Calm setting can be passed in, and wins over the page", () => {
    const calm = show(small, { calm: true }).container;
    expect(calm.querySelector('[data-garden]')?.hasAttribute('data-still')).toBe(true);
    document.documentElement.dataset.calm = '';
    const lively = show(small, { calm: false }).container;
    expect(lively.querySelector('[data-garden]')?.hasAttribute('data-still')).toBe(false);
  });

  it('once the screen is measured, the scene is sized from its height and slid to show Sprout', () => {
    // jsdom lays nothing out, so give the scene and its window a size by hand: 700 tall, 1000 wide.
    const tall = vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockReturnValue(700);
    const wide = vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(1000);
    try {
      const { container } = show(big);
      const scene = container.querySelector('[data-garden-scene]') as HTMLElement;
      const view = container.querySelector('[data-garden-view]') as HTMLElement;
      expect(scene.style.getPropertyValue('--set-unit')).toBe('7px');
      const layout = layoutGarden({ grade: big.grade, states: big.day.states, skills: CATALOGUE, ladders: LADDERS, plan: BIG_PLAN, reviewsDue: [] });
      // Sprout is in the middle of the window: 1000 wide is about 143 units.
      expect(view.scrollLeft).toBeCloseTo((layout.sprout.x - 1000 / 7 / 2) * 7, 0);
      // The far layers have slid less far than the garden.
      expect(parseFloat(scene.style.getPropertyValue('--set-far-shift'))).toBeCloseTo(view.scrollLeft * 0.75, 0);
      expect(parseFloat(scene.style.getPropertyValue('--set-mid-shift'))).toBeCloseTo(view.scrollLeft * 0.45, 0);
      // Scrolling to the far end draws the beds there instead.
      const before = plantButtons(container).map((plant) => plant.getAttribute('data-skill'));
      view.scrollLeft = (layout.width - 143) * 7;
      fireEvent.scroll(view);
      return new Promise<void>((done) => {
        setTimeout(() => {
          const after = plantButtons(container).map((plant) => plant.getAttribute('data-skill'));
          expect(after).not.toEqual(before);
          expect(after.length).toBeLessThan(layout.beds.flatMap((bed) => bed.plants).length / 2);
          tall.mockRestore();
          wide.mockRestore();
          done();
        }, 60);
      });
    } catch (error) {
      tall.mockRestore();
      wide.mockRestore();
      throw error;
    }
  });
});
