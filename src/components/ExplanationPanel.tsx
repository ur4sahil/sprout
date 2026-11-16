import { describeAnswer, describeResponse } from '../engine/describe';
import type { Question, Response } from '../engine/types';
import VisualView from '../visuals/VisualView';
import BigButton from './BigButton';
import CenterRow from './CenterRow';
import Column from './Column';
import StepList from './StepList';
import styles from './ExplanationPanel.module.css';

interface Props {
  question: Question;
  response: Response;
  onDone: () => void;
}

// After a wrong answer: no buzzer. "You answered" and "Correct answer" side by side,
// then the explanation steps and picture. "Got it" loads the next question.
export default function ExplanationPanel({ question, response, onDone }: Props) {
  const picked = question.type === 'choice' && 'index' in response ? question.options[response.index] : undefined;
  const right = question.type === 'choice' ? question.options[question.answerIndex] : undefined;
  return (
    <Column label="Explanation" data-explanation="">
      <CenterRow>
        <div className={styles.answer}>
          <span className={styles.label}>You answered</span>
          <div className={styles.box} data-given="">
            {picked ? <VisualView visual={picked} /> : <span className={styles.text}>{describeResponse(question, response)}</span>}
          </div>
        </div>
        <div className={styles.answer}>
          <span className={styles.label}>Correct answer</span>
          <div className={`${styles.box} ${styles.right}`} data-correct="">
            {right ? <VisualView visual={right} /> : <span className={styles.text}>{describeAnswer(question)}</span>}
          </div>
        </div>
      </CenterRow>
      {question.explanation.visual && (
        <div className={styles.picture}>
          <VisualView visual={question.explanation.visual} />
        </div>
      )}
      <StepList steps={question.explanation.steps} />
      <BigButton size="kid" onClick={onDone}>
        <span aria-hidden="true">👍 </span>Got it
      </BigButton>
    </Column>
  );
}
