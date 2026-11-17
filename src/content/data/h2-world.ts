// Things from a child's world, for the pre-K and grade 2 skills of plan section 15 wave H2.
// Every picture names one thing, and every thing has one name. The answer checks keep their own copy of
// each fact (the shape, colour, weight or kind), so a slip here is caught by the oracle test.

export interface Thing {
  emoji: string;
  name: string;
}

// Flat things that look like one flat shape when seen from the front.
export const SHAPED: readonly (Thing & { shape: 'circle' | 'triangle' | 'square' | 'rectangle' })[] = [
  { emoji: '🍪', name: 'cookie', shape: 'circle' },
  { emoji: '🍩', name: 'donut', shape: 'circle' },
  { emoji: '🕐', name: 'clock', shape: 'circle' },
  { emoji: '🍕', name: 'pizza', shape: 'triangle' },
  { emoji: '⛺', name: 'tent', shape: 'triangle' },
  { emoji: '🪟', name: 'window', shape: 'square' },
  { emoji: '🚪', name: 'door', shape: 'rectangle' },
  { emoji: '📱', name: 'phone', shape: 'rectangle' },
];

// Things that are almost always one colour.
export const COLOURED: readonly (Thing & { colour: 'red' | 'yellow' | 'green' | 'orange' | 'purple' })[] = [
  { emoji: '🍎', name: 'apple', colour: 'red' },
  { emoji: '🍓', name: 'strawberry', colour: 'red' },
  { emoji: '🍒', name: 'cherries', colour: 'red' },
  { emoji: '🍌', name: 'banana', colour: 'yellow' },
  { emoji: '🍋', name: 'lemon', colour: 'yellow' },
  { emoji: '🐥', name: 'chick', colour: 'yellow' },
  { emoji: '🐸', name: 'frog', colour: 'green' },
  { emoji: '🍀', name: 'clover', colour: 'green' },
  { emoji: '🌵', name: 'cactus', colour: 'green' },
  { emoji: '🥕', name: 'carrot', colour: 'orange' },
  { emoji: '🎃', name: 'pumpkin', colour: 'orange' },
  { emoji: '🍇', name: 'grapes', colour: 'purple' },
];

// Things shaped like a ball, a box or a can.
export const SOLID_THINGS: readonly (Thing & { solid: 'sphere' | 'cube' | 'cylinder' })[] = [
  { emoji: '⚽', name: 'soccer ball', solid: 'sphere' },
  { emoji: '🏀', name: 'basketball', solid: 'sphere' },
  { emoji: '🎁', name: 'present', solid: 'cube' },
  { emoji: '📦', name: 'package', solid: 'cube' },
  { emoji: '🧻', name: 'paper roll', solid: 'cylinder' },
  { emoji: '🥁', name: 'drum', solid: 'cylinder' },
  { emoji: '🕯️', name: 'candle', solid: 'cylinder' },
];

// Things in five steps of weight. Anything in a higher step is heavier than anything in a lower one.
export const WEIGHED: readonly (Thing & { step: 1 | 2 | 3 | 4 | 5 })[] = [
  { emoji: '🐜', name: 'ant', step: 1 },
  { emoji: '🐝', name: 'bee', step: 1 },
  { emoji: '🦋', name: 'butterfly', step: 1 },
  { emoji: '🎈', name: 'balloon', step: 1 },
  { emoji: '🍓', name: 'strawberry', step: 2 },
  { emoji: '🥚', name: 'egg', step: 2 },
  { emoji: '🐭', name: 'mouse', step: 2 },
  { emoji: '🍎', name: 'apple', step: 2 },
  { emoji: '🐱', name: 'cat', step: 3 },
  { emoji: '🐶', name: 'dog', step: 3 },
  { emoji: '🍉', name: 'watermelon', step: 3 },
  { emoji: '🐄', name: 'cow', step: 4 },
  { emoji: '🐴', name: 'horse', step: 4 },
  { emoji: '🦁', name: 'lion', step: 4 },
  { emoji: '🚗', name: 'car', step: 4 },
  { emoji: '🐘', name: 'elephant', step: 5 },
  { emoji: '🚚', name: 'truck', step: 5 },
  { emoji: '🐋', name: 'whale', step: 5 },
  { emoji: '🚢', name: 'ship', step: 5 },
];

