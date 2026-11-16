import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePractice } from '../../app/usePractice';
import { speak, stop } from '../../audio/speech';
import BigButton from '../../components/BigButton';
import Celebration from '../../components/Celebration';
import ExplanationPanel from '../../components/ExplanationPanel';
import IconButton from '../../components/IconButton';
import KidScreen from '../../components/KidScreen';
import Notice from '../../components/Notice';
import SoftBreak from '../../components/SoftBreak';
import StatusPanel from '../../components/StatusPanel';
import type { Skill } from '../../content/catalogue';
import type { Response, Say } from '../../engine/types';
import QuestionView from '../../items/QuestionView';
import { now } from '../../lib/clock';
import type { Child } from '../../storage/schema';
import styles from './PracticeSession.module.css';

interface Props {
  child: Child;
  skill: Skill;
}

// The practice screen: the question on the left, the status panel on the right.
export default function PracticeSession({ child, skill }: Props) {
  const navigate = useNavigate();
  const practice = usePractice(child, skill);
  const { phase, question, state } = practice;
  const [seconds, setSeconds] = useState(0);
  const rate = child.settings.speechRate;
  const goHome = (): void => {
    void navigate('/home', { replace: true });
  };
  const say = (text: Say): void => void speak(text, rate);

  // The prompt is read aloud when the question appears. Keyed on the question, and cancelled
  // in the cleanup, so it is never said twice.
  const questionId = question ? `${question.key}|${question.seed}` : null;
  useEffect(() => {
    if (!question || !child.settings.autoSpeak) return;
    void speak(question.prompt.speak, rate);
    return () => stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one reading for each question shown
  }, [questionId]);

  // The only clock a child can ever see, and only when the parent turned it on.
  useEffect(() => {
    if (!child.settings.showTimer || !practice.startedAt) return;
    const started = new Date(practice.startedAt).getTime();
    const timer = setInterval(() => setSeconds(Math.max(0, Math.floor((now().getTime() - started) / 1000))), 1000);
    return () => clearInterval(timer);
  }, [child.settings.showTimer, practice.startedAt]);

  // Pre-K profiles answer a choice question with one tap, unless its options say their names when tapped.
  const oneTap = child.grade === 'PK' && question?.type === 'choice' && question.options.every((option) => option.speak === undefined);

  function onChange(response: Response | null): void {
    practice.setResponse(response);
    if (oneTap && response) practice.submit(response);
  }

  return (
    <KidScreen
      bar={
        <>
          <IconButton icon="🏠" label="Back to home" onClick={goHome} />
          <h1 className={styles.skill}>
            <span className={styles.code}>{skill.code}</span> {skill.name}
          </h1>
        </>
      }
      side={state && <StatusPanel answered={practice.answered} score={state.score} attempts={state.attempts} placedOut={state.placedOut} seconds={child.settings.showTimer ? seconds : null} />}
    >
      {phase === 'loading' && <p className={styles.wait} aria-busy="true" aria-label="Getting ready" />}
      {phase === 'failed' && (
        <>
          <Notice role="alert">This skill could not be opened. Go back and try again.</Notice>
          <BigButton size="kid" onClick={goHome}>
            <span aria-hidden="true">🏠 </span>Back
          </BigButton>
        </>
      )}
      {question && (phase === 'asking' || phase === 'saving' || phase === 'correct') && (
        <div className={`${styles.question} ${phase === 'correct' ? styles.correct : ''}`} data-phase={phase}>
          <QuestionView question={question} disabled={phase !== 'asking'} onChange={onChange} onSpeak={say} />
          {practice.saveError && <Notice role="alert">{practice.saveError}</Notice>}
          {phase === 'correct' ? (
            <p className={styles.praise} role="status" data-correct="">
              <span aria-hidden="true">✅ </span>Correct!
            </p>
          ) : (
            <BigButton size="kid" disabled={phase !== 'asking' || practice.response === null} onClick={() => practice.submit()}>
              <span aria-hidden="true">✔️ </span>Submit
            </BigButton>
          )}
        </div>
      )}
      {question && phase === 'wrong' && practice.lastResponse && <ExplanationPanel question={question} response={practice.lastResponse} onDone={practice.gotIt} />}
      {phase === 'celebrating' && practice.milestone !== null && (
        <Celebration milestone={practice.milestone} skillName={skill.name} onDone={practice.milestone === 100 ? goHome : practice.afterCelebration} />
      )}
      {phase === 'break' && <SoftBreak answered={practice.answered} onKeepGoing={practice.keepGoing} onAllDone={goHome} />}
    </KidScreen>
  );
}
