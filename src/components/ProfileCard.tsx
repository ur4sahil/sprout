import type { CSSProperties } from 'react';
import { useId } from 'react';
import type { ProfilePlant } from '../app/profileGarden';
import type { SunnyDays } from '../app/sunnyDays';
import Plant from '../garden/Plant';
import { lightAt } from '../garden/layout';
import { now } from '../lib/clock';
import Art from '../visuals/Art';
import { PALETTE } from '../visuals/palette';
import { plantKindFor } from './plantKind';
import styles from './ProfileCard.module.css';
import SunnyWeek from './SunnyWeek';

interface Props {
  name: string;
  avatar: string;
  grade: string; // "Grade 1"
  done: number; // questions answered today
  goal: number; // the daily goal
  plants?: readonly ProfilePlant[]; // a few of the child's own plants, for the little garden behind them
  sunny?: SunnyDays | null; // this week's suns; left out while they are being counted
  flying?: boolean; // this child was just picked: the card grows toward the screen as their home arrives
  onClick: () => void;
}

const C = PALETTE.garden;
// Where each plant stands across the little garden, as a share of its width: the first two either side of the
// child, the next two at the edges, so the child stands in front with their garden around them.
const SLOTS = [24, 76, 8, 92];

// One child on the profile page: their avatar standing in front of a small picture of their own garden, their
// name and grade, this week's suns, and how far along today's plan is.
// A screen reader says the name as the button, then the grade and the progress as its description.
export default function ProfileCard({ name, avatar, grade, done, goal, plants = [], sunny = null, flying = false, onClick }: Props) {
  const about = useId();
  const sky = useId();
  const reached = done >= goal;
  const share = Math.round((Math.min(done, goal) / Math.max(goal, 1)) * 100);
  const [top, bottom] = C.sky[lightAt(now())];
  return (
    <button type="button" className={styles.card} aria-label={name} aria-describedby={about} data-profile={name} data-flying={flying ? '' : undefined} onClick={onClick}>
      <span className={styles.scene} aria-hidden="true" data-profile-garden={plants.length}>
        <svg className={styles.land} viewBox="0 0 100 60" preserveAspectRatio="none">
          <defs>
            <linearGradient id={sky} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor={top} />
              <stop offset="1" stopColor={bottom} />
            </linearGradient>
          </defs>
          <rect width="100" height="60" fill={`url(#${sky})`} />
          <path d="M0 40 Q 22 30, 46 38 T 100 34 L 100 60 L 0 60 Z" fill={C.hillFar} />
          <path d="M0 47 Q 50 42, 100 47 L 100 60 L 0 60 Z" fill={C.grass} />
          <path d="M0 54 Q 50 51, 100 54 L 100 60 L 0 60 Z" fill={C.grassFront} />
        </svg>
        {plants.map((plant, i) => {
          const kind = plantKindFor({ id: plant.skillId, subject: plant.subject });
          if (!kind) return null;
          return (
            <span key={plant.skillId} className={styles.plant} style={{ '--set-x': SLOTS[i % SLOTS.length] } as CSSProperties} data-profile-plant={plant.skillId}>
              <Plant stage={plant.stage} kind={kind} swayShift={(i * 0.37) % 1} visitor={i % 2 === 0 ? 'butterfly' : 'bee'} />
            </span>
          );
        })}
        <span className={styles.avatar}>
          <Art emoji={avatar} />
        </span>
      </span>
      <span className={styles.name} aria-hidden="true">
        {name}
      </span>
      <span className={styles.grade} aria-hidden="true">
        {grade}
      </span>
      <span className={styles.track} aria-hidden="true">
        <span className={styles.fill} data-reached={reached ? '' : undefined} style={{ inlineSize: `${share}%` }} />
      </span>
      <span className={styles.today} aria-hidden="true" data-today={done}>
        {reached ? `🎉 ${done} today` : `${done} of ${goal} today`}
      </span>
      {/* This week's suns, last, so the progress line above stays the card's first data-today. */}
      {sunny && (
        <span className={styles.suns} aria-hidden="true">
          <SunnyWeek week={sunny.week} today={sunny.today} total={sunny.total} small />
        </span>
      )}
      <span id={about} className={styles.hidden}>
        {grade}. {reached ? `Daily goal reached: ${done} questions today.` : `${done} of ${goal} questions today.`}
      </span>
    </button>
  );
}
