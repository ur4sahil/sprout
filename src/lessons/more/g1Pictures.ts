import { FIGURES } from '../../engine/figures';
import type { FigureId, Point } from '../../engine/figures';
import type { CoinName, Question, Say, ShapeName, SolidName, Visual } from '../../engine/types';
import { alter, calm, moment, num, numeral, picture, pointAt, scene, set, str, text, turnQuestion, withoutHand } from '../build';
import type { Lesson, LessonPart, Moment, Piece, PieceLook, Scene } from '../types';

// Lessons that teach (plan section 16) whose scenes use the questions' own pictures (the `picture` piece):
// Grade 1 clocks, coins, bars, shapes made of pieces, and solid shapes.

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

// The pointing hand under a piece.
function point(from: Scene, id: string): Scene {
  const target = from.pieces.find((piece) => piece.id === id);
  return target ? handAt(from, target.x + (target.w ?? 1) / 2, target.y + (target.h ?? 1)) : from;
}

// ---- Clocks (M-1-C1, M-1-C6) ----

interface Time {
  hour: number;
  minute: number;
}
const written = (time: Time): string => `${time.hour}:${String(time.minute).padStart(2, '0')}`;
const nextHour = (hour: number): number => (hour % 12) + 1;
const clockVisual = (time: Time): Visual => ({ kind: 'clock', hour: time.hour, minute: time.minute });
const readTime = (value: string): Time => {
  const [hour, minute] = value.split(':').map(Number);
  return { hour: hour ?? 12, minute: minute ?? 0 };
};

// ---- M-1-C1 Tell time: hour and half hour ----

const FACE = { x: 0.5, y: 0.5, size: 4.4 };
// Where a number sits on the clock face, in stage squares (the face is drawn in a 100 by 100 box, numbers 35 from the middle).
function onFace(number: number, reach = 35): { x: number; y: number } {
  const angle = (number * 30 * Math.PI) / 180;
  return { x: FACE.x + ((50 + reach * Math.sin(angle)) / 100) * FACE.size, y: FACE.y + ((50 - reach * Math.cos(angle)) / 100) * FACE.size };
}

// The clock, and beside it what each hand says and the time written out (hidden until a moment shows them).
function clockScene(time: Time): Scene {
  return scene([
    { id: 'c', look: picture(clockVisual(time)), x: FACE.x, y: FACE.y, w: FACE.size, h: FACE.size },
    { id: 'll', look: text('long hand'), x: 5.2, y: 0.7, w: 2.6, h: 0.6, gone: true },
    { id: 'ln', look: numeral(time.minute === 0 ? 12 : 6), x: 8.1, y: 0.5, w: 1.3, h: 1, gone: true },
    { id: 'sl', look: text('short hand'), x: 5.2, y: 2, w: 2.6, h: 0.6, gone: true },
    { id: 'sn', look: numeral(time.hour), x: 8.1, y: 1.8, w: 1.3, h: 1, gone: true },
    { id: 't', look: text(written(time)), x: 5.6, y: 3.3, w: 3.4, h: 1.2, gone: true },
  ]);
}

// Read a clock: the long hand first (o'clock or half past), then the short hand (the hour), then say the time.
function readMoments(time: Time): Moment[] {
  const base = clockScene(time);
  const longAt = onFace(time.minute === 0 ? 12 : 6);
  const shortAt = onFace(time.hour);
  const long = handAt(set(base, ['ll', 'ln'], { gone: false, lit: true }), longAt.x, longAt.y + 0.3);
  const short = handAt(set(calm(long), ['sl', 'sn'], { gone: false, lit: true }), shortAt.x, shortAt.y + 0.3);
  const done = set(withoutHand(calm(short)), ['c', 't'], { gone: false, lit: true });
  const said = moment(['So the time is', { time }, '.'], written(time), done);
  if (time.minute === 0) {
    return [
      moment(['Find the long hand. It points straight up, to', { number: 12 }, '.'], 'Long hand: on 12', long),
      moment(['The short hand points to', { number: time.hour }, '. That is the hour.'], `Short hand: on ${time.hour}`, short),
      said,
    ];
  }
  return [
    moment(['Find the long hand. It points straight down, to', { number: 6 }, '. That means half past.'], 'Long hand: on 6', long),
    moment(['The short hand is halfway between', { number: time.hour }, 'and', { number: nextHour(time.hour) }, '. It has gone past', { number: time.hour }, '.'], `Short hand: just past ${time.hour}`, short),
    said,
  ];
}

