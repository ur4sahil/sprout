import { render } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { PlanPart } from '../../src/app/todaysPlan';
import Garden from '../../src/garden/Garden';
import { plainScenery, sceneryFor, seasonAt } from '../../src/garden/season';
import { freezeClock } from '../../src/lib/clock';
import type { Grade, SkillState } from '../../src/storage/schema';
import { newSkillState } from '../../src/storage/schema';
import { PALETTE } from '../../src/visuals/palette';
import { GARDEN } from '../../src/worlds/garden';
import type { Season, SeasonLook } from '../../src/worlds/types';

// The garden through the year (game feel, phase 8).
const SEASONS: readonly Season[] = ['spring', 'summer', 'autumn', 'winter'];
const NOW = '2026-11-18T15:00:00.000Z';
const scored = (skillId: string, score: number): SkillState => ({ ...newSkillState('kid-1', skillId, NOW), attempts: 4, correct: 3, score, bestScore: score, masteredAt: score >= 100 ? NOW : null });
const PLAN: PlanPart[] = [{ kind: 'keepGoing', subject: 'math', skillId: 'M-K-A2', answered: 0, done: false }];
const day = { states: [scored('M-K-A1', 100), scored('M-K-A2', 40), scored('M-K-A3', 80)], plan: PLAN, reviewsDue: [] as string[] };

function show(season?: Season) {
  return render(<Garden grade={'K' as Grade} day={day} season={season} onOpen={vi.fn()} onSkill={vi.fn()} onPlace={vi.fn()} onSpeak={vi.fn()} />);
}

// Every colour string anywhere in the picture palette.
function paletteColours(value: unknown, into = new Set<string>()): Set<string> {
  if (typeof value === 'string') into.add(value);
  else if (value && typeof value === 'object') for (const inner of Object.values(value)) paletteColours(inner, into);
  return into;
}

function lookColours(look: SeasonLook): string[] {
  return [look.sky.morning[0], look.sky.morning[1], look.sky.afternoon[0], look.sky.afternoon[1], look.hillFar, look.hillMid, look.grass, look.grassFront, look.tree, look.treeLight, ...look.touchColours, ...(look.hillEdge ? [look.hillEdge] : [])];
}

const seasons = GARDEN.seasons as Readonly<Record<Season, SeasonLook>>;

afterEach(() => {
  delete document.documentElement.dataset.calm;
});

describe('the season', () => {
  it('follows the month: spring March to May, summer June to August, autumn September to November, winter December to February', () => {
    const expected: Season[] = ['winter', 'winter', 'spring', 'spring', 'spring', 'summer', 'summer', 'summer', 'autumn', 'autumn', 'autumn', 'winter'];
    expected.forEach((season, month) => {
      expect(seasonAt(new Date(2026, month, 1, 0, 1)), `month ${month + 1}`).toBe(season);
      expect(seasonAt(new Date(2026, month + 1, 0, 23, 59)), `end of month ${month + 1}`).toBe(season);
    });
  });

  it('every season of the garden is drawn in picture-palette colours', () => {
    const known = paletteColours(PALETTE);
    for (const season of SEASONS) {
      for (const colour of lookColours(seasons[season])) expect(known.has(colour), `${season}: ${colour}`).toBe(true);
    }
  });

  it('no colour is written into the garden files or the world pack: they name palette entries', () => {
    const files = ['src/garden/season.ts', 'src/garden/SeasonTouch.tsx', 'src/garden/SeasonTouch.module.css', 'src/garden/GardenBackdrop.tsx', 'src/garden/GardenGround.tsx', 'src/garden/Garden.tsx', 'src/worlds/garden.ts'];
    for (const file of files) expect(readFileSync(file, 'utf8'), file).not.toMatch(/#[0-9a-f]{3,8}\b|rgba?\(|hsla?\(/i);
  });

  it('the scenery changes only the sky by day, the hills, the grass and the trees', () => {
    const winter = sceneryFor(seasons.winter, 'afternoon');
    expect(winter.sky).toEqual(seasons.winter.sky.afternoon);
    expect(winter.hillEdge).toBe(PALETTE.seasons.winter.snow);
    // Evening and night keep their own skies, so the light of the day still reads the same.
    expect(sceneryFor(seasons.winter, 'night').sky).toEqual(PALETTE.garden.sky.night);
    expect(sceneryFor(null, 'morning')).toEqual(plainScenery('morning'));
  });

  it('the garden takes its season from the clock', () => {
    freezeClock(new Date(2026, 3, 12, 14, 0)); // April, in the afternoon
    const { container } = show();
    expect(container.querySelector('[data-garden]')?.getAttribute('data-season')).toBe('spring');
  });
});

for (const mode of ['normal', 'calm'] as const) {
  describe(`the garden in each season, ${mode} mode`, () => {
    const plainPlants = (): string => {
      if (mode === 'calm') document.documentElement.dataset.calm = '';
      const { container, unmount } = show('summer');
      const html = [...container.querySelectorAll('[data-plant-button]')].map((plant) => plant.outerHTML).join('');
      unmount();
      return html;
    };

    for (const season of SEASONS) {
      it(`draws ${season}`, () => {
        freezeClock(new Date(2026, 5, 20, 14, 0)); // the afternoon, so the sky is the season's own
        const plants = plainPlants();
        if (mode === 'calm') document.documentElement.dataset.calm = '';
        const look = seasons[season];
        const { container } = show(season);
        const garden = container.querySelector('[data-garden]') as HTMLElement;
        expect(garden.getAttribute('data-season')).toBe(season);
        // The land is in the season's colours.
        const far = container.querySelector('[data-layer="far"]') as SVGElement;
        expect(far.querySelector('path')?.getAttribute('fill')).toBe(look.hillFar);
        expect(far.querySelector('stop')?.getAttribute('stop-color')).toBe(look.sky.afternoon[0]);
        expect(container.querySelector('[data-layer="mid"] path')?.getAttribute('fill')).toBe(look.hillMid);
        expect(container.querySelector('[data-layer="near"] path')?.getAttribute('fill')).toBe(look.grass);
        // Winter puts a white edge on the hills; the others have none.
        expect(far.querySelector('[data-hill-edge]') !== null).toBe(season === 'winter');
        // Summer has its bright sun in the sky.
        expect(container.querySelectorAll('[data-season-sun]').length > 0).toBe(season === 'summer');
        // Petals, leaves or snow drift, except in Calm mode (and summer, whose touch is the sun).
        const touch = container.querySelector('[data-season-touch]');
        if (mode === 'calm' || season === 'summer') expect(touch).toBeNull();
        else {
          expect(touch?.getAttribute('data-season-touch')).toBe(look.touch);
          expect(touch?.getAttribute('aria-hidden')).toBe('true');
          expect(touch?.querySelectorAll('[data-season-bit]').length).toBeGreaterThan(5);
        }
        // Every plant, its flowers and its colours, is exactly the same in every season: blooms never look dead.
        const now = [...container.querySelectorAll('[data-plant-button]')].map((plant) => plant.outerHTML).join('');
        expect(now.length).toBeGreaterThan(0);
        expect(now).toBe(plants);
        // The sun that fills with the day's plan is unchanged.
        expect(container.querySelector('[data-sun]')).not.toBeNull();
      });
    }
  });
}
