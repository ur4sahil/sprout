// Pictures and lists for plan section 15, wave H1 (Math kindergarten and grade 1).
// Every emoji here already has a drawn picture (src/visuals/artList.ts).

export interface Named {
  emoji: string;
  name: string;
}

// Animals standing in a line (ordinal numbers).
export const LINE_ANIMALS: readonly Named[] = [
  { emoji: '🐶', name: 'dog' },
  { emoji: '🐱', name: 'cat' },
  { emoji: '🐰', name: 'rabbit' },
  { emoji: '🐸', name: 'frog' },
  { emoji: '🦆', name: 'duck' },
  { emoji: '🐷', name: 'pig' },
  { emoji: '🐵', name: 'monkey' },
];

// "Is there a carrot for every rabbit?": who needs one, and what each one needs.
export interface EnoughPair {
  emoji: string;
  one: string;
  many: string;
  wantEmoji: string;
  want: string;
  wants: string;
}
export const ENOUGH_PAIRS: readonly EnoughPair[] = [
  { emoji: '🐰', one: 'rabbit', many: 'rabbits', wantEmoji: '🥕', want: 'carrot', wants: 'carrots' },
  { emoji: '🐵', one: 'monkey', many: 'monkeys', wantEmoji: '🍌', want: 'banana', wants: 'bananas' },
  { emoji: '👧', one: 'girl', many: 'girls', wantEmoji: '🎩', want: 'hat', wants: 'hats' },
  { emoji: '🐝', one: 'bee', many: 'bees', wantEmoji: '🌸', want: 'flower', wants: 'flowers' },
  { emoji: '🐭', one: 'mouse', many: 'mice', wantEmoji: '🧀', want: 'piece of cheese', wants: 'pieces of cheese' },
  { emoji: '🐶', one: 'dog', many: 'dogs', wantEmoji: '⚽', want: 'ball', wants: 'balls' },
];

// Heavier and lighter, holds more and holds less. Things are only ever compared with things of another
// tier, so the answer is plain to a child: a tier is a rough size class, 0 the lightest or smallest.
export interface Tiered extends Named {
  tier: number;
}
export const WEIGHT_THINGS: readonly Tiered[] = [
  { emoji: '🐘', name: 'elephant', tier: 3 },
  { emoji: '🚚', name: 'truck', tier: 3 },
  { emoji: '🚗', name: 'car', tier: 3 },
  { emoji: '🐄', name: 'cow', tier: 2 },
  { emoji: '🐴', name: 'horse', tier: 2 },
  { emoji: '🐶', name: 'dog', tier: 1 },
  { emoji: '🚲', name: 'bike', tier: 1 },
  { emoji: '🎃', name: 'pumpkin', tier: 1 },
  { emoji: '🍎', name: 'apple', tier: 0 },
  { emoji: '🔑', name: 'key', tier: 0 },
  { emoji: '🍃', name: 'leaf', tier: 0 },
  { emoji: '✏️', name: 'pencil', tier: 0 },
];
export const HOLD_THINGS: readonly Tiered[] = [
  { emoji: '🥄', name: 'spoon', tier: 0 },
  { emoji: '🥤', name: 'cup', tier: 1 },
  { emoji: '🥛', name: 'glass', tier: 1 },
  { emoji: '🍲', name: 'pot', tier: 2 },
  { emoji: '🛁', name: 'bathtub', tier: 3 },
];

// Things that are shaped like a flat or a solid shape.
export interface Shaped extends Named {
  shape: 'circle' | 'triangle' | 'rectangle' | 'sphere' | 'cylinder' | 'cube';
}
export const FLAT_THINGS: readonly Shaped[] = [
  { emoji: '🕐', name: 'clock', shape: 'circle' },
  { emoji: '🍪', name: 'cookie', shape: 'circle' },
  { emoji: '🍕', name: 'pizza slice', shape: 'triangle' },
  { emoji: '⛺', name: 'tent', shape: 'triangle' },
  { emoji: '🚪', name: 'door', shape: 'rectangle' },
  { emoji: '📱', name: 'phone', shape: 'rectangle' },
];
export const SOLID_THINGS: readonly Shaped[] = [
  { emoji: '⚽', name: 'ball', shape: 'sphere' },
  { emoji: '🏀', name: 'basketball', shape: 'sphere' },
  { emoji: '🥫', name: 'can', shape: 'cylinder' },
  { emoji: '🕯️', name: 'candle', shape: 'cylinder' },
  { emoji: '📦', name: 'box', shape: 'cube' },
  { emoji: '🎁', name: 'present', shape: 'cube' },
];

export const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const;
export const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'] as const;

// Tally charts: what the children voted for, and the things on the chart.
export interface Vote {
  question: string; // "Children voted for their favourite pet."
  asked: string; // "chose" or "came by"
  rows: readonly { emoji: string; label: string }[];
}
export const VOTES: readonly Vote[] = [
  { question: 'Children voted for their favourite pet.', asked: 'chose', rows: [{ emoji: '🐶', label: 'dogs' }, { emoji: '🐱', label: 'cats' }, { emoji: '🐟', label: 'fish' }] },
  { question: 'Children voted for their favourite fruit.', asked: 'chose', rows: [{ emoji: '🍎', label: 'apples' }, { emoji: '🍌', label: 'bananas' }, { emoji: '🍇', label: 'grapes' }] },
  { question: 'Children told how they came to school.', asked: 'came by', rows: [{ emoji: '🚗', label: 'car' }, { emoji: '🚌', label: 'bus' }, { emoji: '🚲', label: 'bike' }] },
];

// Made-up first names for stories.
export const STORY_NAMES = ['Mia', 'Leo', 'Ava', 'Sam', 'Zoe', 'Ben', 'Ivy', 'Max'] as const;
