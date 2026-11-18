import { PALETTE } from '../visuals/palette';
import styles from './LessonHost.module.css';

// The lesson host (plan section 16): a sprout with a face who stands beside the scene.
// It bobs and blinks while idle, moves its mouth while the lesson speaks, and hops when a child gets a turn right.
export type HostMood = 'idle' | 'talking' | 'cheering';

export default function LessonHost({ mood }: { mood: HostMood }) {
  return (
    <svg className={styles.host} viewBox="0 0 100 120" aria-hidden="true" data-host={mood}>
      <g className={styles.body}>
        {/* two leaves on top */}
        <path className={styles.leafLeft} d="M50 30 C 30 10, 12 14, 10 26 C 24 34, 40 34, 50 30 Z" fill={PALETTE.hostLeaf} />
        <path className={styles.leafRight} d="M50 30 C 70 8, 90 12, 92 24 C 78 34, 60 34, 50 30 Z" fill={PALETTE.hostLeaf} />
        <path d="M50 30 L 50 40" stroke={PALETTE.hostLeaf} strokeWidth="4" strokeLinecap="round" />
        {/* a round body */}
        <ellipse cx="50" cy="78" rx="38" ry="38" fill={PALETTE.hostBody} />
        <ellipse cx="50" cy="96" rx="30" ry="16" fill={PALETTE.hostShade} opacity="0.35" />
        {/* eyes */}
        <g className={styles.eyes}>
          <ellipse cx="36" cy="70" rx="8" ry="9" fill={PALETTE.paper} />
          <ellipse cx="64" cy="70" rx="8" ry="9" fill={PALETTE.paper} />
          <circle cx="37" cy="72" r="4.5" fill={PALETTE.ink} />
          <circle cx="65" cy="72" r="4.5" fill={PALETTE.ink} />
          <circle cx="38.5" cy="70" r="1.5" fill={PALETTE.paper} />
          <circle cx="66.5" cy="70" r="1.5" fill={PALETTE.paper} />
        </g>
        <circle cx="26" cy="86" r="5" fill={PALETTE.hostCheek} opacity="0.7" />
        <circle cx="74" cy="86" r="5" fill={PALETTE.hostCheek} opacity="0.7" />
        {/* the mouth: a smile at rest, opening and closing while the lesson speaks */}
        <ellipse className={styles.mouth} cx="50" cy="90" rx="9" ry="6" fill={PALETTE.hostMouth} />
      </g>
    </svg>
  );
}
