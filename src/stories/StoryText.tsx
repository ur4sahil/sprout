import styles from './StoryText.module.css';
import type { StoryWord } from './words';

interface Props {
  words: StoryWord[];
  lit: number | null; // the word being read now
  still: boolean; // Calm mode: the word being read is underlined, nothing moves
  onWord: (word: StoryWord) => void; // a tap on a word says that word alone
}

// A page's words in large type. Each word is its own button, so a child can tap any word to hear it.
export default function StoryText({ words, lit, still, onWord }: Props) {
  return (
    <p className={styles.text} data-still={still ? '' : undefined} data-story-text="">
      {words.map((word, i) => (
        <button
          key={i}
          type="button"
          className={styles.word}
          data-lit={lit === i ? '' : undefined}
          aria-current={lit === i ? 'true' : undefined}
          disabled={word.say.length === 0}
          onClick={() => onWord(word)}
        >
          {word.shown}
        </button>
      ))}
    </p>
  );
}
