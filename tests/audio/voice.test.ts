import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readyVoice, resetVoice, setVoiceOn, soundClipOf, voicePieces, voiceText, warm, warmAll, warmQuestion } from '../../src/audio/voice';
import { generateQuestion } from '../../src/content/registry';
import { sayWords } from '../../src/audio/say';
import { setSoundClips } from '../../src/audio/soundClips';
import type { Question } from '../../src/engine/types';

// The recorded voice on the device: ask once for each sentence, wait for it, fall back quietly only when it cannot come.

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
  setSoundClips(null);
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

  it('speech too long for one recording is recorded one sentence at a time', async () => {
    setVoiceOn(true);
    const long = [`${'Add the ones. '.repeat(25)}Now add`, { number: 7 }, 'and', { number: 8 }, '.'];
    const pieces = voicePieces(long);
    expect(pieces.length).toBe(26);
    expect(pieces.every((piece) => voiceText(piece) !== null)).toBe(true);
    expect(voiceText(pieces[25] ?? [])).toBe('Now add seven and eight.');
    expect(voicePieces(['Short.'])).toEqual([['Short.']]);
    warm(long);
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(new Set(asked)).toEqual(new Set(['Add the ones.', 'Now add seven and eight.']));
  });

  it('a lesson is asked for a sentence at a time, at the lesson pace, apart from the same words at the normal pace', async () => {
    setVoiceOn(true);
    const bodies: string[] = [];
    vi.stubGlobal('fetch', async (_url: string, init: RequestInit) => {
      bodies.push(String(init.body));
      return audio(String(init.body));
    });
    expect(voicePieces(['Count the dots. Then say the number.'], 'lesson')).toEqual([['Count the dots.'], ['Then say the number.']]);
    expect(voicePieces(['Count the dots. Then say the number.'])).toEqual([['Count the dots. Then say the number.']]);
    await readyVoice(['Count the dots.'], 200, 'lesson');
    await readyVoice(['Count the dots.'], 200);
    expect(bodies).toEqual(['{"text":"Count the dots.","pace":"lesson"}', '{"text":"Count the dots."}']);
  });

  it('splits a lesson into sentences between parts, so the device voice still gets letters and numbers as parts', () => {
    expect(voicePieces(['Sun starts with', { letter: 's' }, '. Count to', { number: 3 }, 'now.'], 'lesson')).toEqual([
      ['Sun starts with', { letter: 's' }, '.'],
      ['Count to', { number: 3 }, 'now.'],
    ]);
    expect(voiceText(['Sun starts with', { letter: 's' }, '.'])).toBe('Sun starts with S.');
    expect(sayWords(['Sun starts with', { letter: 's' }, '.'])).toBe('Sun starts with ess.');
  });

  it('sends a letter as its capital, which the voice reads as the letter name', () => {
    expect(voiceText(['The first letter is', { letter: 'a' }, '.'])).toBe('The first letter is A.');
    expect(voiceText([{ letter: 'f' }])).toBe('F');
    expect(voicePieces(['It starts with', { letter: 's' }, '. Then', { letter: 'u' }, '.'], 'lesson').map(voiceText)).toEqual(['It starts with S.', 'Then U.']);
  });

  it('sends sentences with quotation marks', async () => {
    setVoiceOn(true);
    const say = ['Which word can take the place of "did not"?'];
    expect(voiceText(say)).toBe('Which word can take the place of "did not"?');
    expect(text(await readyVoice(say, 200))).toBe('mp3:Which word can take the place of "did not"?');
  });

  it('asks for at most two early sentences at once, and a sentence wanted now goes straight away', async () => {
    setVoiceOn(true);
    const waiting: (() => void)[] = [];
    reply = (sentence) => new Promise((resolve) => waiting.push(() => resolve(audio(sentence))));
    warmAll([['One.'], ['Two.'], ['Three.'], ['Four.']]);
    await new Promise((resolve) => setTimeout(resolve, 5));
    expect(asked).toEqual(['One.', 'Two.']);
    const now = readyVoice(['Now.'], 1000);
    await new Promise((resolve) => setTimeout(resolve, 5));
    expect(asked).toEqual(['One.', 'Two.', 'Now.']);
    // Each sentence that finishes frees a place for the next early one.
    waiting[2]?.();
    expect(text(await now)).toBe('mp3:Now.');
    await new Promise((resolve) => setTimeout(resolve, 5));
    expect(asked).toEqual(['One.', 'Two.', 'Now.', 'Three.']);
    waiting[0]?.();
    await new Promise((resolve) => setTimeout(resolve, 5));
    expect(asked).toEqual(['One.', 'Two.', 'Now.', 'Three.', 'Four.']);
  });

  it('warms only the steps that are said: one that cannot be read is skipped, never replaced by the summary', async () => {
    setVoiceOn(true);
    const base = generateQuestion('M-1-B1', 1, 7);
    const question: Question = { ...base, explanation: { ...base.explanation, steps: ['Start at 9.', 'It is 50% more.', 'So it is 11.'] } };
    warmQuestion(question);
    await new Promise((resolve) => setTimeout(resolve, 5));
    expect(asked).toEqual([voiceText(question.prompt.speak), 'Not quite. Start at nine.', 'So it is eleven.']);
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

describe('letter sounds in the recorded voice', () => {
  it('with no recording, a sound stays in its sentence and is said by its letters', () => {
    expect(voicePieces(['Bat starts with', { sound: 'b' }, '.'])).toEqual([['Bat starts with', { sound: 'b' }, '.']]);
    expect(voiceText(['Bat starts with', { sound: 'b' }, '.'])).toBe('Bat starts with the sound of B.');
    expect(voiceText([{ sound: 'sh' }])).toBe('the sound of S, H');
    expect(voiceText(['Cake has', { sound: 'long-a' }, 'in the middle.'])).toBe('Cake has the sound of long A in the middle.');
    expect(soundClipOf([{ sound: 'b' }], false)).toBeNull();
  });

  it('with a recording, the sound is a piece of its own, and the words around it are recorded as before', async () => {
    setSoundClips({ has: (key) => key.startsWith('sound:b:'), get: async () => new ArrayBuffer(4) });
    expect(voicePieces(['Bat starts with', { sound: 'b' }, '. Ball does too.'])).toEqual([['Bat starts with'], [{ sound: 'b' }], ['Ball does too.']]);
    // A sound with no recording stays in the words; a stop left on its own is not a piece.
    expect(voicePieces(['Bat and', { sound: 'sh' }, 'and', { sound: 'b' }, '.'])).toEqual([['Bat and', { sound: 'sh' }, 'and'], [{ sound: 'b' }]]);
    // A lesson is still said a sentence at a time.
    expect(voicePieces(['Listen. Bat starts with', { sound: 'b' }, '. Say it.'], 'lesson')).toEqual([['Listen.'], ['Bat starts with'], [{ sound: 'b' }], ['Say it.']]);
    // Once inside a sentence, three times when it is all there is to say.
    expect(soundClipOf([{ sound: 'b' }], false)).toBe('sound:b:once');
    expect(soundClipOf([{ sound: 'b' }], true)).toBe('sound:b:three');
    expect(soundClipOf([{ sound: 'sh' }], false)).toBeNull();
    expect(soundClipOf(['Bat'], false)).toBeNull();
    // The words are fetched early as before; the sound itself is never sent to the voice machine.
    setVoiceOn(true);
    warm(['Bat starts with', { sound: 'b' }, '.']);
    warm([{ sound: 'b' }]);
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(asked).toEqual(['Bat starts with']);
  });
});

describe('who says it', () => {
  let bodies: { text: string; pace?: string; who?: string }[];
  beforeEach(() => {
    bodies = [];
    vi.stubGlobal('fetch', async (_url: string, init: RequestInit) => {
      const body = JSON.parse(String(init.body)) as { text: string; pace?: string; who?: string };
      bodies.push(body);
      return audio(`${body.who ?? 'sprout'}:${body.text}`);
    });
    setVoiceOn(true);
  });
  const settle = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 10));

  it('a question is fetched early in its friend\'s voice, so the early fetch is the one played', async () => {
    const question = generateQuestion('M-1-B1', 1, 7);
    warmQuestion(question, 'pip');
    await settle();
    expect(bodies).toHaveLength(1 + question.explanation.steps.length);
    expect(bodies.every((body) => body.who === 'pip' && body.pace === undefined)).toBe(true);
    const prompt = voiceText(question.prompt.speak) ?? '';
    // Said by Pip, it is already there: nothing is asked again.
    expect(text(await readyVoice(question.prompt.speak, 500, 'normal', 'pip'))).toBe(`mp3:pip:${prompt}`);
    expect(bodies).toHaveLength(1 + question.explanation.steps.length);
    // Said by Sprout, it is another recording.
    expect(text(await readyVoice(question.prompt.speak, 500))).toBe(`mp3:sprout:${prompt}`);
    expect(bodies.at(-1)).toEqual({ text: prompt });
  });

  it('a warm with no friend named is Sprout\'s, as speech with none named is', async () => {
    warm(['Next up!']);
    warmQuestion(generateQuestion('M-1-B1', 1, 8));
    await settle();
    expect(bodies.length).toBeGreaterThan(1);
    expect(bodies.every((body) => body.who === undefined)).toBe(true);
  });

  it('several sentences are fetched early in one voice and pace', async () => {
    warmAll([['Five plus three.'], ['Eight.']], 'normal', 'pip');
    warmAll([['Look at the first picture.']], 'lesson', 'finn');
    warm(['Once upon a time.'], 'lesson', 'olive');
    await settle();
    expect(bodies).toEqual([
      { text: 'Five plus three.', who: 'pip' },
      { text: 'Eight.', who: 'pip' },
      { text: 'Look at the first picture.', pace: 'lesson', who: 'finn' },
      { text: 'Once upon a time.', pace: 'lesson', who: 'olive' },
    ]);
  });

  it('a letter sound with a recording is fetched early from its own source, never from the voice machine', async () => {
    const fetched: string[] = [];
    setSoundClips({
      has: (key) => key.startsWith('sound:b:'),
      get: async (key) => {
        fetched.push(key);
        return new ArrayBuffer(4);
      },
    });
    warm(['Bat starts with', { sound: 'b' }, '.'], 'normal', 'olive');
    warm([{ sound: 'b' }], 'normal', 'olive');
    await settle();
    expect(fetched).toEqual(['sound:b:once', 'sound:b:three']);
    expect(bodies).toEqual([{ text: 'Bat starts with', who: 'olive' }]);
  });
});
