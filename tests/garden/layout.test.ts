// @vitest-environment node
import { describe, expect, it } from 'vitest';
import type { PlanPart } from '../../src/app/todaysPlan';
import { planProgress } from '../../src/app/todaysPlan';
import type { Skill } from '../../src/content/catalogue';
import { CATALOGUE } from '../../src/content/catalogue';
import { LADDERS } from '../../src/content/ladders';
import type { BedPlace, GardenInput, PlantPlace } from '../../src/garden/layout';
import { KINDS_PER_AREA, LANE, MOST_ROWS, SCENE_HEIGHT, SLOT, bedRows, bedsNear, firstView, gardenSkills, isStarted, layoutGarden, lightAt, pathState, plantOf, stonesNear, sunShare } from '../../src/garden/layout';
import type { SkillState } from '../../src/storage/schema';
import { newSkillState } from '../../src/storage/schema';
import { GARDEN } from '../../src/worlds/garden';

// The garden's layout (game feel, phase 4): everything the garden shows, worked out from saved scores.
const NOW = '2026-11-18T15:00:00.000Z';
const state = (skillId: string, change: Partial<SkillState> = {}): SkillState => ({ ...newSkillState('kid-1', skillId, NOW), attempts: 3, correct: 2, ...change });
const scored = (skillId: string, score: number): SkillState => state(skillId, { score, bestScore: score });
const mastered = (skillId: string): SkillState => state(skillId, { score: 100, bestScore: 100, masteredAt: NOW });
const input = (change: Partial<GardenInput> = {}): GardenInput => ({ grade: 'K', states: [], skills: CATALOGUE, ladders: LADDERS, plan: [], reviewsDue: [], ...change });
const plants = (layout: { beds: BedPlace[] }): PlantPlace[] => layout.beds.flatMap((bed) => bed.plants);
const practice = (subject: Skill['subject'], skillId: string, change: Partial<PlanPart> = {}): PlanPart => ({ kind: 'keepGoing', subject, skillId, answered: 0, done: false, ...change }) as PlanPart;
const squaresOverlap = (a: PlantPlace, b: PlantPlace): boolean => Math.abs(a.x - b.x) < SLOT - 1e-9 && Math.abs(a.y - b.y) < SLOT - 1e-9;

describe('the garden layout: which skills are plants', () => {
  it('a new kindergarten child sees every kindergarten skill and all of Reasoning, and nothing else', () => {
    const layout = layoutGarden(input());
    const shown = plants(layout).map((plant) => plant.skillId);
    const expected = CATALOGUE.filter((skill) => !skill.retired && (skill.grade === 'K' || skill.grade === 'all')).map((skill) => skill.id);
    expect([...shown].sort()).toEqual([...expected].sort());
    expect(new Set(shown).size).toBe(shown.length);
    expect(shown.length).toBeGreaterThan(80);
    // Every one is a seed packet: nothing is started.
    expect(plants(layout).every((plant) => plant.stage === 0 && !plant.droop && !plant.today)).toBe(true);
  });

  it('a skill of another grade appears once it is started, and only then', () => {
    expect(plantOf(layoutGarden(input()), 'M-2-A1')).toBeNull();
    expect(plantOf(layoutGarden(input()), 'M-PK-A1')).toBeNull();
    const layout = layoutGarden(input({ states: [scored('M-2-A1', 12), mastered('M-PK-A1'), state('E-1-A1', { attempts: 0, correct: 0, score: 80, placedOut: true })] }));
    expect(plantOf(layout, 'M-2-A1')).toMatchObject({ stage: 1, subject: 'math' });
    expect(plantOf(layout, 'M-PK-A1')).toMatchObject({ stage: 4 });
    // Placed past by the check-in counts as started.
    expect(plantOf(layout, 'E-1-A1')).toMatchObject({ stage: 3, subject: 'ela' });
    // A saved row that was never used does not make a plant.
    const untouched = layoutGarden(input({ states: [state('M-2-A2', { attempts: 0, correct: 0 })] }));
    expect(plantOf(untouched, 'M-2-A2')).toBeNull();
    expect(isStarted(undefined)).toBe(false);
  });

  it("a skill today's plan leads to has a plant, even from another grade", () => {
    const plan: PlanPart[] = [{ kind: 'new', skillId: 'M-1-A1', answered: 0, done: false }];
    const layout = layoutGarden(input({ plan }));
    expect(plantOf(layout, 'M-1-A1')).toMatchObject({ stage: 0, today: true });
    expect(layout.stones[0]?.skillId).toBe('M-1-A1');
  });

  it('a retired skill is never a plant, even when started', () => {
    const skills = CATALOGUE.map((skill): Skill => (skill.id === 'M-K-A1' ? { ...skill, retired: true } : skill));
    const layout = layoutGarden(input({ skills, states: [scored('M-K-A1', 50)] }));
    expect(plantOf(layout, 'M-K-A1')).toBeNull();
    expect(gardenSkills({ grade: 'K', states: [], skills, plan: [] }).some((skill) => skill.id === 'M-K-A1')).toBe(false);
  });
});

