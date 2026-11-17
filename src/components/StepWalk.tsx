import { useState } from 'react';
import { spokenSteps } from '../audio/stepSay';
import type { Question, Say } from '../engine/types';
import BigButton from './BigButton';
import CenterRow from './CenterRow';
import StepList from './StepList';
import styles from './StepWalk.module.css';

interface Props {
  question: Question;
  onDone: () => void;
  onSpeak: (say: Say) => void;
}

// The steps of a worked answer, one at a time, each said aloud as it appears.
// "Hear again" repeats the step on show. The last step's button is "Got it".
export default function StepWalk({ question, onDone, onSpeak }: Props) {
  const [shown, setShown] = useState(1);
  const steps = question.explanation.steps;
  const spoken = spokenSteps(question);
  const last = shown >= steps.length;
  const next = (): void => {
    const said = spoken?.[shown];
    if (said) onSpeak(said);
    setShown(shown + 1);
  };
  return (
    <>
      <div className={styles.walk} data-steps-shown={shown}>
        {steps.length > 1 && (
          <span className={styles.count} data-step-count="">
            Step {Math.min(shown, steps.length)} of {steps.length}
          </span>
        )}
        <StepList steps={steps.slice(0, shown)} />
      </div>
      <CenterRow>
        <BigButton size="kid" tone="quiet" onClick={() => onSpeak(spoken?.[Math.min(shown, steps.length) - 1] ?? question.explanation.speak)}>
          <span aria-hidden="true">🔊 </span>Hear again
        </BigButton>
        {last ? (
          <BigButton size="kid" onClick={onDone}>
            <span aria-hidden="true">👍 </span>Got it
          </BigButton>
        ) : (
          <BigButton size="kid" onClick={next}>
            <span aria-hidden="true">➡️ </span>Next step
          </BigButton>
        )}
      </CenterRow>
    </>
  );
}
