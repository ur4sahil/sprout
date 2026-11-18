import { PALETTE } from '../visuals/palette';
import styles from './Character.module.css';
import Eye from './Eye';
import Mouth from './Mouth';
import { pivot } from './types';
import type { ArtProps } from './types';

// Olive: an owl. One egg-shaped brown body, two pointed ear tufts, two big cream eye discs, a small orange beak
// and a cream tummy. Her arms are wings. The ear tufts are the signature part: they always twitch a little.
export default function OliveArt({ mouth, talkLoop, eyes, look }: ArtProps) {
  return (
    <g data-art="olive">
      <ellipse data-part="foot" cx="38" cy="116.5" rx="8" ry="3.5" fill={PALETTE.oliveBeak} />
      <ellipse data-part="foot" cx="62" cy="116.5" rx="8" ry="3.5" fill={PALETTE.oliveBeak} />
      <g data-part="signature" fill={PALETTE.oliveDark} stroke={PALETTE.oliveDark} strokeWidth="3" strokeLinejoin="round">
        <path className={styles.signLeft} style={pivot(32, 38)} d="M24 45 L21 21 L43 31 Z" />
        <path className={styles.signRight} style={pivot(68, 38)} d="M76 45 L79 21 L57 31 Z" />
      </g>
      <ellipse data-part="body" cx="50" cy="72" rx="36" ry="44" fill={PALETTE.oliveBody} />
      <ellipse cx="50" cy="99" rx="21" ry="16" fill={PALETTE.oliveCream} />
      <path d="M41 94 l3.5 3.5 l3.5 -3.5 M52 94 l3.5 3.5 l3.5 -3.5 M46.5 102 l3.5 3.5 l3.5 -3.5" fill="none" stroke={PALETTE.oliveBody} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      <g data-part="head">
        <circle cx="35" cy="56" r="16" fill={PALETTE.oliveCream} />
        <circle cx="65" cy="56" r="16" fill={PALETTE.oliveCream} />
        {/* her brows follow the top of the eye discs, curving up: an owl's brows drawn straight look cross */}
        <g className={styles.brow} data-part="brows" fill="none" stroke={PALETTE.oliveDark} strokeWidth="3.2" strokeLinecap="round">
          <path d="M23 48 Q35 35 47 48" />
          <path d="M53 48 Q65 35 77 48" />
        </g>
        <Eye cx={35} cy={57} rx={9} ry={10} state={eyes} look={look} lid={PALETTE.oliveCream} line={PALETTE.oliveDark} />
        <Eye cx={65} cy={57} rx={9} ry={10} state={eyes} look={look} lid={PALETTE.oliveCream} line={PALETTE.oliveDark} />
        <path d="M45 67 Q50 65 55 67 L50 75 Z" fill={PALETTE.oliveBeak} stroke={PALETTE.oliveBeak} strokeWidth="1.6" strokeLinejoin="round" />
        <Mouth cx={50} cy={81} shape={mouth} talkLoop={talkLoop} line={PALETTE.oliveDark} fill={PALETTE.hostMouth} wide={0.8} />
      </g>
      <g className={styles.armLeft} data-part="arm-left" style={pivot(15, 76)}>
        <path d="M15 76 C5 84 7 100 15 106 C23 100 25 84 15 76 Z" fill={PALETTE.oliveDark} />
      </g>
      <g className={styles.armRight} data-part="arm-right" style={pivot(85, 76)}>
        <path d="M85 76 C75 84 77 100 85 106 C93 100 95 84 85 76 Z" fill={PALETTE.oliveDark} />
      </g>
    </g>
  );
}
