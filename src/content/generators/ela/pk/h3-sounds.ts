import type { Rng } from '../../../../engine/rng';
import { makeRng } from '../../../../engine/rng';
import type { Level, QuestionDraft, Say, SortBin, Visual } from '../../../../engine/types';
import type { SoundWord } from '../../../data/firstSounds';
import { FIRST_SOUNDS } from '../../../data/firstSounds';
import type { PictureWord } from '../../../data/rhymes';
import { RHYME_FAMILIES } from '../../../data/rhymes';
import type { SkillGenerator } from '../../../generator';
import type { Explanation } from './parts';
import { cap, letterSaid, pickApart, picture, row } from './parts';
import type { Line } from './h3-parts';
import { beats, line } from './h3-parts';

// Language Arts pre-K B.4 to B.6 (plan section 15, wave H3). Oracle: earlyWords.
// A voice cannot say a lone sound, so every prompt uses whole words (plan section 9).

const shown = (entry: { word: string; emoji: string }): Visual => picture(entry.word, entry.emoji);
const and = (words: readonly string[]): string => (words.length === 1 ? words[0] ?? '' : `${words.slice(0, -1).join(', ')} and ${words[words.length - 1] ?? ''}`);
const andSay = (words: readonly string[]): Say => words.flatMap((word, i): Say => [...(i === 0 ? [] : [i === words.length - 1 ? 'and' : ',']), { word }]);

// ---- B.4 Which one starts differently ----
// Levels: "Which one does not start like ball?" with ball shown, 3 pictures / no word shown:
// "Which one starts with a different sound?", 3 pictures.

const groupOf = (entry: SoundWord): SoundWord[] => FIRST_SOUNDS.filter((other) => other.sound === entry.sound);
const BIG_GROUPS = FIRST_SOUNDS.filter((entry) => groupOf(entry).length >= 3);

function oddExplanation(same: SoundWord[], odd: SoundWord): Explanation {
  const words = same.map((each) => each.word);
  return {
    speak: [...andSay(words), 'start with the same sound.', { word: odd.word }, 'does not.'],
    steps: [`${cap(and(words))} start with the same sound.`, `${cap(odd.word)} does not.`],
    visual: row(...same.map(shown), shown(odd)),
  };
}

const notLikePrompt = (word: string): Line => ({ text: `Which one does not start like ${word}?`, speak: ['Which one does not start like', { word }, '?'] });
const ODD = line('Which one starts with a different sound?');

function startsDifferent(level: Level, rng: Rng): QuestionDraft {
  const target = rng.pick(BIG_GROUPS);
  const group = groupOf(target);
  const same = rng.sample(group.filter((each) => level === 2 || each !== target), 2);
  const odd = rng.pick(FIRST_SOUNDS.filter((each) => each.sound !== target.sound));
  const options = rng.shuffle([...same, odd]);
  const base = {
    type: 'choice' as const,
    mode: 'look' as const,
    options: options.map(shown),
    answerIndex: options.indexOf(odd),
  };
  if (level === 1) {
    return {
      ...base,
      facts: { relation: 'notLike', target: target.word, answer: odd.word, options: options.map((each) => each.word) },
      prompt: notLikePrompt(target.word),
      stimulus: shown(target),
      explanation: oddExplanation([target, ...same], odd),
    };
  }
  return {
    ...base,
    facts: { relation: 'oddSound', target: odd.word, same: same.map((each) => each.word).sort(), options: options.map((each) => each.word) },
    prompt: ODD,
    explanation: oddExplanation(same, odd),
  };
}

const sound = (word: string): SoundWord => FIRST_SOUNDS.find((entry) => entry.word === word) as SoundWord;

export const startsDifferentGenerator: SkillGenerator = {
  skillId: 'E-PK-B4',
  maxLevel: 2,
  itemTypes: ['choice'],
  lists: ['firstSounds'],
  generate: startsDifferent,
  exampleSeed: 3141,
  example: () => startsDifferent(1, makeRng(3141)),
  lesson: () => {
    const shownOne = oddExplanation([sound('ball'), sound('bear'), sound('bus')], sound('moon'));
    const tried = oddExplanation([sound('pig'), sound('pizza'), sound('pear')], sound('sun'));
    return beats(
      { text: 'Ball, bear and bus all start the same way.', speak: [...andSay(['ball', 'bear', 'bus']), 'all start the same way.'], visual: row(shown(sound('ball')), shown(sound('bear')), shown(sound('bus'))) },
      { text: `${notLikePrompt('ball').text} ${shownOne.steps.join(' ')}`, speak: [...notLikePrompt('ball').speak, ...shownOne.speak], visual: shownOne.visual },
      { ...notLikePrompt('pig'), visual: row(shown(sound('pizza')), shown(sound('sun')), shown(sound('pear'))) },
      { text: tried.steps.join(' '), speak: tried.speak, visual: tried.visual },
      { ...line('Say each word and listen to the very start.'), visual: shownOne.visual },
    );
  },
  oracle: 'earlyWords',
};

