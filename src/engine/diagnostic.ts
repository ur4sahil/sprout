import type { DiagnosticProgress, DiagnosticSubject, Grade, LadderWalk, SkillState } from '../storage/schema';
import { newSkillState } from '../storage/schema';
import { gradeRank } from './grades';
import type { Level, SkillGrade } from './types';

// The placement diagnostic (plan section 7). Pure functions.
// It walks one ladder at a time and saves skill ids, never positions.

export interface LadderSkill {
  id: string;
  grade: SkillGrade;
  maxLevel: Level;
}

export interface DiagnosticLadder {
  id: string;
  skills: readonly LadderSkill[]; // in ladder order
}

export const DIAGNOSTIC_LEVEL: Level = 2;
export const SITTING_MS = 8 * 60 * 1000;
export const PLACED_OUT_SCORE = 80;

// Questions on one ladder before the walk stops.
export function ladderCap(grade: Grade): number {
  return grade === 'PK' ? 8 : 14;
}

// Questions in one sitting.
export function sittingCap(grade: Grade): number {
  return grade === 'PK' ? 12 : grade === 'K' ? 16 : 20;
}

export function diagnosticLevel(skill: LadderSkill): Level {
  return Math.min(DIAGNOSTIC_LEVEL, skill.maxLevel) as Level;
}

// A ladder is walked when it has 4 or more skills and its first skill is at or below the child's grade.
export function shouldWalk(ladder: DiagnosticLadder, grade: Grade): boolean {
  const first = ladder.skills[0];
  if (!first || ladder.skills.length < 4 || first.grade === 'all') return false;
  return gradeRank(first.grade) <= gradeRank(grade);
}

// On a ladder that is not walked: its first skill at or above the child's grade.
// If every skill is below the child's grade, the top skill.
export function unwalkedPlacement(ladder: DiagnosticLadder, grade: Grade): string | null {
  const found = ladder.skills.find((skill) => gradeRank(skill.grade, grade) >= gradeRank(grade));
  return (found ?? ladder.skills[ladder.skills.length - 1])?.id ?? null;
}

function indexOf(ladder: DiagnosticLadder, skillId: string | null): number {
  return skillId === null ? -1 : ladder.skills.findIndex((skill) => skill.id === skillId);
}

// Where a walk starts: the last placement, else the first skill of the child's grade,
// else the first skill of the next grade up that has one, else the top skill.
export function startSkill(ladder: DiagnosticLadder, grade: Grade, lastPlacement?: string | null): string | null {
  if (ladder.skills.length === 0) return null;
  if (lastPlacement && indexOf(ladder, lastPlacement) !== -1) return lastPlacement;
  const rank = gradeRank(grade);
  const atOrAbove = ladder.skills.find((skill) => gradeRank(skill.grade, grade) >= rank);
  return (atOrAbove ?? (ladder.skills[ladder.skills.length - 1] as LadderSkill)).id;
}

export function newWalk(ladder: DiagnosticLadder, grade: Grade, lastPlacement?: string | null): LadderWalk {
  const start = startSkill(ladder, grade, lastPlacement);
  return { currentSkillId: start, right: 0, wrong: 0, passed: [], failed: [], asked: 0, done: start === null };
}

function bounds(walk: LadderWalk, ladder: DiagnosticLadder): { highestPass: number; lowestFail: number } {
  const passes = walk.passed.map((id) => indexOf(ladder, id)).filter((i) => i >= 0);
  const fails = walk.failed.map((id) => indexOf(ladder, id)).filter((i) => i >= 0);
  return {
    highestPass: passes.length > 0 ? Math.max(...passes) : -1,
    lowestFail: fails.length > 0 ? Math.min(...fails) : ladder.skills.length,
  };
}

const JUMPS = [2, 4, 8] as const;
function jump(stepsSoFar: number): number {
  return JUMPS[Math.min(Math.max(stepsSoFar - 1, 0), JUMPS.length - 1)] as number;
}

