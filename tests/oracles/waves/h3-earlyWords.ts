import { CVC_WORDS } from '../../../src/content/data/cvc';
import { FIRST_SOUNDS } from '../../../src/content/data/firstSounds';
import { CLAP_WORDS, SOUND_SPLITS } from '../../../src/content/data/h3-sounds';
import { ANSWERS, GAP_SENTENCES, NAMES, LONG_NAMES, REAL_SENTENCES, SEQUENCES, WHO_SENTENCES } from '../../../src/content/data/h3-stories';
import { ACTIONS, BODY_INSIDE, BODY_PARTS, BODY_USES, FEELING_STORIES, FEELINGS, GO_CLASHES, GO_CLOSE, GO_PAIRS, HELPERS } from '../../../src/content/data/h3-words';
import { RHYME_FAMILIES } from '../../../src/content/data/rhymes';
import { SENTENCE_PICTURES } from '../../../src/content/data/sentencePictures';
import { SYLLABLE_WORDS } from '../../../src/content/data/syllables';
import type { Facts } from '../../../src/engine/types';
import type { Oracle, OracleAnswer } from '../types';
import { list, text } from '../types';

// Language Arts pre-K and kindergarten, wave H3 (plan section 15). Every answer is worked out from the
// facts and the word lists, never from a generator. Relations:
//   letterPicture  the option word that starts with the target letter
//   inName         the option letter that is in the target name
//   notLike        the option word that does not start with the target word's sound
//   oddSound       the option word whose first sound differs from the other two
//   rhymePair      Yes when the two words in the target ("cat|hat") rhyme, otherwise No
//   oddRhyme       the option word that rhymes with neither of the others
//   letterBins     the bin (a first letter) for each item word
//   goesWith       the partner of the target; refuses an option from a close group or a clash
//   helper         the person who works with the target thing
//   feeling, bodyPart, action  the option that is the target word itself
//   feelingStory   the feeling in the story; refuses an option that could be argued for
//   bodyUse        the body part the question asks about; refuses an option that could be argued for
//   next           what comes after the target step in its sequence
//   whoDid         the character the question about the sentence asks for
//   vowel          the option letter that is a vowel (target 'vowel') or is not (target 'consonant')
//   printKind      letter, word or sentence, the bin for each item
//   sameVowel      the option short-vowel word with the target's vowel
//   sameEnd        the option short-vowel word that ends with the target's last letter
//   soundCount     how many sounds the target word has
//   swapLetter     the letter that turns facts.from into the target word
//   moreClaps      the option word with more claps
//   letterPlace    first, middle or last: where facts.letter sits in the target word
//   capitalName    the target written with capitals for names, the word I and the first word
//   questionWord   the option that answers the target question word
//   questionFor    the question word the target picture word answers
//   wordCount      how many words the target sentence has
//   gapWord        the word that fills the gap in the target sentence
//   storyFirst     the first step of the target sequence
//   storyOrder     the order of facts.items as the target sequence goes
//   realOrNot      real or make-believe
//   pictureSentence the sentence whose picture is the target word

function theOne(options: string[], fits: (option: string) => boolean, relation: string): OracleAnswer {
  const found = options.flatMap((option, index) => (fits(option) ? [index] : []));
  if (found.length !== 1) throw new Error(`oracle earlyWords ${relation}: ${found.length} options fit`);
  return { kind: 'index', index: found[0] as number };
}

function found<T>(value: T | undefined, what: string): T {
  if (value === undefined) throw new Error(`oracle earlyWords: ${what} is not in the lists`);
  return value;
}

const strings = (facts: Facts, name: string): string[] => list(facts, name).map(String);
const soundOf = (word: string): string => found(FIRST_SOUNDS.find((each) => each.word === word), word).sound;
const familyOf = (word: string): number => RHYME_FAMILIES.findIndex((family) => family.some((each) => each.word === word));
const VOWELS = ['a', 'e', 'i', 'o', 'u'];
const clapsOf = (word: string): number => found([...SYLLABLE_WORDS, ...CLAP_WORDS].find((each) => each.word === word), word).parts.length;
const cvc = (word: string): { word: string; vowel: string } => found(CVC_WORDS.find((each) => each.word === word), word);
const NAME_WORDS = [...NAMES, ...LONG_NAMES].map((name) => name.toLowerCase());

