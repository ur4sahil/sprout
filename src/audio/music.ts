import { audioContext } from './context';
import type { Loop, Mood, MusicEvent } from './musicLoops';
import { LOOPS, loopEvents, loopSeconds } from './musicLoops';
import type { FilterLike, GainLike, MusicAudio, ParamLike } from './musicSynth';
import { playNote } from './musicSynth';
import { isMuted } from './mute';
import { isSpeaking, onSpeaking } from './speaking';

// Sprout's music (game feel, phase 8): soft loops made on the device, very quiet under everything else.
//
// When it plays: a screen asks for a mood (`useMusic`), the child's Music setting is on, the device is not muted,
// the app is in front, and the iPad has allowed sound (the profile tap unlocks it). It dips to a third while the
// voice speaks (to nothing under a practice question) and comes back after. It fades in and fades out.

export type { Mood } from './musicLoops';

// Loudness of the whole music, 0 to 1. The voice plays at 1 and the touch sounds at 0.25 to 0.5: the music sits
// well under both.
export const MUSIC_VOLUME = 0.06;
// In Calm mode it may still play, but quieter.
export const CALM_LEVEL = 0.6;
const FADE_IN = 2.5; // seconds
const FADE_OUT = 1.2;
const QUICK_OUT = 0.15; // when the app leaves the front or the device is muted
const DUCK_DOWN = 0.08; // how fast it dips when the voice starts (a time constant, in seconds)
const DUCK_UP = 0.4; // how gently it comes back
export const DUCK_HOLD_MS = 600; // a short wait after the voice stops, so it does not swell between two sentences
const TICK_MS = 200; // how often notes are lined up
const AHEAD = 0.8; // how far ahead, in seconds, notes are lined up
const TONE_TOP = 3200; // a gentle filter over everything: no bright edges

export interface MusicWish {
  mood: Mood | null; // null: no music on this screen
  hush: boolean; // the screen wants it silent for now, but keeping its place (a practice question being asked aloud)
  calm: boolean;
}

interface Playing {
  mood: Mood;
  loop: Loop;
  events: MusicEvent[];
  seconds: number; // one time round the loop
  index: number; // the next note to line up
  loopStart: number; // when the current time round started, on the audio clock
  level: number; // what the loudness is heading for, before the volume: 0 when hushed
  duck: number; // what the dip is heading for: 1 when nobody speaks
  duckNode: GainLike;
  bus: GainLike;
  filter: FilterLike;
}

let wish: MusicWish = { mood: null, hush: false, calm: false };
let playing: Playing | null = null;
let ticker: ReturnType<typeof setInterval> | null = null;
let restore: ReturnType<typeof setTimeout> | null = null;
let listening = false;
let stopSpeaking: (() => void) | null = null;
const prepared = new Map<Mood, MusicEvent[]>();
// undefined: the app's shared audio context. Tests put their own stand-in here.
let audioForTests: MusicAudio | null | undefined;

function audio(): MusicAudio | null {
  return audioForTests !== undefined ? audioForTests : audioContext();
}

function hidden(): boolean {
  return typeof document !== 'undefined' && document.visibilityState === 'hidden';
}

function eventsFor(mood: Mood): MusicEvent[] {
  let events = prepared.get(mood);
  if (!events) {
    events = loopEvents(LOOPS[mood]);
    prepared.set(mood, events);
  }
  return events;
}

// Moves a control smoothly from where it is now toward `target`.
function glide(param: ParamLike, target: number, at: number, timeConstant: number): void {
  const now = param.value;
  param.cancelScheduledValues(at);
  param.setValueAtTime(now, at);
  param.setTargetAtTime(target, at, timeConstant);
}

function levelWanted(): number {
  return wish.hush ? 0 : wish.calm ? CALM_LEVEL : 1;
}

function duckWanted(loop: Loop): number {
  return isSpeaking() ? loop.duck : 1;
}

function begin(ctx: MusicAudio, mood: Mood): Playing {
  const loop = LOOPS[mood];
  const at = ctx.currentTime;
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = TONE_TOP;
  filter.Q.value = 0.5;
  filter.connect(ctx.destination);
  const bus = ctx.createGain();
  bus.gain.setValueAtTime(0, at);
  const level = levelWanted();
  bus.gain.linearRampToValueAtTime(MUSIC_VOLUME * level, at + FADE_IN);
  bus.connect(filter);
  const duckNode = ctx.createGain();
  const duck = duckWanted(loop);
  duckNode.gain.setValueAtTime(duck, at);
  duckNode.connect(bus);
  return { mood, loop, events: eventsFor(mood), seconds: loopSeconds(loop), index: 0, loopStart: at + 0.1, level, duck, duckNode, bus, filter };
}

