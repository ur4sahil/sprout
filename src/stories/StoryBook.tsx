import { useState } from 'react';
import { useStill } from '../cast/useStill';
import Icon from '../components/Icon';
import IconButton from '../components/IconButton';
import TileButton from '../components/TileButton';
import Art from '../visuals/Art';
import styles from './StoryBook.module.css';
import StoryReader from './StoryReader';
import { storyShelf } from './progress';
import type { Episode } from './types';

export interface StoryBookProps {
  episodes: readonly Episode[]; // every episode there is, in any order
  finishedIds: readonly string[]; // the episodes this child has finished
  rate: number; // the child's speech rate
  calm: boolean;
  onClose: () => void;
}

// The story book: a shelf with a cover for every episode. A finished story shows its title and picture and opens
// the reader, to read again any time; a story not reached yet is a closed cover with no title.
// Reading a story again from here saves nothing.
export default function StoryBook({ episodes, finishedIds, rate, calm, onClose }: StoryBookProps) {
  const still = useStill() || calm;
  const [reading, setReading] = useState<Episode | null>(null);

  if (reading) return <StoryReader episode={reading} rate={rate} calm={calm} onDone={() => setReading(null)} onClose={() => setReading(null)} />;

  return (
    <section className={styles.book} data-still={still ? '' : undefined} aria-label="Story book">
      <div className={styles.head}>
        <h1 className={styles.title}>
          <Icon name="book" />
          Story book
        </h1>
        <IconButton icon="close" label="Close the story book" onClick={onClose} />
      </div>
      <ul className={styles.shelf}>
        {storyShelf(episodes, finishedIds).map(({ episode, open }) => (
          <li key={episode.id} className={styles.place} data-season={episode.season} data-cover={open ? 'open' : 'closed'}>
            {open ? (
              <TileButton label={episode.title} onClick={() => setReading(episode)}>
                <span className={styles.picture}>
                  <Art emoji={episode.cover} />
                </span>
                <span className={styles.name}>{episode.title}</span>
              </TileButton>
            ) : (
              <div className={styles.closed} role="img" aria-label="A story still to come">
                <Icon name="book" />
              </div>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
