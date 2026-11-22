import type { Rng } from '../../../../engine/rng';
import { makeRng } from '../../../../engine/rng';
import type { Level, QuestionDraft, Say, Visual } from '../../../../engine/types';
import type { CvcWord } from '../../../data/cvc';
import { CLOSEST_VOWEL, CVC_WORDS } from '../../../data/cvc';
import { WORD_FAMILIES } from '../../../data/families';
import type { ClapWord, SoundSplit } from '../../../data/h3-sounds';
import { CLAP_WORDS, SOUND_SPLITS } from '../../../data/h3-sounds';
import { SYLLABLE_WORDS } from '../../../data/syllables';
import type { SkillGenerator } from '../../../generator';
import { numeral } from '../../../generator';
import { cap, letterSaid, picture, row } from '../pk/parts';
import type { Line, Told } from '../pk/h3-parts';
import { beats, letterSays, line, plain, said, sound as soundPart, soundText, spelledSay, spoken, working } from '../pk/h3-parts';

// Language Arts kindergarten B.8 to B.13 (plan section 15, wave H3). Oracle: earlyWords.
// Prompts use whole words. Steps say each sound with the recorded letter sounds (the owner's choice, Nov 21, 2026),
// the sound first and the letter second; a split such as f · i · sh is shown and said sound by sound. A syllable is
// not a letter sound, so a split into claps (ba · na · na) is shown and only the whole word is said.

const shown = (entry: { word: string; emoji: string }): Visual => picture(entry.word, entry.emoji);
const cvc = (word: string): CvcWord => CVC_WORDS.find((each) => each.word === word) as CvcWord;
const rhymes = (one: string, two: string): boolean => one.slice(1) === two.slice(1);
// "Say bin slowly. Listen to the sound in the middle. Then say each picture's name." The word is the one the
// question names, never an option.
const slowly = (word: string, listen: string): Line => spoken(`Say ${word} slowly. ${listen} Then say each picture's name.`, ['Say', { word }, `slowly. ${listen} Then say each picture's name.`]);

// ---- B.8 Same middle sound ----
// Levels: 2 spoken pictures / 3 / 3, one with the vowel that sounds closest (e with i, o with u).
// The answer never rhymes with the word, so the ending gives nothing away.

const middlePrompt = (word: string): Line => ({ text: `Which one has the same middle sound as ${word}?`, speak: ['Which one has the same middle sound as', { word }, '?'] });

// "Bin and pig both have /i/ in the middle. The letter i says /i/." A vowel's name is not its sound here.
function middleExplanation(target: CvcWord, answer: CvcWord): Told {
  return working(
    [spoken(`${cap(target.word)} and ${answer.word} both have ${soundText(target.vowel)} in the middle.`, [{ word: target.word }, 'and', { word: answer.word }, 'both have', soundPart(target.vowel), 'in the middle.']), letterSays(target.vowel)],
    row(shown(target), shown(answer)),
    slowly(target.word, 'Listen to the sound in the middle.'),
  );
}

const MIDDLE_TARGETS = CVC_WORDS.filter((target) => CVC_WORDS.some((other) => other !== target && other.vowel === target.vowel && !rhymes(other.word, target.word)));

function sameMiddle(level: Level, rng: Rng): QuestionDraft {
  const target = rng.pick(MIDDLE_TARGETS);
  const answer = rng.pick(CVC_WORDS.filter((other) => other !== target && other.vowel === target.vowel && !rhymes(other.word, target.word)));
  const closest = CVC_WORDS.filter((other) => other.vowel === CLOSEST_VOWEL[target.vowel]);
  const first = level === 3 ? rng.pick(closest) : rng.pick(CVC_WORDS.filter((other) => other.vowel !== target.vowel));
  const second = rng.pick(CVC_WORDS.filter((other) => other.vowel !== target.vowel && other.vowel !== first.vowel));
  const options = rng.shuffle([answer, first, second].slice(0, level === 1 ? 2 : 3));
  return {
    type: 'choice',
    mode: 'look',
    facts: { relation: 'sameVowel', target: target.word, answer: answer.word, options: options.map((each) => each.word) },
    prompt: middlePrompt(target.word),
    stimulus: shown(target),
    options: options.map(shown),
    answerIndex: options.indexOf(answer),
    explanation: middleExplanation(target, answer),
  };
}

