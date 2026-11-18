import { useState } from 'react';
import Icon from '../components/Icon';
import { describeVisual } from '../engine/describe';
import VisualView from '../visuals/VisualView';
import type { ItemProps } from './itemProps';
import { speakable } from './itemProps';
import styles from './items.module.css';

// Tap one of 2 to 4 options. A card lifts under the finger and the chosen one stays raised; when the answer is
// right, the chosen card flips over to show a tick.
export default function ChoiceItem({ question, disabled, onChange, onSpeak, right }: ItemProps<'choice'>) {
  const [picked, setPicked] = useState<number | null>(null);
  return (
    <div className={styles.options} role="group" aria-label="Answers">
      {question.options.map((option, index) => (
        <button
          key={index}
          type="button"
          className={`${styles.tile} ${styles.lift} ${picked === index ? `${styles.picked} ${styles.raised}` : ''} ${right && picked === index ? styles.flip : ''}`}
          data-feel={right && picked === index ? '' : undefined}
          data-right={right && picked === index ? '' : undefined}
          aria-pressed={picked === index}
          aria-label={describeVisual(option)}
          disabled={disabled}
          data-option={index}
          onClick={() => {
            setPicked(index);
            onChange({ index });
            const say = speakable(question, option.speak);
            if (say) onSpeak(say);
          }}
        >
          <VisualView visual={option} />
          {right && picked === index && (
            <span className={styles.tickFace} aria-hidden="true" data-feel="" data-tick="">
              <Icon name="check" />
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
