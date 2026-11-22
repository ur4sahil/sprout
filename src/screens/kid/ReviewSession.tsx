import { LINES } from '../../audio/lines';
import Art from '../../visuals/Art';
import Icon from '../../components/Icon';
import { useEffect, useState } from 'react';
import { useReview } from '../../app/useReview';
import { useWakeLock } from '../../app/useWakeLock';
import { speak, stop } from '../../audio/speech';
import { warmQuestion } from '../../audio/voice';
import BigButton from '../../components/BigButton';
import FullScreenCard from '../../components/FullScreenCard';
import HintButton from '../../components/HintButton';
import HintPanel from '../../components/HintPanel';
import HoldButton from '../../components/HoldButton';
import KidScreen from '../../components/KidScreen';
import Notice from '../../components/Notice';
import PracticeFriend from '../../components/PracticeFriend';
import QuestionStage from '../../components/QuestionStage';
import ReviewPot from '../../components/ReviewPot';
import { plantKindFor } from '../../components/plantKind';
import { castFor } from '../../cast';
import { REVIEW_QUESTIONS } from '../../engine/review';
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
  // Each question, its steps and hints are said by its skill's subject friend (plan section 20); the end card by Sprout.
  const friend = review.skill ? castFor(review.skill.subject) : 'sprout';
  const say = (text: Say): void => void speak(text, rate, 'normal', friend);
  useWakeLock();

  const questionId = question ? `${question.key}|${question.seed}` : null;
  useEffect(() => {
    if (!question) return;
    // What this question may say is fetched now, so the recorded voice is ready when it is wanted.
    warmQuestion(question, friend);
    if (!child.settings.autoSpeak) return;
    void speak(question.prompt.speak, rate, 'normal', friend);
    return () => stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one reading for each question shown
  }, [questionId]);

  // Each skill under review is a plant in a pot, watered by each right answer (game feel, phase 5). A skill whose
  // review is due is a mastered one, so its plant is in bloom; a miss never takes that away.
  const asking = question !== null && (phase === 'asking' || phase === 'saving' || phase === 'correct' || phase === 'wrong');
  const pots = skills.flatMap((each, index) => {
    const kind = plantKindFor(each);
    if (!kind) return [];
    const result = review.results.find((r) => r.skill.id === each.id);
    const here = index === review.place.index;
    const done = result !== undefined || (here && review.place.answered >= REVIEW_QUESTIONS);
    const watered = result?.right ?? (here ? review.place.right : 0);
    return [{ skill: each, kind, done, watered, current: here && !done }];
  });

  // 3 hints for the whole review, each remembered by the question it was opened on.
  const [hintOn, setHintOn] = useState<string | null>(null);
  const hinting = questionId !== null && hintOn === questionId && phase === 'asking';
  const openHint = (): void => {
    if (questionId !== null && review.hints.take(questionId)) setHintOn(questionId);
  };
  const closeHint = (): void => {
    stop();
    setHintOn(null);
  };

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
          <span className={styles.spacer} />
          {question && questionId !== null && asking && (
            <HintButton left={review.hints.left} open={review.hints.opened(questionId)} disabled={phase !== 'asking' || !review.hints.canOpen(questionId)} onOpen={openHint} />
          )}
        </>
      }
      side={
        <>
          <p className={styles.count} data-review-count="">
            {review.asked} of {review.total}
          </p>
          {review.skill && <PracticeFriend who={castFor(review.skill.subject)} questionKey={questionId} phase={phase} />}
        </>
      }
    >
      {phase === 'loading' && <p className={styles.wait} aria-busy="true" aria-label="Getting ready" />}
      {phase === 'failed' && <Notice role="alert">The review could not be opened. Go back and try again.</Notice>}
      {asking && pots.length > 0 && (
        <ul className={styles.pots} aria-label="Plants to water">
          {pots.map((pot) => (
            <ReviewPot key={pot.skill.id} kind={pot.kind} stage={4} watered={pot.watered} done={pot.done} current={pot.current} label={pot.skill.name} />
          ))}
        </ul>
      )}
      {question && asking && (
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
      {hinting && question && <HintPanel question={question} who={friend} onClose={closeHint} onSpeak={say} />}
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
