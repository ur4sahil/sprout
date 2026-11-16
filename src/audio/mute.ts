// One mute setting covers the voice and the sound effects. The app keeps it in the device record.
let muted = false;

export function isMuted(): boolean {
  return muted;
}

export function setMuted(value: boolean): void {
  muted = value;
}
