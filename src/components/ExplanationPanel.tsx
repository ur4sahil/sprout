import { describeAnswer, describeResponse } from '../engine/describe';
import type { Question, Response, Say } from '../engine/types';
import VisualView from '../visuals/VisualView';
import CenterRow from './CenterRow';
import Column from './Column';
import NotQuite from './NotQuite';
import StepWalk from './StepWalk';
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
  const picked = question.type === 'choice' && 'index' in response ? question.options[response.index] : undefined;
  const right = question.type === 'choice' ? question.options[question.answerIndex] : undefined;
  return (
    <Column label="Explanation" data-explanation="">
      <NotQuite />
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
      <StepWalk question={question} onDone={onDone} onSpeak={onSpeak} />
    </Column>
  );
}
