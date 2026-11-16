import { json } from './auth';
import type { PackStore } from './store';

// GET /api/voice-pack. The caller has already checked the session.
// `?have=<version>` lets a device that is up to date skip the download.
export async function voicePack(pack: PackStore, request: Request): Promise<Response> {
  const have = new URL(request.url).searchParams.get('have');
  const version = await pack.version();
  if (version === null) return json(404, { error: 'no_pack' });
  if (have !== null && have === version) return json(200, { version, unchanged: true });
  const file = await pack.read();
  if (!file) return json(404, { error: 'no_pack' });
  return new Response(file.body, {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
      'Strict-Transport-Security': 'max-age=31536000',
      'X-Content-Type-Options': 'nosniff',
      'X-Pack-Version': file.version,
    },
  });
}
