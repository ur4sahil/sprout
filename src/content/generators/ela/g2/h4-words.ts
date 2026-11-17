import type { Rng } from '../../../../engine/rng';
import { makeRng } from '../../../../engine/rng';
import type { Level, QuestionDraft } from '../../../../engine/types';
import { ABC_GROUPS_2, DICTIONARY_WORDS, SHADES, TWO_MEANINGS } from '../../../data/h4-words';
import type { SkillGenerator } from '../../../generator';
import { choice, explain, lesson, order, plain, said } from '../g1/h4-parts';
import { abcQuestion } from '../g1/h4-words';
import { cap } from '../pk/parts';

// Language Arts grade 2 B.6 to B.9 (plan section 15 wave H4). Oracle: h4ela.

// ---- B.6 Shades of meaning ----
// Levels: which word is strongest / which is weakest / put three in order, weakest to strongest.

function shades(level: Level, rng: Rng): QuestionDraft {
  const scale = rng.pick(SHADES);
  const [weak, middle, strong] = scale;
  const why = explain([`${cap(weak)}, ${middle}, ${strong}.`, 'Each word is stronger than the one before it.'], plain(`${weak} → ${middle} → ${strong}`));
  if (level === 3) return order('Put the words in order, from weakest to strongest.', 'look', rng.shuffle(scale), scale, { relation: 'shadeOrder', target: middle }, why);
  const strongest = level === 1;
  return choice({
    prompt: strongest ? 'Which word is the strongest?' : 'Which word is the weakest?',
    options: rng.shuffle(scale),
    right: strongest ? strong : weak,
    spoken: true,
    facts: { relation: strongest ? 'shadeStrong' : 'shadeWeak', target: middle },
    why,
  });
}

export const shadesGenerator: SkillGenerator = {
  skillId: 'E-2-B6',
  maxLevel: 3,
  itemTypes: ['choice', 'order'],
  lists: ['h4-words'],
  generate: shades,
  exampleSeed: 1511,
  example: () => shades(1, makeRng(1511)),
  lesson: lesson(
    ['Some words mean almost the same thing, but one is stronger.', plain('warm → hot → boiling')],
    ['Warm is a little hot. Boiling is very, very hot.', plain('warm → hot → boiling')],
    ['Which is stronger: whisper or shout?', plain('whisper   shout'), 'Shout. It is much louder than a whisper.', plain('whisper → talk → shout')],
    ['Pick the word that says just how much.', plain('cool → cold → freezing')],
  ),
  oracle: 'h4ela',
};

// ---- B.7 Words with two meanings ----
// Levels: what the word means in a sentence, from its two meanings / from three / which sentence uses a meaning.

function twoMeanings(level: Level, rng: Rng): QuestionDraft {
  const entry = rng.pick(TWO_MEANINGS);
  const which = rng.int(0, 1);
  const sentence = entry.sentences[which] as string;
  const meaning = entry.meanings[which] as string;
  const why = explain([`${sentence}`, `Here ${entry.word} means ${meaning}.`], said(sentence));
  if (level === 3) {
    return choice({
      prompt: `Which sentence uses ${entry.word} to mean ${meaning}?`,
      options: rng.shuffle([...entry.sentences]),
      right: sentence,
      spoken: true,
      size: 'm',
      facts: { relation: 'meaningSentence', target: meaning, word: entry.word },
      why,
    });
  }
  const other = rng.pick(TWO_MEANINGS.filter((each) => each !== entry)).meanings[rng.int(0, 1)] as string;
  const options = rng.shuffle(level === 1 ? [...entry.meanings] : [...entry.meanings, other]);
  return choice({
    prompt: `What does ${entry.word} mean in this sentence?`,
    speak: [`What does ${entry.word} mean in this sentence?`, sentence],
    options,
    right: meaning,
    spoken: true,
    size: 'm',
    stimulus: said(sentence),
    facts: { relation: 'meaning', target: sentence },
    why,
  });
}

