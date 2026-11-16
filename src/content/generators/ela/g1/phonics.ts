import type { Rng } from '../../../../engine/rng';
import { makeRng } from '../../../../engine/rng';
import type { LessonStep, Level, QuestionDraft, Say, SortBin, Visual } from '../../../../engine/types';
import { ALPHABET } from '../../../data/letters';
import type { PartWord } from '../../../data/phonics1';
import { BLEND_ENDS, BLEND_STARTS, DIGRAPH_ENDS, DIGRAPH_STARTS, DIGRAPHS, SILENT_E_PAIRS, SILENT_E_PICTURES, VOWEL_TEAM_WORDS, VOWEL_TEAMS_LIST } from '../../../data/phonics1';
import type { SkillGenerator } from '../../../generator';
import type { Explanation } from '../pk/parts';
import { cap, picture, row } from '../pk/parts';

// Language Arts grade 1 A.1 to A.5. A voice cannot say a lone sound, so every prompt uses whole
// words. In the listen questions the word is spoken, never shown, and nothing on screen says it.

const word = (value: string, size: 'm' | 'l' | 'xl' = 'l'): Visual => ({ kind: 'text', value, size });
const wordSaid = (value: string, size: 'm' | 'l' | 'xl' = 'l'): Visual => ({ kind: 'text', value, size, speak: [{ word: value }] });
const silent = (emoji: string): Visual => ({ kind: 'emojiGroup', emoji, count: 1, layout: 'row' });
const shown = (entry: { word: string; emoji: string }): Visual => picture(entry.word, entry.emoji);
const spelled = (letters: string): Say => letters.split('').map((letter) => ({ letter }));
const MISSING = 'Which letters are missing?';
const missingSpeak = (value: string): Say => ['Which letters are missing in', { word: value }, '?'];
// The word with one part taken out: "__ip" for ship, "ha__" for hand, "r__n" for rain.
const gap = (entry: PartWord): string => entry.word.replace(entry.part, '_'.repeat(entry.part.length));
const whereIs = (entry: PartWord): 'start' | 'end' | 'middle' => (entry.word.startsWith(entry.part) ? 'start' : entry.word.endsWith(entry.part) ? 'end' : 'middle');

function partExplanation(entry: PartWord): Explanation {
  const where = whereIs(entry);
  const told = where === 'start' ? 'starts with' : where === 'end' ? 'ends with' : 'has';
  const tail = where === 'middle' ? ' in the middle' : '';
  return { speak: [{ word: entry.word }, told, ...spelled(entry.part), `${tail}.`.trim()], steps: [`${cap(entry.word)} ${told} ${entry.part}${tail}.`], visual: row(shown(entry), wordSaid(entry.word)) };
}

// A picture, its word with a gap, and the letter pairs to choose from. The word is heard, not shown.
function missingPart(entry: PartWord, relation: string, parts: readonly string[], fixedOrder: boolean): QuestionDraft {
  return {
    type: 'choice',
    mode: 'listen',
    ...(fixedOrder ? { fixedOrder: true as const } : {}),
    facts: { target: entry.word, relation, options: [...parts] },
    prompt: { text: MISSING, speak: missingSpeak(entry.word) },
    stimulus: row(silent(entry.emoji), word(gap(entry), 'xl')),
    options: parts.map((part) => word(part)),
    answerIndex: parts.indexOf(entry.part),
    explanation: partExplanation(entry),
  };
}

function partLesson(see: string, one: PartWord, two: PartWord, remember: string): () => LessonStep[] {
  return () => [
    { beat: 'see', text: see, speak: [see], visual: row(shown(one), wordSaid(one.word)) },
    { beat: 'watch', text: partExplanation(one).steps.join(' '), speak: partExplanation(one).speak, visual: row(shown(one), wordSaid(one.word)) },
    { beat: 'try', text: `Which letters are missing in ${two.word}?`, speak: missingSpeak(two.word), visual: row(shown(two), word(gap(two), 'xl')), reveal: { text: partExplanation(two).steps.join(' '), speak: partExplanation(two).speak, visual: row(shown(two), wordSaid(two.word)) } },
    { beat: 'remember', text: remember, speak: [remember], visual: row(shown(one), wordSaid(one.word)) },
  ];
}

