import { GROUP_WORDS } from '../../content/data/categories';
import { FIGURES } from '../../engine/figures';
import type { FigureId, Point } from '../../engine/figures';
import type { CoinName, Question, Say, Visual } from '../../engine/types';
import { alter, art, calm, moment, num, numeral, picture, pointAt, scene, set, text, turnQuestion, withoutHand } from '../build';
import type { Lesson, LessonPart, Moment, Piece, PieceLook, Scene } from '../types';

// Part 2 lessons (plan section 16): a second short lesson for a skill's harder levels, offered once the child is
// about half way up the skill. Grade 1 clocks, coins, bars, towers, parts of shapes, sorting and number patterns.

const show = (m: Moment): LessonPart => ({ kind: 'show', moment: m });
const turn = (question: Question, why: Moment[]): LessonPart => ({ kind: 'turn', turn: { question, why } });
const round = (n: number): number => Math.round(n * 100) / 100;
const last = (moments: Moment[], fallback: Scene): Scene => moments.at(-1)?.scene ?? fallback;
const strings = (facts: Record<string, unknown>, key: string): string[] => {
  const value = facts[key];
  if (!Array.isArray(value)) throw new Error(`facts.${key} is not a list`);
  return value.map(String);
};
const numbers = (facts: Record<string, unknown>, key: string): number[] => strings(facts, key).map(Number);

// The pointing hand with its tip just under a spot on the stage, kept inside the stage.
function handAt(from: Scene, x: number, y: number): Scene {
  const spot: Piece = { id: 'spot', look: { kind: 'hand' }, x, y, w: 0, h: 0 };
  return alter(pointAt(from, spot), (piece) => (piece.id === 'hand' ? { ...piece, x: round(Math.max(0, Math.min(piece.x, from.cols - 0.8))), y: round(Math.max(0, Math.min(piece.y, from.rows - 0.8))) } : piece));
}

// ---- Clocks (M-1-C1, M-1-C6) ----

interface Time {
  hour: number;
  minute: number;
}
interface Face {
  x: number;
  y: number;
  size: number;
}
const written = (time: Time): string => `${time.hour}:${String(time.minute).padStart(2, '0')}`;
const nextHour = (hour: number): number => (hour % 12) + 1;
const clockVisual = (time: Time): Visual => ({ kind: 'clock', hour: time.hour, minute: time.minute });
const readTime = (value: string): Time => {
  const [hour, minute] = value.split(':').map(Number);
  return { hour: hour ?? 12, minute: minute ?? 0 };
};
const NOON: Time = { hour: 12, minute: 0 };

// Where a number sits on a clock face, in stage squares (the face is drawn in a 100 by 100 box, numbers 35 from the middle).
// A number and a half is the spot halfway to the next number.
function onFace(face: Face, number: number, reach = 35): { x: number; y: number } {
  const angle = (number * 30 * Math.PI) / 180;
  return { x: face.x + ((50 + reach * Math.sin(angle)) / 100) * face.size, y: face.y + ((50 - reach * Math.cos(angle)) / 100) * face.size };
}
// Where the short hand points at this time.
const shortSpot = (face: Face, time: Time): { x: number; y: number } => onFace(face, time.hour + (time.minute === 0 ? 0 : 0.5), 24);

// ---- M-1-C1 part 2: from a written time to the clock (level 3), and setting the clock (level 4) ----

const CLOCK_STEP = 3.2;
const pickFace = (i: number): Face => ({ x: 0.4 + i * CLOCK_STEP, y: 1.5, size: 2.8 });

// The written time on a card at the top, and three clocks to choose from.
function pickScene(time: Time, clocks: readonly Visual[]): Scene {
  return scene([
    { id: 't', look: text(written(time)), x: 3.5, y: 0.15, w: 3, h: 1 },
    ...clocks.map((visual, i): Piece => ({ id: `k${i}`, look: picture(visual), x: pickFace(i).x, y: pickFace(i).y, w: pickFace(i).size, h: pickFace(i).size })),
  ]);
}

// Find the clock for a written time: the long hand first (up or down), then the short hand, then the clock itself.
function pickMoments(time: Time, clocks: readonly Visual[], shown: readonly Time[], right: number): { long: Moment; short: Moment; found: Moment } {
  const base = pickScene(time, clocks);
  const all = shown.map((_, i) => `k${i}`);
  const fits = all.filter((_, i) => shown[i]?.minute === time.minute);
  const sorted = set(set(set(base, ['t'], { lit: true }), all, { dim: true }), fits, { dim: undefined, lit: true });
  const tip = shortSpot(pickFace(right), time);
  const looked = handAt(set(calm(sorted), [`k${right}`], { lit: true }), tip.x, tip.y + 0.2);
  const done = set(set(calm(base), all, { dim: true }), ['t', `k${right}`], { dim: undefined, lit: true });
  const up = time.minute === 0;
  return {
    long: moment(
      up ? ['We want', { time }, '. O\'clock means the long hand points straight up, to', { number: 12 }, '.'] : ['We want', { time }, '. Half past means the long hand points straight down, to', { number: 6 }, '.'],
      `${written(time)}: long hand on ${up ? 12 : 6}`,
      sorted,
    ),
    short: moment(
      up ? ['Now the short hand. It must point right at', { number: time.hour }, '.'] : ['Now the short hand. It must be past', { number: time.hour }, ', halfway to', { number: nextHour(time.hour) }, '.'],
      up ? `Short hand: on ${time.hour}` : `Short hand: between ${time.hour} and ${nextHour(time.hour)}`,
      looked,
    ),
    found: moment(['This clock shows', { time }, '.'], written(time), done),
  };
}

function pickWhy(question: Question): Moment[] {
  if (question.type !== 'choice') throw new Error('M-1-C1 level 3 is a choice question');
  const time: Time = { hour: num(question.facts, 'hour'), minute: num(question.facts, 'minute') };
  const steps = pickMoments(time, question.options, strings(question.facts, 'options').map(readTime), question.answerIndex);
  return [steps.long, steps.short, steps.found];
}

const SET_FACE: Face = { x: 0.5, y: 0.5, size: 4.4 };

// A big clock to set, the time wanted on a card, and what each hand must do (hidden until a moment shows it).
function setScene(target: Time, now: Time): Scene {
  return scene([
    { id: 'c', look: picture(clockVisual(now)), x: SET_FACE.x, y: SET_FACE.y, w: SET_FACE.size, h: SET_FACE.size },
    { id: 't', look: text(written(target)), x: 5.9, y: 0.5, w: 3, h: 1.1 },
    { id: 's1', look: text(`short hand: ${target.hour}`), x: 5.2, y: 2.3, w: 4.4, h: 0.6, gone: true },
    { id: 's2', look: text(`long hand: ${target.minute === 0 ? 12 : 6}`), x: 5.2, y: 3.3, w: 4.4, h: 0.6, gone: true },
  ]);
}

