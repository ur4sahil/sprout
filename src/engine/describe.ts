import type { Question, Response, Say, SayPart, Visual } from './types';

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

export function describeVisual(visual: Visual | 'blank'): string {
  if (visual === 'blank') return 'blank';
  switch (visual.kind) {
    case 'emojiGroup': {
      // One picture with a spoken name is described by that name: "cat", not "1 🐱".
      if (visual.count === 1 && !visual.count2 && !visual.crossed && visual.speak) return sayText(visual.speak);
      const second = visual.emoji2 !== undefined && visual.count2 ? ` and ${visual.count2} ${visual.emoji2}` : '';
      const crossed = visual.crossed ? `, ${visual.crossed} crossed out` : '';
      const layout =
        visual.layout === 'scatter' ? ', scattered' : visual.layout === 'dice' ? ', as dots on a die' : visual.layout === 'grid5' ? ', in rows of five' : '';
      return `${visual.count} ${visual.emoji}${second}${crossed}${layout}`;
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
      const marked = `${open.length > 0 ? `, dot at ${open.join(' and ')}` : ''}${secret.length > 0 ? ', dot on a hidden number' : ''}`;
      const others = (visual.hidden ?? []).filter((value) => !secret.includes(value));
      const hidden = others.length > 0 ? `, ${plural(others.length, 'number', 'numbers')} hidden` : '';
      return `number line from ${visual.min} to ${visual.max} by ${visual.step}${marked}${hidden}`;
    }
    case 'equation':
      return visual.parts.map((part) => (part === 'blank' ? '□' : String(part))).join(' ');
    case 'sequence':
      return visual.items.map((item) => describeVisual(item)).join(', ');
    case 'matrix':
      return `grid: ${visual.cells.map((cell) => describeVisual(cell)).join(' | ')}`;
    case 'clock':
      return `clock showing ${visual.hour}:${String(visual.minute).padStart(2, '0')}`;
    case 'coins':
      return visual.coins.join(', ');
    case 'graph':
      return `${visual.type} graph: ${visual.categories.map((c) => `${c.label} ${c.value}`).join(', ')}`;
    case 'ruler':
      return `${visual.object} on a ruler from ${visual.startUnit} to ${visual.startUnit + visual.lengthUnits}`;
    case 'fraction':
      return `${visual.shape} in ${visual.parts} ${visual.equal ? 'equal' : 'unequal'} parts, ${visual.shaded} shaded`;
    case 'row':
      return visual.children.map((child) => describeVisual(child)).join(' and ');
    case 'bar':
      return `${visual.color} bar ${plural(visual.length, 'unit', 'units')} long`;
    case 'array':
      return `${visual.rows} rows of ${visual.cols} ${visual.emoji}`;
    case 'tally':
      return `${plural(visual.count, 'tally mark', 'tally marks')}`;
    case 'scale':
      return `balance scale: ${visual.left.map((n) => (n === 'blank' ? '□' : n)).join(' and ')} on the left, ${visual.right.join(' and ')} on the right`;
    case 'foldPunch':
      return `${visual.state} paper, ${visual.fold} fold, holes at ${visual.holes.map((hole) => `(${hole.col},${hole.row})`).join(' ')}`;
  }
}

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
      return String(question.answer);
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
