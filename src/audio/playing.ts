// The recording playing now, so a friend's mouth can follow it (plan section 20, phase 2). clips.ts marks a
// recording as it starts and as it ends; voice.ts knows what was said in it (its timing). speech.ts marks the
// device's own voice while it speaks, which the app cannot measure: the friend's mouth then runs its talk loop.

export interface PlayingRecording {
  bytes: ArrayBuffer; // as it was handed over to play
  clock: { readonly currentTime: number }; // the audio clock it plays by, in seconds
  startedAt: number; // on that clock
  speed: number; // 1 is as recorded
  node?: AudioNode; // the sound as it plays, so its loudness can be measured when it came without a timing
}

let playing: PlayingRecording | null = null;
let device = false;
const listeners = new Set<() => void>();

function changed(): void {
  for (const listener of listeners) listener();
}

// Marks a recording as playing. Gives back how to mark it over, which does nothing once another one has started.
export function startPlaying(recording: PlayingRecording): () => void {
  playing = recording;
  changed();
  return () => {
    if (playing !== recording) return;
    playing = null;
    changed();
  };
}

export function stopPlaying(): void {
  if (playing === null) return;
  playing = null;
  changed();
}

// The recording playing now, or null.
export function playingRecording(): PlayingRecording | null {
  return playing;
}

// True while the device's own voice is saying something.
export function setDeviceTalking(value: boolean): void {
  if (value === device) return;
  device = value;
  changed();
}

export function deviceTalking(): boolean {
  return device;
}

// Calls `listener` whenever a recording starts or stops, or the device's voice starts or stops. Returns how to stop
// listening.
export function onPlayingChange(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

// The recording playing now and how far into it the sound is, in seconds of the recording (a faster speed gets
// further in the same time). Null when nothing is playing.
export function playingClip(): { bytes: ArrayBuffer; at: number } | null {
  if (!playing) return null;
  return { bytes: playing.bytes, at: recordingAt(playing) };
}

// How far into a recording the sound is, in seconds of the recording.
export function recordingAt(recording: PlayingRecording): number {
  return Math.max(0, (recording.clock.currentTime - recording.startedAt) * recording.speed);
}
