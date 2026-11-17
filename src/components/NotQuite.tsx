import styles from './NotQuite.module.css';

// Says plainly, and kindly, that the answer was not right: no red, no cross, no buzzer.
export default function NotQuite() {
  return (
    <p className={styles.verdict} role="status" data-verdict="">
      <span aria-hidden="true">💭 </span>Not quite
    </p>
  );
}
