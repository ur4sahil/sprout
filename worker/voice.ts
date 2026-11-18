import { json } from './auth';

// The spoken voice. One sentence in, one MP3 out. Each sentence is made once by the voice machine,
// kept in R2, and served from there ever after. The caller has already checked the session and the Origin.

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

export interface VoiceStore {
  get(key: string): Promise<ArrayBuffer | null>;
  put(key: string, body: ArrayBuffer): Promise<void>;
}

// Makes the audio for one sentence, or gives null when it cannot just now.
export interface VoiceMaker {
  make(text: string, speed: number, voice?: string): Promise<ArrayBuffer | null>;
}

export async function voiceKey(text: string, pace: Pace = 'normal', who: Who = 'sprout'): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  const hex = [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
  return `${voiceId(pace, who)}/${hex}.mp3`;
}

const audio = (body: ArrayBuffer, from: 'saved' | 'made'): Response =>
  new Response(body, { status: 200, headers: { 'Content-Type': 'audio/mpeg', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'X-Voice': from } });

// POST /api/voice { text, pace?, who? }: (who: which character says it; Sprout when left out)
// POST /api/voice { text, pace? }: the sentence as speech, at the pace asked for (normal when left out). 503 when this server has no voice machine,
// 502 when the machine did not answer: the app then uses the device's own voice.
export async function voice(store: VoiceStore, maker: VoiceMaker | null, request: Request, defer: (work: Promise<void>) => void): Promise<Response> {
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
  const pace: Pace = asked;
  const who: Who = speaker;
  const sentence = text.replace(/\s+/g, ' ').trim();
  if (sentence.length === 0 || sentence.length > MAX_VOICE_TEXT || !SAFE_TEXT.test(sentence)) return json(400, { error: 'bad_text' });

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