// Set a clock that starts at 12 o'clock: the hour first, then the long hand up or down, then read it back.
function setMoments(time: Time): { start: Moment; hour: Moment; minutes: Moment; slid: Moment; done: Moment } {
  const become = (from: Scene, now: Time): Scene => alter(from, (piece) => (piece.id === 'c' ? { ...piece, look: picture(clockVisual(now)) } : piece));
  const start = set(setScene(time, NOON), ['t'], { lit: true });
  const onHour: Time = { hour: time.hour, minute: 0 };
  const hourTip = shortSpot(SET_FACE, onHour);
  const hourSet = handAt(set(become(calm(start), onHour), ['s1'], { gone: false, lit: true }), hourTip.x, hourTip.y + 0.2);
  const longTip = onFace(SET_FACE, time.minute === 0 ? 12 : 6, 30);
  const minuteSet = handAt(set(become(calm(hourSet), time), ['s2'], { gone: false, lit: true }), longTip.x, longTip.y + 0.2);
  const slidTip = shortSpot(SET_FACE, time);
  const slid = handAt(calm(minuteSet), slidTip.x, slidTip.y + 0.2);
  const done = set(withoutHand(calm(minuteSet)), ['c', 't'], { lit: true });
  return {
    start: moment(['The hands start at', { time: NOON }, '. We want', { time }, '.'], `Start at 12:00. Make ${written(time)}.`, start),
    hour: moment(
      time.hour === 12 ? ['First the hour. The short hand is already on', { number: 12 }, '.'] : ['First the hour. Move the short hand to', { number: time.hour }, '.'],
      `Short hand to ${time.hour}`,
      hourSet,
    ),
    minutes: moment(
      time.minute === 0 ? ['Now the minutes. O\'clock means the long hand stays up, on', { number: 12 }, '.'] : ['Now the minutes. Half past means the long hand goes down, to', { number: 6 }, '.'],
      time.minute === 0 ? 'Long hand stays on 12' : 'Long hand down to 6',
      minuteSet,
    ),
    slid: moment(['See, the short hand slid on, halfway to', { number: nextHour(time.hour) }, '. That is right for half past.'], `Short hand: halfway to ${nextHour(time.hour)}`, slid),
    done: moment(['Now the clock shows', { time }, '.'], written(time), done),
  };
}

function setWhy(question: Question): Moment[] {
  const steps = setMoments({ hour: num(question.facts, 'hour'), minute: num(question.facts, 'minute') });
  return [steps.start, steps.hour, steps.minutes, steps.done];
}

function tellTimePart2(): Lesson {
  const want: Time = { hour: 5, minute: 30 };
  const shown: Time[] = [{ hour: 5, minute: 0 }, { hour: 6, minute: 30 }, want];
  const worked = pickMoments(want, shown.map(clockVisual), shown, 2);
  const start = pickScene(want, shown.map(clockVisual));
  const trap = set(set(withoutHand(calm(worked.short.scene)), ['k1'], { lit: true }), ['k0'], { dim: true });
  const making = setMoments({ hour: 4, minute: 30 });
  const one = turnQuestion('M-1-C1', 3, (f) => num(f, 'minute') === 0 && num(f, 'hour') !== 5 && strings(f, 'options').includes(`${num(f, 'hour')}:30`));
  const two = turnQuestion('M-1-C1', 4, (f) => num(f, 'minute') === 30 && num(f, 'hour') !== 4 && num(f, 'hour') !== 12 && num(f, 'hour') !== num(one.facts, 'hour'));
  return {
    parts: [
      show(moment(['You know how to read a clock. Now let us go the other way: from a written time, to the clock.'], 'From a time to the clock', start)),
      show(worked.long),
      show(worked.short),
      show(moment(['Careful. On this clock, the short hand is past', { number: 6 }, '. It shows', { time: shown[1] as Time }, '.'], 'This one shows 6:30.', trap)),
      show(worked.found),
      show(moment(['Check the long hand first. Then check the short hand.'], 'Long hand first, then short hand.', calm(worked.found.scene))),
      turn(one, pickWhy(one)),
      show(moment(['Now you will set the clock yourself.'], 'Set the clock.', calm(making.start.scene))),
      show(making.start),
      show(making.hour),
      show(making.minutes),
      show(making.slid),
      show(making.done),
      turn(two, setWhy(two)),
      show(moment(['The first number tells the short hand where to go. Then the long hand goes up for o\'clock, or down for half past.'], "Hour first. Then up for o'clock, down for half past.", calm(making.done.scene))),
    ],
  };
}

// ---- M-1-C6 part 2: o'clock and half past mixed, two clocks at the same hour (level 3) ----

// Three clocks along the top, and the written times on cards in a row at the bottom (in the cards' own order).
function matchScene(clocks: readonly Visual[], cards: readonly Time[]): Scene {
  return scene([
    ...clocks.map((visual, i): Piece => ({ id: `k${i}`, look: picture(visual), x: 0.4 + i * CLOCK_STEP, y: 0.1, w: 2.8, h: 2.8 })),
    ...cards.map((time, j): Piece => ({ id: `d${j}`, look: text(written(time)), x: 0.7 + j * CLOCK_STEP, y: 4.8, w: 2.2, h: 0.8 })),
  ]);
}

// A card glides up to sit under its clock, and the clock lights up.
const paired = (from: Scene, clock: number, card: number): Scene => set(set(calm(from), [`d${card}`], { x: 0.7 + clock * CLOCK_STEP, y: 3.05, lit: true }), [`k${clock}`], { lit: true });

// What to say as one clock is read: which way the long hand points, where the short hand is, and the time.
function readSay(time: Time): Say {
  return time.minute === 0
    ? ['This long hand points up. The short hand is on', { number: time.hour }, '. That is', { time }, '.']
    : ['This long hand points down. The short hand is between', { number: time.hour }, 'and', { number: nextHour(time.hour) }, '. That is', { time }, '.'];
}

function mixedWhy(question: Question): Moment[] {
  if (question.type !== 'match') throw new Error('M-1-C6 is a match question');
  const times = strings(question.facts, 'leftValues').map(readTime);
  const cards = strings(question.facts, 'rightValues').map(readTime);
  let now = matchScene(question.left, cards);
  const out: Moment[] = [moment(['Look at the long hands first. Up means o\'clock. Down means half past.'], 'Long hand: up or down?', now)];
  // The o'clock clocks first, then the half past ones.
  const pairs = [...question.answerPairs].sort(([one], [two]) => (times[one]?.minute ?? 0) - (times[two]?.minute ?? 0));
  pairs.forEach(([clock, card]) => {
    const time = times[clock] as Time;
    now = paired(now, clock, card);
    out.push(moment(readSay(time), written(time), now));
  });
  return out;
}

