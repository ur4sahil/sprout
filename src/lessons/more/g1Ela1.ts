import { BLEND_ENDS, BLEND_STARTS, COMPOUNDS, DIGRAPH_ENDS, DIGRAPH_STARTS, SILENT_E_PAIRS, SILENT_E_PICTURES, VOWEL_TEAM_WORDS } from '../../content/data/phonics1';
import { END_PART_WORDS, ENDINGS, PLAIN_VERBS, Y_AS_E } from '../../content/data/h4-phonics';
import { WORD_GROUPS } from '../../content/data/h4-words';
import type { Question, Say } from '../../engine/types';
import { add, alter, art, calm, moment, pointAt, scene, set, str, text, turnQuestion, withoutHand } from '../build';
import type { Lesson, LessonPart, Moment, Piece, Scene } from '../types';

// Grade 1 Language Arts lessons, A.1 to A.8 and B.1 to B.6 (plan section 16). The voice says letter names
// and whole words only, never a lone sound.

const show = (m: Moment): LessonPart => ({ kind: 'show', moment: m });
const turn = (question: Question, why: Moment[]): LessonPart => ({ kind: 'turn', turn: { question, why } });
const spell = (value: string): Say => value.split('').map((letter) => ({ letter }));
const spaced = (value: string): string => value.split('').join(' ');
const last = (moments: Moment[]): Scene => moments.at(-1)?.scene ?? scene([]);

// How wide a word card is, in stage squares, for a card `h` squares tall.
const wide = (value: string, h = 1): number => Math.round(Math.max(1, value.length * 0.45 + 0.5) * h * 10) / 10;

function card(id: string, value: string, x: number, y: number, h = 1): Piece {
  return { id, look: text(value), x, y, w: wide(value, h), h };
}

// Word cards side by side, centred on a stage `cols` wide. Ids are prefix0, prefix1, ...
function cardRow(prefix: string, words: readonly string[], y: number, cols = 10, tall = 1, gap = 0.6): Piece[] {
  // Cards that would not fit side by side are made smaller.
  const span = (size: number): number => words.reduce((sum, each) => sum + wide(each, size), 0) + gap * (words.length - 1);
  let h = tall;
  while (h > 0.5 && span(h) > cols - 0.2) h = Math.round((h - 0.05) * 100) / 100;
  const total = words.reduce((sum, each) => sum + wide(each, h), 0) + gap * (words.length - 1);
  let x = Math.max(0, (cols - total) / 2);
  return words.map((value, i) => {
    const piece = card(`${prefix}${i}`, value, Math.round(x * 100) / 100, y, h);
    x += wide(value, h) + gap;
    return piece;
  });
}

// A word as one tile per letter, centred. Ids are prefix0, prefix1, ...
function letterTiles(prefix: string, value: string, y: number, cols = 10, size = 1): Piece[] {
  const left = (cols - value.length * size) / 2;
  return value.split('').map((letter, i) => ({ id: `${prefix}${i}`, look: text(letter), x: left + i * size, y, w: size, h: size }));
}

const tileIds = (prefix: string, from: number, count: number): string[] => Array.from({ length: count }, (_, i) => `${prefix}${from + i}`);

function optionsOf(question: Question): string[] {
  if (question.type !== 'choice') throw new Error('Not a choice question');
  return question.options.map((each) => (each.kind === 'text' ? each.value : ''));
}

function answerOf(question: Question): string {
  return optionsOf(question)[question.type === 'choice' ? question.answerIndex : 0] ?? '';
}

// ---- Missing letter teams: digraphs, blends, vowel teams, endings ck ng nk ----

interface Part {
  word: string;
  part: string;
  emoji: string;
}

type Place = 'start' | 'end' | 'middle';
const placeOf = (entry: Part): Place => (entry.word.startsWith(entry.part) ? 'start' : entry.word.endsWith(entry.part) ? 'end' : 'middle');

// The picture, and the word below it as letter tiles with empty boxes where the team goes.
function partScene(prefix: string, entry: Part): Scene {
  const at = entry.word.indexOf(entry.part);
  const tiles = letterTiles(`${prefix}l`, entry.word, 3.2).map((piece, i): Piece => (i >= at && i < at + entry.part.length ? { ...piece, look: { kind: 'box' } } : piece));
  return scene([{ id: `${prefix}p`, look: art(entry.emoji), x: 2.6, y: 0.3, w: 2.4, h: 2.4 }, ...tiles]);
}

const gapText = (entry: Part): string => entry.word.replace(entry.part, '_'.repeat(entry.part.length));

// Ask which letters are missing, hear a word that goes the same way, and fill the boxes.
function partMoments(prefix: string, entry: Part, buddy: Part | undefined): Moment[] {
  const start = partScene(prefix, entry);
  const at = entry.word.indexOf(entry.part);
  const boxes = tileIds(`${prefix}l`, at, entry.part.length);
  const place = placeOf(entry);
  const told = place === 'start' ? 'starts with' : place === 'end' ? 'ends with' : 'has';
  const tail = place === 'middle' ? 'in the middle.' : '.';
  const moments: Moment[] = [
    moment(['Look at the picture.', { word: entry.word }, '!'], gapText(entry), set(start, [`${prefix}p`], { lit: true })),
    moment(['Which letters are missing in', { word: entry.word }, '?'], `${gapText(entry)}  ?`, set(start, boxes, { lit: true })),
  ];
  let now = start;
  if (buddy) {
    const pic: Piece = { id: `${prefix}b`, look: art(buddy.emoji), x: 6.6, y: 0.2, w: 1.8, h: 1.8 };
    const w = wide(buddy.word, 0.8);
    const word: Piece = { id: `${prefix}bw`, look: text(buddy.word), x: Math.min(10 - w, 7.5 - w / 2), y: 2.05, w, h: 0.8 };
    now = add(start, [pic, word]);
    const like: Say =
      place === 'middle'
        ? [{ word: entry.word }, 'and', { word: buddy.word }, 'sound the same in the middle.']
        : [{ word: entry.word }, place === 'start' ? 'starts like' : 'ends like', { word: buddy.word }, '.'];
    moments.push(
      moment(like, `${entry.word}, ${buddy.word}`, set(now, [`${prefix}p`, `${prefix}b`], { lit: true })),
      moment([{ word: buddy.word }, told, ...spell(entry.part), tail], `${buddy.word}: ${entry.part}`, set(now, [`${prefix}bw`], { lit: true })),
    );
  }
  const filled = alter(calm(now), (piece) => (boxes.includes(piece.id) ? { ...piece, look: text(entry.part.charAt(boxes.indexOf(piece.id))), lit: true } : piece));
  moments.push(moment([{ word: entry.word }, told, ...spell(entry.part), tail], `${entry.word} ${told} ${entry.part}`, filled));
  return moments;
}

// Another word with the same team in the same place, if there is one.
function buddyOf(entry: Part, list: readonly Part[]): Part | undefined {
  return list.find((each) => each.word !== entry.word && each.part === entry.part && placeOf(each) === placeOf(entry));
}

function partWhy(question: Question, list: readonly Part[]): Moment[] {
  const target = str(question.facts, 'target');
  const entry = list.find((each) => each.word === target);
  if (!entry) throw new Error(`No word ${target}`);
  return partMoments('w', entry, buddyOf(entry, list));
}

