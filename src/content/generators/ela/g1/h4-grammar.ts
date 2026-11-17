import type { Rng } from '../../../../engine/rng';
import { makeRng } from '../../../../engine/rng';
import type { Level, QuestionDraft, SortBin } from '../../../../engine/types';
import type { PronounEntry } from '../../../data/h4-grammar';
import { ACTIONS, BE_HAVE, CAPITAL_WORD_SENTENCES, COMMON_NOUNS, DAY_SENTENCES, DAYS, JOINING, JOINING_WORDS, MONTH_SENTENCES, MONTHS, PRONOUN_ENTRIES, PROPER_NOUNS, QUESTION_WORDS, QUESTIONS, SUBJECTS_MORE, SUBJECTS_ONE, WE_ENTRIES } from '../../../data/h4-grammar';
import type { SkillGenerator } from '../../../generator';
import { cap } from '../pk/parts';
import { blankSay, choice, explain, lesson, plain, said, sort, withOthers } from './h4-parts';

// Language Arts grade 1 C.4 to C.9 (plan section 15 wave H4). Oracle: h4ela.

const FITS = 'Which word fits the sentence?';
const sentenceShown = (sentence: string) => ({ ...plain(sentence), speak: [blankSay(sentence)] });
// "The dog" reads "the dog" in the middle of a sentence; a name keeps its capital.
const inSentence = (noun: string): string => (/^(The|My) /.test(noun) ? noun.charAt(0).toLowerCase() + noun.slice(1) : noun);

// ---- C.4 Pronouns ----
// Levels: the word for a naming part (he, she, it, they) / in a second sentence / with we too.

const PRONOUNS = ['he', 'she', 'it', 'they'];

function pronounWhy(entry: PronounEntry): ReturnType<typeof explain> {
  const done = `${entry.first} ${cap(entry.pronoun)} ${entry.then}`;
  return explain([`${cap(entry.pronoun)} can take the place of ${inSentence(entry.noun)}.`, done], plain(done));
}

function pronouns(level: Level, rng: Rng): QuestionDraft {
  if (level === 1) {
    const entry = rng.pick(PRONOUN_ENTRIES);
    return choice({
      prompt: `Which word can take the place of ${inSentence(entry.noun)}?`,
      options: withOthers(rng, entry.pronoun, PRONOUNS),
      right: entry.pronoun,
      spoken: true,
      stimulus: said(entry.noun, 'xl'),
      facts: { relation: 'pronoun', target: entry.noun, capital: false },
      why: pronounWhy(entry),
    });
  }
  const entry = rng.pick(level === 2 ? PRONOUN_ENTRIES : [...PRONOUN_ENTRIES, ...WE_ENTRIES, ...WE_ENTRIES]);
  const sentence = `${entry.first} ___ ${entry.then}`;
  const all = level === 2 ? PRONOUNS : [...PRONOUNS, 'we'];
  const options = (level === 2 ? rng.shuffle(all) : withOthers(rng, entry.pronoun, all, 3)).map(cap);
  return choice({
    prompt: FITS,
    speak: [FITS, blankSay(sentence)],
    options,
    right: cap(entry.pronoun),
    spoken: true,
    stimulus: sentenceShown(sentence),
    facts: { relation: 'pronoun', target: entry.noun, capital: true },
    why: pronounWhy(entry),
  });
}

export const pronounsGenerator: SkillGenerator = {
  skillId: 'E-1-C4',
  maxLevel: 3,
  itemTypes: ['choice'],
  lists: ['h4-grammar'],
  generate: pronouns,
  exampleSeed: 1421,
  example: () => pronouns(1, makeRng(1421)),
  lesson: lesson(
    ['He, she, it, they and we can take the place of a naming word.', plain('Dad → he')],
    ['Mom has a red hat. She wears it. She takes the place of Mom.', plain('Mom has a red hat. She wears it.')],
    ['Which word can take the place of the kids?', plain('the kids'), 'They. The kids are more than one.', plain('the kids → they')],
    ['One boy: he. One girl: she. A thing: it. More than one: they.', plain('he  she  it  they')],
  ),
  oracle: 'h4ela',
};

// ---- C.5 One or more: runs or run ----
// Levels: action words / is, are, has, have, was, were / mixed.

function agree(level: Level, rng: Rng): QuestionDraft {
  const one = rng.bool();
  const subject = rng.pick(one ? SUBJECTS_ONE : SUBJECTS_MORE);
  const pairs = level === 1 ? ACTIONS : level === 2 ? BE_HAVE : [...ACTIONS, ...BE_HAVE];
  const [single, more, end] = rng.pick(pairs) as readonly [string, string, string];
  const sentence = `${subject} ___ ${end}`;
  const right = one ? single : more;
  const done = sentence.replace('___', right);
  const rule = one ? `${subject} means one, so use ${single}.` : `${subject} means more than one, so use ${more}.`;
  return choice({
    prompt: FITS,
    speak: [FITS, blankSay(sentence)],
    options: rng.shuffle([single, more]),
    right,
    spoken: true,
    stimulus: sentenceShown(sentence),
    facts: { relation: 'agree', target: sentence, subject },
    why: explain([rule, done], said(done), [rule, done]),
  });
}

