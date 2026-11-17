import type { Skill } from '../content/catalogue';
import { generateQuestion } from '../content/registry';
import { describeAnswer, describePrompt, describeResponse } from '../engine/describe';
import { isTroubleSpot } from '../engine/recommend';
import type { Question, Response } from '../engine/types';
import type { DiagnosticLadder } from '../engine/diagnostic';
import type { Stage } from '../engine/skillscore';
import { stageOf } from '../engine/skillscore';
import { addDays, localDayOf } from '../lib/clock';
import type { Attempt, DiagnosticResult, SkillState } from '../storage/schema';

// What the parent screens show, worked out from saved records. Pure functions.

export const GRADE_NAME: Record<string, string> = { PK: 'Pre-K', K: 'Kindergarten', '1': 'Grade 1', '2': 'Grade 2', '3': 'Grade 3', all: 'All grades' };

export const LADDER_NAME: Record<string, string> = {
  counting: 'Counting',
  comparing: 'Comparing',
  'add-subtract': 'Adding and subtracting',
  'place-value': 'Tens and ones',
  shapes: 'Shapes',
  length: 'Length',
  patterns: 'Patterns',
  data: 'Sorting and graphs',
  time: 'Time',
  money: 'Money',
  fractions: 'Fractions',
  letters: 'Letters',
  sounds: 'Sounds',
  phonics: 'Phonics',
  'sight-words': 'Sight words',
  grammar: 'Grammar',
  vocabulary: 'Words',
  reading: 'Reading',
};

export const STAGE_NAME: Record<Stage, string> = {
  notStarted: 'Not started',
  gettingStarted: 'Getting started',
  practising: 'Practising',
  proficient: 'Proficient',
  challenge: 'Challenge',
  mastered: 'Mastered',
};

export interface DayBar {
  day: string; // local date, YYYY-MM-DD
  questions: number;
  minutes: number; // whole minutes, rounded
}

// Questions and minutes for each of the last `days` local days, oldest first. Days with no practice are there with zeros.
export function dayBars(attempts: readonly Attempt[], nowIso: string, days = 14): DayBar[] {
  const out: DayBar[] = [];
  for (let back = days - 1; back >= 0; back -= 1) {
    const day = localDayOf(addDays(nowIso, -back));
    const todays = attempts.filter((attempt) => attempt.day === day);
    out.push({ day, questions: todays.length, minutes: Math.round(todays.reduce((sum, attempt) => sum + attempt.ms, 0) / 60_000) });
  }
  return out;
}

// Where the check-in placed a child on one ladder, in words (plan section 7).
export function ladderLevel(result: DiagnosticResult, ladder: DiagnosticLadder | undefined, skillName: (id: string) => string): string {
  if (result.placementSkillId === null) return 'Finished this ladder';
  const grade = result.estimateGrade;
  const inGrade = ladder && grade ? ladder.skills.filter((skill) => skill.grade === grade).length : 0;
  if (grade && result.estimateFraction !== null && inGrade >= 3) return `${GRADE_NAME[grade] ?? grade}, ${Math.round(result.estimateFraction * 100)}% through`;
  return `Working on ${skillName(result.placementSkillId)}`;
}

export interface ScoreRow {
  skill: Skill;
  score: number;
  stage: Stage;
  attempts: number;
  accuracy: number | null; // 0 to 100, null before any answer
  minutes: number;
  lastPracticedAt: string | null;
}

export function scoreRows(skills: readonly Skill[], states: readonly SkillState[], attempts: readonly Attempt[]): ScoreRow[] {
  const byId = new Map(states.map((state) => [state.skillId, state]));
  const ms = new Map<string, number>();
  for (const attempt of attempts) ms.set(attempt.skillId, (ms.get(attempt.skillId) ?? 0) + attempt.ms);
  return skills.map((skill) => {
    const state = byId.get(skill.id);
    return {
      skill,
      score: state?.score ?? 0,
      stage: stageOf(state?.score ?? 0, state?.attempts ?? 0, state?.placedOut ?? false),
      attempts: state?.attempts ?? 0,
      accuracy: state && state.attempts > 0 ? Math.round((state.correct / state.attempts) * 100) : null,
      minutes: Math.round((ms.get(skill.id) ?? 0) / 60_000),
      lastPracticedAt: state?.lastPracticedAt ?? null,
    };
  });
}

