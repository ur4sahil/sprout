import type { Question, Say, Visual } from '../engine/types';

// A lesson that teaches (plan section 16): moments of speech over a moving scene, and turns the child answers.

// What a piece on the stage looks like.
export type PieceLook =
  | { kind: 'art'; emoji: string } // one of the app's drawn pictures
  | { kind: 'numeral'; value: number }
  | { kind: 'text'; text: string } // a letter, a word, a sign such as + or =
  | { kind: 'cell' } // one empty square of a ten-frame
  | { kind: 'rod' } // a ten: a stick of ten small squares
  | { kind: 'cube' } // a one
  | { kind: 'box' } // an empty answer box
  | { kind: 'panel' } // a light box behind a few pieces that belong together, such as one number pair
  | { kind: 'hand' } // a pointing hand
  // Any picture a question can show (a clock, a coin, a shape, a solid, a bar ...), drawn as the questions draw it.
  | { kind: 'visual'; visual: Visual };

// One piece. Its place and size are in stage squares (the stage is `cols` by `rows` squares).
// A piece keeps its id from moment to moment, so the player moves it rather than redrawing it.
export interface Piece {
  id: string;
  look: PieceLook;
  x: number; // left edge
  y: number; // top edge
  w?: number; // width, 1 when left out
  h?: number; // height, 1 when left out
  lit?: boolean; // picked out: a ring and a little larger
  dim?: boolean; // faded back
  gone?: boolean; // shrunk away (it fades out, or in the moment it comes back)
  crossed?: boolean; // crossed out, for taking away
  badge?: string; // a small label above it, such as the count so far
}

// A drawn place behind the pieces. Each has a calm surface three rows from the bottom where pieces sit (row 3 of
// a 6-row stage): 'table' is a wall and a table; the rest are the places for each topic (lessons 2.0).
export type BackdropName = 'table' | 'picnic' | 'stall' | 'workshop' | 'site' | 'shop' | 'treehouse' | 'nook' | 'pond';

export interface Scene {
  cols: number;
  rows: number;
  pieces: Piece[];
  backdrop?: BackdropName;
}

// One spoken sentence and the scene while it is said.
export interface Moment {
  say: Say;
  text: string; // the words under the stage
  scene: Scene;
}

// A question the child answers inside the lesson. `why` replays the idea on this question after a miss.
export interface Turn {
  question: Question;
  why: Moment[];
}

export type LessonPart = { kind: 'show'; moment: Moment } | { kind: 'turn'; turn: Turn };

export interface Lesson {
  parts: LessonPart[];
  // 'rich': the host stands beside the stage, pieces land with a bounce, and a right turn ends in confetti.
  look?: 'plain' | 'rich';
}
