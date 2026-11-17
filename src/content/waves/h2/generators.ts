import { acrossZerosGenerator, evenOddSumsGenerator, missingTo100Generator, placeSplitGenerator, storyProblemsGenerator } from '../../generators/math/g2/h2-addSubtract';
import { amPmGenerator, graphProblemsGenerator, makeAmountGenerator, metricGenerator, moneyStoriesGenerator } from '../../generators/math/g2/h2-measure';
import { beforeAfterGenerator, chartGenerator, digitsMakeGenerator, doublesGenerator, numberNames2Generator, orderNumbersGenerator, regroupGenerator, showBlocksGenerator } from '../../generators/math/g2/h2-numbers';
import { solidPartsGenerator } from '../../generators/math/g2/h2-shapes';
import { heavyLightGenerator, moreLessGenerator, mostFewestGenerator } from '../../generators/math/pk/h2-compare';
import { firstLastGenerator, numberOrderGenerator, oneFewerGenerator, oneMoreGenerator, sameNumberGenerator } from '../../generators/math/pk/h2-counting';
import { fillGapGenerator, samePatternGenerator, sortKindGenerator } from '../../generators/math/pk/h2-patterns';
import { ballBoxCanGenerator, coloursAroundGenerator, orderSizeGenerator, sameShapeGenerator, shapesAroundGenerator } from '../../generators/math/pk/h2-shapes';
import type { SkillGenerator } from '../../generator';

// Generators added by plan section 15 wave H2. Appended to the registry.
export const GENERATORS: readonly SkillGenerator[] = [
  // Math pre-K
  oneMoreGenerator,
  oneFewerGenerator,
  sameNumberGenerator,
  numberOrderGenerator,
  firstLastGenerator,
  moreLessGenerator,
  mostFewestGenerator,
  heavyLightGenerator,
  shapesAroundGenerator,
  sameShapeGenerator,
  coloursAroundGenerator,
  ballBoxCanGenerator,
  orderSizeGenerator,
  fillGapGenerator,
  samePatternGenerator,
  sortKindGenerator,
  // Math grade 2
  numberNames2Generator,
  orderNumbersGenerator,
  regroupGenerator,
  doublesGenerator,
  beforeAfterGenerator,
  showBlocksGenerator,
  digitsMakeGenerator,
  chartGenerator,
  acrossZerosGenerator,
  missingTo100Generator,
  storyProblemsGenerator,
  placeSplitGenerator,
  evenOddSumsGenerator,
  amPmGenerator,
  moneyStoriesGenerator,
  makeAmountGenerator,
  graphProblemsGenerator,
  metricGenerator,
  solidPartsGenerator,
];
