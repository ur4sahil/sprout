import { z } from 'zod';
import { logError } from '../lib/errorLog';
import { openRepo } from '../storage/index';
import type { AudioClip } from '../storage/schema';
import { audioContext } from './sfx';

// Voice-pack clips: letter names, numbers and a few short phrases, made ahead of time.
// They live in the device's `clips` store and play with no network.
// Without the pack, everything falls back to the device voice. The app never waits for the pack.

let known: Set<string> | null = null; // the clip keys on this device

// Reads which clips are on the device. Call once at launch, and again after a pack download.
export async function loadClipKeys(): Promise<void> {
  try {
    const { repo } = await openRepo();
    known = new Set(await repo.listClipKeys());
  } catch (error) {
    logError(error);
    known = new Set();
  }
}

export function hasClip(key: string): boolean {
  return known !== null && known.has(key);
}

export function clipCount(): number {
  return known?.size ?? 0;
}

// Plays one clip through WebAudio. Resolves true when it has finished, false if it could not play.
export async function playClip(key: string): Promise<boolean> {
  const ctx = audioContext();
  if (!ctx || !hasClip(key)) return false;
  try {
    const clip = await (await openRepo()).repo.getClip(key);
    if (!clip) return false;
    // decodeAudioData takes over the buffer it is given, so hand it a copy.
    const buffer = await ctx.decodeAudioData(clip.bytes.slice(0));
    return await new Promise<boolean>((resolve) => {
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);
      const giveUp = setTimeout(() => resolve(false), Math.ceil(buffer.duration * 1000) + 1500);
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

// ---- Getting the pack onto the device ----

const packSchema = z.object({
  version: z.string().min(1),
  mimeType: z.string().min(1),
  clips: z.record(z.string(), z.string().min(1)), // key -> base64 audio
});

function bytesOf(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

export type PackResult = 'upToDate' | 'downloaded' | 'noPack' | 'offline' | 'failed';

// Downloads the voice pack once, and again whenever its version changes.
// Any failure leaves the device as it was: the device voice carries on.
export async function syncVoicePack(): Promise<PackResult> {
  try {
    const { repo } = await openRepo();
    const device = await repo.getDeviceState();
    const have = device.voicePackVersion;
    let reply: Response;
    try {
      reply = await fetch(`/api/voice-pack${have ? `?have=${encodeURIComponent(have)}` : ''}`, { credentials: 'same-origin' });
    } catch {
      return 'offline';
    }
    if (reply.status === 404) return 'noPack';
    if (!reply.ok) return 'failed';
    const body: unknown = await reply.json();
    if (typeof body === 'object' && body !== null && (body as { unchanged?: unknown }).unchanged === true) {
      await loadClipKeys();
      return 'upToDate';
    }
    const pack = packSchema.safeParse(body);
    if (!pack.success) return 'failed';
    const version = reply.headers.get('X-Pack-Version') ?? pack.data.version;

    const fresh = Object.keys(pack.data.clips);
    for (const key of fresh) {
      const clip: AudioClip = { key, bytes: bytesOf(pack.data.clips[key] as string), mimeType: pack.data.mimeType, packVersion: version };
      await repo.saveClip(clip);
    }
    // Clips the new pack no longer has are removed.
    for (const old of await repo.listClipKeys()) {
      if (!fresh.includes(old)) await repo.deleteClip(old);
    }
    await repo.updateDeviceState({ voicePackVersion: version });
    await loadClipKeys();
    return 'downloaded';
  } catch (error) {
    logError(error);
    return 'failed';
  }
}

// For tests.
export function resetClips(): void {
  known = null;
  active = null;
}