function matchClocksPart2(): Lesson {
  const times: Time[] = [{ hour: 7, minute: 30 }, { hour: 10, minute: 30 }, { hour: 7, minute: 0 }];
  const cards: Time[] = [times[2] as Time, times[1] as Time, times[0] as Time];
  const start = matchScene(times.map(clockVisual), cards);
  const up = paired(start, 2, 0);
  const left = set(calm(up), ['k0', 'k1'], { lit: true });
  const seven = paired(up, 0, 2);
  const ten = paired(seven, 1, 1);
  const tip = shortSpot({ x: 0.4, y: 0.1, size: 2.8 }, times[0] as Time);
  const noSevens = (f: Record<string, unknown>): boolean => !strings(f, 'leftValues').some((value) => value.startsWith('7:'));
  const one = turnQuestion('M-1-C6', 3, noSevens);
  const two = turnQuestion('M-1-C6', 3, (f) => noSevens(f) && !strings(f, 'leftValues').some((value) => strings(one.facts, 'leftValues').includes(value)));
  return {
    parts: [
      show(moment(['You know how to match a clock to its time. Now o\'clock and half past are mixed together.'], "O'clock and half past, mixed", start)),
      show(moment(['Look at the cards. A time that ends with two zeros is an o\'clock time.'], "7:00 is an o'clock time.", set(start, ['d0'], { lit: true }))),
      show(moment(['A time that ends with', { number: 30 }, 'is a half past time.'], '7:30 and 10:30 are half past.', set(start, ['d1', 'd2'], { lit: true }))),
      show(moment(['Only one clock has its long hand pointing up. So it gets the o\'clock card.'], written(times[2] as Time), up)),
      show(moment(['Two clocks are left. Both are half past, so now the short hands decide.'], 'Now look at the short hands.', left)),
      show(moment(['This short hand is between', { number: 7 }, 'and', { number: 8 }, '. It has passed', { number: 7 }, ', so it is', { time: times[0] as Time }, '.'], written(times[0] as Time), seven)),
      show(moment(['This short hand is between', { number: 10 }, 'and', { number: 11 }, '. That is', { time: times[1] as Time }, '.'], written(times[1] as Time), ten)),
      show(moment(['Two of these times have the same hour. Only the long hand tells them apart.'], 'Same hour: check the long hand.', set(calm(ten), ['k0', 'k2'], { lit: true }))),
      turn(one, mixedWhy(one)),
      show(moment(['At half past, the hour is the number the short hand has just passed, not the one it is going to.'], 'Half past: the hour it has passed', handAt(set(calm(ten), ['k0', 'd2'], { lit: true }), tip.x, tip.y + 0.2))),
      turn(two, mixedWhy(two)),
      show(moment(['Long hand first: up or down. Then the short hand tells the hour.'], 'Long hand first. Then the short hand.', calm(ten))),
    ],
  };
}

// ---- M-1-C2 part 2: four bars that are almost the same length (level 3) ----

const UNIT = 0.8; // stage squares for each unit of a bar's length
const BAR_X = 1;
const BAR_GAP = 1.3;
const barVisual = (length: number, color: string): Visual => ({ kind: 'bar', length, color, orientation: 'horizontal' });
const barY = (row: number): number => round(0.4 + row * BAR_GAP);
const BAR_H = round((24 / 22) * UNIT);
// A bar's piece, sized so that every bar is drawn to the same scale (the picture is 22 units for each unit of length, 24 tall).
const barPiece = (id: string, visual: Visual, length: number, row: number): Piece => ({ id, look: picture(visual), x: BAR_X, y: barY(row), w: round(((length * 22 + 4) / 22) * UNIT), h: BAR_H });
// The right-hand end of a bar that starts at the line-up edge.
const barEnd = (length: number): number => BAR_X + ((length * 22 + 2) / 22) * UNIT;

// Close bars: line them up, look closely at the far ends, then move the one that stops first to the next row.
function closeMoments(values: readonly number[], visuals: readonly Visual[], offsets?: readonly number[]): Moment[] {
  const lined = scene(values.map((value, i) => barPiece(`b${i}`, visuals[i] as Visual, value, i)));
  const out: Moment[] = [];
  if (offsets) {
    const loose = alter(lined, (piece) => ({ ...piece, x: BAR_X + (offsets[Number(piece.id.slice(1))] ?? 0) }));
    out.push(moment(['When bars are this close, do not guess.'], 'Do not guess.', loose));
  }
  const shortest = values.indexOf(Math.min(...values));
  out.push(moment(['Line the bars up at one end.'], 'Line them up at one end.', lined));
  out.push(moment(['Now look closely at the other end. One bar stops a little before the rest.'], 'Look closely at the other end.', handAt(lined, barEnd(values[shortest] as number), barY(shortest) + BAR_H)));
  const order = values.map((_, i) => i).sort((a, b) => (values[a] as number) - (values[b] as number));
  let rows = values.map((_, i) => i); // rows[row] is the bar now in that row
  let now = lined;
  const says: Say[] = [
    ['This bar stops first. It is the shortest, so it goes first.'],
    ['Of the bars left, this one stops first. It is only a little longer.'],
    ['Next comes this one. It sticks out just a little more.'],
    ['The longest bar goes last.'],
  ];
  const captions = ['The shortest goes first.', 'Then the next shortest.', 'A little longer again.', 'The longest goes last.'];
  order.forEach((bar, place) => {
    const from = rows.indexOf(bar);
    const moved = rows.slice();
    moved[from] = rows[place] as number;
    moved[place] = bar;
    rows = moved;
    now = alter(calm(now), (piece) => {
      const row = rows.indexOf(Number(piece.id.slice(1)));
      return { ...piece, y: barY(row), lit: piece.id === `b${bar}` ? true : undefined, badge: row <= place ? String(row + 1) : undefined };
    });
    const at = place === order.length - 1 ? 3 : Math.min(place, 2);
    out.push(moment(says[at] as Say, captions[at] as string, now));
  });
  out.push(moment(['Now each bar is a little longer than the one before.'], 'Shortest to longest', alter(now, (piece) => ({ ...piece, lit: true }))));
  return out;
}

function closeWhy(question: Question): Moment[] {
  if (question.type !== 'order') throw new Error('M-1-C2 is an order question');
  return closeMoments(numbers(question.facts, 'values'), question.items);
}

function orderByLengthPart2(): Lesson {
  const values = [5, 7, 4, 6];
  const worked = closeMoments(values, values.map((value) => barVisual(value, 'orange')), [1.6, 0.2, 2.2, 0.9]);
  const start = worked[0]?.scene ?? scene([]);
  const done = calm(last(worked, start));
  // In the finished rows the bars of 5 and 6 units are b0 and b3.
  const two = set(set(done, ['b1', 'b2'], { dim: true }), ['b0', 'b3'], { lit: true });
  const smallest = (f: Record<string, unknown>): number => Math.min(...numbers(f, 'values'));
  const first = turnQuestion('M-1-C2', 3, (f) => smallest(f) !== 4);
  const second = turnQuestion('M-1-C2', 3, (f) => smallest(f) !== 4 && smallest(f) !== smallest(first.facts));
  return {
    parts: [
      show(moment(['You know how to put bars in order. Now the bars are almost the same length.'], 'Bars that are almost the same', calm(start))),
      ...worked.map(show),
      show(moment(['Close bars need a careful look. Always check the ends.'], 'Check the ends.', done)),
      turn(first, closeWhy(first)),
      show(moment(['If you are not sure about two bars, look at just those two. The one that sticks out is longer.'], 'Not sure? Look at just two.', handAt(two, barEnd(6), barY(2) + BAR_H))),
      turn(second, closeWhy(second)),
      show(moment(['Line up one end. Then look closely at the other end.'], 'Line up one end. Look closely at the other.', done)),
    ],
  };
}

// ---- M-1-C10 part 2: nine pictures, three in each group (level 3) ----

