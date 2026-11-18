import { render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import type { Skill } from '../../src/content/catalogue';
import { CATALOGUE } from '../../src/content/catalogue';
import { LADDERS } from '../../src/content/ladders';
import { layoutGarden } from '../../src/garden/layout';
import Visitor from '../../src/garden/Visitor';
import type { VisitorKind } from '../../src/garden/visitors';
import { AREA_VISITORS, VISITOR_STEPS, arrivals, visitorSpot, visitors } from '../../src/garden/visitors';
import type { SkillState } from '../../src/storage/schema';
import { newSkillState } from '../../src/storage/schema';

// Visitors (game feel, phase 7): animals that move into an area as its plants bloom.
const NOW = '2026-11-18T15:00:00.000Z';
const live = CATALOGUE.filter((skill) => !skill.retired);
const of = (subject: Skill['subject']): Skill[] => live.filter((skill) => skill.subject === subject);
const bloom = (skill: Skill): SkillState => ({ ...newSkillState('kid-1', skill.id, NOW), score: 100, bestScore: 100, attempts: 15, correct: 15, masteredAt: NOW });
const growing = (skill: Skill, score: number): SkillState => ({ ...newSkillState('kid-1', skill.id, NOW), score, bestScore: score, attempts: 6, correct: 5 });

afterEach(() => {
  delete document.documentElement.dataset.calm;
});

describe('visitors', () => {
  it('nobody lives in an empty garden, and each area says who comes first and how many blooms it takes', () => {
    const found = visitors([], live);
    expect(found.visitors).toEqual([]);
    expect(found.areas.map((area) => [area.subject, area.blooms, area.next?.kind, area.next?.more])).toEqual([
      ['math', 0, 'rabbit', 5],
      ['ela', 0, 'snail', 5],
      ['reasoning', 0, 'ducks', 5],
    ]);
  });

  it('an animal moves in at 5, 15 and 30 blooms, each area with its own three', () => {
    const math = of('math');
    const at = (n: number) => visitors(math.slice(0, n).map(bloom), live).areas[0];
    expect(at(4)?.visitors).toEqual([]);
    expect(at(5)?.visitors.map((v) => v.kind)).toEqual(['rabbit']);
    expect(at(14)?.visitors.map((v) => v.kind)).toEqual(['rabbit']);
    expect(at(15)?.visitors.map((v) => v.kind)).toEqual(['rabbit', 'hedgehog']);
    expect(at(15)?.next).toEqual({ kind: 'deer', at: 30, more: 15 });
    expect(at(30)?.visitors.map((v) => [v.id, v.slot])).toEqual([
      ['math:5', 0],
      ['math:15', 1],
      ['math:30', 2],
    ]);
    expect(at(40)?.next).toBeNull();
    // Every area has three different animals, and no animal lives in two areas.
    const all = Object.values(AREA_VISITORS).flat();
    expect(new Set(all).size).toBe(9);
    expect(VISITOR_STEPS).toEqual([5, 15, 30]);
  });

  it('only full bloom counts, in that area only; a retired skill does not count', () => {
    const ela = of('ela');
    const states = [...ela.slice(0, 5).map(bloom), ...ela.slice(5, 20).map((skill) => growing(skill, 99))];
    const found = visitors(states, live);
    expect(found.areas.map((area) => area.blooms)).toEqual([0, 5, 0]);
    expect(found.visitors.map((v) => [v.subject, v.kind])).toEqual([['ela', 'snail']]);
    const retired = live.map((skill) => (ela.slice(0, 5).includes(skill) ? { ...skill, retired: true as const } : skill));
    expect(visitors(states, retired).visitors).toEqual([]);
  });

  it('a skill at a Skill Score of 100 blooms even before it is marked mastered', () => {
    const reasoning = of('reasoning').slice(0, 5).map((skill) => ({ ...growing(skill, 100) }));
    expect(visitors(reasoning, live).areas[2]?.visitors.map((v) => v.kind)).toEqual(['ducks']);
  });

  it('says which visitors are new since the last look, with words Sprout can say', () => {
    const now = visitors(of('math').slice(0, 15).map(bloom), live);
    expect(arrivals(['math:5'], now).map((v) => v.kind)).toEqual(['hedgehog']);
    expect(arrivals(['math:5', 'math:15'], now)).toEqual([]);
    for (const visitor of visitors([...of('math'), ...of('ela'), ...of('reasoning')].map(bloom), live).visitors) {
      expect(visitor.say.every((part) => typeof part !== 'string' || !/[0-9+=<>_]/.test(part))).toBe(true);
    }
  });

  it('each visitor has a spot by its own area’s landmark, inside the area and above the path', () => {
    const layout = layoutGarden({ grade: 'K', states: [], skills: live, ladders: LADDERS, plan: [], reviewsDue: [] });
    for (const area of layout.areas) {
      for (const slot of [0, 1, 2] as const) {
        const spot = visitorSpot(area, slot);
        expect(spot.x).toBeGreaterThan(area.x);
        expect(spot.x).toBeLessThan(area.x + area.width);
        expect(spot.y).toBeLessThan(88);
        expect(spot.y).toBeGreaterThan(60);
      }
    }
  });
});

const KINDS = Object.values(AREA_VISITORS).flat() as VisitorKind[];
for (const mode of ['normal', 'calm'] as const) {
  describe(`Visitor, ${mode} mode`, () => {
    it('draws every animal alone, named, and inside the garden as a group at its spot', () => {
      if (mode === 'calm') document.documentElement.dataset.calm = '';
      for (const kind of KINDS) {
        const alone = render(<Visitor kind={kind} alone />).container.querySelector('svg') as SVGElement;
        expect(alone.getAttribute('role')).toBe('img');
        expect(alone.getAttribute('aria-label')?.length).toBeGreaterThan(2);
        expect(alone.querySelector(`[data-visitor="${kind}"]`)?.children.length).toBeGreaterThan(3);
        const inScene = render(
          <svg>
            <Visitor kind={kind} x={40} y={84} flip />
          </svg>,
        ).container.querySelector(`[data-visitor="${kind}"]`);
        expect(inScene?.getAttribute('transform')).toBe('translate(40 84) scale(-1 1)');
      }
    });
  });
}
