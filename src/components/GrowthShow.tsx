import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { playSound } from '../audio/sounds';
import { Character } from '../cast';
import type { Mood, Who } from '../cast';
import { isStill } from '../cast/useStill';
import type { PlantHandle } from '../garden/Plant';
import Plant from '../garden/Plant';
import { currentWorld } from '../worlds';
import type { FlowerKind, GrowthStage } from '../worlds/types';
import styles from './GrowthShow.module.css';
import Icon from './Icon';
import ParticleBurst from './ParticleBurst';

// The growth show (game feel, phase 5): at the end of a practice sitting, the skill's plant as it was when the
// sitting began, water and light falling on it, then it grows to its stage now (or gives a happy rustle when the
// stage did not change). Three facts appear one by one, then the card's buttons. About three seconds; a tap skips
// to the end. At 100 petals fly and the friend does its big cheer. In Calm mode, with Reduce Motion on, nothing
// moves: the plant stands at its stage now and the facts and buttons are there at once.

export interface GrowthInfo {
  who: Who; // the subject's friend
  kind: FlowerKind; // the skill's flower
  from: GrowthStage; // as the sitting began
  to: GrowthStage; // now
  right: number; // right answers this sitting
  score: number; // the Skill Score now
  sunny: readonly boolean[] | null; // this week's sunny days, Monday first. Null while they are being counted
}

// How long the whole show runs. Unit tests run it at once (they tap the card's buttons straight away), unless a
// test sets a length.
export const GROWTH_SHOW = { ms: import.meta.env.MODE === 'test' ? 0 : 2900 };
export function setGrowthShowForTests(ms: number): void {
  GROWTH_SHOW.ms = ms;
}

// Where in the show each step starts, as a share of its length: the water falls (0), the plant grows (1), the
// three facts appear (2, 3, 4), the buttons come (5).
const STEP_AT = [0, 0.28, 0.5, 0.64, 0.78, 1] as const;
export const SHOW_DONE = 5;

const on = (shown: boolean): '' | undefined => (shown ? '' : undefined);

interface Props {
  info: GrowthInfo;
  bloom: boolean; // the skill has just reached 100
  head: ReactNode; // the card's title and words, under the plant
  children: ReactNode; // the card's buttons, shown when the show is over
}

export default function GrowthShow({ info, bloom, head, children }: Props) {
  const [quick] = useState(() => GROWTH_SHOW.ms <= 0 || isStill());
  const [step, setStep] = useState(quick ? SHOW_DONE : 0);
  const plant = useRef<PlantHandle>(null);
  const grown = step >= 1;
  const sounds = currentWorld().sounds;

  // The steps, on a timer. A tap that skips to the end leaves the later timers nothing to do.
  useEffect(() => {
    if (quick) return;
    const total = GROWTH_SHOW.ms;
    playSound(sounds.drop);
    const timers = STEP_AT.slice(1).map((share, i) => setTimeout(() => setStep((now) => Math.max(now, i + 1)), share * total));
    return () => timers.forEach(clearTimeout);
  }, [quick, sounds]);

  // The plant grows (or rustles) as the water lands.
  useEffect(() => {
    if (!grown || quick) return;
    plant.current?.growTo(info.to);
    playSound(info.to > info.from ? sounds.star : 'pop');
  }, [grown, quick, info.to, info.from, sounds]);

  const mood: Mood = grown ? (bloom ? 'cheerBig' : 'cheer') : 'idle';
  const thisWeek = info.sunny?.filter(Boolean).length ?? 0;
  const skip = (): void => setStep(SHOW_DONE);

  return (
    <div className={styles.show} data-growth-show="" data-step={step} onClick={step < SHOW_DONE ? skip : undefined}>
      <div className={styles.stage}>
        <div className={`${styles.plant} ${grown && !quick && info.to === info.from ? styles.rustle : ''}`} data-growth-plant="" data-from={info.from} data-to={info.to}>
          <Plant ref={plant} stage={quick ? info.to : info.from} kind={info.kind} />
        </div>
        <div className={styles.friend}>
          <Character who={info.who} mood={mood} />
        </div>
        {!quick && step === 0 && <ParticleBurst kind="drop" seed={3} at={{ x: 0.35, y: 0.35 }} />}
        {!quick && step === 0 && <ParticleBurst kind="sparkle" seed={5} at={{ x: 0.35, y: 0.2 }} />}
        {!quick && bloom && grown && <ParticleBurst kind="petal" seed={7} at={{ x: 0.35, y: 0.3 }} />}
      </div>
      {head}
      <ul className={styles.facts}>
        <li className={styles.fact} data-fact="right" data-on={on(step >= 2)}>
          <Icon name="check" />
          <strong className={styles.number}>{info.right}</strong> right
        </li>
        <li className={styles.fact} data-fact="score" data-on={on(step >= 3)}>
          <Icon name="star" />
          Skill Score <strong className={styles.number}>{info.score}</strong>
        </li>
        <li className={styles.fact} data-fact="sunny" data-on={on(step >= 4 && info.sunny !== null)}>
          <svg className={styles.suns} viewBox="0 0 70 10" aria-hidden="true">
            {(info.sunny ?? []).map((lit, day) => (
              <circle key={day} className={styles.sun} cx={5 + day * 10} cy="5" r="4" data-lit={on(lit)} />
            ))}
          </svg>
          <strong className={styles.number}>{thisWeek}</strong> sunny {thisWeek === 1 ? 'day' : 'days'} this week
        </li>
      </ul>
      {step >= SHOW_DONE && children}
    </div>
  );
}
