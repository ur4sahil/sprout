import { useEffect, useState } from 'react';
import { useMixedBag } from '../../app/useMixedBag';
import { useWakeLock } from '../../app/useWakeLock';
import { LINES } from '../../audio/lines';
import { speak, stop } from '../../audio/speech';
import { warmQuestion } from '../../audio/voice';
import BigButton from '../../components/BigButton';
import FullScreenCard from '../../components/FullScreenCard';
import HintButton from '../../components/HintButton';
import HintPanel from '../../components/HintPanel';
import SkipButton from '../../components/SkipButton';
import HoldButton from '../../components/HoldButton';
import Icon from '../../components/Icon';
import KidScreen from '../../components/KidScreen';
import Notice from '../../components/Notice';
import QuestionStage from '../../components/QuestionStage';
import { castFor, voiceFor } from '../../cast';
import { PALETTE } from '../../visuals/palette';
import type { Say } from '../../engine/types';
import type { Child } from '../../storage/schema';
import bagStyles from './MixedBagSession.module.css';
import styles from './ReviewSession.module.css';

// One Mixed bag, from its first question to its last card.
export default function MixedBagSession({ child, onDone }: { child: Child; onDone: () => void }) {
  const bag = useMixedBag(child);
  const { phase, question } = bag;
  const rate = child.settings.speechRate;
  // Each question, its steps and hints are said by its skill's subject friend once the server speaks with the new
  // voices, by Sprout until then (plan section 20); the end card by Sprout.
  const voice = bag.skill ? voiceFor(bag.skill.subject) : 'sprout';
  const say = (text: Say): void => void speak(text, rate, 'normal', voice);
  useWakeLock();

  const questionId = question ? `${question.key}|${question.seed}` : null;
  useEffect(() => {
    if (!question) return;
    warmQuestion(question, voice);
    if (!child.settings.autoSpeak) return;
    void speak(question.prompt.speak, rate, 'normal', voice);
    return () => stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one reading for each question shown
  }, [questionId]);

  useEffect(() => {
    if (phase === 'done') void speak(LINES.mixedDone, rate);
  }, [phase, rate]);

  // 3 hints for the whole bag, each remembered by the question it was opened on.
  const asking = phase === 'asking' || phase === 'saving' || phase === 'correct' || phase === 'wrong';
  const [hintOn, setHintOn] = useState<string | null>(null);
  const hinting = questionId !== null && hintOn === questionId && phase === 'asking';
  const openHint = (): void => {
    if (questionId !== null && bag.hints.take(questionId)) setHintOn(questionId);
  };
  const closeHint = (): void => {
    stop();
    setHintOn(null);
  };

  return (
    <KidScreen
      bar={
        <>
          <HoldButton icon="home" label="Back to home" onHeld={onDone} />
          <h1 className={styles.title}>
            <Icon name="bag" />
            Mixed bag{bag.skill ? `: ${bag.skill.name}` : ''}
          </h1>
          <span className={styles.spacer} />
          {question && questionId !== null && asking && (
            <>
              <HintButton left={bag.hints.left} open={bag.hints.opened(questionId)} disabled={phase !== 'asking' || !bag.hints.canOpen(questionId)} onOpen={openHint} />
              <SkipButton left={bag.skipsLeft} disabled={phase !== 'asking'} onSkip={bag.skip} />
            </>
          )}
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
      {question && bag.skill && asking && (
        // The bag is a basket (game feel, phase 5): each question flies out of it as a card edged in its subject's colour.
        <div className={bagStyles.bag} data-subject={bag.skill.subject}>
          <svg key={question.key} className={bagStyles.basket} viewBox="0 0 60 40" aria-hidden="true" data-basket="">
            <path d="M18 18 C 18 2, 42 2, 42 18" stroke={PALETTE.garden.basketDark} strokeWidth="3" fill="none" />
            <path d="M10 17 L 50 17 L 45 38 L 15 38 Z" fill={PALETTE.garden.basket} stroke={PALETTE.garden.basketDark} strokeWidth="1.5" strokeLinejoin="round" />
            <path d="M12 24 L 48 24 M 13.5 31 L 46.5 31" stroke={PALETTE.garden.basketDark} strokeWidth="1.2" />
          </svg>
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
            // The friend beside the question is the one for this question's subject, so it changes as the subjects do.
            friend={{ who: castFor(bag.skill.subject), voice }}
          />
        </div>
      )}
      {hinting && question && <HintPanel question={question} who={voice} onClose={closeHint} onSpeak={say} />}
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
