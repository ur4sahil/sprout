import type { Rng } from '../../../../engine/rng';
import { makeRng } from '../../../../engine/rng';
import type { LessonStep, Level, QuestionDraft, Visual } from '../../../../engine/types';
import type { TeamWord } from '../../../data/phonics2';
import { LONG_I_WORDS, ONE_PART_WORDS, R_TEAMS, R_WORDS, TEAM_WORDS_2, TEAMS_2, TEAMS_LONG_I, THREE_PART_WORDS, TWO_PARTS } from '../../../data/phonics2';
import type { SkillGenerator } from '../../../generator';
import { numeral } from '../../../generator';
import type { Explanation } from '../pk/parts';
import { cap, picture, row } from '../pk/parts';

// Language Arts grade 2 A.1 to A.3. Every question here asks the child to read or spell, so a word the child
// must read is never spoken by its option.

const word = (value: string, size: 'm' | 'l' | 'xl' = 'l'): Visual => ({ kind: 'text', value, size });
const wordSaid = (value: string): Visual => ({ kind: 'text', value, size: 'l', speak: [{ word: value }] });
const shown = (entry: TeamWord): Visual => picture(entry.word, entry.emoji);
const gap = (entry: TeamWord): string => entry.word.replace(entry.team, '_'.repeat(entry.team.length));
const MISSING = 'Which letters are missing?';
const READ = 'Which word names the picture?';

function teamExplanation(entry: TeamWord, rule: string): Explanation {
  return { speak: [{ word: entry.word }, 'is spelled with', ...entry.team.split('').map((letter) => ({ letter })), '.', rule], steps: [`${cap(entry.word)} is spelled with ${entry.team}.`, rule], visual: row(shown(entry), wordSaid(entry.word)) };
}

// A picture (tap it to hear its name) and its word with the team taken out.
function missingTeam(entry: TeamWord, teams: readonly string[], relation: string, rule: string, fixedOrder: boolean): QuestionDraft {
  return {
    type: 'choice',
    mode: 'look',
    ...(fixedOrder ? { fixedOrder: true as const } : {}),
    facts: { target: entry.word, relation, options: [...teams] },
    prompt: { text: MISSING, speak: [MISSING] },
    stimulus: row(shown(entry), word(gap(entry), 'xl')),
    options: teams.map((team) => word(team, 'xl')),
    answerIndex: teams.indexOf(entry.team),
    explanation: teamExplanation(entry, rule),
  };
}

// The picture's word among others with the same kind of team.
function readTheWord(entry: TeamWord, pool: readonly TeamWord[], relation: string, rule: string, rng: Rng): QuestionDraft {
  const choices = rng.shuffle([entry, ...rng.sample(pool.filter((each) => each.word !== entry.word && each.team !== entry.team), 2)]);
  return {
    type: 'choice',
    mode: 'read',
    facts: { target: entry.word, relation, read: choices.map((each) => each.word), options: choices.map((each) => each.word) },
    prompt: { text: READ, speak: [READ] },
    stimulus: { kind: 'emojiGroup', emoji: entry.emoji, count: 1, layout: 'row' },
    options: choices.map((each) => word(each.word)),
    answerIndex: choices.indexOf(entry),
    explanation: teamExplanation(entry, rule),
  };
}

// ---- A.1 More vowel teams ----
// Levels: words to pictures / pick the missing team / igh and ie. Oracle: ela2.

const TEAM_RULE = 'Two letters side by side can make one vowel sound.';

function vowelTeams2(level: Level, rng: Rng): QuestionDraft {
  if (level === 1) return readTheWord(rng.pick(TEAM_WORDS_2), TEAM_WORDS_2, 'teamWord2', TEAM_RULE, rng);
  if (level === 2) {
    const entry = rng.pick(TEAM_WORDS_2);
    // The two other teams are ones that do not make a real word in the gap.
    const others = rng.sample(TEAMS_2.filter((team) => team !== entry.team && !TEAM_WORDS_2.some((each) => each.word === entry.word.replace(entry.team, team))), 2);
    return missingTeam(entry, rng.shuffle([entry.team, ...others]), 'team2', TEAM_RULE, false);
  }
  const entry = rng.pick(LONG_I_WORDS);
  return missingTeam(entry, rng.shuffle([...TEAMS_LONG_I, rng.pick(TEAMS_2)]), 'team2', 'igh and ie make the long i sound.', false);
}

