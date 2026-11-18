import { CLOSEST_VOWEL, CVC_WORDS } from '../../content/data/cvc';
import { CLAP_WORDS } from '../../content/data/h3-sounds';
import { LOOK_ALIKE_LOWER } from '../../content/data/letters';
import { SYLLABLE_WORDS } from '../../content/data/syllables';
import type { Question, Say, SayPart, Visual } from '../../engine/types';
import { alter, art, calm, countAlong, moment, scene, set, str, text, turnQuestion } from '../build';
import type { Lesson, LessonPart, Moment, Piece, Scene } from '../types';

// Part 2 lessons (plan section 16): a second short lesson for a skill's harder levels, offered once the child is
// about half way up the skill. Kindergarten Language Arts. Letters are said by name and words as whole words:
// the voice never says a lone sound.

const show = (m: Moment): LessonPart => ({ kind: 'show', moment: m });
const turn = (question: Question, why: Moment[]): LessonPart => ({ kind: 'turn', turn: { question, why } });
const last = (moments: Moment[]): Scene => moments.at(-1)?.scene ?? scene([]);
// "c, a, t": a word's letters one by one.
const spelled = (word: string): Say => word.split('').flatMap((letter, i): SayPart[] => (i === 0 ? [{ letter }] : [',', { letter }]));

function strings(facts: Record<string, unknown>, key: string): string[] {
  const value = facts[key];
  if (!Array.isArray(value)) throw new Error(`facts.${key} is not a list`);
  return value.map(String);
}

// The picture a question shows: the first emoji in its stimulus.
function pictureOf(visual: Visual | undefined): string {
  if (visual?.kind === 'emojiGroup') return visual.emoji;
  if (visual?.kind === 'row') {
    for (const child of visual.children) {
      if (child.kind === 'emojiGroup') return child.emoji;
    }
  }
  throw new Error('The question has no picture');
}

// The letter tiles a tiles question offers, in the order it shows them.
function bankOf(question: Question): string[] {
  if (question.type !== 'tiles') throw new Error('Not a tiles question');
  return [...question.bank];
}

function cvcEmoji(word: string): string {
  const found = CVC_WORDS.find((each) => each.word === word);
  if (!found) throw new Error(`No picture for ${word}`);
  return found.emoji;
}

// ---- E-K-A1 ABC order, level 4: build the next three letters from five tiles ----

const shift = (letter: string, by: number): string => String.fromCharCode(letter.charCodeAt(0) + by);
const RUN_SLOT = (i: number): number => 1.9 + i * 1.6;

// The first letter and three empty boxes above, five letter tiles on the table.
function runScene(prefix: string, first: string, bank: readonly string[]): Scene {
  return scene([
    { id: `${prefix}f`, look: text(first), x: RUN_SLOT(0), y: 0.5, w: 1.3, h: 1.3 },
    ...[0, 1, 2].map((i) => ({ id: `${prefix}x${i}`, look: { kind: 'box' as const }, x: RUN_SLOT(i + 1), y: 0.5, w: 1.3, h: 1.3 })),
    ...bank.map((letter, i) => ({ id: `${prefix}b${i}`, look: text(letter), x: 1.1 + i * 1.6, y: 3.3, w: 1.3, h: 1.3 })),
  ]);
}

// Say the next letter, find its tile, and move it into the next box. The two spare tiles stay behind.
function runMoments(prefix: string, first: string, bank: readonly string[]): Moment[] {
  const run = [1, 2, 3].map((step) => shift(first, step));
  let now = runScene(prefix, first, bank);
  const out: Moment[] = [moment(['The row starts with', { letter: first }, '.'], `The row starts with ${first}.`, set(now, [`${prefix}f`], { lit: true }))];
  run.forEach((letter, i) => {
    const before = i === 0 ? first : (run[i - 1] as string);
    now = set(set(calm(now), [`${prefix}x${i}`], { gone: true }), [`${prefix}b${bank.indexOf(letter)}`], { x: RUN_SLOT(i + 1), y: 0.5, lit: true });
    out.push(moment(['After', { letter: before }, 'comes', { letter }, '.'], `After ${before} comes ${letter}.`, now));
  });
  const spare = bank.map((letter, i) => ({ letter, i })).filter((each) => !run.includes(each.letter));
  now = set(calm(now), spare.map((each) => `${prefix}b${each.i}`), { dim: true });
  out.push(moment([{ letter: spare[0]?.letter ?? '' }, 'and', { letter: spare[1]?.letter ?? '' }, 'do not come next. We leave them out.'], 'Two letters are extra.', now));
  const inRow = [`${prefix}f`, ...run.map((letter) => `${prefix}b${bank.indexOf(letter)}`)];
  out.push(moment(['The next letters are', ...run.map((letter) => ({ letter })), '. Now the row is in order.'], [first, ...run].join(', '), set(now, inRow, { lit: true })));
  return out;
}

