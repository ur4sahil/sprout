import type { SkillState } from '../storage/schema';
import { FAST_RUN } from './fastTrack';
import { scheduleFirstReview } from './review';
import type { Level } from './types';

// Skill Score rules (plan section 6). Pure functions.

export type Stage = 'notStarted' | 'gettingStarted' | 'practising' | 'proficient' | 'challenge' | 'mastered';

export const MILESTONES = [50, 80, 90, 100] as const;
export const CHALLENGE = 90;

export function stageOf(score: number, attempts: number, placedOut = false): Stage {
  if (score >= 100) return 'mastered';
  if (score >= 90) return 'challenge';
  if (score >= 80) return 'proficient';
  if (score >= 40) return 'practising';
  if (score === 0 && attempts === 0 && !placedOut) return 'notStarted';
  return 'gettingStarted';
}

// The question level a score calls for, before the after-a-miss step down.
export function stageLevel(score: number): Level {
  if (score >= 90) return 4;
  if (score >= 70) return 3;
  if (score >= 40) return 2;
  return 1;
}

// Rule 8: the stage's level, one easier straight after a miss, clamped to the skill.
export function levelToAsk(score: number, afterMiss: boolean, maxLevel: Level): Level {
  const wanted = stageLevel(score) - (afterMiss ? 1 : 0);
  return Math.min(Math.max(wanted, 1), maxLevel) as Level;
}

// Whether the child's latest answer on this skill was wrong.
export function lastWasMiss(state: Pick<SkillState, 'recent'>): boolean {
  return state.recent.length > 0 && state.recent[state.recent.length - 1] === false;
}

interface Band {
  below: number; // scores under this
  gain: number;
  loss: number;
  gentleLoss: number;
}

const BANDS: readonly Band[] = [
  { below: 30, gain: 10, loss: 2, gentleLoss: 1 },
  { below: 50, gain: 8, loss: 4, gentleLoss: 2 },
  { below: 70, gain: 6, loss: 6, gentleLoss: 3 },
  { below: 80, gain: 5, loss: 7, gentleLoss: 4 },
  { below: 90, gain: 4, loss: 8, gentleLoss: 4 },
  { below: 100, gain: 2, loss: 8, gentleLoss: 4 },
];

function bandFor(score: number): Band {
  return BANDS.find((band) => score < band.below) ?? (BANDS[BANDS.length - 1] as Band);
}

export interface ScoreState {
  score: number;
  streak: number;
  masteredAt: string | null;
}

export interface ScoreResult {
  score: number;
  streak: number;
  mastered: boolean; // true when this answer reached 100
}

// A right answer given after a hint gains half its band's points (rounded up), with no streak bonus, and leaves
// the streak where it was (the owner's choice, Nov 21, 2026). A wrong answer after a hint is like any wrong answer.
export function hintedGain(band: number): number {
  return Math.ceil(band / 2);
}

// The new score and streak after one practice answer.
export function applyAnswer(state: ScoreState, correct: boolean, gentle: boolean, hinted = false): ScoreResult {
  const helped = correct && hinted;
  const streak = correct ? (helped ? state.streak : state.streak + 1) : 0;
  // Rule 5: once mastered, practice never lowers the score.
  if (state.masteredAt !== null || state.score >= 100) return { score: 100, streak, mastered: false };

  const band = bandFor(state.score);
  if (!correct) {
    const loss = gentle ? band.gentleLoss : band.loss;
    return { score: Math.max(0, state.score - loss), streak, mastered: false };
  }
  const gain = helped ? hintedGain(band.gain) : band.gain;
  let score: number;
  if (state.score < CHALLENGE) {
    const bonus = helped ? 0 : Math.min(3, Math.max(0, state.streak - 1)); // rule 1
    score = Math.min(CHALLENGE, state.score + gain + bonus); // rule 2
  } else {
    score = Math.min(100, state.score + gain);
  }
  return { score, streak, mastered: score >= 100 };
}

export interface PracticeResult {
  state: SkillState;
  milestones: number[]; // 50, 80, 90, 100: the ones this answer crossed for the first time
  mastered: boolean;
}

// The whole skill state after one practice answer. `hinted`: the child opened a hint on this question.
export function applyPractice(state: SkillState, correct: boolean, gentle: boolean, nowIso: string, hinted = false): PracticeResult {
  const helped = correct && hinted;
  const result = applyAnswer(state, correct, gentle, hinted);
  // The fast track: the first five answers on a skill, all right without a hint, take the score straight to the challenge zone.
  if (correct && !helped && state.attempts === FAST_RUN - 1 && state.correct === FAST_RUN - 1 && state.hintedRight === 0 && result.score < CHALLENGE) result.score = CHALLENGE;
  const milestones = MILESTONES.filter((mark) => result.score >= mark && state.bestScore < mark);
  const next: SkillState = {
    ...state,
    score: result.score,
    bestScore: Math.max(state.bestScore, result.score),
    streak: result.streak,
    attempts: state.attempts + 1,
    correct: state.correct + (correct ? 1 : 0),
    hintedRight: state.hintedRight + (helped ? 1 : 0),
    recent: [...state.recent, correct].slice(-10),
    lastPracticedAt: nowIso,
    updatedAt: nowIso,
  };
  if (result.mastered) {
    next.masteredAt = nowIso;
    Object.assign(next, scheduleFirstReview(nowIso));
  }
  return { state: next, milestones, mastered: result.mastered };
}
