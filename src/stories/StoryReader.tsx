import { useCallback, useEffect, useRef, useState } from 'react';
import { speak, stop } from '../audio/speech';
import { warm } from '../audio/voice';
import Character from '../cast/Character';
import { useStill } from '../cast/useStill';
import BigButton from '../components/BigButton';
import IconButton from '../components/IconButton';
import TileButton from '../components/TileButton';
import type { Say } from '../engine/types';
import Art from '../visuals/Art';
import styles from './StoryReader.module.css';
import StoryScene from './StoryScene';
import StoryText from './StoryText';
import type { Episode } from './types';
import { readingPlan, replySay, storyWords } from './words';
import type { StoryWord } from './words';

export interface StoryReaderProps {
  episode: Episode;
  rate: number; // the child's speech rate
  calm: boolean; // the child's Calm mode (the device's Reduce Motion counts too)
  onDone: () => void; // the child read to the end and tapped Done: the caller saves the episode as finished
  onClose: () => void; // the child left before the end: nothing is saved
}

// One episode of "The Garden Year", read like a picture book: the scene on top, the words below in large type,
// Olive reading each page aloud while its words light up one by one. Back, forward, read again and close; the
// last page asks the story's question, and any answer gets a warm reply before Done.
export default function StoryReader({ episode, rate, calm, onDone, onClose }: StoryReaderProps) {
  const still = useStill() || calm;
  const last = episode.pages.length; // the question's page comes after the story's pages
  const [index, setIndex] = useState(0);
  const [turn, setTurn] = useState<'forward' | 'back'>('forward');
  const [chosen, setChosen] = useState<number | null>(null);
  const [readCount, setReadCount] = useState(0);
  const [lit, setLit] = useState<number | null>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const page = episode.pages[Math.min(index, last - 1)];
  const asking = index === last;
  let say: Say = page?.say ?? [];
  if (asking) say = chosen === null ? episode.question.say : replySay(episode, chosen);
  const words = storyWords(say);

  const clearTimers = useCallback((): void => {
    for (const timer of timers.current) clearTimeout(timer);
    timers.current = [];
  }, []);

  // Ask for every page's recording as the story opens, so each is ready when its page turns.
  useEffect(() => {
    for (const each of episode.pages) warm(each.say, 'lesson', 'olive');
    warm(episode.question.say, 'lesson', 'olive');
  }, [episode]);

  // Read the page aloud. Each word lights up in turn, its time shared out evenly across the line's reading
  // time, because the voice does not say when each word is spoken. When the voice finishes, the light goes out.
  useEffect(() => {
    const spoken: Say = index === last ? (chosen === null ? episode.question.say : replySay(episode, chosen)) : (episode.pages[index]?.say ?? []);
    const plan = readingPlan(storyWords(spoken), rate);
    let live = true;
    clearTimers();
    setLit(null);
    plan.starts.forEach((start, i) => timers.current.push(setTimeout(() => setLit(i), start)));
    timers.current.push(setTimeout(() => setLit(null), plan.total));
    void speak(spoken, rate, 'lesson', 'olive').then((finished) => {
      if (live && finished) {
        clearTimers();
        setLit(null);
      }
    });
    return () => {
      live = false;
      clearTimers();
    };
  }, [episode, index, chosen, readCount, rate, last, clearTimers]);

  // Leaving the story stops the voice.
  useEffect(() => () => stop(), []);

  const go = (to: number): void => {
    if (to < 0 || to > last) return;
    setTurn(to > index ? 'forward' : 'back');
    setIndex(to);
  };

  // A tap on a word says that word alone, and stops the page being read.
  const sayWord = (word: StoryWord): void => {
    clearTimers();
    setLit(null);
    void speak(word.say, rate, 'normal', 'olive');
  };

  const sceneLabel = asking ? episode.question.text : (page?.text ?? '');

  return (
    <section className={styles.reader} data-still={still ? '' : undefined} data-story={episode.id} aria-label={episode.title}>
      <div className={styles.stage}>
        <div key={index} className={styles.page} data-turn={turn} data-page={asking ? 'question' : index + 1}>
          {page && <StoryScene scene={page.scene} label={sceneLabel} />}
        </div>
        <div className={styles.close}>
          <IconButton icon="close" label="Close the story" onClick={onClose} />
        </div>
      </div>

      <div className={styles.panel}>
        <div className={styles.olive}>
          <Character who="olive" mood={lit === null ? 'idle' : 'talk'} talking={lit !== null} />
        </div>
        <div className={styles.words}>
          <StoryText words={words} lit={lit} still={still} onWord={sayWord} />
        </div>
      </div>

      {asking && (
        <div className={styles.options} role="group" aria-label={episode.question.text}>
          {episode.question.options.map((option, i) => (
            <TileButton
              key={option.text}
              label={option.text}
              selected={chosen === i}
              disabled={chosen !== null && chosen !== i}
              onClick={() => {
                if (chosen === null) setChosen(i);
              }}
            >
              {option.picture && (
                <span className={styles.optionPicture}>
                  <Art emoji={option.picture} />
                </span>
              )}
              <span>{option.text}</span>
            </TileButton>
          ))}
        </div>
      )}

      <div className={styles.controls}>
        <IconButton icon="back" label="Back a page" onClick={() => go(index - 1)} disabled={index === 0} />
        <IconButton icon="repeat" label="Read it again" onClick={() => setReadCount((count) => count + 1)} />
        {asking && chosen !== null ? (
          <BigButton size="kid" onClick={onDone}>
            Done
          </BigButton>
        ) : (
          <IconButton icon="next" label="Next page" onClick={() => go(index + 1)} disabled={asking} />
        )}
      </div>
    </section>
  );
}
