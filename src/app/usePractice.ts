import { useCallback, useEffect, useRef, useState } from 'react';
import { PRAISE } from '../audio/say';
import { playSfx } from '../audio/sfx';
import { speak, speakPhrase, stop } from '../audio/speech';
import { MILESTONE_WORDS } from '../components/Celebration';
import type { Skill } from '../content/catalogue';
import { nextQuestion } from '../content/registry';
import { makeRng } from '../engine/rng';
import { seedFor } from '../engine/seed';
import { lastWasMiss, levelToAsk } from '../engine/skillscore';
import type { Question, Response } from '../engine/types';
import { now } from '../lib/clock';
import { logError } from '../lib/errorLog';
import { openRepo } from '../storage/index';
import type { Child, Session, SkillState } from '../storage/schema';
import { newSkillState } from '../storage/schema';
import type { AnswerOutcome } from './practiceRecord';
import { newSession, recentKeys, recordAnswer } from './practiceRecord';
import { TIMING } from './timing';

// One child practising one skill: which question is showing, and what happens after each answer.

export type PracticePhase = 'loading' | 'asking' | 'saving' | 'correct' | 'wrong' | 'celebrating' | 'break' | 'failed';

export interface Practice {
  phase: PracticePhase;
  question: Question | null;
  state: SkillState | null;
  answered: number; // in this sitting
  response: Response | null; // the answer so far
  lastResponse: Response | null; // the answer just submitted
  milestone: number | null; // the one being celebrated
  saveError: string | null;
  startedAt: string | null;
  setResponse: (response: Response | null) => void;
  submit: (response?: Response) => void;
  gotIt: () => void; // closes the explanation
  afterCelebration: () => void;
  keepGoing: () => void; // leaves the soft break
}

const wait = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

function pickQuestion(child: Child, skill: Skill, state: SkillState, keys: readonly string[]): Question {
  const level = levelToAsk(state.score, lastWasMiss(state), skill.maxLevel);
  // n is how many answers the child has already given on this skill.
  return nextQuestion(skill.id, level, seedFor(child.id, skill.id, 'practice', state.attempts), keys);
}