export const sameMiddleGenerator: SkillGenerator = {
  skillId: 'E-K-B8',
  maxLevel: 3,
  itemTypes: ['choice'],
  lists: ['cvc'],
  generate: sameMiddle,
  exampleSeed: 4081,
  example: () => sameMiddle(1, makeRng(4081)),
  lesson: () => {
    const cat = middleExplanation(cvc('cat'), cvc('map'));
    const pig = middleExplanation(cvc('pig'), cvc('bin'));
    return beats(
      { ...line('Short words have a sound in the middle. Say cat slowly and listen to the middle.'), visual: shown(cvc('cat')) },
      { text: `${middlePrompt('cat').text} ${cat.steps.join(' ')}`, speak: [...middlePrompt('cat').speak, ...cat.speak], visual: cat.visual },
      { ...middlePrompt('pig'), visual: row(shown(cvc('pig')), shown(cvc('sun')), shown(cvc('bin'))) },
      { text: pig.steps.join(' '), speak: pig.speak, visual: pig.visual },
      { ...line('Stretch the word out and listen to the middle.'), visual: cat.visual },
    );
  },
  oracle: 'earlyWords',
};

// ---- B.9 Same last sound ----
// Levels: 2 spoken pictures / 3. The answer never rhymes with the word. Words ending in s or x are left out:
// x ends with two sounds and s can sound like z.

const END_WORDS = CVC_WORDS.filter((each) => !/[sx]$/.test(each.word));
const END_TARGETS = END_WORDS.filter((target) => END_WORDS.some((other) => other !== target && other.word.slice(-1) === target.word.slice(-1) && !rhymes(other.word, target.word)));
const endPrompt = (word: string): Line => ({ text: `Which one ends with the same sound as ${word}?`, speak: ['Which one ends with the same sound as', { word }, '?'] });

// "Pin and van both end with /n/. The letter n says /n/."
function endExplanation(target: CvcWord, answer: CvcWord): Told {
  const last = target.word.slice(-1);
  return working(
    [spoken(`${cap(target.word)} and ${answer.word} both end with ${soundText(last)}.`, [{ word: target.word }, 'and', { word: answer.word }, 'both end with', soundPart(last), '.']), letterSays(last)],
    row(shown(target), shown(answer)),
    slowly(target.word, 'Listen to the very last sound.'),
  );
}

function sameEnd(level: Level, rng: Rng): QuestionDraft {
  const target = rng.pick(END_TARGETS);
  const last = target.word.slice(-1);
  const answer = rng.pick(END_WORDS.filter((other) => other !== target && other.word.slice(-1) === last && !rhymes(other.word, target.word)));
  const wrong: CvcWord[] = [];
  for (const other of rng.shuffle(END_WORDS)) if (wrong.length < level && other.word.slice(-1) !== last && wrong.every((each) => each.word.slice(-1) !== other.word.slice(-1))) wrong.push(other);
  const options = rng.shuffle([answer, ...wrong]);
  return {
    type: 'choice',
    mode: 'look',
    facts: { relation: 'sameEnd', target: target.word, answer: answer.word, options: options.map((each) => each.word) },
    prompt: endPrompt(target.word),
    stimulus: shown(target),
    options: options.map(shown),
    answerIndex: options.indexOf(answer),
    explanation: endExplanation(target, answer),
  };
}

export const sameEndGenerator: SkillGenerator = {
  skillId: 'E-K-B9',
  maxLevel: 2,
  itemTypes: ['choice'],
  lists: ['cvc'],
  generate: sameEnd,
  exampleSeed: 4091,
  example: () => sameEnd(1, makeRng(4091)),
  lesson: () => {
    const cat = endExplanation(cvc('cat'), cvc('nut'));
    const dog = endExplanation(cvc('dog'), cvc('leg'));
    return beats(
      { ...line('Words end with a sound. Say cat slowly and listen to the very end.'), visual: shown(cvc('cat')) },
      { text: `${endPrompt('cat').text} ${cat.steps.join(' ')}`, speak: [...endPrompt('cat').speak, ...cat.speak], visual: cat.visual },
      { ...endPrompt('dog'), visual: row(shown(cvc('dog')), shown(cvc('leg')), shown(cvc('sun'))) },
      { text: dog.steps.join(' '), speak: dog.speak, visual: dog.visual },
      { ...line('Listen to the very end of the word.'), visual: cat.visual },
    );
  },
  oracle: 'earlyWords',
};

