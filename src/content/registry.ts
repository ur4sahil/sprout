import { questionKey } from '../engine/canonical';
import { makeRng } from '../engine/rng';
import type { Level, Question, QuestionDraft } from '../engine/types';
import type { SkillGenerator } from './generator';
import { kindsOfWordsGenerator, pastTenseGenerator, plurals2Generator, punctuationGenerator } from './generators/ela/g2/grammar';
import { bossyRGenerator, twoPartsGenerator, vowelTeams2Generator } from './generators/ela/g2/phonics';
import { mainIdeaGenerator, orderOfEventsGenerator, readStory2Generator } from './generators/ela/g2/reading';
import { contractionsGenerator, homophonesGenerator, prefixesGenerator, suffixesGenerator, synonymsGenerator } from './generators/ela/g2/words';
import { contextWordsGenerator, g1CharactersGenerator, g1FactsGenerator, g2FactsGenerator, kCharactersGenerator, kFactsGenerator, retell1Generator, retell2Generator, trueFalseGenerator } from './generators/ela/comprehension';
import { describingGenerator, endMarksGenerator, nounsAndVerbsGenerator, readStoryGenerator } from './generators/ela/g1/grammar';
import { blendsGenerator, digraphsGenerator, shortOrLongGenerator, silentEGenerator, vowelTeamsGenerator } from './generators/ela/g1/phonics';
import { compoundsGenerator, meaningsGenerator, sightWordsFourGenerator } from './generators/ela/g1/words';
import { abcOrderGenerator, matchAllLettersGenerator } from './generators/ela/k/letters';
import { firstLetterGenerator, lastLetterGenerator, middleVowelGenerator, readWordGenerator, rhymingWordsGenerator, spellWordGenerator, wordFamiliesGenerator } from './generators/ela/k/phonics';
import { capitalsGenerator, namingWordsGenerator, oneOrManyGenerator, readSentenceGenerator } from './generators/ela/k/sentences';
import { sightWordsOneGenerator, sightWordsThreeGenerator, sightWordsTwoGenerator } from './generators/ela/k/sightWords';
import { findLowercaseGenerator, findUppercaseGenerator, sameLetterGenerator } from './generators/ela/pk/letters';
import { letterOrNumberGenerator, matchLettersGenerator } from './generators/ela/pk/matchAndSort';
import { clapsGenerator, rhymesGenerator, startsLikeGenerator } from './generators/ela/pk/sounds';
import { oppositesGenerator, wordGroupsGenerator } from './generators/ela/pk/words';
import { addPicturesTo10Generator, addPicturesTo5Generator, addTo5Generator } from './generators/math/k/adding';
import { addThreeGenerator, addWithin20Generator, doublesGenerator, subtractWithin20Generator } from './generators/math/g1/addSubtract';
import { addSubtractTensGenerator, twoDigitPlusOneGenerator, wordProblemsGenerator } from './generators/math/g1/bigger';
import { makeTenToAddGenerator, missingInEquationGenerator, trueOrFalseGenerator } from './generators/math/g1/equations';
import { coinsGenerator, orderByLengthGenerator, pictureGraphsGenerator, tellTimeGenerator } from './generators/math/g1/measure';
import { countTo120Generator, numberPatternsGenerator, skipCountGenerator, tenMoreLessGenerator } from './generators/math/g1/numbers';
import { compareTwoDigitGenerator, tensAndOnesGenerator } from './generators/math/g1/placeValue';
import { halvesAndFourthsGenerator, shapeAttributesGenerator } from './generators/math/g1/shapes';
import { addNoRegroupGenerator, addRegroupGenerator, addWithin1000Generator, subtractNoRegroupGenerator, subtractRegroupGenerator, subtractWithin1000Generator, tenOrHundredGenerator } from './generators/math/g2/addSubtract';
import { barGraphsGenerator, countCoinsGenerator, rulerGenerator, timeToFiveGenerator } from './generators/math/g2/measure';
import { compareThreeDigitGenerator, evenOddGenerator, expandedFormGenerator, hundredsTensOnesGenerator, numberLinesGenerator, skipCountBigGenerator } from './generators/math/g2/numbers';
import { halvesThirdsFourthsGenerator, nameBySidesGenerator } from './generators/math/g2/shapes';
import { addRegroup1000Generator, estimateGenerator, subtractRegroup1000Generator, twoStep3Generator } from './generators/math/g3/addSubtract';
import { arrays3Generator, divisionFactsGenerator, equalGroupsGenerator, factFamiliesGenerator, missingFactorGenerator, shareEquallyGenerator, times2510Generator, times34Generator, times6789Generator } from './generators/math/g3/multiply';
import { composeShapesGenerator, measurableGenerator, positionWordsGenerator } from './generators/math/k/gaps';
import { countOnGenerator, howManyPiecesGenerator, paperClipsGenerator, subtractByAddingGenerator, turnaroundGenerator } from './generators/math/g1/gaps';
import { addManyGenerator, compareLengthsGenerator, linePlots2Generator, rowsColumnsGenerator, unitsGenerator } from './generators/math/g2/gaps';
import { compareFractionsGenerator, equalFractionsGenerator, fractionLineGenerator, nameFractionsGenerator } from './generators/math/g3/fractions';
import { areaGenerator, elapsedTimeGenerator, linePlotsGenerator, massVolumeGenerator, perimeterGenerator, scaledGraphsGenerator, timeToMinuteGenerator } from './generators/math/g3/measure';
import { equalAreaGenerator, patterns3Generator, quadrilateralsGenerator, timesTensGenerator } from './generators/math/g3/patternsShapes';
import { compareFourDigitGenerator, numberNamesGenerator, placeValue4Generator, roundingGenerator } from './generators/math/g3/numbers';
import { arraysGenerator, twoStepGenerator, wordProblems100Generator } from './generators/math/g2/stories';
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
import { figureAnalogiesGenerator, figureMatricesGenerator, patternCompletionGenerator, twoRulePatternsGenerator } from './generators/reasoning/figures';
import { numberAnalogiesGenerator, numberPuzzlesGenerator, numberSeriesGenerator } from './generators/reasoning/numbers';
import { oddOneOutGenerator, pictureAnalogiesGenerator, pictureRiddlesGenerator, whichBelongsGenerator } from './generators/reasoning/pictures';
import { mirrorImagesGenerator, paperFoldingGenerator, turningShapesGenerator } from './generators/reasoning/turns';
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
  countTo120Generator,
  skipCountGenerator,
  tensAndOnesGenerator,
  compareTwoDigitGenerator,
  tenMoreLessGenerator,
  addWithin20Generator,
  subtractWithin20Generator,
  doublesGenerator,
  makeTenToAddGenerator,
  missingInEquationGenerator,
  trueOrFalseGenerator,
  addThreeGenerator,
  twoDigitPlusOneGenerator,
  addSubtractTensGenerator,
  wordProblemsGenerator,
  tellTimeGenerator,
  orderByLengthGenerator,
  pictureGraphsGenerator,
  coinsGenerator,
  halvesAndFourthsGenerator,
  shapeAttributesGenerator,
  numberPatternsGenerator,
  hundredsTensOnesGenerator,
  expandedFormGenerator,
  compareThreeDigitGenerator,
  skipCountBigGenerator,
  evenOddGenerator,
  numberLinesGenerator,
  addNoRegroupGenerator,
  addRegroupGenerator,
  subtractNoRegroupGenerator,
  subtractRegroupGenerator,
  addWithin1000Generator,
  subtractWithin1000Generator,
  tenOrHundredGenerator,
  arraysGenerator,
  wordProblems100Generator,
  twoStepGenerator,
  placeValue4Generator,
  numberNamesGenerator,
  compareFourDigitGenerator,
  roundingGenerator,
  addRegroup1000Generator,
  subtractRegroup1000Generator,
  estimateGenerator,
  twoStep3Generator,
  equalGroupsGenerator,
  arrays3Generator,
  times2510Generator,
  times34Generator,
  times6789Generator,
  missingFactorGenerator,
  shareEquallyGenerator,
  divisionFactsGenerator,
  factFamiliesGenerator,
  patterns3Generator,
  timesTensGenerator,
  nameFractionsGenerator,
  fractionLineGenerator,
  compareFractionsGenerator,
  equalFractionsGenerator,
  timeToMinuteGenerator,
  elapsedTimeGenerator,
  areaGenerator,
  perimeterGenerator,
  massVolumeGenerator,
  scaledGraphsGenerator,
  linePlotsGenerator,
  quadrilateralsGenerator,
  equalAreaGenerator,
  positionWordsGenerator,
  composeShapesGenerator,
  measurableGenerator,
  turnaroundGenerator,
  subtractByAddingGenerator,
  countOnGenerator,
  paperClipsGenerator,
  howManyPiecesGenerator,
  addManyGenerator,
  unitsGenerator,
  compareLengthsGenerator,
  linePlots2Generator,
  rowsColumnsGenerator,
  vowelTeams2Generator,
  bossyRGenerator,
  twoPartsGenerator,
  prefixesGenerator,
  suffixesGenerator,
  contractionsGenerator,
  synonymsGenerator,
  homophonesGenerator,
  kindsOfWordsGenerator,
  plurals2Generator,
  pastTenseGenerator,
  punctuationGenerator,
  readStory2Generator,
  mainIdeaGenerator,
  orderOfEventsGenerator,
  kCharactersGenerator,
  kFactsGenerator,
  g1CharactersGenerator,
  retell1Generator,
  trueFalseGenerator,
  g1FactsGenerator,
  retell2Generator,
  g2FactsGenerator,
  contextWordsGenerator,
  timeToFiveGenerator,
  countCoinsGenerator,
  rulerGenerator,
  barGraphsGenerator,
  nameBySidesGenerator,
  halvesThirdsFourthsGenerator,
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
  abcOrderGenerator,
  matchAllLettersGenerator,
  firstLetterGenerator,
  lastLetterGenerator,
  middleVowelGenerator,
  readWordGenerator,
  spellWordGenerator,
  rhymingWordsGenerator,
  wordFamiliesGenerator,
  sightWordsOneGenerator,
  sightWordsTwoGenerator,
  sightWordsThreeGenerator,
  capitalsGenerator,
  namingWordsGenerator,
  oneOrManyGenerator,
  readSentenceGenerator,
  digraphsGenerator,
  blendsGenerator,
  silentEGenerator,
  vowelTeamsGenerator,
  shortOrLongGenerator,
  sightWordsFourGenerator,
  compoundsGenerator,
  meaningsGenerator,
  nounsAndVerbsGenerator,
  describingGenerator,
  endMarksGenerator,
  readStoryGenerator,
  oddOneOutGenerator,
  whichBelongsGenerator,
  figureAnalogiesGenerator,
  figureMatricesGenerator,
  turningShapesGenerator,
  mirrorImagesGenerator,
  twoRulePatternsGenerator,
  numberAnalogiesGenerator,
  pictureAnalogiesGenerator,
  numberSeriesGenerator,
  numberPuzzlesGenerator,
  paperFoldingGenerator,
  patternCompletionGenerator,
  pictureRiddlesGenerator,
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