export const vowelTeams2Generator: SkillGenerator = {
  skillId: 'E-2-A1',
  maxLevel: 3,
  itemTypes: ['choice'],
  lists: ['phonics2'],
  pool: { 3: 6 }, // the six igh and ie words
  generate: vowelTeams2,
  exampleSeed: 501,
  example: () => vowelTeams2(1, makeRng(501)),
  lesson: (): LessonStep[] => {
    const rain = TEAM_WORDS_2[0] as TeamWord;
    const light = LONG_I_WORDS[0] as TeamWord;
    return [
      { beat: 'see', text: TEAM_RULE, speak: [TEAM_RULE], visual: row(shown(rain), wordSaid(rain.word)) },
      { beat: 'watch', text: teamExplanation(rain, TEAM_RULE).steps.join(' '), speak: teamExplanation(rain, TEAM_RULE).speak, visual: row(shown(rain), word(gap(rain), 'xl')) },
      { beat: 'try', text: MISSING, speak: [MISSING], visual: row(shown(light), word(gap(light), 'xl')), reveal: { text: teamExplanation(light, 'igh and ie make the long i sound.').steps.join(' '), speak: teamExplanation(light, 'igh and ie make the long i sound.').speak, visual: row(shown(light), wordSaid(light.word)) } },
      { beat: 'remember', text: 'ai, ay, ee, ea, oa, ow, igh, ie: two or three letters, one sound.', speak: ['Two or three letters can make one sound.'], visual: row(shown(rain), wordSaid(rain.word)) },
    ];
  },
  oracle: 'ela2',
};

// ---- A.2 Bossy r ----
// Levels: ar or or / er, ir, ur: pick the spelling / mixed. Oracle: ela2.

const R_RULE = 'An r after a vowel changes its sound.';
const ER_RULE = 'er, ir and ur all make the same sound. Learn which one each word uses.';

function bossyR(level: Level, rng: Rng): QuestionDraft {
  if (level === 1) return missingTeam(rng.pick(R_WORDS.filter((each) => each.team === 'ar' || each.team === 'or')), ['ar', 'or'], 'team2', R_RULE, true);
  if (level === 2) return missingTeam(rng.pick(R_WORDS.filter((each) => ['er', 'ir', 'ur'].includes(each.team))), ['er', 'ir', 'ur'], 'team2', ER_RULE, true);
  const entry = rng.pick(R_WORDS);
  const others = rng.sample(R_TEAMS.filter((team) => team !== entry.team && !R_WORDS.some((each) => each.word === entry.word.replace(entry.team, team))), 2);
  return missingTeam(entry, rng.shuffle([entry.team, ...others]), 'team2', R_RULE, false);
}

export const bossyRGenerator: SkillGenerator = {
  skillId: 'E-2-A2',
  maxLevel: 3,
  itemTypes: ['choice'],
  lists: ['phonics2'],
  generate: bossyR,
  exampleSeed: 502,
  example: () => bossyR(1, makeRng(502)),
  lesson: (): LessonStep[] => {
    const car = R_WORDS[0] as TeamWord;
    const bird = R_WORDS[10] as TeamWord;
    return [
      { beat: 'see', text: R_RULE, speak: [R_RULE], visual: row(shown(car), wordSaid(car.word)) },
      { beat: 'watch', text: teamExplanation(car, R_RULE).steps.join(' '), speak: teamExplanation(car, R_RULE).speak, visual: row(shown(car), word(gap(car), 'xl')) },
      { beat: 'try', text: MISSING, speak: [MISSING], visual: row(shown(bird), word(gap(bird), 'xl')), reveal: { text: teamExplanation(bird, ER_RULE).steps.join(' '), speak: teamExplanation(bird, ER_RULE).speak, visual: row(shown(bird), wordSaid(bird.word)) } },
      { beat: 'remember', text: ER_RULE, speak: [ER_RULE], visual: row(shown(bird), wordSaid(bird.word)) },
    ];
  },
  oracle: 'ela2',
};

