import { COLORS } from '../content/data/colors';

// Every colour the pictures are drawn with, in one place.
// Colours a child is asked about by name come from the colour list. The rest are named here.
export const PALETTE = {
  ink: '#1f2a30', // outlines and text. Matches --color-ink in tokens.css
  paper: '#ffffff',
  counter: COLORS.red, // ten-frame counters and number-line dots
  minuteHand: COLORS.blue,
  shade: COLORS.blue, // the shaded part of a fraction
  cross: '#c62828', // crossed-out objects. Matches --color-cross in tokens.css
  solidLight: '#9cc7f0',
  solidMid: '#5fa3e0',
  solidDark: '#2f79c2',
  hundred: '#8ecae6',
  ten: '#a7d67a',
  one: '#f4c152',
  block: '#f4c152', // number blocks on the balance scale
  pan: '#b0bec5',
  stand: '#78909c',
  pencil: COLORS.yellow,
  pencilWood: '#f1d3a8',
  eraser: COLORS.pink,
  crayon: COLORS.red,
  crayonTip: '#c62828',
  ribbon: COLORS.purple,
  ruler: '#f4e3b1',
  foldPaper: '#fff8e1',
  copper: '#b8733a',
  silver: '#c4c8cc',
  bars: [COLORS.blue, COLORS.orange, COLORS.green, COLORS.purple, COLORS.red],
} as const;