describe('the garden layout: stages', () => {
  it("a plant's stage comes from its score: seed, sprout, bud, bud opening, bloom", () => {
    const cases: [SkillState | null, number][] = [
      [null, 0],
      [scored('M-K-A1', 0), 0],
      [scored('M-K-A1', 1), 1],
      [scored('M-K-A1', 24), 1],
      [scored('M-K-A1', 25), 2],
      [scored('M-K-A1', 74), 2],
      [scored('M-K-A1', 75), 3],
      [scored('M-K-A1', 99), 3],
      [scored('M-K-A1', 100), 4],
      [mastered('M-K-A1'), 4],
      // Mastered once, then a review went badly: the score fell, the bloom stays.
      [state('M-K-A1', { score: 70, bestScore: 100, masteredAt: NOW }), 4],
    ];
    for (const [saved, stage] of cases) {
      const layout = layoutGarden(input({ states: saved ? [saved] : [] }));
      expect(plantOf(layout, 'M-K-A1')?.stage, `${saved?.score ?? 'none'}`).toBe(stage);
    }
  });

  it('a plant whose review is due droops, and no other does', () => {
    const layout = layoutGarden(input({ states: [mastered('M-K-A1'), mastered('M-K-A2'), mastered('E-K-A1')], reviewsDue: ['M-K-A2', 'E-K-A1'] }));
    expect(plants(layout).filter((plant) => plant.droop).map((plant) => plant.skillId).sort()).toEqual(['E-K-A1', 'M-K-A2']);
    expect(plantOf(layout, 'M-K-A1')?.droop).toBe(false);
    // A drooping plant keeps its bloom: nothing is lost by waiting.
    expect(plantOf(layout, 'M-K-A2')?.stage).toBe(4);
  });

  it('a plant keeps its flower kind for life, whatever grows around it', () => {
    const alone = layoutGarden(input());
    const crowded = layoutGarden(input({ grade: '3', states: CATALOGUE.slice(0, 200).map((skill) => scored(skill.id, 40)) }));
    for (const plant of plants(alone)) {
      expect(plant.kind).toBeGreaterThanOrEqual(0);
      expect(plant.kind).toBeLessThan(KINDS_PER_AREA);
      const other = plantOf(crowded, plant.skillId);
      if (other) expect(other.kind).toBe(plant.kind);
    }
    // The beds of an area do not all look the same: every kind is used in every area.
    for (const area of alone.areas) expect(new Set(area.beds.flatMap((bed) => bed.plants).map((plant) => plant.kind)).size).toBe(KINDS_PER_AREA);
  });
});

