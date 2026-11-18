import type { FigureId } from './figures';
import { FACTS as H1_FACTS } from './oracleFacts/h1';
import { FACTS as H2_FACTS } from './oracleFacts/h2';
import { FACTS as H3_FACTS } from './oracleFacts/h3';
import { FACTS as H4_FACTS } from './oracleFacts/h4';
import { FACTS as H5_FACTS } from './oracleFacts/h5';

// Every question is plain data. Screens only draw it and report what the child tapped.

export type FactValue = number | string | boolean | FactValue[] | { [key: string]: FactValue };
export type Facts = Record<string, FactValue>;

// Spoken text is a list of parts, so say.ts knows what each piece is.
export type SayPart =
  | string // plain words: no digits, no symbols
  | { letter: string } // a letter name: 'a' is said "ay"
  | { word: string } // a word said as a word: 'a', 'I', 'read'
  | { number: number }
  | { time: { hour: number; minute: number } }
  | { cents: number };
export type Say = SayPart[];

export type ShapeName =
  | 'circle'
  | 'square'
  | 'triangle'
  | 'rectangle'
  | 'hexagon'
  | 'star'
  | 'heart'
  | 'oval'
  | 'diamond'
  | 'arrow'
  | 'lShape'
  | 'flag'
  | 'pentagon'
  | 'trapezoid';
export type SolidName = 'cube' | 'sphere' | 'cone' | 'cylinder';
export type CoinName = 'penny' | 'nickel' | 'dime' | 'quarter';
export type Blank = 'blank';

interface VisualBase {
  // Read aloud when a child who cannot read taps the picture. Never set in listen questions.
  speak?: Say;
}

export type Visual = VisualBase &
  (
    | {
        kind: 'emojiGroup';
        emoji: string;
        count: number;
        layout: 'row' | 'grid5' | 'scatter' | 'dice';
        slots?: number[]; // scatter only: positions in a fixed 5 by 4 grid, 0 to 19
        crossed?: number; // for subtraction pictures
        numbered?: boolean; // a small count under each object, used in explanations
        emoji2?: string;
        count2?: number;
      }
    | { kind: 'text'; value: string; size: 'm' | 'l' | 'xl' }
    | {
        kind: 'shape';
        shape: ShapeName;
        color: string;
        size: 's' | 'm' | 'l';
        rotation: number; // degrees, clockwise
        flip?: boolean; // mirrored left to right, before it is turned
        open?: boolean; // outline with a gap
      }
    | { kind: 'solid'; solid: SolidName }
    | { kind: 'tenFrame'; filled: number; frames: 1 | 2 }
    | { kind: 'baseTen'; thousands?: number; hundreds: number; tens: number; ones: number }
    // With `denominator`, the numbers are counted in parts of one: min 0, max 4, denominator 4 is 0, 1/4, 2/4, 3/4, 1.
    | { kind: 'numberLine'; min: number; max: number; step: number; marked?: number[]; hidden?: number[]; denominator?: number }
    | { kind: 'equation'; parts: (number | string)[] } // numbers, operators and 'blank'
    | { kind: 'sequence'; items: (Visual | Blank)[] }
    | { kind: 'matrix'; cells: (Visual | Blank)[] } // 4 or 9 cells
    | { kind: 'clock'; hour: number; minute: number; noHands?: true } // noHands: a face to draw on, for paper
    | { kind: 'coins'; coins: CoinName[] }
    // `scale`: each picture, or each step on a bar graph's scale, stands for this many (1 when left out).
    | { kind: 'graph'; type: 'picture' | 'bar'; categories: { label: string; emoji: string; value: number }[]; scale?: number }
    // X marks above a number line counted in halves or fourths: counts[i] marks above min + i / denominator.
    | { kind: 'linePlot'; min: number; max: number; denominator: 1 | 2 | 4; counts: number[]; unit: string }
    // A shape made of pieces (src/engine/figures.ts): the whole shape, the whole with the lines where it is cut,
    // or the pieces pulled a little apart, so a child sees they fit.
    | { kind: 'figure'; figure: FigureId; show: 'whole' | 'cut' | 'pieces' }
    | { kind: 'ruler'; lengthUnits: number; startUnit: number; object: 'pencil' | 'crayon' | 'ribbon' }
    | { kind: 'fraction'; shape: 'circle' | 'rectangle'; parts: number; shaded: number; equal: boolean }
    | { kind: 'row'; children: Visual[] }
    | { kind: 'bar'; length: number; color: string; orientation: 'horizontal' | 'vertical' }
    | { kind: 'array'; rows: number; cols: number; emoji: string }
    | { kind: 'tally'; count: number }
    | { kind: 'scale'; left: (number | Blank)[]; right: number[] }
    | {
        kind: 'foldPunch';
        fold: 'vertical' | 'horizontal';
        state: 'folded' | 'unfolded';
        holes: { col: number; row: number }[];
      }
  );

