import { logError } from '../lib/errorLog';
import { openRepo } from '../storage/index';
import { audioContext } from './sfx';

// Plays the recorded voice. The old voice pack (letter names, numbers and praise made on a Mac in its
// Samantha voice) is gone (the owner's choice, Nov 17, 2026): everything is said in the recorded voice.

// Plays audio the app was just handed (a recorded sentence). `speed` 1 is as recorded.
// Resolves true when it has finished, false if it could not play.
export async function playBytes(bytes: ArrayBuffer, speed = 1): Promise<boolean> {
  const ctx = audioContext();
  if (!ctx) return false;
  try {
    const buffer = await ctx.decodeAudioData(bytes.slice(0));
    return await new Promise<boolean>((resolve) => {
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.playbackRate.value = speed;
      source.connect(ctx.destination);
      const giveUp = setTimeout(() => resolve(false), Math.ceil((buffer.duration / speed) * 1000) + 1500);
      source.onended = () => {
        clearTimeout(giveUp);
        resolve(true);
      };
      active = source;
      source.start();
    });
  } catch (error) {
    logError(error);
    return false;
  }
}

let active: AudioBufferSourceNode | null = null;

export function stopClip(): void {
  try {
    active?.stop();
  } catch {
    // It had already finished.
  }
  active = null;
}

// The old voice pack's clips are no longer used. Removes any this device still holds, to free the space.
export async function removeOldClips(): Promise<void> {
  try {
    const { repo } = await openRepo();
    for (const key of await repo.listClipKeys()) await repo.deleteClip(key);
  } catch (error) {
    logError(error);
  }
}

// For tests.
export function resetClips(): void {
  active = null;
}
