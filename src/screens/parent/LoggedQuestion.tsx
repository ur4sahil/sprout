import type { Redrawn } from '../../app/parentData';
import VisualView from '../../visuals/VisualView';
import styles from './Parent.module.css';

// One answered question shown again: the question, what the child answered, and the right answer beside it.
export default function LoggedQuestion({ shown, correct }: { shown: Redrawn; correct: boolean }) {
  return (
    <div className={styles.logged} data-redrawn={shown.question ? 'yes' : 'snapshot'}>
      <p className={styles.prompt}>{shown.prompt}</p>
      {shown.question?.stimulus && (
        <div className={styles.small}>
          <VisualView visual={shown.question.stimulus} />
        </div>
      )}
      {!shown.question && <p className={styles.soft}>This skill has changed since. The question is shown as it was saved.</p>}
      <p data-given="">
        <span aria-hidden="true">{correct ? '✅ ' : '❌ '}</span>
        Answered: {shown.given}
      </p>
      {!correct && <p data-correct-answer="">Right answer: {shown.correct}</p>}
    </div>
  );
}
