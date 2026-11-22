import type { Rng } from '../../../../engine/rng';
import { makeRng } from '../../../../engine/rng';
import type { Level, QuestionDraft, Say, SayPart } from '../../../../engine/types';
import { SIGHT_5 } from '../../../data/h4-phonics';
import { ABC_WORDS_1, WORD_GROUPS } from '../../../data/h4-words';
import type { SkillGenerator } from '../../../generator';
import { cap, pickApart } from '../pk/parts';
import { choice, explain, lesson, order, plain, said } from './h4-parts';
import type { Line } from './wording';
import { hint, line, listed } from './wording';

// Language Arts grade 1 B.4 to B.6 (plan section 15 wave H4). Oracle: h4ela.

// ---- B.4 Sight words, set 5 ----
// Levels: hear a word, tap it from 3 / from 4, with a word that starts the same. The word is heard, never shown
// in the prompt, and the options do not speak.

const first = (word: string): string => word.charAt(0);

function sightFive(level: Level, rng: Rng): QuestionDraft {
  const target = rng.pick(SIGHT_5);
  const others = SIGHT_5.filter((each) => each !== target);
  const sameStart = others.filter((each) => first(each) === first(target));
  const otherStart = others.filter((each) => first(each) !== first(target) && each.length !== target.length);
  const wrong = level === 1 ? rng.sample(otherStart, 2) : sameStart.length > 0 ? [rng.pick(sameStart), ...rng.sample(otherStart, 2)] : rng.sample(otherStart, 3);
  const options = rng.shuffle([target, ...wrong]);
  return choice({
    prompt: 'Listen. Tap the word.',
    speak: ['Tap the word', { word: target }, '.'],
    mode: 'listen',
    options,
    right: target,
    size: 'xl',
    facts: { relation: 'sight5', target },
    why: explain([`This word is ${target}.`], plain(target, 'xl'), ['This word is', { word: target }, '.'], hint('Think about how the word starts and ends. Find a word that looks that way.')),
  });
}

export const sightFiveGenerator: SkillGenerator = {
  skillId: 'E-1-B4',
  maxLevel: 2,
  itemTypes: ['choice'],
  lists: ['h4-phonics'],
  generate: sightFive,
  exampleSeed: 1411,
  example: () => sightFive(1, makeRng(1411)),
  lesson: lesson(
    ['Some words are used all the time. Learn to know them when you see them.', plain('because   always')],
    ['This word is because.', said('because', 'xl')],
    ['Which word is these?', plain('these   those'), 'This word is these. Those ends with o s e.', said('these', 'xl')],
    ['Look at the whole word, not just the first letter.', plain('these   those')],
  ),
  oracle: 'h4ela',
};

// ---- B.5 ABC order to the first letter ----
// Levels: which word comes first / put 3 words in order / put 4 words in order. Grade 2 B.8 uses the same
// questions with words that share a first letter, and looks at the second letter (`at` 1).

const byAbc = (words: readonly string[]): string[] => [...words].sort();
const big = (word: string, at: number): string => word.charAt(at).toUpperCase();

// The steps name the letter that decides each word's place, in the order the words are shown, then put the
// letters in ABC order: "Sun starts with S, queen with Q, jam with J." "J comes first, then Q, then S."
function abcSteps(level: Level, shown: readonly string[], at: 0 | 1): Line[] {
  const sorted = byAbc(shown);
  // The first word "starts with" its letter and the others are "with" theirs; for the second letter, each "has" it.
  const verb = (i: number): string => (at === 1 ? 'has' : i === 0 ? 'starts with' : 'with');
  const named = shown.map((word, i) => `${i === 0 ? cap(word) : word} ${verb(i)} ${big(word, at)}`).join(', ');
  const namedSay = shown.flatMap((word, i): SayPart[] => [...(i === 0 ? [] : [',']), { word: i === 0 ? cap(word) : word }, verb(i), { letter: big(word, at) }]);
  const [first = '', ...rest] = sorted.map((word) => big(word, at));
  const order = `${first} comes first, ${rest.map((letter) => `then ${letter}`).join(', ')}.`;
  const orderSay: Say = [{ letter: first }, 'comes first', ...rest.flatMap((letter): SayPart[] => [', then', { letter }]), '.'];
  const lines: Line[] = [line(`${named}.`, [...namedSay, '.']), line(order, orderSay)];
  if (at === 1) lines.unshift(line(`They all start with ${big(shown[0] as string, 0)}, so look at the second letter.`, ['They all start with', { letter: big(shown[0] as string, 0) }, ', so look at the second letter.']));
  lines.push(level === 1 ? `So ${sorted[0]} comes first.` : `In ABC order: ${sorted.join(', ')}.`);
  return lines;
}

