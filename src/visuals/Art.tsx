import styles from './Art.module.css';
import { ART } from './artList';

// The code of an emoji: its code points in hex, without the variation mark. The picture files are named by it.
export function artKey(emoji: string): string {
  return [...emoji]
    .map((char) => char.codePointAt(0) ?? 0)
    .filter((code) => code !== 0xfe0f)
    .map((code) => code.toString(16))
    .join('-');
}

// Where the app's own drawn picture for this emoji is, or null when it has none.
export function artSrc(emoji: string): string | null {
  const key = artKey(emoji);
  return ART.has(key) ? `/art/${key}.svg` : null;
}

// One picture: the app's own drawn picture for this emoji, the same on every device.
// An emoji with no drawn picture is shown as it is. The picture is as tall as the text around it.
export default function Art({ emoji }: { emoji: string }) {
  const src = artSrc(emoji);
  if (!src) return <>{emoji}</>;
  return <img className={styles.art} src={src} alt="" draggable={false} data-emoji={emoji} />;
}
