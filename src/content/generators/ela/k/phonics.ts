import type { Rng } from '../../../../engine/rng';
import { makeRng } from '../../../../engine/rng';
import type { LessonStep, Level, QuestionDraft, Say, SortBin, Visual } from '../../../../engine/types';
import type { CvcWord, ShortVowel } from '../../../data/cvc';
import { CLOSEST_VOWEL, CVC_WORDS, SHORT_VOWELS } from '../../../data/cvc';
import type { WordFamily } from '../../../data/families';
import { WORD_FAMILIES } from '../../../data/families';
import { FIRST_SOUNDS } from '../../../data/firstSounds';
import { ALPHABET, LOOK_ALIKE_LOWER } from '../../../data/letters';
import type { SkillGenerator } from '../../../generator';
import type { Explanation } from '../pk/parts';
import { cap, letterSaid, letterTile, pickApart, picture, row } from '../pk/parts';

// Language Arts kindergarten B.1 to B.7. A voice cannot say a lone sound, so every prompt uses
// whole words (plan section 9). In the listen skills the word is spoken in the question, the
// screen never shows it, and nothing on screen says it when tapped.

const word = (value: string, size: 'm' | 'l' | 'xl' = 'l'): Visual => ({ kind: 'text', value, size });
const wordSaid = (value: string, size: 'm' | 'l' | 'xl' = 'l'): Visual => ({ kind: 'text', value, size, speak: [{ word: value }] });
// A picture with no spoken label, for listen questions.
const silent = (emoji: string): Visual => ({ kind: 'emojiGroup', emoji, count: 1, layout: 'row' });
const shown = (entry: { word: string; emoji: string }): Visual => picture(entry.word, entry.emoji);
const cvc = (value: string): CvcWord => CVC_WORDS.find((entry) => entry.word === value) as CvcWord;
const spelled = (value: string): Say => value.split('').map((letter) => ({ letter }));

// Letters that can stand for the same sound, so one is never offered against another.
const SOUND_GROUPS: readonly (readonly string[])[] = [
  ['c', 'k', 's', 'q', 'x'],
  ['g', 'j'],
];
const soundsLike = (one: string, two: string): boolean => SOUND_GROUPS.some((group) => group.includes(one) && group.includes(two));
const lookAlikes = (letter: string): string[] => [...new Set(LOOK_ALIKE_LOWER.filter((set) => set.includes(letter)).flatMap((set) => set))].filter((other) => other !== letter);

// Three letters to choose from. With `alike`, the wrong ones are look-alikes of the answer where it has them.
function letterOptions(answer: string, alike: boolean, rng: Rng): string[] {
  const near = alike ? rng.shuffle(lookAlikes(answer)) : [];
  const plain = rng.shuffle(ALPHABET.filter((letter) => letter !== answer && !soundsLike(letter, answer) && !lookAlikes(answer).includes(letter)));
  return rng.shuffle([answer, ...[...near, ...plain].slice(0, 2)]);
}

// ---- B.1 First letter of a word and B.2 Last letter of a word ----
// Family: First, last or middle letter. Oracle: wordSet.
// Levels: picture and spoken word, 3 options / look-alikes. B.2 uses short words only.

function endLetter(which: 'first' | 'last'): (level: Level, rng: Rng) => QuestionDraft {
  const first = which === 'first';
  const pool: readonly { word: string; emoji: string }[] = first ? FIRST_SOUNDS : CVC_WORDS;
  const letterOf = (value: string): string => (first ? value.charAt(0) : value.slice(-1));
  const verb = first ? 'start' : 'end';
  return (level, rng) => {
    // At level 2 the letter is one a child mixes up with others, such as b, d and p.
    const entry = rng.pick(level === 1 ? pool : pool.filter((each) => lookAlikes(letterOf(each.word)).length > 0));
    const letter = letterOf(entry.word);
    const values = letterOptions(letter, level === 2, rng);
    return {
      type: 'choice',
      mode: 'listen',
      facts: { target: entry.word, relation: first ? 'firstLetter' : 'lastLetter', options: values },
      prompt: { text: `Which letter does this word ${verb} with?`, speak: ['Which letter does', { word: entry.word }, `${verb} with?`] },
      stimulus: silent(entry.emoji),
      options: values.map((each) => letterTile(each)),
      answerIndex: values.indexOf(letter),
      explanation: { speak: [{ word: entry.word }, `${verb}s with the letter`, { letter }, '.'], steps: [`${cap(entry.word)} ${verb}s with the letter ${letter}.`], visual: row(shown(entry), wordSaid(entry.word)) },
    };
  };
}

