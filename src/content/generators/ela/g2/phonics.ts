import type { Rng } from '../../../../engine/rng';
import { makeRng } from '../../../../engine/rng';
import type { SoundKey } from '../../../../engine/letterSounds';
import type { Explanation, Hint, LessonStep, Level, QuestionDraft, Say, Visual } from '../../../../engine/types';
import type { TeamWord } from '../../../data/phonics2';
import { LONG_I_WORDS, ONE_PART_WORDS, R_TEAMS, R_WORDS, TEAM_WORDS_2, TEAMS_2, TEAMS_LONG_I, THREE_PART_WORDS, TWO_PARTS } from '../../../data/phonics2';
import type { SkillGenerator } from '../../../generator';
import { numeral } from '../../../generator';
import { cap, picture, row } from '../pk/parts';
import type { Line } from '../g1/wording';
import { groups, hint, line, shownSound, spell, stepsOf } from '../g1/wording';

// Language Arts grade 2 A.1 to A.3. Every question here asks the child to read or spell, so a word the child
// must read is never spoken by its option. Steps name the letters, then say their sound.

const word = (value: string, size: 'm' | 'l' | 'xl' = 'l'): Visual => ({ kind: 'text', value, size });
const wordSaid = (value: string): Visual => ({ kind: 'text', value, size: 'l', speak: [{ word: value }] });
const shown = (entry: TeamWord): Visual => picture(entry.word, entry.emoji);
// The gap is as wide as the longest team offered, so its length never tells which team is missing.
const gap = (entry: TeamWord, width: number): string => entry.word.replace(entry.team, '_'.repeat(width));
const MISSING = 'Which letters are missing?';
const READ = 'Which word names the picture?';
const widest = (teams: readonly string[]): number => Math.max(...teams.map((team) => team.length));

// The sound each team makes. ow here is the ow of snow, which says /ō/.
const TEAM_SOUND: Record<string, SoundKey> = { ai: 'ai', ay: 'ay', ee: 'ee', ea: 'ea', oa: 'oa', ow: 'long-o', igh: 'igh', ie: 'ie', ar: 'ar', or: 'or', er: 'er', ir: 'ir', ur: 'ur' };
const soundOfTeam = (team: string): SoundKey => TEAM_SOUND[team] as SoundKey;

// "Seal has ea in the middle: /ē/." said with the letters one by one, then the sound.
function teamLine(entry: TeamWord): Line {
  const told = entry.word.startsWith(entry.team) ? 'starts with' : entry.word.endsWith(entry.team) ? 'ends with' : 'has';
  const tail = told === 'has' ? ' in the middle' : '';
  const sound = soundOfTeam(entry.team);
  return line(`${cap(entry.word)} ${told} ${entry.team}${tail}: ${shownSound(sound)}.`, [{ word: cap(entry.word) }, told, ...spell(entry.team), `${tail}:`.trim(), { sound }, '.']);
}

// "The letters ea and ee both say /ē/." for two teams that make one sound.
function bothLine(team: string, partner: string): Line {
  const sound = soundOfTeam(team);
  return line(`The letters ${team} and ${partner} both say ${shownSound(sound)}.`, ['The letters', ...groups([team, partner]), 'both say', { sound }, '.']);
}

function teamExplanation(entry: TeamWord, rules: readonly Line[], nudge: Hint): Explanation {
  const lines = [teamLine(entry), ...rules];
  return { speak: lines.flatMap((each): Say => (typeof each === 'string' ? [each] : each.say)), ...stepsOf(lines), visual: row(shown(entry), wordSaid(entry.word)), hint: nudge };
}

const TAP_HINT = hint('Tap the picture to hear its name. Which letters make its vowel sound?');

// A picture (tap it to hear its name) and its word with the team taken out.
function missingTeam(entry: TeamWord, teams: readonly string[], relation: string, rules: readonly Line[], fixedOrder: boolean, nudge: Hint = TAP_HINT): QuestionDraft {
  return {
    type: 'choice',
    mode: 'look',
    ...(fixedOrder ? { fixedOrder: true as const } : {}),
    facts: { target: entry.word, relation, options: [...teams] },
    prompt: { text: MISSING, speak: [MISSING] },
    stimulus: row(shown(entry), word(gap(entry, widest(teams)), 'xl')),
    options: teams.map((team) => word(team, 'xl')),
    answerIndex: teams.indexOf(entry.team),
    explanation: teamExplanation(entry, rules, nudge),
  };
}