const GROUP_NAME: Record<string, string> = { animals: 'animals', vehicles: 'vehicles', clothes: 'clothes', food: 'food' };
const BIN_X = [0.3, 3.5, 6.7];
const emojiOf = (word: string): string => GROUP_WORDS.find((each) => each.word === word)?.emoji ?? '❓';

// The pictures in a row on top; three labelled groups on the table below.
function sortScene(looks: readonly PieceLook[], groups: readonly string[]): Scene {
  const items = looks.map((look, i): Piece => ({ id: `i${i}`, look, x: round(0.3 + i * 1.04), y: 0.6, w: 0.95, h: 0.95 }));
  const labels = groups.map((group, g): Piece => ({ id: `g${g}`, look: text(GROUP_NAME[group] ?? group), x: BIN_X[g] as number, y: 2.6, w: 3, h: 0.6 }));
  return scene([...items, ...labels]);
}

// One group at a time: every picture of that kind slides into its group together. The last group is what is left.
function groupMoments(looks: readonly PieceLook[], words: readonly string[], kinds: readonly string[], groups: readonly string[]): Moment[] {
  let now = sortScene(looks, groups);
  return groups.map((group, g) => {
    const mine = words.map((_, i) => i).filter((i) => kinds[i] === group);
    now = alter(calm(now), (piece) => {
      const k = mine.findIndex((i) => piece.id === `i${i}`);
      if (k >= 0) return { ...piece, x: round((BIN_X[g] as number) + 0.1 + k * 0.95), y: 3.5, w: 0.9, h: 0.9, lit: true };
      return piece.id === `g${g}` ? { ...piece, lit: true } : piece;
    });
    const named = mine.map((i) => `the ${words[i] as string}`);
    const list = `${named.slice(0, -1).join(', ')}, and ${named.at(-1) ?? ''}`;
    const label = GROUP_NAME[group] ?? group;
    const sentence = g === groups.length - 1 ? `What is left? ${list.charAt(0).toUpperCase()}${list.slice(1)}. They are all ${label}.` : `Find all the ${label}. ${list.charAt(0).toUpperCase()}${list.slice(1)} are ${label}.`;
    return moment([sentence], `${label}: ${mine.map((i) => words[i] as string).join(', ')}`, now);
  });
}

// Every group counted: three in each, nothing left over.
const checked = (from: Scene): Scene => set(calm(from), ['g0', 'g1', 'g2'], { lit: true, badge: '3' });

function groupWhy(question: Question): Moment[] {
  if (question.type !== 'sort') throw new Error('M-1-C10 is a sort question');
  const steps = groupMoments(question.items.map(picture), strings(question.facts, 'items'), strings(question.facts, 'itemAttrs'), strings(question.facts, 'binAttrs'));
  return [...steps, moment(['Check. Each group has', { number: 3 }, 'pictures, and nothing is left over.'], '3 in each group', checked(last(steps, scene([]))))];
}

function sortThreePart2(): Lesson {
  const words = ['bike', 'pig', 'dress', 'shoe', 'lion', 'car', 'dog', 'tractor', 'shirt'];
  const kinds = ['vehicles', 'animals', 'clothes', 'clothes', 'animals', 'vehicles', 'animals', 'vehicles', 'clothes'];
  const groups = ['animals', 'vehicles', 'clothes'];
  const looks = words.map((word) => art(emojiOf(word)));
  const start = sortScene(looks, groups);
  const worked = groupMoments(looks, words, kinds, groups);
  const done = last(worked, start);
  const tricky = scene([
    { id: 'boat', look: art(emojiOf('boat')), x: 2.2, y: 0.7, w: 1.8, h: 1.8 },
    { id: 'rocket', look: art(emojiOf('rocket')), x: 6, y: 0.7, w: 1.8, h: 1.8 },
    { id: 'g', look: text('vehicles'), x: 3.5, y: 3.4, w: 3, h: 0.7 },
  ]);
  const bins = (f: Record<string, unknown>): string[] => strings(f, 'binAttrs');
  const one = turnQuestion('M-1-C10', 3, (f) => bins(f).includes('food') && !bins(f).includes('clothes'));
  const two = turnQuestion('M-1-C10', 3, (f) => bins(f).includes('food') && bins(f).includes('clothes'));
  return {
    parts: [
      show(moment(['You know how to sort one picture at a time. Now there are nine pictures, so here is a quicker way.'], '9 pictures, 3 groups', start)),
      show(moment(['Pick one group, and hunt for everything that belongs in it.'], 'One group at a time', set(start, ['g0'], { lit: true }))),
      ...worked.map(show),
      show(moment(['Now check. Each group has', { number: 3 }, 'pictures, and nothing is left over.'], '3 in each group', checked(done))),
      show(moment(['Some pictures can trick you. A boat and a rocket have no wheels, but they still take us places. They are vehicles.'], 'A boat and a rocket are vehicles.', set(tricky, ['boat', 'rocket'], { lit: true }))),
      turn(one, groupWhy(one)),
      show(moment(['If a picture is left over at the end, one group is missing something. Look again.'], 'Left over? Look again.', calm(done))),
      turn(two, groupWhy(two)),
      show(moment(['One group at a time. Then check every group.'], 'One group at a time. Then check.', checked(done))),
    ],
  };
}

// ---- M-1-C11 part 2: dimes and pennies, with the answer typed (level 3) ----

const SLOT = 1;
const COIN_SIZE: Record<'dime' | 'penny', number> = { dime: 0.86, penny: 0.92 };
const coinVisual = (name: CoinName): Visual => ({ kind: 'coins', coins: [name] });
const plural = (count: number, one: string, many: string): string => (count === 1 ? one : many);

// The dimes in one row and the pennies in the next; under them the tens, the ones and the total (hidden until shown).
function moneyScene(dimes: number, pennies: number): Scene {
  const row = (name: 'dime' | 'penny', count: number, y: number): Piece[] =>
    Array.from({ length: count }, (_, i): Piece => ({ id: `${name[0] as string}${i}`, look: picture(coinVisual(name)), x: round(0.5 + i * SLOT + (SLOT - COIN_SIZE[name]) / 2), y: round(y - COIN_SIZE[name] / 2), w: COIN_SIZE[name], h: COIN_SIZE[name] }));
  return scene([
    ...row('dime', dimes, 0.9),
    ...row('penny', pennies, 2.1),
    { id: 'tens', look: text(`${dimes} ${plural(dimes, 'ten', 'tens')} = ${dimes * 10}¢`), x: 0.4, y: 3.1, w: 4.4, h: 0.7, gone: true },
    { id: 'ones', look: text(`${pennies} ${plural(pennies, 'one', 'ones')} = ${pennies}¢`), x: 5.2, y: 3.1, w: 4.4, h: 0.7, gone: true },
    { id: 'total', look: text(`${dimes * 10 + pennies}¢`), x: 3.5, y: 4.2, w: 3, h: 1.1, gone: true },
  ]);
}

