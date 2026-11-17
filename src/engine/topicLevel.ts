import type { SkillGrade } from './types';

// A running level for one topic (one ladder), worked out from the skill states on it (plan section 15.3).
// The number is a school year: 1.5 is the middle of grade 1, 0.2 early kindergarten, -0.5 the middle of pre-K.

export interface TopicSkill {
  id: string;
  grade: SkillGrade;
}
export interface TopicState {
  skillId: string;
  score: number;
  attempts: number;
  placedOut: boolean;
}
export type TopicLevel = { kind: 'notTried' } | { kind: 'above'; value: number } | { kind: 'level'; value: number };

const START: Partial<Record<SkillGrade, number>> = { PK: -1, K: 0, '1': 1, '2': 2, '3': 3 };
// A skill the child has shown they know: a Skill Score of 80 or more. A skill placed out by the check-in or
// passed by the fast track sits at 80; a review that drops a score below 80 takes the skill away again.
export const KNOWN_SCORE = 80;

// The part of its grade a skill covers: the k-th of a grade's c skills on the ladder covers k/c to (k+1)/c.
function slices(skills: readonly TopicSkill[]): { from: number; to: number }[] {
  return skills.map((skill, index) => {
    const start = START[skill.grade];
    if (start === undefined) throw new Error(`topicLevel: no school year for grade ${skill.grade}`);
    const same = skills.filter((other) => other.grade === skill.grade);
    const k = same.indexOf(skills[index] as TopicSkill);
    return { from: start + k / same.length, to: start + (k + 1) / same.length };
  });
}

export function topicLevel(skills: readonly TopicSkill[], states: readonly TopicState[]): TopicLevel {
  const byId = new Map(states.map((state) => [state.skillId, state]));
  const on = skills.map((skill) => byId.get(skill.id));
  if (!on.some((state) => state && (state.attempts > 0 || state.placedOut || state.score > 0))) return { kind: 'notTried' };
  const span = slices(skills);
  let known = -1;
  on.forEach((state, index) => {
    if (state && state.score >= KNOWN_SCORE) known = index;
  });
  if (known === skills.length - 1) return { kind: 'above', value: round((span[known] as { to: number }).to) };
  // The skill being worked on: the one after the furthest known, or with nothing known yet, the first one tried.
  const working = known >= 0 ? known + 1 : on.findIndex((state) => state && (state.attempts > 0 || state.score > 0));
  const slice = span[working] as { from: number; to: number };
  const credit = Math.min(on[working]?.score ?? 0, KNOWN_SCORE) / KNOWN_SCORE;
  return { kind: 'level', value: round(slice.from + credit * (slice.to - slice.from)) };
}

const round = (value: number): number => Math.round(value * 10) / 10;

// "about mid-grade 1", "about early kindergarten", "about late pre-K". The thirds of a year are early, mid and late.
export function levelWords(value: number): string {
  const year = Math.floor(value + 1e-9);
  const part = value - year;
  const when = part < 1 / 3 ? 'early' : part < 2 / 3 ? 'mid' : 'late';
  if (year < 0) return `about ${when} pre-K`;
  if (year === 0) return `about ${when} kindergarten`;
  return `about ${when}-grade ${year}`;
}

// The number a parent may want beside the words, from grade 1 up: "1.5". Below grade 1 there is none.
export function levelNumber(value: number): string | null {
  return value >= 1 ? value.toFixed(1) : null;
}
