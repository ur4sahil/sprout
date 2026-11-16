import { useState } from 'react';
import { describeVisual } from '../engine/describe';
import VisualView from '../visuals/VisualView';
import type { ItemProps } from './itemProps';
import { speakable } from './itemProps';
import styles from './items.module.css';

// Tap every option that fits. Tap again to take one back.
export default function MultiSelectItem({ question, disabled, onChange, onSpeak }: ItemProps<'multiSelect'>) {
  const [picked, setPicked] = useState<number[]>([]);
  return (
    <div className={styles.options} role="group" aria-label="Answers">
      {question.options.map((option, index) => {
        const on = picked.includes(index);
        return (
          <button
            key={index}
            type="button"
            className={`${styles.tile} ${on ? styles.picked : ''}`}
            aria-pressed={on}
            aria-label={describeVisual(option)}
            disabled={disabled}
            data-option={index}
            onClick={() => {
              const next = on ? picked.filter((i) => i !== index) : [...picked, index].sort((a, b) => a - b);
              setPicked(next);
              onChange(next.length > 0 ? { indexes: next } : null);
              const say = on ? null : speakable(question, option.speak);
              if (say) onSpeak(say);
            }}
          >
            <VisualView visual={option} />
          </button>
        );
      })}
    </div>
  );
}
