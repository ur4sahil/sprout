import { useId } from 'react';
import { PALETTE } from '../visuals/palette';
import styles from './GardenSun.module.css';

interface Props {
  share: number; // how full, 0 to 1
  done: number;
  goal: number;
  label: string; // "Today's sun"
}

const C = PALETTE.garden;
const RAYS = Array.from({ length: 12 }, (_, i) => i * 30);

// The sun in the corner of the garden: it fills from the bottom as today's plan is answered, and shows the count.
export default function GardenSun({ share, done, goal, label }: Props) {
  const clip = useId();
  const tall = 60 * Math.max(0, Math.min(1, share));
  return (
    <div className={styles.sun} role="img" aria-label={`${label}: ${done} of ${goal}`} data-sun="" data-share={Math.round(share * 100)} data-full={goal > 0 && done >= goal ? '' : undefined}>
      <svg className={styles.picture} viewBox="0 0 100 100" aria-hidden="true">
        <g className={styles.rays}>
          {RAYS.map((turn) => (
            <path key={turn} d="M50 4 L 50 13" stroke={C.sunRay} strokeWidth="5" strokeLinecap="round" transform={`rotate(${turn} 50 50)`} />
          ))}
        </g>
        <circle cx="50" cy="50" r="30" fill={C.sunEmpty} stroke={C.sunEdge} strokeWidth="2.5" />
        <clipPath id={clip}>
          <rect x="20" y={80 - tall} width="60" height={tall} />
        </clipPath>
        <circle cx="50" cy="50" r="30" fill={C.sunCore} clipPath={`url(#${clip})`} data-sun-fill="" />
      </svg>
      {goal > 0 && (
        <span className={styles.count} aria-hidden="true" data-sun-count="">
          {done}/{goal}
        </span>
      )}
    </div>
  );
}
