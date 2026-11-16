import { questionKey } from '../engine/canonical';
import { makeRng } from '../engine/rng';
import type { Level, Question, QuestionDraft } from '../engine/types';
import type { SkillGenerator } from './generator';
import { findLowercaseGenerator, findUppercaseGenerator, sameLetterGenerator } from './generators/ela/pk/letters';
import { letterOrNumberGenerator, matchLettersGenerator } from './generators/ela/pk/matchAndSort';
import { clapsGenerator, rhymesGenerator, startsLikeGenerator } from './generators/ela/pk/sounds';
import { oppositesGenerator, wordGroupsGenerator } from './generators/ela/pk/words';
import { addPicturesTo10Generator, addPicturesTo5Generator, addTo5Generator } from './generators/math/k/adding';
import { compareNumbersGenerator, moreFewerEqualGenerator } from './generators/math/k/comparing';
import { countTo20Generator, framesTo10Generator, framesTo20Generator } from './generators/math/k/counting';
import { generator as mkb3 } from './generators/math/k/M-K-B3';
import { generator as mkc4 } from './generators/math/k/M-K-C4';
import { breakApartGenerator, makeTenGenerator } from './generators/math/k/makeAndBreak';
import { compareLengthGenerator, patternsGenerator, sortAndCountGenerator } from './generators/math/k/measuring';
import { beforeAndAfterGenerator, countByTensGenerator, missingNumberGenerator, whatComesNextGenerator } from './generators/math/k/numberRows';
import { additionStoriesGenerator, subtractionStoriesGenerator } from './generators/math/k/stories';
import { subtractPicturesTo5Generator, subtractTo10Generator, subtractTo5Generator } from './generators/math/k/subtracting';
import { teenNumbersGenerator } from './generators/math/k/teens';
import { nameFlatGenerator, nameSolidGenerator, sidesAndCornersGenerator } from './generators/math/k/shapes';
import { generator as mpka1 } from './generators/math/pk/M-PK-A1';
import { generator as mpka2 } from './generators/math/pk/M-PK-A2';
import { generator as mpka3 } from './generators/math/pk/M-PK-A3';
import { generator as mpka4 } from './generators/math/pk/M-PK-A4';
import { generator as mpka5 } from './generators/math/pk/M-PK-A5';
import { generator as mpka6 } from './generators/math/pk/M-PK-A6';
import { generator as mpka7 } from './generators/math/pk/M-PK-A7';
import { generator as mpka8 } from './generators/math/pk/M-PK-A8';
import { generator as mpkb1 } from './generators/math/pk/M-PK-B1';
import { generator as mpkb2 } from './generators/math/pk/M-PK-B2';
import { generator as mpkc1 } from './generators/math/pk/M-PK-C1';
import { generator as mpkc2 } from './generators/math/pk/M-PK-C2';
import { generator as mpkc3 } from './generators/math/pk/M-PK-C3';
import { generator as mpkd1 } from './generators/math/pk/M-PK-D1';
import { generator as mpkd2 } from './generators/math/pk/M-PK-D2';
import { generator as mpkd3 } from './generators/math/pk/M-PK-D3';

// skillId -> generator. Every generator in generators/ is listed here.
const ALL: readonly SkillGenerator[] = [
  mpka1, mpka2, mpka3, mpka4, mpka5, mpka6, mpka7, mpka8, mpkb1, mpkb2, mpkc1, mpkc2, mpkc3, mpkd1, mpkd2, mpkd3,
  countTo20Generator,
  framesTo10Generator,
  framesTo20Generator,
  whatComesNextGenerator,
  beforeAndAfterGenerator,
  missingNumberGenerator,
  countByTensGenerator,
  moreFewerEqualGenerator,
  compareNumbersGenerator,
  mkb3,
  addPicturesTo5Generator,
  addTo5Generator,
  addPicturesTo10Generator,
  mkc4,
  subtractPicturesTo5Generator,
  subtractTo5Generator,
  subtractTo10Generator,
  makeTenGenerator,
  breakApartGenerator,
  additionStoriesGenerator,
  subtractionStoriesGenerator,
  teenNumbersGenerator,
  nameFlatGenerator,
  nameSolidGenerator,
  sidesAndCornersGenerator,
  compareLengthGenerator,
  sortAndCountGenerator,
  patternsGenerator,
  findUppercaseGenerator,
  findLowercaseGenerator,
  matchLettersGenerator,
  sameLetterGenerator,
  letterOrNumberGenerator,
  startsLikeGenerator,
  rhymesGenerator,
  clapsGenerator,
  wordGroupsGenerator,
  oppositesGenerator,
];

const BY_ID = new Map<string, SkillGenerator>(ALL.map((generator) => [generator.skillId, generator]));

export const REPEAT_WINDOW = 6;
const MAX_TRIES = 20;

export function allGenerators(): readonly SkillGenerator[] {
  return ALL;
}

export function generatorFor(skillId: string): SkillGenerator {
  const generator = BY_ID.get(skillId);
  if (!generator) throw new Error(`No generator for skill ${skillId}`);
  return generator;
}

export function clampLevel(generator: SkillGenerator, level: number): Level {
  const whole = Number.isFinite(level) ? Math.round(level) : 1;
  return Math.min(Math.max(whole, 1), generator.maxLevel) as Level;
}

function stamp(draft: QuestionDraft, skillId: string, level: Level, seed: number): Question {
  return { ...draft, skillId, level, seed, key: questionKey(skillId, level, draft.facts) } as Question;
}

// The question a generator gives for one level and seed. Pure: the same inputs give the same question.
export function generateFrom(generator: SkillGenerator, level: number, seed: number): Question {
  const clamped = clampLevel(generator, level);
  const whole = seed >>> 0;
  return stamp(generator.generate(clamped, makeRng(whole)), generator.skillId, clamped, whole);
}

export function generateQuestion(skillId: string, level: number, seed: number): Question {
  return generateFrom(generatorFor(skillId), level, seed);
}

export function exampleQuestion(skillId: string): Question {
  const generator = generatorFor(skillId);
  return stamp(generator.example(), skillId, 1, generator.exampleSeed);
}

// How many of the child's latest questions to steer clear of.
export function repeatWindow(generator: SkillGenerator, level: Level): number {
  const pool = generator.pool?.[level];
  return pool === undefined ? REPEAT_WINDOW : Math.max(0, Math.min(REPEAT_WINDOW, pool - 1));
}

// The next question for a child. recentKeys is the child's latest keys for this skill, oldest first.
// It never throws: after 20 tries it returns the last question it made.
// The question carries the seed that actually produced it.
export function nextQuestionFrom(
  generator: SkillGenerator,
  level: number,
  seed: number,
  recentKeys: readonly string[],
): Question {
  const clamped = clampLevel(generator, level);
  const window = repeatWindow(generator, clamped);
  const avoid = new Set(window === 0 ? [] : recentKeys.slice(-window));
  let question = generateFrom(generator, clamped, seed);
  for (let tries = 1; tries < MAX_TRIES && avoid.has(question.key); tries += 1) {
    question = generateFrom(generator, clamped, (seed >>> 0) + tries);
  }
  return question;
}

export function nextQuestion(skillId: string, level: number, seed: number, recentKeys: readonly string[]): Question {
  return nextQuestionFrom(generatorFor(skillId), level, seed, recentKeys);
}
