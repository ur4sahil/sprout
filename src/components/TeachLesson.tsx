import { useTeach } from '../app/useTeach';
import { speak } from '../audio/speech';
import { describeAnswer } from '../engine/describe';
import type { Say } from '../engine/types';
import QuestionView from '../items/QuestionView';
import type { Lesson } from '../lessons/types';
import BigButton from './BigButton';
import CenterRow from './CenterRow';
import Icon from './Icon';
import IconButton from './IconButton';
import Confetti from './Confetti';
import type { HostMood } from './LessonHost';
import LessonHost from './LessonHost';
import LessonStage from './LessonStage';
import styles from './TeachLesson.module.css';

interface Props {
  lesson: Lesson;
  rate: number;
  onPractise: () => void;
}

// A lesson that teaches (plan section 16): the moving stage with the words under it, and the child's turns.
export default function TeachLesson({ lesson, rate, onPractise }: Props) {
  const teach = useTeach(lesson, rate);
  const { phase, moment, turn } = teach;
  const answering = (phase === 'asking' || phase === 'again') && turn !== null;
  const say = (words: Say): void => void speak(words, rate);
  const rich = lesson.look === 'rich';
  const mood: HostMood = teach.cheering ? 'cheering' : teach.talking ? 'talking' : 'idle';

  return (
    <section className={styles.card} aria-label="Lesson" data-teach-phase={phase} data-part={teach.partIndex}>
      {rich && teach.cheering && <Confetti />}
      <progress className={styles.progress} max={teach.partCount} value={Math.min(teach.partIndex, teach.partCount)} aria-label="How far through the lesson" />
      {answering ? (
        <>
          <p className={styles.yourTurn} data-your-turn="">
            {rich ? (
              <span className={styles.hostSmall}>
                <LessonHost mood={mood} />
              </span>
            ) : (
              <Icon name="star" />
            )}
            {phase === 'again' ? 'Try it again!' : 'Your turn!'}
          </p>
          <QuestionView key={`${turn.question.key}|${teach.attempt}`} question={turn.question} disabled={false} onChange={teach.setResponse} onSpeak={say} />
          <CenterRow>
            <BigButton size="kid" disabled={teach.response === null} onClick={teach.submit}>
              <Icon name="check" />
              Check
            </BigButton>
          </CenterRow>
        </>
      ) : (
        <>
          {moment &&
            (rich ? (
              <div className={styles.withHost}>
                <div className={styles.hostSpot}>
                  <LessonHost mood={mood} />
                </div>
                <LessonStage scene={moment.scene} label={moment.text} lively />
              </div>
            ) : (
              <LessonStage scene={moment.scene} label={moment.text} />
            ))}
          {moment && (
            <p className={styles.words} data-moment-text="">
              {moment.text}
            </p>
          )}
          {phase === 'shown' && turn && (
            <p className={styles.answer} data-lesson-answer="">
              <Icon name="check" />
              {describeAnswer(turn.question)}
            </p>
          )}
        </>
      )}
      <CenterRow>
        {phase !== 'done' && !answering && phase !== 'shown' && <IconButton icon={teach.paused ? 'play' : 'pause'} label={teach.paused ? 'Play' : 'Pause'} onClick={teach.togglePause} />}
        <IconButton icon="repeat" label="Start again" onClick={teach.restart} />
        {phase === 'shown' && (
          <BigButton size="kid" onClick={teach.next}>
            <Icon name="next" />
            Next
          </BigButton>
        )}
        {phase === 'done' && (
          <BigButton size="kid" onClick={onPractise}>
            <Icon name="pencil" />
            Practise
          </BigButton>
        )}
      </CenterRow>
    </section>
  );
}
