import type { Skill } from '../content/catalogue';
import type { DiagnosticLadder } from '../engine/diagnostic';
import type { Stage } from '../engine/skillscore';
import { stageOf } from '../engine/skillscore';
import { addDays, localDayOf } from '../lib/clock';
import type { Attempt, DiagnosticResult, SkillState } from '../storage/schema';

// What the parent screens show, worked out from saved records. Pure functions.

export const GRADE_NAME: Record<string, string> = { PK: 'Pre-K', K: 'Kindergarten', '1': 'Grade 1', '2': 'Grade 2', all: 'All grades' };

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
