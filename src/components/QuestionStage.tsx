import Icon from './Icon';
import type { Question, Response, Say } from '../engine/types';
import QuestionView from '../items/QuestionView';
import BigButton from './BigButton';
import ExplanationPanel from './ExplanationPanel';
import Notice from './Notice';
import ParticleBurst from './ParticleBurst';
import styles from './QuestionStage.module.css';

interface Props {
  question: Question;
  phase: 'asking' | 'saving' | 'correct' | 'wrong';
  response: Response | null; // the answer so far
  lastResponse: Response | null; // the answer just submitted
  saveError: string | null;
  onChange: (response: Response | null) => void;
  onSubmit: () => void;
  onGotIt: () => void;
  onSpeak: (say: Say) => void;
}

// One question from asking to feedback: the question and Submit, then either a green
// "Correct!" or the explanation. Practice and review both use it.
export default function QuestionStage({ question, phase, response, lastResponse, saveError, onChange, onSubmit, onGotIt, onSpeak }: Props) {
  if (phase === 'wrong' && lastResponse) {
    return (
      <div className={styles.question}>
        <ExplanationPanel question={question} response={lastResponse} onDone={onGotIt} onSpeak={onSpeak} />
      </div>
    );
  }
  return (
    <div key={question.key} className={`${styles.question} ${phase === 'correct' ? styles.correct : ''}`} data-phase={phase} data-arrive="">
      <QuestionView question={question} disabled={phase !== 'asking'} onChange={onChange} onSpeak={onSpeak} />
      {phase === 'correct' && <ParticleBurst seed={question.seed} at={{ x: 0.5, y: 0.7 }} />}
      {saveError && <Notice role="alert">{saveError}</Notice>}
      {phase === 'correct' ? (
        <p className={styles.praise} role="status" data-correct="">
          <Icon name="check" />Correct!
        </p>
      ) : (
        <BigButton size="kid" disabled={phase !== 'asking' || response === null} onClick={onSubmit}>
          <Icon name="check" />Submit
        </BigButton>
      )}
    </div>
  );
}
