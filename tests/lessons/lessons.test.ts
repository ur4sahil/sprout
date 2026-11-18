// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { sayWords } from '../../src/audio/say';
import { voicePieces, voiceText } from '../../src/audio/voice';
import { generatorFor } from '../../src/content/registry';
import { CATALOGUE } from '../../src/content/catalogue';
import { validateQuestion } from '../../src/engine/validate';
import type { OracleId, Say } from '../../src/engine/types';
import { LESSONS } from '../../src/lessons';
import type { Lesson, Moment } from '../../src/lessons/types';
import { ORACLES } from '../oracles/index';
import { judge } from '../oracles/judge';

// Every lesson that teaches (plan section 16).

const WORDS_PER_SECOND = 2.2; // the lesson voice, slower than the questions
const PAUSE_SECONDS = 0.8; // between moments: the gap, a sentence's pause and the glide
const TURN_SECONDS = 10; // hearing a turn's question and answering it

function moments(lesson: Lesson): Moment[] {
  return lesson.parts.flatMap((part) => (part.kind === 'show' ? [part.moment] : part.turn.why));
}

function seconds(say: Say): number {
  return sayWords(say).split(/\s+/).filter(Boolean).length / WORDS_PER_SECOND;
}

describe.each(Object.entries(LESSONS))('the lesson for %s', (skillId, make) => {
  const lesson = make();

  it('belongs to a skill that exists', () => {
    expect(CATALOGUE.some((skill) => skill.id === skillId)).toBe(true);
  });

  it('says every sentence with typed numbers and letters, and the voice can take every one', () => {
    for (const each of moments(lesson)) {
      for (const part of each.say) {
        if (typeof part === 'string') expect(part, `"${part}" holds a digit or a sign`).not.toMatch(/[0-9+=×÷<>]/);
      }
      expect(each.say.length, each.text).toBeGreaterThan(0);
      expect(each.text.trim().length, sayWords(each.say)).toBeGreaterThan(0);
      for (const piece of voicePieces(each.say, 'lesson')) expect(voiceText(piece), sayWords(piece)).not.toBeNull();
    }
  });

  it('keeps every piece on the stage, each with its own id', () => {
    for (const each of moments(lesson)) {
      const seen = new Set<string>();
      for (const piece of each.scene.pieces) {
        expect(seen.has(piece.id), `${piece.id} is twice in "${each.text}"`).toBe(false);
        seen.add(piece.id);
        expect(piece.x, piece.id).toBeGreaterThanOrEqual(0);
        expect(piece.y, piece.id).toBeGreaterThanOrEqual(0);
        expect(piece.x + (piece.w ?? 1), `${piece.id} runs off the right in "${each.text}"`).toBeLessThanOrEqual(each.scene.cols + 0.01);
        expect(piece.y + (piece.h ?? 1), `${piece.id} runs off the bottom in "${each.text}"`).toBeLessThanOrEqual(each.scene.rows + 0.01);
      }
    }
  });

  it('gives the child at least two turns, each a valid question with an answer the oracle agrees with', () => {
    const turns = lesson.parts.flatMap((part) => (part.kind === 'turn' ? [part.turn] : []));
    expect(turns.length).toBeGreaterThanOrEqual(2);
    for (const turn of turns) {
      const q = turn.question;
      expect(q.skillId).toBe(skillId);
      expect(validateQuestion(q)).toEqual([]);
      const named = typeof q.facts.oracle === 'string' ? (q.facts.oracle as OracleId) : generatorFor(skillId).oracle;
      const oracle = ORACLES[named];
      expect(oracle, named).toBeDefined();
      if (oracle) expect(judge(q, oracle(q.facts))).toEqual([]);
      expect(turn.why.length, 'a turn has a why').toBeGreaterThan(0);
    }
    // Two turns never ask the same question.
    expect(new Set(turns.map((turn) => turn.question.key)).size).toBe(turns.length);
  });

  it('says the answer in the why of each turn', () => {
    for (const part of lesson.parts) {
      if (part.kind !== 'turn') continue;
      const q = part.turn.question;
      const words = part.turn.why.map((each) => sayWords(each.say)).join(' ');
      const right = q.type === 'choice' ? q.options[q.answerIndex] : null;
      const answer = right && right.kind === 'text' ? sayWords(right.speak ?? [right.value.length === 1 ? { letter: right.value } : right.value]) : null;
      expect(answer, 'the right option says its answer').not.toBeNull();
      expect(words, `the why never says ${answer ?? ''}`).toContain(answer ?? '');
    }
  });

  it('lasts one to two and a half minutes, and never says the same sentence twice in a row', () => {
    const shown = lesson.parts.flatMap((part) => (part.kind === 'show' ? [part.moment] : []));
    const turns = lesson.parts.length - shown.length;
    const time = shown.reduce((sum, each) => sum + seconds(each.say) + PAUSE_SECONDS, 0) + turns * TURN_SECONDS;
    expect(time).toBeGreaterThanOrEqual(40);
    expect(time).toBeLessThanOrEqual(150);
    const all = moments(lesson);
    for (let i = 1; i < all.length; i += 1) {
      expect(sayWords(all[i]?.say ?? []), 'said twice in a row').not.toBe(sayWords(all[i - 1]?.say ?? []));
    }
  });
});
