// The recording playing now, so a friend's mouth can follow it (plan section 20, phase 2). clips.ts marks a
// recording as it starts and as it ends; voice.ts knows what was said in it (its timing).

export interface PlayingRecording {
  bytes: ArrayBuffer; // as it was handed over to play
  clock: { readonly currentTime: number }; // the audio clock it plays by, in seconds
  startedAt: number; // on that clock
  speed: number; // 1 is as recorded
}

let playing: PlayingRecording | null = null;

// Marks a recording as playing. Gives back how to mark it over, which does nothing once another one has started.
export function startPlaying(recording: PlayingRecording): () => void {
  playing = recording;
  return () => {
    if (playing === recording) playing = null;
  };
}

export function stopPlaying(): void {
  playing = null;
}

// The recording playing now and how far into it the sound is, in seconds of the recording (a faster speed gets
// further in the same time). Null when nothing is playing.
export function playingClip(): { bytes: ArrayBuffer; at: number } | null {
  if (!playing) return null;
  return { bytes: playing.bytes, at: Math.max(0, (playing.clock.currentTime - playing.startedAt) * playing.speed) };
}
