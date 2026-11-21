import { useCallback, useEffect, useRef, useState } from 'react';
import { playSfx } from '../audio/sfx';
import { speak, stop } from '../audio/speech';
import { openingWords } from '../audio/stepSay';
import type { Skill } from '../content/catalogue';
import { nextQuestion } from '../content/registry';
import { REVIEW_QUESTIONS, applyReview, reviewLevel, reviewRight } from '../engine/review';
import { seedFor } from '../engine/seed';
import type { Question, Response } from '../engine/types';
import { now } from '../lib/clock';
import { logError } from '../lib/errorLog';
import { openRepo } from '../storage/index';
import type { Child, Session, SkillState } from '../storage/schema';
import { newReviewSession, recentKeys, recordReviewAnswer } from './practiceRecord';
import { TIMING } from './timing';
import { hintId } from './hints';
import type { HintAllowance } from './useHintBook';
import { useHintBook } from './useHintBook';
import { castFor } from '../cast';
import { praiseFor } from './usePractice';

// A review session: 3 questions on each due skill. 3 right moves it up a box, 2 keeps it,
// 0 or 1 drops it to 85 and back into normal practice.

export type ReviewPhase = 'loading' | 'asking' | 'saving' | 'correct' | 'wrong' | 'done' | 'failed';

export interface ReviewResult {
  skill: Skill;
  right: number;
  passed: boolean;
}

// Where the review is: which skill (its place in the list), and how its questions have gone so far. The review
// screen shows each skill as a plant in a pot, watered by each right answer.
export interface ReviewPlace {
  index: number;
  answered: number; // of this skill's three
  right: number;
}

export interface Review {
  phase: ReviewPhase;
  place: ReviewPlace;
  question: Question | null;
  skill: Skill | null; // the one being reviewed now
  asked: number; // questions answered so far, over all skills
  total: number;
  response: Response | null;
  lastResponse: Response | null;
  saveError: string | null;
  results: ReviewResult[];
  hints: HintAllowance; // 3 for the whole review
  setResponse: (response: Response | null) => void;
  submit: () => void;
  gotIt: () => void;
}

const wait = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