function teamCards(teams: readonly string[]): Scene {
  return scene(cardRow('t', teams, 3.2));
}

function find(list: readonly Part[], word: string): Part {
  const entry = list.find((each) => each.word === word);
  if (!entry) throw new Error(`No word ${word}`);
  return entry;
}

const teamList = (teams: readonly string[]): Say => teams.flatMap((team, i): Say => [...(i === teams.length - 1 ? ['and'] : []), ...spell(team), i === teams.length - 1 ? '.' : ',']);

// ---- E-1-A1 Digraphs ----

const DIGRAPH_WORDS: readonly Part[] = [...DIGRAPH_STARTS, ...DIGRAPH_ENDS];

export function digraphsLesson(): Lesson {
  const teams = ['sh', 'ch', 'th', 'wh'];
  const ship = partMoments('x', find(DIGRAPH_WORDS, 'ship'), find(DIGRAPH_WORDS, 'shoe'));
  const fish = partMoments('y', find(DIGRAPH_WORDS, 'fish'), find(DIGRAPH_WORDS, 'dish'));
  const first = turnQuestion('E-1-A1', 1, (f) => str(f, 'target') !== 'ship' && str(f, 'target') !== 'shoe' && !str(f, 'target').startsWith('sh'));
  const second = turnQuestion('E-1-A1', 2, (f) => !['fish', 'dish'].includes(str(f, 'target')));
  return {
    parts: [
      show(moment(['Sometimes two letters work together as a team.'], 'Two letters can be a team.', teamCards(teams))),
      show(moment(['Here are four teams:', ...teamList(teams)], 'sh, ch, th, wh', set(teamCards(teams), ['t0', 't1', 't2', 't3'], { lit: true }))),
      ...ship.map(show),
      show(moment(['Words that start the same way often use the same team.'], 'Same start, same team.', calm(last(ship)))),
      turn(first, partWhy(first, DIGRAPH_WORDS)),
      show(moment(['A team can come at the end of a word, too.'], 'A team can be at the end.', calm(partScene('y', find(DIGRAPH_WORDS, 'fish'))))),
      ...fish.map(show),
      turn(second, partWhy(second, DIGRAPH_WORDS)),
      show(moment(['Think of a word that sounds the same, and use its team.'], 'Find a word that sounds the same.', calm(last(fish)))),
    ],
  };
}

// ---- E-1-A2 Consonant blends ----

const BLEND_WORDS: readonly Part[] = [...BLEND_STARTS, ...BLEND_ENDS];

export function blendsLesson(): Lesson {
  const frog = partMoments('x', find(BLEND_WORDS, 'frog'), undefined);
  const tent = partMoments('y', find(BLEND_WORDS, 'tent'), find(BLEND_WORDS, 'ant'));
  const first = turnQuestion('E-1-A2', 1, (f) => str(f, 'target') !== 'frog');
  const second = turnQuestion('E-1-A2', 2, (f) => !['tent', 'ant', 'plant'].includes(str(f, 'target')));
  return {
    parts: [
      show(moment(['In a blend, two letters sit side by side, and you hear them both.'], 'A blend: two letters, you hear both.', partScene('x', find(BLEND_WORDS, 'frog')))),
      ...frog.map(show),
      show(moment(['Listen:', { word: 'frog' }, '. You can hear the', { letter: 'f' }, 'and the', { letter: 'r' }, 'at the start.'], 'f and r: fr', set(last(frog), ['xl0', 'xl1'], { lit: true }))),
      turn(first, partWhy(first, BLEND_WORDS)),
      show(moment(['A blend can come at the end of a word, too.'], 'A blend can be at the end.', calm(partScene('y', find(BLEND_WORDS, 'tent'))))),
      ...tent.map(show),
      turn(second, partWhy(second, BLEND_WORDS)),
      show(moment(['Say the word, and listen for both letters of the blend.'], 'Listen for both letters.', calm(last(tent)))),
    ],
  };
}

// ---- E-1-A4 Vowel teams ----

const TEAM_WORDS: readonly Part[] = VOWEL_TEAM_WORDS;

function teamMoments(prefix: string, entry: Part): Moment[] {
  const moments = partMoments(prefix, entry, buddyOf(entry, TEAM_WORDS));
  const end = last(moments);
  const at = entry.word.indexOf(entry.part);
  const firstVowel = entry.part.charAt(0);
  const quiet = entry.part.charAt(1);
  const rule: Say =
    firstVowel === quiet
      ? ['In', { word: entry.word }, ', the two', { letter: firstVowel }, 'letters say the name', { letter: firstVowel }, '.']
      : ['In', { word: entry.word }, ', the', { letter: firstVowel }, 'says its name, and the', { letter: quiet }, 'is quiet.'];
  const lit = set(calm(end), [`${prefix}l${at}`], { lit: true });
  return [...moments, moment(rule, `${firstVowel} says its name`, firstVowel === quiet ? set(lit, [`${prefix}l${at + 1}`], { lit: true }) : set(lit, [`${prefix}l${at + 1}`], { dim: true }))];
}

function teamWhy(question: Question): Moment[] {
  return teamMoments('w', find(TEAM_WORDS, str(question.facts, 'target')));
}

export function vowelTeamsLesson(): Lesson {
  const teams = ['ai', 'ee', 'oa'];
  const rain = teamMoments('x', find(TEAM_WORDS, 'rain'));
  const boat = teamMoments('y', find(TEAM_WORDS, 'boat'));
  const first = turnQuestion('E-1-A4', 2, (f) => !['rain', 'train', 'snail', 'boat', 'goat'].includes(str(f, 'target')));
  const second = turnQuestion('E-1-A4', 2, (f) => {
    const part = find(TEAM_WORDS, str(f, 'target')).part;
    return part !== find(TEAM_WORDS, str(first.facts, 'target')).part && part !== 'ee' && !['boat', 'goat'].includes(str(f, 'target'));
  });
  return {
    parts: [
      show(moment(['Two vowels can make a team in the middle of a word.'], 'Two vowels can be a team.', teamCards(teams))),
      show(moment(['When two vowels team up, the first one says its name.'], 'The first vowel says its name.', set(teamCards(teams), ['t0', 't1', 't2'], { lit: true }))),
      ...rain.map(show),
      turn(first, teamWhy(first)),
      show(moment(['Here is one more.'], 'One more.', calm(partScene('y', find(TEAM_WORDS, 'boat'))))),
      ...boat.map(show),
      turn(second, teamWhy(second)),
      show(moment(['Listen for the vowel that says its name. That vowel starts the team.'], 'Listen for the vowel name.', calm(last(boat)))),
    ],
  };
}

// ---- E-1-A7 Endings ck, ng, nk ----

const END_WORDS: readonly Part[] = END_PART_WORDS;

