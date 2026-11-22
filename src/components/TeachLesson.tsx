import { useMemo } from 'react';
import { useTeach } from '../app/useTeach';
import { speak } from '../audio/speech';
import { describeAnswer } from '../engine/describe';
import Character from '../cast/Character';
import type { Who } from '../cast/types';
import type { Say } from '../engine/types';
import QuestionView from '../items/QuestionView';
import { castOn, lessonBackdrop } from '../lessons/backdrops';
import { chapterAt, chaptersOf } from '../lessons/chapters';
import type { Lesson } from '../lessons/types';
import BigButton from './BigButton';
import CenterRow from './CenterRow';
import ChapterDots from './ChapterDots';
import Icon from './Icon';
import IconButton from './IconButton';
import Confetti from './Confetti';
import type { HostMood } from './LessonHost';
import LessonStage from './LessonStage';
import styles from './TeachLesson.module.css';

interface Props {
  lesson: Lesson;
  rate: number;
  who: Who; // the friend of the skill's subject, who says the whole lesson (plan section 20)
  onPractise: () => void;
}

// A lesson that teaches (plan section 16): the moving stage with the words under it, and the child's turns.
export default function TeachLesson({ lesson, rate, who, onPractise }: Props) {
  const teach = useTeach(lesson, rate, who);
  const { phase, moment, turn } = teach;
  const answering = (phase === 'asking' || phase === 'again') && turn !== null;
  const say = (words: Say): void => void speak(words, rate, 'normal', who);
  const rich = lesson.look === 'rich';
  const mood: HostMood = teach.cheering ? 'cheering' : teach.talking ? 'talking' : 'idle';
  // The friend who teaches here (the place says which subject), and Pip beside the words in Math.
  const cast = castOn(lessonBackdrop(lesson));
  const chapters = useMemo(() => chaptersOf(lesson), [lesson]);

  return (
    <section className={styles.card} aria-label="Lesson" data-teach-phase={phase} data-part={teach.partIndex}>
      {rich && teach.cheering && <Confetti />}
      <progress className={styles.progress} max={teach.partCount} value={Math.min(teach.partIndex, teach.partCount)} aria-label="How far through the lesson" />
      {answering ? (
        <>
          <p className={styles.yourTurn} data-your-turn="">
            {rich ? (
              // The teacher stays beside the question, leaning in and waiting for the child.
              <span className={styles.turnHost} data-turn-host={cast.host}>
                <Character who={cast.host} mood={teach.cheering ? 'cheer' : 'listen'} />
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
              <LessonStage scene={moment.scene} label={moment.text} lively actor={mood} who={cast.host} cue={teach.cue} />
            ) : (
              <LessonStage scene={moment.scene} label={moment.text} />
            ))}
          {moment && (
            <div className={styles.wordsRow}>
              {rich && cast.helper && (
                <span className={styles.helper} data-helper={cast.helper}>
                  <Character who={cast.helper} mood={teach.cheering ? 'cheer' : 'idle'} />
                </span>
              )}
              <p className={styles.words} data-moment-text="">
                {moment.text}
              </p>
            </div>
          )}
          {phase === 'shown' && turn && (
            <p className={styles.answer} data-lesson-answer="">
              <Icon name="check" />
              {describeAnswer(turn.question)}
            </p>
          )}
          <ChapterDots chapters={chapters} current={phase === 'done' ? -1 : chapterAt(chapters, teach.partIndex)} onPick={teach.goTo} />
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
