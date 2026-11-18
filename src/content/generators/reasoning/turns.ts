import type { Rng } from '../../../engine/rng';
import { makeRng } from '../../../engine/rng';
import type { LessonStep, Level, QuestionDraft, ShapeName, Visual } from '../../../engine/types';
import type { ColorName } from '../../data/colors';
import { COLOR_NAMES } from '../../data/colors';
import type { SkillGenerator } from '../../generator';
import type { Explanation } from '../ela/pk/parts';
import { row } from '../ela/pk/parts';
import { twoClearColors } from '../math/pk/parts';

// Reasoning A.5, A.6 and A.12: turning shapes, mirror images and paper folding.

// Where a shape stands: quarter turns clockwise, and whether it is flipped.
// The oracle writes the same thing as "2" or "3f".
interface Pose {
  turn: number;
  flip: boolean;
}
const code = (pose: Pose): string => `${pose.turn}${pose.flip ? 'f' : ''}`;

function posed(form: ShapeName, color: ColorName, pose: Pose): Visual {
  const base = { kind: 'shape' as const, shape: form, color, size: 'm' as const, rotation: pose.turn * 90 };
  return pose.flip ? { ...base, flip: true } : base;
}

// ---- A.5 Turning shapes ----
// Levels: next quarter turn of an arrow / of an L shape / skipping a turn /
// a quarter turn and a change of colour at every step. Colour and starting turn vary.

const NEXT = 'What comes next?';
const SHOWN = 3;

function turnLine(step: number): string {
  return step === 1 ? 'It makes a quarter turn each step.' : 'It makes a half turn each step.';
}

function turning(level: Level, rng: Rng): QuestionDraft {
  const form: ShapeName = level === 1 ? 'arrow' : level === 2 ? 'lShape' : rng.pick<ShapeName>(['arrow', 'lShape']);
  const color = rng.pick(COLOR_NAMES);
  const startTurn = rng.int(0, 3);
  const step = level === 3 ? 2 : 1;
  const at = (i: number): Pose => ({ turn: (startTurn + step * i) % 4, flip: false });
  const answer = at(SHOWN);
  const others = rng.shuffle([0, 1, 2, 3].filter((turn) => turn !== answer.turn)).map((turn): Pose => ({ turn, flip: false }));
  // Three options at the first two levels, all four turns at the third.
  const options = rng.shuffle([answer, ...others.slice(0, level === 3 ? 3 : 2)]);
  const shown = Array.from({ length: SHOWN }, (_, i) => posed(form, color, at(i)));
  return {
    type: 'choice',
    mode: 'look',
    facts: { shape: form, startTurn, turns: step * SHOWN, flip: false, step, color, options: options.map(code) },
    prompt: { text: NEXT, speak: [NEXT] },
    stimulus: { kind: 'sequence', items: [...shown, 'blank'] },
    options: options.map((pose) => posed(form, color, pose)),
    answerIndex: options.indexOf(answer),
    explanation: { speak: [turnLine(step)], steps: [turnLine(step)], visual: { kind: 'sequence', items: [...shown, posed(form, color, answer)] } },
  };
}

// Level 4: two things to follow. The oracle reads the colours and how many steps are shown.
function turningColours(rng: Rng): QuestionDraft {
  const form = rng.pick<ShapeName>(['arrow', 'lShape']);
  const colors = twoClearColors(rng);
  const startTurn = rng.int(0, 3);
  const at = (i: number): Pose => ({ turn: (startTurn + i) % 4, flip: false });
  const colourAt = (i: number): ColorName => colors[i % 2] as ColorName;
  const answer = at(SHOWN);
  const [wrongTurn, otherTurn] = rng.sample([0, 1, 2, 3].filter((turn) => turn !== answer.turn), 2) as [number, number];
  // Right turn and wrong colour, wrong turn and right colour, and both wrong.
  const right = colourAt(SHOWN);
  const wrong = colourAt(SHOWN + 1);
  const offered: [Pose, ColorName][] = [
    [answer, right],
    [answer, wrong],
    [{ turn: wrongTurn, flip: false }, right],
    [{ turn: otherTurn, flip: false }, wrong],
  ];
  const options = rng.shuffle(offered);
  const shown = Array.from({ length: SHOWN }, (_, i) => posed(form, colourAt(i), at(i)));
  const lines = [turnLine(1), `The color goes ${colors[0]}, ${colors[1]}, ${colors[0]}, ${colors[1]}.`];
  return {
    type: 'choice',
    mode: 'look',
    facts: { shape: form, startTurn, turns: SHOWN, flip: false, step: 1, colors, shown: SHOWN, options: options.map(([pose, color]) => `${code(pose)}|${color}`) },
    prompt: { text: NEXT, speak: [NEXT] },
    stimulus: { kind: 'sequence', items: [...shown, 'blank'] },
    options: options.map(([pose, color]) => posed(form, color, pose)),
    answerIndex: options.indexOf(offered[0] as [Pose, ColorName]),
    explanation: { speak: [lines.join(' ')], steps: lines, visual: { kind: 'sequence', items: [...shown, posed(form, right, answer)] } },
  };
}