function tellTimeLesson(): Lesson {
  const three: Time = { hour: 3, minute: 0 };
  const start = clockScene(three);
  const hands = set(start, ['ll', 'sl'], { gone: false, lit: true });
  const shortTip = onFace(3, 12);
  const hour = readMoments(three);
  const half = readMoments({ hour: 7, minute: 30 });
  const one = turnQuestion('M-1-C1', 1, (f) => num(f, 'hour') !== 3);
  const two = turnQuestion('M-1-C1', 2, (f) => num(f, 'hour') !== 7);
  return {
    parts: [
      show(moment(['Let us learn to tell the time on a clock.'], 'Telling the time', start)),
      show(moment(['A clock has two hands. One is short, and one is long.'], 'Two hands: short and long', hands)),
      show(moment(['The short hand shows the hour. The long hand shows the minutes.'], 'Short hand: the hour', handAt(set(hands, ['ll'], { lit: undefined }), shortTip.x, shortTip.y + 0.2))),
      ...hour.map(show),
      show(moment(['When the long hand is on', { number: 12 }, ', say the hour, and then, o\'clock.'], "Long hand on 12: o'clock", calm(last(hour, start)))),
      turn(one, readMoments({ hour: num(one.facts, 'hour'), minute: num(one.facts, 'minute') })),
      show(moment(['Now the long hand has gone halfway around the clock.'], 'Halfway around', clockScene({ hour: 7, minute: 30 }))),
      ...half.map(show),
      turn(two, readMoments({ hour: num(two.facts, 'hour'), minute: num(two.facts, 'minute') })),
      show(moment(['The short hand tells the hour. Long hand up is o\'clock. Long hand down is half past.'], "Up: o'clock. Down: half past.", calm(last(half, start)))),
    ],
  };
}

// ---- M-1-C6 Match clocks to times ----

const CLOCK_STEP = 3.2;

// Three clocks along the top, and the written times on cards in a row at the bottom (in the cards' own order).
function matchScene(clocks: readonly Visual[], cards: readonly Time[]): Scene {
  return scene([
    ...clocks.map((visual, i): Piece => ({ id: `k${i}`, look: picture(visual), x: 0.4 + i * CLOCK_STEP, y: 0.1, w: 2.8, h: 2.8 })),
    ...cards.map((time, j): Piece => ({ id: `d${j}`, look: text(written(time)), x: 0.7 + j * CLOCK_STEP, y: 4.8, w: 2.2, h: 0.8 })),
  ]);
}

// A card glides up to sit under its clock.
const paired = (from: Scene, clock: number, card: number): Scene => set(calm(from), [`d${card}`], { x: 0.7 + clock * CLOCK_STEP, y: 3.05, lit: true });

// Read one clock, then bring its card to it.
function matchOne(from: Scene, time: Time, clock: number, card: number): Moment[] {
  const looked = set(calm(from), [`k${clock}`], { lit: true });
  const read: Say =
    time.minute === 0
      ? ['Look at this clock. The long hand is on', { number: 12 }, ', and the short hand is on', { number: time.hour }, '.']
      : ['Look at this clock. The long hand is on', { number: 6 }, ', and the short hand is just past', { number: time.hour }, '.'];
  return [
    moment(read, time.minute === 0 ? `Long hand on 12, short hand on ${time.hour}` : `Long hand on 6, short hand past ${time.hour}`, looked),
    moment(['That is', { time }, '. So this card goes with it.'], written(time), set(paired(looked, clock, card), [`k${clock}`], { lit: true })),
  ];
}

function matchWhy(question: Question): Moment[] {
  if (question.type !== 'match') throw new Error('M-1-C6 is a match question');
  const times = strings(question.facts, 'leftValues').map(readTime);
  const cards = strings(question.facts, 'rightValues').map(readTime);
  let now = matchScene(question.left, cards);
  const out: Moment[] = [moment(['Read each clock. Then find the card with the same time.'], 'Read each clock.', now)];
  question.answerPairs.forEach(([clock, card]) => {
    const steps = matchOne(now, times[clock] as Time, clock, card);
    out.push(...steps);
    now = last(steps, now);
  });
  return out;
}