export type ScoreSort = 'skill' | 'score' | 'attempts' | 'accuracy' | 'minutes' | 'last';

// Rows in the order asked for. "skill" is catalogue order. The others put the biggest or newest first.
// The rows of one lettered group, such as Math, Kindergarten, "C. Adding and subtracting".
export function categoryRows(rows: readonly ScoreRow[], skill: Pick<Skill, 'subject' | 'grade' | 'category'>): ScoreRow[] {
  return rows.filter((row) => row.skill.subject === skill.subject && row.skill.grade === skill.grade && row.skill.category === skill.category);
}

// A group is complete when every skill in it is mastered. A parent can then print a certificate for it.
export function categoryComplete(rows: readonly ScoreRow[], skill: Pick<Skill, 'subject' | 'grade' | 'category'>): boolean {
  const group = categoryRows(rows, skill);
  return group.length > 0 && group.every((row) => row.stage === 'mastered');
}

export function sortRows(rows: readonly ScoreRow[], by: ScoreSort): ScoreRow[] {
  if (by === 'skill') return rows.slice();
  const value = (row: ScoreRow): number | string => (by === 'score' ? row.score : by === 'attempts' ? row.attempts : by === 'accuracy' ? (row.accuracy ?? -1) : by === 'minutes' ? row.minutes : (row.lastPracticedAt ?? ''));
  return rows
    .map((row, index) => ({ row, index }))
    .sort((a, b) => {
      const [x, y] = [value(a.row), value(b.row)];
      return (x < y ? 1 : x > y ? -1 : 0) || a.index - b.index;
    })
    .map(({ row }) => row);
}

// ---- Trouble spots and the question log ----

export interface TroubleSpot {
  skill: Skill;
  state: SkillState;
  missed: Attempt[]; // the three most recent wrong answers, newest first
}

// Skills flagged as trouble spots (plan section 7): 5 or more answers in the last 14 days,
// under 60% of recent answers right, and a score under 80. `recent` is the child's last 14 days of attempts.
export function troubleSpots(skills: readonly Skill[], states: readonly SkillState[], recent: readonly Attempt[]): TroubleSpot[] {
  const counts = new Map<string, number>();
  for (const attempt of recent) counts.set(attempt.skillId, (counts.get(attempt.skillId) ?? 0) + 1);
  const byId = new Map(states.map((state) => [state.skillId, state]));
  return skills.flatMap((skill) => {
    const state = byId.get(skill.id);
    if (!state || state.masteredAt !== null || !isTroubleSpot(state, counts.get(skill.id) ?? 0)) return [];
    const missed = recent
      .filter((attempt) => attempt.skillId === skill.id && !attempt.correct)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 3);
    return [{ skill, state, missed }];
  });
}

export interface Redrawn {
  question: Question | null; // made again from the skill, level and seed. null when the skill has changed since
  prompt: string;
  given: string;
  correct: string;
}

// A logged answer shown again. When the skill's version is the one the child answered, the question is
// made again from its level and seed. When the skill has changed since, the saved snapshot is shown instead.
export function redraw(attempt: Attempt, skill: Skill | undefined): Redrawn {
  const snapshot = { question: null, prompt: attempt.snapshot.prompt, given: attempt.snapshot.given, correct: attempt.snapshot.correct };
  if (!skill || skill.version !== attempt.contentVersion) return snapshot;
  try {
    const question = generateQuestion(attempt.skillId, attempt.level, attempt.seed);
    if (question.type !== attempt.itemType) return snapshot;
    // "I don't know yet" in a check-in has no response to describe.
    const given = attempt.response === null || attempt.response === undefined ? attempt.snapshot.given : describeResponse(question, attempt.response as Response);
    return { question, prompt: describePrompt(question), given, correct: describeAnswer(question) };
  } catch {
    return snapshot;
  }
}

export type LogPeriod = 'all' | 'today' | 'week';

// The question log: newest first, for one skill or all, and for today, the last 7 days or all time.
export function filterLog(attempts: readonly Attempt[], skillId: string, period: LogPeriod, nowIso: string): Attempt[] {
  const today = localDayOf(nowIso);
  const weekAgo = localDayOf(addDays(nowIso, -6));
  return attempts
    .filter((attempt) => (skillId === 'all' || attempt.skillId === skillId) && (period === 'all' || (period === 'today' ? attempt.day === today : attempt.day >= weekAgo)))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id));
}
