import type { Question } from '../engine/types';
import { alter, calm, moment, num, numeral, scene, set, str, text, turnQuestion, withoutHand, pointAt } from './build';
import type { Lesson, LessonPart, Moment, Piece, Scene } from './types';

// Grade 1 Math lessons (plan section 16).

const show = (m: Moment): LessonPart => ({ kind: 'show', moment: m });
const turn = (question: Question, why: Moment[]): LessonPart => ({ kind: 'turn', turn: { question, why } });

const LINE_COLS = 11;

// ---- M-1-B5 Missing number in an equation ----

// The equation on top (with a box for the missing number) and a number line from 0 to 10 below it.
function equationScene(prefix: string, known: number, total: number, boxFirst: boolean): Scene {
  const parts: Piece[] = boxFirst
    ? [
        { id: `${prefix}box`, look: { kind: 'box' }, x: 2.5, y: 0.4, w: 1.2, h: 1.2 },
        { id: `${prefix}plus`, look: text('+'), x: 3.9, y: 0.5 },
        { id: `${prefix}known`, look: numeral(known), x: 5, y: 0.5 },
      ]
    : [
        { id: `${prefix}known`, look: numeral(known), x: 2.5, y: 0.5 },
        { id: `${prefix}plus`, look: text('+'), x: 3.6, y: 0.5 },
        { id: `${prefix}box`, look: { kind: 'box' }, x: 4.7, y: 0.4, w: 1.2, h: 1.2 },
      ];
  const line: Piece[] = Array.from({ length: 11 }, (_, n) => ({ id: `${prefix}n${n}`, look: numeral(n), x: n, y: 3.6 }));
  return scene([...parts, { id: `${prefix}eq`, look: text('='), x: 6.2, y: 0.5 }, { id: `${prefix}total`, look: numeral(total), x: 7.3, y: 0.5 }, ...line], LINE_COLS, 6);
}

// Start at the number we know, hop up to the total one number at a time, and count the hops.
function hopMoments(prefix: string, known: number, total: number, boxFirst: boolean): Moment[] {
  const missing = total - known;
  const start = equationScene(prefix, known, total, boxFirst);
  const startPiece = start.pieces.find((piece) => piece.id === `${prefix}n${known}`);
  let now = set(start, [`${prefix}n${known}`, `${prefix}known`], { lit: true });
  if (startPiece) now = pointAt(now, startPiece);
  const moments: Moment[] = [
    moment(boxFirst ? ['What number plus', { number: known }, 'equals', { number: total }, '?'] : [{ number: known }, 'plus what number equals', { number: total }, '?'], boxFirst ? `? + ${known} = ${total}` : `${known} + ? = ${total}`, set(start, [`${prefix}box`], { lit: true })),
    moment(['Start at the number we know,', { number: known }, '.'], `Start at ${known}.`, now),
    moment(['Now count up to', { number: total }, ', one hop at a time.'], `Count up to ${total}.`, now),
  ];
  for (let hop = 1; hop <= missing; hop += 1) {
    const at = known + hop;
    const piece = now.pieces.find((each) => each.id === `${prefix}n${at}`);
    now = alter(now, (each) => (each.id === `${prefix}n${at}` ? { ...each, lit: true, badge: String(hop) } : each));
    if (piece) now = pointAt(now, piece);
    moments.push(moment([{ number: at }], String(at), now));
  }
  const filled = alter(withoutHand(now), (piece) => (piece.id === `${prefix}box` ? { ...piece, look: numeral(missing), lit: true } : piece));
  moments.push(
    moment(['We made', { number: missing }, missing === 1 ? 'hop.' : 'hops.'], `${missing} ${missing === 1 ? 'hop' : 'hops'}`, withoutHand(now)),
    moment(['So the missing number is', { number: missing }, '.'], `The missing number is ${missing}.`, filled),
    moment(
      boxFirst ? ['Check:', { number: missing }, ', plus', { number: known }, ', equals', { number: total }, '.'] : ['Check:', { number: known }, ', plus', { number: missing }, ', equals', { number: total }, '.'],
      boxFirst ? `${missing} + ${known} = ${total}` : `${known} + ${missing} = ${total}`,
      set(calm(filled), [`${prefix}box`, `${prefix}known`, `${prefix}total`], { lit: true }),
    ),
  );
  return moments;
}

function missingWhy(question: Question): Moment[] {
  const blank = str(question.facts, 'blank');
  const total = num(question.facts, 'total');
  const known = blank === 'a' ? num(question.facts, 'b') : num(question.facts, 'a');
  return hopMoments('w', known, total, blank === 'a');
}

export function missingNumberLesson(): Lesson {
  const opening = hopMoments('x', 3, 7, false);
  const second = hopMoments('y', 5, 9, false);
  const fits = (f: Record<string, unknown>): boolean => f.blank === 'b' && num(f, 'total') <= 10 && num(f, 'total') - num(f, 'a') >= 2;
  const first = turnQuestion('M-1-B5', 1, (f) => fits(f) && num(f, 'total') - num(f, 'a') <= 4);
  const later = turnQuestion('M-1-B5', 1, (f) => fits(f) && num(f, 'total') - num(f, 'a') >= 4 && num(f, 'a') !== num(first.facts, 'a'));
  return {
    parts: [
      show(moment(['A box in a number sentence hides a number we do not know yet.'], 'The box hides a number.', calm(equationScene('x', 3, 7, false)))),
      ...opening.map(show),
      turn(first, missingWhy(first)),
      show(moment(['Here is one more. We count up the same way.'], 'One more, the same way.', calm(equationScene('y', 5, 9, false)))),
      ...second.map(show),
      turn(later, missingWhy(later)),
      show(moment(['Start at the number you know, and count up to the total. The hops are the missing number.'], 'Count up. The hops are the missing number.', calm(second.at(-1)?.scene ?? equationScene('y', 5, 9, false)))),
    ],
  };
}
