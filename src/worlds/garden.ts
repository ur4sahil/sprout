import { PALETTE } from '../visuals/palette';
import type { World } from './types';

const C = PALETTE.garden;
const S = PALETTE.seasons;

// Sprout's garden: the first world. Each skill is a plant; practice makes it grow and mastery makes it bloom.
export const GARDEN: World = {
  id: 'garden',
  name: 'Garden',
  words: {
    home: 'garden',
    path: "today's path",
    review: 'water your plants',
    stages: ['a seed', 'a sprout', 'a plant', 'a bud', 'in bloom'],
  },
  palette: {
    '--world-accent': 'var(--color-brand)',
    '--world-accent-soft': 'var(--color-brand-soft)',
    '--world-glow': 'var(--color-star)',
  },
  particles: { right: 'sparkle', milestone: 'petal', colours: ['var(--color-star)', 'var(--color-brand)', 'var(--color-petal)', 'var(--color-sky)'] },
  // The garden itself (game feel, phase 4): three areas, the flowers that grow in each, and its words.
  home: {
    title: 'Your garden',
    areas: {
      math: {
        name: 'Number Meadow',
        say: ['Number Meadow'],
        landmark: 'hay',
        kinds: [
          { id: 'daisy', head: 'daisy', petal: C.petalWhite, centre: C.centreGold },
          { id: 'sunflower', head: 'daisy', petal: C.petalYellow, centre: C.centreBrown },
          { id: 'tulip', head: 'tulip', petal: C.petalRed, centre: C.petalOrange },
          { id: 'clover', head: 'puff', petal: C.petalPink, centre: C.centreCream },
        ],
      },
      ela: {
        name: 'Word Woods',
        say: ['Word Woods'],
        landmark: 'log',
        kinds: [
          { id: 'bluebell', head: 'bell', petal: C.petalBlue, centre: C.centreCream },
          { id: 'starflower', head: 'star', petal: C.petalPurple, centre: C.centreGold },
          { id: 'foxglove', head: 'bell', petal: C.petalPink, centre: C.centreCream },
          { id: 'primrose', head: 'daisy', petal: C.petalOrange, centre: C.centreGold },
        ],
      },
      reasoning: {
        name: 'Puzzle Pond',
        say: ['Puzzle Pond'],
        landmark: 'pond',
        kinds: [
          { id: 'cattail', head: 'cattail', petal: C.cattail, centre: C.centreCream },
          { id: 'iris', head: 'tulip', petal: C.petalPurple, centre: C.petalYellow },
          { id: 'lotus', head: 'star', petal: C.petalPink, centre: C.centreGold },
          { id: 'allium', head: 'puff', petal: C.petalBlue, centre: C.petalWhite },
        ],
      },
    },
    stages: ['A seed packet', 'A little sprout', 'A plant with a bud', 'A bud opening', 'In full bloom'],
    // Said straight after the skill's name: "Count to ten is a little sprout."
    stageSay: [['is a seed, ready to plant.'], ['is a little sprout.'], ['is a plant with a bud.'], ['has a bud that is opening.'], ['is in full bloom.']],
    thirsty: 'Ready for some water',
    thirstySay: ['It is ready for some water.'],
    path: { start: 'Follow the path', going: 'Keep going', done: 'Path done!' },
    stones: { review: 'Water your plants', practice: 'Practice', fresh: 'A new seed', mixed: 'The basket', locked: 'The basket opens after you practice two topics', done: 'Done' },
    sun: "Today's sun",
    card: { practice: 'Practice', lesson: 'Lesson', close: 'Close', hear: 'Hear it' },
    signpost: { open: 'Places', close: 'Back to the garden', math: 'All Math skills', ela: 'All Language Arts skills', reasoning: 'All Reasoning skills', stickers: 'Stickers', facts: 'Fast facts', switch: 'Switch child' },
  },
  sounds: { tap: 'tap', pick: 'pick', drop: 'drop', right: 'right', next: 'whoosh-in', open: 'open', close: 'close', star: 'star' },
  // The garden through the year (game feel, phase 8): only the scenery changes; every flower keeps its colours.
  seasons: {
    spring: { sky: S.spring.sky, hillFar: S.spring.hillFar, hillMid: S.spring.hillMid, grass: S.spring.grass, grassFront: S.spring.grassFront, tree: S.spring.tree, treeLight: S.spring.treeLight, touch: 'blossom', touchColours: [S.spring.petal, S.spring.petalLight] },
    summer: { sky: S.summer.sky, hillFar: S.summer.hillFar, hillMid: S.summer.hillMid, grass: S.summer.grass, grassFront: S.summer.grassFront, tree: S.summer.tree, treeLight: S.summer.treeLight, touch: 'sun', touchColours: [S.summer.sun, S.summer.sunGlow] },
    autumn: { sky: S.autumn.sky, hillFar: S.autumn.hillFar, hillMid: S.autumn.hillMid, grass: S.autumn.grass, grassFront: S.autumn.grassFront, tree: S.autumn.tree, treeLight: S.autumn.treeLight, touch: 'leaves', touchColours: [S.autumn.leaf, S.autumn.leafGold] },
    winter: { sky: S.winter.sky, hillFar: S.winter.hillFar, hillMid: S.winter.hillMid, grass: S.winter.grass, grassFront: S.winter.grassFront, tree: S.winter.tree, treeLight: S.winter.treeLight, hillEdge: S.winter.snow, touch: 'snow', touchColours: [S.winter.snow, S.winter.snowShade] },
  },
};
