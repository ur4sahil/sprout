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

// One picture: the app's own drawn picture for this emoji, the same on every device.
// An emoji with no drawn picture is shown as it is. The picture is as tall as the text around it.
export default function Art({ emoji }: { emoji: string }) {
  const key = artKey(emoji);
  if (!ART.has(key)) return <>{emoji}</>;
  return <img className={styles.art} src={`/art/${key}.svg`} alt="" draggable={false} data-emoji={emoji} />;
}