const runWhy = (question: Question): Moment[] => runMoments('w', str(question.facts, 'letter'), bankOf(question));

function abcRunLesson(): Lesson {
  const bank = ['m', 'c', 'l', 't', 'n'];
  const start = runScene('x', 'k', bank);
  const example = runMoments('x', 'k', bank);
  const isSmall = (letter: string): boolean => letter === letter.toLowerCase();
  // Neither turn starts inside the example's row.
  const away = (f: Record<string, unknown>): boolean => !'hijklmn'.includes(str(f, 'letter').toLowerCase());
  const first = turnQuestion('E-K-A1', 4, (f) => away(f) && isSmall(str(f, 'letter')));
  const second = turnQuestion('E-K-A1', 4, (f) => away(f) && !isSmall(str(f, 'letter')) && str(f, 'letter').toLowerCase() !== str(first.facts, 'letter'));
  return {
    parts: [
      show(moment(['You know how to find one missing letter. Now you will put three letters in order.'], 'Now: three letters in order.', start)),
      show(moment(['Here is one letter, and three empty boxes.'], 'One letter, three boxes.', set(start, ['xx0', 'xx1', 'xx2'], { lit: true }))),
      show(moment(['Down here are five letters. Only three of them belong in the boxes.'], 'Five letters. Only three belong.', set(start, bank.map((_, i) => `xb${i}`), { lit: true }))),
      ...example.map(show),
      show(moment(['Start at the letter you can see. Say the next letter, find it, and put it in the box.'], 'Say the next letter. Find it.', calm(last(example)))),
      show(moment(['Then do the same again, until every box is full.'], 'Fill every box.', set(calm(last(example)), ['xb2', 'xb0', 'xb4'], { lit: true }))),
      turn(first, runWhy(first)),
      show(moment(['Big letters come in the very same order as small letters.'], 'Big letters: the same order.', calm(last(example)))),
      turn(second, runWhy(second)),
      show(moment(['Say the letters in order, one at a time, and leave the extra ones out.'], 'One letter at a time.', calm(last(example)))),
    ],
  };
}

// ---- E-K-B1 and E-K-B2, level 2: the letters to pick from look alike ----

// How to tell each look-alike letter by its shape.
const SHAPES: Record<string, string> = {
  b: 'has a tall line, then a round part',
  d: 'has a round part, then a tall line',
  p: 'has a line that hangs down, then a round part',
  q: 'has a round part, then a line that hangs down',
  m: 'has two humps',
  n: 'is short, and has one hump',
  u: 'is round at the bottom',
  v: 'has a point at the bottom',
  h: 'has a tall line, then one hump',
};
const alike = (one: string, two: string): boolean => one !== two && LOOK_ALIKE_LOWER.some((group) => group.includes(one) && group.includes(two));

type End = 'first' | 'last';
const verb = (which: End): string => (which === 'first' ? 'starts' : 'ends');

// The picture, the word's letters beside it (hidden at first), and the letters to pick from on the table (hidden).
function endScene(prefix: string, word: string, emoji: string, options: readonly string[]): Scene {
  return scene([
    { id: `${prefix}p`, look: art(emoji), x: 0.6, y: 0.3, w: 2, h: 2 },
    ...word.split('').map((letter, i) => ({ id: `${prefix}l${i}`, look: text(letter), x: 3.2 + i * 0.8, y: 0.8, w: 0.8, h: 1, gone: true })),
    ...options.map((letter, i) => ({ id: `${prefix}o${i}`, look: text(letter), x: 2.2 + i * 2.1, y: 3.5, w: 1.4, h: 1.4, gone: true })),
  ]);
}

