import { useEffect, useRef, useState } from 'react';
import { TIMING } from '../app/timing';
import Icon, { type IconName } from './Icon';
import styles from './HoldButton.module.css';

interface Props {
  icon: IconName; // a drawing from the app's own set
  label: string; // what a screen reader says
  onHeld: () => void;
}

// The kid lock: leaving needs a press and hold of 2 seconds. A plain tap does nothing.
export default function HoldButton({ icon, label, onHeld }: Props) {
  const [holding, setHolding] = useState(false);
  // A quick tap does nothing, so it says what to do instead.
  const [hint, setHint] = useState(false);
  const hintTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function start(): void {
    if (timer.current) return;
    setHolding(true);
    timer.current = setTimeout(() => {
      timer.current = null;
      setHolding(false);
      onHeld();
    }, TIMING.holdToExitMs);
  }

  function cancel(): void {
    // Let go too soon: show the hint for a moment.
    if (timer.current) {
      clearTimeout(timer.current);
      setHint(true);
      if (hintTimer.current) clearTimeout(hintTimer.current);
      hintTimer.current = setTimeout(() => setHint(false), TIMING.holdHintMs);
    }
    timer.current = null;
    setHolding(false);
  }

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
      if (hintTimer.current) clearTimeout(hintTimer.current);
    },
    [],
  );

  return (
    <span className={styles.wrap}>
    <button
      type="button"
      className={`${styles.button} ${holding ? styles.holding : ''}`}
      style={{ ['--hold-ms' as string]: `${TIMING.holdToExitMs}ms` }}
      aria-label={`${label}. Press and hold`}
      data-holding={holding}
      onPointerDown={start}
      onPointerUp={cancel}
      onPointerLeave={cancel}
      onPointerCancel={cancel}
      onContextMenu={(event) => event.preventDefault()}
      onKeyDown={(event) => {
        if ((event.key === 'Enter' || event.key === ' ') && !event.repeat) start();
      }}
      onKeyUp={cancel}
      onBlur={cancel}
    >
      <span className={styles.fill} aria-hidden="true" />
      <span className={styles.icon} aria-hidden="true">
        <Icon name={icon} />
      </span>
    </button>
      {hint && (
        <span className={styles.hint} role="status" data-hold-hint="">
          Press and hold
        </span>
      )}
    </span>
  );
}
