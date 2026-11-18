import { useRef, useState } from 'react';
import { playSound } from '../audio/sounds';
import Art from '../visuals/Art';
import { currentWorld } from '../worlds';
import styles from './LooseSticker.module.css';

interface Props {
  id: string; // the award's id: it flies to the place marked `data-award` with this id
  label: string;
  sticker: string;
  onPlaced: () => void; // it has landed (at once, when nothing can fly)
}

// How long the peel and the flight take. Kept beside --sticker-fly in tokens.css, which the slot's style uses.
const FLY_MS = 760;

function still(): boolean {
  if (document.documentElement.dataset.calm !== undefined) return true;
  return typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

// A sticker the child has earned but not pressed on yet, lying at the foot of its page with one corner curled.
// A tap peels it off (it lifts and tilts), and it flies in an arc to its place on the page. In Calm mode, with
// Reduce Motion, or where the browser cannot animate, it goes straight to its place.
export default function LooseSticker({ id, label, sticker, onPlaced }: Props) {
  const button = useRef<HTMLButtonElement>(null);
  const [flying, setFlying] = useState(false);

  const press = (): void => {
    if (flying) return;
    const el = button.current;
    const target = document.querySelector(`[data-award="${id}"]`);
    if (!el || !target || typeof el.animate !== 'function' || still()) {
      onPlaced();
      return;
    }
    setFlying(true);
    playSound(currentWorld().sounds.pick);
    const from = el.getBoundingClientRect();
    const end = target.getBoundingClientRect();
    const dx = end.left + end.width / 2 - (from.left + from.width / 2);
    const dy = end.top + end.height / 2 - (from.top + from.height / 2);
    const lift = Math.min(-40, dy / 3 - 40);
    const flight = el.animate(
      [
        { transform: 'translate(0, 0) rotate(0) scale(1)' },
        { transform: 'translate(0, -8%) rotate(-12deg) scale(1.08)', offset: 0.22 },
        { transform: `translate(${dx * 0.5}px, ${dy * 0.5 + lift}px) rotate(8deg) scale(1.15)`, offset: 0.6 },
        { transform: `translate(${dx}px, ${dy}px) rotate(0) scale(1)` },
      ],
      { duration: FLY_MS, easing: 'cubic-bezier(0.3, 0, 0.3, 1)', fill: 'forwards' },
    );
    flight.onfinish = () => onPlaced();
  };

  return (
    <button ref={button} type="button" className={`${styles.loose} ${flying ? styles.flying : ''}`} aria-label={`${label}. Press it on`} onClick={press} data-loose={id}>
      <span className={styles.picture} aria-hidden="true">
        <Art emoji={sticker} />
      </span>
    </button>
  );
}
