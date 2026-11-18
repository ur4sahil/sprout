import type { Chapter } from '../lessons/chapters';
import styles from './ChapterDots.module.css';

interface Props {
  chapters: readonly Chapter[];
  current: number; // the chapter playing now, or -1 when none is
  onPick: (partIndex: number) => void; // play from this part
}

// The chapters of a lesson under its stage (game feel, phase 6): a dot for each stretch between turns and a
// diamond for each turn. The one playing is filled. Tapping one plays the lesson again from there. Each is a full
// tap target, named "Part 2" for a screen reader, and the row wraps on a narrow phone.
export default function ChapterDots({ chapters, current, onPick }: Props) {
  if (chapters.length < 2) return null;
  return (
    <div className={styles.dots} role="group" aria-label="Parts of the lesson">
      {chapters.map((chapter, i) => (
        <button
          key={chapter.start}
          type="button"
          className={styles.dot}
          data-chapter={chapter.kind}
          data-here={i === current ? '' : undefined}
          data-done={current === -1 || i < current ? '' : undefined}
          aria-label={`Part ${i + 1}`}
          aria-current={i === current ? 'step' : undefined}
          onClick={() => onPick(chapter.start)}
        />
      ))}
    </div>
  );
}