export type Level = 1 | 2 | 3 | 4;
export type Mode = 'look' | 'listen' | 'read';
export type ItemType = 'choice' | 'multiSelect' | 'tapCount' | 'numberPad' | 'order' | 'sort' | 'match' | 'tiles' | 'numberLineTap' | 'setClock' | 'buildBar' | 'columnSum' | 'dragWord' | 'fillShape';
export type ClockTime = { hour: number; minute: number };

export interface QuestionBase {
  skillId: string;
  level: Level;
  seed: number;
  key: string; // skillId | level | canonical JSON of facts, leaving out facts.options
  facts: Facts; // every value that decides the content. The oracle reads only this
  mode: Mode;
  prompt: { text: string; speak: Say };
  stimulus?: Visual;
  explanation: {
    speak: Say; // one or two short sentences
    steps: string[]; // 1 to 4 short lines shown on screen
    visual?: Visual; // the picture that shows why
  };
}

export interface SortBin {
  label: string;
  speak: Say;
  icon?: Visual;
}

export type Question =
  | (QuestionBase & { type: 'choice'; options: Visual[]; answerIndex: number; fixedOrder?: true; twins?: true })
  | (QuestionBase & { type: 'multiSelect'; options: Visual[]; answerIndexes: number[] })
  | (QuestionBase & { type: 'tapCount'; emoji: string; shown: number; answer: number })
  | (QuestionBase & { type: 'numberPad'; answer: number; maxDigits: number })
  | (QuestionBase & { type: 'order'; items: Visual[]; answerOrder: number[] })
  | (QuestionBase & { type: 'sort'; items: Visual[]; bins: SortBin[]; answerBin: number[] })
  | (QuestionBase & { type: 'match'; left: Visual[]; right: Visual[]; answerPairs: [number, number][] })
  | (QuestionBase & { type: 'tiles'; slots: number; bank: string[]; answer: string })
  // Plan section 15.4. Tap or slide a marker to a mark on a number line (counted in parts of one with `denominator`).
  | (QuestionBase & { type: 'numberLineTap'; line: { min: number; max: number; step: number; denominator?: number }; answer: number })
  // Turn the hands to a time. The hands start at `start` and move by `minuteStep` minutes.
  | (QuestionBase & { type: 'setClock'; start: ClockTime; minuteStep: 1 | 5 | 15 | 30; answer: ClockTime })
  // Raise each bar to its value, in steps of `scale` (1 when left out), up to `max`.
  | (QuestionBase & { type: 'buildBar'; categories: { label: string; emoji: string }[]; max: number; scale?: number; answer: number[] })
  // A sum written in columns: the child fills the answer digit by digit, with boxes for carried and borrowed ones.
  | (QuestionBase & { type: 'columnSum'; top: number; bottom: number; op: '+' | '-'; answer: number })
  // Move a word or number into the gap: before + [gap] + after. Each option is a text picture.
  | (QuestionBase & { type: 'dragWord'; before: string; after: string; options: Visual[]; answerIndex: number })
  // Fill a shape with pieces (the owner's request, Nov 18, 2026): drag or tap pieces into its outlined spots, then
  // answer with how many were placed. With `odd`, the tray also holds a piece that does not fit and slides back.
  | (QuestionBase & { type: 'fillShape'; figure: FigureId; odd: boolean; answer: number });

// What a generator hands back. The registry adds the id, level, seed and key.
type WithoutStamp<T> = T extends unknown ? Omit<T, 'skillId' | 'level' | 'seed' | 'key'> : never;
export type QuestionDraft = WithoutStamp<Question>;

// What the child did, one shape for each question type.
export type Response =
  | { index: number } // choice
  | { indexes: number[] } // multiSelect
  | { count: number } // tapCount
  | { value: number } // numberPad
  | { order: number[] } // order
  | { bins: number[] } // sort
  | { pairs: [number, number][] } // match
  | { tiles: string[] } // tiles
  | { time: ClockTime } // setClock
  | { values: number[] }; // buildBar. numberLineTap, columnSum and fillShape answer { value }, dragWord { index }

