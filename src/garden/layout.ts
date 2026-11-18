import type { PlanPart } from '../app/todaysPlan';
import { nextPart, planProgress } from '../app/todaysPlan';
import type { Skill } from '../content/catalogue';
import type { Ladder } from '../content/ladders';
import type { Grade, SkillState } from '../storage/schema';
import type { GrowthStage } from '../worlds/types';
import { growthStage } from '../worlds/types';

// The garden's layout (game feel, phase 4): where every bed, plant and stepping stone goes.
// Everything here is plain arithmetic on what is saved: the same child on the same day always gets the same
// garden, on every iPad. Nothing is random. The scene is measured in its own units: it is always 100 units
// tall and as wide as it needs to be, and the screen scales it to fit.

export type Subject = Skill['subject'];
export const SUBJECT_ORDER: readonly Subject[] = ['math', 'ela', 'reasoning'];

export const SCENE_HEIGHT = 100;
export const SLOT = 12; // the square of ground one plant owns, and the square a finger taps
export const PLANT_TALL = 18; // how tall a plant is drawn: it stands above its own square
export const MOST_ROWS = 3; // a bed is never more than three plants deep
const BED_PAD = 3; // soil around the plants inside a bed
const BED_GAP = 8; // grass between two beds
const BED_FLOOR = 86; // where the front edge of the deepest bed lies
const AREA_SIGN = 30; // room at the start of an area for its sign
const AREA_FEATURE = 40; // room at the end of an area for its landmark (the pond, the log, the hay)
const AREA_MIN = 150; // an area with no plants yet still has room to be seen
const ENTRANCE = 26; // grass before the first area, where Sprout waits when there is no path
export const LANE = 93; // the path runs along the front of the garden
const LANE_BACK = 97; // a stretch of path that runs back to the left goes lower, so it never sits on the way out
const STONE_SPACE = 13; // two of today's stones are never closer than this
const STEP_GAP = 7; // a small stone about every this far between two of today's stones
const MOST_STEPS = 40; // small stones on one stretch, however far it is
export const NEAR_MARGIN = 30; // beds this close to the screen's edge are drawn too, so nothing pops in
export const KINDS_PER_AREA = 4;

export interface PlantPlace {
  skillId: string;
  ladderId: string;
  subject: Subject;
  stage: GrowthStage;
  droop: boolean; // its review is due: it droops a little, with a watering can beside it
  today: boolean; // a part of today's plan that is not done yet leads here
  kind: number; // which of the area's flower kinds, 0 to 3. A plant keeps its kind for life
  row: number; // 0 is the back row
  col: number;
  x: number; // the middle of its square
  y: number; // the front (lower) edge of its square: where the stem meets the soil
}

export interface BedPlace {
  id: string; // the ladder's id
  subject: Subject;
  x: number; // left edge
  y: number; // top edge
  width: number;
  height: number;
  rows: number;
  cols: number;
  plants: PlantPlace[];
}

export interface AreaPlace {
  subject: Subject;
  x: number;
  width: number;
  sign: { x: number; y: number };
  feature: { x: number; y: number; width: number };
  beds: BedPlace[];
}

export type StoneIcon = 'can' | 'pencil' | 'seed' | 'basket';
// done: a flower patch. next: Sprout stands here. ahead: still to come. locked: the Mixed bag with nothing to mix yet.
export type StoneState = 'done' | 'next' | 'ahead' | 'locked';

export interface Stone {
  index: number; // its place in today's plan
  part: PlanPart;
  icon: StoneIcon;
  state: StoneState;
  skillId: string | null; // the plant this stone leads to, if it has one in the garden
  x: number;
  y: number;
  steps: { x: number; y: number }[]; // the small stones that lead to it from the one before
}

export type PathState = 'none' | 'start' | 'going' | 'done';

export interface GardenLayout {
  width: number;
  height: number;
  areas: AreaPlace[];
  beds: BedPlace[]; // every bed, left to right
  stones: Stone[]; // in plan order
  sprout: { x: number; y: number; stone: number | null };
  progress: { done: number; goal: number };
  path: PathState;
}