// Hear the letter, then look closely at each choice: the look-alikes are told apart by their shapes.
function endMoments(which: End, prefix: string, word: string, emoji: string, options: readonly string[]): Moment[] {
  const at = which === 'first' ? 0 : word.length - 1;
  const letter = word.charAt(at);
  const start = endScene(prefix, word, emoji, options);
  const written = set(start, word.split('').map((_, i) => `${prefix}l${i}`), { gone: false });
  const found = set(written, [`${prefix}l${at}`], { lit: true });
  const choices = set(calm(found), options.map((_, i) => `${prefix}o${i}`), { gone: false, lit: true });
  const out: Moment[] = [
    moment(['Listen:', { word }, '.'], `Listen: ${word}`, set(start, [`${prefix}p`], { lit: true })),
    moment(['Here is how we write', { word }, '.'], word, written),
    moment([{ word }, verb(which), 'with the letter', { letter }, '.'], `${word} ${verb(which)} with ${letter}`, found),
    moment(['Now look closely at the letters to pick from.'], 'Look closely at each letter.', choices),
  ];
  let now = calm(choices);
  options.forEach((option, i) => {
    if (!alike(option, letter)) return;
    now = set(now, [`${prefix}o${i}`], { dim: true });
    out.push(moment([{ letter: option }, `${SHAPES[option] ?? 'has another shape'}. That is not`, { letter }, '.'], `${option} is not ${letter}`, now));
  });
  const end = set(alter(now, (piece) => (piece.id.startsWith(`${prefix}o`) ? { ...piece, dim: true } : piece)), [`${prefix}o${options.indexOf(letter)}`, `${prefix}l${at}`], { dim: undefined, lit: true });
  out.push(moment([{ letter }, `${SHAPES[letter] ?? 'is the right shape'}. So`, { word }, verb(which), 'with', { letter }, '.'], `${word} ${verb(which)} with ${letter}`, end));
  return out;
}

const endWhy = (which: End) => (question: Question): Moment[] => endMoments(which, 'w', str(question.facts, 'target'), pictureOf(question.stimulus), strings(question.facts, 'options'));

// Two letters side by side, big, to compare their shapes.
function pairScene(one: string, two: string): Scene {
  return scene([
    { id: 'pa', look: text(one), x: 2.2, y: 1.4, w: 2.2, h: 2.2 },
    { id: 'pb', look: text(two), x: 5.6, y: 1.4, w: 2.2, h: 2.2 },
  ]);
}

function pairMoments(one: string, two: string): Moment[] {
  const start = pairScene(one, two);
  return [
    moment([{ letter: one }, `${SHAPES[one] ?? ''}.`], `${one}: ${SHAPES[one] ?? ''}`, set(start, ['pa'], { lit: true })),
    moment([{ letter: two }, `${SHAPES[two] ?? ''}.`], `${two}: ${SHAPES[two] ?? ''}`, set(start, ['pb'], { lit: true })),
  ];
}

function alikeLesson(which: End): Lesson {
  const first = which === 'first';
  const skillId = first ? 'E-K-B1' : 'E-K-B2';
  const letterOf = (f: Record<string, unknown>): string => (first ? str(f, 'target').charAt(0) : str(f, 'target').slice(-1));
  // The worked example: bear starts with b, bed ends with d. The choices are b, d and p either way.
  const word = first ? 'bear' : 'bed';
  const emoji = first ? '🐻' : cvcEmoji('bed');
  const example = endMoments(which, 'x', word, emoji, first ? ['d', 'b', 'p'] : ['b', 'p', 'd']);
  // Never lip: its picture is a mouth. Short words only, so the written word is easy to take in.
  const fresh = (f: Record<string, unknown>): boolean => ![word, 'lip'].includes(str(f, 'target')) && str(f, 'target').length <= 5;
  const one = turnQuestion(skillId, 2, (f) => fresh(f) && 'bdp'.includes(letterOf(f)));
  const two = turnQuestion(skillId, 2, (f) => fresh(f) && 'mn'.includes(letterOf(f)) && str(f, 'target') !== str(one.facts, 'target'));
  const pair = pairScene('b', 'd');
  const humps = pairScene('m', 'n');
  const why = endWhy(which);
  return {
    parts: [
      show(moment([`You know how to hear the ${first ? 'first' : 'last'} letter of a word. Now the letters to pick from look alike.`], 'Now: letters that look alike.', pair)),
      show(moment(['Look at', { letter: 'b' }, 'and', { letter: 'd' }, '. They look almost the same.'], 'b and d look almost the same.', set(pair, ['pa', 'pb'], { lit: true }))),
      ...pairMoments('b', 'd').map(show),
      ...example.map(show),
      show(moment(['First hear the letter. Then look closely at each shape, so you pick the right one.'], 'Hear it. Then look closely.', calm(last(example)))),
      turn(one, why(one)),
      show(moment([{ letter: 'm' }, 'and', { letter: 'n' }, 'look alike too.'], 'm and n look alike too.', set(humps, ['pa', 'pb'], { lit: true }))),
      ...pairMoments('m', 'n').map(show),
      turn(two, why(two)),
      show(moment([`Listen for the ${first ? 'first' : 'last'} letter, then check its shape.`], 'Listen, then check the shape.', calm(pair))),
    ],
  };
}