// ---- B.10 Count the sounds ----
// Levels: 3 or 4 sounds, one letter for each sound / 2, 3 or 4 sounds, where letters can work together (fish: f, i, sh).
// The numbers sit in fixed places, smallest first.

const split = (entry: SoundSplit): string => entry.sounds.join(' · ');
const onePerLetter = (entry: SoundSplit): boolean => entry.sounds.every((each) => each.length === 1);
const countPrompt = (word: string): Line => ({ text: `How many sounds do you hear in ${word}?`, speak: ['How many sounds do you hear in', { word }, '?'] });
// The hint never shows the split: counting its parts would be the answer.
const COUNT_HINT = line('Say the word slowly. Hold up a finger for each sound you hear.');

// Each sound as it lights up (f · r · o · g is /f/, /r/, /o/, /g/), never the letters' names, which hold other sounds.
function soundsExplanation(entry: SoundSplit): Told {
  const n = entry.sounds.length;
  const lines: Line[] = [
    spoken(split(entry), entry.keys.flatMap((key, i): Say => [...(i === 0 ? [] : [',']), soundPart(key)]).concat('.')),
    spoken(`${cap(entry.word)} has ${n} sounds.`, [{ word: entry.word }, 'has', { number: n }, 'sounds.']),
  ];
  // Letters that work together for one sound: "The letters s and h make one sound, /sh/."
  const at = entry.sounds.findIndex((each) => each.length > 1);
  const together = entry.sounds[at];
  const key = entry.keys[at];
  if (together !== undefined && key !== undefined) {
    const named = together.split('');
    lines.push(
      spoken(`The letters ${named.join(' and ')} make one sound, ${soundText(key)}.`, ['The letters', ...named.flatMap((letter, i): Say => [...(i === 0 ? [] : ['and']), { letter }]), 'make one sound,', soundPart(key), '.']),
    );
  }
  return working(lines, plain(split(entry), 'l'), COUNT_HINT);
}

function countSounds(level: Level, rng: Rng): QuestionDraft {
  const values = level === 1 ? [3, 4] : [2, 3, 4];
  // The count is chosen first, so every answer comes up as often as the others.
  const n = rng.pick(values);
  const entry = rng.pick(SOUND_SPLITS.filter((each) => each.sounds.length === n && (level === 2 || onePerLetter(each))));
  return {
    type: 'choice',
    mode: 'look',
    fixedOrder: true,
    facts: { relation: 'soundCount', target: entry.word, options: values },
    prompt: countPrompt(entry.word),
    stimulus: shown(entry),
    options: values.map((value) => numeral(value)),
    answerIndex: values.indexOf(n),
    explanation: soundsExplanation(entry),
  };
}

const splitOf = (word: string): SoundSplit => SOUND_SPLITS.find((each) => each.word === word) as SoundSplit;

export const countSoundsGenerator: SkillGenerator = {
  skillId: 'E-K-B10',
  maxLevel: 2,
  itemTypes: ['choice'],
  lists: ['h3-sounds'],
  generate: countSounds,
  exampleSeed: 4101,
  example: () => countSounds(1, makeRng(4101)),
  lesson: () => {
    const sun = soundsExplanation(splitOf('sun'));
    const fish = soundsExplanation(splitOf('fish'));
    return beats(
      { ...line('Words are made of sounds. Say a word slowly and count each sound.'), visual: shown(splitOf('sun')) },
      { text: `${countPrompt('sun').text} ${sun.steps.join(' ')}`, speak: [...countPrompt('sun').speak, ...sun.speak], visual: sun.visual },
      { ...countPrompt('fish'), visual: row(shown(splitOf('fish')), numeral(2), numeral(3), numeral(4)) },
      { text: fish.steps.join(' '), speak: fish.speak, visual: fish.visual },
      { ...line('Hold up a finger for each sound you hear.'), visual: sun.visual },
    );
  },
  oracle: 'earlyWords',
};

