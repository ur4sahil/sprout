import type { Mood } from '../cast/moods';
import type { Who } from '../cast/types';
import type { Say, Visual } from '../engine/types';

// "The Garden Year" (game feel, phase 7): short picture-book episodes read by Olive.
// An episode is plain data, so the reader only draws it and the tests can check every rule.

export const SEASONS = ['spring', 'summer', 'autumn', 'winter'] as const;
export type Season = (typeof SEASONS)[number];

// The places a story can happen. Each is drawn by StoryBackdrop.
export const BACKDROPS = ['garden', 'meadow', 'woods', 'pond', 'treehouse', 'nightGarden'] as const;
export type Backdrop = (typeof BACKDROPS)[number];

// Where something stands in a scene: across (left, middle, right) and how far back (near is big and low,
// far is smaller and higher up). Props can also hang in the sky.
export type Across = 'left' | 'middle' | 'right';
export type Depth = 'near' | 'far';

export interface CastSpot {
  who: Who;
  mood: Mood;
  at: Across;
  depth: Depth;
}

export interface Prop {
  // One or more pictures from the app's art set (by emoji), drawn side by side: one berry, or a row of berries,
  // or a pattern of flowers.
  pictures: string[];
  at: Across;
  depth: Depth | 'sky';
  size: 's' | 'm' | 'l';
}

// A wooden sign with words a child can read.
export interface Sign {
  words: string; // plain words, no digits or signs
  at: Across;
}

// A drawn picture from the question pictures: a clock face or a flat shape.
export interface SceneVisual {
  visual: Extract<Visual, { kind: 'clock' } | { kind: 'shape' }>;
  at: Across;
}

export interface Scene {
  backdrop: Backdrop;
  cast: CastSpot[];
  props: Prop[]; // at most four
  sign?: Sign;
  picture?: SceneVisual;
}

export interface Page {
  text: string; // what the page shows: one or two short sentences (made from `say`, so the two always agree)
  say: Say; // what Olive reads
  scene: Scene;
}

// An answer to the closing question: a picture with a word under it, or words alone.
export interface StoryOption {
  say: Say;
  text: string; // the words shown on the option (made from `say`)
  picture?: string; // an emoji from the art set
}

// One question at the end of every episode. It is never scored: any answer gets a warm reply.
export interface StoryQuestion {
  say: Say;
  text: string;
  options: StoryOption[]; // two or three
  answer: number; // the option the story states
  reply: Say; // the story's answer, said after any choice
  replyText: string;
}

export interface Episode {
  id: string; // saved when finished: never a position in the list
  number: number;
  title: string;
  season: Season;
  cover: string; // an emoji from the art set, drawn on the story book's cover
  pages: Page[]; // six to eight
  question: StoryQuestion;
}
