// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { CATALOGUE, skillById } from '../src/content/catalogue';
import { allGenerators, exampleQuestion, generateFrom } from '../src/content/registry';
import { check } from '../src/engine/check';
import type { Level, Question, Response } from '../src/engine/types';
import { validateQuestion, validateRepeatable, validateSeries } from '../src/engine/validate';

// Every skill, every level, 300 seeds (plan section 5 and the content gate).
export const SEEDS = 300;

function rightResponse(question: Question): Response {
  switch (question.type) {
    case 'choice':
      return { index: question.answerIndex };
    case 'multiSelect':
      return { indexes: question.answerIndexes };
    case 'tapCount':
      return { count: question.answer };
    case 'numberPad':
      return { value: question.answer };
    case 'numberLineTap':
    case 'columnSum':
    case 'fillShape':
      return { value: question.answer };
    case 'dragWord':
      return { index: question.answerIndex };
    case 'setClock':
      return { time: question.answer };
    case 'buildBar':
      return { values: question.answer };
    case 'order':
      return { order: question.answerOrder };
    case 'sort':
      return { bins: question.answerBin };
    case 'match':
      return { pairs: question.answerPairs };
    case 'tiles':
      return { tiles: question.answer.split('') };
  }
}

describe.each(allGenerators().map((generator) => [generator.skillId, generator] as const))('%s', (skillId, generator) => {
  const skill = skillById(skillId);

  it('has a catalogue row that agrees with it', () => {
    expect(skill, 'no catalogue row').toBeDefined();
    expect(skill?.maxLevel).toBe(generator.maxLevel);
    expect(skill?.itemTypes).toEqual(generator.itemTypes);
  });

  for (let level = 1 as Level; level <= generator.maxLevel; level = (level + 1) as Level) {
    it(`level ${level}: ${SEEDS} seeds are valid, repeatable and well spread`, () => {
      const questions: Question[] = [];
      for (let seed = 1; seed <= SEEDS; seed += 1) {
        const question = generateFrom(generator, level, seed);
        const problems = [
          ...validateQuestion(question, { grade: skill?.grade, oracle: generator.oracle }),
          ...validateRepeatable(question, generateFrom(generator, level, seed)),
        ];
        expect(problems, `seed ${seed}: ${JSON.stringify(question.facts)}`).toEqual([]);
        expect(generator.itemTypes, `seed ${seed} gave a ${question.type}`).toContain(question.type);
        expect(check(question, rightResponse(question)), `seed ${seed}: the marked answer is not accepted`).toBe(true);
        questions.push(question);
      }
      expect(validateSeries(questions, generator.pool?.[level])).toEqual([]);
    });
  }

  it('declares a pool for every level with fewer than 8 different questions', () => {
    for (let level = 1 as Level; level <= generator.maxLevel; level = (level + 1) as Level) {
      const keys = new Set<string>();
      for (let seed = 1; seed <= 3000; seed += 1) keys.add(generateFrom(generator, level, seed).key);
      if (keys.size < 8) expect(generator.pool?.[level], `level ${level} has ${keys.size} questions`).toBe(keys.size);
    }
  });

  it('has a valid example', () => {
    const example = exampleQuestion(skillId);
    expect(validateQuestion(example, { grade: skill?.grade, oracle: generator.oracle })).toEqual([]);
  });

  it('has a four-beat lesson with speech and a picture on every beat', () => {
    const lesson = generator.lesson();
    expect(lesson.map((step) => step.beat)).toEqual(['see', 'watch', 'try', 'remember']);
    for (const step of lesson) {
      expect(step.text.trim().length).toBeGreaterThan(0);
      expect(step.speak.length).toBeGreaterThan(0);
      expect(step.visual).toBeDefined();
      // Lesson speech follows the same rule as question speech.
      const probe: Question = {
        skillId,
        level: 1,
        seed: 0,
        key: '',
        facts: { id: 'lesson' },
        mode: 'look',
        type: 'numberPad',
        answer: 0,
        maxDigits: 1,
        prompt: { text: step.text, speak: step.speak },
        stimulus: step.visual,
        explanation: { speak: step.reveal?.speak ?? step.speak, steps: [step.reveal?.text ?? step.text] },
      };
      const speech = validateQuestion(probe).filter((problem) => problem.startsWith('1:') || problem.startsWith('2:'));
      expect(speech, `${step.beat} beat`).toEqual([]);
    }
    expect(lesson[2]?.reveal, 'the "try" beat must reveal its answer').toBeDefined();
  });
});

describe('the catalogue and the registry', () => {
  it('have the same skills', () => {
    expect(allGenerators().map((g) => g.skillId).sort()).toEqual(CATALOGUE.map((s) => s.id).sort());
  });
});
