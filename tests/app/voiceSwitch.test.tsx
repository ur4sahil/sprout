import { screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAppStore } from '../../src/app/store';
import { RUNNING_BUILD, checkForUpdate, resetUpdatesForTests, startUpdates } from '../../src/app/updates';
import { newVoicesOn } from '../../src/audio/engine';
import { advanceClock, freezeClock } from '../../src/lib/clock';
import { NOW, openApp, setUp } from './practiceHelpers';

// The switch for the new voices (plan section 20) is learned from the server, never set on the device: the Worker
// adds its VOICE_ENGINE to /build.json, which the app asks for at launch (a built app starts the update checks).
// Until the server says piper, or when it cannot be asked, the app speaks as before.

const heard = vi.hoisted(() => ({ said: [] as { say: unknown; who: string }[] }));
vi.mock('../../src/audio/speech', async (original) => ({
  ...(await original<typeof import('../../src/audio/speech')>()),
  speak: async (say: unknown, _rate?: number, _pace?: string, who?: string) => {
    heard.said.push({ say, who: who ?? 'sprout' });
    return true;
  },
  stop: () => undefined,
  isSpeechAvailable: () => true,
}));
vi.mock('../../src/audio/sfx', async (original) => ({ ...(await original<typeof import('../../src/audio/sfx')>()), playSfx: () => undefined, unlockAudio: async () => undefined }));

// What the server's build file says, or 'offline'.
let build: unknown;
let asked: number;
beforeEach(() => {
  heard.said.length = 0;
  asked = 0;
  resetUpdatesForTests();
  vi.stubGlobal('fetch', async (url: string) => {
    if (url !== '/build.json') throw new TypeError('Failed to fetch');
    asked += 1;
    if (build === 'offline') throw new TypeError('Failed to fetch');
    return new Response(JSON.stringify(build), { status: 200, headers: { 'Content-Type': 'application/json' } });
  });
});
afterEach(() => resetUpdatesForTests());

// The launch check, as a built app makes it, and the build file's answer taken in.
async function launchCheck(): Promise<void> {
  const before = asked;
  await startUpdates();
  await waitFor(() => expect(asked).toBe(before + 1));
  await new Promise((resolve) => setTimeout(resolve, 5));
}

// Who says the question when Math practice opens.
async function promptSpeaker(): Promise<string> {
  const child = await setUp('K');
  useAppStore.getState().setChild(child);
  openApp('/skill/M-K-C4');
  await screen.findByRole('region', { name: 'Question' });
  await waitFor(() => expect(heard.said.length).toBeGreaterThan(0));
  return heard.said[0]?.who ?? '';
}

describe('the switch for the new voices', () => {
  it('a server whose build file says piper turns it on, and then Pip says Math practice', async () => {
    build = { id: RUNNING_BUILD, voice: 'piper' };
    expect(newVoicesOn()).toBe(false);
    await launchCheck();
    expect(newVoicesOn()).toBe(true);
    expect(await promptSpeaker()).toBe('pip');
  });

  for (const [name, said] of [
    ['says kokoro', { id: RUNNING_BUILD, voice: 'kokoro' }],
    ['says nothing', { id: RUNNING_BUILD }],
    ['says something else', { id: RUNNING_BUILD, voice: 'Piper' }],
    ['cannot be reached', 'offline'],
  ] as const) {
    it(`a server that ${name} leaves it off, and Sprout says Math practice, as before`, async () => {
      build = said;
      await launchCheck();
      expect(newVoicesOn()).toBe(false);
      expect(await promptSpeaker()).toBe('sprout');
    });
  }

  it('flips back with the server: a later check that says kokoro turns it off again', async () => {
    freezeClock(NOW);
    build = { id: RUNNING_BUILD, voice: 'piper' };
    await launchCheck();
    expect(newVoicesOn()).toBe(true);
    // A check that cannot reach the server changes nothing.
    build = 'offline';
    advanceClock(61_000);
    checkForUpdate();
    await waitFor(() => expect(asked).toBe(2));
    expect(newVoicesOn()).toBe(true);
    build = { id: RUNNING_BUILD, voice: 'kokoro' };
    advanceClock(61_000);
    checkForUpdate();
    await waitFor(() => expect(newVoicesOn()).toBe(false));
  });
});
