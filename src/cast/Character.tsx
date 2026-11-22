import { useLayoutEffect, useRef, useState } from 'react';
import type { CSSProperties, FunctionComponent } from 'react';
import { PALETTE } from '../visuals/palette';
import styles from './Character.module.css';
import FinnArt from './FinnArt';
import { MOOD_POSES, armAngles, mouthFor } from './moods';
import type { Mood } from './moods';
import OliveArt from './OliveArt';
import PipArt from './PipArt';
import SproutArt from './SproutArt';
import { SHEET_H, SHEET_W } from './types';
import type { ArtProps, Look, MouthShape, Who } from './types';
import { useStill } from './useStill';

// One of the four friends (plan section 19, phase 3), drawn as separate parts that the styles move: it breathes,
// blinks, sways its signature part, and takes the pose of its mood. In Calm mode, or with the device's Reduce
// Motion on, every mood is a still pose and nothing loops.
export interface CharacterProps {
  who: Who;
  mood?: Mood;
  // A point on the screen to look at (as a tap reports it: clientX and clientY). Null or left out: the eyes go
  // where the mood sends them.
  lookAt?: { x: number; y: number } | null;
  // True: the mouth runs its own talk loop. A number from 0 to 1: how open the mouth is right now, for a caller
  // that follows the loudness of the voice (see useLoudness). A mouth shape: the shape the voice is making now, for a
  // caller that follows a recording's timing (see useVoiceMouth); it is drawn as given, in Calm mode too, since the
  // mouth is the one part that moves there. Left out: the mood decides.
  talking?: boolean | number | MouthShape;
  size?: number; // how wide to draw, in screen points. Left out: as wide as the box it is put in
  flip?: boolean; // mirrored, to face (and lean, point and peek) the other way
  label?: string; // a name for screen readers. Left out: the friend is decoration and is hidden from them
  className?: string;
}

const ART: Record<Who, FunctionComponent<ArtProps>> = { sprout: SproutArt, pip: PipArt, olive: OliveArt, finn: FinnArt };
const AHEAD: Look = { x: 0, y: 0 };

export default function Character({ who, mood = 'idle', lookAt = null, talking, size, flip = false, label, className }: CharacterProps) {
  const still = useStill();
  const pose = MOOD_POSES[mood];
  const frame = useRef<SVGSVGElement>(null);
  const [gaze, setGaze] = useState<Look | null>(null);
  const atX = lookAt?.x ?? null;
  const atY = lookAt?.y ?? null;

  // Turn the point on the screen into a direction from the friend's own middle. A point a body's width away or
  // more turns the eyes all the way.
  useLayoutEffect(() => {
    const box = frame.current?.getBoundingClientRect();
    if (atX === null || atY === null || !box) {
      setGaze(null);
      return;
    }
    let x = (atX - (box.left + box.width / 2)) / (box.width || 1);
    let y = (atY - (box.top + box.height / 2)) / (box.height || 1);
    const far = Math.hypot(x, y);
    if (far > 1) {
      x /= far;
      y /= far;
    }
    setGaze({ x: flip ? -x : x, y });
  }, [atX, atY, flip]);

  // The mouth. Talking by itself is a loop the styles run; with movement off it is one open shape, held.
  const says = talking ?? pose.talks;
  const speaking = typeof says === 'number' ? says > 0.08 : says !== false;
  const talkLoop = says === true && !still;
  let mouth: MouthShape = pose.mouth;
  if (typeof says === 'string') mouth = says;
  else if (speaking && still) mouth = 'small';
  else if (speaking && typeof says === 'number') mouth = mouthFor(says);

  const arms = armAngles(who, mood);
  const set = { '--set-arm-left': `${arms.left}deg`, '--set-arm-right': `${arms.right}deg`, ...(size === undefined ? {} : { '--set-size': size }) } as CSSProperties;
  const Art = ART[who];

  return (
    <svg
      ref={frame}
      className={className ? `${styles.character} ${className}` : styles.character}
      viewBox={`0 0 ${SHEET_W} ${SHEET_H}`}
      style={set}
      data-character={who}
      data-mood={mood}
      data-mouth={talkLoop ? 'talking' : mouth}
      data-eyes={pose.eyes}
      data-still={still ? '' : undefined}
      data-sized={size === undefined ? undefined : ''}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      <g transform={flip ? `translate(${SHEET_W} 0) scale(-1 1)` : undefined}>
        <g className={styles.act}>
          <g className={styles.turn}>
            <g className={styles.breath}>
              <Art mouth={mouth} talkLoop={talkLoop} eyes={pose.eyes} look={gaze ?? pose.look ?? AHEAD} />
            </g>
          </g>
        </g>
        {/* asleep: a z floats up beside the head */}
        {mood === 'sleep' && <path className={styles.zed} data-part="z" d="M80 6 h11 l-11 13 h11" fill="none" stroke={PALETTE.ink} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />}
      </g>
    </svg>
  );
}
