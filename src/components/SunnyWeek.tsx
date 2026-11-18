import type { Say } from '../engine/types';
import { PALETTE } from '../visuals/palette';
import styles from './SunnyWeek.module.css';

interface Props {
  week: readonly boolean[]; // Monday to Sunday: was it a sunny day (from `sunnyDays` in src/app/sunnyDays.ts)
  today?: number | null; // which of the seven is today, 0 = Monday; left out on a week that is over
  total: number; // the number written beside the suns: sunny days so far (or in that week, on a postcard)
  small?: boolean; // the smaller size, for a profile card
}

const C = PALETTE.garden;
const RAYS = [0, 45, 90, 135, 180, 225, 270, 315];

// "12 sunny days", "1 sunny day".
export function sunnyWords(total: number): string {
  return `${total} sunny ${total === 1 ? 'day' : 'days'}`;
}

// The same, to be said aloud.
export function sunnySay(total: number): Say {
  return [{ number: total }, `sunny ${total === 1 ? 'day' : 'days'}`];
}

// A week as seven small suns (game feel, phase 7): lit for the days the child learned, today's ringed, and the
// total beside them. A day without learning is a plain outline, the same as a day still to come: nothing here
// marks a day as missed, and the number beside it never goes down.
export default function SunnyWeek({ week, today = null, total, small = false }: Props) {
  const lit = week.filter(Boolean).length;
  return (
    <div className={`${styles.week} ${small ? styles.small : ''}`} role="img" aria-label={`${sunnyWords(total)}. This week: ${lit}.`} data-sunny-week="" data-total={total}>
      <span className={styles.suns} aria-hidden="true">
        {week.map((sunny, day) => (
          <svg key={day} className={`${styles.sun} ${sunny && day === today ? styles.glow : ''}`} viewBox="0 0 40 40" data-sun-day={day} data-lit={sunny ? '' : undefined} data-today={day === today ? '' : undefined}>
            {day === today && <circle className={styles.ring} cx="20" cy="20" r="18" fill="none" strokeWidth="2.5" />}
            {sunny ? (
              <>
                {RAYS.map((turn) => (
                  <path key={turn} d="M20 4.5 L20 8.5" stroke={C.sunRay} strokeWidth="2.6" strokeLinecap="round" transform={`rotate(${turn} 20 20)`} />
                ))}
                <circle cx="20" cy="20" r="8.5" fill={C.sunCore} stroke={C.sunEdge} strokeWidth="1.4" />
              </>
            ) : (
              <circle cx="20" cy="20" r="8.5" fill="none" stroke={C.sunEdge} strokeWidth="1.4" strokeOpacity="0.55" />
            )}
          </svg>
        ))}
      </span>
      <span className={styles.total} aria-hidden="true" data-sunny-total="">
        {sunnyWords(total)}
      </span>
    </div>
  );
}
