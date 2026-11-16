import { ANALOGY_PAIRS } from '../../src/content/data/analogies';
import { GROUP_WORDS } from '../../src/content/data/categories';
import { COUNTABLES } from '../../src/content/data/countables';
import { CVC_WORDS } from '../../src/content/data/cvc';
import { WORD_FAMILIES } from '../../src/content/data/families';
import { FIRST_SOUNDS } from '../../src/content/data/firstSounds';
import { DESCRIBING_SENTENCES } from '../../src/content/data/describing';
import { OPPOSITE_PAIRS, SIZE_PAIR } from '../../src/content/data/opposites';
import { BLEND_ENDS, BLEND_STARTS, DESCRIBING_PICTURES, DIGRAPH_ENDS, DIGRAPH_STARTS, OPPOSITES_1, SAME_MEANING, SILENT_E_PAIRS, VOWEL_TEAM_WORDS } from '../../src/content/data/phonics1';
import { RHYME_FAMILIES } from '../../src/content/data/rhymes';
import { RIDDLES } from '../../src/content/data/riddles';
import { SENTENCE_PICTURES } from '../../src/content/data/sentencePictures';
import { ALL_SIGHT_WORDS, SOUND_ALIKE } from '../../src/content/data/sightWords';
import { SYLLABLE_WORDS } from '../../src/content/data/syllables';
import type { Oracle, OracleAnswer } from './types';
import { list, text } from './types';

// Answers looked up in the section 9 word lists. It reads the same lists as the generators,
// so it catches a generator misusing a list, not a mistake in the list (plan section 5).
//
// Relations written so far:
//   firstSound  the one option that starts with the same sound as the target, and is not the target
//   rhyme       the one option in the target's rhyme family, and is not the target
//   category    the one option in the group the target names
//   opposite    the one option that is the target's opposite
//   syllables   how many parts the target word has
//   analogyPair the one option that is the second half of the pair the target starts
//   riddle      the one option that answers the riddle the target spells out
//   firstLetter the letter the target word starts with (first sounds list)
//   lastLetter  the letter a short-vowel word ends with
//   middleVowel the vowel in the middle of a short-vowel word
//   cvc         the one option that is the short-vowel word itself
//   family      the one option in the target's word family, and is not the target
//   notFamily   the one option that is not in the family the target names by its ending
//   sightWord   the one option that is the sight word itself. Fails when an option sounds like it
//   plural      the word for one, or for more than one, of the thing the target names
//   sentencePicture  the one option that is the word the target sentence's picture shows
//   digraph, blend, vowelTeam  the letters that are missing from the target word
//   teamWord    the one option that is the vowel team word itself
//   silentE     the one option that is the target, a word from the silent e pairs
//   opposite1   the one option that is the target's opposite in the grade 1 list
//   same        the one option that means the same as the target
//   describing  the describing word of the target sentence
//   describingPicture  the one option that is the target describing word. Fails if big meets tall

function theOne(options: string[], fits: (word: string) => boolean, relation: string): OracleAnswer {
  const found = options.flatMap((word, index) => (fits(word) ? [index] : []));
  if (found.length !== 1) throw new Error(`oracle wordSet ${relation}: ${found.length} options fit`);
  return { kind: 'index', index: found[0] as number };
}

function words(facts: Parameters<Oracle>[0]): string[] {
  return list(facts, 'options').map((option) => {
    if (typeof option !== 'string') throw new Error('oracle wordSet: every option must be a word');
    return option;
  });
}

function oppositeOf(word: string): string {
  if (word === SIZE_PAIR[0]) return SIZE_PAIR[1];
  if (word === SIZE_PAIR[1]) return SIZE_PAIR[0];
  for (const [one, two] of OPPOSITE_PAIRS) {
    if (one.word === word) return two.word;
    if (two.word === word) return one.word;
  }
  throw new Error(`oracle wordSet opposite: ${word} has no opposite in the list`);
}

