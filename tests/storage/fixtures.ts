import type { Attempt, Child, DiagnosticProgress, DiagnosticResult, Flag, Plan, Session, SkillState } from '../../src/storage/schema';
import { defaultSettings, newSkillState } from '../../src/storage/schema';

export const T = (day: number, minute = 0): string => `2026-03-${String(day).padStart(2, '0')}T12:${String(minute).padStart(2, '0')}:00.000Z`;

export function child(id: string, change: Partial<Child> = {}): Child {
  return { id, name: `Child ${id}`, avatar: '🐢', grade: 'K', settings: defaultSettings('K'), resetAt: null, createdAt: T(1), updatedAt: T(1), deletedAt: null, ...change };
}

export function state(childId: string, skillId: string, change: Partial<SkillState> = {}): SkillState {
  return { ...newSkillState(childId, skillId, T(2)), ...change };
}

export function attempt(id: string, childId: string, skillId: string, correct: boolean, createdAt: string, change: Partial<Attempt> = {}): Attempt {
  return {
    id,
    childId,
    skillId,
    sessionId: 'session-1',
    level: 1,
    seed: 42,
    itemType: 'choice',
    response: { index: 1 },
    contentVersion: 1,
    snapshot: { prompt: 'How many?', correct: '3', given: '3' },
    correct,
    ms: 4000,
    scoreBefore: 0,
    scoreAfter: 10,
    kind: 'practice',
    day: createdAt.slice(0, 10),
    createdAt,
    ...change,
  };
}

export function session(id: string, childId: string, startedAt: string, change: Partial<Session> = {}): Session {
  return { id, childId, kind: 'practice', skillId: 'M-K-C4', startedAt, endedAt: null, questions: 3, correct: 2, day: startedAt.slice(0, 10), ...change };
}

export function plan(id: string, change: Partial<Plan> = {}): Plan {
  return { id, name: `Plan ${id}`, skillIds: ['M-K-C4'], childIds: ['a'], createdAt: T(1), updatedAt: T(1), deletedAt: null, ...change };
}

export function diagnostic(id: string, childId: string, takenAt: string): DiagnosticResult {
  return { id, childId, subject: 'math', ladderId: 'counting', placementSkillId: 'M-K-A2', estimateGrade: 'K', estimateFraction: 0.25, takenAt };
}

export function flag(id: string, childId: string, createdAt: string): Flag {
  return { id, childId, attemptId: 'att-1', skillId: 'M-K-C4', level: 1, seed: 42, note: 'The picture is confusing.', createdAt, resolvedAt: null };
}

export function progress(childId: string, updatedAt: string, change: Partial<DiagnosticProgress> = {}): DiagnosticProgress {
  return {
    childId,
    subject: 'math',
    ladders: { counting: { currentSkillId: 'M-K-A1', right: 1, wrong: 0, passed: ['M-PK-A8'], failed: [], asked: 3, done: false } },
    sittings: 1,
    done: false,
    lastSittingDay: '',
    updatedAt,
    ...change,
  };
}
