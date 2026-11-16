import type { Visual } from '../engine/types';
import styles from './visuals.module.css';

type Props = { visual: Extract<Visual, { kind: 'text' }> };

const SIZE = { m: styles.textM, l: styles.textL, xl: styles.textXl };

// Three or more words in a row: a sentence or a short story. It may run on to the next line.
// A numeral, a word or a sum such as 300 + 40 + 2 always stays on one line.
const SENTENCE = /[A-Za-z']+[,.]?\s+[A-Za-z']+[,.]?\s+[A-Za-z']+/;

// A numeral, letter, word or sentence.
export default function TextVisual({ visual }: Props) {
  const wraps = SENTENCE.test(visual.value);
  return (
    <span className={`${styles.text} ${SIZE[visual.size]} ${wraps ? styles.textWraps : ''}`} role="img" aria-label={visual.value} data-visual="text" data-wraps={wraps ? '' : undefined}>
      {visual.value}
    </span>
  );
}
