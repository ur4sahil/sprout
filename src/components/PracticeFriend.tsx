import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { CAST_NAMES, Character } from '../cast';
import type { Mood, Who } from '../cast';
import { useStill } from '../cast/useStill';
import { useVoiceMouth } from '../cast/useVoiceMouth';
import styles from './PracticeFriend.module.css';

// The subject's friend on the question screen (plan section 20, phase 2, after the owner's approved demo of the
// talking friends). It sits beside the question line on every device, smaller on a phone, and is plainly the one
// talking: its mouth follows the voice, it points and looks at the question's picture while it reads, and at the
// answers while it waits, with a small habit now and then (a glance, a little bounce, a tilt of the head). A right
// answer gets its own big cheer (Pip flies a loop, Olive flaps her wings, Finn jumps, with sparkles), a miss a kind
// nod. A tap on it says the question again. It never looks let down. In Calm mode and with Reduce Motion it holds
// still poses and only its mouth moves; a slow device gets the light version (no loop, flap, jump or sparkles).

export interface FriendTrack {
  key: string; // the question and phase this was worked out for
  run: number; // right answers in a row
  misses: number; // misses in a row
  mood: Mood;
}

export const FRIEND_START: FriendTrack = { key: '', run: 0, misses: 0, mood: 'listen' };
export const BIG_CHEER_RUN = 5;

// How the friend reacts as the screen moves on to a new phase of a question.
export function friendStep(before: FriendTrack, questionKey: string | null, phase: string): FriendTrack {
  const key = `${questionKey ?? ''}|${phase}`;
  if (key === before.key) return before;
  if (phase === 'correct') {
    const run = before.run + 1;
    return { key, run, misses: 0, mood: run === BIG_CHEER_RUN ? 'cheerBig' : 'cheer' };
  }
  if (phase === 'wrong') {
    const misses = before.misses + 1;
    return { key, run: 0, misses, mood: misses >= 2 ? 'encourage' : 'think' };
  }
  if (phase === 'asking' || phase === 'saving') return { ...before, key, mood: 'listen' };
  return { ...before, key, mood: 'idle' };
}

// Each friend's own cheer for a right answer, as in the approved demo; and the kind nod after a miss.
export type FriendReaction = 'loop' | 'flap' | 'jump' | 'nod';
export const CHEERS: Record<Who, FriendReaction> = { pip: 'loop', olive: 'flap', finn: 'jump', sprout: 'jump' };

export function reactionFor(who: Who, phase: string): FriendReaction | null {
  if (phase === 'correct') return CHEERS[who];
  if (phase === 'wrong') return 'nod';
  return null;
}

// What the friend is doing on the question: reading it out (pointing at the picture), waiting for the answer
// (looking at the answers), or reacting to one.
export type FriendAct = 'reading' | 'waiting' | 'reacting';

export function actFor(phase: string, speaking: boolean): FriendAct {
  if (phase !== 'asking' && phase !== 'saving') return 'reacting';
  return speaking ? 'reading' : 'waiting';
}

// Small habits while it waits: gentle and seldom, one every few seconds, in a fixed round (never random).
export const HABITS = ['glance', 'bounce', 'tilt', 'look'] as const;
export type Habit = (typeof HABITS)[number];
export const HABIT_EVERY_MS = 5200;
export const HABIT_LASTS_MS = 1400;

// The parts of the question it looks at, marked by QuestionView: the picture, and the answers, which are the last
// part of the question (each kind of question draws its own, so the question marks the part around them).
export type FriendTarget = 'picture' | 'answers';
const TARGETS: Record<FriendTarget, string> = { picture: '[data-friend-target="picture"]', answers: '[data-friend-answers] > :last-child' };

function centreOf(from: Element | null, target: FriendTarget): { x: number; y: number } | null {
  const stage = from?.closest('[data-friend-stage]');
  const found = stage?.querySelector(TARGETS[target]);
  if (!found) return null;
  const box = found.getBoundingClientRect();
  return { x: box.left + box.width / 2, y: box.top + box.height / 2 };
}

const SPARKS = 8;

interface Props {
  who: Who;
  questionKey: string | null; // changes with each question
  phase: string; // the screen's answer phase: asking, saving, correct, wrong, or anything else (idle)
  voice?: Who; // whose voice speaks for it; its mouth moves only for that voice. Left out: its own
  onTap?: () => void; // says the question again. Left out: the friend is a picture only
}

export default function PracticeFriend({ who, questionKey, phase, voice = who, onTap }: Props) {
  // Worked out as the phase changes, during the render, so the friend reacts in the same frame as the question.
  const [track, setTrack] = useState<FriendTrack>(FRIEND_START);
  const next = friendStep(track, questionKey, phase);
  if (next !== track) setTrack(next);

  const still = useStill();
  const { speaking, talking } = useVoiceMouth(voice);
  const act = actFor(phase, speaking);
  const reaction = still ? null : reactionFor(who, phase);

  // A habit now and then while it waits, and none while it reads, reacts, or holds still.
  const [habit, setHabit] = useState<Habit | null>(null);
  useEffect(() => {
    setHabit(null);
    if (act !== 'waiting' || still) return;
    let round = 0;
    let end: ReturnType<typeof setTimeout> | undefined;
    const every = setInterval(() => {
      setHabit(HABITS[round % HABITS.length] ?? null);
      round += 1;
      clearTimeout(end);
      end = setTimeout(() => setHabit(null), HABIT_LASTS_MS);
    }, HABIT_EVERY_MS);
    return () => {
      clearInterval(every);
      clearTimeout(end);
    };
  }, [act, still, questionKey]);

  // Where it looks: the picture while it reads (the answers when there is no picture), the answers while it
  // waits, and up at the picture for a glance. Worked out from the page as the act changes, never each frame.
  const box = useRef<HTMLDivElement>(null);
  const [look, setLook] = useState<{ x: number; y: number } | null>(null);
  const wants: FriendTarget | null = act === 'reading' || habit === 'glance' ? 'picture' : act === 'waiting' && habit !== 'look' ? 'answers' : null;
  useLayoutEffect(() => {
    if (wants === null) {
      setLook(null);
      return;
    }
    setLook(centreOf(box.current, wants) ?? centreOf(box.current, wants === 'picture' ? 'answers' : 'picture'));
  }, [wants, questionKey]);

  // Reading, it points at what it reads about; otherwise the mood of the moment.
  const mood: Mood = act === 'reading' ? 'point' : next.mood;
  const figure = (
    // Keyed on the question and phase, so each reaction plays from its start.
    <div key={next.key} className={styles.react} data-react={reaction ?? undefined}>
      <div className={styles.habit} data-habit={still ? undefined : (habit ?? undefined)}>
        <Character who={who} mood={mood} talking={talking} lookAt={look} />
      </div>
      {reaction !== null && reaction !== 'nod' && (
        <span className={styles.sparkles} aria-hidden="true" data-sparkles="">
          {Array.from({ length: SPARKS }, (_, i) => (
            <i key={i} style={{ '--set-turn': `${(360 / SPARKS) * i}deg`, '--set-delay': `${i * 40}ms` } as CSSProperties} />
          ))}
        </span>
      )}
    </div>
  );
  return (
    <div ref={box} className={styles.friend} data-friend={who} data-friend-mood={next.mood} data-friend-act={act} data-friend-reaction={reaction ?? undefined}>
      {onTap ? (
        <button type="button" className={styles.tap} aria-label={`${CAST_NAMES[who]}: hear the question again`} onClick={onTap}>
          {figure}
        </button>
      ) : (
        figure
      )}
    </div>
  );
}
