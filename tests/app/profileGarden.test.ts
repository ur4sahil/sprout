import { describe, expect, it } from 'vitest';
import { PROFILE_PLANTS, profilePlants } from '../../src/app/profileGarden';
import type { PlanPart } from '../../src/app/todaysPlan';
import { CATALOGUE } from '../../src/content/catalogue';
import type { SkillState } from '../../src/storage/schema';
import { newSkillState } from '../../src/storage/schema';

// The little garden on a profile card (game feel, phase 8): the child's own plants at their own stages.

const AT = '2026-03-09T15:00:00.000Z';
const state = (skillId: string, score: number, change: Partial<SkillState> = {}): SkillState => ({ ...newSkillState('kid-1', skillId, AT), score, attempts: score > 0 ? 3 : 0, ...change });
const ids = CATALOGUE.filter((skill) => !skill.retired).map((skill) => skill.id);
const [a, b, c, d, e, f] = ids as [string, string, string, string, string, string];

describe('the plants on a profile card', () => {
  it('shows the most grown first, at their stages, a few at most', () => {
    const states = [state(a, 30), state(b, 100, { masteredAt: AT }), state(c, 80), state(d, 5), state(e, 50), state(f, 0)];
    const plants = profilePlants(states, []);
    expect(plants).toHaveLength(PROFILE_PLANTS);
    expect(plants.map((plant) => plant.skillId)).toEqual([b, c, e, a]);
    expect(plants.map((plant) => plant.stage)).toEqual([4, 3, 2, 2]);
    expect(plants[0]?.subject).toBe(CATALOGUE.find((skill) => skill.id === b)?.subject);
  });

  it("fills up with today's seeds for a child who has begun little, and is empty with nothing at all", () => {
    const plan: PlanPart[] = [
      { kind: 'keepGoing', subject: 'math', skillId: c, answered: 0, done: false },
      { kind: 'new', skillId: d, answered: 0, done: false },
      { kind: 'mixed', answered: 0, done: false, locked: true },
    ];
    const plants = profilePlants([state(a, 40)], plan);
    expect(plants.map((plant) => [plant.skillId, plant.stage])).toEqual([
      [a, 2],
      [c, 0],
      [d, 0],
    ]);
    expect(profilePlants([], [])).toEqual([]);
    // A skill that is not in the catalogue is never drawn.
    expect(profilePlants([state('no-such-skill', 60)], [])).toEqual([]);
  });

  it('is the same picture every time', () => {
    const states = [state(a, 40), state(b, 40), state(c, 40)];
    expect(profilePlants(states, [])).toEqual(profilePlants([...states].reverse(), []));
  });
});
