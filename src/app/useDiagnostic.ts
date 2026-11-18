import { useCallback, useEffect, useRef, useState } from 'react';
import { stop } from '../audio/speech';
import { skillById } from '../content/catalogue';
import { nextQuestion } from '../content/registry';
import { check } from '../engine/check';
import { describeAnswer, describePrompt, describeResponse } from '../engine/describe';
import type { DiagnosticLadder } from '../engine/diagnostic';
import { endSitting, newProgress, nextStep, recordAnswer } from '../engine/diagnostic';
import { seedFor } from '../engine/seed';
import type { Question, Response } from '../engine/types';
import { localDay, now } from '../lib/clock';
import { logError } from '../lib/errorLog';
import { newId } from '../lib/ids';
import { openRepo } from '../storage/index';
import type { Attempt, Child, DiagnosticProgress, DiagnosticSubject, Session, SkillState } from '../storage/schema';
import { diagnosticLadders, latestPlacements, settle } from './checkIn';
import { TIMING } from './timing';

// One sitting of the placement check-in. No answer is marked right or wrong on screen, and no
// Skill Score moves: the answers only decide where the child starts on each ladder.

export type DiagnosticPhase = 'loading' | 'asking' | 'saving' | 'sittingOver' | 'done' | 'failed';

export interface Diagnostic {
  phase: DiagnosticPhase;
  question: Question | null;
  asked: number; // questions answered in this sitting
  response: Response | null;
  saveError: string | null;
  setResponse: (response: Response | null) => void;
  submit: () => void;
  dontKnow: () => void; // "I don't know yet": counts as wrong, and keeps a child from guessing
}

export const DONT_KNOW = "I don't know yet";

