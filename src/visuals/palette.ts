import { COLORS } from '../content/data/colors';

// Every colour the pictures are drawn with, in one place.
// Colours a child is asked about by name come from the colour list. The rest are named here.
export const PALETTE = {
  ink: '#16213a', // outlines and text. Matches --color-ink in tokens.css
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
  // The lesson host, a sprout with a face (plan section 16), and the scene it stands in.
  hostBody: '#7cc66b',
  hostShade: '#5aa84a',
  hostLeaf: '#4f9e3f',
  hostCheek: '#f6a6a6',
  hostMouth: '#8a2f3b',
  wall: '#fdf3e1',
  wallStripe: '#f8e6c6',
  tableTop: '#c98b52',
  tableEdge: '#a86d3b',
  tableLeg: '#94602f',
  confetti: [COLORS.red, COLORS.yellow, COLORS.blue, COLORS.green, COLORS.purple, COLORS.orange],
} as const;