// The walk after one answer. `cap` is the most questions this ladder may ask.
export function answerWalk(walk: LadderWalk, ladder: DiagnosticLadder, correct: boolean, cap: number): LadderWalk {
  const current = indexOf(ladder, walk.currentSkillId);
  if (walk.done || current === -1) return walk;

  const right = walk.right + (correct ? 1 : 0);
  const wrong = walk.wrong + (correct ? 0 : 1);
  const asked = walk.asked + 1;
  const decided = right >= 2 || wrong >= 2;
  if (!decided) {
    // One more question on this skill, unless the ladder has used up its questions.
    return { ...walk, right, wrong, asked, done: asked >= cap };
  }

  const id = walk.currentSkillId as string;
  let passed = walk.passed.slice();
  let failed = walk.failed.slice();
  if (right >= 2) {
    // A pass at or above an earlier fail cannot stand: the fail wins.
    const lowestFailSoFar = bounds(walk, ladder).lowestFail;
    if (current < lowestFailSoFar) passed.push(id);
  } else {
    failed.push(id);
    passed = passed.filter((passedId) => indexOf(ladder, passedId) < current);
  }
  failed = [...new Set(failed)];

  const next: LadderWalk = { currentSkillId: null, right: 0, wrong: 0, passed, failed, asked, done: false };
  const { highestPass, lowestFail } = bounds(next, ladder);
  const top = ladder.skills.length - 1;

  // Stop: the lowest fail sits directly above the highest pass. That also covers
  // "the top skill is passed" and "the bottom skill is failed".
  if (lowestFail === highestPass + 1 || asked >= cap) return { ...next, done: true };

  const tested = new Set([...passed, ...failed]);
  let target: number;
  if (lowestFail > top) target = Math.min(top, highestPass + jump(passed.length)); // climbing
  else if (highestPass < 0) target = Math.max(0, lowestFail - jump(failed.length)); // going down
  else target = Math.floor((highestPass + lowestFail) / 2); // the middle of what is left

  // A skill is never tested twice. Step to the nearest untested skill inside the open range.
  const open = (index: number): boolean => index > highestPass && index < lowestFail && !tested.has((ladder.skills[index] as LadderSkill).id);
  if (!open(target)) {
    const others = ladder.skills.map((_, index) => index).filter(open);
    if (others.length === 0) return { ...next, done: true };
    target = others.reduce((best, index) => (Math.abs(index - target) < Math.abs(best - target) ? index : best), others[0] as number);
  }
  return { ...next, currentSkillId: (ladder.skills[target] as LadderSkill).id };
}

// The skill to start on: directly above the highest pass, the first skill if nothing passed,
// or null if the top skill passed.
export function placementOf(walk: LadderWalk, ladder: DiagnosticLadder): string | null {
  const { highestPass } = bounds(walk, ladder);
  return ladder.skills[highestPass + 1]?.id ?? null;
}

// The grade of the placement skill, and the share of that grade's skills on the ladder below it.
export function estimateOf(placementSkillId: string | null, ladder: DiagnosticLadder): { grade: Grade | null; fraction: number | null } {
  const index = indexOf(ladder, placementSkillId);
  const skill = ladder.skills[index];
  if (!skill || skill.grade === 'all') return { grade: null, fraction: null };
  const sameGrade = ladder.skills.filter((other) => other.grade === skill.grade);
  const below = ladder.skills.slice(0, index).filter((other) => other.grade === skill.grade).length;
  return { grade: skill.grade, fraction: sameGrade.length === 0 ? 0 : below / sameGrade.length };
}

// Placing out: skills below the placement with a score under 80 are set to 80 and flagged.
// A higher score is never lowered. Returns only the states that changed or were made.
export function applyPlacement(
  states: readonly SkillState[],
  ladder: DiagnosticLadder,
  placementSkillId: string | null,
  childId: string,
  nowIso: string,
): SkillState[] {
  const end = placementSkillId === null ? ladder.skills.length : indexOf(ladder, placementSkillId);
  if (end <= 0) return [];
  const byId = new Map(states.map((state) => [state.skillId, state]));
  const changed: SkillState[] = [];
  for (const skill of ladder.skills.slice(0, end)) {
    const state = byId.get(skill.id) ?? newSkillState(childId, skill.id, nowIso);
    if (state.score >= PLACED_OUT_SCORE) continue;
    changed.push({
      ...state,
      score: PLACED_OUT_SCORE,
      bestScore: Math.max(state.bestScore, PLACED_OUT_SCORE),
      placedOut: true,
      updatedAt: nowIso,
    });
  }
  return changed;
}