// ---- B.11 Change one letter ----
// Levels: change the first letter (cat to hat) / the last letter (can to cat) / the middle letter (pan to pin).
// The new word is a picture, so the child knows what to make. Options: the new letter, the old one, one more.

const SOURCE_WORDS: readonly string[] = [...new Set([...CVC_WORDS.map((each) => each.word), ...WORD_FAMILIES.flatMap((family) => family.words)])];
type Swap = { from: string; to: CvcWord; at: number };
const swaps = (at: number): Swap[] =>
  CVC_WORDS.flatMap((to) => SOURCE_WORDS.filter((from) => from !== to.word && [...from].every((letter, i) => (i === at ? letter !== to.word.charAt(i) : letter === to.word.charAt(i)))).map((from) => ({ from, to, at })));
const SWAPS: Record<1 | 2 | 3, Swap[]> = { 1: swaps(0), 2: swaps(2), 3: swaps(1) };
const SOUND_GROUPS = [['c', 'k', 's', 'q', 'x'], ['g', 'j']];
const soundsLike = (one: string, two: string): boolean => SOUND_GROUPS.some((group) => group.includes(one) && group.includes(two));
const PLACE = ['first', 'middle', 'last'];
const swapPrompt = (from: string, to: string): Line => ({ text: `Change ${from} to ${to}. Which new letter do you need?`, speak: ['Change', { word: from }, 'to', { word: to }, '. Which new letter do you need?'] });

const SWAP_HINT = line('Say both words slowly. Listen for the sound that changes.');

// The sound that changes, then the letter that spells it: "The first sound changes from /h/ to /p/."
function swapExplanation(swap: Swap): Told {
  const old = swap.from.charAt(swap.at);
  const next = swap.to.word.charAt(swap.at);
  const place = PLACE[swap.at === 0 ? 0 : swap.at === 2 ? 2 : 1] as string;
  return working(
    [
      spoken(`${cap(swap.from)} becomes ${swap.to.word}.`, [{ word: swap.from }, 'becomes', { word: swap.to.word }, '.']),
      spoken(`The ${place} sound changes from ${soundText(old)} to ${soundText(next)}.`, [`The ${place} sound changes from`, soundPart(old), 'to', soundPart(next), '.']),
      spoken(`Change the ${place} letter, ${old}, to ${next}.`, [`Change the ${place} letter,`, { letter: old }, ', to', { letter: next }, '.']),
    ],
    row(said(swap.from, [{ word: swap.from }]), said(swap.to.word, [{ word: swap.to.word }]), shown(swap.to)),
    SWAP_HINT,
  );
}

function changeLetter(level: Level, rng: Rng): QuestionDraft {
  const swap = rng.pick(SWAPS[level as 1 | 2 | 3]);
  const old = swap.from.charAt(swap.at);
  const next = swap.to.word.charAt(swap.at);
  const pool = level === 3 ? ['a', 'e', 'i', 'o', 'u'] : 'bcdfghjklmnprstvwz'.split('');
  const third = rng.pick(pool.filter((letter) => letter !== old && letter !== next && !soundsLike(letter, next) && !soundsLike(letter, old)));
  const options = rng.shuffle([next, old, third]);
  return {
    type: 'choice',
    mode: 'look',
    facts: { relation: 'swapLetter', target: swap.to.word, from: swap.from, options },
    prompt: swapPrompt(swap.from, swap.to.word),
    stimulus: row(said(swap.from, [{ word: swap.from }], 'xl'), shown(swap.to)),
    options: options.map((letter) => letterSaid(letter)),
    answerIndex: options.indexOf(next),
    explanation: swapExplanation(swap),
  };
}