export const agreeGenerator: SkillGenerator = {
  skillId: 'E-1-C5',
  maxLevel: 3,
  itemTypes: ['choice'],
  lists: ['h4-grammar'],
  generate: agree,
  exampleSeed: 1422,
  example: () => agree(1, makeRng(1422)),
  lesson: lesson(
    ['The action word changes when there is one or more than one.', plain('The dog runs. The dogs run.')],
    ['One dog runs. Two dogs run. For one, the action word gets an s.', plain('The dog runs.')],
    ['The kids ___ outside. Play or plays?', plain('The kids ___ outside.'), 'The kids play outside. Kids is more than one.', plain('The kids play outside.')],
    ['One: is, has, was. More than one: are, have, were.', plain('is  are')],
  ),
  oracle: 'h4ela',
};

// ---- C.6 Capital letters for days and months ----
// Levels: pick the sentence written right, with a day / with a month / find the word that needs a capital.

const CAPITAL_RULE = 'Days of the week and months of the year start with a capital letter.';

function capitals(level: Level, rng: Rng): QuestionDraft {
  if (level === 3) {
    const entry = rng.pick(CAPITAL_WORD_SENTENCES);
    const when = rng.pick(entry.sentence.includes(' on WHEN') ? DAYS : MONTHS);
    const shown = entry.sentence.replace('WHEN', when.toLowerCase());
    const options = rng.shuffle([when.toLowerCase(), ...entry.others]);
    const done = entry.sentence.replace('WHEN', when);
    return choice({
      prompt: 'Which word needs a capital letter?',
      speak: ['Which word needs a capital letter?', shown],
      options,
      right: when.toLowerCase(),
      spoken: true,
      stimulus: said(shown),
      facts: { relation: 'capitalWord', target: shown },
      why: explain([CAPITAL_RULE, done], plain(done)),
    });
  }
  const when = rng.pick(level === 1 ? DAYS : MONTHS);
  const template = rng.pick(level === 1 ? DAY_SENTENCES : MONTH_SENTENCES);
  const right = template.replace('WHEN', when);
  const options = rng.shuffle([right, template.replace('WHEN', when.toLowerCase()), right.charAt(0).toLowerCase() + right.slice(1)]);
  return choice({
    prompt: 'Which sentence is written the right way?',
    options,
    right,
    facts: { relation: 'capitalRight', target: right },
    why: explain([CAPITAL_RULE, 'A sentence starts with a capital letter too.'], plain(right)),
  });
}

export const capitalsGenerator: SkillGenerator = {
  skillId: 'E-1-C6',
  maxLevel: 3,
  itemTypes: ['choice'],
  lists: ['h4-grammar'],
  generate: capitals,
  exampleSeed: 1423,
  example: () => capitals(1, makeRng(1423)),
  lesson: lesson(
    [CAPITAL_RULE, plain('Monday   June')],
    ['We swim on Monday. Monday starts with a capital M.', plain('We swim on Monday.')],
    ['Which is right: july or July?', plain('july   July'), 'July. Months start with a capital letter.', plain('July')],
    ['Days and months are names, so they get capitals.', plain('Friday   May')],
  ),
  oracle: 'h4ela',
};

// ---- C.7 Common and proper nouns ----
// Levels: pick the proper noun / sort 4 / sort 6.

const NOUN_BINS: SortBin[] = [
  { label: 'Common nouns', speak: ['Common nouns'] },
  { label: 'Proper nouns', speak: ['Proper nouns'] },
];
const PROPER_RULE = 'A proper noun names one special person, place or pet. It starts with a capital letter.';

function properNouns(level: Level, rng: Rng): QuestionDraft {
  if (level === 1) {
    const right = rng.pick(PROPER_NOUNS);
    return choice({
      prompt: 'Which one is a proper noun?',
      options: rng.shuffle([right, ...rng.sample(COMMON_NOUNS, 2)]),
      right,
      spoken: true,
      facts: { relation: 'properNoun', target: right },
      why: explain([PROPER_RULE, `${right} is a special name.`], plain(right, 'xl')),
    });
  }
  const each = level === 2 ? 2 : 3;
  const proper = rng.sample(PROPER_NOUNS, each);
  const items = rng.shuffle([...rng.sample(COMMON_NOUNS, each), ...proper]);
  return sort({
    prompt: 'Put each noun in its group.',
    mode: 'look',
    items,
    bins: NOUN_BINS,
    answerBin: items.map((word) => (proper.includes(word) ? 1 : 0)),
    facts: { relation: 'nounSort', target: 'noun', bins: ['common', 'proper'] },
    why: explain([PROPER_RULE, 'A common noun names any person, place or thing.'], plain('dog   Rex')),
  });
}