const turningOf = (level: Level, rng: Rng): QuestionDraft => (level === 4 ? turningColours(rng) : turning(level, rng));

function turningLesson(): LessonStep[] {
  const arrow = (turn: number): Visual => posed('arrow', 'blue', { turn, flip: false });
  return [
    { beat: 'see', text: 'A shape can turn. This arrow turns a little each step.', speak: ['A shape can turn. This arrow turns a little each step.'], visual: { kind: 'sequence', items: [arrow(0), arrow(1)] } },
    { beat: 'watch', text: 'It makes a quarter turn each step. The next turn points it down.', speak: ['It makes a quarter turn each step. The next turn points it down.'], visual: { kind: 'sequence', items: [arrow(0), arrow(1), arrow(2)] } },
    {
      beat: 'try',
      text: NEXT,
      speak: [NEXT],
      visual: { kind: 'sequence', items: [arrow(1), arrow(2), arrow(3), 'blank'] },
      reveal: { text: turnLine(1), speak: [turnLine(1)], visual: { kind: 'sequence', items: [arrow(1), arrow(2), arrow(3), arrow(0)] } },
    },
    { beat: 'remember', text: 'Follow the turn.', speak: ['Follow the turn.'], visual: { kind: 'sequence', items: [arrow(0), arrow(1), arrow(2), arrow(3)] } },
  ];
}

export const turningShapesGenerator: SkillGenerator = {
  skillId: 'R-A5',
  maxLevel: 4,
  itemTypes: ['choice'],
  lists: ['colors'],
  generate: turningOf,
  exampleSeed: 85,
  example: () => turningOf(1, makeRng(85)),
  lesson: turningLesson,
  oracle: 'transform',
};

// ---- A.6 Mirror images ----
// Levels: pick the mirror of a flag / of an L shape / the wrong options are turned copies /
// a picture of two pieces in two colours: the mirror swaps the pieces and flips each one.
// Only the flag and the L shape are used: every other shape is its own mirror image, or looks like a turn of itself.

const MIRROR = 'Which one is the mirror picture?';
const MIRROR_LINE = 'A mirror flips left and right.';

// A mirror swaps left and right of the whole picture. The app draws a flip before the turn, so the turn runs the other way.
const mirrored = (pose: Pose): Pose => ({ turn: (4 - pose.turn) % 4, flip: !pose.flip });
const turned = (pose: Pose, by: number): Pose => ({ turn: (pose.turn + by) % 4, flip: pose.flip });

function mirror(level: Level, rng: Rng): QuestionDraft {
  const form: ShapeName = level === 1 ? 'flag' : level === 2 ? 'lShape' : rng.pick<ShapeName>(['flag', 'lShape']);
  const color = rng.pick(COLOR_NAMES);
  // The first two levels start upright. The third starts at any turn.
  const start: Pose = { turn: level === 3 ? rng.int(0, 3) : 0, flip: false };
  const answer = mirrored(start);
  // Wrong options: the picture unchanged and upside down, or at level 3 its three turned copies.
  const wrong = level === 3 ? [turned(start, 1), turned(start, 2), turned(start, 3)] : [start, turned(start, 2)];
  const options = rng.shuffle([answer, ...wrong]);
  return {
    type: 'choice',
    mode: 'look',
    facts: { shape: form, startTurn: start.turn, turns: 0, flip: true, color, options: options.map(code) },
    prompt: { text: MIRROR, speak: [MIRROR] },
    stimulus: posed(form, color, start),
    options: options.map((pose) => posed(form, color, pose)),
    answerIndex: options.indexOf(answer),
    explanation: { speak: [MIRROR_LINE], steps: [MIRROR_LINE], visual: row(posed(form, color, start), posed(form, color, answer)) },
  };
}

