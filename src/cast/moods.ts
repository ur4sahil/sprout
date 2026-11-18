import type { EyeState, Look, MouthShape, Who } from './types';

// The moods a friend can be in, and what each one means. A mood is a still pose first (so Calm mode and Reduce
// Motion always have something to show) and a movement second, added by the styles.
// There is no sad, cross or let-down mood, and there never will be: a miss is never a loss.

export const MOODS = ['idle', 'greet', 'talk', 'listen', 'think', 'point', 'cheer', 'cheerBig', 'encourage', 'sleep', 'peek'] as const;
export type Mood = (typeof MOODS)[number];

// How an arm is held. A number is how far it is raised out to the side, in degrees: 0 hangs straight down,
// 90 is straight out, 180 is straight up, and a small minus number tucks it in against the body.
export type ArmPose = 'rest' | 'chin' | number;

export interface MoodPose {
  means: string; // what the mood is for, in plain words
  mouth: MouthShape; // the mouth when not talking
  eyes: EyeState;
  look: Look | null; // where the eyes go when the caller gives nothing to look at. Null: straight ahead
  left: ArmPose; // the arm on the left of the picture
  right: ArmPose;
  talks: boolean; // the mouth moves by itself in this mood unless the caller says otherwise
}

export const MOOD_POSES: Record<Mood, MoodPose> = {
  idle: { means: 'Standing by, happy to be here.', mouth: 'smile', eyes: 'open', look: null, left: 'rest', right: 'rest', talks: false },
  greet: { means: 'Hops in from the side and waves hello.', mouth: 'bigSmile', eyes: 'open', look: null, left: 'rest', right: 150, talks: false },
  talk: { means: 'Saying something, with a small move of one hand.', mouth: 'smile', eyes: 'open', look: null, left: 'rest', right: 45, talks: true },
  listen: { means: 'Leans in and waits for the child, in no hurry.', mouth: 'smile', eyes: 'open', look: { x: 0.5, y: 0 }, left: 'rest', right: 'rest', talks: false },
  think: { means: 'Working something out: a hand to the chin and eyes up.', mouth: 'small', eyes: 'open', look: { x: -0.5, y: -0.9 }, left: 'rest', right: 'chin', talks: false },
  point: { means: 'Points to the side, at the thing that matters now.', mouth: 'smile', eyes: 'open', look: { x: 0.9, y: -0.1 }, left: 'rest', right: 100, talks: false },
  cheer: { means: 'A quick hop for a right answer, eyes smiling.', mouth: 'bigSmile', eyes: 'smiling', look: null, left: 150, right: 150, talks: false },
  cheerBig: { means: 'A big jump and a spin, arms up, for a big moment.', mouth: 'bigSmile', eyes: 'smiling', look: null, left: 165, right: 165, talks: false },
  encourage: { means: 'After a miss: a soft smile and open hands. Try again, no harm done.', mouth: 'smile', eyes: 'open', look: null, left: 60, right: 60, talks: false },
  sleep: { means: 'Curled up asleep at night, with a floating z.', mouth: 'closed', eyes: 'closed', look: null, left: -10, right: -10, talks: false },
  peek: { means: 'Leans in from the edge of its box to see what is going on.', mouth: 'smile', eyes: 'open', look: { x: 0.8, y: 0 }, left: 'rest', right: 30, talks: false },
};

// How each friend's arms sit: `rest` is how far they hang out from the body, and `chin` is how far the right
// arm swings across the front to bring the hand to the chin. Each body is a different shape, so each has its own.
export const ARMS: Record<Who, { rest: number; chin: number }> = {
  sprout: { rest: 18, chin: 58 },
  pip: { rest: 16, chin: 126 },
  olive: { rest: 10, chin: 62 },
  finn: { rest: 5, chin: 118 },
};

// The turn of each arm for a mood, in degrees as the drawing uses them (clockwise is positive). An arm is drawn
// hanging straight down, so the left arm rises by turning clockwise and the right arm by turning the other way.
export function armAngles(who: Who, mood: Mood): { left: number; right: number } {
  const pose = MOOD_POSES[mood];
  const arms = ARMS[who];
  const raise = (arm: ArmPose): number => (arm === 'rest' ? arms.rest : arm === 'chin' ? -arms.chin : arm);
  return { left: raise(pose.left), right: -raise(pose.right) };
}

// The mouth shape for how open the mouth is, from 0 (shut) to 1 (wide open). Used when a caller drives the
// mouth from how loud the voice is.
export function mouthFor(openness: number): MouthShape {
  if (!(openness > 0.08)) return 'closed';
  if (openness < 0.3) return 'small';
  if (openness < 0.65) return 'round';
  return 'wide';
}