export const twoMeaningsGenerator: SkillGenerator = {
  skillId: 'E-2-B7',
  maxLevel: 3,
  itemTypes: ['choice'],
  lists: ['h4-words'],
  generate: twoMeanings,
  exampleSeed: 1512,
  example: () => twoMeanings(1, makeRng(1512)),
  lesson: lesson(
    ['Some words have two meanings. The sentence tells you which one.', plain('bat')],
    ['The bat flew out of the cave. Here a bat is an animal. She hit the ball with the bat. Here a bat is a stick.', plain('The bat flew out of the cave.')],
    ['The dog let out a loud bark. What does bark mean?', plain('The dog let out a loud bark.'), 'The sound a dog makes.', plain('bark: the sound a dog makes')],
    ['Read the whole sentence to find the meaning.', plain('bat   bark   ring')],
  ),
  oracle: 'h4ela',
};

// ---- B.8 ABC order to the second letter ----
// Levels: which word comes first / put 3 words in order / put 4 words in order. The words share a first letter.

function abcSecond(level: Level, rng: Rng): QuestionDraft {
  const group = rng.pick(ABC_GROUPS_2);
  const letter = (group[0] as string).charAt(0);
  return abcQuestion(level, rng.sample(group, level === 3 ? 4 : 3), `They all start with ${letter}, so look at the second letter.`, rng);
}

export const abcSecondGenerator: SkillGenerator = {
  skillId: 'E-2-B8',
  maxLevel: 3,
  itemTypes: ['choice', 'order'],
  lists: ['h4-words'],
  generate: abcSecond,
  exampleSeed: 1513,
  example: () => abcSecond(1, makeRng(1513)),
  lesson: lesson(
    ['When words start with the same letter, look at the second letter.', plain('sun   sand')],
    ['Sun and sand both start with s. The second letters are u and a. A comes first, so sand comes first.', plain('sand, sun')],
    ['Which comes first: pig or pan?', plain('pig   pan'), 'Pan. A comes before i.', plain('pan, pig')],
    ['Same first letter? Go to the next letter.', plain('bag, bed, box')],
  ),
  oracle: 'h4ela',
};

// ---- B.9 Guide words ----
// Levels: guide words with different first letters / the same first letter / four words, close neighbours.

function guideWords(level: Level, rng: Rng): QuestionDraft {
  const list = [...(level === 2 ? rng.pick(ABC_GROUPS_2.filter((group) => group.length >= 6)) : DICTIONARY_WORDS)].sort();
  for (;;) {
    const i = rng.int(0, list.length - 3);
    const j = rng.int(i + 2, list.length - 1);
    const a = list[i] as string;
    const b = list[j] as string;
    const inside = list.slice(i + 1, j);
    const outside = [...list.slice(0, i), ...list.slice(j + 1)];
    const wanted = level === 3 ? 3 : 2;
    if (outside.length < wanted || (level !== 2 && a.charAt(0) === b.charAt(0))) continue;
    const right = rng.pick(inside);
    // Level 3 offers the words just before and just after the page, which are the easiest to slip on.
    const near = [list[i - 1], list[j + 1]].filter((each): each is string => each !== undefined);
    const wrong = level === 3 ? [...near, ...rng.sample(outside.filter((each) => !near.includes(each)), 3 - near.length)] : rng.sample(outside, 2);
    return choice({
      prompt: `The guide words are ${a} and ${b}. Which word is on that page?`,
      options: rng.shuffle([right, ...wrong]),
      right,
      spoken: true,
      stimulus: plain(`${a} — ${b}`, 'l'),
      facts: { relation: 'guide', target: `${a} ${b}` },
      why: explain(['A word on the page comes between the two guide words in ABC order.', `${a}, ${right}, ${b}.`], plain(`${a} — ${right} — ${b}`), ['A word on the page comes between the two guide words in ABC order.', `${a}, ${right}, ${b}.`]),
    });
  }
}

export const guideWordsGenerator: SkillGenerator = {
  skillId: 'E-2-B9',
  maxLevel: 3,
  itemTypes: ['choice'],
  lists: ['h4-words'],
  generate: guideWords,
  exampleSeed: 1514,
  example: () => guideWords(1, makeRng(1514)),
  lesson: lesson(
    ['Guide words at the top of a dictionary page show the first and last word on it.', plain('cake — fan')],
    ['The guide words are cake and fan. Dog comes after cake and before fan, so dog is on the page.', plain('cake — dog — fan')],
    ['The guide words are hen and log. Is kite on the page?', plain('hen — log'), 'Yes. Kite comes between hen and log.', plain('hen — kite — log')],
    ['Between the guide words in ABC order: on the page.', plain('cake — fan')],
  ),
  oracle: 'h4ela',
};