function endLesson(which: 'first' | 'last', one: string, two: string, emojiOne: string, emojiTwo: string): () => LessonStep[] {
  const first = which === 'first';
  const verb = first ? 'start' : 'end';
  const letterOf = (value: string): string => (first ? value.charAt(0) : value.slice(-1));
  const told = (value: string): { text: string; speak: Say } => ({ text: `${cap(value)} ${verb}s with the letter ${letterOf(value)}.`, speak: [{ word: value }, `${verb}s with the letter`, { letter: letterOf(value) }, '.'] });
  const asked = (value: string): { text: string; speak: Say } => ({ text: `Which letter does ${value} ${verb} with?`, speak: ['Which letter does', { word: value }, `${verb} with?`] });
  return () => [
    { beat: 'see', text: `Every word ${verb}s with a letter. ${told(one).text}`, speak: [`Every word ${verb}s with a letter.`, ...told(one).speak], visual: row(picture(one, emojiOne), wordSaid(one)) },
    { beat: 'watch', text: `${asked(one).text} ${told(one).text}`, speak: [...asked(one).speak, ...told(one).speak], visual: row(picture(one, emojiOne), letterSaid(letterOf(one))) },
    { beat: 'try', text: asked(two).text, speak: asked(two).speak, visual: picture(two, emojiTwo), reveal: { text: told(two).text, speak: told(two).speak, visual: row(picture(two, emojiTwo), wordSaid(two)) } },
    { beat: 'remember', text: 'Say the word slowly and listen.', speak: ['Say the word slowly and listen.'], visual: row(picture(one, emojiOne), wordSaid(one)) },
  ];
}

const firstLetter = endLetter('first');
export const firstLetterGenerator: SkillGenerator = {
  skillId: 'E-K-B1',
  maxLevel: 2,
  itemTypes: ['choice'],
  lists: ['firstSounds', 'letters'],
  generate: firstLetter,
  exampleSeed: 311,
  example: () => firstLetter(1, makeRng(311)),
  lesson: endLesson('first', 'sun', 'moon', '☀️', '🌙'),
  oracle: 'wordSet',
};

const lastLetter = endLetter('last');
export const lastLetterGenerator: SkillGenerator = {
  skillId: 'E-K-B2',
  maxLevel: 2,
  itemTypes: ['choice'],
  lists: ['cvc', 'letters'],
  generate: lastLetter,
  exampleSeed: 312,
  example: () => lastLetter(1, makeRng(312)),
  lesson: endLesson('last', 'cat', 'bus', '🐱', '🚌'),
  oracle: 'wordSet',
};

// ---- B.3 Middle vowel ----
// Levels: words with a, i or o, 3 options / all short vowels, 3 options that include the closest sound.

const gap = (value: string): string => `${value.charAt(0)}_${value.charAt(2)}`;
const MISSING = 'Which letter is missing?';
const missingSpeak = (value: string): Say => ['Which letter is missing in', { word: value }, '?'];

function vowelExplanation(entry: CvcWord): Explanation {
  return { speak: [{ word: entry.word }, 'has the letter', { letter: entry.vowel }, 'in the middle.'], steps: [`${cap(entry.word)} has the letter ${entry.vowel} in the middle.`], visual: row(shown(entry), wordSaid(entry.word)) };
}

const EASY_VOWELS: ShortVowel[] = ['a', 'i', 'o'];

