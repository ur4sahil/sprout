import { PALETTE } from '../visuals/palette';
import styles from './Character.module.css';
import Eye from './Eye';
import Mouth from './Mouth';
import { pivot } from './types';
import type { ArtProps } from './types';

// Pip: a ladybug. A round red shell with six big black spots, a dark head with two feelers, white eyes and a
// white smile. The shell is two wings hinged under the chin: they are the signature part, and lift when Pip is glad.
export default function PipArt({ mouth, talkLoop, eyes, look }: ArtProps) {
  return (
    <g data-art="pip">
      <ellipse data-part="foot" cx="38" cy="117" rx="8" ry="3" fill={PALETTE.pipDark} />
      <ellipse data-part="foot" cx="62" cy="117" rx="8" ry="3" fill={PALETTE.pipDark} />
      {/* the dark body under the shell, seen in the gap when the wings lift */}
      <ellipse data-part="body" cx="50" cy="84" rx="31" ry="32" fill={PALETTE.pipDark} />
      <g data-part="signature">
        <g className={styles.wingLeft} style={pivot(50, 52)}>
          <path d="M50 51 A33 33 0 0 0 50 117 Z" fill={PALETTE.pipShell} />
          <circle cx="31" cy="73" r="6.5" fill={PALETTE.pipDark} />
          <circle cx="26" cy="93" r="5.5" fill={PALETTE.pipDark} />
          <circle cx="39" cy="106" r="4.5" fill={PALETTE.pipDark} />
        </g>
        <g className={styles.wingRight} style={pivot(50, 52)}>
          <path d="M50 51 A33 33 0 0 1 50 117 Z" fill={PALETTE.pipShell} />
          <circle cx="69" cy="73" r="6.5" fill={PALETTE.pipDark} />
          <circle cx="74" cy="93" r="5.5" fill={PALETTE.pipDark} />
          <circle cx="61" cy="106" r="4.5" fill={PALETTE.pipDark} />
        </g>
        {/* the line where the two wings meet */}
        <path d="M50 62 L50 116" stroke={PALETTE.pipDark} strokeWidth="2" strokeLinecap="round" />
      </g>
      <g data-part="head">
        <path d="M41 19 L33 8 M59 19 L67 8" stroke={PALETTE.pipDark} strokeWidth="3" strokeLinecap="round" />
        <circle cx="33" cy="7" r="3.8" fill={PALETTE.pipDark} />
        <circle cx="67" cy="7" r="3.8" fill={PALETTE.pipDark} />
        <circle cx="50" cy="40" r="25" fill={PALETTE.pipDark} />
        <g className={styles.brow} data-part="brows" fill="none" stroke={PALETTE.paper} strokeWidth="2.4" strokeLinecap="round">
          <path d="M34 26 Q40 23 46 26" />
          <path d="M54 26 Q60 23 66 26" />
        </g>
        <Eye cx={40} cy={38} rx={7.5} ry={8.5} state={eyes} look={look} lid={PALETTE.pipDark} line={PALETTE.paper} />
        <Eye cx={60} cy={38} rx={7.5} ry={8.5} state={eyes} look={look} lid={PALETTE.pipDark} line={PALETTE.paper} />
        <circle cx="31" cy="50" r="4" fill={PALETTE.pipCheek} opacity="0.85" />
        <circle cx="69" cy="50" r="4" fill={PALETTE.pipCheek} opacity="0.85" />
        <Mouth cx={50} cy={53} shape={mouth} talkLoop={talkLoop} line={PALETTE.paper} fill={PALETTE.pipMouth} wide={0.85} />
      </g>
      <g className={styles.armLeft} data-part="arm-left" style={pivot(20, 76)}>
        <path d="M20 76 L20 90" stroke={PALETTE.pipDark} strokeWidth="5" strokeLinecap="round" />
        <circle cx="20" cy="93" r="5" fill={PALETTE.pipDark} />
      </g>
      <g className={styles.armRight} data-part="arm-right" style={pivot(80, 76)}>
        <path d="M80 76 L80 90" stroke={PALETTE.pipDark} strokeWidth="5" strokeLinecap="round" />
        <circle cx="80" cy="93" r="5" fill={PALETTE.pipDark} />
      </g>
    </g>
  );
}
