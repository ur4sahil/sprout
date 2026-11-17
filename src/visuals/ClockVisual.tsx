import { describeVisual } from '../engine/describe';
import type { Visual } from '../engine/types';
import { INK, clockAngles, polar } from './geometry';
import styles from './visuals.module.css';
import { PALETTE } from './palette';

type Props = { visual: Extract<Visual, { kind: 'clock' }> };

// An analog clock face. The hour hand sits part-way to the next number as the minutes pass.
export default function ClockVisual({ visual }: Props) {
  const angles = clockAngles(visual.hour, visual.minute);
  // The hands stop short of the numbers, so a hand never covers the number it points at.
  const hourTip = polar(50, 50, 18, angles.hour);
  const minuteTip = polar(50, 50, 27, angles.minute);
  return (
    <svg className={styles.svg} viewBox="0 0 100 100" width="180" role="img" aria-label={describeVisual(visual)} data-visual="clock">
      <circle cx="50" cy="50" r="46" fill={PALETTE.paper} stroke={INK} strokeWidth="3" />
      {Array.from({ length: 60 }, (_, i) => {
        const outer = polar(50, 50, 44, i * 6);
        const inner = polar(50, 50, i % 5 === 0 ? 40.5 : 42.5, i * 6);
        return <line key={i} x1={outer.x} y1={outer.y} x2={inner.x} y2={inner.y} stroke={INK} strokeWidth={i % 5 === 0 ? 1.4 : 0.5} />;
      })}
      {Array.from({ length: 12 }, (_, i) => {
        const at = polar(50, 50, 35, (i + 1) * 30);
        return (
          <text key={i} x={at.x} y={at.y + 3.2} textAnchor="middle" fontSize="9" fontWeight="700" fill={INK} data-number={i + 1}>
            {i + 1}
          </text>
        );
      })}
      {!visual.noHands && <line x1="50" y1="50" x2={minuteTip.x} y2={minuteTip.y} stroke={PALETTE.minuteHand} strokeWidth="2.6" strokeLinecap="round" data-hand="minute" data-angle={angles.minute} />}
      {!visual.noHands && <line x1="50" y1="50" x2={hourTip.x} y2={hourTip.y} stroke={INK} strokeWidth="4.2" strokeLinecap="round" data-hand="hour" data-angle={angles.hour} />}
      <circle cx="50" cy="50" r="3" fill={INK} />
    </svg>
  );
}