// Level 4. Wrong options: the pieces swapped but not flipped, flipped but not swapped, and the whole
// picture turned upside down, which also swaps them. The oracle (mirrorRow) reads the pieces.
interface Piece {
  shape: ShapeName;
  color: ColorName;
  pose: Pose;
}
const pieceCode = (piece: Piece): string => `${piece.shape}:${piece.color}:${code(piece.pose)}`;
const pieces = (list: Piece[]): Visual => row(...list.map((piece) => posed(piece.shape, piece.color, piece.pose)));

function mirrorPair(rng: Rng): QuestionDraft {
  const colors = twoClearColors(rng);
  const start: Piece[] = colors.map((color) => ({ shape: rng.pick<ShapeName>(['flag', 'lShape']), color, pose: { turn: rng.int(0, 3), flip: false } }));
  const swapped = [...start].reverse();
  const sets: Piece[][] = [
    swapped.map((piece) => ({ ...piece, pose: mirrored(piece.pose) })),
    swapped,
    start.map((piece) => ({ ...piece, pose: mirrored(piece.pose) })),
    swapped.map((piece) => ({ ...piece, pose: turned(piece.pose, 2) })),
  ];
  const options = rng.shuffle(sets);
  const lines = [MIRROR_LINE, 'The two pieces swap places, and each one flips.'];
  return {
    type: 'choice',
    mode: 'look',
    facts: { oracle: 'mirrorRow', pieces: start.map((piece) => ({ shape: piece.shape, color: piece.color, turn: piece.pose.turn })), options: options.map((set) => set.map(pieceCode).join(' ')) },
    prompt: { text: MIRROR, speak: [MIRROR] },
    stimulus: pieces(start),
    options: options.map(pieces),
    answerIndex: options.indexOf(sets[0] as Piece[]),
    explanation: { speak: [lines.join(' ')], steps: lines, visual: pieces(sets[0] as Piece[]) },
  };
}

const mirrorOf = (level: Level, rng: Rng): QuestionDraft => (level === 4 ? mirrorPair(rng) : mirror(level, rng));

function mirrorLesson(): LessonStep[] {
  const flag = (pose: Pose): Visual => posed('flag', 'red', pose);
  const up: Pose = { turn: 0, flip: false };
  return [
    { beat: 'see', text: 'A mirror shows a picture the other way round.', speak: ['A mirror shows a picture the other way round.'], visual: row(flag(up), flag(mirrored(up))) },
    { beat: 'watch', text: 'A mirror flips left and right. The flag pointed one way. In the mirror it points the other way.', speak: ['A mirror flips left and right. The flag pointed one way. In the mirror it points the other way.'], visual: row(flag(up), flag(mirrored(up))) },
    {
      beat: 'try',
      text: MIRROR,
      speak: [MIRROR],
      visual: posed('lShape', 'green', up),
      reveal: { text: MIRROR_LINE, speak: [MIRROR_LINE], visual: row(posed('lShape', 'green', up), posed('lShape', 'green', mirrored(up))) },
    },
    { beat: 'remember', text: 'Left becomes right.', speak: ['Left becomes right.'], visual: row(flag(up), flag(mirrored(up))) },
  ];
}

export const mirrorImagesGenerator: SkillGenerator = {
  skillId: 'R-A6',
  maxLevel: 4,
  itemTypes: ['choice'],
  lists: ['colors'],
  generate: mirrorOf,
  exampleSeed: 86,
  example: () => mirrorOf(1, makeRng(86)),
  lesson: mirrorLesson,
  oracle: 'transform',
};

// ---- A.12 Paper folding ----
// Levels: one fold, one hole at an outer corner / one hole next to the fold / two holes / three holes.
// The paper is a 4 by 4 grid. A vertical fold shows columns 0 and 1; a horizontal fold shows rows 0 and 1.

type Fold = 'vertical' | 'horizontal';
interface Hole {
  col: number;
  row: number;
}

const FOLDING = 'The paper is folded and punched. How does it look unfolded?';
const FOLD_LINES = ['One punch goes through both layers.', 'The holes sit the same distance from the fold.'];

