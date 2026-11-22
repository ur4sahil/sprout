import { LINES, MILESTONE_WORDS } from '../audio/lines';
import { useCallback, useEffect, useRef, useState } from 'react';
import { PRAISE } from '../audio/say';
import { castFor, pickLine, voiceFor } from '../cast';
import type { Who } from '../cast';
import { newVoicesOn } from '../audio/engine';
import { playSfx } from '../audio/sfx';
import { speak, stop } from '../audio/speech';
import { openingWords } from '../audio/stepSay';
import type { Skill } from '../content/catalogue';
import { ladderPrerequisite } from '../content/ladders';
import { nextQuestion } from '../content/registry';
import { makeRng } from '../engine/rng';
import { seedFor } from '../engine/seed';
import { SKIP_TEST_QUESTIONS, earnsSkipTest, passedByTest } from '../engine/fastTrack';
import { maxLevelFor } from '../engine/grades';
import { lastWasMiss, levelToAsk } from '../engine/skillscore';
import type { Question, Response, Say } from '../engine/types';
import { now } from '../lib/clock';
import { logError } from '../lib/errorLog';
import { openRepo } from '../storage/index';
import type { Child, Session, SkillState } from '../storage/schema';
import { newSkillState } from '../storage/schema';
import type { GrowthStage } from '../worlds';
import { growthStage } from '../worlds';
import { HINT_REFILL_EVERY, hintId } from './hints';
import type { AnswerOutcome } from './practiceRecord';
import { newSession, recentKeys, recordAnswer } from './practiceRecord';
import { TIMING } from './timing';
import type { HintAllowance } from './useHintBook';
import { useHintBook } from './useHintBook';

// One child practising one skill: which question is showing, and what happens after each answer.

// `skipped`: the child passed the short test on a new skill and need not practise it.
export type PracticePhase = 'loading' | 'asking' | 'saving' | 'correct' | 'wrong' | 'celebrating' | 'break' | 'skipped' | 'failed';

export interface Practice {
  phase: PracticePhase;
  question: Question | null;
  state: SkillState | null;
  answered: number; // in this sitting
  run: number; // right answers in a row, in this sitting (a miss ends it)
  right: number; // right answers in this sitting
  startStage: GrowthStage; // the skill's plant as the sitting began, for the growth show at the end
  response: Response | null; // the answer so far
  lastResponse: Response | null; // the answer just submitted
  milestone: number | null; // the one being celebrated
  saveError: string | null;
  startedAt: string | null;
  hints: HintAllowance | null; // null during the short test on a new skill, which takes no hints
  setResponse: (response: Response | null) => void;
  submit: (response?: Response) => void;
  gotIt: () => void; // closes the explanation
  afterCelebration: () => void;
  keepGoing: () => void; // leaves the soft break
}

const wait = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

// After this many right answers in a sitting, the subject's friend sometimes says the praise instead.
export const FRIEND_PRAISE_AFTER = 3;

// What is said for a right answer (game feel, phase 5). Usually one of the app's praise lines; from the fourth
// right answer of a sitting, about one time in three, a cheer in the subject friend's own words instead. Never
// both. Everything is chosen from the question's seed, so the same question always gets the same words.
// `last` remembers the friend's last cheer, so it never says the same one twice running.
// The words, and whose voice says them: a friend's own cheer is in that friend's voice; the usual praise is the
// friend's too once the server speaks with the new voices (plan section 20: inside a subject its friend says
// everything), and Sprout's until then, as before the switch.
export function praiseFor(q: Question, rightBefore: number, who: Who, last: { index: number | null }): { say: Say; who: Who } {
  const praise = { say: makeRng(q.seed).pick(PRAISE).say, who: newVoicesOn() ? who : ('sprout' as Who) };
  if (rightBefore < FRIEND_PRAISE_AFTER) return praise;
  const roll = makeRng((q.seed ^ 0x2f6b1d) >>> 0);
  if (roll.int(0, 2) !== 0) return praise;
  const line = pickLine(who, 'cheer', last.index, roll);
  last.index = line.index;
  return { say: line.say, who };
}

// `testing`: the short test on a new skill asks at the hardest level this child is asked on it (`maxLevelFor`: a
// young child's ceiling, when the skill has one).
export function pickQuestion(child: Child, skill: Skill, state: SkillState, keys: readonly string[], testing = false): Question {
  const top = maxLevelFor(skill, child.grade);
  const level = testing ? top : levelToAsk(state.score, lastWasMiss(state), top);
  // n is how many answers the child has already given on this skill.
  return nextQuestion(skill.id, level, seedFor(child.id, skill.id, 'practice', state.attempts), keys);
}

