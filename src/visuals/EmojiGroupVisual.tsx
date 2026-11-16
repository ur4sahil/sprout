import { describeVisual } from '../engine/describe';
import type { Visual } from '../engine/types';
import { DICE_CELLS } from './geometry';
import styles from './visuals.module.css';

type Props = { visual: Extract<Visual, { kind: 'emojiGroup' }> };

// Countable objects in a row, in rows of five, scattered, or as the dots on a die.
export default function EmojiGroupVisual({ visual }: Props) {
  const second = visual.emoji2 !== undefined && visual.count2 ? visual.count2 : 0;
  const total = visual.count + second;
  const items = Array.from({ length: total }, (_, i) => (i < visual.count ? visual.emoji : (visual.emoji2 ?? visual.emoji)));
  const crossedFrom = visual.count - (visual.crossed ?? 0);

  // Where each object sits, for the layouts that place objects in a fixed grid.
  let cells: number[] | null = null;
  let columns = 5;
  if (visual.layout === 'scatter' && visual.slots && visual.slots.length >= total) cells = visual.slots;
  if (visual.layout === 'dice' && DICE_CELLS[total]) {
    cells = DICE_CELLS[total] as number[];
    columns = 3;
  }
  const layout = cells ? (visual.layout === 'dice' ? styles.dice : styles.scatter) : visual.layout === 'row' ? styles.row : styles.grid5;

  return (
    <div className={`${styles.group} ${layout}`} role="img" aria-label={describeVisual(visual)} data-visual="emojiGroup">
      {items.map((emoji, i) => {
        const cell = cells ? (cells[i] as number) : null;
        const place = cell === null ? undefined : { gridColumn: (cell % columns) + 1, gridRow: Math.floor(cell / columns) + 1 };
        const crossed = i < visual.count && i >= crossedFrom;
        return (
          <span key={i} className={`${styles.item} ${crossed ? styles.crossed : ''}`} style={place} data-item={crossed ? 'crossed' : 'object'} aria-hidden="true">
            {emoji}
            {visual.numbered && <span className={styles.number}>{i + 1}</span>}
          </span>
        );
      })}
    </div>
  );
}