// A hole on the folded paper: `along` runs beside the fold (0 to 3), `away` is 0 at the outer edge and 1 next to the fold.
const holeAt = (fold: Fold, away: number, along: number): Hole => (fold === 'vertical' ? { col: away, row: along } : { col: along, row: away });
const across = (fold: Fold, hole: Hole): Hole => (fold === 'vertical' ? { col: 3 - hole.col, row: hole.row } : { col: hole.col, row: 3 - hole.row });
// The slips a child makes: flipping the wrong way, or sliding the hole over without flipping it.
const wrongWay = (fold: Fold, hole: Hole): Hole => (fold === 'vertical' ? { col: hole.col, row: 3 - hole.row } : { col: 3 - hole.col, row: hole.row });
const slid = (fold: Fold, hole: Hole): Hole => (fold === 'vertical' ? { col: hole.col + 2, row: hole.row } : { col: hole.col, row: hole.row + 2 });

const holesCode = (holes: Hole[]): string => [...new Set(holes.map((hole) => `${hole.col},${hole.row}`))].sort().join(' ');
const unfolded = (fold: Fold, holes: Hole[]): Visual => ({ kind: 'foldPunch', fold, state: 'unfolded', holes });

function foldExplanation(fold: Fold, holes: Hole[]): Explanation {
  return { speak: [FOLD_LINES.join(' ')], steps: FOLD_LINES, visual: unfolded(fold, [...holes, ...holes.map((hole) => across(fold, hole))]) };
}

function folding(level: Level, rng: Rng): QuestionDraft {
  for (;;) {
    const fold = rng.pick<Fold>(['vertical', 'horizontal']);
    let holes: Hole[];
    if (level === 1) holes = [holeAt(fold, 0, rng.pick([0, 3]))];
    else if (level === 2) holes = [holeAt(fold, 1, rng.int(0, 3))];
    else {
      const places = rng.sample([0, 1, 2, 3, 4, 5, 6, 7], level === 3 ? 2 : 3).sort((x, y) => x - y);
      holes = places.map((place) => holeAt(fold, place % 2, Math.floor(place / 2)));
    }
    const sets: Hole[][] = [
      [...holes, ...holes.map((hole) => across(fold, hole))], // right
      holes, // the punch went through one layer only
      [...holes, ...holes.map((hole) => wrongWay(fold, hole))],
    ];
    if (level >= 3) sets.push([...holes, ...holes.map((hole) => slid(fold, hole))]);
    // Two holes side by side slide and flip to the same places. Such a set is thrown away.
    if (new Set(sets.map(holesCode)).size !== sets.length) continue;
    const options = rng.shuffle(sets);
    return {
      type: 'choice',
      mode: 'look',
      facts: { fold, holes: holes.map((hole) => ({ col: hole.col, row: hole.row })), options: options.map(holesCode) },
      prompt: { text: FOLDING, speak: [FOLDING] },
      stimulus: { kind: 'foldPunch', fold, state: 'folded', holes },
      options: options.map((set) => unfolded(fold, set)),
      answerIndex: options.indexOf(sets[0] as Hole[]),
      explanation: foldExplanation(fold, holes),
    };
  }
}

function foldingLesson(): LessonStep[] {
  const hole: Hole = { col: 0, row: 0 };
  const near: Hole = { col: 1, row: 2 };
  return [
    { beat: 'see', text: 'This paper is folded in half. A hole is punched through it.', speak: ['This paper is folded in half. A hole is punched through it.'], visual: { kind: 'foldPunch', fold: 'vertical', state: 'folded', holes: [hole] } },
    { beat: 'watch', text: `${FOLD_LINES.join(' ')} Unfolded, there are two holes.`, speak: [`${FOLD_LINES.join(' ')} Unfolded, there are two holes.`], visual: foldExplanation('vertical', [hole]).visual },
    {
      beat: 'try',
      text: 'How does it look unfolded?',
      speak: ['How does it look unfolded?'],
      visual: { kind: 'foldPunch', fold: 'vertical', state: 'folded', holes: [near] },
      reveal: { text: FOLD_LINES.join(' '), speak: [FOLD_LINES.join(' ')], visual: foldExplanation('vertical', [near]).visual },
    },
    { beat: 'remember', text: 'Each layer gets a hole.', speak: ['Each layer gets a hole.'], visual: foldExplanation('vertical', [hole]).visual },
  ];
}

export const paperFoldingGenerator: SkillGenerator = {
  skillId: 'R-A12',
  maxLevel: 4,
  itemTypes: ['choice'],
  lists: [],
  pool: { 1: 4 }, // two folds, two outer corners each
  generate: folding,
  exampleSeed: 92,
  example: () => folding(1, makeRng(92)),
  lesson: foldingLesson,
  oracle: 'fold',
};
