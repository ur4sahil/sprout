import { useState } from 'react';
import { Character } from '../cast';
import type { Mood, Who } from '../cast';
import styles from './PracticeFriend.module.css';

// The subject's friend, small, in the lower corner beside the questions (game feel, phase 5). It listens while
// the child chooses, gives a small cheer for a right answer and a big one for five right in a row, thinks after
// a miss, and encourages after a second miss in a row. It never looks let down.
// It sits at the foot of the side panel, so it never covers the question or a control. On a phone the side panel
// is a thin strip above the question with no room for it, so there it is left out.

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

interface Props {
  who: Who;
  questionKey: string | null; // changes with each question
  phase: string; // the screen's answer phase: asking, saving, correct, wrong, or anything else (idle)
}

export default function PracticeFriend({ who, questionKey, phase }: Props) {
  // Worked out as the phase changes, during the render, so the friend reacts in the same frame as the question.
  const [track, setTrack] = useState<FriendTrack>(FRIEND_START);
  const next = friendStep(track, questionKey, phase);
  if (next !== track) setTrack(next);
  return (
    <div className={styles.corner} data-friend={who} data-friend-mood={next.mood}>
      <Character who={who} mood={next.mood} />
    </div>
  );
}