// The picture's word among others with the same kind of team.
function readTheWord(entry: TeamWord, pool: readonly TeamWord[], relation: string, rules: readonly Line[], rng: Rng): QuestionDraft {
  const choices = rng.shuffle([entry, ...rng.sample(pool.filter((each) => each.word !== entry.word && each.team !== entry.team), 2)]);
  return {
    type: 'choice',
    mode: 'read',
    facts: { target: entry.word, relation, read: choices.map((each) => each.word), options: choices.map((each) => each.word) },
    prompt: { text: READ, speak: [READ] },
    stimulus: { kind: 'emojiGroup', emoji: entry.emoji, count: 1, layout: 'row' },
    options: choices.map((each) => word(each.word)),
    answerIndex: choices.indexOf(entry),
    explanation: teamExplanation(entry, rules, hint('Say the name of the picture. Which word spells it?')),
  };
}

// ---- A.1 More vowel teams ----
// Levels: words to pictures / pick the missing team / igh and ie. Oracle: ela2.

const TEAM_RULE = 'Two letters side by side can make one vowel sound.';
// Teams that make the same sound: ai and ay, ee and ea, oa and ow.
const PARTNER: Record<string, string> = { ai: 'ay', ay: 'ai', ee: 'ea', ea: 'ee', oa: 'ow', ow: 'oa' };
const partnerLine = (team: string): Line => bothLine(team, PARTNER[team] as string);
// Where igh and ie are found, so a child can tell which one a word uses.
const LONG_I_WHERE: Record<string, Line> = {
  igh: line('The letters igh often come before a t, as in night.', ['The letters', ...spell('igh'), 'often come before a', { letter: 't' }, ', as in', { word: 'night' }, '.']),
  ie: line('The letters ie often come at or near the end, as in pie.', ['The letters', ...spell('ie'), 'often come at or near the end, as in', { word: 'pie' }, '.']),
};
const longIRules = (team: string): Line[] => [bothLine('igh', 'ie'), LONG_I_WHERE[team] as Line];

function vowelTeams2(level: Level, rng: Rng): QuestionDraft {
  if (level === 1) {
    const entry = rng.pick(TEAM_WORDS_2);
    return readTheWord(entry, TEAM_WORDS_2, 'teamWord2', [partnerLine(entry.team)], rng);
  }
  if (level === 2) {
    const entry = rng.pick(TEAM_WORDS_2);
    // The two other teams are ones that do not make a real word in the gap.
    const others = rng.sample(TEAMS_2.filter((team) => team !== entry.team && !TEAM_WORDS_2.some((each) => each.word === entry.word.replace(entry.team, team))), 2);
    return missingTeam(entry, rng.shuffle([entry.team, ...others]), 'team2', [partnerLine(entry.team)], false);
  }
  const entry = rng.pick(LONG_I_WORDS);
  return missingTeam(entry, rng.shuffle([...TEAMS_LONG_I, rng.pick(TEAMS_2)]), 'team2', longIRules(entry.team), false);
}

export const vowelTeams2Generator: SkillGenerator = {
  skillId: 'E-2-A1',
  maxLevel: 3,
  itemTypes: ['choice'],
  lists: ['phonics2'],
  pool: { 3: 5 }, // the five igh and ie words
  generate: vowelTeams2,
  exampleSeed: 501,
  example: () => vowelTeams2(1, makeRng(501)),
  lesson: (): LessonStep[] => {
    const rain = TEAM_WORDS_2[0] as TeamWord;
    const light = LONG_I_WORDS[0] as TeamWord;
    return [
      { beat: 'see', text: TEAM_RULE, speak: [TEAM_RULE], visual: row(shown(rain), wordSaid(rain.word)) },
      { beat: 'watch', text: teamExplanation(rain, [partnerLine('ai')], TAP_HINT).steps.join(' '), speak: teamExplanation(rain, [partnerLine('ai')], TAP_HINT).speak, visual: row(shown(rain), word(gap(rain, 2), 'xl')) },
      { beat: 'try', text: MISSING, speak: [MISSING], visual: row(shown(light), word(gap(light, 3), 'xl')), reveal: { text: teamExplanation(light, longIRules('igh'), TAP_HINT).steps.join(' '), speak: teamExplanation(light, longIRules('igh'), TAP_HINT).speak, visual: row(shown(light), wordSaid(light.word)) } },
      { beat: 'remember', text: 'ai, ay, ee, ea, oa, ow, igh, ie: two or three letters, one sound.', speak: ['Two or three letters can make one sound.'], visual: row(shown(rain), wordSaid(rain.word)) },
    ];
  },
  oracle: 'ela2',
};

// ---- A.2 Bossy r ----
// Levels: ar or or / er, ir, ur: pick the spelling / mixed. Oracle: ela2.

