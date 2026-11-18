import { useCallback, useEffect, useRef, useState } from 'react';
import { PRAISE } from '../audio/say';
import { TIMING } from './timing';
import { playSfx } from '../audio/sfx';
import { speak, stop } from '../audio/speech';
import { warmAll } from '../audio/voice';
import { check } from '../engine/check';
import { makeRng } from '../engine/rng';
import type { Response } from '../engine/types';
import { lessonSays } from '../lessons';
import type { Lesson, Moment, Turn } from '../lessons/types';

// Runs a lesson that teaches (plan section 16). Moments play one after another; a turn waits for the child.
// A miss plays the turn's why, then asks the same question once more; a second miss shows the answer.
export type TeachPhase =
  | 'showing' // a moment of the lesson
  | 'asking' // a turn, first try
  | 'why' // the turn's why, after a miss
  | 'again' // the turn, second try
  | 'shown' // the turn's answer, after a second miss: waits for Next
  | 'done';


export interface Teach {
  phase: TeachPhase;
  paused: boolean;
  moment: Moment | null; // what the stage shows now
  turn: Turn | null; // the turn being answered
  attempt: number; // changes for each try, to give the question a fresh component
  partIndex: number;
  partCount: number;
  response: Response | null;
  setResponse: (response: Response | null) => void;
  submit: () => void;
  next: () => void; // after a shown answer
  togglePause: () => void;
  restart: () => void;
  talking: boolean; // the lesson is saying something now (the host moves its mouth)
  cheering: boolean; // a turn was just answered right (the host hops, confetti falls)
}

export function useTeach(lesson: Lesson, rate: number): Teach {
  const [partIndex, setPartIndex] = useState(0);
  const [phase, setPhase] = useState<TeachPhase>(() => (lesson.parts[0]?.kind === 'turn' ? 'asking' : 'showing'));
  const [whyIndex, setWhyIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [response, setResponse] = useState<Response | null>(null);
  const [lastMoment, setLastMoment] = useState<Moment | null>(null);
  const [talking, setTalking] = useState(false);
  const [cheering, setCheering] = useState(false);
  // Says something and marks the host as talking while it is said.
  const sayNow = useCallback(async (...args: Parameters<typeof speak>): Promise<boolean> => {
    setTalking(true);
    try {
      return await speak(...args);
    } finally {
      setTalking(false);
    }
  }, []);
  const alive = useRef(true);
  const praising = useRef(false); // a right answer is being praised: further taps wait

  useEffect(() => {
    alive.current = true;
    warmAll(lessonSays(lesson), 'lesson');
    return () => {
      alive.current = false;
      stop();
    };
  }, [lesson]);

  const part = lesson.parts[partIndex];
  const turn = part?.kind === 'turn' ? part.turn : null;

  const goTo = useCallback(
    (index: number): void => {
      const next = lesson.parts[index];
      setResponse(null);
      setWhyIndex(0);
      setAttempt((n) => n + 1);
      setPartIndex(index);
      if (!next) setPhase('done');
      else setPhase(next.kind === 'turn' ? 'asking' : 'showing');
    },
    [lesson],
  );

  const current: Moment | null =
    phase === 'showing' && part?.kind === 'show' ? part.moment : phase === 'why' && turn ? (turn.why[whyIndex] ?? null) : phase === 'shown' && turn ? (turn.why.at(-1) ?? null) : null;

  useEffect(() => {
    if (current) setLastMoment(current);
  }, [current]);

  // Say a moment, wait a little, move on.
  useEffect(() => {
    if (paused || (phase !== 'showing' && phase !== 'why') || !current) return;
    let cancelled = false;
    void (async () => {
      await sayNow(current.say, rate, 'lesson');
      await new Promise((resolve) => setTimeout(resolve, TIMING.momentGapMs));
      if (cancelled || !alive.current) return;
      if (phase === 'showing') goTo(partIndex + 1);
      else if (turn && whyIndex + 1 < turn.why.length) setWhyIndex(whyIndex + 1);
      else {
        setResponse(null);
        setAttempt((n) => n + 1);
        setPhase('again');
      }
    })();
    return () => {
      cancelled = true;
      stop();
    };
  }, [paused, phase, current, partIndex, whyIndex, turn, rate, goTo, sayNow]);

  // A turn reads its question aloud as it appears.
  useEffect(() => {
    if (paused || !turn || (phase !== 'asking' && phase !== 'again')) return;
    void sayNow(turn.question.prompt.speak, rate);
    return () => stop();
  }, [paused, phase, turn, attempt, rate, sayNow]);

  // The answer after a second miss is said once.
  useEffect(() => {
    if (phase !== 'shown' || !current) return;
    void sayNow(current.say, rate, 'lesson');
    return () => stop();
  }, [phase, current, rate, sayNow]);

  const submit = useCallback((): void => {
    if (!turn || !response || praising.current || (phase !== 'asking' && phase !== 'again')) return;
    if (check(turn.question, response)) {
      praising.current = true;
      playSfx('chime');
      setCheering(true);
      const praise = makeRng(turn.question.seed + attempt).pick(PRAISE);
      void (async () => {
        await sayNow(praise.say, rate);
        await new Promise((resolve) => setTimeout(resolve, TIMING.momentGapMs));
        praising.current = false;
        setCheering(false);
        if (alive.current) goTo(partIndex + 1);
      })();
      return;
    }
    stop();
    setResponse(null);
    if (phase === 'asking') {
      setWhyIndex(0);
      setPhase('why');
    } else {
      setPhase('shown');
    }
  }, [turn, response, phase, attempt, rate, partIndex, goTo, sayNow]);

  return {
    phase,
    paused,
    moment: current ?? lastMoment,
    turn,
    attempt,
    partIndex,
    partCount: lesson.parts.length,
    response,
    setResponse,
    submit,
    next: () => goTo(partIndex + 1),
    togglePause: () => {
      if (!paused) stop();
      setPaused(!paused);
    },
    talking,
    cheering,
    restart: () => {
      stop();
      setPaused(false);
      setLastMoment(null);
      goTo(0);
    },
  };
}
