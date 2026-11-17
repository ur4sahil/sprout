import type { SkillGenerator } from '../../generator';
import { dimesAndPenniesGenerator, sortThreeGenerator, tallerThanGenerator, tallyChartGenerator } from '../../generators/math/g1/h1-data';
import { countBackSubtractGenerator, downToTenGenerator, factFamilyGenerator, makeEqualGenerator, partStoriesGenerator, threeStoriesGenerator } from '../../generators/math/g1/h1-adding';
import { hearNumberGenerator, hundredChartGenerator, numberWordsTo100Generator, orderTo120Generator, showTensOnesGenerator } from '../../generators/math/g1/h1-numbers';
import { facesGenerator, shareSizeGenerator } from '../../generators/math/g1/h1-shapes';
import { daysGenerator, matchClocksGenerator, monthsGenerator } from '../../generators/math/g1/h1-time';
import { addOnLineGenerator, additionSentenceGenerator, makeFiveGenerator, plusOrTakeAwayGenerator, subtractionSentenceGenerator, takeAwayOnLineGenerator } from '../../generators/math/k/h1-adding';
import { enoughGenerator, groupVsNumberGenerator } from '../../generators/math/k/h1-comparing';
import { countBackGenerator, countOneKindGenerator, findTo20Generator, numberWordsTo10Generator, ordinalGenerator, tallyMarksGenerator } from '../../generators/math/k/h1-counting';
import { heavierGenerator, holdsMoreGenerator } from '../../generators/math/k/h1-measuring';
import { samePatternGenerator, sortRuleGenerator } from '../../generators/math/k/h1-patterns';
import { rollAndStackGenerator, shapesAroundGenerator } from '../../generators/math/k/h1-shapes';

// Generators added by plan section 15 wave H1. Appended to the registry.
export const GENERATORS: readonly SkillGenerator[] = [
  countOneKindGenerator,
  findTo20Generator,
  numberWordsTo10Generator,
  ordinalGenerator,
  countBackGenerator,
  tallyMarksGenerator,
  enoughGenerator,
  groupVsNumberGenerator,
  addOnLineGenerator,
  takeAwayOnLineGenerator,
  plusOrTakeAwayGenerator,
  additionSentenceGenerator,
  subtractionSentenceGenerator,
  makeFiveGenerator,
  shapesAroundGenerator,
  rollAndStackGenerator,
  heavierGenerator,
  holdsMoreGenerator,
  sortRuleGenerator,
  samePatternGenerator,
  hearNumberGenerator,
  showTensOnesGenerator,
  orderTo120Generator,
  hundredChartGenerator,
  numberWordsTo100Generator,
  factFamilyGenerator,
  threeStoriesGenerator,
  partStoriesGenerator,
  makeEqualGenerator,
  countBackSubtractGenerator,
  downToTenGenerator,
  matchClocksGenerator,
  daysGenerator,
  monthsGenerator,
  tallyChartGenerator,
  sortThreeGenerator,
  dimesAndPenniesGenerator,
  tallerThanGenerator,
  facesGenerator,
  shareSizeGenerator,
];