// ---- E-K-B3 Middle vowel, level 2: all five vowels, and the closest-sounding one is always a choice ----

const VOWELS = ['a', 'e', 'i', 'o', 'u'];
const GAP = '_';

// The picture, the word with a gap in the middle, and the vowels to pick from on the table.
function gapScene(prefix: string, word: string, emoji: string, options: readonly string[]): Scene {
  const left = 5 - (options.length * 2 - 0.6) / 2;
  return scene([
    { id: `${prefix}p`, look: art(emoji), x: 0.8, y: 0.3, w: 2, h: 2 },
    ...[word.charAt(0), GAP, word.charAt(2)].map((letter, i) => ({ id: `${prefix}l${i}`, look: text(letter), x: 4 + i * 1.3, y: 0.7, w: 1.2, h: 1.2 })),
    ...options.map((letter, i) => ({ id: `${prefix}o${i}`, look: text(letter), x: left + i * 2, y: 3.5, w: 1.4, h: 1.4 })),
  ]);
}

// Try the choices that make another real word, then listen hard and put the right letter in.
function gapMoments(prefix: string, word: string, emoji: string, options: readonly string[]): Moment[] {
  const vowel = word.charAt(1);
  const start = gapScene(prefix, word, emoji, options);
  const put = (from: Scene, letter: string, picture: string): Scene => alter(from, (piece) => (piece.id === `${prefix}l1` ? { ...piece, look: text(letter), lit: true } : piece.id === `${prefix}p` ? { ...piece, look: art(picture) } : piece));
  const out: Moment[] = [moment(['Listen:', { word }, '. Its middle letter is missing.'], `${word.charAt(0)}${GAP}${word.charAt(2)}`, set(start, [`${prefix}l1`], { lit: true }))];
  let now = start;
  const close = CVC_WORDS.find((each) => each.word === word)?.vowel;
  const near = close ? CLOSEST_VOWEL[close] : '';
  let nearTried = false;
  options.forEach((option, i) => {
    const other = CVC_WORDS.find((each) => each.word === `${word.charAt(0)}${option}${word.charAt(2)}`);
    if (option === vowel || !other || other.word === 'lip') return;
    if (option === near) nearTried = true;
    out.push(moment(['With', { letter: option }, 'in the middle, the word would be', { word: other.word }, '. That is not our word.'], `${other.word}? No.`, set(put(now, option, other.emoji), [`${prefix}o${i}`], { lit: true })));
    now = set(now, [`${prefix}o${i}`], { dim: true });
  });
  // The closest-sounding letter is always a choice: name the pair, so the child knows which two to listen between.
  if (!nearTried && options.includes(near)) {
    out.push(moment(['Here,', { letter: vowel }, 'and', { letter: near }, 'are easy to mix up.'], `${vowel} or ${near}?`, set(now, [`${prefix}o${options.indexOf(vowel)}`, `${prefix}o${options.indexOf(near)}`], { lit: true })));
  }
  out.push(moment(['Say', { word }, 'slowly, and listen hard to the middle.'], `Listen: ${word}`, set(now, [`${prefix}p`], { lit: true })));
  out.push(moment(['The middle letter of', { word }, 'is', { letter: vowel }, '.'], `The middle is ${vowel}`, set(put(alter(now, (piece) => (piece.id.startsWith(`${prefix}o`) ? { ...piece, dim: true } : piece)), vowel, emoji), [`${prefix}o${options.indexOf(vowel)}`], { dim: undefined, lit: true })));
  return out;
}

const gapWhy = (question: Question): Moment[] => gapMoments('w', str(question.facts, 'target'), pictureOf(question.stimulus), strings(question.facts, 'options'));

