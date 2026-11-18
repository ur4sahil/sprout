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
  // ---- collecting (game feel, phase 7): the animals that move into the garden ----
  visitors: {
    eye: '#16213a',
    nose: '#3a2b1a',
    cheek: '#f6a6a6',
    white: '#ffffff',
    hedgehog: '#8a6a4f',
    hedgehogDark: '#5f4632',
    hedgehogFace: '#ecd3ad',
    rabbit: '#cdbba7',
    rabbitInner: '#f4c6c6',
    rabbitTail: '#ffffff',
    deer: '#b97a45',
    deerLight: '#f3e3c8',
    antler: '#7a5236',
    snailShell: '#d98a4a',
    snailSwirl: '#a85f2a',
    snailBody: '#c9d8a0',
    squirrel: '#c0682e',
    squirrelBelly: '#f2d2a9',
    fox: '#e8762f',
    foxDark: '#4a2e1f',
    duck: '#f9cf45',
    duckWing: '#e9b52e',
    beak: '#f59a4a',
    turtleShell: '#5f9a4a',
    turtlePlate: '#7fb865',
    turtleSkin: '#a7d17f',
    swan: '#ffffff',
    swanShade: '#dfe8ef',
    ripple: '#a9d8f7',
  },
  // ---- end of collecting ----
  // ---- lessons 2.0 (game feel, phase 6): the place behind each lesson ----
  // `ground` colours fill the big areas pieces stand on; `trim` colours draw the small things around the edges.
  // Both are pale, so a dark numeral and the lit ring read on every one (tests/lessons/backdrops.test.ts).
  places: {
    picnic: {
      ground: { sky: '#e4f3fb', grass: '#d6eec5', blanket: '#fde7e4' },
      trim: { hill: '#d3ecc6', sun: '#fdeeb5', cloud: '#ffffff', check: '#f7d0cb' },
    },
    stall: {
      ground: { wall: '#fff7ec', counterTop: '#f1dcbf', counter: '#f7e8d3' },
      trim: { awningA: '#f9d3c4', awningB: '#fffaf3', pole: '#ead6bd', plank: '#ead3b4' },
    },
    workshop: {
      ground: { board: '#eef0f3', benchTop: '#efd8b5', bench: '#f6e7cf' },
      trim: { peg: '#dfe3e9', tool: '#dde2e8', benchLine: '#e8d1ad' },
    },
    site: {
      ground: { sky: '#e6f2fb', plank: '#f7e2b8', sand: '#f4e7cc' },
      trim: { crane: '#f5dfa6', brick: '#f3d5c4', cone: '#fbd9b8', cloud: '#ffffff' },
    },
    shop: {
      ground: { wall: '#f2f6ee', counterTop: '#e7e0f0', counter: '#f3eff8' },
      trim: { shelf: '#e4dccd', jarA: '#d9ecf7', jarB: '#f8e0d2', panel: '#e9e3f2' },
    },
    treehouse: {
      ground: { boards: '#edf3df', floorTop: '#ecd5b2', floor: '#f5e6cd' },
      trim: { boardLine: '#e0eacb', window: '#dff0fb', frame: '#e6d3b5', leaf: '#cfe6b8', floorLine: '#e7d0aa' },
    },
    nook: {
      ground: { wall: '#f5effa', rug: '#fdeee0', floor: '#f3e6d6' },
      trim: { shelf: '#e9dccb', bookA: '#f5d3d8', bookB: '#d6e6f6', bookC: '#e3f0d2', rugEdge: '#f6dcc4' },
    },
    pond: {
      ground: { sky: '#e3f3fb', bank: '#d7ecc8', water: '#d7edf8' },
      trim: { reed: '#cde3bd', cattail: '#e3cfb8', ripple: '#c6e3f3', pad: '#d3ebc3' },
    },
  },
  // ---- end of lessons 2.0 ----
  // ---- the stories (game feel, phase 7): the backdrops of "The Garden Year" ----
  story: {
    window: '#cfe3f2', // the sky through the treehouse window
    fence: '#e8d3b0',
    fenceEdge: '#c4a57a',
    meadowFar: '#bfe0a6',
    meadowFlower: '#f6d36b',
    woodsSky: '#cfe8d2',
    woodsFar: '#7fb47a',
    woodsFloor: '#7e9a57',
    path: '#d8c49a',
    brook: '#8cc8ee',
    plank: '#d9a46a',
    plankLine: '#9a6638',
    rug: '#e86a6a',
    moon: '#fff2b8',
    nightHill: '#24406a',
    nightGrass: '#2f5a4a',
    nightBush: '#24493c',
    sign: '#d9a46a',
    signEdge: '#8a5a33',
  },
  // ---- end of the stories ----
  // ---- seasons (game feel, phase 8): the garden's sky, hills, grass and trees through the year ----
  // Only the scenery changes. Flowers, stems, soil, stones and the sun keep their own colours in every season,
  // so a child's blooms never look dead and the path always stands out against the grass.
  seasons: {
    spring: {
      sky: { morning: ['#a6daf7', '#fdf2e2'], afternoon: ['#79c0f0', '#dcf1fb'] },
      hillFar: '#b6e1a6',
      hillMid: '#92cf80',
      grass: '#7cc464',
      grassFront: '#69b552',
      tree: '#58a94f',
      treeLight: '#f5bcd2', // trees in blossom
      petal: '#f7c3d8',
      petalLight: '#fff0f5',
    },
    summer: {
      sky: { morning: ['#8ccdf6', '#fdf0cf'], afternoon: ['#5cb2ef', '#d2edfb'] },
      hillFar: '#a2d391',
      hillMid: '#7cbf6c',
      grass: '#6db456',
      grassFront: '#5ba346',
      tree: '#3f8f3d',
      treeLight: '#58a64a',
      sun: '#ffd84a',
      sunGlow: '#fff3b0',
    },
    autumn: {
      sky: { morning: ['#a9cfe8', '#fbe9cf'], afternoon: ['#86bde6', '#f4e6d2'] },
      hillFar: '#cfc98f',
      hillMid: '#b4b56c',
      grass: '#93b65c',
      grassFront: '#84a84e',
      tree: '#e08a3c',
      treeLight: '#e9b949',
      leaf: '#e8762f',
      leafGold: '#f0b13a',
    },
    winter: {
      sky: { morning: ['#bcd8ec', '#eef4f8'], afternoon: ['#a2c9e8', '#e6f0f7'] },
      hillFar: '#dbe7ee',
      hillMid: '#a9c79c',
      grass: '#97bd86',
      grassFront: '#86ae76',
      tree: '#2f6f4f', // evergreens
      treeLight: '#4a8a63',
      snow: '#ffffff',
      snowShade: '#e4eef6',
    },
  },
  // ---- end of seasons ----
} as const;