function middleVowel(level: Level, rng: Rng): QuestionDraft {
  const entry = rng.pick(level === 1 ? CVC_WORDS.filter((each) => EASY_VOWELS.includes(each.vowel)) : CVC_WORDS);
  // Level 2 always offers the vowel that sounds closest, and one more. The vowels sit in their usual order.
  const close = CLOSEST_VOWEL[entry.vowel];
  const third = rng.pick(SHORT_VOWELS.filter((each) => each !== entry.vowel && each !== close));
  const values = level === 1 ? EASY_VOWELS : SHORT_VOWELS.filter((vowel) => [entry.vowel, close, third].includes(vowel));
  return {
    type: 'choice',
    mode: 'listen',
    fixedOrder: true,
    facts: { target: entry.word, relation: 'middleVowel', options: [...values] },
    prompt: { text: MISSING, speak: missingSpeak(entry.word) },
    stimulus: row(silent(entry.emoji), word(gap(entry.word), 'xl')),
    options: values.map((vowel) => letterTile(vowel)),
    answerIndex: values.indexOf(entry.vowel),
    explanation: vowelExplanation(entry),
  };
}

export const middleVowelGenerator: SkillGenerator = {
  skillId: 'E-K-B3',
  maxLevel: 2,
  itemTypes: ['choice'],
  lists: ['cvc'],
  generate: middleVowel,
  exampleSeed: 313,
  example: () => middleVowel(1, makeRng(313)),
  lesson: (): LessonStep[] => [
    { beat: 'see', text: 'Short words have a vowel in the middle. The vowels are a, e, i, o and u.', speak: ['Short words have a vowel in the middle. The vowels are', { letter: 'a' }, { letter: 'e' }, { letter: 'i' }, { letter: 'o' }, 'and', { letter: 'u' }, '.'], visual: row(shown(cvc('cat')), wordSaid('cat')) },
    { beat: 'watch', text: `Which letter is missing in cat? ${vowelExplanation(cvc('cat')).steps.join(' ')}`, speak: [...missingSpeak('cat'), ...vowelExplanation(cvc('cat')).speak], visual: row(shown(cvc('cat')), word(gap('cat'), 'xl')) },
    { beat: 'try', text: 'Which letter is missing in dog?', speak: missingSpeak('dog'), visual: row(shown(cvc('dog')), word(gap('dog'), 'xl')), reveal: { text: vowelExplanation(cvc('dog')).steps.join(' '), speak: vowelExplanation(cvc('dog')).speak, visual: vowelExplanation(cvc('dog')).visual } },
    { beat: 'remember', text: 'Say the word slowly and listen.', speak: ['Say the word slowly and listen.'], visual: row(shown(cvc('cat')), wordSaid('cat')) },
  ],
  oracle: 'wordSet',
};

// ---- B.4 Read a word, pick the picture ----
// Levels: short a words / all short vowels / words that differ by one letter.

const lettersApart = (one: string, two: string): number => one.split('').filter((letter, i) => letter !== two.charAt(i)).length;
const neighbours = (value: string): CvcWord[] => CVC_WORDS.filter((each) => lettersApart(each.word, value) === 1);
const READ = 'Read the word. Which picture matches?';

function readExplanation(entry: CvcWord): Explanation {
  return { speak: ['This word is', { word: entry.word }, '.'], steps: [`This word is ${entry.word}.`], visual: row(wordSaid(entry.word, 'xl'), shown(entry)) };
}

function readWord(level: Level, rng: Rng): QuestionDraft {
  const pool = level === 1 ? CVC_WORDS.filter((each) => each.vowel === 'a') : level === 2 ? CVC_WORDS : CVC_WORDS.filter((each) => neighbours(each.word).length > 0);
  const entry = rng.pick(pool);
  // Levels 1 and 2: the other pictures are words with two or more different letters.
  // Level 3: one letter apart where the list allows, such as pan, pin and pen.
  const far = rng.shuffle(CVC_WORDS.filter((each) => lettersApart(each.word, entry.word) >= 2));
  const near = level === 3 ? rng.shuffle(neighbours(entry.word)) : [];
  const options = rng.shuffle([entry, ...[...near, ...far].slice(0, 2)]);
  return {
    type: 'choice',
    mode: 'read',
    facts: { target: entry.word, relation: 'cvc', read: [entry.word], options: options.map((each) => each.word) },
    prompt: { text: READ, speak: [READ] },
    stimulus: word(entry.word, 'xl'),
    options: options.map(shown),
    answerIndex: options.indexOf(entry),
    explanation: readExplanation(entry),
  };
}

