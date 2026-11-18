// The words the cast is described in. Every drawing and every mood is written with these.

export const WHO = ['sprout', 'pip', 'olive', 'finn'] as const;
export type Who = (typeof WHO)[number];

// The six mouth shapes. The first four are also the shapes a talking mouth moves through.
export const MOUTHS = ['closed', 'small', 'wide', 'round', 'smile', 'bigSmile'] as const;
export type MouthShape = (typeof MOUTHS)[number];

// Eyes are open (and blink), smiling (two happy arches) or closed (asleep). There is no sad or cross eye.
export type EyeState = 'open' | 'smiling' | 'closed';

// Where the pupils turn: x from -1 (far left) to 1 (far right), y from -1 (up) to 1 (down).
export interface Look {
  x: number;
  y: number;
}

// What each drawing is told, so the four friends move the same way.
export interface ArtProps {
  mouth: MouthShape;
  // True while the mouth runs its own talk loop: the drawing then holds all the talk shapes and the styles
  // show them in turn.
  talkLoop: boolean;
  eyes: EyeState;
  look: Look;
}

// Every drawing is made on the same sheet, 100 wide and 120 tall, feet on the bottom edge. It is the sheet the
// lesson stage already sizes its host by.
export const SHEET_W = 100;
export const SHEET_H = 120;

// The point a part turns about, given in sheet units and handed to the styles as a share of the sheet.
export function pivot(x: number, y: number): { transformOrigin: string } {
  return { transformOrigin: `${(x / SHEET_W) * 100}% ${(y / SHEET_H) * 100}%` };
}
