import styles from './StepList.module.css';

// The numbered steps of a worked answer.
export default function StepList({ steps }: { steps: readonly string[] }) {
  return (
    <ol className={styles.steps}>
      {steps.map((step, i) => (
        <li key={i}>{step}</li>
      ))}
    </ol>
  );
}
