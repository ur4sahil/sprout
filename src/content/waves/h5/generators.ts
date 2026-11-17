import type { SkillGenerator } from '../../generator';
import { subtractZerosGenerator, whichOperationGenerator } from '../../generators/math/g3/h5-addSubtract';
import { compareStoriesGenerator, fractionOfSetGenerator, wholeFractionsGenerator } from '../../generators/math/g3/h5-fractions';
import { perimeterAreaGenerator, timeProblemsGenerator, twoAreasGenerator } from '../../generators/math/g3/h5-measure';
import {
  distributiveGenerator,
  divideStoriesGenerator,
  divisionBlanksGenerator,
  estimateProductsGenerator,
  multiplyStoriesGenerator,
  propertiesGenerator,
  timesPatternsGenerator,
} from '../../generators/math/g3/h5-multiply';

// Generators added by plan section 15 wave H5. Appended to the registry.
export const GENERATORS: readonly SkillGenerator[] = [
  subtractZerosGenerator,
  whichOperationGenerator,
  propertiesGenerator,
  distributiveGenerator,
  multiplyStoriesGenerator,
  timesPatternsGenerator,
  estimateProductsGenerator,
  divideStoriesGenerator,
  divisionBlanksGenerator,
  wholeFractionsGenerator,
  fractionOfSetGenerator,
  compareStoriesGenerator,
  twoAreasGenerator,
  perimeterAreaGenerator,
  timeProblemsGenerator,
];