// `sessions` is set for a pick in a Play run: it lasts one session length, then stops for the next pick.
// Practice opened by itself has no sessions: it carries on until the score reaches 100, or the child leaves.
export function usePractice(child: Child, skill: Skill, options: { sessions?: boolean } = {}): Practice {
  const sessions = options.sessions === true;
  const [phase, setPhase] = useState<PracticePhase>('loading');
  const [question, setQuestion] = useState<Question | null>(null);
  const [state, setState] = useState<SkillState | null>(null);
  const [answered, setAnswered] = useState(0);
  const [response, setResponse] = useState<Response | null>(null);
  const [lastResponse, setLastResponse] = useState<Response | null>(null);
  const [milestone, setMilestone] = useState<number | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [startedAt, setStartedAt] = useState<string | null>(null);

  // What the answer flow needs between renders.
  const live = useRef<{
    state: SkillState | null;
    session: Session | null;
    keys: string[];
    question: Question | null;
    shownAt: Date;
    answered: number;
    pending: AnswerOutcome | null; // an answer worked out but not yet saved, kept for a retry
    crossed: number[];
    alive: boolean;
  }>({ state: null, session: null, keys: [], question: null, shownAt: now(), answered: 0, pending: null, crossed: [], alive: true });

  const show = useCallback(
    (next: SkillState, keys: string[]): void => {
      const q = pickQuestion(child, skill, next, keys);
      live.current.question = q;
      live.current.shownAt = now();
      live.current.pending = null;
      setQuestion(q);
      setResponse(null);
      setLastResponse(null);
      setSaveError(null);
      setPhase('asking');
    },
    [child, skill],
  );

  // Load the child's place in this skill.
  useEffect(() => {
    const self = live.current;
    self.alive = true;
    void (async () => {
      try {
        const { repo } = await openRepo();
        const saved = (await repo.getSkillStates(child.id)).find((s) => s.skillId === skill.id);
        const start = saved ?? newSkillState(child.id, skill.id, now().toISOString());
        const attempts = await repo.listAttempts(child.id, { skillId: skill.id, limit: 12 });
        if (!self.alive) return;
        self.state = start;
        self.keys = recentKeys(attempts, skill);
        self.session = newSession(child, skill.id, now());
        self.answered = 0;
        setState(start);
        setAnswered(0);
        setStartedAt(self.session.startedAt);
        show(start, self.keys);
      } catch (error) {
        logError(error);
        if (self.alive) setPhase('failed');
      }
    })();
    return () => {
      self.alive = false;
      stop();
      // Close the session. Nothing is lost if this write does not land: every answer is already saved.
      const session = self.session;
      if (session && session.questions > 0) {
        void openRepo()
          .then(({ repo }) => repo.saveSession({ ...session, endedAt: now().toISOString() }))
          .catch(logError);
      }
    };
  }, [child, skill, show]);

  const advance = useCallback((): void => {
    const self = live.current;
    if (!self.state) return;
    if (sessions && self.answered > 0 && self.answered % child.settings.sessionLength === 0) {
      setPhase('break');
      void speak(['Nice work! On to the next one?'], child.settings.speechRate);
      return;
    }
    show(self.state, self.keys);
  }, [child, show, sessions]);

  const afterAnswer = useCallback((): void => {
    const self = live.current;
    const top = self.crossed.length > 0 ? Math.max(...self.crossed) : null;
    self.crossed = [];
    if (top === null) {
      advance();
      return;
    }
    setMilestone(top);
    setPhase('celebrating');
    if (top === 100) playSfx('fanfare');
    const words = MILESTONE_WORDS[top];
    if (words) void speak([words.title, words.line], child.settings.speechRate);
  }, [advance, child]);

  const submit = useCallback(
    (given?: Response): void => {
      const self = live.current;
      const answer = given ?? response;
      const q = self.question;
      if (phase !== 'asking' || !answer || !q || !self.state || !self.session) return;
      // Taps in the first moments after a question appears are ignored.
      if (now().getTime() - self.shownAt.getTime() < TIMING.tapGuardMs) return;
      setPhase('saving');
      setSaveError(null);
      setLastResponse(answer);
      void (async () => {
        const outcome =
          self.pending ??
          recordAnswer({ child, skill, state: self.state as SkillState, session: self.session as Session, question: q, response: answer, shownAt: self.shownAt, answeredAt: now() });
        self.pending = outcome;
        try {
          // Each answer is saved before the next question renders. Leaving mid-session loses nothing.
          const { repo } = await openRepo();
          await repo.saveAnswer({ attempt: outcome.attempt, states: [outcome.state], session: outcome.session });
        } catch (error) {
          logError(error);
          if (!self.alive) return;
          setSaveError('Your answer could not be saved. Tap again to try once more.');
          setPhase('asking');
          return;
        }
        if (!self.alive) return;
        self.pending = null;
        self.state = outcome.state;
        self.session = outcome.session;
        self.keys = [...self.keys, q.key].slice(-6);
        self.answered += 1;
        self.crossed = outcome.milestones;
        setState(outcome.state);
        setAnswered(self.answered);

        if (!outcome.correct) {
          // No buzzer. It says "Not quite", then the explanation is read aloud, and it waits for "Got it".
          setPhase('wrong');
          void speak(['Not quite.', ...q.explanation.speak], child.settings.speechRate);
          return;
        }
        setPhase('correct');
        playSfx('chime');
        const praise = makeRng(q.seed).pick(PRAISE);
        // The next question loads once the praise has finished: 1.2 seconds at the earliest, 2.5 at the latest.
        const spoken = speakPhrase(praise.key, praise.say, child.settings.speechRate);
        await Promise.all([wait(TIMING.praiseMinMs), Promise.race([spoken, wait(TIMING.praiseMaxMs)])]);
        if (self.alive) afterAnswer();
      })();
    },
    [afterAnswer, child, phase, response, skill],
  );

  const gotIt = useCallback((): void => {
    if (phase !== 'wrong') return;
    stop();
    afterAnswer();
  }, [afterAnswer, phase]);

  const afterCelebration = useCallback((): void => {
    if (phase !== 'celebrating') return;
    stop();
    setMilestone(null);
    advance();
  }, [advance, phase]);

  const keepGoing = useCallback((): void => {
    const self = live.current;
    if (phase !== 'break' || !self.state) return;
    stop();
    show(self.state, self.keys);
  }, [phase, show]);

  return { phase, question, state, answered, response, lastResponse, milestone, saveError, startedAt, setResponse, submit, gotIt, afterCelebration, keepGoing };
}