export const readWordGenerator: SkillGenerator = {
  skillId: 'E-K-B4',
  maxLevel: 3,
  itemTypes: ['choice'],
  lists: ['cvc'],
  pool: { 1: 7 }, // the seven short a words with a picture
  generate: readWord,
  exampleSeed: 314,
  example: () => readWord(1, makeRng(314)),
  lesson: (): LessonStep[] => [
    { beat: 'see', text: 'Letters make words. Say each letter sound, then put them together.', speak: ['Letters make words. Say each letter sound, then put them together.'], visual: wordSaid('hat', 'xl') },
    { beat: 'watch', text: readExplanation(cvc('hat')).steps.join(' '), speak: readExplanation(cvc('hat')).speak, visual: readExplanation(cvc('hat')).visual },
    { beat: 'try', text: 'Read the word. Which picture matches?', speak: [READ], visual: row(word('map', 'xl'), shown(cvc('bag')), shown(cvc('map'))), reveal: { text: readExplanation(cvc('map')).steps.join(' '), speak: readExplanation(cvc('map')).speak, visual: readExplanation(cvc('map')).visual } },
    { beat: 'remember', text: 'Look at every letter.', speak: ['Look at every letter.'], visual: wordSaid('hat', 'xl') },
  ],
  oracle: 'wordSet',
};

// ---- B.5 Spell a word ----
// Family: Spell a word. Oracle: spell.
// Levels: picture and spoken word, 3 tiles in order plus 2 extra / plus 4 extra.

const SPELL = 'Spell the word.';
const spellSpeak = (value: string): Say => ['Spell the word', { word: value }, '.'];

function spellExplanation(entry: CvcWord): Explanation {
  return { speak: [{ word: entry.word }, 'is spelled', ...spelled(entry.word), '.'], steps: [`${cap(entry.word)} is spelled ${entry.word.split('').join(', ')}.`], visual: row(shown(entry), wordSaid(entry.word, 'xl')) };
}

function spellWord(level: Level, rng: Rng): QuestionDraft {
  const entry = rng.pick(CVC_WORDS);
  const letters = entry.word.split('');
  // Level 1: two spare letters that neither look nor sound like the word's letters, and no vowel.
  // Level 2: four spare letters, with the closest vowel and a look-alike among them.
  const free = ALPHABET.filter((letter) => !letters.includes(letter) && !(SHORT_VOWELS as string[]).includes(letter) && letters.every((own) => !soundsLike(letter, own)));
  const plain = free.filter((letter) => letters.every((own) => !lookAlikes(own).includes(letter)));
  const tricky = rng.shuffle(free.filter((letter) => letters.some((own) => lookAlikes(own).includes(letter))));
  const spare = level === 1 ? rng.sample(plain, 2) : [CLOSEST_VOWEL[entry.vowel], ...tricky.slice(0, 1), ...rng.shuffle(plain)].slice(0, 4);
  return {
    type: 'tiles',
    mode: 'listen',
    facts: { target: entry.word, word: entry.word, parts: letters },
    prompt: { text: SPELL, speak: spellSpeak(entry.word) },
    stimulus: silent(entry.emoji),
    slots: 3,
    bank: rng.shuffle([...letters, ...spare]),
    answer: entry.word,
    explanation: spellExplanation(entry),
  };
}

export const spellWordGenerator: SkillGenerator = {
  skillId: 'E-K-B5',
  maxLevel: 2,
  itemTypes: ['tiles'],
  lists: ['cvc', 'letters'],
  generate: spellWord,
  exampleSeed: 315,
  example: () => spellWord(1, makeRng(315)),
  lesson: (): LessonStep[] => [
    { beat: 'see', text: 'To spell a word, listen for each sound and find its letter.', speak: ['To spell a word, listen for each sound and find its letter.'], visual: row(shown(cvc('sun')), wordSaid('sun', 'xl')) },
    { beat: 'watch', text: spellExplanation(cvc('sun')).steps.join(' '), speak: spellExplanation(cvc('sun')).speak, visual: spellExplanation(cvc('sun')).visual },
    { beat: 'try', text: 'Spell the word pig.', speak: spellSpeak('pig'), visual: shown(cvc('pig')), reveal: { text: spellExplanation(cvc('pig')).steps.join(' '), speak: spellExplanation(cvc('pig')).speak, visual: spellExplanation(cvc('pig')).visual } },
    { beat: 'remember', text: 'First sound, middle sound, last sound.', speak: ['First sound, middle sound, last sound.'], visual: row(shown(cvc('sun')), wordSaid('sun', 'xl')) },
  ],
  oracle: 'spell',
};