// ---- Sittings: a subject's ladders, worked through a few questions at a time ----

export type DiagnosticStep =
  | { kind: 'ask'; ladderId: string; skillId: string; level: Level }
  | { kind: 'sittingOver' } // enough for today, more ladders remain
  | { kind: 'done' }; // every walked ladder is placed

export function newProgress(childId: string, subject: DiagnosticSubject, nowIso: string): DiagnosticProgress {
  return { childId, subject, ladders: {}, sittings: 0, done: false, lastSittingDay: '', updatedAt: nowIso };
}

function walkFor(
  progress: DiagnosticProgress,
  ladder: DiagnosticLadder,
  grade: Grade,
  lastPlacements: Readonly<Record<string, string | null>>,
): LadderWalk {
  return progress.ladders[ladder.id] ?? newWalk(ladder, grade, lastPlacements[ladder.id]);
}

// What to do next. `sitting` is how far this sitting has got.
export function nextStep(
  progress: DiagnosticProgress,
  ladders: readonly DiagnosticLadder[],
  grade: Grade,
  sitting: { asked: number; elapsedMs: number },
  lastPlacements: Readonly<Record<string, string | null>> = {},
): DiagnosticStep {
  for (const ladder of ladders) {
    if (!shouldWalk(ladder, grade)) continue;
    const walk = walkFor(progress, ladder, grade, lastPlacements);
    if (walk.done || walk.currentSkillId === null) continue;
    if (sitting.asked >= sittingCap(grade) || sitting.elapsedMs >= SITTING_MS) return { kind: 'sittingOver' };
    const skill = ladder.skills.find((candidate) => candidate.id === walk.currentSkillId);
    if (!skill) continue;
    return { kind: 'ask', ladderId: ladder.id, skillId: skill.id, level: diagnosticLevel(skill) };
  }
  return { kind: 'done' };
}

// The progress after one answer. Saved after every answer, so a stopped diagnostic resumes.
export function recordAnswer(
  progress: DiagnosticProgress,
  ladders: readonly DiagnosticLadder[],
  grade: Grade,
  ladderId: string,
  correct: boolean,
  nowIso: string,
  lastPlacements: Readonly<Record<string, string | null>> = {},
): DiagnosticProgress {
  const ladder = ladders.find((candidate) => candidate.id === ladderId);
  if (!ladder) return progress;
  const walk = answerWalk(walkFor(progress, ladder, grade, lastPlacements), ladder, correct, ladderCap(grade));
  const laddersNow = { ...progress.ladders, [ladderId]: walk };
  const done = ladders.every((candidate) => !shouldWalk(candidate, grade) || laddersNow[candidate.id]?.done === true);
  return { ...progress, ladders: laddersNow, done, updatedAt: nowIso };
}

export function endSitting(progress: DiagnosticProgress, nowIso: string): DiagnosticProgress {
  return { ...progress, sittings: progress.sittings + 1, updatedAt: nowIso };
}

export interface LadderPlacement {
  ladderId: string;
  walked: boolean;
  placementSkillId: string | null;
  estimateGrade: Grade | null;
  estimateFraction: number | null;
}

// The placement on every ladder of the subject that is settled so far:
// finished walks, and ladders that are never walked.
export function placementsOf(progress: DiagnosticProgress, ladders: readonly DiagnosticLadder[], grade: Grade): LadderPlacement[] {
  const out: LadderPlacement[] = [];
  for (const ladder of ladders) {
    const walked = shouldWalk(ladder, grade);
    let placementSkillId: string | null;
    if (walked) {
      const walk = progress.ladders[ladder.id];
      if (!walk || !walk.done) continue;
      placementSkillId = placementOf(walk, ladder);
    } else {
      placementSkillId = unwalkedPlacement(ladder, grade);
    }
    const estimate = estimateOf(placementSkillId, ladder);
    out.push({ ladderId: ladder.id, walked, placementSkillId, estimateGrade: estimate.grade, estimateFraction: estimate.fraction });
  }
  return out;
}
