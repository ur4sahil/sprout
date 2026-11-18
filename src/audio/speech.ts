import type { Say } from '../engine/types';
import { playBytes, stopClip } from './clips';
import type { Pace } from './voice';
import { readyVoice, voicePieces } from './voice';
import { isMuted } from './mute';
import { saySegments } from './say';

// The only way the app speaks.
// speak() cancels anything playing, waits 60 ms, then plays each Say part in turn.
// It never throws: where speech does not exist, the text on screen carries on alone.

export const DEFAULT_RATE = 0.85;
const CANCEL_WAIT_MS = 60; // speaking straight after a cancel can drop the new sentence
const VOICE_WAIT_MS = 1000;
// The recorded voice is waited for, even while the voice machine makes a new sentence (the owner's choice,
// Nov 17, 2026). This is only a safety limit, so a child is never left in silence if the machine hangs.
export const RECORDED_WAIT_MS = 20_000;
// In a lesson, the pause between one sentence and the next.
export const LESSON_PAUSE_MS = 1000;
const UTTERANCE_LIMIT_MS = 12_000; // long utterances cut off on some phones
const PREFERRED = ['Samantha', 'Ava', 'Allison'];

let generation = 0; // each speak() call gets a number. A newer call makes older ones stop.
let voice: SpeechSynthesisVoice | null | undefined; // undefined: not looked up yet

function synth(): SpeechSynthesis | null {
  if (typeof window === 'undefined' || !('speechSynthesis' in window) || typeof SpeechSynthesisUtterance === 'undefined') return null;
  return window.speechSynthesis;
}

export function isSpeechAvailable(): boolean {
  return synth() !== null;
}

export function pickVoice(voices: readonly SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
  const us = voices.filter((candidate) => candidate.lang.replace('_', '-').toLowerCase() === 'en-us');
  for (const name of PREFERRED) {
    const found = us.find((candidate) => candidate.name.startsWith(name));
    if (found) return found;
  }
  return us.find((candidate) => candidate.localService) ?? us[0] ?? voices.find((candidate) => candidate.lang.toLowerCase().startsWith('en')) ?? null;
}

// Waits up to one second for the voice list, then prefers a local English (US) voice.
async function chooseVoice(engine: SpeechSynthesis): Promise<SpeechSynthesisVoice | null> {
  if (voice !== undefined) return voice;
  let voices = engine.getVoices();
  if (voices.length === 0) {
    await new Promise<void>((resolve) => {
      const done = (): void => {
        clearTimeout(timer);
        engine.removeEventListener?.('voiceschanged', done);
        resolve();
      };
      const timer = setTimeout(done, VOICE_WAIT_MS);
      engine.addEventListener?.('voiceschanged', done);
    });
    voices = engine.getVoices();
  }
  voice = pickVoice(voices);
  return voice;
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function utter(engine: SpeechSynthesis, text: string, rate: number, chosen: SpeechSynthesisVoice | null): Promise<void> {
  return new Promise<void>((resolve) => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = rate;
    utterance.lang = 'en-US';
    if (chosen) utterance.voice = chosen;
    const timer = setTimeout(resolve, UTTERANCE_LIMIT_MS);
    const done = (): void => {
      clearTimeout(timer);
      resolve();
    };
    utterance.onend = done;
    utterance.onerror = done;
    try {
      engine.speak(utterance);
    } catch {
      done();
    }
  });
}

// Speaks the parts in order. Resolves true if it played to the end, false if it was cut off,
// muted, or speech is not available.
// `pace` 'lesson' says each sentence on its own, in the slower lesson recording, with a pause between them.
export async function speak(say: Say, rate: number = DEFAULT_RATE, pace: Pace = 'normal'): Promise<boolean> {
  const mine = (generation += 1);
  const engine = synth();
  stopClip();
  try {
    engine?.cancel();
  } catch {
    // Nothing was playing.
  }
  if (isMuted() || say.length === 0) return false;
  try {
    await wait(CANCEL_WAIT_MS);
    if (mine !== generation) return false;
    // The recorded voice, piece by piece (a long story is one piece for each sentence).
    // The device's own voice says a piece only when its recording cannot come.
    let spoke = false;
    for (const piece of voicePieces(say, pace)) {
      if (mine !== generation) return false;
      if (spoke && pace === 'lesson') {
        await wait(LESSON_PAUSE_MS);
        if (mine !== generation) return false;
      }
      const recorded = await readyVoice(piece, RECORDED_WAIT_MS, pace);
      if (mine !== generation) return false;
      if (recorded && (await playBytes(recorded, rate / DEFAULT_RATE))) {
        spoke = true;
        continue;
      }
      if (mine !== generation) return false;
      if (!engine) continue;
      const chosen = await chooseVoice(engine);
      for (const segment of saySegments(piece)) {
        if (mine !== generation) return false;
        await utter(engine, segment.kind === 'clip' ? segment.fallback : segment.text, rate, chosen);
        spoke = true;
      }
    }
    return spoke && mine === generation;
  } catch {
    return false;
  }
}

// Stops anything being said.
export function stop(): void {
  generation += 1;
  stopClip();
  try {
    synth()?.cancel();
  } catch {
    // Nothing was playing.
  }
}

// For tests.
export function resetSpeech(): void {
  generation = 0;
  voice = undefined;
}