function closeVowelsLesson(): Lesson {
  const row = scene(VOWELS.map((letter, i) => ({ id: `v${i}`, look: text(letter), x: 1.5 + i * 1.5, y: 1.9, w: 1.2, h: 1.2 })));
  const pen = gapMoments('x', 'pen', cvcEmoji('pen'), ['a', 'e', 'i']);
  const bug = gapMoments('y', 'bug', cvcEmoji('bug'), ['a', 'o', 'u']);
  // A turn never asks for a word the lesson has shown, nor lip: its picture is a mouth.
  const fresh = (f: Record<string, unknown>): boolean => !['pen', 'pin', 'pan', 'bug', 'bag', 'lip'].includes(str(f, 'target'));
  const first = turnQuestion('E-K-B3', 2, (f) => fresh(f) && 'ei'.includes(str(f, 'target').charAt(1)));
  const second = turnQuestion('E-K-B3', 2, (f) => fresh(f) && 'ou'.includes(str(f, 'target').charAt(1)));
  return {
    parts: [
      show(moment(['You know how to listen for the middle letter. Now it can be any one of these five letters.'], 'Now: a, e, i, o, u', set(row, ['v0', 'v1', 'v2', 'v3', 'v4'], { lit: true }))),
      show(moment(['Some of them are easy to mix up. In the middle of a word,', { letter: 'e' }, 'and', { letter: 'i' }, 'sound close.'], 'e and i sound close.', set(row, ['v1', 'v2'], { lit: true }))),
      ...pen.map(show),
      show(moment(['Try each letter in the gap, and say the word. Pick the letter that makes the right word.'], 'Try each letter in the gap.', calm(last(pen)))),
      turn(first, gapWhy(first)),
      show(moment(['In the middle of a word,', { letter: 'o' }, 'and', { letter: 'u' }, 'sound close too.'], 'o and u sound close too.', set(row, ['v3', 'v4'], { lit: true }))),
      ...bug.map(show),
      turn(second, gapWhy(second)),
      show(moment(['Say the word slowly, and listen hard to the middle.'], 'Listen hard to the middle.', set(row, ['v0', 'v1', 'v2', 'v3', 'v4'], { lit: true }))),
    ],
  };
}

// ---- E-K-B12 More claps, level 3: three claps against four ----

const CLAPPED = [...SYLLABLE_WORDS, ...CLAP_WORDS];
const clapParts = (word: string): readonly string[] => CLAPPED.find((each) => each.word === word)?.parts ?? [word];

function clapEmoji(word: string): string {
  const found = CLAPPED.find((each) => each.word === word);
  if (!found) throw new Error(`No picture for ${word}`);
  return found.emoji;
}

// Two pictures side by side, each with its parts under it (hidden at first).
function clapScene(words: readonly string[]): Scene {
  return scene(
    words.flatMap((word, side) => {
      const parts = clapParts(word);
      const left = side * 5 + 2.5 - (parts.length * 1.15 - 0.15) / 2;
      return [
        { id: `c${side}p`, look: art(clapEmoji(word)), x: side * 5 + 1.5, y: 0.3, w: 2, h: 2 },
        ...parts.map((part, i) => ({ id: `c${side}s${i}`, look: text(part), x: left + i * 1.15, y: 3.3, w: 1, h: 0.6, gone: true })),
      ];
    }),
  );
}

const partIds = (word: string, side: number): string[] => clapParts(word).map((_, i) => `c${side}s${i}`);

// Clap each long word part by part, count, then compare the two numbers.
function clapMoments(words: readonly string[], more: string): Moment[] {
  let now = clapScene(words);
  const out: Moment[] = [moment(['Which word has more claps?'], 'Which has more claps?', now)];
  words.forEach((word, side) => {
    const parts = partIds(word, side);
    now = set(set(calm(now), parts, { gone: false }), [`c${side}p`], { lit: true });
    out.push(moment(['Let us clap', { word }, 'slowly.'], `Clap ${word}.`, now));
    const counted = countAlong(now, parts);
    out.push(...counted.moments);
    now = set(counted.end, parts, { lit: true });
    out.push(moment([{ word }, 'has', { number: parts.length }, 'claps.'], `${word}: ${parts.length}`, now));
  });
  const fewer = words.find((each) => each !== more) ?? '';
  const win = words.indexOf(more);
  out.push(moment([{ number: clapParts(more).length }, 'is more than', { number: clapParts(fewer).length }, '. So', { word: more }, 'has more claps.'], `${more} has more claps.`, set(calm(now), [`c${win}p`, ...partIds(more, win)], { lit: true })));
  return out;
}