// The quick way: how many dimes (that many tens), how many pennies (that many ones), then put them together.
function typedMoments(dimes: number, pennies: number): Moment[] {
  const base = moneyScene(dimes, pennies);
  const total = dimes * 10 + pennies;
  const dimeIds = Array.from({ length: dimes }, (_, i) => `d${i}`);
  const pennyIds = Array.from({ length: pennies }, (_, i) => `p${i}`);
  const counted = set(set(base, dimeIds, { lit: true }), [`d${dimes - 1}`], { lit: true, badge: String(dimes) });
  const tens = set(calm(counted), ['tens'], { gone: false, lit: true });
  const ones = set(set(set(calm(tens), pennyIds, { lit: true }), [`p${pennies - 1}`], { lit: true, badge: String(pennies) }), ['ones'], { gone: false, lit: true });
  const done = set(calm(ones), ['total'], { gone: false, lit: true });
  return [
    moment(['First, count how many dimes there are.', { number: dimes }, plural(dimes, 'dime.', 'dimes.')], `${dimes} ${plural(dimes, 'dime', 'dimes')}`, counted),
    moment([{ number: dimes }, plural(dimes, 'dime is', 'dimes are'), { number: dimes }, plural(dimes, 'ten', 'tens'), '. That is', { cents: dimes * 10 }, '.'], `${dimes} ${plural(dimes, 'ten', 'tens')} = ${dimes * 10}¢`, tens),
    moment(['Now the pennies.', { number: pennies }, plural(pennies, 'penny is', 'pennies are'), { cents: pennies }, '.'], `${pennies} ${plural(pennies, 'one', 'ones')} = ${pennies}¢`, ones),
    moment([{ number: dimes * 10 }, ', and', { number: pennies }, ', make', { number: total }, '. That is', { cents: total }, '.'], `${dimes * 10}¢ + ${pennies}¢ = ${total}¢`, done),
  ];
}

function typedWhy(question: Question): Moment[] {
  const coins = strings(question.facts, 'coins');
  return typedMoments(coins.filter((coin) => coin === 'dime').length, coins.filter((coin) => coin === 'penny').length);
}

function dimesAndPenniesPart2(): Lesson {
  const count = (f: Record<string, unknown>, name: string): number => strings(f, 'coins').filter((coin) => coin === name).length;
  const worked = typedMoments(3, 6);
  const start = moneyScene(3, 6);
  const done = last(worked, start);
  const six = moneyScene(2, 4);
  const sixCoins = alter(six, (piece) => (piece.look.kind === 'visual' ? { ...piece, lit: true } : piece));
  const one = turnQuestion('M-1-C11', 3, (f) => [4, 5, 6].includes(count(f, 'dime')) && count(f, 'penny') >= 2 && count(f, 'penny') <= 5);
  const two = turnQuestion('M-1-C11', 3, (f) => count(f, 'dime') >= 3 && count(f, 'dime') !== count(one.facts, 'dime') && count(f, 'penny') >= 7 && !(count(f, 'dime') === 3 && count(f, 'penny') === 6));
  return {
    parts: [
      show(moment(['You know how to count dimes by tens, and pennies by ones. Now you will type the answer yourself.'], 'Now you type the answer.', start)),
      ...worked.map(show),
      show(moment(['The dimes tell you the tens. The pennies tell you the ones.'], '3 tens and 6 ones: 36', set(calm(done), ['tens', 'ones'], { lit: true }))),
      show(moment(['To type', { number: 36 }, ', tap', { number: 3 }, 'first, and then', { number: 6 }, '.'], 'Type 3, then 6.', set(calm(done), ['total'], { lit: true }))),
      turn(one, typedWhy(one)),
      show(moment(['Careful. Here are', { number: 6 }, 'coins. But that is not', { cents: 6 }, '. Each dime is worth', { cents: 10 }, '.'], '6 coins is not 6¢.', sixCoins)),
      show(moment([{ number: 2 }, 'dimes, and', { number: 4 }, 'pennies, make', { cents: 24 }, '. The dimes come first, so it is not', { number: 42 }, '.'], '2 dimes and 4 pennies: 24¢, not 42¢', set(six, ['tens', 'ones', 'total'], { gone: false, lit: true }))),
      turn(two, typedWhy(two)),
      show(moment(['Dimes are the tens. Pennies are the ones.'], 'Dimes: tens. Pennies: ones.', calm(done))),
    ],
  };
}

// ---- M-1-C12 part 2: clues told only in words, "shorter than" too, tallest or shortest (level 3) ----

const TOWER_UNIT = 0.45;
const TOWER_BASE = 5.1;
const TOWER_X: Record<'tall' | 'middle' | 'short', number> = { tall: 3.2, middle: 4.75, short: 6.3 };
const TOWER_UNITS: Record<'tall' | 'middle' | 'short', number> = { tall: 7, middle: 5, short: 3 };
const TOWER_W = round((24 / 22) * TOWER_UNIT);

function towerPieces(color: string, rank: 'tall' | 'middle' | 'short'): Piece[] {
  const h = round(((TOWER_UNITS[rank] * 22 + 4) / 22) * TOWER_UNIT);
  return [
    { id: `t-${color}`, look: picture({ kind: 'bar', length: TOWER_UNITS[rank], color, orientation: 'vertical' }), x: TOWER_X[rank], y: round(TOWER_BASE - h), w: TOWER_W, h, gone: true },
    { id: `n-${color}`, look: text(color), x: round(TOWER_X[rank] + TOWER_W / 2 - 0.75), y: 5.2, w: 1.5, h: 0.5, gone: true },
  ];
}

// Draw each clue as it is read (a "shorter than" clue is turned around first), then line the towers up and read
// what the question asks for.
function wordClueMoments(pairs: readonly [string, string][], turned: readonly boolean[], ask: 'most' | 'least'): Moment[] {
  const bigs = pairs.map(([big]) => big);
  const smalls = pairs.map(([, small]) => small);
  const tall = bigs.find((color) => !smalls.includes(color)) ?? '';
  const short = smalls.find((color) => !bigs.includes(color)) ?? '';
  const middle = bigs.find((color) => smalls.includes(color)) ?? '';
  const [p1, p2] = pairs as [[string, string], [string, string]];
  const card = ([big, small]: [string, string], isTurned: boolean): string => (isTurned ? `${small} is shorter than ${big}` : `${big} is taller than ${small}`);
  const base = scene([
    { id: 'c1', look: text(card(p1, turned[0] === true)), x: 0.2, y: 0.2, w: 4.7, h: 0.6 },
    { id: 'c2', look: text(card(p2, turned[1] === true)), x: 5.1, y: 0.2, w: 4.7, h: 0.6 },
    ...towerPieces(tall, 'tall'),
    ...towerPieces(middle, 'middle'),
    ...towerPieces(short, 'short'),
  ]);
  const both = (colors: readonly string[]): string[] => colors.flatMap((color) => [`t-${color}`, `n-${color}`]);
  const clue = (name: string, [big, small]: [string, string], isTurned: boolean): Say =>
    isTurned ? [`Clue ${name}. The ${small} tower is shorter than the ${big} tower. Turn it around: the ${big} tower is taller.`] : [`Clue ${name}. The ${big} tower is taller than the ${small} tower.`];
  const first = set(set(set(base, ['c2'], { dim: true }), ['c1'], { lit: true }), both(p1), { gone: false, lit: true });
  const second = set(set(set(calm(first), ['c1'], { dim: true }), ['c2'], { dim: undefined, lit: true }), both(p2), { gone: false, lit: true });
  const lined = set(calm(second), ['c1'], { dim: undefined });
  const ends = set(set(lined, [`t-${tall}`], { badge: 'tallest' }), [`t-${short}`], { badge: 'shortest' });
  const answer = ask === 'most' ? tall : short;
  const word = ask === 'most' ? 'tallest' : 'shortest';
  return [
    moment(clue('one', p1, turned[0] === true), `${p1[0]} is taller than ${p1[1]}.`, first),
    moment(clue('two', p2, turned[1] === true), `${p2[0]} is taller than ${p2[1]}.`, second),
    moment([`The ${middle} tower is in both clues, so it stands in the middle.`], `${middle} is in the middle.`, set(lined, both([middle]), { lit: true })),
    moment([`From tallest to shortest: ${tall}, ${middle}, ${short}.`], `${tall}, ${middle}, ${short}`, ends),
    moment([`The question asks for the ${word} tower. That is the ${answer} tower.`], `The ${answer} tower is the ${word}.`, set(ends, both([answer]), { lit: true })),
  ];
}