function matchClocksLesson(): Lesson {
  const times: Time[] = [{ hour: 2, minute: 0 }, { hour: 9, minute: 0 }, { hour: 5, minute: 0 }];
  const cards: Time[] = [times[2] as Time, times[0] as Time, times[1] as Time];
  const start = matchScene(times.map(clockVisual), cards);
  const first = matchOne(start, times[0] as Time, 0, 1);
  const second = matchOne(last(first, start), times[1] as Time, 1, 2);
  const third = set(paired(last(second, start), 2, 0), ['k2'], { lit: true });
  const halves: Time[] = [{ hour: 4, minute: 0 }, { hour: 4, minute: 30 }, { hour: 8, minute: 30 }];
  const halfCards: Time[] = [halves[1] as Time, halves[2] as Time, halves[0] as Time];
  const again = matchScene(halves.map(clockVisual), halfCards);
  const near = set(again, ['k0', 'k1'], { lit: true });
  const down = set(paired(again, 1, 0), ['k1'], { lit: true });
  const one = turnQuestion('M-1-C6', 1);
  const two = turnQuestion('M-1-C6', 2);
  return {
    parts: [
      show(moment(['A clock and a written time can show the same time. Let us match them.'], 'Match each clock to its time.', start)),
      show(moment(['In a written time, the first number is the hour.'], 'The first number is the hour.', set(start, ['d0', 'd1', 'd2'], { lit: true }))),
      ...first.map(show),
      ...second.map(show),
      show(moment(['One card is left. This clock shows', { time: times[2] as Time }, ', so the card fits.'], written(times[2] as Time), third)),
      turn(one, matchWhy(one)),
      show(moment(['Now look. On two of these clocks, the short hand is near', { number: 4 }, '.'], 'Two clocks near 4', near)),
      show(moment(['This long hand points down, to', { number: 6 }, '. That is', { time: halves[1] as Time }, '.'], written(halves[1] as Time), down)),
      show(moment(['So check both hands, every time.'], 'Check both hands.', calm(down))),
      turn(two, matchWhy(two)),
      show(moment(['Short hand for the hour. Long hand up for o\'clock, and down for half past.'], "Up: o'clock. Down: half past.", calm(down))),
    ],
  };
}

// ---- Coins (M-1-C4, M-1-C11) ----

const COINS: readonly CoinName[] = ['penny', 'nickel', 'dime', 'quarter'];
const CENTS: Record<CoinName, number> = { penny: 1, nickel: 5, dime: 10, quarter: 25 };
// Each coin's width on the stage, in its true size beside the others.
const COIN_SIZE: Record<CoinName, number> = { penny: 1.5, nickel: 1.66, dime: 1.4, quarter: 1.9 };
const LOOKS: Record<CoinName, string> = {
  penny: 'It is the only brown coin.',
  nickel: 'It is silver, with a smooth edge.',
  dime: 'It is silver, and it is the smallest coin.',
  quarter: 'It is silver, and it is the biggest coin.',
};
const coinVisual = (name: CoinName): Visual => ({ kind: 'coins', coins: [name] });
const isCoin = (value: string): value is CoinName => value in CENTS;
const coinOf = (value: string): CoinName => {
  if (!isCoin(value)) throw new Error(`${value} is not a coin`);
  return value;
};

// ---- M-1-C4 Coins ----

// The four coins in a row, each with its name, and its value hidden until it is taught.
function coinsScene(valuesShown: readonly CoinName[] = []): Scene {
  return scene(
    COINS.flatMap((name, i): Piece[] => {
      const middle = 1.25 + i * 2.5;
      const size = COIN_SIZE[name];
      return [
        { id: `coin-${name}`, look: picture(coinVisual(name)), x: round(middle - size / 2), y: round(1.35 - size / 2), w: size, h: size },
        { id: `name-${name}`, look: text(name), x: middle - 1.1, y: 2.55, w: 2.2, h: 0.6 },
        { id: `worth-${name}`, look: text(`${CENTS[name]}¢`), x: middle - 0.8, y: 3.4, w: 1.6, h: 0.8, gone: !valuesShown.includes(name) },
      ];
    }),
  );
}

// Meet one coin: how to know it, then what it is worth.
function coinMoments(name: CoinName, from: Scene): Moment[] {
  const met = set(calm(from), [`coin-${name}`, `name-${name}`], { lit: true });
  const worth = point(set(calm(met), [`worth-${name}`], { gone: false, lit: true }), `worth-${name}`);
  return [
    moment([`This is a ${name}. ${LOOKS[name]}`], `a ${name}`, met),
    moment([`A ${name} is worth`, { cents: CENTS[name] }, '.'], `${name}: ${CENTS[name]}¢`, worth),
  ];
}

