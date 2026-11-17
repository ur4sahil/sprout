import { ADJECTIVES_2, ANTONYMS, ANTONYMS_HARD, CONTRACTIONS, HOMOPHONES, LONG_I_WORDS, NOUNS_2, ONE_PART_WORDS, PAST_ED, PAST_ODD, PAST_SENTENCES, PLURALS_IES, PLURALS_ODD, PLURALS_S, PREFIXED, PUNCTUATION, R_WORDS, SUFFIXED, SYNONYMS, SYNONYMS_HARD, TEAM_WORDS_2, THREE_PART_WORDS, TWO_PARTS, VERBS_2 } from '../../src/content/data/phonics2';
import type { Oracle, OracleAnswer } from './types';
import { list, text } from './types';

// Language Arts grade 2, looked up in the grade 2 lists (plan section 5: an oracle reads the facts and the
// lists, never a generator). Relations:
//   teamWord2   the option that is the target word        team2       the letters the target is spelled with
//   parts2      how many parts the target word has        split2      the target split into its two parts, "rab-bit"
//   twoParts    the option with two parts                 prefixMeaning / prefixWord  a prefixed word's meaning, or the word for a meaning
//   suffixMeaning / suffixSentence  a suffixed word's meaning, or the word for a sentence
//   contractionShort / contractionLong  the contraction for two words, or the two words for it
//   synonym / antonym  the option that means the same as, or the opposite of, the target
//   homophone   the word the target sentence takes        wordKind    the bin (noun, verb, adjective) of each item
//   plural2     the plural of the target                  past        the past of the target verb
//   pastSentence the past word the target sentence takes   punctuation the option written right

function only(options: readonly string[], fits: (word: string) => boolean, relation: string): OracleAnswer {
  const found = options.filter(fits);
  if (found.length !== 1) throw new Error(`oracle ela2 ${relation}: ${found.length} options fit`);
  return { kind: 'value', value: found[0] as string };
}
const ofPair = (pairs: readonly (readonly [string, string])[], a: string, b: string): boolean => pairs.some(([x, y]) => (x === a && y === b) || (x === b && y === a));
const find = <T>(found: T | undefined, what: string): T => {
  if (found === undefined) throw new Error(`oracle ela2: ${what} is not in the lists`);
  return found;
};
const PAST = [...PAST_ED, ...PAST_ODD];

export const ela2: Oracle = (facts) => {
  const relation = text(facts, 'relation');
  const target = text(facts, 'target');
  const options = (): string[] => list(facts, 'options').map(String);
  switch (relation) {
    case 'teamWord2':
      return only(options(), (word) => word === target && TEAM_WORDS_2.some((each) => each.word === word), relation);
    case 'team2':
      return { kind: 'value', value: find([...TEAM_WORDS_2, ...LONG_I_WORDS, ...R_WORDS].find((each) => each.word === target), target).team };
    case 'parts2': {
      const count = ONE_PART_WORDS.includes(target) ? 1 : TWO_PARTS.some((each) => each.word === target) ? 2 : THREE_PART_WORDS.includes(target) ? 3 : undefined;
      return { kind: 'value', value: find(count, target) };
    }
    case 'split2':
      return { kind: 'value', value: find(TWO_PARTS.find((each) => each.word === target), target).parts.join('-') };
    case 'twoParts':
      return only(options(), (word) => TWO_PARTS.some((each) => each.word === word), relation);
    case 'prefixMeaning':
      return { kind: 'value', value: find(PREFIXED.find((each) => each.word === target), target).meaning };
    case 'prefixWord':
      return only(options(), (word) => PREFIXED.some((each) => each.word === word && each.meaning === target), relation);
    case 'suffixMeaning':
      return { kind: 'value', value: find(SUFFIXED.find((each) => each.word === target), target).meaning };
    case 'suffixSentence':
      return { kind: 'value', value: find(SUFFIXED.find((each) => each.sentence === target), target).word };
    case 'contractionShort':
      return { kind: 'value', value: find(CONTRACTIONS.find((each) => each.long === target), target).short };
    case 'contractionLong':
      return { kind: 'value', value: find(CONTRACTIONS.find((each) => each.short === target), target).long };
    case 'synonym':
      return only(options(), (word) => ofPair([...SYNONYMS, ...SYNONYMS_HARD], target, word), relation);
    case 'antonym':
      return only(options(), (word) => ofPair([...ANTONYMS, ...ANTONYMS_HARD], target, word), relation);
    case 'homophone':
      return { kind: 'value', value: find(HOMOPHONES.find((each) => each.sentence === target), target).word };
    case 'wordKind': {
      const bins = list(facts, 'bins').map(String);
      const kindOf = (word: string): string => find(NOUNS_2.includes(word) ? 'noun' : VERBS_2.includes(word) ? 'verb' : ADJECTIVES_2.includes(word) ? 'adjective' : undefined, word);
      return { kind: 'bins', bins: list(facts, 'items').map((word) => bins.indexOf(kindOf(String(word)))) };
    }
    case 'plural2':
      return { kind: 'value', value: find([...PLURALS_S, ...PLURALS_IES, ...PLURALS_ODD].find(([one]) => one === target), target)[1] };
    case 'past':
      return { kind: 'value', value: find(PAST.find(([verb]) => verb === target), target)[1] };
    case 'pastSentence': {
      const verb = find(PAST_SENTENCES.find((each) => each.sentence === target), target).verb;
      return { kind: 'value', value: find(PAST.find(([each]) => each === verb), verb)[1] };
    }
    case 'punctuation':
      return only(options(), (sentence) => PUNCTUATION.some((each) => each.right === sentence), relation);
  }
  throw new Error(`oracle ela2: unknown relation ${relation}`);
};
