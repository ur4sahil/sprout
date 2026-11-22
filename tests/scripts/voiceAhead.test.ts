// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { voiceAhead, workerReads } from '../../scripts/voice-ahead';
import { setVoiceEngine } from '../../src/audio/engine';
import { voiceFor } from '../../src/cast';
import type { Skill } from '../../src/content/catalogue';
import { skillById } from '../../src/content/catalogue';
import { MAX_VOICE_TEXT, PIPER_VOICE, piperKey } from '../../worker/voice';

// scripts/voice-ahead.ts lists the sentences to record ahead of time in the Piper voices (plan section 20, phase 5).
// Each must be kept under the Worker's own key, in the voice the app itself gives it.

describe('the list of sentences to record ahead', () => {
  it('keys each sentence as the Worker does, in the voice the app gives it', async () => {
    const ahead = await voiceAhead({ seeds: 1 });

    const sample = ahead.lines.filter((_, i) => i % 97 === 0);
    expect(sample.length).toBeGreaterThan(50);
    for (const line of sample) {
      expect(line.key).toBe(await piperKey(line.sentence, line.who));
      expect(line.voice).toBe(PIPER_VOICE[line.who]);
    }
    expect(new Set(ahead.lines.map((line) => line.key)).size).toBe(ahead.lines.length);

    // The app's own rule once the server speaks with the new voices: a question is said by its subject's friend, and
    // home names no speaker, so Sprout says it.
    setVoiceEngine('piper');
    const asked = (subject: Skill['subject']) => ahead.lines.filter((line) => line.screen === 'question' && line.skillId !== null && skillById(line.skillId)?.subject === subject);
    for (const [subject, friend] of [['math', 'pip'], ['ela', 'olive'], ['reasoning', 'finn']] as const) {
      expect(voiceFor(subject)).toBe(friend);
      expect(asked(subject).length).toBeGreaterThan(0);
      expect(new Set(asked(subject).map((line) => line.who))).toEqual(new Set([friend]));
    }
    const home = ahead.lines.filter((line) => line.screen === 'home');
    expect(home.length).toBeGreaterThan(0);
    expect(new Set(home.map((line) => line.who))).toEqual(new Set(['sprout']));
  }, 120_000);

  it('takes a text as the Worker reads it, and leaves out what the Worker refuses', async () => {
    expect(await workerReads('  Great   job. ', 'normal', 'pip')).toEqual({ sentence: 'Great job.', key: await piperKey('Great job.', 'pip') });
    expect(await workerReads('Half off: 50%', 'normal', 'pip')).toBeNull();
    expect(await workerReads('a'.repeat(MAX_VOICE_TEXT), 'lesson', 'finn')).not.toBeNull();
    expect(await workerReads('a'.repeat(MAX_VOICE_TEXT + 1), 'lesson', 'finn')).toBeNull();
  });
});
