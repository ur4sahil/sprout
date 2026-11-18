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
  // --- the cast (plan section 19, phase 3). Sprout keeps the host colours above. ---
  pipShell: '#e5484d', // Pip the ladybug: the red wings
  pipDark: '#2b2d42', // her head, spots, arms and feet
  pipCheek: '#ff9aa2',
  pipMouth: '#ff8f8f', // bright, so an open mouth shows on her dark face
  oliveBody: '#b9855a', // Olive the owl
  oliveDark: '#8a5a36', // her wings, ear tufts and brows
  oliveCream: '#fbeed6', // her eye discs and tummy
  oliveBeak: '#f2a33a', // and her feet
  finnBody: '#3fae7d', // Finn the frog: a bluer green than Sprout, so the two are never mixed up
  finnShade: '#2c8a61', // his back legs, feet, arms and brows
  finnThroat: '#dff5c9',
  // --- end of the cast ---
  // ---- the garden (game feel, phase 4): the home scene, its plants and its path ----
  garden: {
    // the sky at each time of day, top then bottom
    sky: {
      morning: ['#9fd4f5', '#fdf0d5'],
      afternoon: ['#6fb9ee', '#d6eefb'],
      evening: ['#6a6fb5', '#f7b58a'],
      night: ['#141c3d', '#2d3a6b'],
    },
    // a wash over the whole scene late in the day, so the plants dim with the sky
    tint: { morning: '#ffffff', afternoon: '#ffffff', evening: '#f08a4b', night: '#101a44' },
    cloud: '#ffffff',
    starlight: '#fff6c9',
    hillFar: '#a9d6a0',
    hillMid: '#86c47b',
    grass: '#74b95f',
    grassFront: '#62a84f',
    grassBlade: '#4f9440',
    trunk: '#8a5a33',
    tree: '#4c9a48',
    treeLight: '#69b35c',
    bush: '#5aa84a',
    soil: '#7a5236',
    soilEdge: '#5f3e27',
    soilLight: '#94684a',
    stone: '#d9d4c7',
    stoneEdge: '#b3ad9d',
    stoneNext: '#fff3c4',
    stoneLocked: '#c3c6cc',
    stem: '#4f9e3f',
    leaf: '#62b24f',
    leafDark: '#3f8a35',
    bud: '#7cc66b',
    packet: '#fdf3e1',
    packetBand: '#e9a13b',
    packetStick: '#b98a5a',
    can: '#5aa9e6',
    canDark: '#3b83c4',
    water: '#bfe3fb',
    petalPink: '#f28cb1',
    petalYellow: '#f9cf45',
    petalWhite: '#ffffff',
    petalPurple: '#a57be0',
    petalBlue: '#6aa5f0',
    petalOrange: '#f59a4a',
    petalRed: '#ea5f5f',
    centreGold: '#f2a900',
    centreBrown: '#7a4a21',
    centreCream: '#fff1b8',
    cattail: '#7a4a21',
    butterfly: '#f59a4a',
    butterflyBody: '#5a3a22',
    bee: '#f9cf45',
    beeStripe: '#3a2b1a',
    wing: '#eaf6ff',
    sunCore: '#f9cf45',
    sunEmpty: '#fff6d6',
    sunRay: '#f2a900',
    sunEdge: '#e39a00',
    wood: '#c98b52',
    woodDark: '#94602f',
    pond: '#6fb9ee',
    pondLight: '#a9d8f7',
    lilyPad: '#4c9a48',
    hay: '#eac25c',
    hayDark: '#c99a34',
    mushroom: '#ea5f5f',
    mushroomStem: '#fdf3e1',
    basket: '#c98b52',
    basketDark: '#94602f',
    padlock: '#55617a',
    pencil: '#f9cf45',
    pencilTip: '#5a3a22',
  },
  // ---- end of the garden ----
} as const;
