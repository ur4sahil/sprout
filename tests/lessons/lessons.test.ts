// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { sayWords } from '../../src/audio/say';
import { voicePieces, voiceText } from '../../src/audio/voice';
import { generatorFor } from '../../src/content/registry';
import { CATALOGUE } from '../../src/content/catalogue';
import { validateQuestion } from '../../src/engine/validate';
import type { OracleId, Question, Say, Visual } from '../../src/engine/types';
import { LESSONS } from '../../src/lessons';
import type { Lesson, Moment } from '../../src/lessons/types';
import { ORACLES } from '../oracles/index';
import { judge } from '../oracles/judge';

// Every lesson that teaches (plan section 16).

const WORDS_PER_SECOND = 1.9; // the lesson voice (0.7 speed), slower than the questions
const PAUSE_SECONDS = 1.7; // between moments: the gap, a sentence's pause and the glide
const TURN_SECONDS = 10; // hearing a turn's question and answering it

// What a why may say to give a question's answer, as the voice says it.
function spokenVisual(visual: Visual | undefined): string | null {
  if (!visual) return null;
  if (visual.speak) return sayWords(visual.speak);
  if (visual.kind === 'text' && /^\d+$/.test(visual.value)) return sayWords([{ number: Number(visual.value) }]); // a numeral is said as a number
  if (visual.kind === 'text') return sayWords([visual.value.length === 1 ? { letter: visual.value } : visual.value]);
  return null;
}

function spokenAnswers(q: Question): string[] {
  const keep = (values: (string | null)[]): string[] => values.filter((value): value is string => !!value && value.trim().length > 0);
  switch (q.type) {
    case 'choice':
    case 'dragWord':
      return keep([spokenVisual(q.options[q.answerIndex])]);
    case 'multiSelect':
      return keep(q.answerIndexes.map((index) => spokenVisual(q.options[index])));
    case 'tapCount':
    case 'numberPad':
    case 'columnSum':
    case 'fillShape':
      return [sayWords([{ number: q.answer }])];
    case 'numberLineTap':
      return q.line.denominator ? [] : [sayWords([{ number: q.answer }])];
    case 'tiles':
      return [sayWords([{ word: q.answer }]), sayWords(q.answer.split('').map((letter) => ({ letter })))];
    case 'setClock':
      return [sayWords([{ time: q.answer }])];
    case 'order':
      return keep(q.answerOrder.map((index) => spokenVisual(q.items[index])));
    case 'sort':
      return keep(q.answerBin.map((bin) => sayWords(q.bins[bin]?.speak ?? [])));
    case 'match':
      return keep(q.answerPairs.map(([, r]) => spokenVisual(q.right[r])));
    case 'buildBar':
      return [];
  }
}

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
      expect(turn.why.length, 'a turn has a why').toBeGreaterThan(0);
      // Checked as the generator tests check it: with the skill's grade and oracle (banked questions use 'authored').
      expect(validateQuestion(q, { grade: CATALOGUE.find((skill) => skill.id === skillId)?.grade, oracle: generatorFor(skillId).oracle })).toEqual([]);
      const named = typeof q.facts.oracle === 'string' ? (q.facts.oracle as OracleId) : generatorFor(skillId).oracle;
      // Banked questions ('authored') carry their own answers, checked by the review sheet as in the oracle tests.
      if (named === 'authored') continue;
      const oracle = ORACLES[named];
      expect(oracle, named).toBeDefined();
      if (oracle) expect(judge(q, oracle(q.facts))).toEqual([]);
    }
    // Two turns never ask the same question.
    expect(new Set(turns.map((turn) => turn.question.key)).size).toBe(turns.length);
  });

  it('says the answer in the why of each turn', () => {
    for (const part of lesson.parts) {
      if (part.kind !== 'turn') continue;
      const q = part.turn.question;
      const words = part.turn.why.map((each) => sayWords(each.say)).join(' ');
      // Any one of these said in the why is enough: e.g. one pair of a match, one item's bin in a sort.
      // A picture answer with no spoken label falls back to the word the question is about (facts.target).
      const target = typeof q.facts.target === 'string' ? q.facts.target : null;
      const answers = [...spokenAnswers(q), ...(target ? [sayWords([{ word: target }])] : [])];
      // An answer that is a picture with no name (a turned shape, a row of shapes, a bar): the why must end by showing
      // that very picture on the stage.
      const right = q.type === 'choice' ? q.options[q.answerIndex] : null;
      const shownAtEnd = right ? (part.turn.why.at(-1)?.scene.pieces ?? []).some((piece) => piece.look.kind === 'visual' && !piece.gone && JSON.stringify(piece.look.visual) === JSON.stringify(right)) : false;
      if (shownAtEnd) continue;
      // Putting pictures in order: the why must end with those pictures on the stage in the right order, read top to
      // bottom, then left to right.
      if (q.type === 'order') {
        const last = (part.turn.why.at(-1)?.scene.pieces ?? []).filter((piece) => piece.look.kind === 'visual' && !piece.gone);
        const inOrder = [...last].sort((one, two) => one.y - two.y || one.x - two.x).map((piece) => (piece.look.kind === 'visual' ? JSON.stringify(piece.look.visual) : ''));
        const wanted = q.answerOrder.map((index) => JSON.stringify(q.items[index]));
        if (JSON.stringify(inOrder.filter((each) => wanted.includes(each))) === JSON.stringify(wanted)) continue;
      }
      expect(answers.length, `a ${q.type} question has an answer the why can say, or shows at its end`).toBeGreaterThan(0);
      expect(
        answers.some((answer) => words.includes(answer)),
        `the why never says ${answers.join(' / ')}`,
      ).toBe(true);
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
