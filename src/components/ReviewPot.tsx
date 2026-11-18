import { useEffect, useState } from 'react';
import { playSound } from '../audio/sounds';
import Plant from '../garden/Plant';
import { currentWorld } from '../worlds';
import type { FlowerKind, GrowthStage } from '../worlds/types';
import ParticleBurst from './ParticleBurst';
import styles from './ReviewPot.module.css';

interface Props {
  kind: FlowerKind;
  stage: GrowthStage;
  watered: number; // right answers so far for this skill: each one pours a little water
  done: boolean; // its three questions are answered: it stands tall
  current: boolean; // its questions are the ones being asked now
  label: string; // the skill's name, for screen readers
}

// A skill under review, as its plant in a clay pot (game feel, phase 5). It waits a little droopy; each right
// answer pours some water on it, and once its three questions are done it stands tall. A miss never harms it:
// it just gets no water that time.
export default function ReviewPot({ kind, stage, watered, done, current, label }: Props) {
  // Water is poured when the count goes up, never for the count the pot opened with.
  const [seen, setSeen] = useState(watered);
  const [pours, setPours] = useState(0);
  if (seen !== watered) {
    setSeen(watered);
    if (watered > seen) setPours((n) => n + 1);
  }
  useEffect(() => {
    if (pours > 0) playSound(currentWorld().sounds.drop);
  }, [pours]);

  return (
    <li className={styles.pot} data-review-pot="" data-current={current ? '' : undefined} data-done={done ? '' : undefined} data-watered={watered} aria-label={`${label}${done ? ': done' : ''}`}>
      <div className={styles.plant}>
        <Plant stage={stage} kind={kind} droop={!done} />
      </div>
      <svg className={styles.clay} viewBox="0 0 40 20" aria-hidden="true">
        <path className={styles.body} d="M6 5 L 34 5 L 30 20 L 10 20 Z" />
        <rect className={styles.rim} x="3" y="0" width="34" height="6" rx="2" />
      </svg>
      {pours > 0 && <ParticleBurst key={pours} kind="drop" seed={pours} at={{ x: 0.5, y: 0.15 }} />}
    </li>
  );
}
