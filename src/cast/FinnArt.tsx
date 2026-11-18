import { PALETTE } from '../visuals/palette';
import styles from './Character.module.css';
import Eye from './Eye';
import Mouth from './Mouth';
import { pivot } from './types';
import type { ArtProps } from './types';

// Finn: a frog, sitting. A wide green body, two eye bumps on top of the head, a wide mouth, bent back legs at
// the sides and big flat feet. The pale throat is the signature part: it swells and sinks as frogs' throats do.
export default function FinnArt({ mouth, talkLoop, eyes, look }: ArtProps) {
  return (
    <g data-art="finn">
      <ellipse cx="15" cy="99" rx="11" ry="15" fill={PALETTE.finnShade} />
      <ellipse cx="85" cy="99" rx="11" ry="15" fill={PALETTE.finnShade} />
      <ellipse data-part="foot" cx="24" cy="115.5" rx="15" ry="4.5" fill={PALETTE.finnShade} />
      <ellipse data-part="foot" cx="76" cy="115.5" rx="15" ry="4.5" fill={PALETTE.finnShade} />
      <ellipse data-part="body" cx="50" cy="86" rx="38" ry="30" fill={PALETTE.finnBody} />
      <g data-part="head">
        <ellipse cx="50" cy="58" rx="37" ry="25" fill={PALETTE.finnBody} />
        <circle cx="30" cy="33" r="14" fill={PALETTE.finnBody} />
        <circle cx="70" cy="33" r="14" fill={PALETTE.finnBody} />
        <g data-part="signature">
          <ellipse className={styles.swell} style={pivot(50, 76)} cx="50" cy="87" rx="23" ry="14" fill={PALETTE.finnThroat} />
        </g>
        <g className={styles.brow} data-part="brows" fill="none" stroke={PALETTE.finnShade} strokeWidth="2.6" strokeLinecap="round">
          <path d="M22 24.5 Q30 18 38 24.5" />
          <path d="M62 24.5 Q70 18 78 24.5" />
        </g>
        <Eye cx={30} cy={34} rx={8} ry={8.5} state={eyes} look={look} lid={PALETTE.finnBody} line={PALETTE.ink} />
        <Eye cx={70} cy={34} rx={8} ry={8.5} state={eyes} look={look} lid={PALETTE.finnBody} line={PALETTE.ink} />
        <circle cx="20" cy="64" r="4.5" fill={PALETTE.hostCheek} opacity="0.7" />
        <circle cx="80" cy="64" r="4.5" fill={PALETTE.hostCheek} opacity="0.7" />
        <Mouth cx={50} cy={63} shape={mouth} talkLoop={talkLoop} line={PALETTE.hostMouth} fill={PALETTE.hostMouth} wide={1.45} />
      </g>
      <g className={styles.armLeft} data-part="arm-left" style={pivot(27, 84)}>
        <path d="M27 84 L27 104" stroke={PALETTE.finnShade} strokeWidth="6" strokeLinecap="round" />
        <circle cx="27" cy="107" r="6" fill={PALETTE.finnBody} stroke={PALETTE.finnShade} strokeWidth="1.6" />
      </g>
      <g className={styles.armRight} data-part="arm-right" style={pivot(73, 84)}>
        <path d="M73 84 L73 104" stroke={PALETTE.finnShade} strokeWidth="6" strokeLinecap="round" />
        <circle cx="73" cy="107" r="6" fill={PALETTE.finnBody} stroke={PALETTE.finnShade} strokeWidth="1.6" />
      </g>
    </g>
  );
}
