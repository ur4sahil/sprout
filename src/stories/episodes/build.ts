import type { Mood } from '../../cast/moods';
import type { Who } from '../../cast/types';
import type { Say } from '../../engine/types';
import type { Across, Backdrop, CastSpot, Depth, Page, Prop, Scene, StoryOption, StoryQuestion } from '../types';
import { storyText } from '../words';

// Small helpers so an episode reads almost like the book itself.
//
// A line is written as plain words with typed parts in square brackets:
//   [8]   the number eight, shown as 8
//   [c]   the letter C (a single small letter), shown as C
//   [@3]  the time three o'clock, shown as 3 o'clock
// So "She picked [8] berries." becomes ['She picked ', { number: 8 }, ' berries.']: speech never holds a digit.

export function line(written: string): Say {
  const say: Say = [];
  for (const [i, bit] of written.split(/\[(@?\d+|[a-z])\]/).entries()) {
    if (i % 2 === 0) {
      if (bit.length > 0) say.push(bit);
    } else if (bit.startsWith('@')) {
      say.push({ time: { hour: Number(bit.slice(1)), minute: 0 } });
    } else if (/^\d+$/.test(bit)) {
      say.push({ number: Number(bit) });
    } else {
      say.push({ letter: bit });
    }
  }
  return say;
}

export function friend(who: Who, mood: Mood, at: Across, depth: Depth = 'near'): CastSpot {
  return { who, mood, at, depth };
}

// A picture, or a row of the same picture `count` times, or a row of different pictures.
export function prop(pictures: string | string[], at: Across, depth: Prop['depth'], size: Prop['size'] = 'm', count = 1): Prop {
  return { pictures: typeof pictures === 'string' ? Array.from({ length: count }, () => pictures) : pictures, at, depth, size };
}

export function scene(backdrop: Backdrop, cast: CastSpot[], props: Prop[] = [], extra: Pick<Scene, 'sign' | 'picture'> = {}): Scene {
  return { backdrop, cast, props, ...extra };
}

export function page(written: string, where: Scene): Page {
  const say = line(written);
  return { text: storyText(say), say, scene: where };
}

export function option(written: string, picture?: string): StoryOption {
  const say = line(written);
  return { say, text: storyText(say), ...(picture ? { picture } : {}) };
}

export function question(written: string, options: StoryOption[], answer: number, reply: string): StoryQuestion {
  const say = line(written);
  const replySay = line(reply);
  return { say, text: storyText(say), options, answer, reply: replySay, replyText: storyText(replySay) };
}