describe('the garden layout: areas and beds', () => {
  it('three areas side by side: math, then language arts, then reasoning', () => {
    const layout = layoutGarden(input());
    expect(layout.areas.map((area) => area.subject)).toEqual(['math', 'ela', 'reasoning']);
    for (let i = 1; i < layout.areas.length; i += 1) {
      const before = layout.areas[i - 1];
      const area = layout.areas[i];
      expect(area?.x).toBeCloseTo((before?.x ?? 0) + (before?.width ?? 0));
    }
    const last = layout.areas[2];
    expect(layout.width).toBeGreaterThan((last?.x ?? 0) + (last?.width ?? 0));
    expect(layout.height).toBe(SCENE_HEIGHT);
    // Every plant is in its own subject's area.
    for (const area of layout.areas) {
      for (const bed of area.beds) {
        expect(bed.subject).toBe(area.subject);
        expect(bed.x).toBeGreaterThanOrEqual(area.x);
        expect(bed.x + bed.width).toBeLessThanOrEqual(area.feature.x);
        for (const plant of bed.plants) expect(CATALOGUE.find((skill) => skill.id === plant.skillId)?.subject).toBe(area.subject);
      }
    }
  });

  it('even a child with no plants in a subject has its area, so the garden is always three places', () => {
    const skills = CATALOGUE.filter((skill) => skill.subject === 'math');
    const layout = layoutGarden(input({ skills }));
    expect(layout.areas).toHaveLength(3);
    expect(layout.areas[1]?.beds).toEqual([]);
    expect(layout.areas[1]?.width).toBeGreaterThan(100);
  });

  it('each topic is one bed, and its plants follow the ladder from left to right', () => {
    const layout = layoutGarden(input({ grade: '1' }));
    expect(new Set(layout.beds.map((bed) => bed.id)).size).toBe(layout.beds.length);
    for (const bed of layout.beds) {
      const ladder = LADDERS.find((each) => each.id === bed.id);
      expect(ladder, bed.id).toBeDefined();
      const places = bed.plants.map((plant) => ladder?.skillIds.indexOf(plant.skillId) ?? -1);
      expect(places.every((place) => place >= 0)).toBe(true);
      expect(places).toEqual([...places].sort((a, b) => a - b));
      // Left to right: a later skill is never in an earlier column.
      const cols = bed.plants.map((plant) => plant.col);
      expect(cols).toEqual([...cols].sort((a, b) => a - b));
      expect(bed.rows).toBe(bedRows(bed.plants.length));
      expect(bed.rows).toBeLessThanOrEqual(MOST_ROWS);
    }
    // The beds of an area stand in the order the ladders are listed.
    for (const area of layout.areas) {
      const order = area.beds.map((bed) => LADDERS.findIndex((ladder) => ladder.id === bed.id));
      expect(order).toEqual([...order].sort((a, b) => a - b));
    }
  });

  it('a skill on no listed ladder still gets a bed, named after the ladder its row gives', () => {
    const ladders = LADDERS.filter((ladder) => ladder.id !== 'counting');
    const layout = layoutGarden(input({ ladders }));
    const bed = layout.beds.find((each) => each.id === 'counting');
    expect(bed?.subject).toBe('math');
    expect(bed?.plants.length).toBeGreaterThan(0);
  });

  it('the same input gives the same garden, whatever order the saved rows come in', () => {
    const states = CATALOGUE.slice(0, 120).map((skill, i) => (i % 3 === 0 ? mastered(skill.id) : scored(skill.id, (i * 7) % 100)));
    const plan: PlanPart[] = [{ kind: 'review', skillIds: ['M-PK-A1'], answered: 0, done: false }, practice('math', 'M-K-A2'), practice('ela', 'E-K-A1'), { kind: 'mixed', answered: 0, size: 20, done: false, locked: false }];
    const first = layoutGarden(input({ states, plan, reviewsDue: ['M-PK-A1'] }));
    const again = layoutGarden(input({ states: [...states], plan: [...plan], reviewsDue: ['M-PK-A1'] }));
    const turned = layoutGarden(input({ states: [...states].reverse(), plan, reviewsDue: ['M-PK-A1'], skills: [...CATALOGUE].reverse().reverse() }));
    expect(again).toEqual(first);
    expect(turned).toEqual(first);
  });

  it('300 started skills still lay out: no two plants share a square, and every plant is inside its bed', () => {
    const states = CATALOGUE.filter((skill) => !skill.retired).slice(0, 300).map((skill, i) => scored(skill.id, (i * 13) % 101));
    expect(states).toHaveLength(300);
    const layout = layoutGarden(input({ grade: '3', states }));
    const all = plants(layout);
    expect(all.length).toBeGreaterThanOrEqual(300);
    for (const bed of layout.beds) {
      expect(bed.plants.length).toBeGreaterThan(0);
      expect(bed.cols * bed.rows).toBeGreaterThanOrEqual(bed.plants.length);
      for (const [i, plant] of bed.plants.entries()) {
        // The plant's whole square is on the bed's soil.
        expect(plant.x - SLOT / 2).toBeGreaterThanOrEqual(bed.x);
        expect(plant.x + SLOT / 2).toBeLessThanOrEqual(bed.x + bed.width);
        expect(plant.y - SLOT).toBeGreaterThanOrEqual(bed.y);
        expect(plant.y).toBeLessThanOrEqual(bed.y + bed.height);
        for (const other of bed.plants.slice(i + 1)) expect(squaresOverlap(plant, other), `${plant.skillId} and ${other.skillId}`).toBe(false);
      }
    }
    // Nor do two beds overlap, and the whole garden is inside the scene, above the path.
    const beds = [...layout.beds].sort((a, b) => a.x - b.x);
    for (let i = 1; i < beds.length; i += 1) expect(beds[i]?.x ?? 0).toBeGreaterThan((beds[i - 1]?.x ?? 0) + (beds[i - 1]?.width ?? 0));
    for (const bed of layout.beds) {
      expect(bed.x).toBeGreaterThan(0);
      expect(bed.x + bed.width).toBeLessThan(layout.width);
      expect(bed.y).toBeGreaterThan(SCENE_HEIGHT * 0.4);
      expect(bed.y + bed.height).toBeLessThanOrEqual(LANE - SLOT / 2);
    }
  });
});