const R_RULE = 'An r after a vowel changes its sound.';
// ar and or sound different; er, ir and ur sound the same, so the step names which one this word uses.
const AR_OR: Line = line(`The letters ar say ${shownSound('ar')}, as in car. The letters or say ${shownSound('or')}, as in corn.`, ['The letters', ...spell('ar'), 'say', { sound: 'ar' }, ', as in', { word: 'car' }, '. The letters', ...spell('or'), 'say', { sound: 'or' }, ', as in', { word: 'corn' }, '.']);
const erLine = (entry: TeamWord): Line =>
  line(`The letters er, ir and ur all say ${shownSound('er')}. ${cap(entry.word)} uses ${entry.team}.`, ['The letters', ...groups(['er', 'ir', 'ur']), 'all say', { sound: 'er' }, '.', { word: cap(entry.word) }, 'uses', ...spell(entry.team), '.']);
const rRules = (entry: TeamWord): Line[] => [entry.team === 'ar' || entry.team === 'or' ? AR_OR : erLine(entry)];
// No team in a hint: every one is offered.
const R_HINT = hint('Tap the picture and say its name. Listen to the vowel before the r.');
const ER_HINT = hint('Three spellings sound the same here. Think about how the word looks when you read it.');

function bossyR(level: Level, rng: Rng): QuestionDraft {
  if (level === 1) {
    const entry = rng.pick(R_WORDS.filter((each) => each.team === 'ar' || each.team === 'or'));
    return missingTeam(entry, ['ar', 'or'], 'team2', rRules(entry), true, R_HINT);
  }
  if (level === 2) {
    const entry = rng.pick(R_WORDS.filter((each) => ['er', 'ir', 'ur'].includes(each.team)));
    return missingTeam(entry, ['er', 'ir', 'ur'], 'team2', rRules(entry), true, ER_HINT);
  }
  const entry = rng.pick(R_WORDS);
  const others = rng.sample(R_TEAMS.filter((team) => team !== entry.team && !R_WORDS.some((each) => each.word === entry.word.replace(entry.team, team))), 2);
  return missingTeam(entry, rng.shuffle([entry.team, ...others]), 'team2', rRules(entry), false, R_HINT);
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
      { beat: 'watch', text: teamExplanation(car, rRules(car), R_HINT).steps.join(' '), speak: teamExplanation(car, rRules(car), R_HINT).speak, visual: row(shown(car), word(gap(car, 2), 'xl')) },
      { beat: 'try', text: MISSING, speak: [MISSING], visual: row(shown(bird), word(gap(bird, 2), 'xl')), reveal: { text: teamExplanation(bird, rRules(bird), ER_HINT).steps.join(' '), speak: teamExplanation(bird, rRules(bird), ER_HINT).speak, visual: row(shown(bird), wordSaid(bird.word)) } },
      { beat: 'remember', text: 'Er, ir and ur all make the same sound.', speak: ['The letters', ...groups(['er', 'ir', 'ur']), 'all make the same sound.'], visual: row(shown(bird), wordSaid(bird.word)) },
    ];
  },
  oracle: 'ela2',
};

// ---- A.3 Two-syllable words ----
// Levels: how many parts / where it splits / which word has two parts. Oracle: ela2.

const PARTS_RULE = 'Each part of a word has one vowel sound. Clap the parts.';
// A split is shown with a dash, rab-bit, and said with a short pause: "rab, bit".
const splitSay = (parts: readonly string[]): string => parts.join(', ');

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
      explanation: { speak: [PARTS_RULE, 'This word has', { number: kind }, kind === 1 ? 'part.' : 'parts.'], steps: [PARTS_RULE, `${cap(target)} has ${kind} ${kind === 1 ? 'part' : 'parts'}.`], visual: word(target, 'xl'), hint: hint('Say the word and clap for each part.') },
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
      explanation: { speak: [PARTS_RULE], ...stepsOf([PARTS_RULE, line(`${cap(entry.word)} splits as ${split}.`, [{ word: cap(entry.word) }, 'splits as', `${splitSay(entry.parts)}.`])]), visual: word(split, 'xl'), hint: hint('Say the word slowly and clap. Where does the first part end?') },
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
    explanation: { speak: [PARTS_RULE], ...stepsOf([PARTS_RULE, line(`${cap(entry.word)} has two parts: ${split}.`, [{ word: cap(entry.word) }, 'has two parts:', `${splitSay(entry.parts)}.`])]), visual: word(split, 'xl'), hint: hint('Clap each word. Which one has two claps?') },
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