// ---- A.1 Digraphs: sh, ch, th, wh ----
// Family: Digraphs and blends. Oracle: wordSet.
// Levels: pick the digraph at the start / at the end (sh, ch and th only).

function digraphs(level: Level, rng: Rng): QuestionDraft {
  if (level === 2) return missingPart(rng.pick(DIGRAPH_ENDS), 'digraph', DIGRAPHS.slice(0, 3), true);
  // The pair of letters is chosen first, so th and wh, with one word each, come up as often as sh and ch.
  const part = rng.pick(DIGRAPHS);
  return missingPart(rng.pick(DIGRAPH_STARTS.filter((entry) => entry.part === part)), 'digraph', DIGRAPHS, true);
}

export const digraphsGenerator: SkillGenerator = {
  skillId: 'E-1-A1',
  maxLevel: 2,
  itemTypes: ['choice'],
  lists: ['phonics1'],
  pool: { 2: 7 }, // seven words end in a digraph
  generate: digraphs,
  exampleSeed: 401,
  example: () => digraphs(1, makeRng(401)),
  lesson: partLesson('Two letters can work together to make one sound.', DIGRAPH_STARTS[0] as PartWord, DIGRAPH_ENDS[0] as PartWord, 'Two letters can work together.'),
  oracle: 'wordSet',
};

// ---- A.2 Consonant blends ----
// Oracles: wordSet, and spell for the tiles level.
// Levels: pick the starting blend / pick the ending blend / spell with tiles.

function blends(level: Level, rng: Rng): QuestionDraft {
  if (level === 3) {
    // The whole word from letter tiles, with two spare letters.
    const entry = rng.pick([...BLEND_STARTS, ...BLEND_ENDS]);
    const letters = entry.word.split('');
    const spare = rng.sample(ALPHABET.filter((letter) => !letters.includes(letter) && !'aeiouqxz'.includes(letter)), 2);
    return {
      type: 'tiles',
      mode: 'listen',
      facts: { target: entry.word, word: entry.word, parts: letters, oracle: 'spell' },
      prompt: { text: 'Spell the word.', speak: ['Spell the word', { word: entry.word }, '.'] },
      stimulus: silent(entry.emoji),
      slots: letters.length,
      bank: rng.shuffle([...letters, ...spare]),
      answer: entry.word,
      explanation: { speak: [{ word: entry.word }, 'is spelled', ...spelled(entry.word), '.'], steps: [`${cap(entry.word)} is spelled ${letters.join(', ')}.`], visual: row(shown(entry), wordSaid(entry.word)) },
    };
  }
  const list = level === 1 ? BLEND_STARTS : BLEND_ENDS;
  const entry = rng.pick(list);
  const others = rng.sample([...new Set(list.map((each) => each.part))].filter((part) => part !== entry.part), 2);
  return missingPart(entry, 'blend', rng.shuffle([entry.part, ...others]), false);
}

export const blendsGenerator: SkillGenerator = {
  skillId: 'E-1-A2',
  maxLevel: 3,
  itemTypes: ['choice', 'tiles'],
  lists: ['phonics1', 'letters'],
  generate: blends,
  exampleSeed: 402,
  example: () => blends(1, makeRng(402)),
  lesson: partLesson('In a blend, two letters sit side by side and you hear both.', BLEND_STARTS[0] as PartWord, BLEND_ENDS[0] as PartWord, 'Say both sounds, one after the other.'),
  oracle: 'wordSet',
};

// ---- A.3 Silent e ----
// Family: Silent e. Oracle: wordSet.
// Levels: hear a word, pick cap or cape / hear a word, pick it from 3 / see a picture, pick its word.

const FIND = 'Find the word.';
const pairOf = (value: string): readonly [string, string] => SILENT_E_PAIRS.find((pair) => pair.includes(value)) as readonly [string, string];
const vowelIn = (value: string): string => value.charAt(1);

