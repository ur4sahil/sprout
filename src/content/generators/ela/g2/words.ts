import type { Rng } from '../../../../engine/rng';
import { makeRng } from '../../../../engine/rng';
import type { LessonStep, Level, QuestionDraft, Say, Visual } from '../../../../engine/types';
import { ANTONYMS, ANTONYMS_HARD, CONTRACTIONS, HOMOPHONES, PREFIXED, SUFFIXED, SYNONYMS, SYNONYMS_HARD } from '../../../data/phonics2';
import type { SkillGenerator } from '../../../generator';
import { cap } from '../pk/parts';

// Language Arts grade 2 B.1 to B.5: prefixes, suffixes, contractions, synonyms and antonyms, homophones.
// These are about meaning, so words may be heard when tapped, except homophones, which sound alike.

const said = (value: string): Visual => ({ kind: 'text', value, size: 'l', speak: [value] });
const plain = (value: string, size: 'm' | 'l' | 'xl' = 'l'): Visual => ({ kind: 'text', value, size });
const sentenceSay = (sentence: string): Say => [sentence.replace('___', 'blank')];

function oneOf(rng: Rng, right: string, pool: readonly string[], count = 2): string[] {
  return rng.shuffle([right, ...rng.sample([...new Set(pool.filter((each) => each !== right))], count)]);
}

function ask(prompt: string, choices: string[], right: string, facts: Record<string, string | string[]>, explanation: { speak: Say; steps: string[]; visual: Visual }, stimulus?: Visual): QuestionDraft {
  return {
    type: 'choice',
    mode: 'look',
    facts: { ...facts, options: choices },
    prompt: { text: prompt, speak: [prompt] },
    ...(stimulus ? { stimulus } : {}),
    options: choices.map(said),
    answerIndex: choices.indexOf(right),
    explanation,
  };
}

// ---- B.1 Prefixes un and re ----
// Levels: what an un word means / which word means "do again" / mixed. Oracle: ela2.

const PREFIX_RULE = 'un at the start means not, or the opposite. re at the start means again.';

function prefixQuestion(entry: (typeof PREFIXED)[number], toMeaning: boolean, rng: Rng): QuestionDraft {
  const why = { speak: [PREFIX_RULE, `${entry.word} means ${entry.meaning}.`] as Say, steps: [PREFIX_RULE, `${cap(entry.word)} means ${entry.meaning}.`], visual: plain(`${entry.prefix} + ${entry.base} = ${entry.word}`) };
  if (toMeaning) {
    // The wrong meanings: the other prefix's meaning of the same base, and another word's meaning.
    const swapped = entry.prefix === 'un' ? `${entry.base} again` : `not ${entry.base}`;
    const other = rng.pick(PREFIXED.filter((each) => each.base !== entry.base)).meaning;
    const choices = rng.shuffle([entry.meaning, swapped, other]);
    return ask(`What does ${entry.word} mean?`, choices, entry.meaning, { target: entry.word, relation: 'prefixMeaning' }, why, plain(entry.word, 'xl'));
  }
  const choices = oneOf(rng, entry.word, PREFIXED.filter((each) => each.base !== entry.base).map((each) => each.word));
  return ask(`Which word means ${entry.meaning}?`, choices, entry.word, { target: entry.meaning, relation: 'prefixWord' }, why);
}

function prefixes(level: Level, rng: Rng): QuestionDraft {
  if (level === 1) return prefixQuestion(rng.pick(PREFIXED.filter((each) => each.prefix === 'un')), true, rng);
  if (level === 2) return prefixQuestion(rng.pick(PREFIXED.filter((each) => each.prefix === 're')), false, rng);
  return prefixQuestion(rng.pick(PREFIXED), rng.bool(), rng);
}

