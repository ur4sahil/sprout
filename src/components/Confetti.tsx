import type { CSSProperties } from 'react';
import { PALETTE } from '../visuals/palette';
import styles from './Confetti.module.css';

// A short burst of confetti over a lesson card when a child gets a turn right (plan section 16).
// The pieces are spread by their place in the list, not by chance, so the burst is the same every time.
const PIECES = 28;

export default function Confetti() {
  return (
    <div className={styles.burst} aria-hidden="true" data-confetti="">
      {Array.from({ length: PIECES }, (_, i) => {
        const place = {
          '--set-left': `${(i * 37) % 100}%`,
          '--set-delay': `${(i % 7) * 60}ms`,
          '--set-turn': `${((i * 53) % 360) - 180}deg`,
          '--set-drift': `${((i * 29) % 40) - 20}%`,
          background: PALETTE.confetti[i % PALETTE.confetti.length],
        } as CSSProperties;
        return <span key={i} className={styles.piece} style={place} />;
      })}
    </div>
  );
}
