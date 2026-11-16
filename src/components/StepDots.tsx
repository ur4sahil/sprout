import styles from './StepDots.module.css';

interface Props {
  label: string;
  names: readonly string[]; // one for each step
  current: number;
  onPick: (index: number) => void;
}

// A row of dots, one for each step. Tapping a dot jumps to that step.
export default function StepDots({ label, names, current, onPick }: Props) {
  return (
    <div className={styles.dots} role="group" aria-label={label}>
      {names.map((name, i) => (
        <button key={name} type="button" className={`${styles.dot} ${i === current ? styles.here : ''}`} aria-label={`${name}, step ${i + 1} of ${names.length}`} aria-current={i === current ? 'step' : undefined} onClick={() => onPick(i)} />
      ))}
    </div>
  );
}
