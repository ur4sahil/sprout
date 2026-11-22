import { json } from './auth';
import type { VoiceStore } from './store';

export type { VoiceStore } from './store';

// The spoken voice. One sentence in, one MP3 out. Each sentence is made once by the voice machine,
// kept in R2, and served from there ever after. The caller has already checked the session and the Origin.

// Which voice machine makes new sentences (plan section 20, Nov 22, 2026): Kokoro on the live app until the owner
// switches, Piper on the test copy. The plain setting VOICE_ENGINE; anything but "piper" is Kokoro.
export type VoiceEngine = 'kokoro' | 'piper';
export function voiceEngine(setting: string | undefined): VoiceEngine {
  return setting === 'piper' ? 'piper' : 'kokoro';
}

// ---- Kokoro ----

// The voice and its speed. A different voice or speed is a different set of saved files.
// Questions are said at 0.9; lessons and their examples slower, at 0.7, with longer pauses (the owner's choices, Nov 17, 2026).
// The voice is Bella (the owner's choice, Nov 17, 2026, after Heart added an 'a' before lone words).
export type Pace = 'normal' | 'lesson';
export const VOICE_NAME = 'af_bella';
export const PACES: Record<Pace, { id: string; speed: number }> = {
  normal: { id: `kokoro-${VOICE_NAME}-0.9`, speed: 0.9 },
  lesson: { id: `kokoro-${VOICE_NAME}-0.7`, speed: 0.7 },
};
export const VOICE_ID = PACES.normal.id;
// Each character of the cast has a voice of its own (the owner's choice, Nov 18, 2026: two girls and two boys).
// Sprout is Bella, the teaching voice; a line with no speaker named is Sprout's. A different voice is a different
// set of saved files, as a different speed is.
export type Who = 'sprout' | 'pip' | 'olive' | 'finn';
export const WHO_VOICE: Record<Who, string> = { sprout: VOICE_NAME, olive: 'af_sarah', pip: 'am_puck', finn: 'am_michael' };
const isWho = (value: unknown): value is Who => typeof value === 'string' && Object.hasOwn(WHO_VOICE, value);
// The folder a sentence is kept in: the voice and its speed.
function voiceId(pace: Pace, who: Who): string {
  return who === 'sprout' ? PACES[pace].id : `kokoro-${WHO_VOICE[who]}-${PACES[pace].speed}`;
}
export const MAX_VOICE_TEXT = 300;
// Plain words only: what the app's own sentences are made of.
// The same characters the app sends (src/audio/voice.ts), quotation marks included.
const SAFE_TEXT = /^[A-Za-z0-9 .,:;!?'’"“”-]+$/;

// Makes the audio for one sentence, or gives null when it cannot just now.
export interface VoiceMaker {
  make(text: string, speed: number, voice?: string): Promise<ArrayBuffer | null>;
}

async function sha256Hex(text: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

export async function voiceKey(text: string, pace: Pace = 'normal', who: Who = 'sprout'): Promise<string> {
  return `${voiceId(pace, who)}/${await sha256Hex(text)}.mp3`;
}

// `timing`: the sentence's timing file, sent as the X-Timing header (Piper only).
const audio = (body: ArrayBuffer, from: 'saved' | 'made', timing: string | null = null): Response =>
  new Response(body, { status: 200, headers: { 'Content-Type': 'audio/mpeg', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'X-Voice': from, ...(timing === null ? {} : { 'X-Timing': timing }) } });

// What the app asked for: one sentence, its pace and who says it. A reply instead when the request cannot be taken.
interface Ask {
  sentence: string;
  pace: Pace;
  who: Who;
}

async function readAsk(request: Request): Promise<Ask | Response> {
  let text: unknown;
  let asked: unknown;
  let speaker: unknown;
  try {
    const body = (await request.json()) as { text?: unknown; pace?: unknown; who?: unknown };
    text = body.text;
    asked = body.pace ?? 'normal';
    speaker = body.who ?? 'sprout';
  } catch {
    return json(400, { error: 'bad_request' });
  }
  if (typeof text !== 'string' || (asked !== 'normal' && asked !== 'lesson') || !isWho(speaker)) return json(400, { error: 'bad_request' });
  const sentence = text.replace(/\s+/g, ' ').trim();
  if (sentence.length === 0 || sentence.length > MAX_VOICE_TEXT || !SAFE_TEXT.test(sentence)) return json(400, { error: 'bad_text' });
  return { sentence, pace: asked, who: speaker };
}

// POST /api/voice { text, pace?, who? }: the sentence as speech, at the pace asked for (normal when left out), in
// the voice of the character named (Sprout when left out). 503 when this server has no voice machine,
// 502 when the machine did not answer: the app then uses the device's own voice.
export async function voice(store: VoiceStore, maker: VoiceMaker | null, request: Request, defer: (work: Promise<void>) => void): Promise<Response> {
  const asked = await readAsk(request);
  if (asked instanceof Response) return asked;
  const { sentence, pace, who } = asked;

  const key = await voiceKey(sentence, pace, who);
  const saved = await store.get(key);
  if (saved) return audio(saved, 'saved');
  if (!maker) return json(503, { error: 'no_voice' });
  const made = await maker.make(sentence, PACES[pace].speed, WHO_VOICE[who]);
  if (!made) return json(502, { error: 'voice_down' });
  // Saved after the reply, so the child is not kept waiting for it.
  defer(store.put(key, made.slice(0)));
  return audio(made, 'made');
}

// The voice machine, reached over its own private address with a shared key.
export function remoteVoiceMaker(url: string, key: string, fetcher: typeof fetch = fetch): VoiceMaker {
  return {
    async make(text, speed, voice = VOICE_NAME) {
      try {
        const reply = await fetcher(`${url.replace(/\/$/, '')}/tts`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-Voice-Key': key },
          body: JSON.stringify({ text, speed, voice }),
          signal: AbortSignal.timeout(25_000),
        });
        if (!reply.ok || !(reply.headers.get('Content-Type') ?? '').startsWith('audio/')) return null;
        const body = await reply.arrayBuffer();
        return body.byteLength > 0 ? body : null;
      } catch {
        return null;
      }
    },
  };
}

// ---- Piper (plan section 20, the owner's choices of Nov 21 to 22, 2026) ----

// One voice for each friend: Sprout Amy, Pip Ryan, Olive Kristin, Finn Joe. The voice machine applies the one slow
// pace (Piper length 1.6) and makes Pip and Finn younger, so the Worker sends only the text and the voice. The app's
// two paces are that one pace, so both are kept in one folder for each voice: piper-<voice>-1.6/<sha256>.mp3, with
// the sentence's timing beside it as <sha256>.json. No Kokoro file is ever served for a Piper sentence.
export type PiperVoice = 'amy' | 'ryan' | 'kristin' | 'joe';
export const PIPER_VOICE: Record<Who, PiperVoice> = { sprout: 'amy', pip: 'ryan', olive: 'kristin', finn: 'joe' };
export const PIPER_PACE = '1.6';

export async function piperKey(text: string, who: Who = 'sprout'): Promise<string> {
  return `piper-${PIPER_VOICE[who]}-${PIPER_PACE}/${await sha256Hex(text)}.mp3`;
}

// The timing file kept beside a sentence's MP3.
export function timingKey(key: string): string {
  return key.replace(/\.mp3$/, '.json');
}

// The timing of a sentence (the voice machine's X-Timing header): {"d": seconds, "v": [[seconds, shape], ...]}, the
// mouth shape from each moment on. The shapes are the four a talking mouth moves through (src/cast/types.ts).
export const TIMING_SHAPES = ['closed', 'small', 'round', 'wide'] as const;
const MAX_TIMING = 16_384; // characters: a 300-character sentence needs about a quarter of it
const isSeconds = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value) && value >= 0;

