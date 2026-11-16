import type { Question, Response, Say } from '../engine/types';
import VisualView from '../visuals/VisualView';
import ItemView from './ItemView';
import styles from './items.module.css';

interface Props {
  question: Question;
  disabled: boolean;
  onChange: (response: Response | null) => void;
  onSpeak: (say: Say) => void;
}

// One question: its prompt with a speaker button, its picture, and its answer area.
// A listen question shows a large speaker button where the target would be, and never shows the target.
export default function QuestionView({ question, disabled, onChange, onSpeak }: Props) {
  const listen = question.mode === 'listen';
  return (
    <section className={styles.question} aria-label="Question" data-mode={question.mode} data-type={question.type}>
      <div className={styles.prompt}>
        <p className={styles.promptText}>{question.prompt.text}</p>
        {!listen && (
          <button type="button" className={styles.speaker} aria-label="Hear the question" onClick={() => onSpeak(question.prompt.speak)}>
            <span aria-hidden="true">🔊</span>
          </button>
        )}
      </div>
      {listen && (
        <button type="button" className={`${styles.speaker} ${styles.bigSpeaker}`} aria-label="Hear it again" onClick={() => onSpeak(question.prompt.speak)}>
          <span aria-hidden="true">🔊</span>
        </button>
      )}
      {question.stimulus && (
        <div className={styles.stimulus}>
          <VisualView visual={question.stimulus} />
        </div>
      )}
      <ItemView key={`${question.key}|${question.seed}`} question={question} disabled={disabled} onChange={onChange} onSpeak={onSpeak} />
    </section>
  );
}
