import { useEffect, useRef } from 'react';
import { playSound } from '../audio/sounds';
import { currentWorld } from '../worlds';
import styles from './FlyStar.module.css';

// A star that lifts off a right answer and flies in an arc to the Skill Score, which pulses as it lands (plan
// section 19, phase 2). It finds the score on the page by its mark. With no score on screen, in Calm mode, with
// Reduce Motion on, or where the browser cannot animate, nothing flies.
export default function FlyStar({ to = '[data-score]' }: { to?: string }) {
  const star = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = star.current;
    const target = document.querySelector(to);
    if (!el || !target || typeof el.animate !== 'function') return;
    if (document.documentElement.dataset.calm !== undefined) return;
    if (typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const from = el.getBoundingClientRect();
    const end = target.getBoundingClientRect();
    const dx = end.left + end.width / 2 - (from.left + from.width / 2);
    const dy = end.top + end.height / 2 - (from.top + from.height / 2);
    // An arc: up and out first, then down into the score.
    const lift = Math.min(-60, dy / 2 - 80);
    const flight = el.animate(
      [
        { transform: 'translate(0, 0) scale(0.4)', opacity: 0 },
        { transform: `translate(${dx * 0.15}px, ${lift * 0.6}px) scale(1.3)`, opacity: 1, offset: 0.2 },
        { transform: `translate(${dx * 0.6}px, ${dy * 0.4 + lift}px) scale(1.1)`, opacity: 1, offset: 0.6 },
        { transform: `translate(${dx}px, ${dy}px) scale(0.5)`, opacity: 0.9 },
      ],
      { duration: 700, delay: 250, easing: 'cubic-bezier(0.3, 0, 0.4, 1)', fill: 'both' },
    );
    flight.onfinish = () => {
      el.style.visibility = 'hidden';
      playSound(currentWorld().sounds.star);
      if (typeof (target as HTMLElement).animate === 'function') {
        (target as HTMLElement).animate([{ transform: 'scale(1)' }, { transform: 'scale(1.14)' }, { transform: 'scale(1)' }], { duration: 320, easing: 'ease-out' });
      }
    };
    return () => flight.cancel();
  }, [to]);

  return (
    <span ref={star} className={styles.star} aria-hidden="true" data-fly-star="">
      ★
    </span>
  );
}