export type OracleId = WaveOracleId | BaseOracleId;
// Oracles added by the waves of plan section 15, named in src/engine/oracleFacts/.
export type WaveOracleId = keyof typeof H1_FACTS | keyof typeof H2_FACTS | keyof typeof H3_FACTS | keyof typeof H4_FACTS | keyof typeof H5_FACTS;
export type BaseOracleId =
  | 'count'
  | 'add'
  | 'subtract'
  | 'missing'
  | 'compare'
  | 'order'
  | 'sequence'
  | 'pattern'
  | 'attribute'
  | 'oddOne'
  | 'sortBy'
  | 'matchEqual'
  | 'twoStep'
  | 'multiply'
  | 'makeTen'
  | 'series'
  | 'numberRule'
  | 'line'
  | 'place'
  | 'parity'
  | 'time'
  | 'money'
  | 'measure'
  | 'graph'
  | 'fraction'
  | 'shapeFacts'
  | 'letter'
  | 'wordSet'
  | 'spell'
  | 'sentence'
  | 'analogy'
  | 'matrix'
  | 'transform'
  | 'fold'
  | 'truth'
  | 'numberName'
  | 'round'
  | 'estimate'
  | 'fractionValue'
  | 'elapsed'
  | 'rect'
  | 'measureUnit'
  | 'quadrilateral'
  | 'ela2'
  | 'position'
  | 'composeShape'
  | 'measureTool'
  | 'lineUp'
  | 'turnaround'
  | 'sumList'
  | 'unitChoice'
  | 'verbalAnalogy'
  | 'verbalClass'
  | 'numberGrid'
  | 'figureGrid'
  | 'mirrorRow'
  | 'balance'
  | 'authored';

// The facts each oracle reads. validateQuestion checks they are all present.
const BASE_ORACLE_FACTS: Record<BaseOracleId, string[]> = {
  count: ['n'],
  add: ['a', 'b'],
  subtract: ['a', 'b'],
  missing: ['a', 'b', 'total', 'blank'],
  compare: ['values', 'ask'],
  order: ['values'],
  sequence: ['start', 'step', 'length', 'blankIndex'],
  pattern: ['unit', 'shown'],
  attribute: ['target', 'optionAttrs'],
  oddOne: ['optionAttrs'],
  sortBy: ['itemAttrs', 'binAttrs'],
  matchEqual: ['leftValues', 'rightValues'],
  twoStep: ['a', 'op1', 'b', 'op2', 'c'],
  multiply: ['rows', 'cols', 'ask'],
  makeTen: ['a', 'b'],
  series: ['start', 'steps', 'blankIndex'],
  numberRule: ['examples', 'base'],
  line: ['min', 'step', 'index'],
  place: ['hundreds', 'tens', 'ones', 'ask'],
  parity: ['values'],
  time: ['hour', 'minute'],
  money: ['coins', 'ask'],
  measure: ['startUnit', 'lengthUnits'],
  graph: ['values', 'ask'],
  fraction: ['parts', 'equal', 'ask'],
  shapeFacts: ['shape', 'ask'],
  letter: ['letter', 'ask'],
  wordSet: ['target', 'relation'],
  spell: ['word', 'parts'],
  sentence: ['base', 'ask'],
  analogy: ['from', 'to', 'base'],
  matrix: ['rowAttrs', 'colAttrs', 'blank'],
  transform: ['shape', 'startTurn', 'turns', 'flip'],
  fold: ['fold', 'holes'],
  truth: ['left', 'right'],
  numberName: ['n', 'ask'],
  round: ['n', 'to'],
  estimate: ['a', 'b', 'to', 'op', 'ask'],
  fractionValue: ['n', 'd', 'ask'],
  elapsed: ['hour', 'minute', 'ask'],
  rect: ['length', 'width', 'ask'],
  measureUnit: ['kind', 'grams'],
  quadrilateral: ['ask'],
  ela2: ['relation', 'target'],
  position: ['ask', 'slots'],
  composeShape: ['ask'],
  measureTool: ['ask'],
  lineUp: ['ask', 'rows'],
  turnaround: ['a', 'b', 'ask'],
  sumList: ['numbers'],
  unitChoice: ['ask'],
  verbalAnalogy: ['from', 'base', 'options'],
  verbalClass: ['words'],
  numberGrid: ['rows', 'rule'],
  figureGrid: ['cells', 'blank'],
  mirrorRow: ['pieces'],
  balance: ['left', 'right'],
  authored: ['id'],
};
export const ORACLE_FACTS: Record<OracleId, readonly string[]> = { ...BASE_ORACLE_FACTS, ...H1_FACTS, ...H2_FACTS, ...H3_FACTS, ...H4_FACTS, ...H5_FACTS };

export type LessonBeat = 'see' | 'watch' | 'try' | 'remember';

// One of the four beats of a lesson (plan section 8).
export interface LessonStep {
  beat: LessonBeat;
  text: string;
  speak: Say;
  visual: Visual;
  // "Try it together" pauses, then shows this.
  reveal?: { text: string; speak: Say; visual?: Visual };
}

export type SkillGrade = 'PK' | 'K' | '1' | '2' | '3' | 'all';