export function endPartsLesson(): Lesson {
  const teams = ['ck', 'ng', 'nk'];
  const duck = partMoments('x', find(END_WORDS, 'duck'), find(END_WORDS, 'truck'));
  const skunk = partMoments('y', find(END_WORDS, 'sink'), find(END_WORDS, 'wink'));
  const first = turnQuestion('E-1-A7', 1, (f) => !['duck', 'truck'].includes(str(f, 'target')));
  const second = turnQuestion('E-1-A7', 2, (f) => find(END_WORDS, str(f, 'target')).part === 'nk' && !['sink', 'wink'].includes(str(f, 'target')));
  return {
    parts: [
      show(moment(['Some words end with two letters that stick together.'], 'Two letters at the end.', teamCards(teams))),
      show(moment(['They are', ...teamList(teams)], 'ck, ng, nk', set(teamCards(teams), ['t0', 't1', 't2'], { lit: true }))),
      ...duck.map(show),
      show(moment(['Words that end the same way often use the same two letters.'], 'Same end, same letters.', calm(last(duck)))),
      turn(first, partWhy(first, END_WORDS)),
      show(moment(['Here is one that ends with', ...spell('nk'), '.'], 'nk', calm(partScene('y', find(END_WORDS, 'sink'))))),
      ...skunk.map(show),
      turn(second, partWhy(second, END_WORDS)),
      show(moment(['Think of a word that ends the same way, and use its letters.'], 'Find a word that ends the same.', calm(last(skunk)))),
    ],
  };
}

// ---- E-1-A3 Silent e ----

const pairOf = (value: string): readonly [string, string] => {
  const pair = SILENT_E_PAIRS.find((each) => each.includes(value));
  if (!pair) throw new Error(`No pair for ${value}`);
  return pair;
};
const pictureFor = (value: string): string => SILENT_E_PICTURES.find((each) => each.word === value)?.emoji ?? '';

// The short word on the wall and the long word on the table, each as letter tiles.
function pairScene(short: string, long: string): Scene {
  return scene([...letterTiles('s', short, 0.8), ...letterTiles('g', long, 3.4)]);
}

function silentWhy(question: Question): Moment[] {
  const target = str(question.facts, 'target');
  const [short, long] = pairOf(target);
  const vowel = short.charAt(1);
  const start = pairScene(short, long);
  const isLong = target === long;
  const prefix = isLong ? 'g' : 's';
  const tiles = tileIds(prefix, 0, target.length);
  return [
    moment(['Listen:', { word: target }, '. Which word is it?'], `${short} or ${long}?`, start),
    moment(['Look at the end. Only', { word: long }, 'has an', { letter: 'e' }, '.'], `${long} ends with e`, set(start, ['g3'], { lit: true })),
    isLong
      ? moment(['The', { letter: 'e' }, 'makes the', { letter: vowel }, 'say its name.'], `e makes ${vowel} say its name`, set(start, ['g1', 'g3'], { lit: true }))
      : moment(['With no', { letter: 'e' }, 'at the end, the', { letter: vowel }, 'is short.'], `no e: short ${vowel}`, set(start, ['s1'], { lit: true })),
    moment(['The word is', { word: target }, '.'], `The word is ${target}.`, set(isLong ? set(start, ['s0', 's1', 's2'], { dim: true }) : set(start, ['g0', 'g1', 'g2', 'g3'], { dim: true }), tiles, { lit: true })),
  ];
}

export function silentELesson(): Lesson {
  const pinPic: Piece = { id: 'pp', look: art(pictureFor('pin')), x: 1, y: 0.4, w: 2.2, h: 2.2 };
  const pinePic: Piece = { id: 'pq', look: art(pictureFor('pine')), x: 6.8, y: 0.4, w: 2.2, h: 2.2, gone: true };
  const tiles = letterTiles('l', 'pine', 3.2);
  const start = scene([pinPic, pinePic, ...tiles.map((piece) => (piece.id === 'l3' ? { ...piece, gone: true } : piece))]);
  const withE = set(start, ['l3'], { gone: false, lit: true });
  const pine = set(set(calm(withE), ['pq'], { gone: false, lit: true }), ['pp'], { dim: true });
  const capScene = scene(letterTiles('c', 'cape', 3.2).map((piece) => (piece.id === 'c3' ? { ...piece, gone: true } : piece)));
  const first = turnQuestion('E-1-A3', 1, (f) => str(f, 'target').endsWith('e') && !str(f, 'target').startsWith('pin') && !str(f, 'target').startsWith('cap'));
  const second = turnQuestion('E-1-A3', 1, (f) => !str(f, 'target').endsWith('e') && pairOf(str(f, 'target'))[0] !== pairOf(str(first.facts, 'target'))[0] && !['pin', 'cap'].includes(str(f, 'target')));
  return {
    parts: [
      show(moment(['Today we meet a quiet letter: an', { letter: 'e' }, 'at the end of a word.'], 'A quiet e at the end.', start)),
      show(moment(['Look at the picture.', { word: 'pin' }, '!'], 'pin', set(start, ['pp'], { lit: true }))),
      show(moment(['In', { word: 'pin' }, ', the', { letter: 'i' }, 'is short.'], 'pin: short i', set(start, ['l1'], { lit: true }))),
      show(moment(['Now add an', { letter: 'e' }, 'at the end.'], 'pin + e', withE)),
      show(moment(['The word is now', { word: 'pine' }, '!'], 'pine', pine)),
      show(moment(['We do not hear the', { letter: 'e' }, '. It is quiet.'], 'The e is quiet.', set(calm(pine), ['l3'], { dim: true }))),
      show(moment(['But it makes the', { letter: 'i' }, 'say its name,', { letter: 'i' }, '.'], 'e makes i say its name', set(set(calm(pine), ['l1'], { lit: true }), ['l3'], { dim: true }))),
      turn(first, silentWhy(first)),
      show(moment(['It works with other vowels too. Here is', { word: 'cap' }, '.'], 'cap', capScene)),
      show(moment(['Add an', { letter: 'e' }, ', and', { word: 'cap' }, 'becomes', { word: 'cape' }, '. The', { letter: 'a' }, 'says its name.'], 'cap + e = cape', set(capScene, ['c1', 'c3'], { gone: false, lit: true }))),
      turn(second, silentWhy(second)),
      show(moment(['An', { letter: 'e' }, 'at the end is quiet, and it makes the vowel say its name.'], 'Silent e: the vowel says its name.', calm(set(capScene, ['c3'], { gone: false })))),
    ],
  };
}

// ---- E-1-A6 Endings s, ed, ing ----

const rootOf = (value: string): string => {
  const root = PLAIN_VERBS.find((verb) => value.startsWith(verb) && (ENDINGS as readonly string[]).includes(value.slice(verb.length)));
  if (root === undefined) throw new Error(`No root for ${value}`);
  return root;
};

// Each word as a root card with its ending card right after it. Ids rN and eN.
function splitRow(words: readonly string[], y: number, cols = 10, h = 1): Piece[] {
  const gap = 0.7;
  const parts = words.map((value) => {
    const root = rootOf(value);
    return { root, end: value.slice(root.length) };
  });
  const total = parts.reduce((sum, each) => sum + wide(each.root, h) + wide(each.end, h), 0) + gap * (words.length - 1);
  let x = Math.max(0, (cols - total) / 2);
  return parts.flatMap((each, i) => {
    const root = card(`r${i}`, each.root, Math.round(x * 100) / 100, y, h);
    x += wide(each.root, h);
    const end = card(`e${i}`, each.end, Math.round(x * 100) / 100, y, h);
    x += wide(each.end, h) + gap;
    return [root, end];
  });
}