describe("the garden layout: today's path", () => {
  const states = [mastered('M-K-A1'), scored('M-K-C1', 30), scored('E-K-B1', 30), scored('R-A1', 30)];
  const plan: PlanPart[] = [
    { kind: 'review', skillIds: ['M-K-A1'], answered: 0, done: false },
    practice('math', 'M-K-C1'),
    practice('ela', 'E-K-B1'),
    practice('reasoning', 'R-A1'),
    { kind: 'new', skillId: 'M-K-A3', answered: 0, done: false },
    { kind: 'mixed', answered: 0, size: 20, done: false, locked: false },
  ];

  it('one stone for each part of the plan, in the plan’s order, each with its own picture', () => {
    const layout = layoutGarden(input({ states, plan, reviewsDue: ['M-K-A1'] }));
    expect(layout.stones.map((stone) => stone.part)).toEqual(plan);
    expect(layout.stones.map((stone) => stone.index)).toEqual([0, 1, 2, 3, 4, 5]);
    expect(layout.stones.map((stone) => stone.icon)).toEqual(['can', 'pencil', 'pencil', 'pencil', 'seed', 'basket']);
    expect(layout.stones.map((stone) => stone.skillId)).toEqual(['M-K-A1', 'M-K-C1', 'E-K-B1', 'R-A1', 'M-K-A3', null]);
    expect(layout.progress).toEqual(planProgress(plan));
  });

  it('a stone stands in front of the plant it leads to, and that plant is marked for today', () => {
    const layout = layoutGarden(input({ states, plan, reviewsDue: ['M-K-A1'] }));
    for (const stone of layout.stones) {
      expect(stone.y).toBe(LANE);
      if (!stone.skillId) continue;
      const plant = plantOf(layout, stone.skillId);
      expect(plant?.today, stone.skillId).toBe(true);
      expect(Math.abs((plant?.x ?? 0) - stone.x)).toBeLessThan(SLOT * 4);
      expect(stone.y).toBeGreaterThan(plant?.y ?? 0);
    }
    expect(plants(layout).filter((plant) => plant.today)).toHaveLength(5);
  });

  it('Sprout stands on the first stone not done; done stones are flower patches', () => {
    const fresh = layoutGarden(input({ states, plan, reviewsDue: ['M-K-A1'] }));
    expect(fresh.stones.map((stone) => stone.state)).toEqual(['next', 'ahead', 'ahead', 'ahead', 'ahead', 'ahead']);
    expect(fresh.sprout).toMatchObject({ stone: 0, x: fresh.stones[0]?.x, y: LANE });
    expect(fresh.path).toBe('start');

    const partWay = plan.map((part, i): PlanPart => (i < 2 ? { ...part, done: true, answered: 10 } : part));
    const going = layoutGarden(input({ states, plan: partWay }));
    expect(going.stones.map((stone) => stone.state)).toEqual(['done', 'done', 'next', 'ahead', 'ahead', 'ahead']);
    expect(going.sprout.stone).toBe(2);
    expect(going.path).toBe('going');
    // A finished part no longer marks its plant.
    expect(plantOf(going, 'M-K-C1')?.today).toBe(false);

    const all = plan.map((part): PlanPart => ({ ...part, done: true }));
    const done = layoutGarden(input({ states, plan: all }));
    expect(done.stones.every((stone) => stone.state === 'done')).toBe(true);
    expect(done.sprout.stone).toBe(5);
    expect(done.path).toBe('done');
  });

  it('a Mixed bag with nothing to mix is a locked stone, and Sprout never waits on it', () => {
    const locked: PlanPart[] = [practice('math', 'M-K-C1', { done: true, answered: 10 }), { kind: 'mixed', answered: 0, size: 0, done: false, locked: true }];
    const layout = layoutGarden(input({ states, plan: locked }));
    expect(layout.stones[1]).toMatchObject({ state: 'locked', icon: 'basket', skillId: null });
    // Everything that can be done is done: the path is finished and Sprout stays on the last done stone.
    expect(layout.path).toBe('done');
    expect(layout.sprout.stone).toBe(0);
    // A locked stone alone is no path to follow.
    expect(pathState([{ kind: 'mixed', answered: 0, size: 0, done: false, locked: true }])).toBe('none');
  });

  it('with no plan there is no path, and Sprout waits by the entrance', () => {
    const layout = layoutGarden(input());
    expect(layout.stones).toEqual([]);
    expect(layout.path).toBe('none');
    expect(layout.sprout.stone).toBeNull();
    expect(layout.sprout.x).toBeLessThan(layout.areas[0]?.x ?? 0);
    expect(layout.progress).toEqual({ done: 0, goal: 0 });
  });

  it('two stones never share a spot, even when their plants are neighbours or missing', () => {
    const crowded: PlanPart[] = [
      { kind: 'review', skillIds: [], answered: 3, done: true },
      practice('math', 'M-K-A1'),
      { kind: 'new', skillId: 'M-K-A2', answered: 0, done: false },
      practice('ela', 'not-a-skill'),
      { kind: 'mixed', answered: 0, size: 20, done: false, locked: false },
    ];
    const layout = layoutGarden(input({ plan: crowded }));
    expect(layout.stones).toHaveLength(5);
    for (const [i, stone] of layout.stones.entries()) {
      expect(stone.x).toBeGreaterThan(0);
      expect(stone.x).toBeLessThan(layout.width);
      for (const other of layout.stones.slice(i + 1)) expect(Math.abs(stone.x - other.x)).toBeGreaterThanOrEqual(SLOT);
    }
    // A skill that is not in the garden gives a stone with no plant.
    expect(layout.stones[3]?.skillId).toBeNull();
  });

  it('small stones lead from one stone to the next, and stay on the lane', () => {
    const layout = layoutGarden(input({ states, plan, reviewsDue: ['M-K-A1'] }));
    for (const [i, stone] of layout.stones.entries()) {
      const from = i === 0 ? layout.sprout.x - 1000 : (layout.stones[i - 1]?.x ?? 0);
      const low = Math.min(i === 0 ? 0 : from, stone.x);
      const high = Math.max(i === 0 ? 0 : from, stone.x);
      expect(stone.steps.length).toBeLessThanOrEqual(40);
      for (const step of stone.steps) {
        expect(step.x).toBeGreaterThan(low);
        expect(step.x).toBeLessThan(high);
        expect(step.y).toBeGreaterThan(LANE - 2);
        expect(step.y).toBeLessThan(SCENE_HEIGHT);
      }
    }
    // The stretch from Language Arts to Reasoning is long: it has stones along it.
    expect(layout.stones[3]?.steps.length).toBeGreaterThan(3);
  });
});

