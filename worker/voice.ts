import { json } from './auth';

// The spoken voice. One sentence in, one MP3 out. Each sentence is made once by the voice machine,
// kept in R2, and served from there ever after. The caller has already checked the session and the Origin.

// The voice and its speed. A different voice or speed is a different set of saved files.
export const VOICE_ID = 'kokoro-af_heart-0.9';
export const MAX_VOICE_TEXT = 300;
// Plain words only: what the app's own sentences are made of.
const SAFE_TEXT = /^[A-Za-z0-9 .,:;!?'’-]+$/;

export interface VoiceStore {
  get(key: string): Promise<ArrayBuffer | null>;
  put(key: string, body: ArrayBuffer): Promise<void>;
}

// Makes the audio for one sentence, or gives null when it cannot just now.
export interface VoiceMaker {
  make(text: string): Promise<ArrayBuffer | null>;
}

export async function voiceKey(text: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  const hex = [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
  return `${VOICE_ID}/${hex}.mp3`;
}

const audio = (body: ArrayBuffer, from: 'saved' | 'made'): Response =>
  new Response(body, { status: 200, headers: { 'Content-Type': 'audio/mpeg', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'X-Voice': from } });

// POST /api/voice { text }: the sentence as speech. 503 when this server has no voice machine,
// 502 when the machine did not answer: the app then uses the device's own voice.
export async function voice(store: VoiceStore, maker: VoiceMaker | null, request: Request, defer: (work: Promise<void>) => void): Promise<Response> {
  let text: unknown;
  try {
    text = ((await request.json()) as { text?: unknown }).text;
  } catch {
    return json(400, { error: 'bad_request' });
  }
  if (typeof text !== 'string') return json(400, { error: 'bad_request' });
  const sentence = text.replace(/\s+/g, ' ').trim();
  if (sentence.length === 0 || sentence.length > MAX_VOICE_TEXT || !SAFE_TEXT.test(sentence)) return json(400, { error: 'bad_text' });

  const key = await voiceKey(sentence);
  const saved = await store.get(key);
  if (saved) return audio(saved, 'saved');
  if (!maker) return json(503, { error: 'no_voice' });
  const made = await maker.make(sentence);
  if (!made) return json(502, { error: 'voice_down' });
  // Saved after the reply, so the child is not kept waiting for it.
  defer(store.put(key, made.slice(0)));
  return audio(made, 'made');
}

// The voice machine, reached over its own private address with a shared key.
export function remoteVoiceMaker(url: string, key: string, fetcher: typeof fetch = fetch): VoiceMaker {
  return {
    async make(text) {
      try {
        const reply = await fetcher(`${url.replace(/\/$/, '')}/tts`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-Voice-Key': key },
          body: JSON.stringify({ text }),
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