// Capital at the start, for every name and for the word I.
function capitalised(lower: string): string {
  return lower
    .split(' ')
    .map((word, i) => {
      const bare = word.replace(/[.?!]$/, '');
      const up = i === 0 || bare === 'i' || NAME_WORDS.includes(bare);
      return up ? word.charAt(0).toUpperCase() + word.slice(1) : word;
    })
    .join(' ');
}

function refuse(options: string[], banned: readonly string[], relation: string): void {
  const clash = options.find((option) => banned.includes(option));
  if (clash !== undefined) throw new Error(`oracle earlyWords ${relation}: ${clash} could be argued for`);
}

export const earlyWords: Oracle = (facts) => {
  const relation = text(facts, 'relation');
  const target = text(facts, 'target');
  const options = (): string[] => strings(facts, 'options');
  switch (relation) {
    case 'letterPicture':
      return theOne(options(), (word) => found(FIRST_SOUNDS.find((each) => each.word === word), word).letter === target, relation);
    case 'inName':
      return theOne(options(), (letter) => target.toUpperCase().includes(letter.toUpperCase()), relation);
    case 'notLike':
      return theOne(options(), (word) => soundOf(word) !== soundOf(target), relation);
    case 'oddSound': {
      const words = options();
      return theOne(words, (word) => words.filter((other) => soundOf(other) === soundOf(word)).length === 1, relation);
    }
    case 'rhymePair': {
      const [one, two] = target.split('|') as [string, string];
      const family = familyOf(one);
      if (family === -1 || familyOf(two) === -1) throw new Error(`oracle earlyWords rhymePair: ${target} is not in the lists`);
      return { kind: 'value', value: family === familyOf(two) ? 'Yes' : 'No' };
    }
    case 'oddRhyme': {
      const words = options();
      return theOne(words, (word) => words.filter((other) => familyOf(other) === familyOf(word)).length === 1, relation);
    }
    case 'letterBins': {
      const bins = strings(facts, 'bins');
      return { kind: 'bins', bins: strings(facts, 'items').map((word) => bins.indexOf(found(FIRST_SOUNDS.find((each) => each.word === word), word).letter)) };
    }
    case 'goesWith': {
      const pair = found(GO_PAIRS.find((each) => each.first.word === target), target);
      const close = (one: string, two: string): boolean => one === two || GO_CLOSE.some(([a, b]) => (a === one && b === two) || (a === two && b === one));
      const words = options();
      const others = GO_PAIRS.filter((each) => each !== pair && close(each.group, pair.group)).map((each) => each.second.word);
      refuse(words, [...others, ...GO_CLASHES.filter(([first]) => first === target).map(([, second]) => second)], relation);
      return theOne(words, (word) => word === pair.second.word, relation);
    }
    case 'helper': {
      const helper = found(HELPERS.find((each) => each.thing.word === target), target);
      refuse(options(), helper.clash === undefined ? [] : [helper.clash], relation);
      return theOne(options(), (word) => word === helper.helper.word, relation);
    }
    case 'feeling':
      found(FEELINGS.find((each) => each.word === target), target);
      return theOne(options(), (word) => word === target, relation);
    case 'bodyPart':
      found(BODY_PARTS.find((each) => each.word === target), target);
      // A picture that also shows the part asked for (the arm shows a fist) could be argued for.
      refuse(options(), BODY_INSIDE.filter(([inner]) => inner === target).map(([, outer]) => outer), relation);
      return theOne(options(), (word) => word === target, relation);
    case 'action':
      found(ACTIONS.find((each) => each.verb === target), target);
      return theOne(options(), (word) => word === target, relation);
    case 'feelingStory': {
      const story = found(FEELING_STORIES.find((each) => each.story === text(facts, 'story')), 'that story');
      refuse(options(), story.also, relation);
      return { kind: 'value', value: story.feeling };
    }
    case 'bodyUse': {
      const use = found(BODY_USES.find((each) => each.ask === text(facts, 'ask')), 'that question');
      refuse(options(), use.also, relation);
      return { kind: 'value', value: use.part };
    }
    case 'next': {
      const sequence = found(SEQUENCES.find((each) => each.steps.slice(0, -1).some((step) => step.word === target)), target);
      const at = sequence.steps.findIndex((step) => step.word === target);
      return { kind: 'value', value: (sequence.steps[at + 1] as { word: string }).word };
    }
    case 'whoDid': {
      // Read as written (kindergarten) or as a pre-K child hears it.
      const story = text(facts, 'story');
      const ask = text(facts, 'ask');
      const said = (each: (typeof WHO_SENTENCES)[number]): boolean => (each.sentence === story && each.ask === ask) || (each.heard?.sentence === story && each.heard.ask === ask);
      return { kind: 'value', value: found(WHO_SENTENCES.find(said), 'that sentence').answer.word };
    }
    case 'vowel':
      return theOne(options(), (letter) => VOWELS.includes(letter.toLowerCase()) === (target === 'vowel'), relation);
    case 'printKind': {
      const bins = strings(facts, 'bins');
      const kind = (item: string): string => (item.includes(' ') ? 'sentence' : item.length === 1 ? 'letter' : 'word');
      return { kind: 'bins', bins: strings(facts, 'items').map((item) => bins.indexOf(kind(item))) };
    }
    case 'sameVowel':
      return theOne(options(), (word) => cvc(word).vowel === cvc(target).vowel, relation);
    case 'sameEnd': {
      // An x ends with two sounds and an s can sound like z, so neither is used.
      const words = options();
      if ([target, ...words].some((word) => /[sx]$/.test(cvc(word).word))) throw new Error('oracle earlyWords sameEnd: a word ends in s or x');
      return theOne(words, (word) => word.slice(-1) === target.slice(-1), relation);
    }
    case 'soundCount':
      return { kind: 'value', value: found(SOUND_SPLITS.find((each) => each.word === target), target).sounds.length };
    case 'swapLetter': {
      const from = text(facts, 'from');
      cvc(target);
      const differ = [...target].flatMap((letter, i) => (letter === from.charAt(i) ? [] : [i]));
      if (from.length !== target.length || differ.length !== 1) throw new Error(`oracle earlyWords swapLetter: ${from} and ${target} are not one letter apart`);
      return { kind: 'value', value: target.charAt(differ[0] as number) };
    }
    case 'moreClaps': {
      const words = options();
      const most = Math.max(...words.map(clapsOf));
      return theOne(words, (word) => clapsOf(word) === most, relation);
    }
    case 'letterPlace': {
      const letter = text(facts, 'letter');
      const at = [...target].flatMap((each, i) => (each === letter ? [i] : []));
      if (at.length !== 1) throw new Error(`oracle earlyWords letterPlace: ${letter} is in ${target} ${at.length} times`);
      return { kind: 'value', value: at[0] === 0 ? 'first' : at[0] === target.length - 1 ? 'last' : 'middle' };
    }
    case 'capitalName':
      return { kind: 'value', value: capitalised(target) };
    case 'questionWord':
      return theOne(options(), (word) => found(ANSWERS.find((each) => each.word === word), word).kind === target, relation);
    case 'questionFor':
      return { kind: 'value', value: found(ANSWERS.find((each) => each.word === target), target).kind };
    case 'wordCount':
      return { kind: 'value', value: target.split(' ').filter((word) => word.length > 0).length };
    case 'gapWord': {
      const gap = found(GAP_SENTENCES.find((each) => target === `${each.before} ${each.answer} ${each.after}`), 'that sentence');
      return { kind: 'value', value: gap.answer };
    }
    case 'storyFirst':
      return { kind: 'value', value: (found(SEQUENCES.find((each) => each.id === target), target).steps[0] as { word: string }).word };
    case 'storyOrder': {
      const steps = found(SEQUENCES.find((each) => each.id === target), target).steps.map((step) => step.word);
      const items = strings(facts, 'items');
      if (items.length !== steps.length) throw new Error('oracle earlyWords storyOrder: the items are not the whole sequence');
      return { kind: 'order', order: steps.map((word) => items.indexOf(word)) };
    }
    case 'realOrNot':
      return { kind: 'value', value: found(REAL_SENTENCES.find((each) => each.sentence === target), 'that sentence').real ? 'real' : 'make-believe' };
    case 'pictureSentence':
      return { kind: 'value', value: found(SENTENCE_PICTURES.find((each) => each.word === target), target).sentence };
  }
  throw new Error(`oracle earlyWords: unknown relation ${relation}`);
};