// The timing checked and written out again, compact and safe to send as a header, or null when it is missing or
// not a timing. A sentence is never refused for want of its timing.
export function cleanTiming(text: string | null | undefined): string | null {
  if (typeof text !== 'string' || text.length === 0 || text.length > MAX_TIMING) return null;
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    return null;
  }
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null;
  const { d, v } = value as { d?: unknown; v?: unknown };
  if (!isSeconds(d) || !Array.isArray(v)) return null;
  const marks: [number, string][] = [];
  for (const mark of v as unknown[]) {
    if (!Array.isArray(mark) || mark.length !== 2) return null;
    const [at, shape] = mark as [unknown, unknown];
    if (!isSeconds(at) || typeof shape !== 'string' || !(TIMING_SHAPES as readonly string[]).includes(shape)) return null;
    const before = marks[marks.length - 1];
    if (before && at < before[0]) return null; // in time order
    marks.push([at, shape]);
  }
  return JSON.stringify({ d, v: marks });
}

// Makes one sentence in a Piper voice: the MP3, and its timing when the machine sent one.
export interface PiperMaker {
  make(text: string, voice: PiperVoice): Promise<{ audio: ArrayBuffer; timing: string | null } | null>;
}

// Saved after the reply, so the child is not kept waiting. The timing file goes first, so a kept MP3 always has its
// timing beside it when there was one. A timing that cannot be saved never stops the sentence being kept.
async function keep(store: VoiceStore, key: string, body: ArrayBuffer, timing: string | null): Promise<void> {
  if (timing !== null) {
    try {
      await store.putJson(timingKey(key), timing);
    } catch {
      // Kept without its timing: the friend's mouth then follows the loudness.
    }
  }
  await store.put(key, body);
}