export const changeLetterGenerator: SkillGenerator = {
  skillId: 'E-K-B11',
  maxLevel: 3,
  itemTypes: ['choice'],
  lists: ['cvc', 'families'],
  generate: changeLetter,
  exampleSeed: 4111,
  example: () => changeLetter(1, makeRng(4111)),
  lesson: () => {
    const hat = swapExplanation({ from: 'cat', to: cvc('hat'), at: 0 });
    const pin = swapExplanation({ from: 'pan', to: cvc('pin'), at: 1 });
    return beats(
      { ...line('Change one letter and you make a new word. Cat can become hat.'), visual: hat.visual },
      { text: `${swapPrompt('cat', 'hat').text} ${hat.steps.join(' ')}`, speak: [...swapPrompt('cat', 'hat').speak, ...hat.speak], visual: row(letterSaid('h'), letterSaid('c'), letterSaid('m')) },
      { ...swapPrompt('pan', 'pin'), visual: row(said('pan', [{ word: 'pan' }], 'xl'), shown(cvc('pin'))) },
      { text: pin.steps.join(' '), speak: pin.speak, visual: pin.visual },
      { ...line('Say both words slowly. Find the sound that changes.'), visual: hat.visual },
    );
  },
  oracle: 'earlyWords',
};

// ---- B.12 Which word has more claps ----
// Levels: 1 clap against 2 or 3 / 2 claps against 3 / 3 claps against 4. Two spoken pictures.

const CLAPPED: readonly ClapWord[] = [...SYLLABLE_WORDS, ...CLAP_WORDS];
const withClaps = (n: number): ClapWord[] => CLAPPED.filter((each) => each.parts.length === n);
const MORE = line('Which word has more claps?');
const MORE_HINT = line('Say each word slowly and clap each part. Count your claps.');
const claps = (n: number): string => (n === 1 ? '1 clap' : `${n} claps`);
const clapSay = (n: number): Say => [{ number: n }, n === 1 ? 'clap.' : 'claps.'];

// "Banana has 3 claps: ba · na · na." The voice says the whole word and its count, never a part such as "na" or a
// one-letter part such as the i of helicopter, which it would say as a letter's name.
function clapLine(entry: ClapWord): Line {
  const n = entry.parts.length;
  return spoken(`${cap(entry.word)} has ${claps(n)}${n === 1 ? '' : `: ${entry.parts.join(' · ')}`}.`, [{ word: entry.word }, 'has', ...clapSay(n)]);
}

function clapsExplanation(more: ClapWord, fewer: ClapWord): Told {
  return working(
    [clapLine(more), clapLine(fewer), spoken(`${cap(more.word)} has more claps.`, [{ word: more.word }, 'has more claps.'])],
    row(plain(more.parts.join(' · '), 'l'), plain(fewer.parts.join(' · '), 'l')),
    MORE_HINT,
  );
}

function moreClaps(level: Level, rng: Rng): QuestionDraft {
  const [few, many] = level === 1 ? [1, rng.pick([2, 3])] : level === 2 ? [2, 3] : [3, 4];
  const more = rng.pick(withClaps(many));
  const fewer = rng.pick(withClaps(few));
  const options = rng.shuffle([more, fewer]);
  return {
    type: 'choice',
    mode: 'look',
    facts: { relation: 'moreClaps', target: more.word, fewer: fewer.word, options: options.map((each) => each.word) },
    prompt: MORE,
    options: options.map(shown),
    answerIndex: options.indexOf(more),
    explanation: clapsExplanation(more, fewer),
  };
}

const clapWord = (word: string): ClapWord => CLAPPED.find((each) => each.word === word) as ClapWord;

export const moreClapsGenerator: SkillGenerator = {
  skillId: 'E-K-B12',
  maxLevel: 3,
  itemTypes: ['choice'],
  lists: ['h3-sounds', 'syllables'],
  generate: moreClaps,
  exampleSeed: 4121,
  example: () => moreClaps(1, makeRng(4121)),
  lesson: () => {
    const melon = clapsExplanation(clapWord('watermelon'), clapWord('banana'));
    const robot = clapsExplanation(clapWord('robot'), clapWord('cat'));
    return beats(
      { ...line('Clap once for each part of a word. Long words have more claps.'), visual: plain(clapWord('watermelon').parts.join(' · '), 'l') },
      { text: `${MORE.text} ${melon.steps.join(' ')}`, speak: [...MORE.speak, ...melon.speak], visual: row(shown(clapWord('watermelon')), shown(clapWord('banana'))) },
      { ...MORE, visual: row(shown(clapWord('cat')), shown(clapWord('robot'))) },
      { text: robot.steps.join(' '), speak: robot.speak, visual: robot.visual },
      { ...line('Clap each word. The one with more claps is longer to say.'), visual: melon.visual },
    );
  },
  oracle: 'earlyWords',
};

