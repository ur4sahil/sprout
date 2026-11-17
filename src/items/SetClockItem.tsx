import { useRef, useState } from 'react';
import Icon from '../components/Icon';
import type { ClockTime } from '../engine/types';
import ClockVisual from '../visuals/ClockVisual';
import type { ItemProps } from './itemProps';
import styles from './items.module.css';

// Set the clock to a time: the hour and minute buttons turn the hands, and on the face a finger can drag
// the minute hand round to a mark. The hour hand moves with the minutes, as on a real clock.
export default function SetClockItem({ question, disabled, onChange }: ItemProps<'setClock'>) {
  const [time, setTime] = useState<ClockTime>(question.start);
  const face = useRef<HTMLDivElement>(null);
  const step = question.minuteStep;

  function set(next: ClockTime): void {
    setTime(next);
    onChange({ time: next });
  }
  const hour = (by: number): void => set({ hour: ((time.hour - 1 + by + 12) % 12) + 1, minute: time.minute });
  const minutes = (by: number): void => {
    const total = (time.minute + by + 60) % 60;
    // Past the 12 the hour moves on, and back past it the hour goes back.
    const hourBy = time.minute + by >= 60 ? 1 : time.minute + by < 0 ? -1 : 0;
    set({ hour: ((time.hour - 1 + hourBy + 12) % 12) + 1, minute: total });
  };

  function drag(clientX: number, clientY: number): void {
    const box = face.current?.getBoundingClientRect();
    if (!box || disabled) return;
    const degrees = (Math.atan2(clientX - (box.left + box.width / 2), -(clientY - (box.top + box.height / 2))) * 180) / Math.PI;
    const minute = (Math.round(((degrees + 360) % 360) / 6 / step) * step) % 60;
    if (minute !== time.minute) set({ hour: time.hour, minute });
  }

  return (
    <div className={styles.column}>
      <div
        ref={face}
        className={styles.clockFace}
        data-set-clock={`${time.hour}:${String(time.minute).padStart(2, '0')}`}
        onPointerDown={(event) => {
          event.currentTarget.setPointerCapture?.(event.pointerId);
          drag(event.clientX, event.clientY);
        }}
        onPointerMove={(event) => {
          if (event.buttons > 0) drag(event.clientX, event.clientY);
        }}
      >
        <ClockVisual visual={{ kind: 'clock', hour: time.hour, minute: time.minute }} />
      </div>
      <div className={styles.clockButtons}>
        <div className={styles.options} role="group" aria-label="Hour hand">
          <button type="button" className={`${styles.tile} ${styles.small}`} aria-label="Hour back" disabled={disabled} onClick={() => hour(-1)}>
            <Icon name="minus" />
          </button>
          <span className={styles.clockWord}>Hour</span>
          <button type="button" className={`${styles.tile} ${styles.small}`} aria-label="Hour on" disabled={disabled} onClick={() => hour(1)}>
            <Icon name="plus" />
          </button>
        </div>
        <div className={styles.options} role="group" aria-label="Minute hand">
          <button type="button" className={`${styles.tile} ${styles.small}`} aria-label="Minutes back" disabled={disabled} onClick={() => minutes(-step)}>
            <Icon name="minus" />
          </button>
          <span className={styles.clockWord}>Minutes</span>
          <button type="button" className={`${styles.tile} ${styles.small}`} aria-label="Minutes on" disabled={disabled} onClick={() => minutes(step)}>
            <Icon name="plus" />
          </button>
        </div>
      </div>
    </div>
  );
}
