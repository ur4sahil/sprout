import { useState } from 'react';
import { describeAnswer, describeResponse } from '../engine/describe';
import type { Question, Response, Say } from '../engine/types';
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
  onSpeak: (say: Say) => void;
}

// After a wrong answer: no buzzer. It says "Not quite", keeps the question in view, shows the child's
// answer beside the right one, then walks through the steps one at a time. The last step's button is "Got it".
export default function ExplanationPanel({ question, response, onDone, onSpeak }: Props) {
  const [shown, setShown] = useState(1);
  const picked = question.type === 'choice' && 'index' in response ? question.options[response.index] : undefined;
  const right = question.type === 'choice' ? question.options[question.answerIndex] : undefined;
  const steps = question.explanation.steps;
  const last = shown >= steps.length;
  return (
    <Column label="Explanation" data-explanation="" data-steps-shown={shown}>
      <p className={styles.verdict} role="status" data-verdict="">
        <span aria-hidden="true">💭 </span>Not quite
      </p>
      <div className={styles.asked} data-asked="">
        <p className={styles.prompt}>{question.prompt.text}</p>
        {question.stimulus && (
          <div className={styles.picture}>
            <VisualView visual={question.stimulus} />
          </div>
        )}
      </div>
      <CenterRow>
        <div className={styles.answer}>
          <span className={styles.label}>You answered</span>
          <div className={`${styles.box} ${styles.given}`} data-given="">
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
      <div className={styles.walk}>
        {steps.length > 1 && (
          <span className={styles.label} data-step-count="">
            Step {Math.min(shown, steps.length)} of {steps.length}
          </span>
        )}
        <StepList steps={steps.slice(0, shown)} />
      </div>
      <CenterRow>
        <BigButton size="kid" tone="quiet" onClick={() => onSpeak(question.explanation.speak)}>
          <span aria-hidden="true">🔊 </span>Hear again
        </BigButton>
        {last ? (
          <BigButton size="kid" onClick={onDone}>
            <span aria-hidden="true">👍 </span>Got it
          </BigButton>
        ) : (
          <BigButton size="kid" onClick={() => setShown(shown + 1)}>
            <span aria-hidden="true">➡️ </span>Next step
          </BigButton>
        )}
      </CenterRow>
    </Column>
  );
}
