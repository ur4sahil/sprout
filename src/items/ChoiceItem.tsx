import { useState } from 'react';
import { describeVisual } from '../engine/describe';
import VisualView from '../visuals/VisualView';
import type { ItemProps } from './itemProps';
import { speakable } from './itemProps';
import styles from './items.module.css';

// Tap one of 2 to 4 options.
export default function ChoiceItem({ question, disabled, onChange, onSpeak }: ItemProps<'choice'>) {
  const [picked, setPicked] = useState<number | null>(null);
  return (
    <div className={styles.options} role="group" aria-label="Answers">
      {question.options.map((option, index) => (
        <button
          key={index}
          type="button"
          className={`${styles.tile} ${picked === index ? styles.picked : ''}`}
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
        </button>
      ))}
    </div>
  );
}
