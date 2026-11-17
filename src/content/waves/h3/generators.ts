import type { SkillGenerator } from '../../generator';
import { changeLetterGenerator, countSoundsGenerator, letterPlaceGenerator, moreClapsGenerator, sameEndGenerator, sameMiddleGenerator } from '../../generators/ela/k/h3-sounds';
import { matchWordsGenerator, printKindsGenerator, vowelsGenerator } from '../../generators/ela/k/h3-letters';
import { pickSentenceGenerator, readAnswerGenerator, realOrNotGenerator, storyOrderGenerator } from '../../generators/ela/k/h3-reading';
import { countWordsGenerator, gapWordsGenerator, namesGenerator, questionWordsGenerator, readActionGenerator } from '../../generators/ela/k/h3-sentences';
import { inNameGenerator, letterPictureGenerator } from '../../generators/ela/pk/h3-letters';
import { whatNextGenerator, whoDidGenerator } from '../../generators/ela/pk/h3-listening';
import { rhymeOrNotGenerator, sortByLetterGenerator, startsDifferentGenerator } from '../../generators/ela/pk/h3-sounds';
import { actionWordsGenerator, bodyWordsGenerator, feelingsGenerator, goesWithGenerator, helpersGenerator } from '../../generators/ela/pk/h3-words';

// Generators added by plan section 15 wave H3. Appended to the registry.
export const GENERATORS: readonly SkillGenerator[] = [
  letterPictureGenerator,
  inNameGenerator,
  startsDifferentGenerator,
  rhymeOrNotGenerator,
  sortByLetterGenerator,
  goesWithGenerator,
  feelingsGenerator,
  bodyWordsGenerator,
  actionWordsGenerator,
  helpersGenerator,
  whatNextGenerator,
  whoDidGenerator,
  matchWordsGenerator,
  vowelsGenerator,
  printKindsGenerator,
  sameMiddleGenerator,
  sameEndGenerator,
  countSoundsGenerator,
  changeLetterGenerator,
  moreClapsGenerator,
  letterPlaceGenerator,
  gapWordsGenerator,
  namesGenerator,
  questionWordsGenerator,
  countWordsGenerator,
  readActionGenerator,
  storyOrderGenerator,
  realOrNotGenerator,
  pickSentenceGenerator,
  readAnswerGenerator,
];