// ---- B.6 Rhyming words ----
// Family: Rhymes. Oracle: wordSet.
// Levels: written words: which rhymes with cat / pick the one that does not rhyme.

const RHYMES_WITH = 'Which word rhymes with this word?';
const ODD = 'Two words rhyme. Which word is different?';
const ending = (family: WordFamily): Say => family.ending.split('').map((letter) => ({ letter }));

function rhymeExplanation(family: WordFamily, one: string, two: string): Explanation {
  return {
    speak: [{ word: one }, 'and', { word: two }, 'both end in', ...ending(family), '. They rhyme.'],
    steps: [`${cap(one)} and ${two} both end in ${family.ending}.`, 'They rhyme.'],
    visual: row(wordSaid(one), wordSaid(two)),
  };
}

function rhymingWords(level: Level, rng: Rng): QuestionDraft {
  const family = rng.pick(WORD_FAMILIES);
  const others = rng.shuffle(WORD_FAMILIES.filter((each) => each !== family));
  if (level === 1) {
    const [target, answer] = rng.sample(family.words, 2) as [string, string];
    const options = rng.shuffle([answer, rng.pick((others[0] as WordFamily).words), rng.pick((others[1] as WordFamily).words)]);
    return {
      type: 'choice',
      mode: 'read',
      facts: { target, relation: 'family', read: [target, ...options], options },
      prompt: { text: RHYMES_WITH, speak: [RHYMES_WITH] },
      stimulus: word(target, 'xl'),
      options: options.map((each) => word(each)),
      answerIndex: options.indexOf(answer),
      explanation: rhymeExplanation(family, target, answer),
    };
  }
  // Two from one family and one from another. Kindergarten questions never have more than three options.
  const [one, two] = rng.sample(family.words, 2) as [string, string];
  const odd = rng.pick((others[0] as WordFamily).words);
  const options = rng.shuffle([one, two, odd]);
  return {
    type: 'choice',
    mode: 'read',
    facts: { target: family.ending, relation: 'notFamily', read: options, options },
    prompt: { text: ODD, speak: [ODD] },
    options: options.map((each) => word(each)),
    answerIndex: options.indexOf(odd),
    explanation: {
      speak: [{ word: one }, 'and', { word: two }, 'both end in', ...ending(family), '.', { word: odd }, 'does not.'],
      steps: [`${cap(one)} and ${two} both end in ${family.ending}.`, `${cap(odd)} does not.`],
      visual: row(wordSaid(one), wordSaid(two)),
    },
  };
}

const AT = WORD_FAMILIES[0] as WordFamily;

export const rhymingWordsGenerator: SkillGenerator = {
  skillId: 'E-K-B6',
  maxLevel: 2,
  itemTypes: ['choice'],
  lists: ['families'],
  generate: rhymingWords,
  exampleSeed: 316,
  example: () => rhymingWords(1, makeRng(316)),
  lesson: (): LessonStep[] => [
    { beat: 'see', text: 'Words that rhyme end the same way. Cat and hat rhyme.', speak: ['Words that rhyme end the same way.', { word: 'cat' }, 'and', { word: 'hat' }, 'rhyme.'], visual: row(wordSaid('cat'), wordSaid('hat')) },
    { beat: 'watch', text: rhymeExplanation(AT, 'cat', 'hat').steps.join(' '), speak: rhymeExplanation(AT, 'cat', 'hat').speak, visual: row(wordSaid('cat'), wordSaid('hat')) },
    { beat: 'try', text: 'Which word rhymes with bat?', speak: ['Which word rhymes with', { word: 'bat' }, '?'], visual: row(wordSaid('bat'), wordSaid('bug'), wordSaid('sat')), reveal: { text: rhymeExplanation(AT, 'bat', 'sat').steps.join(' '), speak: rhymeExplanation(AT, 'bat', 'sat').speak, visual: row(wordSaid('bat'), wordSaid('sat')) } },
    { beat: 'remember', text: 'Rhyming words end the same way.', speak: ['Rhyming words end the same way.'], visual: row(wordSaid('cat'), wordSaid('hat')) },
  ],
  oracle: 'wordSet',
};

