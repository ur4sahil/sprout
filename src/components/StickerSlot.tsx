import Art from '../visuals/Art';
import Icon from './Icon';
import ParticleBurst from './ParticleBurst';
import styles from './StickerSlot.module.css';

export type SlotState = 'placed' | 'loose' | 'locked';

interface Props {
  id: string; // the award's id
  label: string; // "3 skills mastered"
  sticker: string; // the sticker's picture (an emoji drawn by Art)
  state: SlotState; // pressed on, earned but still loose at the foot of the page, or not earned yet
  landed?: boolean; // it has just been pressed on: it squashes in with a sparkle
  active?: boolean; // on the page that is open. A page out of sight draws its slots as plain pictures
  onTap: () => void;
}

// One place in the sticker book (game feel, phase 7). A sticker pressed on shows in full; the place of a sticker
// still loose glows softly, waiting for it; a sticker not earned yet is a dotted outline. A tap says what it is,
// or what earns it.
export default function StickerSlot({ id, label, sticker, state, landed = false, active = true, onTap }: Props) {
  const earned = state !== 'locked';
  const name = `${label}. ${earned ? 'Earned' : 'Not yet'}`;
  const inside = (
    <>
      <span className={`${styles.sticker} ${landed ? styles.landed : ''}`} aria-hidden="true">
        {state === 'placed' ? <Art emoji={sticker} /> : <Icon name={state === 'loose' ? 'star' : 'question'} />}
      </span>
      <span className={styles.label} aria-hidden="true">
        {label}
      </span>
      {landed && <ParticleBurst kind="sparkle" />}
    </>
  );
  const marks = { 'data-award': id, 'data-earned': earned ? 'yes' : 'no', 'data-placed': state === 'placed' ? 'yes' : 'no' };
  const look = `${styles.slot} ${styles[state]}`;
  if (!active) {
    return (
      <p className={look} aria-label={name} {...marks}>
        {inside}
      </p>
    );
  }
  return (
    <button type="button" className={look} aria-label={name} onClick={onTap} {...marks}>
      {inside}
    </button>
  );
}