export const prefixesGenerator: SkillGenerator = {
  skillId: 'E-2-B1',
  maxLevel: 3,
  itemTypes: ['choice'],
  lists: ['phonics2'],
  pool: { 1: 6, 2: 6 }, // six un words, six re words
  generate: prefixes,
  exampleSeed: 511,
  example: () => prefixes(1, makeRng(511)),
  lesson: (): LessonStep[] => [
    { beat: 'see', text: PREFIX_RULE, speak: [PREFIX_RULE], visual: plain('un + happy = unhappy') },
    { beat: 'watch', text: 'Unhappy means not happy. Refill means fill again.', speak: ['Unhappy means not happy. Refill means fill again.'], visual: plain('re + fill = refill') },
    { beat: 'try', text: 'What does unsafe mean?', speak: ['What does unsafe mean?'], visual: plain('unsafe', 'xl'), reveal: { text: 'Unsafe means not safe.', speak: ['Unsafe means not safe.'], visual: plain('un + safe = unsafe') } },
    { beat: 'remember', text: 'un: not. re: again.', speak: ['un means not. re means again.'], visual: plain('un + happy = unhappy') },
  ],
  oracle: 'ela2',
};

// ---- B.2 Suffixes ful, less, er, est ----
// Levels: what the word means / which word fits the sentence / mixed. Oracle: ela2.

const SUFFIX_RULE = 'ful means full of. less means without. er means more. est means the most.';
const baseOf = (meaning: string): string => meaning.replace(/^(full of|without an?|without|more|most) /, '');

function suffixQuestion(entry: (typeof SUFFIXED)[number], toMeaning: boolean, rng: Rng): QuestionDraft {
  const why = { speak: [SUFFIX_RULE, `${entry.word} means ${entry.meaning}.`] as Say, steps: [SUFFIX_RULE, `${cap(entry.word)} means ${entry.meaning}.`], visual: plain(entry.word, 'xl') };
  if (toMeaning) {
    const base = baseOf(entry.meaning);
    const forms = [`full of ${base}`, `without ${base}`, `more ${base}`, `most ${base}`].filter((each) => each !== entry.meaning && !(entry.suffix === 'less' && each.startsWith('without')));
    const choices = rng.shuffle([entry.meaning, ...rng.sample(forms, 2)]);
    return ask(`What does ${entry.word} mean?`, choices, entry.meaning, { target: entry.word, relation: 'suffixMeaning' }, why, plain(entry.word, 'xl'));
  }
  // The other words have other bases, so only one fits the sentence.
  const choices = oneOf(rng, entry.word, SUFFIXED.filter((each) => baseOf(each.meaning) !== baseOf(entry.meaning) && each.suffix !== entry.suffix).map((each) => each.word));
  return ask('Which word fits the sentence?', choices, entry.word, { target: entry.sentence, relation: 'suffixSentence' }, { ...why, visual: plain(entry.sentence.replace('___', entry.word)) }, { ...plain(entry.sentence), speak: sentenceSay(entry.sentence) });
}

function suffixes(level: Level, rng: Rng): QuestionDraft {
  const entry = rng.pick(SUFFIXED);
  return suffixQuestion(entry, level === 1 ? true : level === 2 ? false : rng.bool(), rng);
}

export const suffixesGenerator: SkillGenerator = {
  skillId: 'E-2-B2',
  maxLevel: 3,
  itemTypes: ['choice'],
  lists: ['phonics2'],
  generate: suffixes,
  exampleSeed: 512,
  example: () => suffixes(1, makeRng(512)),
  lesson: (): LessonStep[] => [
    { beat: 'see', text: SUFFIX_RULE, speak: [SUFFIX_RULE], visual: plain('help + ful = helpful') },
    { beat: 'watch', text: 'Helpful means full of help. Fearless means without fear.', speak: ['Helpful means full of help. Fearless means without fear.'], visual: plain('fear + less = fearless') },
    { beat: 'try', text: 'What does tallest mean?', speak: ['What does tallest mean?'], visual: plain('tallest', 'xl'), reveal: { text: 'Tallest means most tall.', speak: ['Tallest means most tall.'], visual: plain('tall + est = tallest') } },
    { beat: 'remember', text: SUFFIX_RULE, speak: [SUFFIX_RULE], visual: plain('help + ful = helpful') },
  ],
  oracle: 'ela2',
};

// ---- B.3 Contractions ----
// Levels: the contraction for two words / the two words for a contraction / in a sentence. Oracle: ela2.

const CONTRACTION_RULE = 'A contraction joins two words into one. An apostrophe takes the place of the letters left out.';