function wordClueWhy(question: Question): Moment[] {
  const pairs = question.facts.pairs as [string, string][];
  // A clue was said the other way round when the question's own words say "shorter than" for it.
  const turned = pairs.map(([big, small]) => question.prompt.text.includes(`The ${small} tower is shorter than the ${big} tower.`));
  return wordClueMoments(pairs, turned, question.facts.ask === 'least' ? 'least' : 'most');
}

function tallerThanPart2(): Lesson {
  const pairs: [string, string][] = [['red', 'yellow'], ['yellow', 'blue']];
  const worked = wordClueMoments(pairs, [true, false], 'least');
  const start = worked[0]?.scene ?? scene([]);
  const cards = alter(start, (piece) => (piece.id === 'c1' || piece.id === 'c2' ? { ...piece, dim: undefined, lit: true } : { ...piece, gone: true }));
  const done = calm(last(worked, start));
  const one = turnQuestion('M-1-C12', 3, (f) => f.ask === 'most');
  const two = turnQuestion('M-1-C12', 3, (f) => f.ask === 'least' && JSON.stringify(f.pairs) !== JSON.stringify(one.facts.pairs));
  return {
    parts: [
      show(moment(['You know how to line up three towers from two clues. Now the clues are only words, with no picture.'], 'Clues in words only', cards)),
      show(moment(['So we draw the picture ourselves, one clue at a time.'], 'Draw one clue at a time.', calm(cards))),
      ...worked.map(show),
      show(moment(['Shorter than is the same clue as taller than, turned around.'], 'Shorter than: turn it around.', set(done, ['c1'], { lit: true }))),
      turn(one, wordClueWhy(one)),
      show(moment(['Read the last question slowly. The tallest and the shortest are at opposite ends of the line.'], 'Tallest or shortest? Read slowly.', set(set(done, ['t-red'], { lit: true, badge: 'tallest' }), ['t-blue'], { lit: true, badge: 'shortest' }))),
      turn(two, wordClueWhy(two)),
      show(moment(['Draw each clue, line the towers up, then read what is asked.'], 'Draw, line up, read the question.', done)),
    ],
  };
}

// ---- M-1-D1 part 2: which shape shows halves, or fourths (level 3) ----

type Whole = 'circle' | 'rectangle';
const PART_NAME: Record<number, string> = { 2: 'halves', 4: 'fourths' };
const cut = (whole: Whole, parts: number, equal: boolean): Visual => ({ kind: 'fraction', shape: whole, parts, shaded: 0, equal });

// Three cut shapes in a row, each with a note under it (hidden until it is checked).
function sharesScene(whole: Whole, visuals: readonly Visual[], notes: readonly string[]): Scene {
  const size = whole === 'circle' ? { w: 2.4, h: 2.4, x: 0.6, y: 1 } : { w: 2.8, h: 1.9, x: 0.4, y: 1.3 };
  return scene(
    visuals.flatMap((visual, i): Piece[] => [
      { id: `o${i}`, look: picture(visual), x: size.x + i * 3.2, y: size.y, w: size.w, h: size.h },
      { id: `l${i}`, look: text(notes[i] ?? ''), x: 0.1 + i * 3.2, y: 4, w: 3.3, h: 0.55, gone: true },
    ]),
  );
}

// Check each shape for two things: how many parts, and whether they are equal. The right one is checked last.
function nameMoments(whole: Whole, parts: number, visuals: readonly Visual[], codes: readonly string[], unequalParts: number): Moment[] {
  const name = PART_NAME[parts] ?? 'halves';
  const other = parts === 2 ? 4 : 2;
  const otherName = PART_NAME[other] ?? 'fourths';
  const notes = codes.map((code) => (code === 'unequal' ? `${unequalParts} parts, not equal` : `${code === name ? parts : other} equal parts`));
  const base = sharesScene(whole, visuals, notes);
  const right = codes.indexOf(name);
  const out: Moment[] = [moment([`${parts === 2 ? 'Halves are two' : 'Fourths are four'} equal parts. So check two things: how many parts, and are they equal?`], `${name}: ${parts} equal parts`, base)];
  let now = base;
  const look = (i: number): Scene => set(alter(calm(now), (piece) => (piece.lit ? { ...piece, dim: true } : piece)), [`o${i}`, `l${i}`], { gone: false, lit: true });
  codes.forEach((code, i) => {
    if (i === right) return;
    // The shape just checked fades back as the next one is looked at.
    now = look(i);
    const say: Say =
      code === 'unequal'
        ? unequalParts === parts
          ? ['This shape has', { number: parts }, `parts. But they are not the same size. So it does not show ${name}.`]
          : ['This shape has', { number: unequalParts }, `parts, and they are not the same size. It does not show ${name}.`]
        : ['This shape has', { number: other }, `equal parts. Those are ${otherName}, not ${name}.`];
    out.push(moment(say, notes[i] ?? '', now));
  });
  now = look(right);
  out.push(moment(['This shape has', { number: parts }, `parts, ${parts === 2 ? 'both' : 'all'} the same size. It shows ${name}.`], `${parts} equal parts: ${name}`, now));
  return out;
}

function nameWhy(question: Question): Moment[] {
  if (question.type !== 'choice') throw new Error('M-1-D1 is a choice question');
  return nameMoments(question.facts.shape === 'circle' ? 'circle' : 'rectangle', num(question.facts, 'parts'), question.options, strings(question.facts, 'options'), num(question.facts, 'unequalParts'));
}

