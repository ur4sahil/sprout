// Things to weigh and fill, for Math grade 3 F.5 (plan section 8). A typical mass in grams, or how much a
// container holds in liters. The unit a child should pick follows from these numbers: under 1,000 grams is
// grams, a thousand or more is kilograms, and anything that holds water is liters.

export interface Measured {
  emoji: string;
  name: string; // "an apple"
  grams?: number;
  liters?: number;
}

export const MEASURED: readonly Measured[] = [
  { emoji: '🍎', name: 'an apple', grams: 150 },
  { emoji: '✏️', name: 'a pencil', grams: 5 },
  { emoji: '🍌', name: 'a banana', grams: 120 },
  { emoji: '🍓', name: 'a strawberry', grams: 15 },
  { emoji: '🥚', name: 'an egg', grams: 60 },
  { emoji: '🍪', name: 'a cookie', grams: 30 },
  { emoji: '🐕', name: 'a dog', grams: 20000 },
  { emoji: '🚲', name: 'a bicycle', grams: 12000 },
  { emoji: '🍉', name: 'a watermelon', grams: 5000 },
  { emoji: '🎒', name: 'a full backpack', grams: 4000 },
  { emoji: '🎃', name: 'a pumpkin', grams: 6000 },
  { emoji: '🪣', name: 'a bucket', liters: 10 },
  { emoji: '🛁', name: 'a bathtub', liters: 150 },
  { emoji: '🐠', name: 'a fish tank', liters: 40 },
];
