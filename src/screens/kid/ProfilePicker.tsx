import styles from './ProfilePicker.module.css';

export default function ProfilePicker() {
  return (
    <main className={styles.screen}>
      <div className={styles.mark} aria-hidden="true">
        🌱
      </div>
      <h1 className={styles.title}>Sprout</h1>
    </main>
  );
}