function halvesAndFourthsPart2(): Lesson {
  const codes = ['halves', 'unequal', 'fourths'];
  const worked = nameMoments('circle', 4, [cut('circle', 2, true), cut('circle', 4, false), cut('circle', 4, true)], codes, 4);
  const start = worked[0]?.scene ?? scene([]);
  const done = last(worked, start);
  const fours = set(alter(calm(done), (piece) => ({ ...piece, dim: piece.id === 'o0' || piece.id === 'l0' ? true : undefined })), ['o1', 'o2'], { lit: true });
  const halves = scene([
    { id: 'h0', look: picture(cut('rectangle', 2, false)), x: 1, y: 1.3, w: 2.8, h: 1.9 },
    { id: 'h1', look: picture(cut('rectangle', 2, true)), x: 6.2, y: 1.3, w: 2.8, h: 1.9 },
    { id: 'n0', look: text('2 parts, not equal'), x: 0.7, y: 3.8, w: 3.4, h: 0.55 },
    { id: 'n1', look: text('2 equal parts: halves'), x: 5.7, y: 3.8, w: 3.8, h: 0.55 },
  ]);
  const one = turnQuestion('M-1-D1', 3, (f) => num(f, 'parts') === 4 && f.shape === 'rectangle');
  const two = turnQuestion('M-1-D1', 3, (f) => num(f, 'parts') === 2 && f.shape === 'circle');
  return {
    parts: [
      show(moment(['You know that halves are two equal parts. Now let us find fourths too.'], 'Halves, and now fourths', calm(start))),
      ...worked.map(show),
      show(moment(['Both of these have four parts. But only equal parts make fourths.'], '4 parts is not enough. They must be equal.', fours)),
      turn(one, nameWhy(one)),
      show(moment(['Halves work the same way. Two parts, and both the same size.'], 'Halves: 2 parts, both the same size', set(set(halves, ['h0', 'n0'], { dim: true }), ['h1', 'n1'], { lit: true }))),
      turn(two, nameWhy(two)),
      show(moment(['Count the parts. Then check that they are equal.'], 'Count the parts. Are they equal?', calm(done))),
    ],
  };
}

// ---- M-1-D3 part 2: a piece in the tray that does not fit (level 3) ----

const FIGURE = { x: 0.6, y: 0.7, size: 4.4 };
const FIGURE_SCALE = FIGURE.size / 124; // stage squares for each unit of the figure's drawing
const centre = (points: readonly Point[]): Point => [points.reduce((sum, [x]) => sum + x, 0) / points.length, points.reduce((sum, [, y]) => sum + y, 0) / points.length];

// Where the middle of each piece is on the stage when the figure is drawn with its pieces pulled apart
// (as FigureVisual draws it: a 124 by 124 box starting at -12, each piece moved 0.18 of the way out from the middle).
function pieceSpots(id: FigureId): { x: number; y: number }[] {
  const figure = FIGURES[id];
  const middle = centre(figure.outline);
  return figure.slots.map((slot) => {
    const [cx, cy] = centre(slot);
    const x = cx + (cx - middle[0]) * 0.18;
    const y = cy + (cy - middle[1]) * 0.18;
    return { x: FIGURE.x + (x + 12) * FIGURE_SCALE, y: FIGURE.y + (y + 12) * FIGURE_SCALE };
  });
}

// The tray's piece that does not fit, for the figures whose odd piece the shape picture can draw: its look, how wide
// its picture is on the stage (so it is drawn to the figure's scale), and why it does not fit.
interface Odd {
  look: PieceLook;
  w: number;
  reason: string;
}
const oddShape = (shape: 'square' | 'triangle' | 'trapezoid', rotation: number): PieceLook => picture({ kind: 'shape', shape, color: 'orange', size: 'm', rotation });
const ODD: Partial<Record<FigureId, Odd>> = {
  // A square 30 units wide, drawn 72 wide in the shape picture's 100.
  'rect-2sq': { look: oddShape('square', 0), w: (30 * 100) / 72, reason: 'It is a square, but it is too small. It leaves a gap.' },
  'square-4sq': { look: oddShape('square', 0), w: (30 * 100) / 72, reason: 'It is a square, but it is too small. It leaves a gap.' },
  // A triangle with three equal sides of 60 units, drawn about 80 wide.
  'square-2tri': { look: oddShape('triangle', 0), w: (60 * 100) / 79.7, reason: 'It is a triangle, but its corners do not fit the corners of the square.' },
  'square-4tri': { look: oddShape('triangle', 0), w: (60 * 100) / 79.7, reason: 'It is a triangle, but its corners do not fit the corners of the square.' },
  // A trapezoid 70 units wide with its long side on top, drawn 88 wide.
  'hex-2trap': { look: oddShape('trapezoid', 180), w: (70 * 100) / 88, reason: 'It is a trapezoid, but it is too small. It leaves a gap.' },
};

// Try the piece that does not fit, put it back, then fill the shape with the pieces that fit and count only those.
function oddMoments(id: FigureId): Moment[] {
  const figure = FIGURES[id];
  const same = figure.whole === figure.piece;
  const whole = same ? `big ${figure.whole}` : figure.whole;
  const pieces = same ? `small ${figure.piece}s` : `${figure.piece}s`;
  const count = figure.slots.length;
  const odd = ODD[id];
  const size = odd ? round(odd.w * FIGURE_SCALE) : 1;
  const tray = { x: round(7.6 - size / 2), y: round(2.4 - size / 2) };
  const look = (shown: 'whole' | 'cut' | 'pieces'): PieceLook => picture({ kind: 'figure', figure: id, show: shown });
  const base = scene([
    { id: 'f', look: look('whole'), x: FIGURE.x, y: FIGURE.y, w: FIGURE.size, h: FIGURE.size },
    { id: 'tray', look: text('tray'), x: 6.6, y: 0.3, w: 2, h: 0.5 },
    ...(odd ? [{ id: 'odd', look: odd.look, x: tray.x, y: tray.y, w: size, h: size } satisfies Piece] : []),
    { id: 'n', look: numeral(1), x: 6.9, y: 3.6, w: 1.4, h: 1.4, gone: true },
    { id: 'l', look: text(`${figure.piece}s`), x: 6.1, y: 5.1, w: 3, h: 0.6, gone: true },
  ]);
  const become = (from: Scene, shown: 'whole' | 'cut' | 'pieces'): Scene => alter(from, (piece) => (piece.id === 'f' ? { ...piece, look: look(shown) } : piece));
  const out: Moment[] = [];
  let apart: Scene;
  if (odd) {
    const tried = set(base, ['odd'], { x: round(FIGURE.x + FIGURE.size / 2 - size / 2), y: round(FIGURE.y + FIGURE.size / 2 - size / 2), lit: true });
    const back = set(set(become(base, 'cut'), ['odd'], { crossed: true, dim: true }), ['f'], { lit: true });
    out.push(moment([`Here is a ${whole}. Try this ${figure.piece} from the tray. Does it fit?`], `Does this ${figure.piece} fit?`, set(base, ['odd'], { lit: true })));
    out.push(moment([odd.reason], 'It does not fit.', tried));
    out.push(moment(['So leave it in the tray. Use only the pieces that fit, with no gaps.'], 'Use only the pieces that fit.', back));
    apart = set(set(become(base, 'pieces'), ['odd'], { crossed: true, dim: true }), ['l'], { gone: false });
  } else {
    out.push(moment([`Here is a ${whole}. One ${figure.piece} in the tray has the wrong shape, so leave it there.`], 'One piece does not fit.', base));
    out.push(moment(['Use only the pieces that fit, with no gaps.'], 'Use only the pieces that fit.', set(become(base, 'cut'), ['f'], { lit: true })));
    apart = set(become(base, 'pieces'), ['l'], { gone: false });
  }
  pieceSpots(id).forEach((spot, i) => {
    const counted = alter(apart, (piece) => (piece.id === 'n' ? { ...piece, look: numeral(i + 1), gone: false, lit: true } : piece));
    out.push(moment([{ number: i + 1 }], String(i + 1), handAt(counted, spot.x, spot.y + 0.1)));
  });
  const done = alter(set(become(apart, 'cut'), ['f', 'n', 'l'], { gone: false, lit: true }), (piece) => (piece.id === 'n' ? { ...piece, look: numeral(count) } : piece));
  out.push(moment([{ number: count }, `${pieces} fill the ${whole}. The piece that does not fit is not counted.`], `${count} ${pieces} fill the ${whole}.`, done));
  return out;
}