function contractions(level: Level, rng: Rng): QuestionDraft {
  const entry = rng.pick(CONTRACTIONS);
  const why = { speak: [CONTRACTION_RULE, `${entry.short} is short for ${entry.long}.`] as Say, steps: [CONTRACTION_RULE, `${entry.short} = ${entry.long}.`], visual: plain(`${entry.long} → ${entry.short}`) };
  const others = CONTRACTIONS.filter((each) => each !== entry);
  if (level === 2) return ask(`What two words make ${entry.short}?`, oneOf(rng, entry.long, others.map((each) => each.long)), entry.long, { target: entry.short, relation: 'contractionLong' }, why, plain(entry.short, 'xl'));
  if (level === 3) {
    const sentence = entry.sentence.replace('___', entry.long);
    const shownSentence = sentence[0]?.toUpperCase() + sentence.slice(1);
    return ask(`Which word can take the place of "${entry.long}"?`, oneOf(rng, entry.short, others.map((each) => each.short)), entry.short, { target: entry.long, relation: 'contractionShort' }, why, { ...plain(shownSentence), speak: [shownSentence] });
  }
  return ask(`Which word is short for ${entry.long}?`, oneOf(rng, entry.short, others.map((each) => each.short)), entry.short, { target: entry.long, relation: 'contractionShort' }, why);
}

export const contractionsGenerator: SkillGenerator = {
  skillId: 'E-2-B3',
  maxLevel: 3,
  itemTypes: ['choice'],
  lists: ['phonics2'],
  generate: contractions,
  exampleSeed: 513,
  example: () => contractions(1, makeRng(513)),
  lesson: (): LessonStep[] => [
    { beat: 'see', text: CONTRACTION_RULE, speak: [CONTRACTION_RULE], visual: plain("do not → don't") },
    { beat: 'watch', text: "Can not becomes can't. The apostrophe takes the place of n and o.", speak: ["Can not becomes can't. The apostrophe takes the place of the letters left out."], visual: plain("can not → can't") },
    { beat: 'try', text: 'Which word is short for I am?', speak: ['Which word is short for I am?'], visual: plain('I am', 'xl'), reveal: { text: "I am becomes I'm.", speak: ["I am becomes I'm."], visual: plain("I am → I'm") } },
    { beat: 'remember', text: 'The apostrophe shows where letters were left out.', speak: ['The apostrophe shows where letters were left out.'], visual: plain("it is → it's") },
  ],
  oracle: 'ela2',
};

// ---- B.4 Synonyms and antonyms ----
// Levels: same meaning / opposite / mixed, harder words. Oracle: ela2.

function synonyms(level: Level, rng: Rng): QuestionDraft {
  const same = level === 1 ? true : level === 2 ? false : rng.bool();
  const pairs = level === 3 ? (same ? SYNONYMS_HARD : ANTONYMS_HARD) : same ? SYNONYMS : ANTONYMS;
  const pair = rng.pick(pairs);
  const [target, right] = (rng.bool() ? [pair[0], pair[1]] : [pair[1], pair[0]]) as [string, string];
  const all = [...SYNONYMS, ...ANTONYMS, ...SYNONYMS_HARD, ...ANTONYMS_HARD];
  // A wrong option is never linked to the target or to the right word in any list, so only one fits.
  const pool = [...new Set(pairs.flat())].filter((each) => each !== target && each !== right && !all.some(([a, b]) => (a === each || b === each) && [a, b].some((x) => x === target || x === right)));
  const choices = rng.shuffle([right, ...rng.sample(pool, 2)]);
  const prompt = `Which word means ${same ? 'the same as' : 'the opposite of'} ${target}?`;
  const rule = same ? 'Words that mean the same are synonyms.' : 'Words that mean the opposite are antonyms.';
  return ask(prompt, choices, right, { target, relation: same ? 'synonym' : 'antonym' }, { speak: [rule, `${right} means ${same ? 'the same as' : 'the opposite of'} ${target}.`], steps: [rule, `${cap(right)} means ${same ? 'the same as' : 'the opposite of'} ${target}.`], visual: plain(`${target} ${same ? '=' : '↔'} ${right}`) }, said(target));
}

