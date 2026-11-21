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

// Must be called inside a tap, or sound stays silent on an iPad. An iPad stops the context again when the
// screen locks, the app goes to the background or a call comes in ("suspended", or Safari's own
// "interrupted"), so any state but running is resumed. `wakeAudioOnTaps` calls this on every tap.
export async function unlockAudio(): Promise<void> {
  const ctx = audioContext();
  if (!ctx || (ctx.state as string) === 'running' || ctx.state === 'closed') return;
  try {
    await ctx.resume();
  } catch {
    // Sound effects stay off. The app carries on.
  }
}

// The device's own voice (the stand-in when a recording cannot come) also needs its first word inside a tap
// on an iPad. A silent, empty word is said once, on the first tap.
let speechPrimed = false;
function primeSpeech(): void {
  if (speechPrimed || typeof window === 'undefined' || !('speechSynthesis' in window) || typeof SpeechSynthesisUtterance === 'undefined') return;
  speechPrimed = true;
  try {
    const word = new SpeechSynthesisUtterance('');
    word.volume = 0;
    window.speechSynthesis.speak(word);
  } catch {
    // The device voice stays as it is.
  }
}

// Tells the iPad that Sprout plays sound the child is meant to hear, so the silent switch and the Control
// Centre's silent mode do not mute it (Safari 17 and later; elsewhere there is no such setting).
function playAsMedia(): void {
  const session = (navigator as unknown as { audioSession?: { type: string } }).audioSession;
  if (!session) return;
  try {
    session.type = 'playback';
  } catch {
    // Left as the device chose.
  }
}

const TAP_EVENTS = ['pointerdown', 'touchend', 'keydown'] as const;
let waking: (() => void) | null = null;

// Wakes the sound on every tap anywhere in the app, so sound comes back by itself after the iPad sleeps
// or the app is left, without a trip to the start screen. Listens in the capture phase, so no screen can
// stop it. Safe to call more than once. Returns a function that stops listening (for tests).
export function wakeAudioOnTaps(): () => void {
  if (typeof document === 'undefined') return () => undefined;
  playAsMedia();
  if (!waking) {
    waking = () => {
      primeSpeech();
      void unlockAudio();
    };
    for (const name of TAP_EVENTS) document.addEventListener(name, waking, { capture: true, passive: true });
  }
  const listener = waking;
  return () => {
    for (const name of TAP_EVENTS) document.removeEventListener(name, listener, { capture: true });
    if (waking === listener) waking = null;
  };
}

// For tests.
export function resetAudioContext(): void {
  context = null;
  speechPrimed = false;
}