function endingWhy(question: Question): Moment[] {
  const options = optionsOf(question);
  const right = answerOf(question);
  const ending = str(question.facts, 'target');
  const start = scene(splitRow(options, 3.2, 12, 0.9), 12);
  const at = options.indexOf(right);
  return [
    moment(['Which word ends with', ...spell(ending), '?'], `Which ends with ${ending}?`, start),
    moment(['Look at the end of each word.'], 'Look at the ends.', set(start, ['e0', 'e1', 'e2'], { lit: true })),
    moment([{ word: right }, 'ends with', ...spell(ending), '.'], `${right} ends with ${ending}`, set(start, [`r${at}`, `e${at}`], { lit: true })),
  ];
}

function rootWhy(question: Question): Moment[] {
  const target = str(question.facts, 'target');
  const root = rootOf(target);
  const start = scene(splitRow([target], 1.2));
  return [
    moment(['Which is the root word of', { word: target }, '?'], `The root of ${target}?`, start),
    moment(['Cover the ending,', ...spell(target.slice(root.length)), '.'], `Cover ${target.slice(root.length)}.`, set(start, ['e0'], { crossed: true, dim: true })),
    moment(['The root word is', { word: root }, '.'], `The root is ${root}.`, set(set(start, ['e0'], { crossed: true, dim: true }), ['r0'], { lit: true })),
  ];
}

export function endingsLesson(): Lesson {
  const root = card('j', 'jump', 3.2, 1);
  const ends = [card('es', 's', 6, 4.4), card('ee', 'ed', 6, 4.4), card('ei', 'ing', 6, 4.4)].map((piece) => ({ ...piece, gone: true }));
  const start = scene([root, ...ends]);
  const joined = (id: string): Scene => set(set(start, ['j'], { lit: true }), [id], { gone: false, lit: true, x: 3.2 + wide('jump'), y: 1 });
  const first = turnQuestion('E-1-A6', 1, (f) => str(f, 'target') === 'ing' && !String((f.options as string[])[0]).startsWith('jump'));
  const second = turnQuestion('E-1-A6', 3, (f) => rootOf(str(f, 'target')) !== rootOf(answerOf(first)) && rootOf(str(f, 'target')) !== 'jump');
  const sample = scene(splitRow(['jumps', 'jumped', 'jumping'], 3.2, 12, 0.9), 12);
  return {
    parts: [
      show(moment(['An action word can get an ending.'], 'Action words get endings.', start)),
      show(moment(['Here is the root word,', { word: 'jump' }, '.'], 'root word: jump', set(start, ['j'], { lit: true }))),
      show(moment(['Add', { letter: 's' }, ', and it says', { word: 'jumps' }, '.'], 'jump + s = jumps', joined('es'))),
      show(moment(['Add', ...spell('ed'), ', and it says', { word: 'jumped' }, '. That already happened.'], 'jump + ed = jumped', joined('ee'))),
      show(moment(['Add', ...spell('ing'), ', and it says', { word: 'jumping' }, '. That is happening now.'], 'jump + ing = jumping', joined('ei'))),
      show(moment(['The root word stays the same. Only the ending changes.'], 'Same root, new ending.', sample)),
      show(moment(['To find an ending, look at the end of the word.'], 's, ed, ing', set(sample, ['e0', 'e1', 'e2'], { lit: true }))),
      turn(first, endingWhy(first)),
      show(moment(['To find the root word, take the ending off.'], 'jumping - ing = jump', set(set(scene(splitRow(['jumping'], 1.2)), ['e0'], { crossed: true, dim: true }), ['r0'], { lit: true }))),
      turn(second, rootWhy(second)),
      show(moment(['A word is a root word and an ending. Look at the end to find each part.'], 'root + ending', calm(sample))),
    ],
  };
}

// ---- E-1-A8 Y as a vowel ----

const claps = (value: string): number => (Y_AS_E.includes(value) ? 2 : 1);

// Word cards with clapping hands under each word, one for each beat. Clap ids cN_M, hidden at first.
function yScene(words: readonly string[]): Scene {
  const cards = cardRow('c', words, 1.2, 10, 1, 1);
  const hands = cards.flatMap((piece, i) =>
    Array.from({ length: claps(words[i] ?? '') }, (_, m): Piece => ({ id: `c${i}_${m}`, look: art('👏'), x: piece.x + (piece.w ?? 1) / 2 - claps(words[i] ?? '') * 0.4 + m * 0.8, y: 3.3, w: 0.8, h: 0.8, gone: true })),
  );
  return scene([...cards, ...hands]);
}

const clapIds = (words: readonly string[], i: number): string[] => Array.from({ length: claps(words[i] ?? '') }, (_, m) => `c${i}_${m}`);

function yWhy(question: Question): Moment[] {
  const options = optionsOf(question);
  const right = answerOf(question);
  const sound = str(question.facts, 'target');
  const start = yScene(options);
  const all = options.flatMap((_, i) => clapIds(options, i));
  const clapped = set(start, all, { gone: false });
  const at = options.indexOf(right);
  return [
    moment(['In which word does', { letter: 'y' }, 'sound like', { letter: sound }, '?'], `y sounds like ${sound}?`, start),
    moment(['Clap each word.'], 'Clap each word.', clapped),
    moment(sound === 'e' ? ['Two claps means', { letter: 'y' }, 'sounds like', { letter: 'e' }, '.'] : ['One clap means', { letter: 'y' }, 'sounds like', { letter: 'i' }, '.'], sound === 'e' ? '2 claps: y sounds like e' : '1 clap: y sounds like i', set(clapped, clapIds(options, at), { lit: true })),
    moment(['In', { word: right }, ',', { letter: 'y' }, 'sounds like', { letter: sound }, '.'], `${right}: y sounds like ${sound}`, set(clapped, [`c${at}`, ...clapIds(options, at)], { lit: true })),
  ];
}

export function yVowelLesson(): Lesson {
  const words = ['fly', 'baby'];
  const start = yScene(words);
  const flyClap = set(set(start, ['c0_0'], { gone: false, lit: true }), ['c0'], { lit: true });
  const both = set(calm(flyClap), ['c1_0', 'c1_1'], { gone: false });
  const babyClap = set(both, ['c1', 'c1_0', 'c1_1'], { lit: true });
  const first = turnQuestion('E-1-A8', 3, (f) => str(f, 'target') === 'e');
  const second = turnQuestion('E-1-A8', 3, (f) => str(f, 'target') === 'i');
  return {
    parts: [
      show(moment(['At the end of a word,', { letter: 'y' }, 'can sound like', { letter: 'i' }, ', or like', { letter: 'e' }, '.'], 'y can sound like i or e', start)),
      show(moment(['Here is how to tell. Clap the word', { word: 'fly' }, '.'], 'Clap: fly', set(start, ['c0'], { lit: true }))),
      show(moment(['One clap.'], '1 clap', flyClap)),
      show(moment(['In a one clap word like', { word: 'fly' }, ',', { letter: 'y' }, 'sounds like', { letter: 'i' }, '.'], 'fly: y sounds like i', set(calm(flyClap), ['c0', 'c0_0'], { lit: true }))),
      show(moment(['Now clap the word', { word: 'baby' }, '. Two claps.'], 'Clap: ba-by. 2 claps', babyClap)),
      show(moment(['In a two clap word like', { word: 'baby' }, ',', { letter: 'y' }, 'at the end sounds like', { letter: 'e' }, '.'], 'baby: y sounds like e', set(calm(babyClap), ['c1'], { lit: true }))),
      show(moment(['One clap,', { letter: 'i' }, '. Two claps,', { letter: 'e' }, '.'], '1 clap: i. 2 claps: e.', calm(both))),
      turn(first, yWhy(first)),
      turn(second, yWhy(second)),
      show(moment(['Clap the word. One clap, the', { letter: 'y' }, 'sounds like', { letter: 'i' }, '. Two claps, it sounds like', { letter: 'e' }, '.'], '1 clap: i. 2 claps: e.', calm(both))),
    ],
  };
}