// POST /api/voice on a Worker whose VOICE_ENGINE is piper. The same request and replies as Kokoro's; every reply
// that has a timing carries it in X-Timing. A timing that is missing or cannot be read never fails the audio.
export async function piperVoice(store: VoiceStore, maker: PiperMaker | null, request: Request, defer: (work: Promise<void>) => void): Promise<Response> {
  const asked = await readAsk(request);
  if (asked instanceof Response) return asked;
  const { sentence, who } = asked; // the pace is checked, but there is one pace

  const key = await piperKey(sentence, who);
  const savedTiming = async (): Promise<string | null> => {
    try {
      return await store.getJson(timingKey(key));
    } catch {
      return null;
    }
  };
  const [saved, timing] = await Promise.all([store.get(key), savedTiming()]);
  if (saved) return audio(saved, 'saved', cleanTiming(timing));
  if (!maker) return json(503, { error: 'no_voice' });
  const made = await maker.make(sentence, PIPER_VOICE[who]);
  if (!made) return json(502, { error: 'voice_down' });
  const madeTiming = cleanTiming(made.timing);
  defer(keep(store, key, made.audio.slice(0), madeTiming));
  return audio(made.audio, 'made', madeTiming);
}

// The Piper voice machine, behind its own address, answering to the same shared key as Kokoro.
export function remotePiperMaker(url: string, key: string, fetcher: typeof fetch = fetch): PiperMaker {
  return {
    async make(text, voice) {
      try {
        const reply = await fetcher(`${url.replace(/\/$/, '')}/tts`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-Voice-Key': key },
          body: JSON.stringify({ text, voice }),
          signal: AbortSignal.timeout(25_000),
        });
        if (!reply.ok || !(reply.headers.get('Content-Type') ?? '').startsWith('audio/')) return null;
        const body = await reply.arrayBuffer();
        return body.byteLength > 0 ? { audio: body, timing: reply.headers.get('X-Timing') } : null;
      } catch {
        return null;
      }
    },
  };
}