function silentExplanation(value: string): Explanation {
  const [short, long] = pairOf(value);
  const vowel = vowelIn(value);
  const visual = row(wordSaid(short), wordSaid(long));
  if (value === long) return { speak: ['The', { letter: 'e' }, 'at the end makes the', { letter: vowel }, 'say its name. The word is', { word: value }, '.'], steps: [`The e at the end makes the ${vowel} say its name.`, `The word is ${value}.`], visual };
  return { speak: ['There is no', { letter: 'e' }, 'at the end, so the', { letter: vowel }, 'is short. The word is', { word: value }, '.'], steps: [`There is no e at the end, so the ${vowel} is short.`, `The word is ${value}.`], visual };
}

function silentE(level: Level, rng: Rng): QuestionDraft {
  if (level === 3) {
    // The picture says its word. The words do not.
    const entry = rng.pick(SILENT_E_PICTURES);
    const other = rng.pick(SILENT_E_PAIRS.filter((pair) => !pair.includes(entry.word)).flat());
    const options = rng.shuffle([...pairOf(entry.word), other]);
    const prompt = 'Which word matches the picture?';
    return { type: 'choice', mode: 'look', facts: { target: entry.word, relation: 'silentE', options }, prompt: { text: prompt, speak: [prompt] }, stimulus: shown(entry), options: options.map((each) => word(each)), answerIndex: options.indexOf(entry.word), explanation: silentExplanation(entry.word) };
  }
  const target = rng.pick(SILENT_E_PAIRS.flat());
  const third = rng.pick(SILENT_E_PAIRS.filter((pair) => !pair.includes(target)).flat());
  const options = rng.shuffle(level === 1 ? [...pairOf(target)] : [...pairOf(target), third]);
  return { type: 'choice', mode: 'listen', facts: { target, relation: 'silentE', options }, prompt: { text: FIND, speak: ['Find the word', { word: target }, '.'] }, options: options.map((each) => word(each)), answerIndex: options.indexOf(target), explanation: silentExplanation(target) };
}

export const silentEGenerator: SkillGenerator = {
  skillId: 'E-1-A3',
  maxLevel: 3,
  itemTypes: ['choice'],
  lists: ['phonics1'],
  pool: { 3: 6 }, // six of the words have a picture
  generate: silentE,
  exampleSeed: 403,
  example: () => silentE(1, makeRng(403)),
  lesson: (): LessonStep[] => [
    { beat: 'see', text: 'An e at the end of a word is quiet. It changes the vowel before it.', speak: ['An', { letter: 'e' }, 'at the end of a word is quiet. It changes the vowel before it.'], visual: row(wordSaid('cap'), wordSaid('cape')) },
    { beat: 'watch', text: silentExplanation('cape').steps.join(' '), speak: silentExplanation('cape').speak, visual: row(wordSaid('cap'), wordSaid('cape')) },
    { beat: 'try', text: 'Find the word kite.', speak: ['Find the word', { word: 'kite' }, '.'], visual: row(wordSaid('kit'), wordSaid('kite')), reveal: { text: silentExplanation('kite').steps.join(' '), speak: silentExplanation('kite').speak, visual: row(wordSaid('kit'), wordSaid('kite')) } },
    { beat: 'remember', text: 'An e at the end can change the vowel.', speak: ['An', { letter: 'e' }, 'at the end can change the vowel.'], visual: row(wordSaid('pin'), wordSaid('pine')) },
  ],
  oracle: 'wordSet',
};

// ---- A.4 Vowel teams ----
// Family: Vowel teams. Oracle: wordSet.
// Levels: ai, ee, oa words to pictures / pick the missing team.

const READ = 'Read the word. Which picture matches?';

function vowelTeams(level: Level, rng: Rng): QuestionDraft {
  const entry = rng.pick(VOWEL_TEAM_WORDS);
  if (level === 2) return missingPart(entry, 'vowelTeam', VOWEL_TEAMS_LIST, true);
  const options = rng.shuffle([entry, ...rng.sample(VOWEL_TEAM_WORDS.filter((each) => each !== entry), 2)]);
  return {
    type: 'choice',
    mode: 'read',
    facts: { target: entry.word, relation: 'teamWord', read: [entry.word], options: options.map((each) => each.word) },
    prompt: { text: READ, speak: [READ] },
    stimulus: word(entry.word, 'xl'),
    options: options.map(shown),
    answerIndex: options.indexOf(entry),
    explanation: { speak: ['This word is', { word: entry.word }, '.', ...partExplanation(entry).speak], steps: [`This word is ${entry.word}.`, ...partExplanation(entry).steps], visual: row(wordSaid(entry.word), shown(entry)) },
  };
}