// ---- E-1-B1 and E-1-B4 Sight words ----

// The word spelled in small tiles on the wall, and the option cards on the table.
function sightScene(target: string, options: readonly string[], cols = 10): Scene {
  return scene([...letterTiles('s', target, 0.6, cols, 0.9).map((piece) => ({ ...piece, gone: true })), ...cardRow('o', options, 3.3, cols)], cols);
}

function sightMoments(target: string, options: readonly string[], cols = 10): Moment[] {
  const start = sightScene(target, options, cols);
  const tiles = tileIds('s', 0, target.length);
  const spelled = set(start, tiles, { gone: false });
  const first = target.charAt(0);
  const at = options.indexOf(target);
  const twin = options.find((each) => each !== target && each.charAt(0) === first);
  const sameStart = options.flatMap((each, i) => (each.charAt(0) === first ? [`o${i}`] : []));
  const moments: Moment[] = [
    moment([{ word: target }, 'is spelled', ...spell(target), '.'], `${target}: ${spaced(target)}`, set(spelled, tiles, { lit: true })),
    moment(['It starts with', { letter: first }, '.'], `It starts with ${first}.`, set(spelled, ['s0', ...sameStart], { lit: true })),
  ];
  if (twin) {
    moments.push(moment([{ word: twin }, 'starts with', { letter: first }, 'too, so look at the whole word.'], `${twin} starts with ${first} too.`, set(spelled, sameStart, { lit: true })));
    moments.push(moment(['Two words start with', { letter: first }, '. Check every letter.'], 'Check every letter.', set(spelled, [...tiles, ...sameStart], { lit: true })));
  }
  moments.push(moment(['This word is', { word: target }, '.'], `This word is ${target}.`, set(calm(spelled), [`o${at}`, ...tiles], { lit: true })));
  return moments;
}

function sightWhy(question: Question): Moment[] {
  const target = str(question.facts, 'target');
  const options = optionsOf(question);
  return [moment(['Tap the word', { word: target }, '.'], 'Listen. Tap the word.', sightScene(target, options)), ...sightMoments(target, options)];
}

export function sightFourLesson(): Lesson {
  const options = ['walk', 'could', 'him'];
  const worked = sightMoments('could', options);
  const first = turnQuestion('E-1-B1', 1, (f) => str(f, 'target') !== 'could');
  const second = turnQuestion('E-1-B1', 1, (f) => str(f, 'target') !== 'could' && str(f, 'target') !== str(first.facts, 'target') && str(f, 'target').length >= 4);
  const start = sightScene('could', options);
  return {
    parts: [
      show(moment(['Some words we see all the time. We learn them by heart, so we can read them fast.'], 'Words we know by heart', start)),
      show(moment(['Let us find the word', { word: 'could' }, '.'], 'Find: could', set(start, ['o0', 'o1', 'o2'], { lit: true }))),
      show(moment(['First, think how it is spelled.'], 'Think how it is spelled.', calm(start))),
      ...worked.map(show),
      show(moment(['Look at the first letter, then check the whole word.'], 'First letter, then the whole word.', calm(last(worked)))),
      turn(first, sightWhy(first)),
      turn(second, sightWhy(second)),
      show(moment(['Think how the word is spelled, and look at every letter.'], 'Look at every letter.', calm(last(worked)))),
    ],
  };
}

export function sightFiveLesson(): Lesson {
  const options = ['those', 'always', 'these'];
  const worked = sightMoments('these', options);
  const first = turnQuestion('E-1-B4', 1, (f) => !['these', 'those'].includes(str(f, 'target')));
  const second = turnQuestion('E-1-B4', 2, (f) => {
    const target = str(f, 'target');
    const shown = (f.options as string[] | undefined) ?? [];
    return !['these', 'those', str(first.facts, 'target')].includes(target) && shown.some((each) => each !== target && each.charAt(0) === target.charAt(0));
  });
  const start = sightScene('these', options);
  return {
    parts: [
      show(moment(['Some words we see all the time. Let us learn to know them fast.'], 'Words we know by heart', start)),
      show(moment(['Let us find the word', { word: 'these' }, '.'], 'Find: these', set(start, ['o0', 'o1', 'o2'], { lit: true }))),
      ...worked.map(show),
      show(moment([{ word: 'these' }, 'has an', { letter: 'e' }, 'in the middle.', { word: 'those' }, 'has an', { letter: 'o' }, '.'], 'these: e, those: o', set(calm(last(worked)), ['s2', 'o2'], { lit: true }))),
      turn(first, sightWhy(first)),
      turn(second, sightWhy(second)),
      show(moment(['Do not stop at the first letter. Look at the whole word.'], 'Look at the whole word.', calm(last(worked)))),
    ],
  };
}

// ---- E-1-B3 Opposites and same meanings ----

function meaningScene(target: string, options: readonly string[]): Scene {
  return scene([card('m', target, 5 - wide(target, 1.2) / 2, 0.8, 1.2), ...cardRow('o', options, 3.4)]);
}

function meaningWhy(question: Question): Moment[] {
  const target = str(question.facts, 'target');
  const options = optionsOf(question);
  const right = answerOf(question);
  const opposite = str(question.facts, 'relation') === 'opposite1';
  const start = meaningScene(target, options);
  const at = options.indexOf(right);
  return [
    moment(opposite ? ['Which word is the opposite of', { word: target }, '?'] : ['Which word means the same as', { word: target }, '?'], opposite ? `opposite of ${target}?` : `same as ${target}?`, set(start, ['m'], { lit: true })),
    moment(opposite ? ['Look for the word that means as different as can be.'] : ['Look for the word you could use instead.'], opposite ? 'Very different?' : 'Could it take its place?', set(start, ['o0', 'o1', 'o2'], { lit: true })),
    moment([{ word: target }, 'and', { word: right }, opposite ? 'are opposites.' : 'mean the same.'], `${target}, ${right}: ${opposite ? 'opposites' : 'same'}`, set(start, ['m', `o${at}`], { lit: true })),
  ];
}