// ---- B.13 Where is the letter ----
// Levels: first or last / first, middle or last. The places sit in fixed order and say their names.

const PLACES = ['first', 'middle', 'last'] as const;
// The letter in its place, with a gap for each other letter: t _ _ is first.
const slots = (place: string, letter: string): string => (place === 'first' ? `${letter} _ _` : place === 'middle' ? `_ ${letter} _` : `_ _ ${letter}`);
const placeVisual = (place: string, letter: string): Visual => ({ kind: 'text', value: slots(place, letter), size: 'l', speak: [place] });
const placePrompt = (letter: string, word: string): Line => ({ text: `Where is the letter ${letter} in ${word}?`, speak: ['Where is the letter', { letter }, 'in', { word }, '?'] });
const DISTINCT = CVC_WORDS.filter((each) => new Set(each.word).size === 3);

// The hint never says first, middle or last: one of them is the answer.
const PLACE_HINT = line('Point to each letter of the word, from left to right, until you find it.');

// A step starts with a capital, as a sentence does: "The letter t is the last letter."
function placeExplanation(entry: CvcWord, at: number): Told {
  const letter = entry.word.charAt(at);
  const place = PLACES[at] as string;
  return working(
    [spoken(entry.word.split('').join(' '), spelledSay(entry.word.split(''))), spoken(`The letter ${letter} is the ${place} letter.`, ['The letter', { letter }, `is the ${place} letter.`])],
    row(shown(entry), plain(entry.word, 'xl')),
    PLACE_HINT,
  );
}

function letterPlace(level: Level, rng: Rng): QuestionDraft {
  const values: string[] = level === 1 ? ['first', 'last'] : [...PLACES];
  const place = rng.pick(values);
  const at = PLACES.indexOf(place as (typeof PLACES)[number]);
  const entry = rng.pick(DISTINCT);
  const letter = entry.word.charAt(at);
  return {
    type: 'choice',
    mode: 'look',
    fixedOrder: true,
    facts: { relation: 'letterPlace', target: entry.word, letter, options: values },
    prompt: placePrompt(letter, entry.word),
    stimulus: row(shown(entry), plain(entry.word, 'xl')),
    options: values.map((value) => placeVisual(value, letter)),
    answerIndex: values.indexOf(place),
    explanation: placeExplanation(entry, at),
  };
}

export const letterPlaceGenerator: SkillGenerator = {
  skillId: 'E-K-B13',
  maxLevel: 2,
  itemTypes: ['choice'],
  lists: ['cvc'],
  generate: letterPlace,
  exampleSeed: 4131,
  example: () => letterPlace(1, makeRng(4131)),
  lesson: () => {
    const sun = placeExplanation(cvc('sun'), 2);
    const pig = placeExplanation(cvc('pig'), 1);
    return beats(
      { ...line('A short word has a first letter, a middle letter and a last letter.'), visual: row(placeVisual('first', 'c'), placeVisual('middle', 'a'), placeVisual('last', 't')) },
      { text: `${placePrompt('n', 'sun').text} ${sun.steps.join(' ')}`, speak: [...placePrompt('n', 'sun').speak, ...sun.speak], visual: sun.visual },
      { ...placePrompt('i', 'pig'), visual: row(shown(cvc('pig')), plain('pig', 'xl')) },
      { text: pig.steps.join(' '), speak: pig.speak, visual: pig.visual },
      { ...line('Read from left to right: first, middle, last.'), visual: row(placeVisual('first', 'c'), placeVisual('middle', 'a'), placeVisual('last', 't')) },
    );
  },
  oracle: 'earlyWords',
};