function coinsWhy(question: Question): Moment[] {
  const ask = str(question.facts, 'ask');
  const named = strings(question.facts, 'coins').map(coinOf);
  if (ask === 'worthMore' && question.type === 'choice') {
    // The two coins of the question, as it draws them, each with its value under it.
    const base = scene(
      named.flatMap((name, i): Piece[] => {
        const middle = 2.7 + i * 4.6;
        const size = COIN_SIZE[name] * 1.3;
        return [
          { id: `o${i}`, look: picture(question.options[i] as Visual), x: round(middle - size / 2), y: round(1.5 - size / 2), w: round(size), h: round(size) },
          { id: `n${i}`, look: text(name), x: middle - 1.2, y: 3, w: 2.4, h: 0.6 },
          { id: `v${i}`, look: text(`${CENTS[name]}¢`), x: middle - 0.9, y: 3.8, w: 1.8, h: 0.9, gone: true },
        ];
      }),
    );
    const right = question.answerIndex;
    const other = right === 0 ? 1 : 0;
    const more = named[right] as CoinName;
    const less = named[other] as CoinName;
    const first = set(base, ['o0', 'n0', 'v0'], { gone: false, lit: true });
    const second = set(set(calm(first), ['v0'], { gone: false }), ['o1', 'n1', 'v1'], { gone: false, lit: true });
    return [
      moment(['Think of what each coin is worth.'], 'What is each coin worth?', base),
      moment([`A ${named[0] as CoinName} is worth`, { cents: CENTS[named[0] as CoinName] }, '.'], `${named[0]}: ${CENTS[named[0] as CoinName]}¢`, first),
      moment([`A ${named[1] as CoinName} is worth`, { cents: CENTS[named[1] as CoinName] }, '.'], `${named[1]}: ${CENTS[named[1] as CoinName]}¢`, second),
      moment([{ number: CENTS[more] }, 'is more than', { number: CENTS[less] }, `, so the ${more} is worth more.`], `${CENTS[more]}¢ is more than ${CENTS[less]}¢`, set(calm(second), [`o${right}`, `n${right}`, `v${right}`], { lit: true })),
    ];
  }
  const name = named[0] as CoinName;
  const all = coinsScene(ask === 'value' ? COINS : []);
  const found = set(all, [`coin-${name}`], { lit: true });
  const out: Moment[] = [
    moment([`Look at the coin. ${LOOKS[name]}`], 'Look at its colour and its size.', found),
    moment([`So it is a ${name}.`], `a ${name}`, set(found, [`name-${name}`], { lit: true })),
  ];
  if (ask === 'value') out.push(moment([`A ${name} is worth`, { cents: CENTS[name] }, '.'], `${name}: ${CENTS[name]}¢`, point(set(found, [`name-${name}`, `worth-${name}`], { lit: true }), `worth-${name}`)));
  return out;
}

function coinsLesson(): Lesson {
  const start = coinsScene();
  const penny = coinMoments('penny', start);
  const nickel = coinMoments('nickel', last(penny, start));
  const dime = coinMoments('dime', last(nickel, start));
  const quarter = coinMoments('quarter', last(dime, start));
  const all = calm(withoutHand(last(quarter, start)));
  const pair = ['coin-dime', 'name-dime', 'worth-dime', 'coin-nickel', 'name-nickel', 'worth-nickel'];
  const compare = set(alter(all, (piece) => ({ ...piece, dim: !pair.includes(piece.id) })), pair, { lit: true });
  const one = turnQuestion('M-1-C4', 1, (f) => strings(f, 'coins')[0] === 'dime');
  const two = turnQuestion('M-1-C4', 2, (f) => strings(f, 'coins')[0] === 'quarter');
  const three = turnQuestion('M-1-C4', 3, (f) => strings(f, 'coins').includes('dime') && strings(f, 'coins').includes('penny'));
  return {
    parts: [
      show(moment(['Here are four coins. Let us learn their names, and what each is worth.'], 'Four coins', start)),
      ...penny.map(show),
      ...nickel.map(show),
      ...dime.map(show),
      ...quarter.map(show),
      turn(one, coinsWhy(one)),
      show(moment(['To know a coin, look at its colour, and its size.'], 'Look at colour and size.', all)),
      turn(two, coinsWhy(two)),
      show(moment(['A bigger coin is not always worth more. Look at the dime and the nickel.'], 'Bigger is not always worth more.', compare)),
      show(moment(['The dime is smaller. But', { number: 10 }, 'is more than', { number: 5 }, ', so the dime is worth more.'], '10¢ is more than 5¢', set(compare, ['coin-nickel', 'name-nickel', 'worth-nickel'], { lit: undefined }))),
      turn(three, coinsWhy(three)),
      show(moment(['Know each coin, and think of what it is worth.'], 'Know each coin and its worth.', all)),
    ],
  };
}

// ---- M-1-C11 Count dimes and pennies ----

const SLOT = 1;
const SMALL: Record<'dime' | 'penny', number> = { dime: 0.86, penny: 0.92 };

// Dimes then pennies in one row on the table, the worth of each kind above, and the total (hidden) below.
function moneyScene(dimes: number, pennies: number): Scene {
  const count = dimes + pennies;
  const left = (10 - count * SLOT) / 2;
  const coins = Array.from({ length: count }, (_, i): Piece => {
    const name = i < dimes ? 'dime' : 'penny';
    const size = SMALL[name];
    return { id: `m${i}`, look: picture(coinVisual(name)), x: round(left + i * SLOT + (SLOT - size) / 2), y: round(2.6 - size / 2), w: size, h: size };
  });
  return scene([
    ...coins,
    { id: 'kd', look: text('dime = 10¢'), x: 0.8, y: 0.4, w: 3.8, h: 0.7 },
    { id: 'kp', look: text('penny = 1¢'), x: 5.4, y: 0.4, w: 3.8, h: 0.7, gone: pennies === 0 },
    { id: 'total', look: text(`${dimes * 10 + pennies}¢`), x: 3.5, y: 4.3, w: 3, h: 1.1, gone: true },
  ]);
}

