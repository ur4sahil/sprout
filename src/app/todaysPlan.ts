import { skillById } from '../content/catalogue';
import { LADDERS } from '../content/ladders';
import type { TodayPick } from '../engine/recommend';
import type { Attempt, Child, Session, SkillState } from '../storage/schema';
import { inProgress, mixedBagOrder } from './mixedBag';

// Today's plan (plan section 18): one list in order, each part ticked off when done.
// 1. Review the mastered skills that are due. 2. Keep going with skills in progress. 3. Learn something new.
// 4. The Mixed bag. Each part has a fixed size; a grown-up sets the parts for each child.

export const KEEP_GOING_QUESTIONS = 10; // answers today on a "Keep going" skill to tick it off
export const NEW_QUESTIONS = 5; // answers today on the new skill to tick it off
export const MIXED_QUESTIONS = 10; // Mixed bag answers today to tick it off

export type PlanPart =
  | { kind: 'review'; skillIds: string[]; done: boolean }
  | { kind: 'keepGoing'; skillId: string; answered: number; done: boolean }
  | { kind: 'new'; skillId: string; answered: number; done: boolean }
  | { kind: 'mixed'; answered: number; done: boolean };

export function todaysPlan(input: {
  child: Child;
  today: string; // the local day
  states: readonly SkillState[];
  picks: readonly TodayPick[];
  reviewsDue: readonly string[];
  attempts: readonly Attempt[]; // recent attempts; today's are picked out by day
  sessions: readonly Session[]; // recent sessions; tells which answers were in a Mixed bag
}): PlanPart[] {
  const { child, today, states, picks, reviewsDue } = input;
  const settings = child.settings;
  const mixedSessions = new Set(input.sessions.filter((session) => session.mixed).map((session) => session.id));
  const todays = input.attempts.filter((attempt) => attempt.day === today);
  const practisedToday = (skillId: string): number => todays.filter((attempt) => attempt.skillId === skillId && attempt.kind === 'practice' && !mixedSessions.has(attempt.sessionId)).length;
  const stateOf = (skillId: string): SkillState | undefined => states.find((state) => state.skillId === skillId);
  const masteredToday = (skillId: string): boolean => (stateOf(skillId)?.masteredAt ?? '').length > 0 && todays.some((attempt) => attempt.skillId === skillId);
  const usable = (skillId: string): boolean => {
    const skill = skillById(skillId);
    return !!skill && !skill.retired;
  };
  const parts: PlanPart[] = [];

  // 1. Review: shown while reviews are due, and ticked once today's are all done.
  const reviewedToday = todays.some((attempt) => attempt.kind === 'review');
  if (reviewsDue.length > 0 || reviewedToday) parts.push({ kind: 'review', skillIds: [...reviewsDue], done: reviewsDue.length === 0 });

  // 3, chosen first so "Keep going" leaves it out: the new skill. One started today stays the new skill all day.
  let fresh: string | null = null;
  if (settings.planNew) {
    const startedToday = states.find((state) => state.attempts > 0 && usable(state.skillId) && !input.attempts.some((attempt) => attempt.skillId === state.skillId && attempt.day < today) && practisedToday(state.skillId) > 0);
    fresh = startedToday?.skillId ?? picks.find((pick) => pick.reason === 'next' && (stateOf(pick.skillId)?.attempts ?? 0) === 0 && usable(pick.skillId))?.skillId ?? null;
  }

  // 2. Keep going: skills practised today first (so a tick does not move), then the picks below, then the most
  // recently practised skills in progress.
  if (settings.planKeepGoing > 0) {
    const chosen: string[] = [];
    const take = (skillId: string): void => {
      if (chosen.length < settings.planKeepGoing && skillId !== fresh && !chosen.includes(skillId) && usable(skillId)) chosen.push(skillId);
    };
    for (const state of states) if (practisedToday(state.skillId) > 0 && (inProgress(state) || masteredToday(state.skillId))) take(state.skillId);
    // A grown-up's plan, trouble spots and Sprout's own "continue" picks come next; a plan's skill may not be started yet.
    for (const pick of picks) {
      const state = stateOf(pick.skillId);
      if (pick.reason !== 'review' && pick.reason !== 'next' && (state?.masteredAt ?? null) === null) take(pick.skillId);
    }
    const going = states.filter(inProgress).sort((a, b) => (b.lastPracticedAt ?? '').localeCompare(a.lastPracticedAt ?? ''));
    for (const state of going) take(state.skillId);
    // A child with nothing in progress keeps going with Sprout's next picks.
    for (const pick of picks) if (pick.reason === 'next') take(pick.skillId);
    for (const skillId of chosen) {
      const answered = practisedToday(skillId);
      parts.push({ kind: 'keepGoing', skillId, answered, done: answered >= KEEP_GOING_QUESTIONS || masteredToday(skillId) });
    }
  }

  if (fresh) {
    const answered = practisedToday(fresh);
    parts.push({ kind: 'new', skillId: fresh, answered, done: answered >= NEW_QUESTIONS });
  }

  // 4. The Mixed bag: offered when two topics are in progress, and kept on the list once started today.
  if (settings.planMixed) {
    const answered = todays.filter((attempt) => mixedSessions.has(attempt.sessionId)).length;
    if (answered > 0 || mixedBagOrder(states, LADDERS).length > 0) parts.push({ kind: 'mixed', answered, done: answered >= MIXED_QUESTIONS });
  }
  return parts;
}

// Where a part is done: the review, a skill's practice, the new skill's choice screen (video, lesson, example), or the bag.
export function partPath(part: PlanPart): string {
  if (part.kind === 'review') return '/review';
  if (part.kind === 'mixed') return '/mixed';
  if (part.kind === 'new' && part.answered === 0) return `/skill/${part.skillId}/learn`;
  return `/skill/${part.skillId}`;
}

// The first part not yet done, or null when the plan is finished.
export function nextPart(plan: readonly PlanPart[]): PlanPart | null {
  return plan.find((part) => !part.done) ?? null;
}
