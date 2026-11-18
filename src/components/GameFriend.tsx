import { Character } from '../cast';
import type { Mood, Who } from '../cast';
import styles from './GameFriend.module.css';

// The subject's friend in the corner of a game's top bar (game feel, phase 8): Pip for a Math game, Olive for
// letters. It watches while the child plays, cheers a right answer or a found pair, and gives a warm, open-handed
// smile after a miss. It never looks let down, and it sits in the bar, so it never covers a card or a balloon.

export type GameBeat = 'right' | 'miss' | null;
export const GAME_BIG_CHEER = 5; // right answers in a row that earn the big cheer

export function gameMood(last: GameBeat, run: number): Mood {
  if (last === 'right') return run > 0 && run % GAME_BIG_CHEER === 0 ? 'cheerBig' : 'cheer';
  if (last === 'miss') return 'encourage';
  return 'listen';
}

interface Props {
  who: Who;
  last: GameBeat; // how the last answer went; null before the first
  run?: number; // right answers in a row, the last one included
  beat: number; // goes up with every answer, so the friend reacts to each one, even two cheers running
}

export default function GameFriend({ who, last, run = 0, beat }: Props) {
  const mood = gameMood(last, run);
  return (
    <span className={styles.corner} data-game-friend={who} data-friend-mood={mood}>
      <Character key={beat} who={who} mood={mood} />
    </span>
  );
}