// Count some of the coins aloud, each lit in turn with the total so far above it. `value` gives the total at each coin.
function countCoins(from: Scene, first: number, count: number, value: (index: number) => number): Moment[] {
  let now = from;
  return Array.from({ length: count }, (_, k) => {
    const id = `m${first + k}`;
    const total = value(first + k);
    now = point(alter(now, (piece) => (piece.id === id ? { ...piece, lit: true, badge: String(total) } : piece.badge ? { ...piece, badge: undefined } : piece)), id);
    return moment([{ number: total }], String(total), now);
  });
}

// Dimes by tens, then the pennies counted on by ones, then the total.
function moneyMoments(dimes: number, pennies: number): Moment[] {
  const base = moneyScene(dimes, pennies);
  const total = dimes * 10 + pennies;
  const out: Moment[] = [moment(['A dime is worth', { cents: 10 }, '. So count the dimes by tens.'], 'Count the dimes by tens.', set(base, ['kd'], { lit: true }))];
  out.push(...countCoins(calm(base), 0, dimes, (i) => (i + 1) * 10));
  if (pennies > 0) {
    out.push(moment(['A penny is worth', { cents: 1 }, '. Now count on the pennies, by ones.'], 'Count on the pennies by ones.', set(withoutHand(last(out, base)), ['kp'], { lit: true })));
    out.push(...countCoins(set(last(out, base), ['kp'], { lit: undefined }), dimes, pennies, (i) => dimes * 10 + (i - dimes) + 1));
  }
  const done = set(withoutHand(alter(last(out, base), (piece) => ({ ...piece, badge: undefined }))), ['total'], { gone: false, lit: true });
  out.push(moment(['That is', { cents: total }, '.'], `${total}¢`, done));
  return out;
}

function moneyWhy(question: Question): Moment[] {
  const coins = strings(question.facts, 'coins');
  return moneyMoments(coins.filter((coin) => coin === 'dime').length, coins.filter((coin) => coin === 'penny').length);
}

function dimesAndPenniesLesson(): Lesson {
  const count = (f: Record<string, unknown>, name: string): number => strings(f, 'coins').filter((coin) => coin === name).length;
  const dimes = moneyMoments(3, 0);
  const mixed = moneyMoments(2, 3);
  const one = turnQuestion('M-1-C11', 1, (f) => count(f, 'dime') >= 2 && count(f, 'dime') <= 5 && count(f, 'dime') !== 3);
  const two = turnQuestion('M-1-C11', 2, (f) => count(f, 'dime') <= 4 && count(f, 'penny') >= 2 && count(f, 'penny') <= 4 && !(count(f, 'dime') === 2 && count(f, 'penny') === 3));
  const start = moneyScene(3, 0);
  return {
    parts: [
      show(moment(['Let us count money. First, some dimes.'], 'How much money?', start)),
      ...dimes.map(show),
      show(moment(['Each dime adds ten more.'], 'Each dime: 10 more', calm(last(dimes, start)))),
      turn(one, moneyWhy(one)),
      show(moment(['Now there are dimes, and pennies too. Start with the dimes.'], 'Dimes first, then pennies', moneyScene(2, 3))),
      ...mixed.map(show),
      turn(two, moneyWhy(two)),
      show(moment(['Dimes count by tens. Pennies count by ones.'], 'Dimes by tens, pennies by ones', calm(last(mixed, start)))),
    ],
  };
}

// ---- M-1-C2 Order by length ----

const UNIT = 0.8; // stage squares for each unit of a bar's length
const BAR_X = 1;
const barVisual = (length: number, color: string): Visual => ({ kind: 'bar', length, color, orientation: 'horizontal' });
// A bar's piece, sized so that every bar is drawn to the same scale (the picture is 22 units for each unit of length, 24 tall).
const barPiece = (id: string, visual: Visual, length: number, x: number, row: number, gap: number): Piece => ({ id, look: picture(visual), x, y: round(0.4 + row * gap), w: round(((length * 22 + 4) / 22) * UNIT), h: round((24 / 22) * UNIT) });