// ---- B.7 Word families ----
// Family: Word families. Oracle: sortBy.
// Levels: sort 4 words into two families / 6 words.

const FAMILY = 'Put each word in its family.';
const vowelOf = (family: WordFamily): string => family.ending.charAt(0);

function familiesExplanation(families: WordFamily[], words: string[]): Explanation {
  const lines = families.map((family) => {
    const [one, two] = words.filter((each) => family.words.includes(each)) as [string, string];
    return { speak: [{ word: one }, 'and', { word: two }, 'both end in', ...ending(family), '.'] as Say, text: `${cap(one)} and ${two} both end in ${family.ending}.` };
  });
  return { speak: lines.flatMap((each) => each.speak), steps: lines.map((each) => each.text), visual: row(...words.filter((each) => (families[0] as WordFamily).words.includes(each)).map((each) => wordSaid(each))) };
}

function wordFamilies(level: Level, rng: Rng): QuestionDraft {
  // Level 1: two families with different vowels, two words each. Level 2: any two families, three words each.
  const families = pickApart(WORD_FAMILIES, 2, rng, (family, picked) => level === 2 || picked.every((other) => vowelOf(other) !== vowelOf(family)));
  const words = rng.shuffle(families.flatMap((family) => rng.sample(family.words, level === 1 ? 2 : 3)));
  const endings = families.map((family) => family.ending);
  const itemAttrs = words.map((each) => (families.find((family) => family.words.includes(each)) as WordFamily).ending);
  const bins: SortBin[] = families.map((family) => ({ label: `-${family.ending}`, speak: ['Words like', { word: family.words[0] as string }] }));
  return {
    type: 'sort',
    mode: 'read',
    facts: { itemAttrs, binAttrs: endings, read: words },
    prompt: { text: FAMILY, speak: [FAMILY] },
    items: words.map((each) => word(each)),
    bins,
    answerBin: itemAttrs.map((attr) => endings.indexOf(attr)),
    explanation: familiesExplanation(families, words),
  };
}

export const wordFamiliesGenerator: SkillGenerator = {
  skillId: 'E-K-B7',
  maxLevel: 2,
  itemTypes: ['sort'],
  lists: ['families'],
  generate: wordFamilies,
  exampleSeed: 317,
  example: () => wordFamilies(1, makeRng(317)),
  lesson: (): LessonStep[] => [
    { beat: 'see', text: 'A word family is a group of words that end the same way.', speak: ['A word family is a group of words that end the same way.'], visual: row(wordSaid('cat'), wordSaid('hat'), wordSaid('bat')) },
    { beat: 'watch', text: rhymeExplanation(AT, 'cat', 'hat').steps[0] as string, speak: [{ word: 'cat' }, 'and', { word: 'hat' }, 'both end in', ...ending(AT), '.'], visual: row(wordSaid('cat'), wordSaid('hat')) },
    { beat: 'try', text: 'Which word is in the same family as pig?', speak: ['Which word is in the same family as', { word: 'pig' }, '?'], visual: row(wordSaid('pig'), wordSaid('wig'), wordSaid('pan')), reveal: { text: 'Pig and wig both end in ig.', speak: [{ word: 'pig' }, 'and', { word: 'wig' }, 'both end in', { letter: 'i' }, { letter: 'g' }, '.'], visual: row(wordSaid('pig'), wordSaid('wig')) } },
    { beat: 'remember', text: 'Words in a family end the same way.', speak: ['Words in a family end the same way.'], visual: row(wordSaid('cat'), wordSaid('hat'), wordSaid('bat')) },
  ],
  oracle: 'sortBy',
};
