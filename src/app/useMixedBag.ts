import { useCallback, useEffect, useRef, useState } from 'react';
import { playSfx } from '../audio/sfx';
import { speak, stop } from '../audio/speech';
import { openingWords } from '../audio/stepSay';
import type { Skill } from '../content/catalogue';
import { skillById } from '../content/catalogue';
import { LADDERS } from '../content/ladders';
import type { Question, Response } from '../engine/types';
import { now } from '../lib/clock';
import { logError } from '../lib/errorLog';
import { openRepo } from '../storage/index';
import type { Child, Session, SkillState } from '../storage/schema';
import { newSkillState } from '../storage/schema';
import { mixable, mixedBagOrder, mixedTurn } from './mixedBag';
import { newSession, recentKeys, recordAnswer } from './practiceRecord';
import { TIMING } from './timing';
import { hintId } from './hints';
import type { HintAllowance } from './useHintBook';
import { useHintBook } from './useHintBook';
import { castFor } from '../cast';
import { praiseFor } from './usePractice';

// Runs one Mixed bag (plan section 17). Every answer is saved as ordinary practice on its skill, so its Skill Score
// moves as in practice; a miss shows the "Not quite" walk-through. A skill that reaches 100 during the bag is done:
// its later turns are skipped.

export type MixedPhase = 'loading' | 'asking' | 'saving' | 'correct' | 'wrong' | 'done' | 'none' | 'failed';

export interface MixedBag {
  phase: MixedPhase;
  question: Question | null;
  skill: Skill | null;
  asked: number;
  right: number;
  total: number;
  response: Response | null;
  lastResponse: Response | null;
  saveError: string | null;
  hints: HintAllowance; // 3 for the whole bag
  setResponse: (response: Response | null) => void;
  submit: () => void;
  gotIt: () => void;
}

const wait = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

export function useMixedBag(child: Child): MixedBag {
  const [phase, setPhase] = useState<MixedPhase>('loading');
  const [question, setQuestion] = useState<Question | null>(null);
  const [skill, setSkill] = useState<Skill | null>(null);
  const [asked, setAsked] = useState(0);
  const [right, setRight] = useState(0);
  const [total, setTotal] = useState(0);
  const [response, setResponse] = useState<Response | null>(null);
  const [lastResponse, setLastResponse] = useState<Response | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const hints = useHintBook(asked);
  const usedHint = hints.usedOn;

  const live = useRef<{
    order: string[];
    at: number; // the next turn in the order
    states: Map<string, SkillState>;
    keys: Map<string, string[]>; // each skill's latest question keys, so a question is not asked twice running
    sessions: Map<string, Session>;
    question: Question | null;
    skill: Skill | null;
    shownAt: Date;
    pending: ReturnType<typeof recordAnswer> | null;
    right: number; // right answers in this bag
    cheer: { index: number | null }; // the friend's last cheer, so it is not said twice running
    alive: boolean;
  }>({ order: [], at: 0, states: new Map(), keys: new Map(), sessions: new Map(), question: null, skill: null, shownAt: now(), pending: null, right: 0, cheer: { index: null }, alive: true });

  // Shows the next turn whose skill is not yet mastered; ends the bag when none is left.
  const next = useCallback((): void => {
    const self = live.current;
    while (self.at < self.order.length) {
      const id = self.order[self.at] as string;
      self.at += 1;
      const found = skillById(id);
      // A topic's next skill may not be started yet: it begins here, from a blank score.
      const state = self.states.get(id) ?? newSkillState(child.id, id, now().toISOString());
      if (!found || !mixable(state)) continue;
      self.states.set(id, state);
      const q = mixedTurn(child, found, state, self.keys.get(id) ?? []);
      self.question = q;
      self.skill = found;
      self.shownAt = now();
      self.pending = null;
      setSkill(found);
      setQuestion(q);
      setResponse(null);
      setLastResponse(null);
      setSaveError(null);
      setPhase('asking');
      return;
    }
    setQuestion(null);
    setPhase('done');
  }, [child]);

  useEffect(() => {
    const self = live.current;
    self.alive = true;
    void (async () => {
      try {
        const { repo } = await openRepo();
        const states = await repo.getSkillStates(child.id);
        const order = mixedBagOrder(states, LADDERS, child.grade);
        if (!self.alive) return;
        if (order.length === 0) {
          setPhase('none');
          return;
        }
        self.order = order;
        self.at = 0;
        self.right = 0;
        self.states = new Map(states.map((state) => [state.skillId, state]));
        const attempts = await repo.listAttempts(child.id, {});
        for (const id of new Set(order)) {
          const found = skillById(id);
          if (found) self.keys.set(id, recentKeys(attempts.filter((attempt) => attempt.skillId === id), found));
        }
        if (!self.alive) return;
        setTotal(order.length);
        next();
      } catch (error) {
        logError(error);
        if (self.alive) setPhase('failed');
      }
    })();
    return () => {
      self.alive = false;
      stop();
      // Close each skill's session. Every answer is already saved.
      const endedAt = now().toISOString();
      for (const session of self.sessions.values()) {
        if (session.questions > 0) void openRepo().then(({ repo }) => repo.saveSession({ ...session, endedAt })).catch(logError);
      }
    };
  }, [child, next]);

  const submit = useCallback((): void => {
    const self = live.current;
    const q = self.question;
    const current = self.skill;
    const state = current ? self.states.get(current.id) : undefined;
    if (phase !== 'asking' || !response || !q || !current || !state) return;
    if (now().getTime() - self.shownAt.getTime() < TIMING.tapGuardMs) return;
    setPhase('saving');
    setSaveError(null);
    setLastResponse(response);
    void (async () => {
      const session = self.sessions.get(current.id) ?? { ...newSession(child, current.id, now()), mixed: true };
      const outcome = self.pending ?? recordAnswer({ child, skill: current, state, session, question: q, response, shownAt: self.shownAt, answeredAt: now(), hinted: usedHint(hintId(q)) });
      self.pending = outcome;
      try {
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
      self.sessions.set(current.id, outcome.session);
      self.states.set(current.id, outcome.state);
      self.keys.set(current.id, [...(self.keys.get(current.id) ?? []), q.key].slice(-6));
      setAsked((n) => n + 1);
      // The friend in the corner is the one for this question's subject, so it is the one who says what follows.
      const who = castFor(current.subject);
      if (!outcome.correct) {
        setPhase('wrong');
        void speak(openingWords(q), child.settings.speechRate, 'normal', who);
        return;
      }
      const praise = praiseFor(q, self.right, who, self.cheer);
      self.right += 1;
      setRight((n) => n + 1);
      setPhase('correct');
      playSfx('chime');
      const spoken = speak(praise.say, child.settings.speechRate, 'normal', praise.who);
      await Promise.all([wait(TIMING.praiseMinMs), Promise.race([spoken, wait(TIMING.praiseMaxMs)])]);
      if (self.alive) next();
    })();
  }, [child, next, phase, response, usedHint]);

  const gotIt = useCallback((): void => {
    if (phase !== 'wrong') return;
    stop();
    next();
  }, [next, phase]);

  return { phase, question, skill, asked, right, total, response, lastResponse, saveError, hints, setResponse, submit, gotIt };
}