// `sessions` is set for a pick in a Play run: it lasts one session length, then stops for the next pick.
// Practice opened by itself has no sessions: it carries on until the score reaches 100, or the child leaves.
// `stopAfter` is set when practice is one part of a run through today's plan: after that many answers it calls
// `onStop` (the run goes on to the next part) instead of asking another question.
export function usePractice(child: Child, skill: Skill, options: { sessions?: boolean; stopAfter?: number; onStop?: () => void } = {}): Practice {
  // The skill's subject friend, who may cheer in its own words; and the voice that says everything else here: the
  // same friend once the server speaks with the new voices, Sprout until then (plan section 20).
  const friend = castFor(skill.subject);
  const voice = voiceFor(skill.subject);
  const sessions = options.sessions === true;
  const stopAfter = options.stopAfter;
  const onStop = options.onStop;
  const [phase, setPhase] = useState<PracticePhase>('loading');
  const [question, setQuestion] = useState<Question | null>(null);
  const [state, setState] = useState<SkillState | null>(null);
  const [answered, setAnswered] = useState(0);
  const [run, setRun] = useState(0);
  const runSoFar = useRef(0);
  const [right, setRight] = useState(0);
  const [startStage, setStartStage] = useState<GrowthStage>(0);
  const [response, setResponse] = useState<Response | null>(null);
  const [lastResponse, setLastResponse] = useState<Response | null>(null);
  const [milestone, setMilestone] = useState<number | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [startedAt, setStartedAt] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);
  // 3 hints for each part: a Play pick's session, or this part of today's plan. Practice opened by itself has no
  // parts, so the 3 come back every 10 answers.
  const hintBook = useHintBook(answered, sessions ? child.settings.sessionLength : stopAfter !== undefined ? undefined : HINT_REFILL_EVERY);

  // What the answer flow needs between renders.
  const usedHint = hintBook.usedOn;
  const live = useRef<{
    state: SkillState | null;
    session: Session | null;
    keys: string[];
    question: Question | null;
    shownAt: Date;
    answered: number;
    pending: AnswerOutcome | null; // an answer worked out but not yet saved, kept for a retry
    crossed: number[];
    testLeft: number; // questions still to come in the short test on a new skill. 0 when there is no test
    right: number; // right answers in this sitting
    cheer: { index: number | null }; // the friend's last cheer, so it is not said twice running
    alive: boolean;
  }>({ state: null, session: null, keys: [], question: null, shownAt: now(), answered: 0, pending: null, crossed: [], testLeft: 0, right: 0, cheer: { index: null }, alive: true });

  const show = useCallback(
    (next: SkillState, keys: string[]): void => {
      const q = pickQuestion(child, skill, next, keys, live.current.testLeft > 0);
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
        const all = await repo.getSkillStates(child.id);
        const saved = all.find((s) => s.skillId === skill.id);
        const start = saved ?? newSkillState(child.id, skill.id, now().toISOString());
        // The skill before this one, mastered without a miss, earns a two-question test on this one.
        const before = ladderPrerequisite(skill.id);
        self.testLeft = earnsSkipTest(saved, all.find((s) => s.skillId === before)) ? SKIP_TEST_QUESTIONS : 0;
        setTesting(self.testLeft > 0);
        const attempts = await repo.listAttempts(child.id, { skillId: skill.id, limit: 12 });
        if (!self.alive) return;
        self.state = start;
        self.keys = recentKeys(attempts, skill);
        self.session = newSession(child, skill.id, now());
        self.answered = 0;
        self.right = 0;
        setState(start);
        setAnswered(0);
        setRight(0);
        setStartStage(growthStage(start.score, start.masteredAt !== null));
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
    if (stopAfter !== undefined && onStop && self.answered >= stopAfter) {
      onStop();
      return;
    }
    if (sessions && self.answered > 0 && self.answered % child.settings.sessionLength === 0) {
      setPhase('break');
      void speak(LINES.nextOne, child.settings.speechRate, 'normal', voice);
      return;
    }
    show(self.state, self.keys);
  }, [child, show, sessions, stopAfter, onStop, voice]);

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
    if (words) void speak([words.title, words.line], child.settings.speechRate, 'normal', voice);
  }, [advance, child, voice]);

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
          recordAnswer({ child, skill, state: self.state as SkillState, session: self.session as Session, question: q, response: answer, shownAt: self.shownAt, answeredAt: now(), hinted: self.testLeft === 0 && usedHint(hintId(q)) });
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
          self.testLeft = 0; // a miss ends the short test, and ordinary practice carries on
          setTesting(false);
          // No buzzer. It says "Not quite", then the explanation is read aloud, and it waits for "Got it".
          runSoFar.current = 0;
          setRun(0);
          setPhase('wrong');
          void speak(openingWords(q), child.settings.speechRate, 'normal', voice);
          return;
        }
        // The short test: every answer right and the skill is passed without practising it.
        if (self.testLeft > 0) {
          self.testLeft -= 1;
          if (self.testLeft === 0) setTesting(false);
          if (self.testLeft === 0) {
            const passed = passedByTest(outcome.state, now().toISOString());
            try {
              const { repo } = await openRepo();
              await repo.saveSkillState(passed);
              if (!self.alive) return;
              self.state = passed;
              self.crossed = [];
              setState(passed);
              playSfx('fanfare');
              setPhase('skipped');
              void speak(LINES.knownAlready, child.settings.speechRate, 'normal', voice);
              return;
            } catch (error) {
              // It could not be saved: the child simply carries on practising, with the two answers counted.
              logError(error);
            }
          }
        }
        // A run of right answers: the sound climbs a step with each one.
        playSfx('chime', runSoFar.current);
        runSoFar.current += 1;
        setRun(runSoFar.current);
        const praise = praiseFor(q, self.right, friend, self.cheer);
        self.right += 1;
        setRight(self.right);
        setPhase('correct');
        // The next question loads once the praise has finished: 1.2 seconds at the earliest, 2.5 at the latest.
        const spoken = speak(praise.say, child.settings.speechRate, 'normal', praise.who);
        await Promise.all([wait(TIMING.praiseMinMs), Promise.race([spoken, wait(TIMING.praiseMaxMs)])]);
        if (self.alive) afterAnswer();
      })();
    },
    [afterAnswer, child, phase, response, skill, usedHint, friend, voice],
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

  return { phase, question, state, answered, run, right, startStage, response, lastResponse, milestone, saveError, startedAt, hints: testing ? null : hintBook, setResponse, submit, gotIt, afterCelebration, keepGoing };
}