const clapWhy = (question: Question): Moment[] => clapMoments(strings(question.facts, 'options'), str(question.facts, 'target'));

function longClapsLesson(): Lesson {
  const pair = ['elephant', 'alligator'];
  const example = clapMoments(pair, 'alligator');
  const shown = (f: Record<string, unknown>): boolean => strings(f, 'options').some((each) => pair.includes(each));
  const first = turnQuestion('E-K-B12', 3, (f) => !shown(f));
  const second = turnQuestion('E-K-B12', 3, (f) => !shown(f) && strings(f, 'options').every((each) => !strings(first.facts, 'options').includes(each)));
  const end = calm(last(example));
  return {
    parts: [
      show(moment(['You know how to clap a word and count its claps. Now both words are long.'], 'Now: two long words.', clapScene(pair))),
      show(moment(['You cannot tell just by looking. So clap each word slowly, part by part.'], 'Clap slowly, part by part.', set(clapScene(pair), ['c0p', 'c1p'], { lit: true }))),
      ...example.map(show),
      show(moment(['A tiny part, like this one, still gets its own clap.'], 'A tiny part gets a clap too.', set(end, ['c0s1'], { lit: true }))),
      show(moment(['Do not guess. Clap every part, count the claps, then pick the bigger number.'], 'Clap, count, compare.', end)),
      turn(first, clapWhy(first)),
      turn(second, clapWhy(second)),
      show(moment(['Long words need slow claps. Count every part.'], 'Slow claps. Count every part.', set(end, [...partIds('elephant', 0), ...partIds('alligator', 1)], { lit: true }))),
    ],
  };
}

// ---- E-K-C3 Sight words, level 4: hear the word and spell it with letter tiles ----

const TILE = 1.15;

// An empty box for each letter of the word, and the letter tiles on the table.
function spellScene(prefix: string, word: string, bank: readonly string[]): Scene {
  const boxLeft = 5 - (word.length * TILE - 0.15) / 2;
  const bankLeft = 5 - (bank.length * TILE - 0.15) / 2;
  return scene([
    ...word.split('').map((_, i) => ({ id: `${prefix}x${i}`, look: { kind: 'box' as const }, x: boxLeft + i * TILE, y: 0.8, w: 1, h: 1 })),
    ...bank.map((letter, i) => ({ id: `${prefix}b${i}`, look: text(letter), x: bankLeft + i * TILE, y: 3.4, w: 1, h: 1 })),
  ]);
}

// The bank tile used for each letter of the word: a letter that comes twice uses two different tiles.
function tilesFor(word: string, bank: readonly string[]): number[] {
  const used: number[] = [];
  word.split('').forEach((letter) => {
    const at = bank.findIndex((each, i) => each === letter && !used.includes(i));
    if (at < 0) throw new Error(`No tile for ${letter} in ${word}`);
    used.push(at);
  });
  return used;
}

// Say the word, then put its letters in the boxes from first to last. The spare tiles stay on the table.
function spellMoments(prefix: string, word: string, bank: readonly string[]): Moment[] {
  const start = spellScene(prefix, word, bank);
  const boxes = word.split('').map((_, i) => `${prefix}x${i}`);
  const tiles = tilesFor(word, bank);
  const boxLeft = 5 - (word.length * TILE - 0.15) / 2;
  const out: Moment[] = [
    moment(['Listen to the word:', { word }, '.'], `Listen: ${word}`, start),
    moment([{ word }, 'has', { number: word.length }, 'letters, so there are', { number: word.length }, 'boxes.'], `${word.length} letters, ${word.length} boxes`, set(start, boxes, { lit: true })),
  ];
  let now = start;
  word.split('').forEach((letter, i) => {
    now = set(set(calm(now), [`${prefix}x${i}`], { gone: true }), [`${prefix}b${tiles[i]}`], { x: boxLeft + i * TILE, y: 0.8, lit: true });
    const lead = i === 0 ? 'First comes' : i === word.length - 1 ? 'Last comes' : i % 2 === 1 ? 'Next comes' : 'Then comes';
    out.push(moment([lead, { letter }, '.'], word.slice(0, i + 1), now));
  });
  const spare = bank.map((_, i) => i).filter((i) => !tiles.includes(i));
  now = set(calm(now), spare.map((i) => `${prefix}b${i}`), { dim: true });
  out.push(moment(['Two letters are left over. We do not need them.'], 'Two letters are extra.', now));
  out.push(moment([...spelled(word), '. That spells', { word }, '.'], word, set(now, tiles.map((i) => `${prefix}b${i}`), { lit: true })));
  return out;
}