// Four kinds of thing to sort. Plants are never a group, because fruit and vegetables are plants too.
export type Kind = 'animals' | 'food' | 'vehicles' | 'clothes';
export const KINDS: Record<Kind, readonly Thing[]> = {
  animals: [
    { emoji: '🐶', name: 'dog' },
    { emoji: '🐱', name: 'cat' },
    { emoji: '🐷', name: 'pig' },
    { emoji: '🐰', name: 'rabbit' },
    { emoji: '🐻', name: 'bear' },
    { emoji: '🦒', name: 'giraffe' },
  ],
  food: [
    { emoji: '🍎', name: 'apple' },
    { emoji: '🍌', name: 'banana' },
    { emoji: '🍪', name: 'cookie' },
    { emoji: '🍕', name: 'pizza' },
    { emoji: '🧀', name: 'cheese' },
    { emoji: '🥕', name: 'carrot' },
  ],
  vehicles: [
    { emoji: '🚗', name: 'car' },
    { emoji: '🚌', name: 'bus' },
    { emoji: '🚂', name: 'train' },
    { emoji: '✈️', name: 'airplane' },
    { emoji: '🚲', name: 'bike' },
    { emoji: '🚜', name: 'tractor' },
  ],
  clothes: [
    { emoji: '👕', name: 'shirt' },
    { emoji: '👖', name: 'jeans' },
    { emoji: '🧦', name: 'socks' },
    { emoji: '🧢', name: 'cap' },
    { emoji: '🧤', name: 'gloves' },
    { emoji: '👟', name: 'shoe' },
  ],
};

// Animals that stand in a line, for first and last.
export const LINE_ANIMALS: readonly Thing[] = [
  { emoji: '🐶', name: 'dog' },
  { emoji: '🐱', name: 'cat' },
  { emoji: '🐷', name: 'pig' },
  { emoji: '🐸', name: 'frog' },
  { emoji: '🦆', name: 'duck' },
  { emoji: '🐰', name: 'rabbit' },
  { emoji: '🐻', name: 'bear' },
  { emoji: '🐵', name: 'monkey' },
];

// Things a child does in the morning (a.m.) or in the afternoon and evening (p.m.), with a usual hour.
export const DAY_THINGS: readonly (Thing & { half: 'am' | 'pm'; hour: number; verb: string })[] = [
  { emoji: '🥞', name: 'breakfast', half: 'am', hour: 7, verb: 'eats breakfast' },
  { emoji: '🏫', name: 'school', half: 'am', hour: 8, verb: 'gets to school' },
  { emoji: '🐔', name: 'rooster', half: 'am', hour: 6, verb: 'hears the rooster wake everyone up' },
  { emoji: '🥣', name: 'cereal', half: 'am', hour: 7, verb: 'eats a bowl of cereal' },
  { emoji: '🍲', name: 'dinner', half: 'pm', hour: 6, verb: 'eats dinner' },
  { emoji: '🛏️', name: 'bed', half: 'pm', hour: 8, verb: 'goes to bed' },
  { emoji: '🌙', name: 'moon', half: 'pm', hour: 9, verb: 'looks at the moon' },
  { emoji: '🛁', name: 'bath', half: 'pm', hour: 7, verb: 'takes a bath before bed' },
];

// Things measured in centimeters or in meters, with a usual length in centimeters.
export const METRIC_THINGS: readonly (Thing & { cm: number })[] = [
  { emoji: '🖍️', name: 'crayon', cm: 9 },
  { emoji: '🥄', name: 'spoon', cm: 15 },
  { emoji: '✏️', name: 'pencil', cm: 18 },
  { emoji: '📱', name: 'phone', cm: 14 },
  { emoji: '🚪', name: 'door', cm: 200 },
  { emoji: '🛏️', name: 'bed', cm: 200 },
  { emoji: '🚗', name: 'car', cm: 400 },
  { emoji: '🚌', name: 'bus', cm: 1200 },
];
