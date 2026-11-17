import type { SkillGenerator } from '../../generator';
import { endingsGenerator, endPartsGenerator, yVowelGenerator } from '../../generators/ela/g1/h4-phonics';
import { abcOrderGenerator, sightFiveGenerator, wordGroupsGenerator } from '../../generators/ela/g1/h4-words';
import { agreeGenerator, capitalsGenerator, joiningGenerator, pronounsGenerator, properNounsGenerator, questionWordsGenerator } from '../../generators/ela/g1/h4-grammar';
import { feelingsGenerator, storyOrFactsGenerator, tellerGenerator } from '../../generators/ela/g1/h4-reading';
import { silentLettersGenerator, softHardGenerator, soundTeamsGenerator } from '../../generators/ela/g2/h4-phonics';
import { abcSecondGenerator, guideWordsGenerator, shadesGenerator, twoMeaningsGenerator } from '../../generators/ela/g2/h4-words';
import { adverbsGenerator, collectivesGenerator, completeGenerator, reflexivesGenerator } from '../../generators/ela/g2/h4-grammar';
import { compareStoriesGenerator, featuresGenerator, poemsGenerator, purposeGenerator } from '../../generators/ela/g2/h4-reading';

// Generators added by plan section 15 wave H4. Appended to the registry.
export const GENERATORS: readonly SkillGenerator[] = [
  endingsGenerator,
  endPartsGenerator,
  yVowelGenerator,
  sightFiveGenerator,
  abcOrderGenerator,
  wordGroupsGenerator,
  pronounsGenerator,
  agreeGenerator,
  capitalsGenerator,
  properNounsGenerator,
  questionWordsGenerator,
  joiningGenerator,
  storyOrFactsGenerator,
  tellerGenerator,
  feelingsGenerator,
  soundTeamsGenerator,
  softHardGenerator,
  silentLettersGenerator,
  shadesGenerator,
  twoMeaningsGenerator,
  abcSecondGenerator,
  guideWordsGenerator,
  collectivesGenerator,
  reflexivesGenerator,
  adverbsGenerator,
  completeGenerator,
  featuresGenerator,
  poemsGenerator,
  compareStoriesGenerator,
  purposeGenerator,
];