const spellWhy = (question: Question): Moment[] => spellMoments('w', str(question.facts, 'target'), bankOf(question));

function spellSightLesson(): Lesson {
  const was = spellMoments('x', 'was', ['s', 'k', 'w', 'a', 'm']);
  // The word like, already built, to show its last letter.
  const like = scene('like'.split('').map((letter, i) => ({ id: `k${i}`, look: text(letter), x: 5 - (4 * TILE - 0.15) / 2 + i * TILE, y: 1.8, w: 1, h: 1 })));
  const shown = ['was', 'like', 'have', 'went', 'want'];
  const first = turnQuestion('E-K-C3', 4, (f) => str(f, 'target').length === 3 && !shown.includes(str(f, 'target')));
  const second = turnQuestion('E-K-C3', 4, (f) => str(f, 'target').length >= 4 && !shown.includes(str(f, 'target')));
  return {
    parts: [
      show(moment(['You know these words when you see them. Now you will spell them, letter by letter.'], 'Now: spell the word.', spellScene('x', 'was', ['s', 'k', 'w', 'a', 'm']))),
      ...was.map(show),
      show(moment(['Say the word. Think how it looks. Then put in its letters, from the first to the last.'], 'Say it. Picture it. Spell it.', calm(last(was)))),
      turn(first, spellWhy(first)),
      show(moment(['You cannot always hear every letter. So remember how the word looks.'], 'Remember how the word looks.', like)),
      show(moment([{ word: 'like' }, 'ends with the letter', { letter: 'e' }, '. You cannot hear it, but it is there.'], 'like ends with e', set(like, ['k3'], { lit: true }))),
      turn(second, spellWhy(second)),
      show(moment(['Say it, picture it, and spell it.'], 'Say it, picture it, spell it.', set(like, ['k0', 'k1', 'k2', 'k3'], { lit: true }))),
    ],
  };
}

// ---- E-K-D1 Capitals and periods, level 3: three sentences, and two checks ----

const DOT = 'dot';
const LINES = [0.3, 1.9, 3.5];

// A word tile's width at height h: wide enough for its letters.
const tileWidth = (word: string, h: number): number => Math.max(h * 0.8, 0.42 * h * word.length + 0.25);

// A written sentence as word tiles in one row, centred, with its period as a tile of its own.
function sentencePieces(prefix: string, sentence: string, y: number): Piece[] {
  const ends = sentence.endsWith('.');
  const words = (ends ? sentence.slice(0, -1) : sentence).split(' ');
  const all = [...words, ...(ends ? ['.'] : [])];
  const h = 0.9;
  const gap = 0.25 * h;
  let x = 5 - (all.reduce((sum, word) => sum + tileWidth(word, h), 0) + (all.length - 1) * gap) / 2;
  return all.map((word, i) => {
    const piece: Piece = { id: ends && i === words.length ? `${prefix}${DOT}` : `${prefix}w${i}`, look: text(word), x, y, w: tileWidth(word, h), h };
    x += tileWidth(word, h) + gap;
    return piece;
  });
}

const hasCapital = (sentence: string): boolean => /^[A-Z]/.test(sentence);
const hasPeriod = (sentence: string): boolean => sentence.endsWith('.');
// The last tile of a written sentence: its period, or its last word when the period is missing.
const endId = (prefix: string, sentence: string): string => (hasPeriod(sentence) ? `${prefix}${DOT}` : `${prefix}w${sentence.split(' ').length - 1}`);

