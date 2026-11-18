import styles from './Character.module.css';
import type { MouthShape } from './types';

// A friend's mouth: one of six shapes, none of them a frown. While the friend talks by itself the four talking
// shapes are all drawn and the styles show them in turn, so the mouth moves with no code running.
interface MouthProps {
  cx: number;
  cy: number;
  shape: MouthShape;
  talkLoop: boolean;
  line: string; // the colour of a mouth drawn as a line (closed, smile)
  fill: string; // the colour inside an open mouth
  wide?: number; // how much wider than usual: the frog's mouth is wide
}

// The shapes a talking mouth goes through, in order. The second is the one left showing when movement is off.
const TALK: readonly MouthShape[] = ['closed', 'small', 'wide', 'round'];
const TALK_STYLES = [styles.talk0, styles.talk1, styles.talk2, styles.talk3];

function draw(shape: MouthShape, line: string, fill: string) {
  switch (shape) {
    case 'closed':
      return <path d="M-6 0 Q0 2.2 6 0" fill="none" stroke={line} strokeWidth="2.8" strokeLinecap="round" />;
    case 'small':
      return <ellipse cx="0" cy="1" rx="3.8" ry="2.8" fill={fill} />;
    case 'wide':
      return <ellipse cx="0" cy="1.5" rx="8" ry="5.2" fill={fill} />;
    case 'round':
      return <ellipse cx="0" cy="1.5" rx="5" ry="5.8" fill={fill} />;
    case 'smile':
      return <path d="M-8 -1.5 Q0 7 8 -1.5" fill="none" stroke={line} strokeWidth="3" strokeLinecap="round" />;
    case 'bigSmile':
      return <path d="M-9.5 -2 Q0 12.5 9.5 -2 Z" fill={fill} stroke={fill} strokeWidth="1.6" strokeLinejoin="round" />;
  }
}

export default function Mouth({ cx, cy, shape, talkLoop, line, fill, wide = 1 }: MouthProps) {
  return (
    <g data-part="mouth" transform={`translate(${cx} ${cy}) scale(${wide} 1)`}>
      {talkLoop
        ? TALK.map((each, i) => (
            <g key={each} className={TALK_STYLES[i]} data-talk-shape={each}>
              {draw(each, line, fill)}
            </g>
          ))
        : draw(shape, line, fill)}
    </g>
  );
}
