import { describeVisual } from '../engine/describe';
import type { Visual } from '../engine/types';
import CoinEmblem from './CoinEmblem';
import { COIN_COLOR, COIN_MM, COIN_RIDGED, INK } from './geometry';
import styles from './visuals.module.css';

type Props = { visual: Extract<Visual, { kind: 'coins' }> };

const SCALE = 2.1; // drawing units for each millimetre
const GAP = 8;

// Coins drawn with their true relative sizes and colours.
export default function CoinsVisual({ visual }: Props) {
  const radii = visual.coins.map((coin) => (COIN_MM[coin] * SCALE) / 2);
  const tallest = Math.max(...radii, 10) * 2;
  let x = 3;
  const placed = visual.coins.map((coin, i) => {
    const r = radii[i] as number;
    const cx = x + r;
    x += r * 2 + GAP;
    return { coin, r, cx };
  });
  const width = x - GAP + 3;
  return (
    <svg className={styles.svg} viewBox={`0 0 ${width} ${tallest + 6}`} width={width * 1.6} role="img" aria-label={describeVisual(visual)} data-visual="coins">
      {placed.map(({ coin, r, cx }, i) => (
        <g key={i} transform={`translate(${cx} ${tallest / 2 + 3})`} data-coin={coin} data-radius={r.toFixed(2)}>
          <circle r={r} fill={COIN_COLOR[coin]} stroke={INK} strokeWidth="1.6" />
          {COIN_RIDGED[coin] && <circle r={r - 1.6} fill="none" stroke={INK} strokeWidth="1.8" strokeDasharray="1.1 1.5" opacity="0.7" data-ridged="" />}
          <circle r={r - 4.2} fill="none" stroke={INK} strokeWidth="0.7" opacity="0.5" />
          <CoinEmblem coin={coin} r={r} />
        </g>
      ))}
    </svg>
  );
}