// Fades a loop out and lets it go. The notes already lined up play on into silence and end by themselves.
function fadeOut(ctx: MusicAudio | null, old: Playing, seconds: number): void {
  if (ctx) glide(old.bus.gain, 0, ctx.currentTime, seconds / 3);
  setTimeout(() => {
    try {
      old.filter.disconnect();
    } catch {
      // Already let go.
    }
  }, seconds * 1000 + 300);
}

// Lines up the notes due in the next moment.
function lineUp(ctx: MusicAudio, now: Playing): void {
  const at = ctx.currentTime;
  // After a long gap (a slow device, a busy moment), start the round again rather than rush to catch up.
  if (now.loopStart + now.seconds < at) {
    now.loopStart = at + 0.05;
    now.index = 0;
  }
  const horizon = at + AHEAD;
  for (;;) {
    const event = now.events[now.index];
    if (!event) return;
    const when = now.loopStart + event.at;
    if (when > horizon) return;
    // While hushed the loop keeps its place but makes no sound, so it carries on where it was.
    if (now.level > 0 && when >= at - 0.02) playNote(ctx, now.duckNode, event, Math.max(when, at));
    now.index += 1;
    if (now.index >= now.events.length) {
      now.index = 0;
      now.loopStart += now.seconds;
    }
  }
}

// Works out what should be heard now and makes it so. Called on every change and on every tick.
function update(): void {
  const ctx = audio();
  const able = wish.mood !== null && ctx !== null && ctx.state === 'running' && !isMuted() && !hidden();
  if (!able || !ctx || wish.mood === null) {
    if (playing) fadeOut(ctx, playing, wish.mood === null ? FADE_OUT : QUICK_OUT);
    playing = null;
    if (wish.mood === null) stopTicking();
    return;
  }
  if (playing && playing.mood !== wish.mood) {
    fadeOut(ctx, playing, FADE_OUT);
    playing = null;
  }
  if (!playing) {
    playing = begin(ctx, wish.mood);
  } else {
    const level = levelWanted();
    if (level !== playing.level) {
      glide(playing.bus.gain, MUSIC_VOLUME * level, ctx.currentTime, level > playing.level ? FADE_IN / 3 : 0.3);
      playing.level = level;
    }
  }
  lineUp(ctx, playing);
}

function stopTicking(): void {
  if (ticker !== null) clearInterval(ticker);
  ticker = null;
}

// The voice started or stopped: dip at once, come back after a short wait.
function heardSpeaking(speaking: boolean): void {
  if (restore !== null) clearTimeout(restore);
  restore = null;
  const apply = (): void => {
    const ctx = audio();
    if (!playing || !ctx) return;
    const duck = duckWanted(playing.loop);
    if (duck === playing.duck) return;
    glide(playing.duckNode.gain, duck, ctx.currentTime, duck < playing.duck ? DUCK_DOWN : DUCK_UP);
    playing.duck = duck;
  };
  if (speaking) apply();
  else
    restore = setTimeout(() => {
      restore = null;
      apply();
    }, DUCK_HOLD_MS);
}

function listen(): void {
  if (listening) return;
  listening = true;
  stopSpeaking = onSpeaking(heardSpeaking);
  if (typeof document !== 'undefined') document.addEventListener('visibilitychange', update);
}

// What the screen on show wants. Called by `useMusic`.
export function setMusic(next: MusicWish): void {
  wish = { ...next };
  if (wish.mood !== null) {
    listen();
    if (ticker === null) ticker = setInterval(update, TICK_MS);
  }
  update();
}

// The garden's music by the clock: the lullaby from 7 in the evening until morning.
export function gardenMood(at: Date): Mood {
  const hour = at.getHours();
  return hour >= 19 || hour < 6 ? 'night' : 'garden';
}

// What is playing now, for tests: the mood, and the loudness and dip it is heading for.
export function musicNow(): { mood: Mood | null; level: number; duck: number } {
  return playing ? { mood: playing.mood, level: playing.level, duck: playing.duck } : { mood: null, level: 0, duck: 1 };
}

// For tests: play into this stand-in instead of the app's audio context (undefined goes back to the real one).
export function setMusicAudioForTests(ctx: MusicAudio | null | undefined): void {
  audioForTests = ctx;
}

// For tests.
export function resetMusic(): void {
  stopTicking();
  if (restore !== null) clearTimeout(restore);
  restore = null;
  stopSpeaking?.();
  stopSpeaking = null;
  if (listening && typeof document !== 'undefined') document.removeEventListener('visibilitychange', update);
  listening = false;
  playing = null;
  wish = { mood: null, hush: false, calm: false };
  audioForTests = undefined;
}
