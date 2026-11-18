// The one WebAudio context every sound uses.

type AudioContextClass = typeof AudioContext;

let context: AudioContext | null = null;

function contextClass(): AudioContextClass | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as { AudioContext?: AudioContextClass; webkitAudioContext?: AudioContextClass };
  return w.AudioContext ?? w.webkitAudioContext ?? null;
}

// The shared audio context, or null where WebAudio does not exist. Never throws.
export function audioContext(): AudioContext | null {
  if (context) return context;
  const Class = contextClass();
  if (!Class) return null;
  try {
    context = new Class();
  } catch {
    context = null;
  }
  return context;
}

// Must be called inside a tap, or sound stays silent on an iPad. The profile tap does this.
export async function unlockAudio(): Promise<void> {
  const ctx = audioContext();
  if (!ctx || ctx.state !== 'suspended') return;
  try {
    await ctx.resume();
  } catch {
    // Sound effects stay off. The app carries on.
  }
}

// For tests.
export function resetAudioContext(): void {
  context = null;
}