// Line the bars up at one end, then move the shortest of those left to the next row, one at a time.
function orderMoments(values: readonly number[], visuals: readonly Visual[], offsets?: readonly number[]): Moment[] {
  const gap = values.length > 3 ? 1.3 : 1.6;
  const lined = scene(values.map((value, i) => barPiece(`b${i}`, visuals[i] as Visual, value, BAR_X, i, gap)));
  const out: Moment[] = [];
  if (offsets) {
    const loose = alter(lined, (piece) => ({ ...piece, x: BAR_X + (offsets[Number(piece.id.slice(1))] ?? 0) }));
    out.push(moment(['Which bar is the shortest? It is hard to tell like this.'], 'Which is the shortest?', loose));
  }
  out.push(moment(['Line the bars up at one end. Then look at the other end.'], 'Line them up at one end.', lined));
  const order = values.map((_, i) => i).sort((a, b) => (values[a] as number) - (values[b] as number));
  let rows = values.map((_, i) => i); // rows[row] is the bar now in that row
  let now = lined;
  order.forEach((bar, place) => {
    const from = rows.indexOf(bar);
    const moved = rows.slice();
    moved[from] = rows[place] as number;
    moved[place] = bar;
    rows = moved;
    now = alter(calm(now), (piece) => {
      const row = rows.indexOf(Number(piece.id.slice(1)));
      const settled = row <= place;
      return { ...piece, y: round(0.4 + row * gap), lit: piece.id === `b${bar}` ? true : undefined, badge: settled ? String(row + 1) : undefined };
    });
    const say: Say =
      place === 0
        ? ['This bar stops first. It is the shortest, so it goes first.']
        : place === values.length - 1
          ? ['The longest bar goes last.']
          : place === 1
            ? ['Of the bars left, this one is the shortest. It goes next.']
            : ['Now this one is the shortest of the rest. It goes next too.'];
    out.push(moment(say, place === 0 ? 'The shortest goes first.' : place === values.length - 1 ? 'The longest goes last.' : 'Then the next shortest.', now));
  });
  out.push(moment(['Now they go from shortest to longest, like steps.'], 'Shortest to longest', alter(now, (piece) => ({ ...piece, lit: true }))));
  return out;
}

function orderWhy(question: Question): Moment[] {
  if (question.type !== 'order') throw new Error('M-1-C2 is an order question');
  return orderMoments(numbers(question.facts, 'values'), question.items);
}

// Not in LESSONS yet: an order question whose items are pictures with no names has no answer the lesson test
// lets a why say or show. The why ends with the question's own bars in the right order, top to bottom.
export function orderByLengthLesson(): Lesson {
  const three = [6, 2, 4];
  const four = [5, 3, 6, 4];
  const first = orderMoments(three, three.map((value) => barVisual(value, 'blue')), [2.4, 0.3, 1.4]);
  const second = orderMoments(four, four.map((value) => barVisual(value, 'green')));
  const one = turnQuestion('M-1-C2', 1);
  const two = turnQuestion('M-1-C2', 2);
  const start = first[0]?.scene ?? scene([]);
  return {
    parts: [
      show(moment(['Let us put bars in order, from the shortest to the longest.'], 'Shortest to longest', calm(start))),
      ...first.map(show),
      turn(one, orderWhy(one)),
      show(moment(['Here are four bars. Do it the same way.'], 'Four bars', calm(second[0]?.scene ?? start))),
      ...second.slice(1).map(show),
      turn(two, orderWhy(two)),
      show(moment(['Line up one end, then look at the other end.'], 'Line up one end. Look at the other.', calm(last(second, start)))),
    ],
  };
}

// ---- M-1-D3 How many pieces make a shape ----

const FIGURE = { x: 0.7, y: 0.5, size: 4.8 };
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
    return { x: FIGURE.x + ((x + 12) / 124) * FIGURE.size, y: FIGURE.y + ((y + 12) / 124) * FIGURE.size };
  });
}

// See the whole shape, fit the pieces inside, pull them apart, count each one, and say how many.
function fillMoments(id: FigureId): Moment[] {
  const figure = FIGURES[id];
  const same = figure.whole === figure.piece;
  const whole = same ? `big ${figure.whole}` : figure.whole;
  const pieces = same ? `small ${figure.piece}s` : `${figure.piece}s`;
  const count = figure.slots.length;
  const look = (shown: 'whole' | 'cut' | 'pieces'): PieceLook => picture({ kind: 'figure', figure: id, show: shown });
  const base = scene([
    { id: 'f', look: look('whole'), x: FIGURE.x, y: FIGURE.y, w: FIGURE.size, h: FIGURE.size },
    { id: 'n', look: numeral(1), x: 6.7, y: 1.3, w: 1.8, h: 1.8, gone: true },
    { id: 'l', look: text(`${figure.piece}s`), x: 6.1, y: 3.4, w: 3, h: 0.7, gone: true },
  ]);
  const become = (from: Scene, shown: 'whole' | 'cut' | 'pieces'): Scene => alter(from, (piece) => (piece.id === 'f' ? { ...piece, look: look(shown) } : piece));
  const cut = set(become(base, 'cut'), ['f'], { lit: true });
  const apart = set(become(base, 'pieces'), ['l'], { gone: false });
  const out: Moment[] = [
    moment([`Here is a ${whole}. How many ${pieces} fill it?`], `How many ${pieces} fill the ${whole}?`, base),
    moment([`The ${pieces} fit inside, with no gaps.`], 'They fit, with no gaps.', cut),
    moment(['Pull them apart a little, and count each one.'], 'Count each piece once.', apart),
  ];
  pieceSpots(id).forEach((spot, i) => {
    const counted = alter(apart, (piece) => (piece.id === 'n' ? { ...piece, look: numeral(i + 1), gone: false, lit: true } : piece));
    out.push(moment([{ number: i + 1 }], String(i + 1), handAt(counted, spot.x, spot.y + 0.1)));
  });
  const done = alter(set(become(base, 'cut'), ['f', 'n', 'l'], { gone: false, lit: true }), (piece) => (piece.id === 'n' ? { ...piece, look: numeral(count) } : piece));
  out.push(moment([{ number: count }, `${pieces} make the ${whole}.`], `${count} ${pieces} make the ${whole}.`, done));
  return out;
}