export interface GardenInput {
  grade: Grade;
  states: readonly SkillState[];
  skills: readonly Skill[];
  ladders: readonly Ladder[];
  plan: readonly PlanPart[];
  reviewsDue: readonly string[];
}

// A skill the child has begun: answered, scored, mastered, or placed past by the check-in.
export function isStarted(state: SkillState | undefined): boolean {
  return !!state && (state.attempts > 0 || state.score > 0 || state.masteredAt !== null || state.placedOut);
}

export function stageOf(state: SkillState | undefined): GrowthStage {
  return state ? growthStage(state.score, state.masteredAt !== null) : 0;
}

// A steady number from a skill's id, so its flower kind never changes as the garden grows around it.
function steady(text: string): number {
  let hash = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

// The skills that are plants in this child's garden: every skill of the child's grade (Reasoning has no grade,
// so all of it), every skill already started whatever its grade, and any skill today's plan leads to.
// A retired skill is never shown.
export function gardenSkills(input: Pick<GardenInput, 'grade' | 'states' | 'skills' | 'plan'>): Skill[] {
  const started = new Set(input.states.filter((state) => isStarted(state)).map((state) => state.skillId));
  const planned = new Set<string>();
  for (const part of input.plan) {
    if (part.kind === 'keepGoing' || part.kind === 'new') planned.add(part.skillId);
  }
  return input.skills.filter((skill) => !skill.retired && (skill.grade === input.grade || skill.grade === 'all' || started.has(skill.id) || planned.has(skill.id)));
}

// How many rows deep a bed of n plants is: small beds stay shallow so they look like beds, not columns.
export function bedRows(n: number): number {
  if (n <= 3) return 1;
  if (n <= 8) return 2;
  return MOST_ROWS;
}

function layBed(ladderId: string, subject: Subject, skills: readonly Skill[], x: number, input: GardenInput, due: ReadonlySet<string>, today: ReadonlySet<string>): BedPlace {
  const rows = bedRows(skills.length);
  const cols = Math.ceil(skills.length / rows);
  // Every second row is moved half a square sideways, like real planting.
  const width = cols * SLOT + (rows > 1 ? SLOT / 2 : 0) + BED_PAD * 2;
  const height = rows * SLOT + BED_PAD * 2;
  // A shallow bed sits a little back from the path, so the garden is not one straight line.
  const y = BED_FLOOR - height - (MOST_ROWS - rows) * (SLOT / 2);
  const states = new Map(input.states.map((state) => [state.skillId, state]));
  const plants = skills.map((skill, i): PlantPlace => {
    // The ladder reads left to right; within a column, from the back row to the front.
    const col = Math.floor(i / rows);
    const row = i % rows;
    return {
      skillId: skill.id,
      ladderId,
      subject,
      stage: stageOf(states.get(skill.id)),
      droop: due.has(skill.id),
      today: today.has(skill.id),
      kind: steady(skill.id) % KINDS_PER_AREA,
      row,
      col,
      x: x + BED_PAD + col * SLOT + SLOT / 2 + (row % 2 === 1 ? SLOT / 2 : 0),
      y: y + BED_PAD + (row + 1) * SLOT,
    };
  });
  return { id: ladderId, subject, x, y, width, height, rows, cols, plants };
}

function iconOf(part: PlanPart): StoneIcon {
  if (part.kind === 'review') return 'can';
  if (part.kind === 'keepGoing') return 'pencil';
  if (part.kind === 'new') return 'seed';
  return 'basket';
}

// The plant a part of the plan leads to: the first skill still due for a review, or the part's own skill.
function targetOf(part: PlanPart): string | null {
  if (part.kind === 'review') return part.skillIds[0] ?? null;
  if (part.kind === 'mixed') return null;
  return part.skillId;
}

// The small stones between two places. A stretch that runs back to the left dips lower.
function stepsBetween(from: { x: number; y: number }, to: { x: number; y: number }): { x: number; y: number }[] {
  const far = Math.abs(to.x - from.x);
  const count = Math.min(MOST_STEPS, Math.max(0, Math.floor(far / STEP_GAP) - 1));
  const back = to.x < from.x;
  return Array.from({ length: count }, (_, i) => {
    const share = (i + 1) / (count + 1);
    const line = from.y + (to.y - from.y) * share;
    // In the middle of a stretch back, the stones sit on the lower lane; they rise to meet each end.
    const dip = back ? (LANE_BACK - LANE) * Math.sin(Math.PI * share) : 0;
    // A small wave, so the path wanders like a garden path.
    const wave = (i % 2 === 0 ? 0.6 : -0.6) * (back ? 0 : 1);
    return { x: from.x + (to.x - from.x) * share, y: line + dip + wave };
  });
}

function layPath(plan: readonly PlanPart[], plants: ReadonlyMap<string, PlantPlace>, width: number): { stones: Stone[]; sprout: GardenLayout['sprout'] } {
  const next = nextPart(plan);
  const home = { x: ENTRANCE / 2, y: LANE };
  // First, the stones that lead to a plant stand in front of it (a little to its left, so Sprout does not hide it).
  const anchored = plan.map((part) => {
    const target = targetOf(part);
    const plant = target ? plants.get(target) : undefined;
    return plant ? plant.x - SLOT * 0.6 : null;
  });
  const taken: number[] = [];
  const free = (x: number): number => {
    // Two stones never share a spot: the later one steps to the right until it has room.
    let at = Math.max(SLOT / 2, Math.min(x, width - SLOT / 2));
    while (taken.some((other) => Math.abs(other - at) < STONE_SPACE)) at += STONE_SPACE;
    return at;
  };
  const xs: number[] = [];
  plan.forEach((_, i) => {
    let want = anchored[i] ?? null;
    if (want === null) {
      // A stone with no plant of its own (the Mixed bag, a finished review) comes just after the stone before it,
      // or just before the first stone that has a plant, or by the entrance.
      const before = xs[i - 1];
      const after = anchored.slice(i + 1).find((x): x is number => x !== null);
      want = before !== undefined ? before + STONE_SPACE + 1 : after !== undefined ? after - STONE_SPACE - 1 : home.x + STONE_SPACE + 1;
    }
    const at = free(want);
    taken.push(at);
    xs.push(at);
  });
  const stones = plan.map((part, i): Stone => {
    const target = targetOf(part);
    const at = { x: xs[i] ?? home.x, y: LANE };
    const from = i === 0 ? home : { x: xs[i - 1] ?? home.x, y: LANE };
    const locked = part.kind === 'mixed' && part.locked;
    return {
      index: i,
      part,
      icon: iconOf(part),
      state: locked ? 'locked' : part.done ? 'done' : part === next ? 'next' : 'ahead',
      skillId: target && plants.has(target) ? target : null,
      x: at.x,
      y: at.y,
      steps: stepsBetween(from, at),
    };
  });
  // Sprout stands on the next stone; when the path is done, on its last stone; with no path, by the entrance.
  const standing = stones.find((stone) => stone.state === 'next') ?? [...stones].reverse().find((stone) => stone.state === 'done') ?? null;
  return { stones, sprout: standing ? { x: standing.x, y: standing.y, stone: standing.index } : { ...home, stone: null } };
}

export function pathState(plan: readonly PlanPart[]): PathState {
  if (plan.length === 0) return 'none';
  if (nextPart(plan) === null) return plan.some((part) => part.done) ? 'done' : 'none';
  return plan.some((part) => part.done || part.answered > 0) ? 'going' : 'start';
}

export function layoutGarden(input: GardenInput): GardenLayout {
  const shown = gardenSkills(input);
  const due = new Set(input.reviewsDue);
  const today = new Set<string>();
  for (const part of input.plan) {
    if (part.done) continue;
    if (part.kind === 'review') for (const skillId of part.skillIds) today.add(skillId);
    else if (part.kind !== 'mixed') today.add(part.skillId);
  }

  const areas: AreaPlace[] = [];
  let x = ENTRANCE;
  for (const subject of SUBJECT_ORDER) {
    const mine = shown.filter((skill) => skill.subject === subject);
    // One bed for each topic, in the order the ladders are listed; a skill on no listed ladder gets a bed
    // named after the ladder its catalogue row gives, after the others.
    const order = input.ladders.filter((ladder) => ladder.subject === subject).map((ladder) => ladder.id);
    const bedOf = (skill: Skill): string => input.ladders.find((ladder) => ladder.subject === subject && ladder.skillIds.includes(skill.id))?.id ?? skill.ladder;
    const groups = new Map<string, Skill[]>();
    for (const skill of mine) {
      const id = bedOf(skill);
      groups.set(id, [...(groups.get(id) ?? []), skill]);
    }
    const ids = [...groups.keys()].sort((a, b) => {
      const ia = order.indexOf(a);
      const ib = order.indexOf(b);
      return (ia === -1 ? order.length : ia) - (ib === -1 ? order.length : ib) || a.localeCompare(b);
    });
    const start = x;
    let cursor = start + AREA_SIGN;
    const beds: BedPlace[] = [];
    for (const id of ids) {
      const steps = input.ladders.find((ladder) => ladder.id === id)?.skillIds ?? [];
      const place = (skill: Skill): number => {
        const at = steps.indexOf(skill.id);
        return at === -1 ? steps.length : at;
      };
      // Along the ladder; skills the ladder does not list keep the catalogue's order after it.
      const skills = [...(groups.get(id) ?? [])].sort((a, b) => place(a) - place(b));
      const bed = layBed(id, subject, skills, cursor, input, due, today);
      beds.push(bed);
      cursor += bed.width + BED_GAP;
    }
    const width = Math.max(AREA_MIN, cursor - start + AREA_FEATURE);
    areas.push({
      subject,
      x: start,
      width,
      sign: { x: start + AREA_SIGN / 2, y: BED_FLOOR - SLOT },
      feature: { x: start + width - AREA_FEATURE, y: BED_FLOOR - SLOT, width: AREA_FEATURE - BED_GAP },
      beds,
    });
    x = start + width;
  }

  const width = x + ENTRANCE;
  const beds = areas.flatMap((area) => area.beds);
  const plants = new Map(beds.flatMap((bed) => bed.plants).map((plant) => [plant.skillId, plant]));
  const { stones, sprout } = layPath(input.plan, plants, width);
  return { width, height: SCENE_HEIGHT, areas, beds, stones, sprout, progress: planProgress(input.plan), path: pathState(input.plan) };
}

export function plantOf(layout: GardenLayout, skillId: string): PlantPlace | null {
  for (const bed of layout.beds) {
    const plant = bed.plants.find((each) => each.skillId === skillId);
    if (plant) return plant;
  }
  return null;
}

// The beds worth drawing while the screen shows the scene from `from` to `to`: those on screen and just off it.
export function bedsNear(layout: GardenLayout, from: number, to: number, margin: number = NEAR_MARGIN): BedPlace[] {
  return layout.beds.filter((bed) => bed.x + bed.width >= from - margin && bed.x <= to + margin);
}

// The same for the path: a stone is drawn when it, or any small stone leading to it, is near the screen.
export function stonesNear(layout: GardenLayout, from: number, to: number, margin: number = NEAR_MARGIN): Stone[] {
  const near = (x: number): boolean => x >= from - margin && x <= to + margin;
  return layout.stones.filter((stone) => near(stone.x) || stone.steps.some((step) => near(step.x)));
}

export type Light = 'morning' | 'afternoon' | 'evening' | 'night';

// The garden's light from the real clock: morning from 5, afternoon from noon, evening from 5, night from 8.
export function lightAt(at: Date): Light {
  const hour = at.getHours();
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 20) return 'evening';
  return 'night';
}

// How full the sun is, 0 to 1.
export function sunShare(progress: { done: number; goal: number }): number {
  if (progress.goal <= 0) return 0;
  return Math.max(0, Math.min(1, progress.done / progress.goal));
}

// The part of the scene to show first: Sprout in the middle, without running past either end.
export function firstView(layout: GardenLayout, viewWidth: number): number {
  const most = Math.max(0, layout.width - viewWidth);
  return Math.max(0, Math.min(most, layout.sprout.x - viewWidth / 2));
}
