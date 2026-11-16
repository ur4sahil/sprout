import type { Visual } from '../../engine/types';
import { unfoldHoles } from '../../visuals/geometry';

// One or more samples of every kind of picture, for the dev gallery and its tests.
const t = (value: string, size: 'm' | 'l' | 'xl' = 'l'): Visual => ({ kind: 'text', value, size });
const shape = (name: Extract<Visual, { kind: 'shape' }>['shape'], color: string, extra: Partial<Extract<Visual, { kind: 'shape' }>> = {}): Visual => ({
  kind: 'shape',
  shape: name,
  color,
  size: 'm',
  rotation: 0,
  ...extra,
});

export interface GallerySection {
  title: string;
  samples: { label: string; visual: Visual }[];
}

export const GALLERY: GallerySection[] = [
  {
    title: 'emojiGroup',
    samples: [
      { label: 'row of 5', visual: { kind: 'emojiGroup', emoji: '🍎', count: 5, layout: 'row' } },
      { label: 'grid5 of 12', visual: { kind: 'emojiGroup', emoji: '⭐', count: 12, layout: 'grid5' } },
      { label: 'scatter of 7', visual: { kind: 'emojiGroup', emoji: '🐞', count: 7, layout: 'scatter', slots: [0, 3, 6, 9, 12, 15, 18] } },
      { label: 'dice 5', visual: { kind: 'emojiGroup', emoji: '⚫', count: 5, layout: 'dice' } },
      { label: 'dice 6', visual: { kind: 'emojiGroup', emoji: '⚫', count: 6, layout: 'dice' } },
      { label: '6, 2 crossed', visual: { kind: 'emojiGroup', emoji: '🍪', count: 6, layout: 'row', crossed: 2 } },
      { label: 'numbered', visual: { kind: 'emojiGroup', emoji: '🐸', count: 4, layout: 'row', numbered: true } },
      { label: 'two kinds', visual: { kind: 'emojiGroup', emoji: '🔴', count: 3, layout: 'row', emoji2: '🔵', count2: 2 } },
    ],
  },
  {
    title: 'text',
    samples: [
      { label: 'm', visual: t('cat', 'm') },
      { label: 'l', visual: t('B', 'l') },
      { label: 'xl', visual: t('7', 'xl') },
    ],
  },
  {
    title: 'shape',
    samples: [
      ...(['circle', 'square', 'triangle', 'rectangle', 'hexagon', 'star', 'heart', 'oval', 'diamond', 'pentagon', 'trapezoid', 'arrow', 'lShape', 'flag'] as const).map((name, i) => ({
        label: name,
        visual: shape(name, ['red', 'blue', 'yellow', 'green', 'orange', 'purple', 'pink', 'brown', 'black'][i % 9] as string),
      })),
      { label: 'small', visual: shape('circle', 'red', { size: 's' }) },
      { label: 'large', visual: shape('circle', 'red', { size: 'l' }) },
      { label: 'L turned 90', visual: shape('lShape', 'blue', { rotation: 90 }) },
      { label: 'L flipped', visual: shape('lShape', 'blue', { flip: true }) },
      { label: 'flag flipped', visual: shape('flag', 'red', { flip: true }) },
      { label: 'arrow turned 90', visual: shape('arrow', 'green', { rotation: 90 }) },
      { label: 'open circle', visual: shape('circle', 'blue', { open: true }) },
      { label: 'open square', visual: shape('square', 'green', { open: true }) },
    ],
  },
  {
    title: 'solid',
    samples: (['cube', 'sphere', 'cone', 'cylinder'] as const).map((solid) => ({ label: solid, visual: { kind: 'solid', solid } })),
  },
  {
    title: 'tenFrame',
    samples: [
      { label: '7 of 10', visual: { kind: 'tenFrame', filled: 7, frames: 1 } },
      { label: '0', visual: { kind: 'tenFrame', filled: 0, frames: 1 } },
      { label: '14 of 20', visual: { kind: 'tenFrame', filled: 14, frames: 2 } },
    ],
  },
  {
    title: 'baseTen',
    samples: [
      { label: '34', visual: { kind: 'baseTen', hundreds: 0, tens: 3, ones: 4 } },
      { label: '9 ones', visual: { kind: 'baseTen', hundreds: 0, tens: 0, ones: 9 } },
      { label: '243', visual: { kind: 'baseTen', hundreds: 2, tens: 4, ones: 3 } },
    ],
  },
  {
    title: 'numberLine',
    samples: [
      { label: '0 to 10, dot at 4', visual: { kind: 'numberLine', min: 0, max: 10, step: 1, marked: [4] } },
      { label: 'by 5s, one hidden', visual: { kind: 'numberLine', min: 0, max: 50, step: 5, hidden: [25] } },
      { label: 'by 100s', visual: { kind: 'numberLine', min: 100, max: 900, step: 100, marked: [600], hidden: [600] } },
    ],
  },
  {
    title: 'equation',
    samples: [
      { label: 'blank at the end', visual: { kind: 'equation', parts: [3, '+', 4, '=', 'blank'] } },
      { label: 'blank in the middle', visual: { kind: 'equation', parts: [3, '+', 'blank', '=', 7] } },
      { label: 'blank on the left', visual: { kind: 'equation', parts: ['blank', '=', 9, '-', 4] } },
      { label: 'signs', visual: { kind: 'equation', parts: [48, '>', 39] } },
    ],
  },
  {
    title: 'sequence',
    samples: [
      { label: 'shapes', visual: { kind: 'sequence', items: [shape('circle', 'red', { size: 's' }), shape('square', 'blue', { size: 's' }), shape('circle', 'red', { size: 's' }), shape('square', 'blue', { size: 's' }), 'blank'] } },
      { label: 'numbers', visual: { kind: 'sequence', items: [t('5'), t('10'), 'blank', t('20')] } },
    ],
  },
  {
    title: 'matrix',
    samples: [
      { label: '2 by 2', visual: { kind: 'matrix', cells: [shape('circle', 'red', { size: 's' }), shape('circle', 'blue', { size: 's' }), shape('square', 'red', { size: 's' }), 'blank'] } },
      {
        label: '3 by 3',
        visual: {
          kind: 'matrix',
          cells: [
            shape('circle', 'red', { size: 's' }),
            shape('circle', 'blue', { size: 's' }),
            shape('circle', 'green', { size: 's' }),
            shape('square', 'red', { size: 's' }),
            shape('square', 'blue', { size: 's' }),
            shape('square', 'green', { size: 's' }),
            shape('triangle', 'red', { size: 's' }),
            shape('triangle', 'blue', { size: 's' }),
            'blank',
          ],
        },
      },
    ],
  },
  {
    title: 'clock',
    samples: [
      { label: '3:00', visual: { kind: 'clock', hour: 3, minute: 0 } },
      { label: '3:30', visual: { kind: 'clock', hour: 3, minute: 30 } },
      { label: '12:45', visual: { kind: 'clock', hour: 12, minute: 45 } },
      { label: '7:20', visual: { kind: 'clock', hour: 7, minute: 20 } },
    ],
  },
  {
    title: 'coins',
    samples: [
      { label: 'one of each', visual: { kind: 'coins', coins: ['penny', 'nickel', 'dime', 'quarter'] } },
      { label: 'a handful', visual: { kind: 'coins', coins: ['quarter', 'dime', 'dime', 'nickel', 'penny', 'penny'] } },
    ],
  },
  {
    title: 'graph',
    samples: [
      {
        label: 'picture',
        visual: { kind: 'graph', type: 'picture', categories: [{ label: 'apples', emoji: '🍎', value: 4 }, { label: 'bananas', emoji: '🍌', value: 2 }, { label: 'cookies', emoji: '🍪', value: 5 }] },
      },
      {
        label: 'bar',
        visual: { kind: 'graph', type: 'bar', categories: [{ label: 'ducks', emoji: '🦆', value: 3 }, { label: 'frogs', emoji: '🐸', value: 6 }, { label: 'bees', emoji: '🐝', value: 1 }] },
      },
    ],
  },
  {
    title: 'ruler',
    samples: [
      { label: 'pencil, 0 to 4', visual: { kind: 'ruler', lengthUnits: 4, startUnit: 0, object: 'pencil' } },
      { label: 'crayon, 2 to 5', visual: { kind: 'ruler', lengthUnits: 3, startUnit: 2, object: 'crayon' } },
      { label: 'ribbon, 1 to 8', visual: { kind: 'ruler', lengthUnits: 7, startUnit: 1, object: 'ribbon' } },
    ],
  },
  {
    title: 'fraction',
    samples: [
      { label: 'halves', visual: { kind: 'fraction', shape: 'circle', parts: 2, shaded: 1, equal: true } },
      { label: 'fourths', visual: { kind: 'fraction', shape: 'circle', parts: 4, shaded: 3, equal: true } },
      { label: 'unequal circle', visual: { kind: 'fraction', shape: 'circle', parts: 3, shaded: 1, equal: false } },
      { label: 'thirds', visual: { kind: 'fraction', shape: 'rectangle', parts: 3, shaded: 2, equal: true } },
      { label: 'unequal rectangle', visual: { kind: 'fraction', shape: 'rectangle', parts: 4, shaded: 1, equal: false } },
    ],
  },
  {
    title: 'row',
    samples: [{ label: 'two groups', visual: { kind: 'row', children: [{ kind: 'emojiGroup', emoji: '🚗', count: 3, layout: 'row' }, { kind: 'emojiGroup', emoji: '🚗', count: 5, layout: 'grid5' }] } }],
  },
  {
    title: 'bar',
    samples: [
      { label: 'horizontal 3', visual: { kind: 'bar', length: 3, color: 'red', orientation: 'horizontal' } },
      { label: 'horizontal 7', visual: { kind: 'bar', length: 7, color: 'blue', orientation: 'horizontal' } },
      { label: 'vertical 4', visual: { kind: 'bar', length: 4, color: 'green', orientation: 'vertical' } },
    ],
  },
  { title: 'array', samples: [{ label: '3 rows of 4', visual: { kind: 'array', rows: 3, cols: 4, emoji: '⭐' } }] },
  {
    title: 'tally',
    samples: [
      { label: '3', visual: { kind: 'tally', count: 3 } },
      { label: '5', visual: { kind: 'tally', count: 5 } },
      { label: '13', visual: { kind: 'tally', count: 13 } },
    ],
  },
  {
    title: 'scale',
    samples: [
      { label: '3 and blank against 8', visual: { kind: 'scale', left: [3, 'blank'], right: [8] } },
      { label: '10 against 4 and 6', visual: { kind: 'scale', left: [10], right: [4, 6] } },
    ],
  },
  {
    title: 'foldPunch',
    samples: [
      { label: 'folded, vertical', visual: { kind: 'foldPunch', fold: 'vertical', state: 'folded', holes: [{ col: 0, row: 0 }] } },
      { label: 'unfolded, vertical', visual: { kind: 'foldPunch', fold: 'vertical', state: 'unfolded', holes: unfoldHoles('vertical', [{ col: 0, row: 0 }]) } },
      { label: 'folded, horizontal', visual: { kind: 'foldPunch', fold: 'horizontal', state: 'folded', holes: [{ col: 1, row: 1 }, { col: 3, row: 0 }] } },
      { label: 'unfolded, horizontal', visual: { kind: 'foldPunch', fold: 'horizontal', state: 'unfolded', holes: unfoldHoles('horizontal', [{ col: 1, row: 1 }, { col: 3, row: 0 }]) } },
    ],
  },
];
