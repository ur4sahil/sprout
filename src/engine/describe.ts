import type { Say, SayPart, Visual } from './types';

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
        visual.hundreds > 0 ? plural(visual.hundreds, 'hundred', 'hundreds') : '',
        visual.tens > 0 ? plural(visual.tens, 'ten', 'tens') : '',
        plural(visual.ones, 'one', 'ones'),
      ]
        .filter((part) => part.length > 0)
        .join(', ');
    case 'numberLine': {
      const marked = visual.marked && visual.marked.length > 0 ? `, dot at ${visual.marked.join(' and ')}` : '';
      const hidden = visual.hidden && visual.hidden.length > 0 ? `, ${plural(visual.hidden.length, 'number', 'numbers')} hidden` : '';
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