function fillWhy(question: Question): Moment[] {
  if (question.type !== 'fillShape') throw new Error('M-1-D3 is a fill-the-shape question');
  return fillMoments(question.figure);
}

function howManyPiecesLesson(): Lesson {
  const square = fillMoments('square-2tri');
  const hexagon = fillMoments('hex-6tri');
  const start = square[0]?.scene ?? scene([]);
  const one = turnQuestion('M-1-D3', 1, (f) => f.makes === 'rectangle');
  const two = turnQuestion('M-1-D3', 2, (f) => f.makes === 'triangle');
  return {
    parts: [
      show(moment(['Big shapes can be built from smaller shapes.'], 'Small shapes make big shapes.', calm(start))),
      ...square.map(show),
      show(moment(['The pieces must fit just right. Nothing sticks out, and no space is left.'], 'No gaps. Nothing sticks out.', calm(last(square, start)))),
      turn(one, fillWhy(one)),
      ...hexagon.map(show),
      turn(two, fillWhy(two)),
      show(moment(['Fill the shape, then count the pieces. A piece that does not fit does not count.'], 'Fill it, then count the pieces.', calm(last(hexagon, start)))),
    ],
  };
}

// ---- M-1-D4 Faces of solid shapes ----

const SOLIDS: readonly { name: SolidName; faces: number; face: ShapeName | null }[] = [
  { name: 'cube', faces: 6, face: 'square' },
  { name: 'cylinder', faces: 2, face: 'circle' },
  { name: 'cone', faces: 1, face: 'circle' },
  { name: 'sphere', faces: 0, face: null },
];
const faceVisual = (shape: ShapeName): Visual => ({ kind: 'shape', shape, color: 'blue', size: 'm', rotation: 0 });
const facesText = (count: number): string => `${count} ${count === 1 ? 'face' : 'faces'}`;

// The four solids in a row. Under each: its name, the flat shape of its face, and how many faces (both hidden until shown).
function solidsScene(shown: readonly number[] = []): Scene {
  return scene(
    SOLIDS.flatMap((solid, i): Piece[] => {
      const middle = 1.25 + i * 2.5;
      const hidden = !shown.includes(i);
      return [
        { id: `s${i}`, look: picture({ kind: 'solid', solid: solid.name }), x: middle - 0.9, y: 0.2, w: 1.8, h: 1.8 },
        { id: `n${i}`, look: text(solid.name), x: middle - 1.1, y: 2.1, w: 2.2, h: 0.55 },
        { id: `f${i}`, look: solid.face ? picture(faceVisual(solid.face)) : text('none'), x: middle - 0.6, y: 2.95, w: 1.2, h: 1.2, gone: hidden },
        { id: `c${i}`, look: text(facesText(solid.faces)), x: middle - 1.1, y: 4.4, w: 2.2, h: 0.6, gone: hidden },
      ];
    }),
  );
}

const SOLID_AT: Record<string, number> = { cube: 0, cylinder: 1, cone: 2, sphere: 3 };
const WANTED: Record<string, { at: number; say: string }> = {
  square: { at: 0, say: 'Each flat face of the cube is a square. So the answer is the cube.' },
  two: { at: 1, say: 'The cylinder has a flat circle on top, and one on the bottom. So the answer is the cylinder.' },
  one: { at: 2, say: 'The cone has just one flat face, at the bottom. So the answer is the cone.' },
  none: { at: 3, say: 'The sphere is round all over, with no flat faces. So the answer is the sphere.' },
};