export function abcQuestion(level: Level, words: readonly string[], at: 0 | 1, rng: Rng): QuestionDraft {
  const sorted = byAbc(words);
  const shown = rng.shuffle(words);
  const nudge = hint(at === 0 ? 'Look at the first letter of each word. Which comes first in the alphabet?' : 'They all start with the same letter. Look at the second letter of each word.');
  const why = explain(abcSteps(level, shown, at), plain(sorted.join(', ')), [at === 0 ? 'Look at the first letter of each word.' : 'Look at the second letter of each word.', `In ABC order: ${sorted.join(', ')}.`], nudge);
  if (level === 1) return choice({ prompt: 'Which word comes first in ABC order?', options: shown, right: sorted[0] as string, spoken: true, facts: { relation: 'abcFirst', target: sorted.join(' ') }, why });
  return order('Put the words in ABC order. Tap the first one first.', 'look', shown, sorted, { relation: 'abcOrder', target: sorted.join(' ') }, why);
}

function abcFirst(level: Level, rng: Rng): QuestionDraft {
  return abcQuestion(level, rng.sample(ABC_WORDS_1, level === 3 ? 4 : 3), 0, rng);
}

export const abcOrderGenerator: SkillGenerator = {
  skillId: 'E-1-B5',
  maxLevel: 3,
  itemTypes: ['choice', 'order'],
  lists: ['h4-words'],
  generate: abcFirst,
  exampleSeed: 1412,
  example: () => abcFirst(1, makeRng(1412)),
  lesson: lesson(
    ['ABC order puts words in the order of the alphabet.', plain('a b c d e f g')],
    ['Cat starts with c. Dog starts with d. C comes before d, so cat comes first.', plain('cat, dog')],
    ['Which comes first: sun or moon?', plain('sun   moon'), 'Moon. M comes before s.', plain('moon, sun')],
    ['Look at the first letter. Which comes first in the alphabet?', plain('a b c d e f g')],
  ),
  oracle: 'h4ela',
};

// ---- B.6 Word groups ----
// Levels: which word belongs in the group / which word does not belong / name the group.

function wordGroups(level: Level, rng: Rng): QuestionDraft {
  const group = rng.pick(WORD_GROUPS);
  const others = WORD_GROUPS.filter((each) => each !== group);
  if (level === 1) {
    const [a, b, c, right] = rng.sample(group.words, 4) as [string, string, string, string];
    const shown = [a, b, c].join(', ');
    const wrong = pickApart(others, 2, rng, () => true).map((each) => rng.pick(each.words));
    return choice({
      prompt: 'Which word belongs in this group?',
      speak: ['Which word belongs with', listed([a, b, c]), '?'],
      options: rng.shuffle([right, ...wrong]),
      right,
      spoken: true,
      stimulus: { ...plain(shown), speak: [`${cap(listed([a, b, c]))}.`] },
      facts: { relation: 'groupFits', target: shown },
      why: explain([`${cap(listed([a, b, c]))} are all ${group.name}.`, `${cap(right)} is one too.`], plain(`${shown}, ${right}`), undefined, hint('What is the same about these words? Find one more like them.')),
    });
  }
  if (level === 2) {
    const same = rng.sample(group.words, 3);
    const odd = rng.pick(rng.pick(others).words);
    const options = rng.shuffle([...same, odd]);
    return choice({
      prompt: 'Which word does not belong?',
      options,
      right: odd,
      spoken: true,
      facts: { relation: 'oddWord', target: byAbc(options).join(' ') },
      why: explain([`${cap(listed(same))} are all ${group.name}.`, `${cap(odd)} is not.`], plain(same.join(', ')), undefined, hint('Find what three of the words have in common.')),
    });
  }
  const words = rng.sample(group.words, 3);
  const shown = words.join(', ');
  const options = rng.shuffle([group.name, ...rng.sample(others, 2).map((each) => each.name)]);
  return choice({
    prompt: 'What group do these words belong to?',
    speak: ['What group do these words belong to?', `${cap(listed(words))}.`],
    options,
    right: group.name,
    spoken: true,
    stimulus: { ...plain(shown), speak: [`${cap(listed(words))}.`] },
    facts: { relation: 'groupName', target: shown },
    why: explain([`${cap(listed(words))} are all ${group.name}.`], plain(shown), undefined, hint('What kind of things are these?')),
  });
}

export const wordGroupsGenerator: SkillGenerator = {
  skillId: 'E-1-B6',
  maxLevel: 3,
  itemTypes: ['choice'],
  lists: ['h4-words'],
  generate: wordGroups,
  exampleSeed: 1413,
  example: () => wordGroups(1, makeRng(1413)),
  lesson: lesson(
    ['Words can go in groups, such as colors or clothes.', plain('red, blue, green')],
    ['Red, blue and green are colors. Shirt is not a color, it is clothes.', plain('red, blue, green')],
    ['Which word goes with bus, car and boat?', plain('bus, car, boat'), 'Train. They are all things that go.', plain('bus, car, boat, train')],
    ['Ask: what is the same about these words?', plain('shirt, sock, hat')],
  ),
  oracle: 'h4ela',
};
