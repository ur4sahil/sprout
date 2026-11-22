import { useEffect, useState } from 'react';
import { isMuted } from '../audio/mute';
import { isSpeechAvailable } from '../audio/speech';
import type { Skill } from '../content/catalogue';
import { CATALOGUE } from '../content/catalogue';
import { LADDERS } from '../content/ladders';
import { allGenerators, generateQuestion } from '../content/registry';
import type { TodayPick } from '../engine/recommend';
import { offeredTo } from '../engine/grades';
import { rankCandidates, recommend } from '../engine/recommend';
import { dueForReview } from '../engine/review';
import { seedFor } from '../engine/seed';
import { lastWasMiss, levelToAsk } from '../engine/skillscore';
import { addDays, localDay, now } from '../lib/clock';
import { logError } from '../lib/errorLog';
import { openRepo } from '../storage/index';
import type { Attempt, Child, DiagnosticProgress, DiagnosticResult, DiagnosticSubject, Plan, Session, SkillState } from '../storage/schema';
import { checkInToday, isFirstVisit, latestPlacements } from './checkIn';
import type { PlanPart } from './todaysPlan';
import { todaysPlan } from './todaysPlan';

// What a child's home screen needs to know about today: picks, the daily goal, reviews due and minutes used.

export interface ChildDay {
  states: SkillState[];
  picks: TodayPick[];
  answeredToday: number;
  minutesToday: number;
  limitReached: boolean; // the parent's daily minutes are used up
  reviewsDue: string[]; // skill ids, at most one session's worth
  checkIn: DiagnosticSubject | null; // the check-in sitting offered today, if any
  firstVisit: boolean; // the child has never opened the check-in
  plan: PlanPart[]; // today's plan (plan section 18)
}

const READY = (): Set<string> => new Set(allGenerators().map((generator) => generator.skillId));

// Whether the next question this child would get on a skill is a listen question.
export function isListenNext(child: Child, skill: Skill, state: SkillState | undefined): boolean {
  const level = levelToAsk(state?.score ?? 0, state ? lastWasMiss(state) : false, skill.maxLevel);
  return generateQuestion(skill.id, level, seedFor(child.id, skill.id, 'practice', state?.attempts ?? 0)).mode === 'listen';
}

export function summariseDay(input: {
  child: Child;
  nowIso: string;
  states: SkillState[];
  attempts: Attempt[]; // the last 14 days
  sessions: Session[];
  plans: Plan[];
  diagnostics: DiagnosticResult[];
  progress?: Readonly<Record<DiagnosticSubject, DiagnosticProgress | null>>; // left out: nothing to check in on
  canListen: boolean;
  skills?: readonly Skill[];
}): ChildDay {
  const { child, nowIso, states, attempts, sessions, plans, diagnostics, canListen } = input;
  const skills = input.skills ?? CATALOGUE;
  const ready = READY();
  const today = localDay(new Date(nowIso));
  const todays = attempts.filter((attempt) => attempt.day === today);

  const placements = latestPlacements(diagnostics);

  const attemptsLast14Days: Record<string, number> = {};
  for (const attempt of attempts) attemptsLast14Days[attempt.skillId] = (attemptsLast14Days[attempt.skillId] ?? 0) + 1;

  const lastSession = sessions.filter((session) => session.kind === 'practice' && session.questions > 0).sort((a, b) => a.startedAt.localeCompare(b.startedAt)).at(-1);
  const stateOf = (skillId: string): SkillState | undefined => states.find((state) => state.skillId === skillId);

  const recommendInput = {
    childId: child.id,
    grade: child.grade,
    nowIso,
    skills,
    ladders: LADDERS,
    states,
    plans,
    placements,
    attemptsLast14Days,
    lastSessionSkillId: lastSession?.skillId ?? null,
    canListen,
    isListenNext: (skillId: string) => {
      const skill = skills.find((row) => row.id === skillId);
      return skill !== undefined && ready.has(skillId) && isListenNext(child, skill, stateOf(skillId));
    },
    hasGenerator: (skillId: string) => ready.has(skillId),
  };
  const picks = recommend(recommendInput);

  // Minutes are the sum of the day's answer times. Each is already capped at two minutes.
  const minutesToday = todays.reduce((sum, attempt) => sum + attempt.ms, 0) / 60_000;
  // A skill the child's grade is not offered (offeredTo) is never reviewed either.
  const offered = (skillId: string): boolean => {
    const skill = skills.find((row) => row.id === skillId);
    return skill !== undefined && offeredTo(skill, child.grade);
  };
  const reviewsDue = dueForReview(states, nowIso)
    .map((state) => state.skillId)
    .filter((skillId) => ready.has(skillId) && offered(skillId));
  return {
    states,
    picks,
    answeredToday: todays.length,
    minutesToday,
    // Minutes a parent added today through the gate count on top of the daily limit.
    limitReached: child.settings.dailyMinutes > 0 && minutesToday >= child.settings.dailyMinutes + (child.settings.extraMinutes.day === today ? child.settings.extraMinutes.minutes : 0),
    reviewsDue,
    checkIn: input.progress ? checkInToday(child.grade, input.progress, today) : null,
    firstVisit: input.progress ? isFirstVisit(child.grade, input.progress) : false,
    plan: todaysPlan({ child, today, states, picks: rankCandidates(recommendInput), reviewsDue, attempts, sessions }),
  };
}

export async function loadChildDay(child: Child): Promise<ChildDay> {
  const { repo } = await openRepo();
  const nowIso = now().toISOString();
  const [states, attempts, sessions, plans, diagnostics, math, ela] = await Promise.all([
    repo.getSkillStates(child.id),
    repo.listAttempts(child.id, { since: addDays(nowIso, -14) }),
    repo.listSessions(child.id, addDays(nowIso, -14)),
    repo.listPlans(),
    repo.listDiagnostics(child.id),
    repo.getDiagnosticProgress(child.id, 'math'),
    repo.getDiagnosticProgress(child.id, 'ela'),
  ]);
  return summariseDay({ child, nowIso, states, attempts, sessions, plans, diagnostics, progress: { math, ela }, canListen: !isMuted() && isSpeechAvailable() });
}

// Loads the child's day once for a screen. `failed` means saved data could not be read.
export function useChildDay(child: Child | null): { day: ChildDay | null; failed: boolean } {
  const [day, setDay] = useState<ChildDay | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (!child) return;
    let alive = true;
    void loadChildDay(child)
      .then((loaded) => {
        if (alive) setDay(loaded);
      })
      .catch((error: unknown) => {
        logError(error);
        if (alive) setFailed(true);
      });
    return () => {
      alive = false;
    };
  }, [child]);
  return { day, failed };
}