export function meaningsLesson(): Lesson {
  const pics = scene([
    { id: 'hp', look: art('🔥'), x: 1.5, y: 0.4, w: 2, h: 2 },
    { id: 'cp', look: art('❄️'), x: 6.5, y: 0.4, w: 2, h: 2 },
    card('hw', 'hot', 2.5 - wide('hot') / 2, 3.2),
    card('cw', 'cold', 7.5 - wide('cold') / 2, 3.2),
  ]);
  const worked = meaningScene('up', ['glad', 'down', 'fast']);
  const same = meaningScene('big', ['large', 'wet', 'night']);
  const first = turnQuestion('E-1-B3', 1, (f) => !['up', 'down', 'hot', 'cold'].includes(str(f, 'target')));
  const second = turnQuestion('E-1-B3', 2, (f) => !['big', 'large'].includes(str(f, 'target')));
  return {
    parts: [
      show(moment(['Some words are opposites. They mean as different as can be.'], 'Opposites: as different as can be', pics)),
      show(moment([{ word: 'hot' }, 'and', { word: 'cold' }, 'are opposites.'], 'hot, cold', set(pics, ['hp', 'cp', 'hw', 'cw'], { lit: true }))),
      show(moment(['Which word is the opposite of', { word: 'up' }, '?'], 'opposite of up?', set(worked, ['m'], { lit: true }))),
      show(moment(['If something is not up, it is down.'], 'not up: down', set(worked, ['m', 'o1'], { lit: true }))),
      show(moment([{ word: 'up' }, 'and', { word: 'down' }, 'are opposites.'], 'up, down: opposites', set(worked, ['o1'], { lit: true }))),
      turn(first, meaningWhy(first)),
      show(moment(['Some words mean the same. You can use one instead of the other.'], 'Same meaning', same)),
      show(moment(['A big dog is a large dog. So', { word: 'big' }, 'and', { word: 'large' }, 'mean the same.'], 'big, large: same', set(same, ['m', 'o0'], { lit: true }))),
      turn(second, meaningWhy(second)),
      show(moment(['Opposites are very different. Words that mean the same can swap places.'], 'Opposite or the same?', calm(same))),
    ],
  };
}

// ---- E-1-B5 ABC order ----

const ABC_COLS = 13;
const ABC = 'abcdefghijklmnopqrstuvwxyz';

// The alphabet in two rows on the wall, and the words on the table, each as a first-letter tile and the rest.
function abcScene(words: readonly string[], order: readonly string[] = words): Scene {
  const alphabet: Piece[] = ABC.split('').map((letter, i) => ({ id: `a${letter}`, look: text(letter), x: (i % 13) + 0.1, y: 0.2 + Math.floor(i / 13) * 1.05, w: 0.8, h: 0.8 }));
  const gap = 0.8;
  const size = (value: string): number => 0.7 + wide(value.slice(1));
  const total = order.reduce((sum, each) => sum + size(each), 0) + gap * (order.length - 1);
  let x = (ABC_COLS - total) / 2;
  const placed = new Map<string, number>();
  for (const each of order) {
    placed.set(each, Math.round(x * 100) / 100);
    x += size(each) + gap;
  }
  const cards = words.flatMap((value, i): Piece[] => {
    const left = placed.get(value) ?? 0;
    return [
      { id: `f${i}`, look: text(value.charAt(0)), x: left, y: 3.5, w: 0.7 },
      { id: `r${i}`, look: text(value.slice(1)), x: left + 0.7, y: 3.5, w: wide(value.slice(1)) },
    ];
  });
  return scene([...alphabet, ...cards], ABC_COLS);
}

function abcMoments(words: readonly string[], ask: boolean): Moment[] {
  const sorted = [...words].sort();
  const firstWord = sorted[0] ?? '';
  const at = words.indexOf(firstWord);
  const start = abcScene(words);
  const firsts = words.map((_, i) => `f${i}`);
  const letters = words.map((each) => `a${each.charAt(0)}`);
  const others = sorted.slice(1).map((each) => ({ letter: each.charAt(0) }));
  const winner = start.pieces.find((piece) => piece.id === `a${firstWord.charAt(0)}`);
  const pointed = winner ? pointAt(set(start, [`a${firstWord.charAt(0)}`, `f${at}`], { lit: true }), winner) : start;
  const moments: Moment[] = [];
  if (ask) moments.push(moment(['Which word comes first in ABC order?'], words.join(', '), start));
  moments.push(
    moment(['Look at the first letter of each word.'], 'Look at the first letters.', set(start, firsts, { lit: true })),
    moment(['Find each letter in the alphabet.'], words.map((each) => each.charAt(0)).join(', '), set(start, [...firsts, ...letters], { lit: true })),
    moment([{ letter: firstWord.charAt(0) }, 'comes before', ...others.flatMap((each, i): Say => (i === 0 ? [each] : ['and', each])), '.'], `${firstWord.charAt(0)} comes first`, pointed),
    moment(['So', { word: firstWord }, 'comes first.'], `${firstWord} comes first.`, set(withoutHand(calm(abcScene(words, sorted))), [`f${at}`, `r${at}`], { lit: true })),
  );
  return moments;
}

function abcWhy(question: Question): Moment[] {
  return abcMoments(optionsOf(question), true);
}

export function abcOrderLesson(): Lesson {
  const words = ['moon', 'dog', 'cat'];
  const worked = abcMoments(words, false);
  const first = turnQuestion('E-1-B5', 1, (f) => !str(f, 'target').split(' ').some((each) => words.includes(each)));
  const second = turnQuestion('E-1-B5', 1, (f) => str(f, 'target') !== str(first.facts, 'target') && str(f, 'target').split(' ')[0] !== str(first.facts, 'target').split(' ')[0]);
  const start = abcScene(words);
  return {
    parts: [
      show(moment(['ABC order puts words in the order of the alphabet.'], 'a b c d e f g ...', set(start, ['aa', 'ab', 'ac'], { lit: true }))),
      show(moment(['Which comes first:', { word: 'moon' }, ',', { word: 'dog' }, ', or', { word: 'cat' }, '?'], 'moon, dog, cat', start)),
      ...worked.map(show),
      show(moment(['The word whose first letter comes first in the alphabet goes first.'], 'Earliest first letter goes first.', calm(last(worked)))),
      turn(first, abcWhy(first)),
      turn(second, abcWhy(second)),
      show(moment(['Look at each first letter, and find it in the alphabet.'], 'First letters, then the alphabet.', calm(last(worked)))),
    ],
  };
}

// ---- E-1-B6 Word groups ----

const GROUP_COLS = 12;
const groupOf = (value: string): { name: string; words: readonly string[] } => {
  const group = WORD_GROUPS.find((each) => each.words.includes(value));
  if (!group) throw new Error(`No group for ${value}`);
  return group;
};
const listSay = (words: readonly string[]): string => words.length < 2 ? (words[0] ?? '') : `${words.slice(0, -1).join(', ')}, and ${words.at(-1) ?? ''}`;

// The group on the wall and the choices on the table.
function belongScene(shown: readonly string[], options: readonly string[]): Scene {
  return scene([...cardRow('g', shown, 1, GROUP_COLS), ...cardRow('o', options, 3.5, GROUP_COLS)], GROUP_COLS);
}