export const wordSet: Oracle = (facts) => {
  const target = text(facts, 'target');
  const relation = text(facts, 'relation');
  switch (relation) {
    case 'firstSound': {
      const sound = FIRST_SOUNDS.find((entry) => entry.word === target)?.sound;
      if (sound === undefined) throw new Error(`oracle wordSet firstSound: ${target} is not in the list`);
      return theOne(words(facts), (word) => word !== target && FIRST_SOUNDS.find((entry) => entry.word === word)?.sound === sound, relation);
    }
    case 'rhyme': {
      const family = RHYME_FAMILIES.find((members) => members.some((member) => member.word === target));
      if (!family) throw new Error(`oracle wordSet rhyme: ${target} is not in the list`);
      return theOne(words(facts), (word) => word !== target && family.some((member) => member.word === word), relation);
    }
    case 'category': {
      if (!GROUP_WORDS.some((entry) => entry.group === target)) throw new Error(`oracle wordSet category: ${target} is not a group`);
      return theOne(words(facts), (word) => GROUP_WORDS.some((entry) => entry.word === word && entry.group === target), relation);
    }
    case 'opposite': {
      const opposite = oppositeOf(target);
      return theOne(words(facts), (word) => word === opposite, relation);
    }
    case 'syllables': {
      const entry = SYLLABLE_WORDS.find((candidate) => candidate.word === target);
      if (!entry) throw new Error(`oracle wordSet syllables: ${target} is not in the list`);
      return { kind: 'value', value: entry.parts.length };
    }
    case 'analogyPair': {
      const pair = ANALOGY_PAIRS.find((candidate) => candidate.first.word === target);
      if (!pair) throw new Error(`oracle wordSet analogyPair: ${target} starts no pair in the list`);
      return theOne(words(facts), (word) => word === pair.second.word, relation);
    }
    case 'riddle': {
      const riddle = RIDDLES.find((candidate) => candidate.riddle === target);
      if (!riddle) throw new Error('oracle wordSet riddle: that riddle is not in the list');
      return theOne(words(facts), (word) => word === riddle.word, relation);
    }
    case 'firstLetter': {
      const entry = FIRST_SOUNDS.find((candidate) => candidate.word === target);
      if (!entry) throw new Error(`oracle wordSet firstLetter: ${target} is not in the list`);
      return { kind: 'value', value: entry.letter };
    }
    case 'lastLetter':
    case 'middleVowel': {
      const entry = CVC_WORDS.find((candidate) => candidate.word === target);
      if (!entry) throw new Error(`oracle wordSet ${relation}: ${target} is not a short-vowel word in the list`);
      return { kind: 'value', value: relation === 'lastLetter' ? target.slice(-1) : entry.vowel };
    }
    case 'cvc': {
      if (!CVC_WORDS.some((candidate) => candidate.word === target)) throw new Error(`oracle wordSet cvc: ${target} is not in the list`);
      return theOne(words(facts), (word) => word === target, relation);
    }
    case 'family': {
      const family = WORD_FAMILIES.find((candidate) => candidate.words.includes(target));
      if (!family) throw new Error(`oracle wordSet family: ${target} is in no family`);
      return theOne(words(facts), (word) => word !== target && family.words.includes(word), relation);
    }
    case 'notFamily': {
      const family = WORD_FAMILIES.find((candidate) => candidate.ending === target);
      if (!family) throw new Error(`oracle wordSet notFamily: there is no family ${target}`);
      return theOne(words(facts), (word) => !family.words.includes(word), relation);
    }
    case 'sightWord': {
      if (!ALL_SIGHT_WORDS.includes(target)) throw new Error(`oracle wordSet sightWord: ${target} is not a sight word`);
      const options = words(facts);
      const clash = options.find((word) => word !== target && SOUND_ALIKE.some((group) => group.includes(word) && group.includes(target)));
      if (clash !== undefined) throw new Error(`oracle wordSet sightWord: ${clash} sounds like ${target}`);
      return theOne(options, (word) => word === target, relation);
    }
    case 'plural': {
      const thing = COUNTABLES.find((candidate) => candidate.one === target);
      if (!thing) throw new Error(`oracle wordSet plural: ${target} is not in the list`);
      if (thing.one === thing.many) throw new Error(`oracle wordSet plural: ${target} is the same word for one and many`);
      const many = facts.many;
      if (typeof many !== 'boolean') throw new Error('oracle wordSet plural: facts.many must say whether there is more than one');
      return { kind: 'value', value: many ? thing.many : thing.one };
    }
    case 'sentencePicture': {
      const entry = SENTENCE_PICTURES.find((candidate) => candidate.sentence === target);
      if (!entry) throw new Error('oracle wordSet sentencePicture: that sentence is not in the list');
      return theOne(words(facts), (word) => word === entry.word, relation);
    }
    case 'digraph':
    case 'blend':
    case 'vowelTeam': {
      const list = relation === 'digraph' ? [...DIGRAPH_STARTS, ...DIGRAPH_ENDS] : relation === 'blend' ? [...BLEND_STARTS, ...BLEND_ENDS] : VOWEL_TEAM_WORDS;
      const entry = list.find((candidate) => candidate.word === target);
      if (!entry) throw new Error(`oracle wordSet ${relation}: ${target} is not in the list`);
      return { kind: 'value', value: entry.part };
    }
    case 'teamWord': {
      if (!VOWEL_TEAM_WORDS.some((candidate) => candidate.word === target)) throw new Error(`oracle wordSet teamWord: ${target} is not in the list`);
      return theOne(words(facts), (word) => word === target, relation);
    }
    case 'silentE': {
      if (!SILENT_E_PAIRS.some((pair) => pair.includes(target))) throw new Error(`oracle wordSet silentE: ${target} is not in the pairs`);
      return theOne(words(facts), (word) => word === target, relation);
    }
    case 'opposite1':
    case 'same': {
      const pairs = relation === 'same' ? SAME_MEANING : OPPOSITES_1;
      const partners = pairs.flatMap(([one, two]) => (one === target ? [two] : two === target ? [one] : []));
      if (partners.length === 0) throw new Error(`oracle wordSet ${relation}: ${target} has no partner in the list`);
      return theOne(words(facts), (word) => partners.includes(word), relation);
    }
    case 'describing': {
      const entry = DESCRIBING_SENTENCES.find((candidate) => candidate.sentence === target);
      if (!entry) throw new Error('oracle wordSet describing: that sentence is not in the list');
      return theOne(words(facts), (word) => word === entry.describing, relation);
    }
    case 'describingPicture': {
      if (!DESCRIBING_PICTURES.some((candidate) => candidate.word === target)) throw new Error(`oracle wordSet describingPicture: ${target} has no picture`);
      const options = words(facts);
      if (options.includes('big') && options.includes('tall')) throw new Error('oracle wordSet describingPicture: big and tall are offered together');
      return theOne(options, (word) => word === target, relation);
    }
    default:
      throw new Error(`oracle wordSet: the relation ${relation} is not written yet`);
  }
};
