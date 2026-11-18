// Word puzzles for Reasoning A.15 and A.16 (plan section 15.1, phase I): the kinds gifted-screening tests use.

// Word pairs that share a relation. "Bird is to nest as bee is to hive."
export const VERBAL_RELATIONS: Record<string, { says: string; pairs: readonly (readonly [string, string])[] }> = {
  opposite: { says: 'is the opposite of', pairs: [['hot', 'cold'], ['up', 'down'], ['big', 'small'], ['day', 'night'], ['wet', 'dry'], ['fast', 'slow'], ['full', 'empty'], ['open', 'shut']] },
  home: { says: 'lives in', pairs: [['bird', 'nest'], ['bee', 'hive'], ['spider', 'web'], ['horse', 'stable'], ['fish', 'pond'], ['pig', 'sty']] },
  baby: { says: 'has a baby called', pairs: [['cat', 'kitten'], ['dog', 'puppy'], ['cow', 'calf'], ['sheep', 'lamb'], ['hen', 'chick'], ['bear', 'cub'], ['horse', 'foal']] },
  makes: { says: 'gives us', pairs: [['bee', 'honey'], ['cow', 'milk'], ['hen', 'egg'], ['sheep', 'wool'], ['tree', 'wood']] },
  colour: { says: 'is the color', pairs: [['grass', 'green'], ['sky', 'blue'], ['snow', 'white'], ['banana', 'yellow'], ['cherry', 'red'], ['coal', 'black']] },
  part: { says: 'is part of', pairs: [['wheel', 'car'], ['page', 'book'], ['petal', 'flower'], ['finger', 'hand'], ['leaf', 'tree'], ['key', 'piano']] },
  tool: { says: 'is used with', pairs: [['pencil', 'paper'], ['broom', 'floor'], ['spoon', 'soup'], ['brush', 'hair'], ['key', 'lock'], ['bat', 'ball']] },
};

// Groups of words for "which word does not belong". Close groups make the hard level.
export const WORD_CLASSES: Record<string, readonly string[]> = {
  fruit: ['apple', 'banana', 'grape', 'pear', 'peach', 'plum'],
  vegetable: ['carrot', 'pea', 'onion', 'potato', 'bean', 'corn'],
  farmAnimal: ['cow', 'pig', 'sheep', 'goat', 'hen', 'horse'],
  wildAnimal: ['lion', 'tiger', 'zebra', 'bear', 'wolf', 'fox'],
  land: ['car', 'bus', 'truck', 'bike', 'train', 'van'],
  water: ['boat', 'ship', 'canoe', 'raft', 'yacht', 'ferry'],
  clothes: ['shirt', 'sock', 'hat', 'coat', 'scarf', 'dress'],
  furniture: ['chair', 'table', 'bed', 'sofa', 'desk', 'shelf'],
  colour: ['red', 'blue', 'green', 'yellow', 'pink', 'purple'],
  shape: ['circle', 'square', 'triangle', 'oval', 'star', 'heart'],
  weather: ['rain', 'snow', 'wind', 'fog', 'hail', 'sleet'],
};
export const CLOSE_CLASSES: readonly (readonly [string, string])[] = [['fruit', 'vegetable'], ['farmAnimal', 'wildAnimal'], ['land', 'water'], ['clothes', 'furniture'], ['colour', 'shape']];