export const vowelTeamsGenerator: SkillGenerator = {
  skillId: 'E-1-A4',
  maxLevel: 2,
  itemTypes: ['choice'],
  lists: ['phonics1'],
  generate: vowelTeams,
  exampleSeed: 404,
  example: () => vowelTeams(1, makeRng(404)),
  lesson: partLesson('Two vowels side by side can make one sound.', VOWEL_TEAM_WORDS[0] as PartWord, VOWEL_TEAM_WORDS[6] as PartWord, 'Two vowels can make one sound.'),
  oracle: 'wordSet',
};

// ---- A.5 Short or long vowel ----
// Family: Short or long vowel. Oracle: sortBy.
// Levels: sort 4 words / 6 words. The words are the silent e pairs.

const VOWEL_BINS: SortBin[] = [
  { label: 'Short vowel', speak: ['Short vowel'] },
  { label: 'Long vowel', speak: ['Long vowel'] },
];
const LENGTHS = ['short', 'long'];
const GROUP = 'Put each word in its group.';

function shortOrLong(level: Level, rng: Rng): QuestionDraft {
  const each = level === 1 ? 2 : 3;
  // Short and long words in equal number, never both words of one pair: cap and cape side by side would give it away.
  const pairs = rng.sample(SILENT_E_PAIRS, each * 2);
  const words = rng.shuffle(pairs.map((pair, i) => (i < each ? pair[0] : pair[1])));
  const itemAttrs = words.map((value) => (value.endsWith('e') ? 'long' : 'short'));
  const short = words.find((value) => !value.endsWith('e')) as string;
  const long = words.find((value) => value.endsWith('e')) as string;
  return {
    type: 'sort',
    mode: 'read',
    facts: { itemAttrs, binAttrs: LENGTHS, read: words },
    prompt: { text: GROUP, speak: [GROUP] },
    items: words.map((value) => word(value)),
    bins: VOWEL_BINS,
    answerBin: itemAttrs.map((attr) => LENGTHS.indexOf(attr)),
    explanation: { speak: [{ word: short }, 'has a short vowel.', { word: long }, 'has a long vowel.'], steps: [`${cap(short)} has a short vowel.`, `${cap(long)} has a long vowel.`], visual: row(wordSaid(short), wordSaid(long)) },
  };
}

export const shortOrLongGenerator: SkillGenerator = {
  skillId: 'E-1-A5',
  maxLevel: 2,
  itemTypes: ['sort'],
  lists: ['phonics1'],
  generate: shortOrLong,
  exampleSeed: 405,
  example: () => shortOrLong(1, makeRng(405)),
  lesson: (): LessonStep[] => [
    { beat: 'see', text: 'A long vowel says its own name. A short vowel does not.', speak: ['A long vowel says its own name. A short vowel does not.'], visual: row(wordSaid('cap'), wordSaid('cape')) },
    { beat: 'watch', text: 'Cap has a short vowel. Cape has a long vowel.', speak: [{ word: 'cap' }, 'has a short vowel.', { word: 'cape' }, 'has a long vowel.'], visual: row(wordSaid('cap'), wordSaid('cape')) },
    { beat: 'try', text: 'Does kite have a short vowel or a long vowel?', speak: ['Does', { word: 'kite' }, 'have a short vowel or a long vowel?'], visual: wordSaid('kite', 'xl'), reveal: { text: 'Kite has a long vowel.', speak: [{ word: 'kite' }, 'has a long vowel.'], visual: wordSaid('kite', 'xl') } },
    { beat: 'remember', text: 'A long vowel says its name.', speak: ['A long vowel says its name.'], visual: row(wordSaid('pin'), wordSaid('pine')) },
  ],
  oracle: 'sortBy',
};
