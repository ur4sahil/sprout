import type { CSSProperties } from 'react';
import { describeVisual } from '../engine/describe';
import type { Visual } from '../engine/types';
import EmojiGroupVisual from './EmojiGroupVisual';
import styles from './visuals.module.css';

type Props = { visual: Extract<Visual, { kind: 'pairs' }> };

// The dot each number is counted with: the dot cards' dot.
const DOT = '⚫';

// How wide one number's column is, in letter heights: about 0.62 for each digit, 1.35 for the blank box, and with
// dots the width of a row of up to five dots (each 1.15 of a 0.28 letter height, with a small gap).
function columnEms(value: number | 'blank', dots: boolean): number {
  const written = value === 'blank' ? 1.35 : String(value).length * 0.62;
  if (!dots || value === 'blank') return Math.max(written, 1.2);
  const inRow = Math.min(Math.max(value, 1), 5);
  return Math.max(written, 1.2, inRow * 0.322 + (inRow - 1) * 0.042);
}

// The widest pair, in letter heights: two columns, the arrow, the two gaps and the box's padding either side.
function widthInEms(visual: Props['visual']): number {
  const dots = visual.dots === true;
  const widest = Math.max(...visual.pairs.map((pair) => columnEms(pair.from, dots) + columnEms(pair.to, dots)));
  return Math.round((widest + 1 + 2 * 0.35 + 2 * 0.5 + 0.2) * 100) / 100;
}

function NumberColumn({ value, dots }: { value: number; dots: boolean }) {
  return (
    <span className={styles.pairNumber} data-number={value}>
      <span>{value}</span>
      {dots && value > 0 && (
        <span className={styles.pairDots} data-dots={value}>
          <EmojiGroupVisual visual={{ kind: 'emojiGroup', emoji: DOT, count: value, layout: 'grid5' }} />
        </span>
      )}
    </span>
  );
}

// Number pairs for a rule puzzle (Reasoning A.8, the owner's choice, Nov 22, 2026): one pair a line, each in its own
// light box, so "6 → 9", "4 → 7" and "5 → □" never run together. The blank is the app's dashed box. With `dots`,
// each number has its dots under it (the blank never has any), for the easy levels a young child counts.
export default function PairsVisual({ visual }: Props) {
  const dots = visual.dots === true;
  const style = { '--ems': widthInEms(visual) } as CSSProperties;
  return (
    <div className={`${styles.pairs} ${dots ? styles.pairsDotted : ''}`} style={style} role="img" aria-label={describeVisual(visual)} data-visual="pairs">
      {visual.pairs.map((pair, i) => (
        <div key={i} className={styles.pair} data-pair={i} aria-hidden="true">
          <NumberColumn value={pair.from} dots={dots} />
          <span className={styles.pairArrow}>→</span>
          {pair.to === 'blank' ? <span className={styles.blank} data-blank="" /> : <NumberColumn value={pair.to} dots={dots} />}
        </div>
      ))}
    </div>
  );
}