export function useDiagnostic(child: Child, subject: DiagnosticSubject): Diagnostic {
  const [phase, setPhase] = useState<DiagnosticPhase>('loading');
  const [question, setQuestion] = useState<Question | null>(null);
  const [asked, setAsked] = useState(0);
  const [response, setResponse] = useState<Response | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const live = useRef<{
    ladders: DiagnosticLadder[];
    progress: DiagnosticProgress | null;
    placements: Record<string, string | null>;
    states: SkillState[];
    askedBefore: Record<string, number>; // check-in answers the child has ever given, by skill
    keys: Record<string, string[]>;
    session: Session | null;
    startedAt: Date;
    asked: number;
    ladderId: string;
    question: Question | null;
    shownAt: Date;
    alive: boolean;
  }>({ ladders: [], progress: null, placements: {}, states: [], askedBefore: {}, keys: {}, session: null, startedAt: now(), asked: 0, ladderId: '', question: null, shownAt: now(), alive: true });

  // Shows the next question, or ends the sitting.
  const step = useCallback(async (): Promise<void> => {
    const self = live.current;
    const progress = self.progress;
    if (!progress) return;
    // A finished check-in asks nothing more, whatever has been added to the ladders since.
    const next = progress.done
      ? ({ kind: 'done' } as const)
      : nextStep(progress, self.ladders, child.grade, { asked: self.asked, elapsedMs: now().getTime() - self.startedAt.getTime() }, self.placements);
    if (next.kind === 'ask') {
      const q = nextQuestion(next.skillId, next.level, seedFor(child.id, next.skillId, 'diagnostic', self.askedBefore[next.skillId] ?? 0), self.keys[next.skillId] ?? []);
      self.ladderId = next.ladderId;
      self.question = q;
      self.shownAt = now();
      setQuestion(q);
      setResponse(null);
      setSaveError(null);
      setPhase('asking');
      return;
    }
    // A sitting that asked something counts, and home offers no other check-in today.
    if (self.asked > 0) {
      const at = now();
      const ended = { ...endSitting(progress, at.toISOString()), lastSittingDay: localDay(at) };
      const { repo } = await openRepo();
      await repo.saveDiagnosticProgress(ended);
      if (self.session) await repo.saveSession({ ...self.session, endedAt: at.toISOString() });
      self.progress = ended;
      self.session = null;
    }
    if (!self.alive) return;
    setQuestion(null);
    setPhase(next.kind === 'done' ? 'done' : 'sittingOver');
  }, [child]);

  useEffect(() => {
    const self = live.current;
    self.alive = true;
    void (async () => {
      try {
        const { repo } = await openRepo();
        const at = now();
        self.ladders = diagnosticLadders(subject);
        let progress = await repo.getDiagnosticProgress(child.id, subject);
        if (!progress) {
          // Saved straight away, so home knows the first check-in has been opened.
          progress = newProgress(child.id, subject, at.toISOString());
          await repo.saveDiagnosticProgress(progress);
        }
        self.progress = progress;
        self.placements = latestPlacements((await repo.listDiagnostics(child.id)).filter((result) => result.subject === subject));
        self.states = await repo.getSkillStates(child.id);
        self.askedBefore = {};
        for (const attempt of await repo.listAttempts(child.id, {})) {
          if (attempt.kind === 'diagnostic') self.askedBefore[attempt.skillId] = (self.askedBefore[attempt.skillId] ?? 0) + 1;
        }
        self.keys = {};
        self.asked = 0;
        self.startedAt = at;
        self.session = { id: newId(), childId: child.id, kind: 'diagnostic', skillId: null, startedAt: at.toISOString(), endedAt: null, questions: 0, correct: 0, day: localDay(at), mixed: false };
        if (self.alive) await step();
      } catch (error) {
        logError(error);
        if (self.alive) setPhase('failed');
      }
    })();
    return () => {
      self.alive = false;
      stop();
      const session = self.session;
      if (session && session.questions > 0) {
        void openRepo()
          .then(({ repo }) => repo.saveSession({ ...session, endedAt: now().toISOString() }))
          .catch(logError);
      }
    };
  }, [child, subject, step]);

  const answer = useCallback(
    (given: Response | null): void => {
      const self = live.current;
      const q = self.question;
      const progress = self.progress;
      const session = self.session;
      if (phase !== 'asking' || !q || !progress || !session) return;
      if (now().getTime() - self.shownAt.getTime() < TIMING.tapGuardMs) return;
      const skill = skillById(q.skillId);
      if (!skill) return;
      setPhase('saving');
      setSaveError(null);
      void (async () => {
        const at = now();
        const correct = given !== null && check(q, given);
        const score = self.states.find((state) => state.skillId === q.skillId)?.score ?? 0;
        const attempt: Attempt = {
          id: newId(),
          childId: child.id,
          skillId: q.skillId,
          sessionId: session.id,
          level: q.level,
          seed: q.seed,
          itemType: q.type,
          response: given,
          contentVersion: skill.version,
          snapshot: { prompt: describePrompt(q), correct: describeAnswer(q), given: given === null ? DONT_KNOW : describeResponse(q, given) },
          correct,
          ms: Math.min(Math.max(at.getTime() - self.shownAt.getTime(), 0), TIMING.maxAnswerMs),
          // A check-in answer never changes a Skill Score.
          scoreBefore: score,
          scoreAfter: score,
          kind: 'diagnostic',
          day: localDay(at),
          createdAt: at.toISOString(),
        };
        const after = recordAnswer(progress, self.ladders, child.grade, self.ladderId, correct, at.toISOString(), self.placements);
        const settled = settle({ child, subject, before: progress, after, ladders: self.ladders, states: self.states, nowIso: at.toISOString() });
        const nextSession = { ...session, questions: session.questions + 1, correct: session.correct + (correct ? 1 : 0) };
        try {
          const { repo } = await openRepo();
          // All of it in one step: either the whole answer is saved, or the question is asked again.
          await repo.saveAnswer({ attempt, diagnostics: settled.results, states: settled.states, session: nextSession, progress: after });
        } catch (error) {
          logError(error);
          if (!self.alive) return;
          setSaveError('Your answer could not be saved. Tap again to try once more.');
          setPhase('asking');
          return;
        }
        self.progress = after;
        self.session = nextSession;
        self.states = [...self.states.filter((state) => !settled.states.some((changed) => changed.skillId === state.skillId)), ...settled.states];
        self.askedBefore[q.skillId] = (self.askedBefore[q.skillId] ?? 0) + 1;
        self.keys[q.skillId] = [...(self.keys[q.skillId] ?? []), q.key].slice(-6);
        self.asked += 1;
        if (!self.alive) return;
        setAsked(self.asked);
        try {
          await step();
        } catch (error) {
          logError(error);
          if (self.alive) setPhase('failed');
        }
      })();
    },
    [child, phase, step, subject],
  );

  const submit = useCallback((): void => {
    if (response) answer(response);
  }, [answer, response]);
  const dontKnow = useCallback((): void => answer(null), [answer]);

  return { phase, question, asked, response, saveError, setResponse, submit, dontKnow };
}
