import { useEffect, useMemo, useState } from 'react';
import { exampleFor, nudgeFor } from '../app/hints';
import { LINES } from '../audio/lines';
import { spokenSteps } from '../audio/stepSay';
import { warmQuestion } from '../audio/voice';
import { describeAnswer } from '../engine/describe';
import type { Question, Say } from '../engine/types';
import VisualView from '../visuals/VisualView';
import BigButton from './BigButton';
import CenterRow from './CenterRow';
import Icon from './Icon';
import StepWalk from './StepWalk';
import styles from './HintPanel.module.css';

interface Props {
  question: Question; // the question the child is on
  onClose: () => void;
  onSpeak: (say: Say) => void;
}

// A hint (the owner's choice, Nov 21, 2026), over the question, which waits underneath. First the opening step of
// this question's own working, when that cannot give the answer away (`nudgeFor`); then, or straight away when it
// could, a worked example of a different question of the same skill, its steps one at a time.
export default function HintPanel({ question, onClose, onSpeak }: Props) {
  const nudge = useMemo(() => nudgeFor(question), [question]);
  const example = useMemo(() => exampleFor(question), [question]);
  const [stage, setStage] = useState<'nudge' | 'example'>(nudge || !example ? 'nudge' : 'example');

  useEffect(() => {
    if (example) warmQuestion(example);
  }, [example]);

  // Each stage is said as it opens: the nudge, or the example's question and its first step.
  useEffect(() => {
    if (stage === 'nudge') {
      if (nudge?.say) onSpeak([...LINES.hintNudge, ' ', ...nudge.say]);
      return;
    }
    if (example) onSpeak([...LINES.hintExample, ' ', ...example.prompt.speak, ' ', ...(spokenSteps(example)?.[0] ?? [])]);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once as each stage opens
  }, [stage]);

  const right = example?.type === 'choice' ? example.options[example.answerIndex] : undefined;
  return (
    <div className={styles.layer} role="dialog" aria-modal="true" aria-label="Hint" data-hint={stage}>
      <div className={styles.card}>
        <span className={styles.eyebrow}>
          <Icon name="hint" />
          {stage === 'nudge' ? 'Hint' : 'Example'}
        </span>
        {stage === 'nudge' && (
          <>
            <p className={styles.nudge} data-nudge="">
              {nudge?.text ?? 'Look at the question again, one part at a time.'}
            </p>
            <CenterRow>
              {nudge?.say && (
                <BigButton size="kid" tone="quiet" onClick={() => onSpeak(nudge.say ?? [])}>
                  <Icon name="speaker" />
                  Hear again
                </BigButton>
              )}
              {example && (
                <BigButton size="kid" tone="quiet" onClick={() => setStage('example')}>
                  <Icon name="pencil" />
                  Show me an example
                </BigButton>
              )}
            </CenterRow>
          </>
        )}
        {stage === 'example' && example && (
          <>
            <div className={styles.asked} data-example="">
              <p className={styles.prompt}>{example.prompt.text}</p>
              {example.stimulus && (
                <div className={styles.picture}>
                  <VisualView visual={example.stimulus} />
                </div>
              )}
            </div>
            <div className={styles.answer}>
              <span className={styles.label}>Answer</span>
              <div className={styles.box} data-example-answer="">
                {right ? <VisualView visual={right} /> : <span className={styles.text}>{describeAnswer(example)}</span>}
              </div>
            </div>
            {example.explanation.visual && (
              <div className={styles.picture}>
                <VisualView visual={example.explanation.visual} />
              </div>
            )}
            <StepWalk question={example} onDone={onClose} onSpeak={onSpeak} />
          </>
        )}
        <BigButton size="kid" tone={stage === 'example' ? 'quiet' : 'main'} onClick={onClose}>
          <Icon name="back" />
          Back to my question
        </BigButton>
      </div>
    </div>
  );
}
