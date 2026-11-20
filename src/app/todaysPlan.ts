import { skillById } from '../content/catalogue';
import { LADDERS } from '../content/ladders';
import type { Skill } from '../content/catalogue';
import type { TodayPick } from '../engine/recommend';
import type { Attempt, Child, Session, SkillState } from '../storage/schema';
import { REVIEW_QUESTIONS } from '../engine/review';
import { inProgress, mixedBagOrder } from './mixedBag';

// Today's plan (plan section 18): one list in order, each part ticked off when done.
// 1. Review the mastered skills that are due. 2. Practice: one skill in each subject the grown-up picked (Math,
// Language Arts, Reasoning; the owner's choice, Nov 18, 2026). 3. A new skill. 4. The Mixed bag, open whenever there
// are two topics to mix (mixedBag.ts).
// Each part has a fixed size; a grown-up sets the parts for each child. The home screen's goal is the plan's
// questions added up (the owner's choice, Nov 18, 2026), so there is one goal for the day, not two.

const SUBJECTS: readonly Skill['subject'][] = ['math', 'ela', 'reasoning'];

export const KEEP_GOING_QUESTIONS = 10; // answers today on a Practice skill to tick it off
export const NEW_QUESTIONS = 5; // answers today on the new skill to tick it off
export const MIXED_QUESTIONS = 10; // Mixed bag answers today to tick it off

export type PlanPart =
  | { kind: 'review'; skillIds: string[]; answered: number; done: boolean } // skillIds: the ones still due
  | { kind: 'keepGoing'; subject: Skill['subject']; skillId: string; answered: number; done: boolean }
  | { kind: 'new'; skillId: string; answered: number; done: boolean }
  | { kind: 'mixed'; answered: number; done: boolean; locked: boolean }; // locked: nothing to mix yet

export function todaysPlan(input: {
  child: Child;
  today: string; // the local day
  states: readonly SkillState[];
  picks: readonly TodayPick[]; // every candidate in priority order (rankCandidates)
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
  const reviewAnswers = todays.filter((attempt) => attempt.kind === 'review').length;
  if (reviewsDue.length > 0 || reviewAnswers > 0) parts.push({ kind: 'review', skillIds: [...reviewsDue], answered: reviewAnswers, done: reviewsDue.length === 0 });

  // 3, chosen first so "Keep going" leaves it out: the new skill. One started today stays the new skill all day.
  let fresh: string | null = null;
  if (settings.planNew) {
    const startedToday = states.find((state) => state.attempts > 0 && usable(state.skillId) && !input.attempts.some((attempt) => attempt.skillId === state.skillId && attempt.day < today) && practisedToday(state.skillId) > 0);
    fresh = startedToday?.skillId ?? picks.find((pick) => pick.reason === 'next' && (stateOf(pick.skillId)?.attempts ?? 0) === 0 && usable(pick.skillId))?.skillId ?? null;
  }

  // 2. Practice: one skill for each subject picked. In a subject: a skill practised today first (so a tick does not
  // move), then a grown-up's plan, trouble spots and Sprout's "continue" picks, then the most recently practised skill
  // in progress, then Sprout's next pick. Today's new skill is never also a Practice skill.
  const chosen = new Set<string>();
  for (const subject of SUBJECTS) {
    if (!settings.planPractice.includes(subject)) continue;
    const mine = (skillId: string): boolean => skillById(skillId)?.subject === subject && skillId !== fresh && !chosen.has(skillId) && usable(skillId);
    const today = states
      .filter((state) => mine(state.skillId) && practisedToday(state.skillId) > 0 && (inProgress(state) || masteredToday(state.skillId)))
      .sort((a, b) => practisedToday(b.skillId) - practisedToday(a.skillId) || a.skillId.localeCompare(b.skillId))[0]?.skillId;
    const picked = picks.find((pick) => pick.reason !== 'review' && pick.reason !== 'next' && mine(pick.skillId) && (stateOf(pick.skillId)?.masteredAt ?? null) === null)?.skillId;
    const going = states
      .filter((state) => mine(state.skillId) && inProgress(state))
      .sort((a, b) => (b.lastPracticedAt ?? '').localeCompare(a.lastPracticedAt ?? ''))[0]?.skillId;
    const next = picks.find((pick) => pick.reason === 'next' && mine(pick.skillId))?.skillId;
    const skillId = today ?? picked ?? going ?? next;
    if (!skillId) continue;
    chosen.add(skillId);
    const answered = practisedToday(skillId);
    parts.push({ kind: 'keepGoing', subject, skillId, answered, done: answered >= KEEP_GOING_QUESTIONS || masteredToday(skillId) });
  }

  if (fresh) {
    const answered = practisedToday(fresh);
    parts.push({ kind: 'new', skillId: fresh, answered, done: answered >= NEW_QUESTIONS });
  }

  // 4. The Mixed bag: open whenever it has two topics to mix, which takes each topic's next skill when its skills are
  // all mastered, and topics not yet practised (the owner's choice, Nov 19, 2026). Greyed out only with nothing to mix.
  if (settings.planMixed) {
    const answered = todays.filter((attempt) => mixedSessions.has(attempt.sessionId)).length;
    const locked = answered === 0 && mixedBagOrder(states, LADDERS, child.grade).length === 0;
    parts.push({ kind: 'mixed', answered, done: !locked && answered >= MIXED_QUESTIONS, locked });
  }
  return parts;
}

// How many questions a part asks. A review asks REVIEW_QUESTIONS on each skill: the ones reviewed today, and the
// ones still due (a skill half reviewed is still due, so it is not counted twice).
export function partSize(part: PlanPart): number {
  switch (part.kind) {
    case 'review': {
      const started = Math.ceil(part.answered / REVIEW_QUESTIONS);
      const halfDone = part.answered % REVIEW_QUESTIONS > 0 ? 1 : 0;
      return (started + Math.max(part.skillIds.length - halfDone, 0)) * REVIEW_QUESTIONS;
    }
    case 'keepGoing':
      return KEEP_GOING_QUESTIONS;
    case 'new':
      return NEW_QUESTIONS;
    case 'mixed':
      return part.locked ? 0 : MIXED_QUESTIONS; // a greyed-out Mixed bag is not part of the goal
  }
}

// The day's goal: the plan's questions added up, and how many of them are answered. Answers past a part's size, or on
// skills outside the plan, do not count; a part ticked off early (a skill mastered today) counts in full.
export function planProgress(plan: readonly PlanPart[]): { done: number; goal: number } {
  let done = 0;
  let goal = 0;
  for (const part of plan) {
    const size = partSize(part);
    goal += size;
    done += part.done ? size : Math.min(part.answered, size);
  }
  return { done, goal };
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
  return plan.find((part) => !part.done && !(part.kind === 'mixed' && part.locked)) ?? null;
}