function oddWhy(question: Question): Moment[] {
  if (question.type !== 'fillShape') throw new Error('M-1-D3 is a fill-the-shape question');
  return oddMoments(question.figure);
}

function howManyPiecesPart2(): Lesson {
  const worked = oddMoments('rect-2sq');
  const start = worked[0]?.scene ?? scene([]);
  const done = calm(last(worked, start));
  const one = turnQuestion('M-1-D3', 3, (f) => f.makes === 'square');
  const two = turnQuestion('M-1-D3', 3, (f) => f.piece === 'trapezoid');
  return {
    parts: [
      show(moment(['You know how to fill a shape and count the pieces. Now the tray hides a piece that does not fit.'], 'One piece in the tray does not fit.', calm(start))),
      ...worked.map(show),
      show(moment(['A piece can have the right name, and still not fit. Only pieces that fill their spot count.'], 'Right name, wrong fit: do not count it.', set(done, ['odd'], { lit: true }))),
      turn(one, oddWhy(one)),
      show(moment(['The tray may also have pieces left over. Count only the pieces inside the shape.'], 'Count only the pieces inside the shape.', set(done, ['f', 'n'], { lit: true }))),
      turn(two, oddWhy(two)),
      show(moment(['Fill the shape with pieces that fit. Then count the ones inside.'], 'Fill it, then count the ones inside.', done)),
    ],
  };
}

// ---- M-1-E1 part 2: patterns that go down, with the answer typed (level 3) ----

// Four numbers and a box for the next one, with the jump back shown between each pair (hidden until shown).
function downScene(start: number, back: number): Scene {
  const shown = [0, 1, 2, 3].map((i): Piece => ({ id: `n${i}`, look: numeral(start - back * i), x: 0.3 + i * 2, y: 2.2, w: 1.5, h: 1.2 }));
  const jumps = [0, 1, 2, 3].map((i): Piece => ({ id: `j${i}`, look: text(`−${back}`), x: 1.2 + i * 2, y: 0.9, w: 1.2, h: 0.8, gone: true }));
  return scene([...shown, { id: 'box', look: { kind: 'box' }, x: 8.3, y: 2.1, w: 1.4, h: 1.4 }, ...jumps]);
}

// The numbers get smaller: find how much each jump takes away, then take it away once more.
function downMoments(start: number, back: number): { smaller: Moment; jump: Moment; every: Moment; again: Moment; next: Moment } {
  const values = [0, 1, 2, 3].map((i) => start - back * i);
  const [a, b] = values as [number, number];
  const end = values[3] as number;
  const answer = end - back;
  const begin = downScene(start, back);
  const firstJump = set(set(begin, ['n0', 'n1'], { lit: true }), ['j0'], { gone: false, lit: true });
  const how: Say =
    back <= 2
      ? ['Count back from', { number: a }, ':', ...Array.from({ length: back }, (_, i) => ({ number: a - i - 1 })), '. That is a jump back of', { number: back }, '.']
      : back === 10
        ? ['From', { number: a }, 'to', { number: b }, ', the tens go down by one. That is', { number: 10 }, 'less.']
        : ['From', { number: a }, 'to', { number: b }, 'is', { number: back }, 'less.'];
  const allJumps = set(calm(firstJump), ['j0', 'j1', 'j2'], { gone: false, lit: true });
  const lastJump = set(set(calm(allJumps), ['n3', 'box'], { lit: true }), ['j3'], { gone: false, lit: true });
  const filled = alter(lastJump, (piece) => (piece.id === 'box' ? { ...piece, look: numeral(answer), lit: true } : piece));
  return {
    smaller: moment(['Look at the numbers. They get smaller each time. So this pattern counts back.'], 'The numbers get smaller.', set(begin, ['n0', 'n1', 'n2', 'n3'], { lit: true })),
    jump: moment(how, `${a} to ${b} is −${back}.`, firstJump),
    every: moment(['Every jump takes away', { number: back }, '.'], `Every jump is −${back}.`, allJumps),
    again: moment(['Take away', { number: back }, 'once more, from', { number: end }, '.'], `${end} − ${back}`, lastJump),
    next: moment([{ number: end }, 'minus', { number: back }, 'is', { number: answer }, '. Next is', { number: answer }, '.'], `${end} − ${back} = ${answer}`, filled),
  };
}

function downWhy(question: Question): Moment[] {
  const steps = downMoments(num(question.facts, 'start'), -num(question.facts, 'step'));
  return [steps.smaller, steps.jump, steps.every, steps.again, steps.next];
}

function numberPatternsPart2(): Lesson {
  const worked = downMoments(31, 2);
  const tens = downMoments(84, 10);
  const one = turnQuestion('M-1-E1', 3, (f) => num(f, 'step') === -2 && num(f, 'start') !== 31);
  const two = turnQuestion('M-1-E1', 3, (f) => num(f, 'step') === -10 && num(f, 'start') !== 84);
  return {
    parts: [
      show(moment(['You know patterns that jump up. Now the numbers go down.'], 'Patterns that go down', calm(worked.smaller.scene))),
      show(worked.smaller),
      show(worked.jump),
      show(worked.every),
      show(worked.again),
      show(worked.next),
      show(moment(['When the numbers get smaller, each jump takes away. Find how much, then take it away once more.'], 'Find the jump back. Do it again.', calm(worked.next.scene))),
      show(moment(['Now you type the answer. There are no choices, so work it out first.'], 'Work it out, then type it.', set(calm(worked.next.scene), ['box'], { lit: true }))),
      turn(one, downWhy(one)),
      show(moment(['A jump back can be bigger. Look at these numbers.'], 'A bigger jump back', calm(tens.smaller.scene))),
      show(tens.jump),
      show(tens.again),
      show(tens.next),
      turn(two, downWhy(two)),
      show(moment(['Going down, find what each jump takes away. It can be one, two, five or ten.'], 'Find what each jump takes away.', calm(tens.next.scene))),
    ],
  };
}

export const LESSONS: Readonly<Record<string, () => Lesson>> = {
  'M-1-C1': tellTimePart2,
  'M-1-C2': orderByLengthPart2,
  'M-1-C6': matchClocksPart2,
  'M-1-C10': sortThreePart2,
  'M-1-C11': dimesAndPenniesPart2,
  'M-1-C12': tallerThanPart2,
  'M-1-D1': halvesAndFourthsPart2,
  'M-1-D3': howManyPiecesPart2,
  'M-1-E1': numberPatternsPart2,
};
