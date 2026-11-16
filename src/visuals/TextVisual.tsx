import type { Visual } from '../engine/types';
import styles from './visuals.module.css';

type Props = { visual: Extract<Visual, { kind: 'text' }> };

const SIZE = { m: styles.textM, l: styles.textL, xl: styles.textXl };

// A numeral, letter or word.
export default function TextVisual({ visual }: Props) {
  return (
    <span className={`${styles.text} ${SIZE[visual.size]}`} role="img" aria-label={visual.value} data-visual="text">
      {visual.value}
    </span>
  );
}
