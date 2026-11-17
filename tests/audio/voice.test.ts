import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readyVoice, resetVoice, setVoiceOn, voiceText, warm, warmQuestion } from '../../src/audio/voice';
import { generateQuestion } from '../../src/content/registry';

// The recorded voice on the device: ask once for each sentence, never wait long, fall back quietly.

let asked: string[];
let reply: (text: string) => Promise<Response>;
const audio = (text: string): Response => new Response(new TextEncoder().encode(`mp3:${text}`), { status: 200, headers: { 'Content-Type': 'audio/mpeg' } });
const text = (bytes: ArrayBuffer | null): string | null => (bytes ? new TextDecoder().decode(bytes) : null);

beforeEach(() => {
  resetVoice();
  asked = [];
  reply = async (sentence) => audio(sentence);
  vi.stubGlobal('fetch', async (_url: string, init: RequestInit) => {
    const sentence = (JSON.parse(String(init.body)) as { text: string }).text;
    asked.push(sentence);
    return reply(sentence);
  });
});
afterEach(() => {
  vi.unstubAllGlobals();
  resetVoice();
});

describe('the recorded voice', () => {
  it('is off until the app turns it on', async () => {
    expect(await readyVoice(['Start at', { number: 8 }, '.'], 50)).toBeNull();
    warm(['Hello.']);
    expect(asked).toEqual([]);
  });

  it('sends the sentence as words, and asks for each sentence only once', async () => {
    setVoiceOn(true);
    expect(voiceText(['Start at', { number: 8 }, '.'])).toBe('Start at eight.');
    warm(['Start at', { number: 8 }, '.']);
    expect(text(await readyVoice(['Start at', { number: 8 }, '.'], 500))).toBe('mp3:Start at eight.');
    expect(text(await readyVoice(['Start at', { number: 8 }, '.'], 500))).toBe('mp3:Start at eight.');
    expect(asked).toEqual(['Start at eight.']);
  });

  it('does not wait for a slow sentence, and has it the next time', async () => {
    setVoiceOn(true);
    let release: (() => void) | undefined;
    reply = (sentence) => new Promise((resolve) => (release = () => resolve(audio(sentence))));
    expect(await readyVoice(['A new sentence.'], 20)).toBeNull();
    release?.();
    await new Promise((resolve) => setTimeout(resolve, 5));
    expect(text(await readyVoice(['A new sentence.'], 20))).toBe('mp3:A new sentence.');
    expect(asked).toEqual(['A new sentence.']);
  });

  it('asks again after a failure, and stops asking when the server has no voice at all', async () => {
    setVoiceOn(true);
    reply = async () => new Response('{}', { status: 502 });
    expect(await readyVoice(['Try me.'], 200)).toBeNull();
    reply = async (sentence) => audio(sentence);
    expect(text(await readyVoice(['Try me.'], 200))).toBe('mp3:Try me.');
    expect(asked).toEqual(['Try me.', 'Try me.']);

    reply = async () => new Response('{}', { status: 503 });
    expect(await readyVoice(['No voice here.'], 200)).toBeNull();
    expect(await readyVoice(['Nor here.'], 200)).toBeNull();
    expect(asked).toEqual(['Try me.', 'Try me.', 'No voice here.']);
  });

  it('never sends what the server would refuse', async () => {
    setVoiceOn(true);
    expect(voiceText([])).toBeNull();
    expect(voiceText(['x'.repeat(301)])).toBeNull();
    expect(await readyVoice(['50% off <b>'], 50)).toBeNull();
    expect(asked).toEqual([]);
  });

  it('warms everything a question may say: its prompt, "Not quite" with the first step, and the later steps', async () => {
    setVoiceOn(true);
    const question = generateQuestion('M-1-B1', 1, 7);
    warmQuestion(question);
    await new Promise((resolve) => setTimeout(resolve, 5));
    expect(asked[0]).toBe(voiceText(question.prompt.speak));
    expect(asked[1]?.startsWith('Not quite.')).toBe(true);
    expect(asked).toHaveLength(1 + question.explanation.steps.length);
  });
});