function belongMoments(shown: readonly string[], options: readonly string[], right: string): Moment[] {
  const start = belongScene(shown, options);
  const group = groupOf(shown[0] ?? '');
  const at = options.indexOf(right);
  const lifted = alter(calm(start), (piece) => (piece.id === `o${at}` ? { ...piece, lit: true, y: 2.1 } : piece));
  return [
    moment(['What is the same about', listSay(shown), '?'], shown.join(', '), set(start, shown.map((_, i) => `g${i}`), { lit: true })),
    moment(['They are all', group.name, '.'], `All ${group.name}`, set(start, shown.map((_, i) => `g${i}`), { lit: true })),
    moment(['Which word is one of the', group.name, 'too?'], `Which is ${group.name}?`, set(start, options.map((_, i) => `o${i}`), { lit: true })),
    moment([{ word: right }, 'is one too, so it belongs.'], `${right} belongs.`, lifted),
  ];
}

function oddMoments(options: readonly string[], right: string): Moment[] {
  const start = scene(cardRow('o', options, 3.3, GROUP_COLS), GROUP_COLS);
  const same = options.filter((each) => each !== right);
  const group = groupOf(same[0] ?? '');
  const at = options.indexOf(right);
  const sameIds = options.flatMap((each, i) => (each === right ? [] : [`o${i}`]));
  return [
    moment(['Which word does not belong?'], options.join(', '), start),
    moment([listSay(same), 'are all', group.name, '.'], `${same.join(', ')}: ${group.name}`, set(start, sameIds, { lit: true })),
    moment([{ word: right }, 'is not, so it does not belong.'], `${right} does not belong.`, set(set(start, sameIds, { dim: true }), [`o${at}`], { crossed: true, lit: true })),
  ];
}

function belongWhy(question: Question): Moment[] {
  return belongMoments(str(question.facts, 'target').split(', '), optionsOf(question), answerOf(question));
}

function oddWhy(question: Question): Moment[] {
  return oddMoments(optionsOf(question), answerOf(question));
}

export function wordGroupsLesson(): Lesson {
  const goes = ['bus', 'car', 'boat'];
  const pics = scene(
    [
      { id: 'p0', look: art('🚌'), x: 2.5, y: 0.6, w: 1.8, h: 1.8 },
      { id: 'p1', look: art('🚗'), x: 5.1, y: 0.6, w: 1.8, h: 1.8 },
      { id: 'p2', look: art('⛵'), x: 7.7, y: 0.6, w: 1.8, h: 1.8 },
      ...cardRow('g', goes, 3.3, GROUP_COLS),
    ],
    GROUP_COLS,
  );
  const worked = belongMoments(goes, ['sock', 'train', 'egg'], 'train');
  const odd = oddMoments(['red', 'blue', 'hat', 'green'], 'hat');
  const first = turnQuestion('E-1-B6', 1, (f) => !str(f, 'target').split(', ').some((each) => groupOf(each).name === 'things that go'));
  const second = turnQuestion('E-1-B6', 2, (f) => !((f.options as string[] | undefined) ?? []).includes('hat'));
  return {
    parts: [
      show(moment(['Words can belong to a group, like colors, clothes, or foods.'], 'Words in groups', pics)),
      show(moment(['A bus, a car, and a boat are all things that go.'], 'bus, car, boat: things that go', set(pics, ['p0', 'p1', 'p2', 'g0', 'g1', 'g2'], { lit: true }))),
      ...worked.map(show),
      turn(first, belongWhy(first)),
      show(moment(['Sometimes one word does not belong. Find the group first.'], 'Find the group first.', odd[0]?.scene ?? pics)),
      ...odd.slice(1).map(show),
      turn(second, oddWhy(second)),
      show(moment(['Ask what is the same about the words. That tells you the group.'], 'What is the same?', calm(last(odd)))),
    ],
  };
}

// ---- E-1-A5 Short or long vowel ----

const SORT_COLS = 12;

// Cards side by side inside a strip from x to x + width, made smaller when they would not fit.
function cardsIn(pieces: { id: string; value: string }[], x: number, width: number, y: number): Piece[] {
  const gap = 0.3;
  let h = 0.9;
  const span = (size: number): number => pieces.reduce((sum, each) => sum + wide(each.value, size), 0) + gap * (pieces.length - 1);
  while (h > 0.5 && span(h) > width) h = Math.round((h - 0.05) * 100) / 100;
  let left = x + Math.max(0, (width - span(h)) / 2);
  return pieces.map((each) => {
    const piece = card(each.id, each.value, Math.round(left * 100) / 100, y, h);
    left += wide(each.value, h) + gap;
    return piece;
  });
}

const isLong = (value: string): boolean => value.endsWith('e');

// The words in a row on the wall, and the two groups on the table.
function sortScene(words: readonly string[]): Scene {
  const bins: Piece[] = [card('bs', 'Short vowel', 0.6, 3.2, 0.8), card('bl', 'Long vowel', 6.6, 3.2, 0.8)];
  return scene([...cardsIn(words.map((value, i) => ({ id: `w${i}`, value })), 0.3, SORT_COLS - 0.6, 1), ...bins], SORT_COLS);
}

// Move the words of one kind under their group.
function sorted(from: Scene, words: readonly string[], long: boolean): Scene {
  const chosen = words.flatMap((value, i) => (isLong(value) === long ? [{ id: `w${i}`, value }] : []));
  const placed = new Map(cardsIn(chosen, long ? 6.2 : 0.2, 5.6, 4.6).map((piece) => [piece.id, piece]));
  return alter(from, (piece) => {
    const to = placed.get(piece.id);
    return to ? { ...to, lit: true } : piece;
  });
}

function sortMoments(words: readonly string[]): Moment[] {
  const start = sortScene(words);
  const longs = words.filter(isLong);
  const shorts = words.filter((each) => !isLong(each));
  const longIds = words.flatMap((value, i) => (isLong(value) ? [`w${i}`] : []));
  const withLong = sorted(start, words, true);
  const both = sorted(calm(withLong), words, false);
  const named = (list: readonly string[]): Say => list.flatMap((value, i): Say => [...(i === 0 ? [] : i === list.length - 1 ? ['and'] : [',']), { word: value }]);
  return [
    moment(['Look at the end of each word. Is there an', { letter: 'e' }, '?'], 'Look at the end.', set(start, longIds, { lit: true })),
    moment([...named(longs), longs.length === 1 ? 'has an' : 'have an', { letter: 'e' }, 'at the end, so the vowel says its name. They go in the Long vowel group.'], `${longs.join(', ')}: Long vowel`, set(withLong, ['bl'], { lit: true })),
    moment([...named(shorts), shorts.length === 1 ? 'has no' : 'have no', { letter: 'e' }, 'at the end. They go in the Short vowel group.'], `${shorts.join(', ')}: Short vowel`, set(both, ['bs'], { lit: true })),
  ];
}

function sortWhy(question: Question): Moment[] {
  if (question.type !== 'sort') throw new Error('Not a sort question');
  const words = question.items.map((each) => (each.kind === 'text' ? each.value : ''));
  return [moment(['Put each word in its group.'], 'Short vowel or Long vowel?', sortScene(words)), ...sortMoments(words)];
}