// ---- A.3 Two-syllable words ----
// Levels: how many parts / where it splits / which word has two parts. Oracle: ela2.

const PARTS_RULE = 'Each part of a word has one vowel sound. Clap the parts.';

function twoParts(level: Level, rng: Rng): QuestionDraft {
  if (level === 1) {
    const kind = rng.pick([1, 2, 3]);
    const target = kind === 1 ? rng.pick(ONE_PART_WORDS) : kind === 2 ? rng.pick(TWO_PARTS).word : rng.pick(THREE_PART_WORDS);
    const prompt = 'How many parts does this word have?';
    return {
      type: 'choice',
      mode: 'read',
      fixedOrder: true,
      facts: { target, relation: 'parts2', read: [target], options: [1, 2, 3] },
      prompt: { text: prompt, speak: [prompt] },
      stimulus: word(target, 'xl'),
      options: [1, 2, 3].map((n) => numeral(n, 'xl')),
      answerIndex: kind - 1,
      explanation: { speak: [PARTS_RULE, 'This word has', { number: kind }, kind === 1 ? 'part.' : 'parts.'], steps: [PARTS_RULE, `${cap(target)} has ${kind} ${kind === 1 ? 'part' : 'parts'}.`], visual: word(target, 'xl') },
    };
  }
  const entry = rng.pick(TWO_PARTS);
  const split = entry.parts.join('-');
  if (level === 2) {
    // The wrong splits: one letter to the left or to the right of the right place.
    const at = entry.parts[0].length;
    const cut = (n: number): string => `${entry.word.slice(0, n)}-${entry.word.slice(n)}`;
    const choices = rng.shuffle([split, cut(at - 1), cut(at + 1)]);
    const prompt = 'Where does the word split into parts?';
    return {
      type: 'choice',
      mode: 'read',
      facts: { target: entry.word, relation: 'split2', read: [entry.word], options: choices },
      prompt: { text: prompt, speak: [prompt] },
      stimulus: row(picture(entry.word, entry.emoji), word(entry.word, 'xl')),
      options: choices.map((each) => word(each)),
      answerIndex: choices.indexOf(split),
      explanation: { speak: [PARTS_RULE], steps: [PARTS_RULE, `${cap(entry.word)} splits as ${split}.`], visual: word(split, 'xl') },
    };
  }
  const choices = rng.shuffle([entry.word, rng.pick(ONE_PART_WORDS), rng.pick(THREE_PART_WORDS)]);
  const prompt = 'Which word has two parts?';
  return {
    type: 'choice',
    mode: 'read',
    facts: { target: entry.word, relation: 'twoParts', read: choices, options: choices },
    prompt: { text: prompt, speak: [prompt] },
    options: choices.map((each) => word(each)),
    answerIndex: choices.indexOf(entry.word),
    explanation: { speak: [PARTS_RULE], steps: [PARTS_RULE, `${cap(entry.word)} has two parts: ${split}.`], visual: word(split, 'xl') },
  };
}

export const twoPartsGenerator: SkillGenerator = {
  skillId: 'E-2-A3',
  maxLevel: 3,
  itemTypes: ['choice'],
  lists: ['phonics2'],
  generate: twoParts,
  exampleSeed: 503,
  example: () => twoParts(1, makeRng(503)),
  lesson: (): LessonStep[] => [
    { beat: 'see', text: PARTS_RULE, speak: [PARTS_RULE], visual: word('rab-bit', 'xl') },
    { beat: 'watch', text: 'Rabbit has two parts: rab-bit.', speak: [{ word: 'rabbit' }, 'has two parts.'], visual: word('rab-bit', 'xl') },
    { beat: 'try', text: 'How many parts does this word have?', speak: ['How many parts does this word have?'], visual: word('pencil', 'xl'), reveal: { text: 'Pencil has two parts: pen-cil.', speak: [{ word: 'pencil' }, 'has two parts.'], visual: word('pen-cil', 'xl') } },
    { beat: 'remember', text: 'One vowel sound, one part.', speak: ['One vowel sound, one part.'], visual: word('kit-ten', 'xl') },
  ],
  oracle: 'ela2',
};