// ---- B.5 Rhyme or not ----
// Levels: "Do cat and hat rhyme?" Yes or No, in fixed places / "Which one does not rhyme?", 3 pictures.

const YES_NO: Visual[] = [
  { kind: 'text', value: 'Yes', size: 'l', speak: ['Yes'] },
  { kind: 'text', value: 'No', size: 'l', speak: ['No'] },
];
const rhymePrompt = (one: string, two: string): Line => ({ text: `Do ${one} and ${two} rhyme?`, speak: ['Do', { word: one }, 'and', { word: two }, 'rhyme?'] });

function pairExplanation(one: PictureWord, two: PictureWord, rhyme: boolean): Explanation {
  return rhyme
    ? { speak: [{ word: one.word }, 'and', { word: two.word }, 'end the same way. They rhyme.'], steps: [`${cap(one.word)} and ${two.word} end the same way.`, 'They rhyme.'], visual: row(shown(one), shown(two)) }
    : { speak: [{ word: one.word }, 'and', { word: two.word }, 'end in different ways. They do not rhyme.'], steps: [`${cap(one.word)} and ${two.word} end in different ways.`, 'They do not rhyme.'], visual: row(shown(one), shown(two)) };
}

function oddRhymeExplanation(pair: PictureWord[], odd: PictureWord): Explanation {
  const [one, two] = pair as [PictureWord, PictureWord];
  return {
    speak: [{ word: one.word }, 'and', { word: two.word }, 'rhyme.', { word: odd.word }, 'does not.'],
    steps: [`${cap(one.word)} and ${two.word} rhyme.`, `${cap(odd.word)} does not.`],
    visual: row(shown(one), shown(two), shown(odd)),
  };
}

const ODD_RHYME = line('Which one does not rhyme?');

function rhymeOrNot(level: Level, rng: Rng): QuestionDraft {
  const family = rng.pick(RHYME_FAMILIES);
  const other = rng.pick(RHYME_FAMILIES.filter((each) => each !== family));
  if (level === 1) {
    const rhyme = rng.bool();
    const [one, two] = rhyme ? (rng.sample(family, 2) as [PictureWord, PictureWord]) : rng.shuffle([rng.pick(family), rng.pick(other)]) as [PictureWord, PictureWord];
    return {
      type: 'choice',
      mode: 'look',
      fixedOrder: true,
      facts: { relation: 'rhymePair', target: `${one.word}|${two.word}`, options: ['Yes', 'No'] },
      prompt: rhymePrompt(one.word, two.word),
      stimulus: row(shown(one), shown(two)),
      options: YES_NO,
      answerIndex: rhyme ? 0 : 1,
      explanation: pairExplanation(one, two, rhyme),
    };
  }
  const pair = rng.sample(family, 2);
  const odd = rng.pick(other);
  const options = rng.shuffle([...pair, odd]);
  return {
    type: 'choice',
    mode: 'look',
    facts: { relation: 'oddRhyme', target: odd.word, pair: pair.map((each) => each.word).sort(), options: options.map((each) => each.word) },
    prompt: ODD_RHYME,
    options: options.map(shown),
    answerIndex: options.indexOf(odd),
    explanation: oddRhymeExplanation(pair, odd),
  };
}

const rhymeWord = (word: string): PictureWord => RHYME_FAMILIES.flat().find((entry) => entry.word === word) as PictureWord;