function facesWhy(question: Question): Moment[] {
  const all = solidsScene([0, 1, 2, 3]);
  const ask = str(question.facts, 'ask');
  if (ask === 'which') {
    const wanted = WANTED[str(question.facts, 'want')] ?? (WANTED.none as { at: number; say: string });
    return [
      moment(['Look at the flat faces of each shape.'], 'Look at the flat faces.', all),
      moment([wanted.say], `The ${SOLIDS[wanted.at]?.name ?? ''}`, point(set(all, [`s${wanted.at}`, `n${wanted.at}`, `f${wanted.at}`, `c${wanted.at}`], { lit: true }), `c${wanted.at}`)),
    ];
  }
  const at = SOLID_AT[str(question.facts, 'solid')] ?? 0;
  const solid = SOLIDS[at] as (typeof SOLIDS)[number];
  const found = set(all, [`s${at}`, `n${at}`], { lit: true });
  if (ask === 'faceShape') {
    return [
      moment([`Find the ${solid.name}. Look for a flat side.`], `Find the ${solid.name}.`, found),
      moment([`Its flat face is a ${solid.face ?? 'circle'}.`], `A ${solid.face ?? 'circle'}`, point(set(found, [`f${at}`], { lit: true }), `f${at}`)),
    ];
  }
  const counted = point(set(found, [`f${at}`, `c${at}`], { lit: true }), `c${at}`);
  const say: Say = solid.faces === 0 ? ['A sphere is round all over. It has no flat faces. That is', { number: 0 }, '.'] : [`A ${solid.name} has`, { number: solid.faces }, solid.faces === 1 ? 'flat face.' : 'flat faces.'];
  return [moment([`Find the ${solid.name}. Count only the flat sides.`], `Find the ${solid.name}.`, found), moment(say, `${solid.name}: ${facesText(solid.faces)}`, counted)];
}

function facesLesson(): Lesson {
  const start = solidsScene();
  const meet = (from: Scene, i: number): Scene => point(set(calm(from), [`s${i}`, `n${i}`], { lit: true }), `n${i}`);
  const reveal = (from: Scene, i: number, ids: readonly string[]): Scene => point(set(withoutHand(calm(from)), ids, { gone: false, lit: true }), ids.at(-1) ?? `n${i}`);
  const cube1 = meet(start, 0);
  const cube2 = reveal(cube1, 0, ['f0']);
  const cube3 = reveal(cube2, 0, ['c0']);
  const cylinder1 = set(meet(cube3, 1), ['f1'], { gone: false, lit: true });
  const cylinder2 = reveal(cylinder1, 1, ['c1']);
  const key = withoutHand(calm(cylinder2));
  const cone1 = set(meet(key, 2), ['f2'], { gone: false, lit: true });
  const cone2 = reveal(cone1, 2, ['c2']);
  const sphere = set(meet(cone2, 3), ['f3', 'c3'], { gone: false, lit: true });
  const all = withoutHand(calm(sphere));
  const one = turnQuestion('M-1-D4', 1, (f) => f.solid === 'cylinder');
  const two = turnQuestion('M-1-D4', 2, (f) => f.want === 'one' || f.want === 'none');
  const three = turnQuestion('M-1-D4', 3, (f) => f.solid === 'cube');
  return {
    parts: [
      show(moment(['Solid shapes have sides. A flat side is called a face.'], 'A face is a flat side.', start)),
      show(moment(['This is a cube. Every side of a cube is flat.'], 'a cube', cube1)),
      show(moment(['Each face of a cube is a square.'], 'Each face is a square.', cube2)),
      show(moment(['Count them. Top, bottom, and four around the sides. That is', { number: 6 }, 'faces.'], 'A cube has 6 faces.', cube3)),
      show(moment(['This is a cylinder. It has a flat circle on top, and one on the bottom.'], 'a cylinder', cylinder1)),
      show(moment(['That is', { number: 2 }, 'flat faces. Its side is curved, so the side is not a face.'], 'A cylinder has 2 flat faces.', cylinder2)),
      turn(one, facesWhy(one)),
      show(moment(['A face must be flat. A curved side does not count.'], 'Only flat sides are faces.', key)),
      show(moment(['This is a cone. It has one flat face, a circle at the bottom.'], 'a cone', cone1)),
      show(moment(['The rest of the cone is curved, and comes to a point.'], 'A cone has 1 flat face.', cone2)),
      show(moment(['This is a sphere. It is round all over, so it has no flat faces.'], 'A sphere has no flat faces.', sphere)),
      turn(two, facesWhy(two)),
      show(moment(['Now think about how many flat faces each shape has.'], 'How many flat faces?', set(all, ['c0', 'c1', 'c2', 'c3'], { lit: true }))),
      turn(three, facesWhy(three)),
      show(moment(['Flat sides are faces. Curved sides are not.'], 'Flat sides are faces.', all)),
    ],
  };
}

export const LESSONS: Readonly<Record<string, () => Lesson>> = {
  'M-1-C2': orderByLengthLesson,
  'M-1-C1': tellTimeLesson,
  'M-1-C6': matchClocksLesson,
  'M-1-C4': coinsLesson,
  'M-1-C11': dimesAndPenniesLesson,
  'M-1-D3': howManyPiecesLesson,
  'M-1-D4': facesLesson,
};
