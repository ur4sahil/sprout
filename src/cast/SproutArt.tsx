import { PALETTE } from '../visuals/palette';
import styles from './Character.module.css';
import Eye from './Eye';
import Mouth from './Mouth';
import { pivot } from './types';
import type { ArtProps } from './types';

// Sprout: a round green sprout with two leaves on top. The leaves are its signature part: they always sway.
// The body, face and colours are the lesson host's, so the Sprout children already know is the same one.
export default function SproutArt({ mouth, talkLoop, eyes, look }: ArtProps) {
  return (
    <g data-art="sprout">
      <ellipse data-part="foot" cx="36" cy="116.5" rx="9" ry="3.5" fill={PALETTE.hostLeaf} />
      <ellipse data-part="foot" cx="64" cy="116.5" rx="9" ry="3.5" fill={PALETTE.hostLeaf} />
      <g data-part="signature">
        <path className={styles.signLeft} style={pivot(50, 30)} d="M50 30 C 30 10, 12 14, 10 26 C 24 34, 40 34, 50 30 Z" fill={PALETTE.hostLeaf} />
        <path className={styles.signRight} style={pivot(50, 30)} d="M50 30 C 70 8, 90 12, 92 24 C 78 34, 60 34, 50 30 Z" fill={PALETTE.hostLeaf} />
        <path d="M50 30 L 50 42" stroke={PALETTE.hostLeaf} strokeWidth="4" strokeLinecap="round" />
      </g>
      <ellipse data-part="body" cx="50" cy="78" rx="38" ry="38" fill={PALETTE.hostBody} />
      <ellipse cx="50" cy="96" rx="30" ry="16" fill={PALETTE.hostShade} opacity="0.35" />
      <g data-part="head">
        <g className={styles.brow} data-part="brows" fill="none" stroke={PALETTE.hostLeaf} strokeWidth="2.6" strokeLinecap="round">
          <path d="M29 57 Q36 53.5 43 57" />
          <path d="M57 57 Q64 53.5 71 57" />
        </g>
        <Eye cx={36} cy={70} rx={8} ry={9} state={eyes} look={look} lid={PALETTE.hostBody} line={PALETTE.ink} />
        <Eye cx={64} cy={70} rx={8} ry={9} state={eyes} look={look} lid={PALETTE.hostBody} line={PALETTE.ink} />
        <circle cx="26" cy="86" r="5" fill={PALETTE.hostCheek} opacity="0.7" />
        <circle cx="74" cy="86" r="5" fill={PALETTE.hostCheek} opacity="0.7" />
        <Mouth cx={50} cy={89} shape={mouth} talkLoop={talkLoop} line={PALETTE.hostMouth} fill={PALETTE.hostMouth} />
      </g>
      <g className={styles.armLeft} data-part="arm-left" style={pivot(14, 82)}>
        <path d="M14 82 L14 96" stroke={PALETTE.hostLeaf} strokeWidth="6" strokeLinecap="round" />
        <circle cx="14" cy="99" r="5.5" fill={PALETTE.hostBody} stroke={PALETTE.hostLeaf} strokeWidth="1.6" />
      </g>
      <g className={styles.armRight} data-part="arm-right" style={pivot(86, 82)}>
        <path d="M86 82 L86 96" stroke={PALETTE.hostLeaf} strokeWidth="6" strokeLinecap="round" />
        <circle cx="86" cy="99" r="5.5" fill={PALETTE.hostBody} stroke={PALETTE.hostLeaf} strokeWidth="1.6" />
      </g>
    </g>
  );
}
