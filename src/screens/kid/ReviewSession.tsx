import { LINES } from '../../audio/lines';
import Art from '../../visuals/Art';
import Icon from '../../components/Icon';
import { useEffect } from 'react';
import { useReview } from '../../app/useReview';
import { useWakeLock } from '../../app/useWakeLock';
import { speak, stop } from '../../audio/speech';
import { warmQuestion } from '../../audio/voice';
import BigButton from '../../components/BigButton';
import FullScreenCard from '../../components/FullScreenCard';
import HoldButton from '../../components/HoldButton';
import KidScreen from '../../components/KidScreen';
import Notice from '../../components/Notice';
import QuestionStage from '../../components/QuestionStage';
import type { Skill } from '../../content/catalogue';
import type { Say } from '../../engine/types';
import type { Child } from '../../storage/schema';
import styles from './ReviewSession.module.css';

interface Props {
  child: Child;
  skills: readonly Skill[];
  doneLabel: string; // the button on the last card
  onDone: () => void;
  onLeave: () => void; // hold-to-exit
}

// A review of mastered skills that are due: 3 questions each.
export default function ReviewSession({ child, skills, doneLabel, onDone, onLeave }: Props) {
  const review = useReview(child, skills);
  const { phase, question } = review;
  const rate = child.settings.speechRate;
  const say = (text: Say): void => void speak(text, rate);
  useWakeLock();

  const questionId = question ? `${question.key}|${question.seed}` : null;
  useEffect(() => {
    if (!question) return;
    // What this question may say is fetched now, so the recorded voice is ready when it is wanted.
    warmQuestion(question);
    if (!child.settings.autoSpeak) return;
    void speak(question.prompt.speak, rate);
    return () => stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one reading for each question shown
  }, [questionId]);

  const kept = review.results.filter((result) => result.passed).length;
  useEffect(() => {
    if (phase === 'done') void speak(LINES.reviewDone, rate);
  }, [phase, rate]);

  return (
    <KidScreen
      bar={
        <>
          <HoldButton icon="home" label="Back to home" onHeld={onLeave} />
          <h1 className={styles.title}>
            <Icon name="repeat" />Review{review.skill ? `: ${review.skill.name}` : ''}
          </h1>
        </>
      }
      side={
        <p className={styles.count} data-review-count="">
          {review.asked} of {review.total}
        </p>
      }
    >
      {phase === 'loading' && <p className={styles.wait} aria-busy="true" aria-label="Getting ready" />}
      {phase === 'failed' && <Notice role="alert">The review could not be opened. Go back and try again.</Notice>}
      {question && (phase === 'asking' || phase === 'saving' || phase === 'correct' || phase === 'wrong') && (
        <QuestionStage
          question={question}
          phase={phase}
          response={review.response}
          lastResponse={review.lastResponse}
          saveError={review.saveError}
          onChange={review.setResponse}
          onSubmit={review.submit}
          onGotIt={review.gotIt}
          onSpeak={say}
        />
      )}
      {phase === 'done' && (
        <FullScreenCard
          emoji={kept === review.results.length && kept > 0 ? '🏅' : '🌱'}
          title="Review done"
          line={review.results.length === 0 ? 'Nothing to review right now.' : `${kept} of ${review.results.length} ${review.results.length === 1 ? 'medal' : 'medals'} kept.`}
          name="review-done"
        >
          <ul className={styles.results}>
            {review.results.map((result) => (
              <li key={result.skill.id} data-result={result.passed ? 'kept' : 'practise'}>
                <Art emoji={result.passed ? "🏅" : "🌱"} />{" "}
                {result.skill.name}: {result.passed ? 'medal kept' : 'back to practice'}
              </li>
            ))}
          </ul>
          <BigButton size="kid" onClick={onDone}>
            <Icon name="next" />
            {doneLabel}
          </BigButton>
        </FullScreenCard>
      )}
    </KidScreen>
  );
}
