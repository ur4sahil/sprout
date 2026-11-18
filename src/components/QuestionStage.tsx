import { useEffect, useState } from 'react';
import { TIMING } from '../app/timing';
import { playSound } from '../audio/sounds';
import type { Question, Response, Say } from '../engine/types';
import QuestionView from '../items/QuestionView';
import type { ParticleKind } from '../worlds';
import BigButton from './BigButton';
import ExplanationPanel from './ExplanationPanel';
import FlyStar from './FlyStar';
import Icon from './Icon';
import Notice from './Notice';
import ParticleBurst from './ParticleBurst';
import styles from './QuestionStage.module.css';

interface Props {
  question: Question;
  phase: 'asking' | 'saving' | 'correct' | 'wrong';
  response: Response | null; // the answer so far
  lastResponse: Response | null; // the answer just submitted
  saveError: string | null;
  run?: number; // right answers in a row, this one included
  onChange: (response: Response | null) => void;
  onSubmit: () => void;
  onGotIt: () => void;
  onSpeak: (say: Say) => void;
}

// A run's bigger moments (plan section 19, phase 2): 5 in a row throws stars, 10 throws confetti. Null: the
// world's ordinary sparkles.
function runParticles(run: number): ParticleKind | undefined {
  if (run === 10) return 'confetti';
  if (run === 5) return 'star';
  return undefined;
}

// One question from asking to feedback. A right answer pops and glows, sparkles, and sends a star to the score.
// A miss is never a loss: the child's answer wobbles in a soft amber for a moment, then the steps show.
// Practice and review both use it.
export default function QuestionStage({ question, phase, response, lastResponse, saveError, run = 0, onChange, onSubmit, onGotIt, onSpeak }: Props) {
  // After a miss the answer stays up for a moment before the explanation takes its place.
  const [looked, setLooked] = useState(false);
  const missed = phase === 'wrong';
  useEffect(() => {
    if (!missed) {
      setLooked(false);
      return;
    }
    playSound('notyet');
    const timer = setTimeout(() => setLooked(true), TIMING.missLookMs);
    return () => clearTimeout(timer);
  }, [missed, question.key]);

  if (missed && lastResponse && (looked || TIMING.missLookMs === 0)) {
    return (
      <div className={styles.question} data-arrive="">
        <ExplanationPanel question={question} response={lastResponse} onDone={onGotIt} onSpeak={onSpeak} />
      </div>
    );
  }
  return (
    <div key={question.key} className={`${styles.question} ${phase === 'correct' ? styles.correct : ''} ${missed ? styles.missed : ''}`} data-phase={phase} data-run={run} data-arrive="">
      <QuestionView question={question} disabled={phase !== 'asking'} onChange={onChange} onSpeak={onSpeak} right={phase === 'correct'} />
      {phase === 'correct' && <ParticleBurst kind={runParticles(run)} seed={question.seed} at={{ x: 0.5, y: 0.7 }} />}
      {phase === 'correct' && <FlyStar />}
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
