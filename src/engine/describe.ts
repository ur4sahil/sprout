import { FIGURES } from './figures';
import { soundOf } from './letterSounds';
import type { Question, Response, RulerUnit, Say, SayPart, Visual } from './types';
import { aboutCentimeters } from './units';

// Plain-text descriptions. Used for aria-labels, the question log snapshot and the review sheet.

function plural(count: number, one: string, many: string): string {
  return `${count} ${count === 1 ? one : many}`;
}

function partText(part: SayPart): string {
  if (typeof part === 'string') return part;
  if ('letter' in part) return part.letter;
  if ('word' in part) return part.word;
  if ('number' in part) return String(part.number);
  if ('time' in part) return `${part.time.hour}:${String(part.time.minute).padStart(2, '0')}`;
  if ('sound' in part) return soundOf(part.sound).shown;
  return `${part.cents}¢`;
}

// Spoken text written out for a person to read. Not what a voice is given: that is say.ts.
export function sayText(say: Say): string {
  return say
    .map(partText)
    .join(' ')
    .replace(/\s+([.,?!])/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
}

// A number counted in parts of one, as a child writes it: 0, 1/4, 2/4, 1, 1 1/4.
export function partLabel(value: number, denominator: number): string {
  const whole = Math.floor(value / denominator);
  const part = value % denominator;
  if (part === 0) return String(whole);
  return whole === 0 ? `${part}/${denominator}` : `${whole} ${part}/${denominator}`;
}

// ---- For the pictures added on Nov 22, 2026 ----

const RULER_OF: Record<RulerUnit, string> = { cm: 'a centimeter ruler', in: 'an inch ruler' };

// What a measuredRect prints along one side: its length and unit ("6 cm"), or "?" for the side to be found.
export function sideLabel(visual: Extract<Visual, { kind: 'measuredRect' }>, side: 'length' | 'width'): string {
  return visual.unknown === side ? '?' : `${visual[side]} ${visual.unit}`;
}

// How a row of paper clips lies under its thing, as a child would say it: from the end, with a gap, or not straight.
function clipWays(visual: Extract<Visual, { kind: 'clipRow' }>): string {
  const ways: string[] = [];
  if ((visual.clips[0] ?? 0) > 0) ways.push('not starting at its end');
  if (visual.clips.some((at, i) => i > 0 && at !== (visual.clips[i - 1] as number) + 1)) ways.push('with a gap');
  if (visual.bent) ways.push('not in a straight line');
  return ways.length > 0 ? `, ${ways.join(', ')}` : ', end to end';
}

export function describeVisual(visual: Visual | 'blank'): string {
  if (visual === 'blank') return 'blank';
  switch (visual.kind) {
    case 'emojiGroup': {
      // One picture with its words printed under it is described by those words: "eat breakfast".
      if (visual.count === 1 && !visual.count2 && !visual.crossed && visual.caption) return visual.caption;
      // One picture with a spoken name is described by that name: "cat", not "1 🐱".
      if (visual.count === 1 && !visual.count2 && !visual.crossed && visual.speak) return sayText(visual.speak);
      const second = visual.emoji2 !== undefined && visual.count2 ? ` and ${visual.count2} ${visual.emoji2}` : '';
      const crossed = visual.crossed ? `, ${visual.crossed} crossed out` : '';
      const layout =
        visual.layout === 'scatter' ? ', scattered' : visual.layout === 'dice' ? ', as dots on a die' : visual.layout === 'grid5' ? ', in rows of five' : '';
      const caption = visual.caption ? `: ${visual.caption}` : '';
      return `${visual.count} ${visual.emoji}${second}${crossed}${layout}${caption}`;
    }
    case 'text':
      return visual.value;
    case 'shape': {
      const turned = visual.rotation % 360 !== 0 ? `, turned ${visual.rotation} degrees` : '';
      return `${visual.size === 'm' ? '' : visual.size === 's' ? 'small ' : 'large '}${visual.color} ${visual.shape}${visual.flip ? ', flipped' : ''}${visual.open ? ', open' : ''}${turned}`;
    }
    case 'solid':
      return visual.solid;
    case 'tenFrame':
      return `${visual.frames === 2 ? 'two ten frames' : 'ten frame'} with ${plural(visual.filled, 'counter', 'counters')}`;
    case 'baseTen':
      return [
        (visual.thousands ?? 0) > 0 ? plural(visual.thousands ?? 0, 'thousand', 'thousands') : '',
        visual.hundreds > 0 ? plural(visual.hundreds, 'hundred', 'hundreds') : '',
        visual.tens > 0 ? plural(visual.tens, 'ten', 'tens') : '',
        plural(visual.ones, 'one', 'ones'),
      ]
        .filter((part) => part.length > 0)
        .join(', ');
    case 'numberLine': {
      // A dot on a number that is hidden does not name it: the description must not give the answer away.
      const secret = (visual.marked ?? []).filter((value) => (visual.hidden ?? []).includes(value));
      const open = (visual.marked ?? []).filter((value) => !secret.includes(value));
      const name = (value: number): string => (visual.denominator ? partLabel(value, visual.denominator) : String(value));
      const marked = `${open.length > 0 ? `, dot at ${open.map(name).join(' and ')}` : ''}${secret.length > 0 ? ', dot on a hidden number' : ''}`;
      const others = (visual.hidden ?? []).filter((value) => !secret.includes(value));
      const hidden = others.length > 0 ? `, ${plural(others.length, 'number', 'numbers')} hidden` : '';
      if (visual.denominator) return `number line from ${name(visual.min)} to ${name(visual.max)} in parts of ${visual.denominator}${marked}${hidden}`;
      return `number line from ${visual.min} to ${visual.max} by ${visual.step}${marked}${hidden}`;
    }
    case 'equation':
      return visual.parts.map((part) => (part === 'blank' ? '□' : String(part))).join(' ');
    case 'sequence':
      return visual.items.map((item) => describeVisual(item)).join(', ');
    case 'matrix':
      return `grid: ${visual.cells.map((cell) => describeVisual(cell)).join(' | ')}`;
    case 'clock':
      return visual.noHands ? 'clock face with no hands' : `clock showing ${visual.hour}:${String(visual.minute).padStart(2, '0')}`;
    case 'coins':
      return visual.coins.join(', ');
    case 'graph':
      return `${visual.title ? `${visual.title}, ` : ''}${visual.type} graph${visual.scale && visual.scale > 1 ? `, each ${visual.type === 'picture' ? 'picture' : 'step'} is ${visual.scale}` : ''}: ${visual.categories.map((c) => `${c.label} ${c.value}`).join(', ')}`;
    case 'linePlot':
      return `line plot of ${visual.unit}: ${visual.counts.map((count, i) => `${partLabel(visual.min + i, visual.denominator)}, ${count}`).join('; ')}`;
    case 'ruler':
      return `${visual.object} on ${visual.unit ? RULER_OF[visual.unit] : 'a ruler'} from ${visual.startUnit} to ${visual.startUnit + visual.lengthUnits}`;
    case 'fraction': {
      const kind = visual.equal ? 'equal' : 'unequal';
      return `${visual.shape} in ${plural(visual.parts, `${kind} part`, `${kind} parts`)}, ${visual.shaded} shaded`;
    }
    case 'row':
      return visual.children.map((child) => describeVisual(child)).join(' and ');
    case 'bar':
      return `${visual.color} bar ${plural(visual.length, 'unit', 'units')} long`;
    case 'array':
      // One row is "1 row of 7", never "1 rows of 7".
      return `${plural(visual.rows, 'row', 'rows')} of ${visual.cols} ${visual.emoji}`;
    case 'tally':
      return `${plural(visual.count, 'tally mark', 'tally marks')}`;
    case 'figure': {
      const figure = FIGURES[visual.figure];
      const n = figure.slots.length;
      if (visual.show === 'whole') return figure.whole;
      if (visual.show === 'cut') return `${figure.whole} cut into ${plural(n, figure.piece, `${figure.piece}s`)}`;
      return plural(n, figure.piece, `${figure.piece}s`);
    }
    case 'scale':
      return `balance scale: ${visual.left.map((n) => (n === 'blank' ? '□' : n)).join(' and ')} on the left, ${visual.right.join(' and ')} on the right`;
    case 'foldPunch':
      return `${visual.state} paper, ${visual.fold} fold, ${visual.holes.length === 1 ? 'hole' : 'holes'} at ${visual.holes.map((hole) => `(${hole.col},${hole.row})`).join(' ')}`;
    case 'twoRulers':
      return `${visual.object} ${plural(visual.inches, 'inch', 'inches')} long on an inch ruler, and about ${plural(aboutCentimeters(visual.inches), 'centimeter', 'centimeters')} on a centimeter ruler`;
    case 'measuredRect':
      return `rectangle ${sideLabel(visual, 'length')} by ${sideLabel(visual, 'width')}${visual.allSides ? ', every side labelled' : ''}`;
    case 'holders': {
      const [one, many] = visual.holder === 'plate' ? (['plate', 'plates'] as const) : (['basket', 'baskets'] as const);
      if (!visual.filled) return plural(visual.count, `empty ${one}`, `empty ${many}`);
      return `${plural(visual.count, one, many)} with ${visual.filled.each} ${visual.filled.emoji} ${visual.holder === 'plate' ? 'on' : 'in'} each`;
    }
    case 'clipRow':
      return `${visual.object} ${plural(visual.length, 'paper clip', 'paper clips')} long, with ${plural(visual.clips.length, 'paper clip', 'paper clips')} under it${clipWays(visual)}`;
    case 'measuringCup':
      // Like one picture with a spoken name: "a measuring cup", as the ruler and the scale beside it are named.
      return visual.speak ? sayText(visual.speak) : 'measuring cup';
  }
}

const clockText = (time: { hour: number; minute: number }): string => `${time.hour}:${String(time.minute).padStart(2, '0')}`;
const list = (visuals: readonly (Visual | undefined)[]): string => visuals.map((visual) => describeVisual(visual ?? 'blank')).join(', ');

// The right answer to a question, in plain words. Kept in the attempt snapshot, which never changes.
export function describeAnswer(question: Question): string {
  switch (question.type) {
    case 'choice':
      return describeVisual(question.options[question.answerIndex] ?? 'blank');
    case 'multiSelect':
      return list(question.answerIndexes.map((index) => question.options[index]));
    case 'tapCount':
    case 'numberPad':
    case 'tiles':
    case 'columnSum':
    case 'fillShape':
      return String(question.answer);
    case 'numberLineTap':
      return question.line.denominator ? partLabel(question.answer, question.line.denominator) : String(question.answer);
    case 'setClock':
      return clockText(question.answer);
    case 'buildBar':
      return question.categories.map((category, i) => `${category.label} ${question.answer[i] ?? 0}`).join(', ');
    case 'dragWord':
      return describeVisual(question.options[question.answerIndex] ?? 'blank');
    case 'order':
      return list(question.answerOrder.map((index) => question.items[index]));
    case 'sort':
      return question.items.map((item, index) => `${describeVisual(item)}: ${question.bins[question.answerBin[index] ?? -1]?.label ?? '?'}`).join(', ');
    case 'match':
      return question.answerPairs.map(([l, r]) => `${describeVisual(question.left[l] ?? 'blank')} with ${describeVisual(question.right[r] ?? 'blank')}`).join(', ');
  }
}

// What the child answered, in plain words. An answer of the wrong shape is recorded as it is.
export function describeResponse(question: Question, response: Response): string {
  if (question.type === 'choice' && 'index' in response) return describeVisual(question.options[response.index] ?? 'blank');
  if (question.type === 'multiSelect' && 'indexes' in response) return list(response.indexes.map((index) => question.options[index]));
  if (question.type === 'tapCount' && 'count' in response) return String(response.count);
  if (question.type === 'numberPad' && 'value' in response) return String(response.value);
  if (question.type === 'tiles' && 'tiles' in response) return response.tiles.join('');
  if (question.type === 'fillShape' && 'value' in response) return String(response.value);
  if ((question.type === 'numberLineTap' || question.type === 'columnSum') && 'value' in response) {
    return question.type === 'numberLineTap' && question.line.denominator ? partLabel(response.value, question.line.denominator) : String(response.value);
  }
  if (question.type === 'dragWord' && 'index' in response) return describeVisual(question.options[response.index] ?? 'blank');
  if (question.type === 'setClock' && 'time' in response) return clockText(response.time);
  if (question.type === 'buildBar' && 'values' in response) return question.categories.map((category, i) => `${category.label} ${response.values[i] ?? 0}`).join(', ');
  if (question.type === 'order' && 'order' in response) return list(response.order.map((index) => question.items[index]));
  if (question.type === 'sort' && 'bins' in response) {
    return question.items.map((item, index) => `${describeVisual(item)}: ${question.bins[response.bins[index] ?? -1]?.label ?? '?'}`).join(', ');
  }
  if (question.type === 'match' && 'pairs' in response) {
    return response.pairs.map(([l, r]) => `${describeVisual(question.left[l] ?? 'blank')} with ${describeVisual(question.right[r] ?? 'blank')}`).join(', ');
  }
  return JSON.stringify(response);
}

// The question as the child saw it, in plain words.
export function describePrompt(question: Question): string {
  return question.stimulus ? `${question.prompt.text} [${describeVisual(question.stimulus)}]` : question.prompt.text;
}
