import { json } from './auth';
import type { VoiceStore } from './store';

// Recorded letter sounds (the owner's choice, Nov 21, 2026). Each sound is made once, in two forms, and kept in the
// voice bucket as sound/<key>/<form>.mp3: `once` is said inside a sentence, `three` when the sound is all there is
// to say. GET /api/sound/<key>/<form> gives one to a signed-in device (the caller has checked the session). 404
// while a sound is not uploaded: the app then says it by its letters.

// The app's sound keys, in its order (src/engine/letterSounds.ts is the one list). The Worker imports nothing from
// the app, so it keeps this copy; tests/worker/sound.test.ts fails when the two differ.
export const SOUND_KEYS: readonly string[] = [
  'a', 'e', 'i', 'o', 'u',
  'b', 'c', 'd', 'f', 'g', 'h', 'j', 'k', 'l', 'm', 'n', 'p', 'qu', 'r', 's', 't', 'v', 'w', 'x', 'y', 'z',
  'sh', 'ch', 'th', 'wh', 'ng', 'ck',
  'long-a', 'long-e', 'long-i', 'long-o', 'long-u',
  'ai', 'ay', 'ee', 'ea', 'oa', 'ie', 'igh', 'oi', 'oy', 'ou', 'ow', 'ar', 'er', 'ir', 'ur', 'or',
];
export const SOUND_FORMS: readonly string[] = ['once', 'three'];

// The address of one sound: /api/sound/<key>/<form>.
export const SOUND_ROUTE = /^\/api\/sound\/([^/]+)\/([^/]+)$/;

export async function sound(store: VoiceStore, key: string, form: string): Promise<Response> {
  if (!SOUND_KEYS.includes(key) || !SOUND_FORMS.includes(form)) return json(400, { error: 'bad_sound' });
  const body = await store.get(`sound/${key}/${form}.mp3`);
  if (!body) return json(404, { error: 'no_sound' });
  return new Response(body, { status: 200, headers: { 'Content-Type': 'audio/mpeg', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } });
}