// Check every start, drop the ones with no capital; check the ends of the rest, drop the ones with no period.
function checkMoments(prefix: string, options: readonly string[]): Moment[] {
  const row = (i: number): string => `${prefix}${i}`;
  const start = scene(options.flatMap((each, i) => sentencePieces(row(i), each, LINES[i] ?? 0)));
  const dimRows = (from: Scene, rows: readonly number[]): Scene => alter(from, (piece) => (rows.some((i) => piece.id.startsWith(row(i))) ? { ...piece, dim: true, lit: undefined } : piece));
  const all = options.map((_, i) => i);
  const small = all.filter((i) => !hasCapital(options[i] ?? ''));
  const left = all.filter((i) => !small.includes(i));
  const open = left.filter((i) => !hasPeriod(options[i] ?? ''));
  const right = left.find((i) => !open.includes(i)) ?? 0;
  const out: Moment[] = [moment(['First check the start. Does each sentence begin with a capital letter?'], 'Check the start.', set(start, all.map((i) => `${row(i)}w0`), { lit: true }))];
  let now = dimRows(calm(start), small);
  const smallLit = set(now, small.map((i) => `${row(i)}w0`), { lit: true, crossed: true });
  out.push(moment([small.length > 1 ? 'These two start with a small letter. They are wrong.' : 'This one starts with a small letter. It is wrong.'], 'A small letter at the start: wrong.', smallLit));
  now = set(now, small.map((i) => `${row(i)}w0`), { crossed: true });
  if (left.length > 1) {
    out.push(moment(['Now check the end of the ones that are left. Is there a period?'], 'Check the end.', set(now, left.map((i) => endId(row(i), options[i] ?? '')), { lit: true })));
    const lastWords = open.map((i) => endId(row(i), options[i] ?? ''));
    now = dimRows(now, open);
    out.push(moment(['This one has no period at the end. It is wrong.'], 'No period at the end: wrong.', set(now, lastWords, { lit: true, crossed: true })));
    now = set(now, lastWords, { crossed: true });
  }
  const sentence = options[right] ?? '';
  const found = alter(now, (piece) => (piece.id.startsWith(row(right)) ? { ...piece, lit: true } : piece));
  out.push(moment(['Only this one has a capital at the start, and a period at the end.', sentence], sentence, found));
  return out;
}

const checkWhy = (question: Question): Moment[] => checkMoments('o', strings(question.facts, 'options'));

function threeSentencesLesson(): Lesson {
  const options = ['The fox ran', 'the fox ran.', 'The fox ran.'];
  const example = checkMoments('x', options);
  const start = scene(options.flatMap((each, i) => sentencePieces(`x${i}`, each, LINES[i] ?? 0)));
  const both = scene(sentencePieces('b', 'we can run', 1.9));
  const bothWrong = (f: Record<string, unknown>): boolean => strings(f, 'options').some((each) => !hasCapital(each) && !hasPeriod(each));
  const fresh = (f: Record<string, unknown>): boolean => !['the fox ran', 'we can run'].includes(str(f, 'base'));
  const first = turnQuestion('E-K-D1', 3, (f) => fresh(f) && !bothWrong(f));
  const second = turnQuestion('E-K-D1', 3, (f) => fresh(f) && bothWrong(f) && str(f, 'base') !== str(first.facts, 'base'));
  return {
    parts: [
      show(moment(['You know a sentence needs a capital at the start, and a period at the end. Now there are three sentences to check.'], 'Now: three sentences.', start)),
      show(moment(['They all say the same words. Only one is written the right way.'], 'Only one is right.', set(start, ['x0w1', 'x1w1', 'x2w1', 'x0w2', 'x1w2', 'x2w2'], { lit: true }))),
      ...example.map(show),
      show(moment(['Do two checks: the start, then the end. The right sentence passes both.'], 'Two checks: start, then end.', calm(last(example)))),
      turn(first, checkWhy(first)),
      show(moment(['Watch out. A sentence can be wrong at both ends.'], 'Wrong at both ends.', both)),
      show(moment(['This one has no capital at the start, and no period at the end.'], 'No capital. No period.', set(both, ['bw0', 'bw2'], { lit: true, crossed: true }))),
      turn(second, checkWhy(second)),
      show(moment(['Two checks: a capital at the start, and a period at the end.'], 'Capital at the start. Period at the end.', set(calm(last(example)), ['x2w0', `x2${DOT}`], { lit: true }))),
    ],
  };
}

export const LESSONS: Readonly<Record<string, () => Lesson>> = {
  'E-K-A1': abcRunLesson,
  'E-K-B1': () => alikeLesson('first'),
  'E-K-B2': () => alikeLesson('last'),
  'E-K-B3': closeVowelsLesson,
  'E-K-B12': longClapsLesson,
  'E-K-C3': spellSightLesson,
  'E-K-D1': threeSentencesLesson,
};