export const rhymeOrNotGenerator: SkillGenerator = {
  skillId: 'E-PK-B5',
  maxLevel: 2,
  itemTypes: ['choice'],
  lists: ['rhymes'],
  generate: rhymeOrNot,
  exampleSeed: 3151,
  example: () => rhymeOrNot(1, makeRng(3151)),
  lesson: () => {
    const yes = pairExplanation(rhymeWord('moon'), rhymeWord('spoon'), true);
    const no = pairExplanation(rhymeWord('fox'), rhymeWord('cake'), false);
    return beats(
      { text: 'Words that rhyme end the same way. Moon and spoon rhyme.', speak: ['Words that rhyme end the same way.', ...yes.speak], visual: yes.visual },
      { text: `${rhymePrompt('fox', 'cake').text} ${no.steps.join(' ')}`, speak: [...rhymePrompt('fox', 'cake').speak, ...no.speak], visual: no.visual },
      { ...rhymePrompt('mouse', 'house'), visual: row(shown(rhymeWord('mouse')), shown(rhymeWord('house'))) },
      { ...{ text: pairExplanation(rhymeWord('mouse'), rhymeWord('house'), true).steps.join(' '), speak: pairExplanation(rhymeWord('mouse'), rhymeWord('house'), true).speak }, visual: row(shown(rhymeWord('mouse')), shown(rhymeWord('house'))) },
      { ...line('Listen to the end of each word.'), visual: yes.visual },
    );
  },
  oracle: 'earlyWords',
};

// ---- B.6 Sort by first letter ----
// Levels: 4 pictures into 2 letters, two each / 6 pictures into 3 letters, two each.

const LETTERS = [...new Set(FIRST_SOUNDS.map((entry) => entry.letter))].filter((letter) => FIRST_SOUNDS.filter((entry) => entry.letter === letter).length >= 2);
const SORT = line('Put each picture with the letter it starts with.');
const bin = (letter: string): SortBin => ({ label: letter.toUpperCase(), speak: [{ letter: letter.toUpperCase() }], icon: letterSaid(letter.toUpperCase()) });

function binsExplanation(chosen: string[], items: SoundWord[]): Explanation {
  const groups = chosen.map((letter) => items.filter((entry) => entry.letter === letter));
  return {
    speak: groups.flatMap((group, i): Say => [...andSay(group.map((entry) => entry.word)), 'start with', { letter: (chosen[i] as string).toUpperCase() }, '.']),
    steps: groups.map((group, i) => `${cap(and(group.map((entry) => entry.word)))} start with ${(chosen[i] as string).toUpperCase()}.`),
    visual: row(...groups.map((group) => shown(group[0] as SoundWord))),
  };
}

function sortByLetter(level: Level, rng: Rng): QuestionDraft {
  // Letters whose words never share a sound with each other's words, so c and k never meet.
  const chosen = pickApart(LETTERS, level === 1 ? 2 : 3, rng, (letter, picked) => picked.every((other) => FIRST_SOUNDS.every((a) => a.letter !== letter || FIRST_SOUNDS.every((b) => b.letter !== other || a.sound !== b.sound))));
  const items = rng.shuffle(chosen.flatMap((letter) => rng.sample(FIRST_SOUNDS.filter((entry) => entry.letter === letter), 2)));
  return {
    type: 'sort',
    mode: 'look',
    facts: { relation: 'letterBins', target: chosen.join('|'), items: items.map((entry) => entry.word), bins: chosen },
    prompt: SORT,
    items: items.map(shown),
    bins: chosen.map(bin),
    answerBin: items.map((entry) => chosen.indexOf(entry.letter)),
    explanation: binsExplanation(chosen, items),
  };
}

export const sortByLetterGenerator: SkillGenerator = {
  skillId: 'E-PK-B6',
  maxLevel: 2,
  itemTypes: ['sort'],
  lists: ['firstSounds'],
  generate: sortByLetter,
  exampleSeed: 3161,
  example: () => sortByLetter(1, makeRng(3161)),
  lesson: () => {
    const shownOne = binsExplanation(['b', 'm'], [sound('ball'), sound('moon'), sound('bus'), sound('milk')]);
    return beats(
      { text: 'Ball and bus both start with the letter B.', speak: [{ word: 'ball' }, 'and', { word: 'bus' }, 'both start with the letter', { letter: 'B' }, '.'], visual: row(letterSaid('B'), shown(sound('ball')), shown(sound('bus'))) },
      { text: `${SORT.text} ${shownOne.steps.join(' ')}`, speak: [...SORT.speak, ...shownOne.speak], visual: shownOne.visual },
      { text: 'Does pig go with P or with T?', speak: ['Does', { word: 'pig' }, 'go with', { letter: 'P' }, 'or with', { letter: 'T' }, '?'], visual: row(shown(sound('pig')), letterSaid('P'), letterSaid('T')) },
      { text: 'Pig starts with P.', speak: [{ word: 'pig' }, 'starts with', { letter: 'P' }, '.'], visual: row(shown(sound('pig')), letterSaid('P')) },
      { ...line('Say the word slowly. Listen to the very start.'), visual: row(letterSaid('B'), shown(sound('ball'))) },
    );
  },
  oracle: 'earlyWords',
};
