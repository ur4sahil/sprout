import type { Skill } from '../content/catalogue';
import type { Ladder } from '../content/ladders';
import { ladderPrerequisite } from '../content/ladders';
import { daysBetween } from '../lib/clock';
import type { Grade, Plan, SkillState } from '../storage/schema';
import { isPlacedPast } from './fastTrack';
import { gradeRank } from './grades';
import { isReviewDue } from './review';

// Today's picks and trouble spots (plan section 7). Pure functions.

export type PickReason = 'review' | 'plan' | 'troubleSpot' | 'continue' | 'next';

export interface TodayPick {
  skillId: string;
  reason: PickReason;
}

export const MAX_PICKS = 3;
export const RECENT_DAYS = 14;

// Flagged when all three are true: 5 or more attempts in the last 14 days,
// under 60% of recent answers right, and a score under 80.
export function isTroubleSpot(state: Pick<SkillState, 'recent' | 'score'>, attemptsLast14Days: number): boolean {
  if (attemptsLast14Days < 5 || state.score >= 80 || state.recent.length === 0) return false;
  const right = state.recent.filter(Boolean).length;
  return right / state.recent.length < 0.6;
}

export interface RecommendInput {
  childId: string;
  grade: Grade;
  nowIso: string;
  skills: readonly Skill[]; // the catalogue
  ladders: readonly Ladder[]; // in the order of the plan's table
  states: readonly SkillState[]; // this child's
  plans: readonly Plan[];
  // ladder id -> placement skill id. null means the child passed the whole ladder. Absent means not placed yet.
  placements: Readonly<Record<string, string | null>>;
  attemptsLast14Days: Readonly<Record<string, number>>; // by skill id
  lastSessionSkillId: string | null;
  canListen: boolean; // false while the device is muted or has no voice
  isListenNext: (skillId: string) => boolean; // whether the skill's next question would be a listen question
  hasGenerator: (skillId: string) => boolean;
}

// Every candidate in priority order, before the cut to MAX_PICKS. Today's plan reads it to find one skill per subject.
export function rankCandidates(input: RecommendInput): TodayPick[] {
  const skillById = new Map(input.skills.map((skill) => [skill.id, skill]));
  const stateById = new Map(input.states.map((state) => [state.skillId, state]));

  const usable = (skillId: string): boolean => {
    const skill = skillById.get(skillId);
    if (!skill || skill.retired) return false;
    if (!input.hasGenerator(skillId)) return false;
    return input.canListen || !input.isListenNext(skillId);
  };
  const mastered = (skillId: string): boolean => (stateById.get(skillId)?.masteredAt ?? null) !== null;
  const scoreOf = (skillId: string): number => stateById.get(skillId)?.score ?? 0;

  // Candidates in priority order. Later rules only add skills not already listed.
  const candidates: TodayPick[] = [];
  const add = (skillId: string, reason: PickReason): void => {
    if (usable(skillId) && !candidates.some((pick) => pick.skillId === skillId)) candidates.push({ skillId, reason });
  };

  // 1. review: at most one, the longest overdue.
  const due = input.states
    .filter((state) => isReviewDue(state, input.nowIso) && usable(state.skillId))
    .sort((a, b) => (a.reviewDueAt ?? '').localeCompare(b.reviewDueAt ?? '') || a.skillId.localeCompare(b.skillId));
  if (due[0]) add(due[0].skillId, 'review');

  // 2. plan: the first unmastered skill of each plan assigned to this child.
  const plans = input.plans
    .filter((plan) => plan.deletedAt === null && plan.childIds.includes(input.childId))
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id));
  for (const plan of plans) {
    const first = plan.skillIds.find((skillId) => usable(skillId) && !mastered(skillId));
    if (first) add(first, 'plan');
  }

  // 3. troubleSpot: a flagged skill, or its weak prerequisite instead.
  for (const skill of input.skills) {
    const state = stateById.get(skill.id);
    if (!state || mastered(skill.id)) continue;
    if (!isTroubleSpot(state, input.attemptsLast14Days[skill.id] ?? 0)) continue;
    const ladderPrereq = ladderPrerequisite(skill.id);
    const prereqs = [...(ladderPrereq ? [ladderPrereq] : []), ...skill.prereqs];
    const weak = prereqs.find((prereq) => usable(prereq) && scoreOf(prereq) < 70);
    add(weak ?? skill.id, 'troubleSpot');
  }

  // 4. continue: scored 1 to 99 and practised in the last 14 days, highest score first.
  const inProgress = input.states
    .filter(
      (state) =>
        state.masteredAt === null &&
        state.score >= 1 &&
        state.score <= 99 &&
        state.lastPracticedAt !== null &&
        daysBetween(state.lastPracticedAt, input.nowIso) <= RECENT_DAYS,
    )
    .sort((a, b) => b.score - a.score || a.skillId.localeCompare(b.skillId));
  for (const state of inProgress) add(state.skillId, 'continue');

  // 5. next: each ladder's placement skill, or its first unmastered skill at or above the child's grade.
  const childRank = gradeRank(input.grade);
  for (const ladder of input.ladders) {
    const placement = input.placements[ladder.id];
    if (placement === null) continue; // passed the whole ladder
    let from = 0;
    if (placement !== undefined) {
      from = Math.max(0, ladder.skillIds.indexOf(placement));
    } else if (ladder.subject !== 'reasoning') {
      const atGrade = ladder.skillIds.findIndex((skillId) => {
        const skill = skillById.get(skillId);
        return skill !== undefined && gradeRank(skill.grade, input.grade) >= childRank;
      });
      if (atGrade === -1) continue; // nothing on this ladder at or above the child's grade
      from = atGrade;
    }
    // A skill the child was placed past by a test is not offered again: the next one is.
    const next = ladder.skillIds.slice(from).find((skillId) => usable(skillId) && !mastered(skillId) && !isPlacedPast(stateById.get(skillId)));
    if (next) add(next, 'next');
  }

  return candidates;
}

export function recommend(input: RecommendInput): TodayPick[] {
  const skillById = new Map(input.skills.map((skill) => [skill.id, skill]));
  const candidates = rankCandidates(input);
  // Variety: no repeats (already true), two strands when possible, never lead with the last session's skill.
  const picks = candidates.slice(0, MAX_PICKS);
  const strandOf = (pick: TodayPick): string => skillById.get(pick.skillId)?.strand ?? '';
  if (picks.length === MAX_PICKS && new Set(picks.map(strandOf)).size === 1) {
    const other = candidates.slice(MAX_PICKS).find((pick) => strandOf(pick) !== strandOf(picks[0] as TodayPick));
    if (other) picks[MAX_PICKS - 1] = other;
  }
  if (picks.length > 1 && picks[0]?.skillId === input.lastSessionSkillId) {
    const [first, ...rest] = picks as [TodayPick, ...TodayPick[]];
    return [...rest, first];
  }
  return picks;
}