export const synonymsGenerator: SkillGenerator = {
  skillId: 'E-2-B4',
  maxLevel: 3,
  itemTypes: ['choice'],
  lists: ['phonics2'],
  generate: synonyms,
  exampleSeed: 514,
  example: () => synonyms(1, makeRng(514)),
  lesson: (): LessonStep[] => [
    { beat: 'see', text: 'Synonyms mean the same. Antonyms mean the opposite.', speak: ['Synonyms mean the same. Antonyms mean the opposite.'], visual: plain('big = large') },
    { beat: 'watch', text: 'Big and large mean the same. Hot and cold are opposites.', speak: ['Big and large mean the same. Hot and cold are opposites.'], visual: plain('hot ↔ cold') },
    { beat: 'try', text: 'Which word means the same as glad?', speak: ['Which word means the same as glad?'], visual: said('glad'), reveal: { text: 'Happy means the same as glad.', speak: ['Happy means the same as glad.'], visual: plain('glad = happy') } },
    { beat: 'remember', text: 'Same: synonym. Opposite: antonym.', speak: ['Same: synonym. Opposite: antonym.'], visual: plain('big = large') },
  ],
  oracle: 'ela2',
};

// ---- B.5 Homophones ----
// Levels: to, two, too / there, their and for, four / mixed. The words sound alike, so they are not spoken.
// Oracle: ela2.

function homophones(level: Level, rng: Rng): QuestionDraft {
  const pool = level === 1 ? HOMOPHONES.filter((each) => each.group.includes('two')) : level === 2 ? HOMOPHONES.filter((each) => each.group.includes('their') || each.group.includes('four')) : HOMOPHONES;
  const entry = rng.pick(pool);
  const prompt = 'Which word fits the sentence?';
  const meaning: Record<string, string> = { two: 'two is the number 2.', to: 'to points where something goes.', too: 'too means also, or more than enough.', there: 'there means in that place.', their: 'their means it belongs to them.', four: 'four is the number 4.', for: 'for means it is meant for someone.', sea: 'sea is the big salty water.', see: 'see is what eyes do.', won: 'won means came first.', one: 'one is the number 1.', write: 'write is what a pencil helps you do.', right: 'right means correct, or the side opposite left.' };
  const line = `${cap(meaning[entry.word] ?? entry.word)}`;
  // Said aloud, a number is a word: "two is the number two".
  const lineSaid = line.replace(/\d+/g, (digits) => ({ '1': 'one', '2': 'two', '4': 'four' })[digits] ?? digits);
  return {
    type: 'choice',
    mode: 'look',
    fixedOrder: true,
    facts: { target: entry.sentence, relation: 'homophone', options: [...entry.group] },
    prompt: { text: prompt, speak: [prompt, ...sentenceSay(entry.sentence)] },
    stimulus: { ...plain(entry.sentence), speak: sentenceSay(entry.sentence) },
    options: entry.group.map((each) => plain(each, 'xl')),
    answerIndex: entry.group.indexOf(entry.word),
    explanation: { speak: ['These words sound the same but mean different things.', lineSaid], steps: ['These words sound the same but mean different things.', line, entry.sentence.replace('___', entry.word)], visual: plain(entry.sentence.replace('___', entry.word)) },
  };
}

export const homophonesGenerator: SkillGenerator = {
  skillId: 'E-2-B5',
  maxLevel: 3,
  itemTypes: ['choice'],
  lists: ['phonics2'],
  pool: { 1: 3, 2: 4 },
  generate: homophones,
  exampleSeed: 515,
  example: () => homophones(1, makeRng(515)),
  lesson: (): LessonStep[] => [
    { beat: 'see', text: 'Some words sound the same but are spelled differently and mean different things.', speak: ['Some words sound the same but are spelled differently and mean different things.'], visual: plain('to   two   too') },
    { beat: 'watch', text: 'I have two dogs. Two is the number 2.', speak: ['I have two dogs. Two is the number two.'], visual: plain('I have two dogs.') },
    { beat: 'try', text: 'Which word fits? The soup is ___ hot.', speak: ['Which word fits? The soup is blank hot.'], visual: plain('The soup is ___ hot.'), reveal: { text: 'Too: more than enough. The soup is too hot.', speak: ['Too means more than enough. The soup is too hot.'], visual: plain('The soup is too hot.') } },
    { beat: 'remember', text: 'Think about what the word means, not how it sounds.', speak: ['Think about what the word means, not how it sounds.'], visual: plain('there   their') },
  ],
  oracle: 'ela2',
};
