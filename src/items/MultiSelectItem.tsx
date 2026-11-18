import { useState } from 'react';
import Icon from '../components/Icon';
import { describeVisual } from '../engine/describe';
import VisualView from '../visuals/VisualView';
import { turn } from './itemFeel';
import type { ItemProps } from './itemProps';
import { speakable } from './itemProps';
import styles from './items.module.css';

// Tap every option that fits. Tap again to take one back. Each pick gets a small pin with its number, in the
// order the child picked; when the answer is right the pins pop into ticks, one after another.
export default function MultiSelectItem({ question, disabled, onChange, onSpeak, right }: ItemProps<'multiSelect'>) {
  // Kept in the order picked, for the pins. The answer reported is the same picks in their order on screen.
  const [picked, setPicked] = useState<number[]>([]);
  return (
    <div className={styles.options} role="group" aria-label="Answers">
      {question.options.map((option, index) => {
        const place = picked.indexOf(index);
        const on = place >= 0;
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
              const next = on ? picked.filter((i) => i !== index) : [...picked, index];
              setPicked(next);
              onChange(next.length > 0 ? { indexes: [...next].sort((a, b) => a - b) } : null);
              const say = on ? null : speakable(question, option.speak);
              if (say) onSpeak(say);
            }}
          >
            {on &&
              (right ? (
                <span className={`${styles.badge} ${styles.pinTick}`} style={turn(place)} aria-hidden="true" data-feel="" data-tick={place + 1}>
                  <Icon name="check" />
                </span>
              ) : (
                <span className={`${styles.badge} ${styles.pin}`} aria-hidden="true" data-feel="" data-pin={place + 1}>
                  {place + 1}
                </span>
              ))}
            <VisualView visual={option} />
          </button>
        );
      })}
    </div>
  );
}
