import { useEffect } from 'react';
import { useMixedBag } from '../../app/useMixedBag';
import { useWakeLock } from '../../app/useWakeLock';
import { LINES } from '../../audio/lines';
import { speak, stop } from '../../audio/speech';
import { warmQuestion } from '../../audio/voice';
import BigButton from '../../components/BigButton';
import FullScreenCard from '../../components/FullScreenCard';
import HoldButton from '../../components/HoldButton';
import Icon from '../../components/Icon';
import KidScreen from '../../components/KidScreen';
import Notice from '../../components/Notice';
import QuestionStage from '../../components/QuestionStage';
import type { Say } from '../../engine/types';
import type { Child } from '../../storage/schema';
import styles from './ReviewSession.module.css';

// One Mixed bag, from its first question to its last card.
export default function MixedBagSession({ child, onDone }: { child: Child; onDone: () => void }) {
  const bag = useMixedBag(child);
  const { phase, question } = bag;
  const rate = child.settings.speechRate;
  const say = (text: Say): void => void speak(text, rate);
  useWakeLock();

  const questionId = question ? `${question.key}|${question.seed}` : null;
  useEffect(() => {
    if (!question) return;
    warmQuestion(question);
    if (!child.settings.autoSpeak) return;
    void speak(question.prompt.speak, rate);
    return () => stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one reading for each question shown
  }, [questionId]);

  useEffect(() => {
    if (phase === 'done') void speak(LINES.mixedDone, rate);
  }, [phase, rate]);

  return (
    <KidScreen
      bar={
        <>
          <HoldButton icon="home" label="Back to home" onHeld={onDone} />
          <h1 className={styles.title}>
            <Icon name="bag" />
            Mixed bag{bag.skill ? `: ${bag.skill.name}` : ''}
          </h1>
        </>
      }
      side={
        <p className={styles.count} data-mixed-count="">
          {bag.asked} of {bag.total}
        </p>
      }
    >
      {phase === 'loading' && <p className={styles.wait} aria-busy="true" aria-label="Getting ready" />}
      {phase === 'failed' && <Notice role="alert">The Mixed bag could not be opened. Go back and try again.</Notice>}
      {question && (phase === 'asking' || phase === 'saving' || phase === 'correct' || phase === 'wrong') && (
        <QuestionStage
          question={question}
          phase={phase}
          response={bag.response}
          lastResponse={bag.lastResponse}
          saveError={bag.saveError}
          onChange={bag.setResponse}
          onSubmit={bag.submit}
          onGotIt={bag.gotIt}
          onSpeak={say}
        />
      )}
      {(phase === 'done' || phase === 'none') && (
        <FullScreenCard
          emoji={phase === 'done' ? '🎒' : '🌱'}
          title={phase === 'done' ? 'Mixed bag done' : 'Nothing to mix yet'}
          line={phase === 'done' ? `${bag.right} of ${bag.asked} right.` : 'Practise a few different skills first, then come back.'}
          name="mixed-done"
        >
          <BigButton size="kid" onClick={onDone}>
            <Icon name="next" />
            All done
          </BigButton>
        </FullScreenCard>
      )}
    </KidScreen>
  );
}