describe('the garden layout: what to draw, the light and the sun', () => {
  const big = layoutGarden(input({ grade: '3', states: CATALOGUE.slice(0, 300).map((skill) => scored(skill.id, 50)) }));

  it('only the beds near the screen are drawn', () => {
    const near = bedsNear(big, 200, 340);
    expect(near.length).toBeGreaterThan(0);
    expect(near.length).toBeLessThan(big.beds.length);
    for (const bed of big.beds) {
      const onScreen = bed.x + bed.width >= 200 && bed.x <= 340;
      if (onScreen) expect(near).toContain(bed);
      const farOff = bed.x + bed.width < 200 - 31 || bed.x > 340 + 31;
      if (farOff) expect(near).not.toContain(bed);
    }
    expect(bedsNear(big, 0, big.width)).toHaveLength(big.beds.length);
    expect(bedsNear(big, -500, -400)).toEqual([]);
  });

  it('a stone is drawn when it or its small stones are near', () => {
    const plan: PlanPart[] = [practice('math', 'M-K-A1'), practice('reasoning', 'R-A1')];
    const layout = layoutGarden(input({ plan }));
    const first = layout.stones[0];
    const second = layout.stones[1];
    expect(stonesNear(layout, (first?.x ?? 0) - 5, (first?.x ?? 0) + 5, 0)).toContain(first);
    // Between the two, only the far stone's small stones are in view: it is still drawn, so the path does not break.
    const middle = ((first?.x ?? 0) + (second?.x ?? 0)) / 2;
    expect(stonesNear(layout, middle - 20, middle + 20, 0)).toEqual([second]);
    expect(stonesNear(layout, layout.width + 100, layout.width + 200, 0)).toEqual([]);
  });

  it('the light follows the clock', () => {
    const at = (hour: number): Date => new Date(2026, 10, 18, hour, 30);
    expect([0, 4, 5, 11, 12, 16, 17, 19, 20, 23].map((hour) => lightAt(at(hour)))).toEqual(['night', 'night', 'morning', 'morning', 'afternoon', 'afternoon', 'evening', 'evening', 'night', 'night']);
  });

  it("the sun fills with the plan's progress", () => {
    expect(sunShare({ done: 0, goal: 0 })).toBe(0);
    expect(sunShare({ done: 0, goal: 25 })).toBe(0);
    expect(sunShare({ done: 5, goal: 25 })).toBeCloseTo(0.2);
    expect(sunShare({ done: 25, goal: 25 })).toBe(1);
    expect(sunShare({ done: 40, goal: 25 })).toBe(1);
  });

  it('the garden opens on Sprout, without running past either end', () => {
    const plan: PlanPart[] = [practice('reasoning', 'R-A1')];
    const layout = layoutGarden(input({ plan }));
    const from = firstView(layout, 140);
    expect(from).toBeGreaterThan(0);
    expect(layout.sprout.x).toBeGreaterThan(from);
    expect(layout.sprout.x).toBeLessThan(from + 140);
    expect(from + 140).toBeLessThanOrEqual(layout.width);
    expect(firstView(layoutGarden(input()), 140)).toBe(0);
    expect(firstView(layout, layout.width * 2)).toBe(0);
  });
});

describe('the garden world pack', () => {
  const home = GARDEN.home;
  it('names three areas, four flower kinds in each, and a word for every stage', () => {
    expect(home).toBeDefined();
    expect(Object.keys(home?.areas ?? {}).sort()).toEqual(['ela', 'math', 'reasoning']);
    for (const area of Object.values(home?.areas ?? {})) {
      expect(area.kinds).toHaveLength(KINDS_PER_AREA);
      expect(new Set(area.kinds.map((kind) => kind.id)).size).toBe(KINDS_PER_AREA);
      // No two kinds of an area look the same: a different shape or a different colour.
      expect(new Set(area.kinds.map((kind) => `${kind.head}|${kind.petal}`)).size).toBe(KINDS_PER_AREA);
    }
    expect(home?.stages).toHaveLength(5);
    expect(home?.stageSay).toHaveLength(5);
  });

  it('every spoken line is plain words: no digits or signs', () => {
    const lines = [...(home?.stageSay ?? []), home?.thirstySay ?? [], ...Object.values(home?.areas ?? {}).map((area) => area.say)];
    for (const line of lines) for (const part of line) expect(typeof part === 'string' && !/[0-9+=×÷<>-]/.test(part), JSON.stringify(part)).toBe(true);
  });
});