export function shortOrLongLesson(): Lesson {
  const words = ['cap', 'cape', 'pine', 'pin'];
  const start = sortScene(words);
  const worked = sortMoments(words);
  const readOf = (f: Record<string, unknown>): string[] => (Array.isArray(f.read) ? f.read.map(String) : []);
  const first = turnQuestion('E-1-A5', 1, (f) => !readOf(f).some((each) => words.includes(each)));
  const second = turnQuestion('E-1-A5', 2, (f) => readOf(f).filter((each) => readOf(first.facts).includes(each)).length <= 1);
  return {
    parts: [
      show(moment(['A long vowel says its own name. A short vowel does not.'], 'Long vowel: it says its name.', set(start, ['bs', 'bl'], { lit: true }))),
      show(moment(['In', { word: 'cape' }, ', the', { letter: 'a' }, 'says its name. In', { word: 'cap' }, ', it does not.'], 'cape: long a. cap: short a.', set(start, ['w0', 'w1'], { lit: true }))),
      show(moment(['An', { letter: 'e' }, 'at the end is the clue.'], 'The clue: e at the end', calm(start))),
      ...worked.map(show),
      turn(first, sortWhy(first)),
      turn(second, sortWhy(second)),
      show(moment(['An', { letter: 'e' }, 'at the end means a long vowel. No', { letter: 'e' }, 'means a short vowel.'], 'e at the end: long. No e: short.', calm(last(worked)))),
    ],
  };
}

// ---- E-1-B2 Compound words ----

const COMPOUND_COLS = 12;

// The picture on the wall, two answer boxes, and the word tiles on the table.
function buildScene(emoji: string, bank: readonly string[]): Scene {
  return scene(
    [
      { id: 'p', look: art(emoji), x: 1, y: 0.3, w: 2.2, h: 2.2 },
      { id: 'b0', look: { kind: 'box' }, x: 4.4, y: 0.9, w: 3, h: 1 },
      { id: 'b1', look: { kind: 'box' }, x: 7.8, y: 0.9, w: 3, h: 1 },
      ...cardRow('t', bank, 3.6, COMPOUND_COLS),
    ],
    COMPOUND_COLS,
  );
}

// Move a tile into a box.
function intoBox(from: Scene, tile: string, box: string): Scene {
  const target = from.pieces.find((piece) => piece.id === box);
  if (!target) return from;
  return alter(from, (piece) => {
    if (piece.id === box) return { ...piece, gone: true };
    if (piece.id !== tile) return piece;
    const h = Math.min(1, piece.h ?? 1);
    const w = wide(piece.look.kind === 'text' ? piece.look.text : '', h);
    return { ...piece, x: (target.x + (target.w ?? 1) / 2) - w / 2, y: target.y, w, h, lit: true };
  });
}

function buildMoments(first: string, second: string, emoji: string, bank: readonly string[]): Moment[] {
  const whole = `${first}${second}`;
  const start = buildScene(emoji, bank);
  const one = intoBox(start, `t${bank.indexOf(first)}`, 'b0');
  const two = intoBox(calm(one), `t${bank.indexOf(second)}`, 'b1');
  return [
    moment(['Build the word', { word: whole }, '. Listen for the two small words in it.'], `Build: ${whole}`, set(start, ['p'], { lit: true })),
    moment(['The first small word is', { word: first }, '.'], `first: ${first}`, one),
    moment(['The second small word is', { word: second }, '.'], `second: ${second}`, two),
    moment([{ word: first }, 'and', { word: second }, 'make', { word: whole }, '.'], `${first} + ${second} = ${whole}`, set(two, ['p'], { lit: true })),
  ];
}

const compoundOf = (whole: string): { first: string; second: string; emoji: string } => {
  const found = COMPOUNDS.find((each) => `${each.first}${each.second}` === whole);
  if (!found) throw new Error(`No compound ${whole}`);
  return found;
};

function buildWhy(question: Question): Moment[] {
  if (question.type !== 'tiles') throw new Error('Not a tiles question');
  const entry = compoundOf(question.answer);
  return buildMoments(entry.first, entry.second, entry.emoji, question.bank);
}

export function compoundsLesson(): Lesson {
  const sun = compoundOf('sunflower');
  const parts = scene(
    [
      { id: 'ps', look: art('☀️'), x: 2.3, y: 0.3, w: 2, h: 2 },
      { id: 'pf', look: art('🌸'), x: 7.7, y: 0.3, w: 2, h: 2 },
      { id: 'pw', look: art(sun.emoji), x: 5, y: 0.3, w: 2, h: 2, gone: true },
      card('ws', 'sun', 3.3 - wide('sun') / 2, 3.4),
      card('wf', 'flower', 8.7 - wide('flower') / 2, 3.4),
    ],
    COMPOUND_COLS,
  );
  const joinedX = 6 - (wide('sun') + wide('flower')) / 2;
  const joined = alter(set(parts, ['ps', 'pf'], { gone: true }), (piece) => {
    if (piece.id === 'pw') return { ...piece, gone: false, lit: true };
    if (piece.id === 'ws') return { ...piece, x: joinedX, lit: true };
    if (piece.id === 'wf') return { ...piece, x: joinedX + wide('sun'), lit: true };
    return piece;
  });
  const rain = compoundOf('rainbow');
  const worked = buildMoments(rain.first, rain.second, rain.emoji, ['cup', 'bow', 'rain', 'ball']);
  const first = turnQuestion('E-1-B2', 1, (f) => !['sunflower', 'rainbow'].includes(str(f, 'target')));
  const second = turnQuestion('E-1-B2', 2, (f) => !['sunflower', 'rainbow', str(first.facts, 'target')].includes(str(f, 'target')));
  return {
    parts: [
      show(moment(['Two small words can join to make one big word.'], 'small word + small word = big word', parts)),
      show(moment(['Here is', { word: 'sun' }, ', and here is', { word: 'flower' }, '.'], 'sun, flower', set(parts, ['ps', 'pf', 'ws', 'wf'], { lit: true }))),
      show(moment(['Put them together, and they make', { word: 'sunflower' }, '!'], 'sun + flower = sunflower', joined)),
      show(moment(['A word made of two words is called a compound word.'], 'a compound word', calm(joined))),
      ...worked.map(show),
      turn(first, buildWhy(first)),
      turn(second, buildWhy(second)),
      show(moment(['Listen for the two small words, and put them in order.'], 'Two small words, in order.', calm(last(worked)))),
    ],
  };
}

export const LESSONS: Readonly<Record<string, () => Lesson>> = {
  'E-1-A1': digraphsLesson,
  'E-1-A2': blendsLesson,
  'E-1-A3': silentELesson,
  'E-1-A4': vowelTeamsLesson,
  'E-1-A5': shortOrLongLesson,
  'E-1-A6': endingsLesson,
  'E-1-A7': endPartsLesson,
  'E-1-A8': yVowelLesson,
  'E-1-B1': sightFourLesson,
  'E-1-B2': compoundsLesson,
  'E-1-B3': meaningsLesson,
  'E-1-B4': sightFiveLesson,
  'E-1-B5': abcOrderLesson,
  'E-1-B6': wordGroupsLesson,
};