export function useReview(child: Child, skills: readonly Skill[]): Review {
  const [phase, setPhase] = useState<ReviewPhase>('loading');
  const [question, setQuestion] = useState<Question | null>(null);
  const [skill, setSkill] = useState<Skill | null>(null);
  const [asked, setAsked] = useState(0);
  const [response, setResponse] = useState<Response | null>(null);
  const [lastResponse, setLastResponse] = useState<Response | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [results, setResults] = useState<ReviewResult[]>([]);
  const [place, setPlace] = useState<ReviewPlace>({ index: 0, answered: 0, right: 0 });
  const hints = useHintBook(asked);
  const usedHint = hints.usedOn;

  const live = useRef<{
    index: number; // which skill
    number: number; // which of its questions, 0 to 2
    right: number;
    helped: number; // of those right answers, the ones given after a hint
    state: SkillState | null;
    reviewsSoFar: number; // review answers this child has ever given on this skill
    keys: string[];
    session: Session | null;
    question: Question | null;
    shownAt: Date;
    asked: number;
    pending: ReturnType<typeof recordReviewAnswer> | null;
    results: ReviewResult[];
    rightInAll: number; // right answers in this review, over all skills
    cheer: { index: number | null }; // the friend's last cheer, so it is not said twice running
    alive: boolean;
  }>({ index: 0, number: 0, right: 0, helped: 0, state: null, reviewsSoFar: 0, keys: [], session: null, question: null, shownAt: now(), asked: 0, pending: null, results: [], rightInAll: 0, cheer: { index: null }, alive: true });

  const show = useCallback((): void => {
    const self = live.current;
    const current = skills[self.index];
    if (!current || !self.state) return;
    const q = nextQuestion(current.id, reviewLevel(current.maxLevel), seedFor(child.id, current.id, 'review', self.reviewsSoFar), self.keys);
    self.question = q;
    self.shownAt = now();
    self.pending = null;
    setSkill(current);
    setPlace({ index: self.index, answered: self.number, right: self.right });
    setQuestion(q);
    setResponse(null);
    setLastResponse(null);
    setSaveError(null);
    setPhase('asking');
  }, [child, skills]);

  // Gets one skill ready: its saved state and how many review answers it has had.
  const open = useCallback(
    async (index: number): Promise<boolean> => {
      const self = live.current;
      const current = skills[index];
      if (!current) return false;
      const { repo } = await openRepo();
      const state = (await repo.getSkillStates(child.id)).find((s) => s.skillId === current.id);
      if (!state) return false;
      const attempts = await repo.listAttempts(child.id, { skillId: current.id });
      self.index = index;
      self.number = 0;
      self.right = 0;
      self.helped = 0;
      self.state = state;
      self.reviewsSoFar = attempts.filter((a) => a.kind === 'review').length;
      self.keys = recentKeys(attempts.map((a) => ({ ...a, kind: 'practice' as const })), current);
      return true;
    },
    [child, skills],
  );

  const moveOn = useCallback(async (): Promise<void> => {
    const self = live.current;
    if (self.number < REVIEW_QUESTIONS) {
      show();
      return;
    }
    // Find the next skill that can be reviewed.
    for (let next = self.index + 1; next < skills.length; next += 1) {
      if (await open(next)) {
        if (self.alive) show();
        return;
      }
    }
    if (!self.alive) return;
    setQuestion(null);
    setPhase('done');
  }, [open, show, skills]);

  useEffect(() => {
    const self = live.current;
    self.alive = true;
    void (async () => {
      try {
        self.session = newReviewSession(child, now());
        self.results = [];
        self.rightInAll = 0;
        self.asked = 0;
        for (let index = 0; index < skills.length; index += 1) {
          if (await open(index)) {
            if (self.alive) show();
            return;
          }
        }
        if (self.alive) setPhase('done');
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
  }, [child, skills, open, show]);

  const submit = useCallback((): void => {
    const self = live.current;
    const q = self.question;
    const current = skills[self.index];
    if (phase !== 'asking' || !response || !q || !self.state || !self.session || !current) return;
    if (now().getTime() - self.shownAt.getTime() < TIMING.tapGuardMs) return;
    setPhase('saving');
    setSaveError(null);
    setLastResponse(response);
    void (async () => {
      const hinted = usedHint(hintId(q));
      const outcome = self.pending ?? recordReviewAnswer({ child, skill: current, state: self.state as SkillState, session: self.session as Session, question: q, response, shownAt: self.shownAt, answeredAt: now(), hinted });
      self.pending = outcome;
      const last = self.number + 1 >= REVIEW_QUESTIONS;
      const right = self.right + (outcome.correct ? 1 : 0);
      const helped = self.helped + (outcome.correct && hinted ? 1 : 0);
      // A right answer after a hint counts for half (`reviewRight`).
      const reviewed = last ? applyReview(self.state as SkillState, reviewRight(right - helped, helped), now().toISOString()) : null;
      try {
        const { repo } = await openRepo();
        await repo.saveAnswer({ attempt: outcome.attempt, states: reviewed ? [reviewed.state] : [], session: outcome.session });
      } catch (error) {
        logError(error);
        if (!self.alive) return;
        setSaveError('Your answer could not be saved. Tap again to try once more.');
        setPhase('asking');
        return;
      }
      if (!self.alive) return;
      self.pending = null;
      self.session = outcome.session;
      self.keys = [...self.keys, q.key].slice(-6);
      self.number += 1;
      self.right = right;
      self.helped = helped;
      self.reviewsSoFar += 1;
      self.asked += 1;
      setAsked(self.asked);
      setPlace({ index: self.index, answered: self.number, right: self.right });
      if (reviewed) {
        self.state = reviewed.state;
        self.results = [...self.results, { skill: current, right, passed: reviewed.passed }];
        setResults(self.results);
      }
      if (!outcome.correct) {
        setPhase('wrong');
        void speak(openingWords(q), child.settings.speechRate);
        return;
      }
      const praise = praiseFor(q, self.rightInAll, castFor(current.subject), self.cheer);
      self.rightInAll += 1;
      setPhase('correct');
      playSfx('chime');
      const spoken = speak(praise.say, child.settings.speechRate, 'normal', praise.who);
      await Promise.all([wait(TIMING.praiseMinMs), Promise.race([spoken, wait(TIMING.praiseMaxMs)])]);
      if (self.alive) await moveOn().catch(logError);
    })();
  }, [child, moveOn, phase, response, skills, usedHint]);

  const gotIt = useCallback((): void => {
    if (phase !== 'wrong') return;
    stop();
    void moveOn().catch(logError);
  }, [moveOn, phase]);

  return { phase, place, question, skill, asked, total: skills.length * REVIEW_QUESTIONS, response, lastResponse, saveError, results, hints, setResponse, submit, gotIt };
}
