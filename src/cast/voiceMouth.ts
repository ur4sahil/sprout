import type { SpokenTiming } from '../audio/voice';
import { shapeAt } from '../audio/voice';
import type { MouthShape } from './types';

// What a friend's mouth does while a voice speaks (plan section 20, phase 2), as `<Character talking={...} />`
// takes it. Kept apart from the hook so the rule is tested on its own.
export type Talking = boolean | number | MouthShape;

export interface VoiceNow {
  mine: boolean; // the friend's own voice is speaking
  // The recording playing now: its timing (null when it came without one, such as a letter sound) and how far in
  // the voice is, in seconds of the recording. Null while no recording plays.
  recording: { timing: SpokenTiming | null; at: number } | null;
  loudness: number | boolean; // what useLoudness measures of the recording playing now
  device: boolean; // the device's own voice is speaking
}

// The mouth for this moment: the timing's shape when the recording has one; else the loudness (or the talk loop
// where it cannot be measured); the talk loop for the device's voice; and left to the mood (undefined) when the
// voice is not the friend's, or nothing can be heard yet (the recording is still on its way).
export function mouthNow(now: VoiceNow): Talking | undefined {
  if (!now.mine) return undefined;
  if (now.recording) {
    if (now.recording.timing) return shapeAt(now.recording.timing, now.recording.at);
    return now.loudness === false ? true : now.loudness;
  }
  return now.device ? true : undefined;
}