export const properNounsGenerator: SkillGenerator = {
  skillId: 'E-1-C7',
  maxLevel: 3,
  itemTypes: ['choice', 'sort'],
  lists: ['h4-grammar'],
  generate: properNouns,
  exampleSeed: 1424,
  example: () => properNouns(1, makeRng(1424)),
  lesson: lesson(
    ['A common noun names any person, place or thing. A proper noun names one special one.', plain('dog   Rex')],
    ['Dog could be any dog. Rex is the name of one dog, so it is a proper noun.', plain('Rex')],
    ['Is city common or proper?', plain('city', 'xl'), 'Common. It could be any city.', plain('city', 'xl')],
    ['Proper nouns start with a capital letter.', plain('Ohio   Sam')],
  ),
  oracle: 'h4ela',
};

// ---- C.8 Question words ----
// Levels: who, what, where / with when / with why. The answer under the question shows which word fits.

const ASK_RULE: Record<string, string> = {
  Who: 'Who asks about a person.',
  What: 'What asks about a thing.',
  Where: 'Where asks about a place.',
  When: 'When asks about a time.',
  Why: 'Why asks for a reason.',
};

function questionWords(level: Level, rng: Rng): QuestionDraft {
  const words = QUESTION_WORDS.slice(0, level + 2);
  const entry = rng.pick(QUESTIONS.filter((each) => words.includes(each.word)));
  const shown = `${entry.question} ${entry.answer}`;
  const done = entry.question.replace('___', entry.word);
  return choice({
    prompt: 'Which word starts the question?',
    speak: ['Which word starts the question?', blankSay(shown)],
    options: level === 3 ? withOthers(rng, entry.word, words, 3) : rng.shuffle(words),
    right: entry.word,
    spoken: true,
    stimulus: sentenceShown(shown),
    facts: { relation: 'questionWord', target: entry.question },
    why: explain([ASK_RULE[entry.word] as string, `${done} ${entry.answer}`], plain(`${done} ${entry.answer}`)),
  });
}

export const questionWordsGenerator: SkillGenerator = {
  skillId: 'E-1-C8',
  maxLevel: 3,
  itemTypes: ['choice'],
  lists: ['h4-grammar'],
  generate: questionWords,
  exampleSeed: 1425,
  example: () => questionWords(1, makeRng(1425)),
  lesson: lesson(
    ['Who, what, where, when and why start questions.', plain('Who? What? Where?')],
    ['Where is the cat? The cat is under the bed. Where asks about a place.', plain('Where is the cat?')],
    ['Which word fits? ___ is at the door? Grandma is.', plain('___ is at the door?'), 'Who. Who asks about a person.', plain('Who is at the door?')],
    ['Who: a person. What: a thing. Where: a place. When: a time. Why: a reason.', plain('Who? What? Where? When? Why?', 'm')],
  ),
  oracle: 'h4ela',
};

// ---- C.9 Joining words and, but, or ----
// Levels: and or but / and, but or or.

const JOIN_RULE: Record<string, string> = {
  and: 'And joins things that go together.',
  but: 'But joins two ideas that are different.',
  or: 'Or gives a choice.',
};

function joining(level: Level, rng: Rng): QuestionDraft {
  const shown = level === 1 ? JOINING_WORDS.slice(0, 2) : JOINING_WORDS;
  // The word is chosen first, so each is right about as often as the others.
  const word = rng.pick(shown);
  const entry = rng.pick(JOINING.filter((each) => each.word === word));
  const done = entry.sentence.replace('___', word);
  return choice({
    prompt: FITS,
    speak: [FITS, blankSay(entry.sentence)],
    fixedOrder: true,
    options: shown,
    right: word,
    spoken: true,
    stimulus: sentenceShown(entry.sentence),
    facts: { relation: 'joining', target: entry.sentence },
    why: explain([JOIN_RULE[word] as string, done], said(done), [JOIN_RULE[word] as string, done]),
  });
}

export const joiningGenerator: SkillGenerator = {
  skillId: 'E-1-C9',
  maxLevel: 2,
  itemTypes: ['choice'],
  lists: ['h4-grammar'],
  generate: joining,
  exampleSeed: 1426,
  example: () => joining(1, makeRng(1426)),
  lesson: lesson(
    ['And, but and or join words and ideas.', plain('and   but   or')],
    ['Mom and Dad are at home. And joins two people who go together.', plain('Mom and Dad are at home.')],
    ['Is it hot ___ cold? And, but or or?', plain('Is it hot ___ cold?'), 'Or. It gives a choice: hot or cold.', plain('Is it hot or cold?')],
    ['And: together. But: different. Or: a choice.', plain('and   but   or')],
  ),
  oracle: 'h4ela',
};
