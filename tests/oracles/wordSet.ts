import { ANALOGY_PAIRS } from '../../src/content/data/analogies';
import { GROUP_WORDS } from '../../src/content/data/categories';
import { FIRST_SOUNDS } from '../../src/content/data/firstSounds';
import { OPPOSITE_PAIRS, SIZE_PAIR } from '../../src/content/data/opposites';
import { RHYME_FAMILIES } from '../../src/content/data/rhymes';
import { RIDDLES } from '../../src/content/data/riddles';
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
    default:
      throw new Error(`oracle wordSet: the relation ${relation} is not written yet`);
  }
};
