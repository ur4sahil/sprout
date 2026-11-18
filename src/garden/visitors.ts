import type { Skill } from '../content/catalogue';
import type { Say } from '../engine/types';
import type { SkillState } from '../storage/schema';
import type { AreaPlace, Subject } from './layout';
import { SUBJECT_ORDER, stageOf } from './layout';

// Visitors (game feel, phase 7): as an area of the garden fills with flowers in full bloom, animals move in.
// At 5, 15 and 30 blooms one more animal comes to stay, each area with its own three. Like everything in the
// garden this is worked out from saved scores alone, and a visitor never leaves: a bloom is a mastered skill,
// and mastery is never taken back.

export const VISITOR_STEPS = [5, 15, 30] as const;
export type VisitorStep = (typeof VISITOR_STEPS)[number];

export type VisitorKind = 'rabbit' | 'hedgehog' | 'deer' | 'snail' | 'squirrel' | 'fox' | 'ducks' | 'turtle' | 'swan';

// Who moves into which area, in the order they arrive. Number Meadow (math) has the field animals, Word Woods
// (Language Arts) the woodland ones, Puzzle Pond (Reasoning) the water birds and a turtle.
export const AREA_VISITORS: Readonly<Record<Subject, readonly [VisitorKind, VisitorKind, VisitorKind]>> = {
  math: ['rabbit', 'hedgehog', 'deer'],
  ela: ['snail', 'squirrel', 'fox'],
  reasoning: ['ducks', 'turtle', 'swan'],
};

// What each one is called, for a screen reader and for Sprout's words when it arrives.
export const VISITOR_NAME: Readonly<Record<VisitorKind, { one: string; arrives: string }>> = {
  rabbit: { one: 'a rabbit', arrives: 'A rabbit has come to live in the meadow!' },
  hedgehog: { one: 'a hedgehog', arrives: 'A hedgehog has come to live in the meadow!' },
  deer: { one: 'a deer', arrives: 'A deer has come to live in the meadow!' },
  snail: { one: 'a snail', arrives: 'A snail has come to live in the woods!' },
  squirrel: { one: 'a squirrel', arrives: 'A squirrel has come to live in the woods!' },
  fox: { one: 'a fox', arrives: 'A fox has come to live in the woods!' },
  ducks: { one: 'two ducks', arrives: 'Two ducks have come to live on the pond!' },
  turtle: { one: 'a turtle', arrives: 'A turtle has come to live by the pond!' },
  swan: { one: 'a swan', arrives: 'A swan has come to live on the pond!' },
};

export interface Visitor {
  id: string; // 'math:5': the area and the number of blooms that brought it. Steady, so it can be remembered
  kind: VisitorKind;
  subject: Subject; // the area it lives in
  at: VisitorStep; // the blooms it came at
  slot: 0 | 1 | 2; // first, second or third to arrive: where it stands (see `visitorSpot`)
  name: string; // "a hedgehog"
  say: Say; // what Sprout says when it arrives
}

export interface AreaVisitors {
  subject: Subject;
  blooms: number; // plants of this area in full bloom
  visitors: Visitor[]; // the animals living here now, first arrival first
  next: { kind: VisitorKind; at: VisitorStep; more: number } | null; // who comes next, and how many more blooms it takes
}

export interface Visitors {
  areas: AreaVisitors[]; // in the garden's order: math, ela, reasoning
  visitors: Visitor[]; // every animal living in the garden, area by area
}

function visitorAt(subject: Subject, slot: 0 | 1 | 2): Visitor {
  const kind = AREA_VISITORS[subject][slot];
  const at = VISITOR_STEPS[slot];
  return { id: `${subject}:${at}`, kind, subject, at, slot, name: VISITOR_NAME[kind].one, say: [VISITOR_NAME[kind].arrives] };
}

// Every visitor of the garden, from one child's skill states and the catalogue. A plant in bloom is a skill
// at the last growth stage (mastered, or a Skill Score of 100), as the garden draws it. Retired skills do
// not count.
export function visitors(states: readonly SkillState[], skills: readonly Skill[]): Visitors {
  const stateById = new Map(states.map((state) => [state.skillId, state]));
  const areas = SUBJECT_ORDER.map((subject): AreaVisitors => {
    const blooms = skills.filter((skill) => !skill.retired && skill.subject === subject && stageOf(stateById.get(skill.id)) === 4).length;
    const living = ([0, 1, 2] as const).filter((slot) => blooms >= VISITOR_STEPS[slot]).map((slot) => visitorAt(subject, slot));
    const nextSlot = ([0, 1, 2] as const).find((slot) => blooms < VISITOR_STEPS[slot]);
    const next = nextSlot === undefined ? null : { kind: AREA_VISITORS[subject][nextSlot], at: VISITOR_STEPS[nextSlot], more: VISITOR_STEPS[nextSlot] - blooms };
    return { subject, blooms, visitors: living, next };
  });
  return { areas, visitors: areas.flatMap((area) => area.visitors) };
}

// The visitors in `now` that were not in `before`: the ones Sprout announces. Give it the ids the garden
// last showed this child (or the visitors worked out at the last visit).
export function arrivals(before: readonly string[], now: Visitors): Visitor[] {
  const seen = new Set(before);
  return now.visitors.filter((visitor) => !seen.has(visitor.id));
}

// Where a visitor stands, in the scene's own units (the garden is 100 units tall): around its area's landmark,
// on the grass between the landmark and the path. `x` is the middle of its feet and `y` the ground under them,
// as a plant's place is given. On the pond the ducks and the swan float on the water.
export function visitorSpot(area: Pick<AreaPlace, 'subject' | 'feature'>, slot: 0 | 1 | 2): { x: number; y: number } {
  const middle = area.feature.x + area.feature.width / 2;
  if (area.subject === 'reasoning') {
    const pond = [
      { x: middle - 4, y: 72 }, // the ducks, on the water
      { x: middle + 14, y: 82 }, // the turtle, on the bank
      { x: middle + 6, y: 70 }, // the swan, at the back of the pond
    ];
    return pond[slot] as { x: number; y: number };
  }
  const field = [
    { x: middle - 10, y: 84 }, // in front of the landmark, to its left
    { x: middle + 10, y: 84 }, // in front of it, to its right
    { x: middle + 15, y: 70 }, // the tall one stands behind, beside the landmark
  ];
  return field[slot] as { x: number; y: number };
}
