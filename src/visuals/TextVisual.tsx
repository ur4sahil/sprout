import type { Visual } from '../engine/types';
import styles from './visuals.module.css';

type Props = { visual: Extract<Visual, { kind: 'text' }> };

const SIZE = { m: styles.textM, l: styles.textL, xl: styles.textXl };

// Three or more words: a sentence, a short story or a schedule such as "Gym 9:00 to 9:20. Art 10:40".
// It may run on to the next line. A numeral, a word or a sum such as 300 + 40 + 2 always stays on one line.
const WORD = /[A-Za-z']{2,}/g;
const wrapsText = (value: string): boolean => /\s/.test(value) && (value.match(WORD) ?? []).length >= 3;

// A numeral, letter, word or sentence.
export default function TextVisual({ visual }: Props) {
  const wraps = wrapsText(visual.value);
  return (
    <span className={`${styles.text} ${SIZE[visual.size]} ${wraps ? styles.textWraps : ''}`} role="img" aria-label={visual.value} data-visual="text" data-wraps={wraps ? '' : undefined}>
      {visual.value}
    </span>
  );
}
