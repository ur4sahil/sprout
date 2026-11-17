import type { Rng } from '../../../../engine/rng';
import type { Level, QuestionDraft, ShapeName, SortBin, Visual } from '../../../../engine/types';
import type { ColorName } from '../../../data/colors';
import { COLOR_NAMES } from '../../../data/colors';
import { COUNTABLES } from '../../../data/countables';
import type { Kind, Thing } from '../../../data/h2-world';
import { KINDS } from '../../../data/h2-world';
import type { SkillGenerator } from '../../../generator';
import { skill } from './h2-lesson';
import { cap, shape, twoClearColors } from './parts';

// Math pre-K, wave H2 (plan section 15): D.4 fill the gap in a pattern, D.5 the same pattern, D.6 sort by kind.

const SHAPES: ShapeName[] = ['circle', 'square', 'triangle', 'star', 'heart'];
const picture = (thing: { emoji: string; name: string }): Visual => ({ kind: 'emojiGroup', emoji: thing.emoji, count: 1, layout: 'row', speak: [thing.name] });

interface Part {
  name: string;
  picture: Visual;
}

// Two parts of an AB pattern: by colour (level 1), by shape (level 2) or by picture (level 3).
function abParts(level: Level, rng: Rng): Part[] {
  if (level === 1) {
    const form = rng.pick(SHAPES);
    return twoClearColors(rng).map((color) => ({ name: color, picture: shape(form, color) }));
  }
  if (level === 2) {
    const color = rng.pick(COLOR_NAMES);
    return rng.sample(SHAPES, 2).map((form) => ({ name: form, picture: shape(form, color) }));
  }
  return rng.sample(COUNTABLES, 3).map((thing) => ({ name: thing.one, picture: picture({ emoji: thing.emoji, name: thing.one }) }));
}

// ---- D.4 Fill the gap ----
// Levels: an AB pattern by colour with a gap inside / by shape / by picture, with a third picture offered.
// Oracle: pattern, where `shown` is the place of the gap: the part that belongs there is unit[shown mod 2].

function fillGap(level: Level, rng: Rng): QuestionDraft {
  const parts = abParts(level, rng);
  const unit = parts.slice(0, 2);
  const gap = rng.int(1, 4);
  const answer = unit[gap % 2] as Part;
  const offered = rng.shuffle(level === 3 ? parts : unit);
  const row = Array.from({ length: 6 }, (_, i) => unit[i % 2] as Part);
  const said = `The pattern is ${unit[0]?.name}, ${unit[1]?.name}, and it repeats. The gap needs ${answer.name}.`;
  const prompt = 'What goes in the gap?';
  return {
    type: 'choice',
    mode: 'look',
    facts: { unit: unit.map((part) => part.name), shown: gap, by: ['colour', 'shape', 'picture'][level - 1] as string, options: offered.map((part) => part.name) },
    prompt: { text: prompt, speak: [prompt] },
    stimulus: { kind: 'sequence', items: row.map((part, i) => (i === gap ? 'blank' : part.picture)) },
    options: offered.map((part) => part.picture),
    answerIndex: offered.indexOf(answer),
    explanation: { speak: [said], steps: [`The pattern is ${unit[0]?.name}, ${unit[1]?.name}, and it repeats.`, `The gap needs ${answer.name}.`], visual: { kind: 'sequence', items: row.map((part) => part.picture) } },
  };
}

export const fillGapGenerator: SkillGenerator = skill({
  skillId: 'M-PK-D4',
  maxLevel: 3,
  itemTypes: ['choice'],
  lists: ['colors', 'countables'],
  generate: fillGap,
  exampleSeed: 931,
  lesson: { see: 'A pattern repeats, so we can find a missing part.', remember: 'Say the pattern out loud and listen for the gap.' },
  oracle: 'pattern',
});

// ---- D.5 The same pattern ----
// Levels: an AB row of colours, against rows that do not repeat the same way / AB or AAB against AB, AAB, ABB /
// any of AB, AAB, ABB, ABC. The rows to choose from are pictures, so the child matches the rule, not the look.
// Oracle: h2SamePattern.

const RULES: Record<string, number[]> = { AB: [0, 1], AAB: [0, 0, 1], ABB: [0, 1, 1], ABC: [0, 1, 2], AABB: [0, 0, 1, 1], AAAA: [0] };
const rowOf = (rule: string, parts: Part[]): Part[] => Array.from({ length: 6 }, (_, i) => {
  const unit = RULES[rule] as number[];
  return parts[unit[i % unit.length] as number] as Part;
});
// Three colours that are each easy to tell from the other two.
const CLEAR_THREES: ColorName[][] = [
  ['red', 'yellow', 'blue'],
  ['blue', 'yellow', 'green'],
  ['purple', 'orange', 'green'],
  ['blue', 'orange', 'pink'],
];
const SAY: Record<string, string> = { AB: 'one, then one other, again and again', AAB: 'two the same, then one other', ABB: 'one, then two the same', ABC: 'three different, again and again', AABB: 'two the same, then two others', AAAA: 'all the same' };

function samePattern(level: Level, rng: Rng): QuestionDraft {
  const target = level === 1 ? 'AB' : level === 2 ? rng.pick(['AB', 'AAB']) : rng.pick(['AB', 'AAB', 'ABB', 'ABC']);
  const others = level === 1 ? ['AABB', 'AAAA'] : rng.sample(['AB', 'AAB', 'ABB', 'ABC'].filter((rule) => rule !== target), 2);
  const rules = rng.shuffle([target, ...others]);
  const form = rng.pick(SHAPES);
  const colours: ColorName[] = target === 'ABC' ? rng.pick(CLEAR_THREES) : twoClearColors(rng);
  const shown = rowOf(target, colours.map((color) => ({ name: color, picture: shape(form, color, 's') })));
  const things = rng.sample(COUNTABLES, 3).map((thing): Part => ({ name: thing.one, picture: picture({ emoji: thing.emoji, name: thing.one }) }));
  const rows = rules.map((rule) => rowOf(rule, things));
  const answer = rules.indexOf(target);
  const prompt = 'Which row has the same pattern?';
  const said = `This row goes ${SAY[target]}. The right row repeats the same way.`;
  return {
    type: 'choice',
    mode: 'look',
    facts: { target: shown.map((part) => part.name), rows: rows.map((row) => row.map((part) => part.name)), options: rows.map((row) => row.map((part) => part.name).join(' ')) },
    prompt: { text: prompt, speak: [prompt] },
    stimulus: { kind: 'sequence', items: shown.map((part) => part.picture) },
    options: rows.map((row): Visual => ({ kind: 'sequence', items: row.map((part) => part.picture) })),
    answerIndex: answer,
    explanation: { speak: [said], steps: [`This row goes ${SAY[target]}.`, 'The right row repeats the same way.'], visual: { kind: 'sequence', items: (rows[answer] as Part[]).map((part) => part.picture) } },
  };
}

export const samePatternGenerator: SkillGenerator = skill({
  skillId: 'M-PK-D5',
  maxLevel: 3,
  itemTypes: ['choice'],
  lists: ['colors', 'countables'],
  generate: samePattern,
  exampleSeed: 932,
  lesson: { see: 'Two patterns can look different but repeat the same way.', remember: 'Say each pattern: one, other, one, other.' },
  oracle: 'h2SamePattern',
});

// ---- D.6 Sort by kind ----
// Levels: 4 things, animals or food / 6 things of two kinds / 6 things of three kinds. Oracle: h2World.

const KIND_NAMES = Object.keys(KINDS) as Kind[];
const HEAD: Record<Kind, string> = { animals: 'animals', food: 'food', vehicles: 'things that go', clothes: 'clothes' };

function sortKind(level: Level, rng: Rng): QuestionDraft {
  const kinds: Kind[] = level === 1 ? rng.shuffle(['animals', 'food'] as Kind[]) : rng.sample(KIND_NAMES, level === 2 ? 2 : 3);
  const count = level === 1 ? 4 : 6;
  // Each kind gets at least one thing; with three kinds, two each.
  let sides: number[];
  if (kinds.length === 3) sides = rng.shuffle([0, 0, 1, 1, 2, 2]);
  else {
    const first = rng.int(1, count - 1);
    sides = rng.shuffle(Array.from({ length: count }, (_, i) => (i < first ? 0 : 1)));
  }
  const chosen = kinds.map((kind, k) => rng.sample(KINDS[kind], sides.filter((side) => side === k).length + 1));
  const used = kinds.map(() => 0);
  const items: Thing[] = sides.map((side) => {
    const thing = (chosen[side] as Thing[])[used[side] as number] as Thing;
    used[side] = (used[side] as number) + 1;
    return thing;
  });
  // The picture on each group is one more thing of that kind, not among the things to sort.
  const bins: SortBin[] = kinds.map((kind, k) => ({ label: cap(HEAD[kind]), speak: [HEAD[kind]], icon: picture((chosen[k] as Thing[])[used[k] as number] as Thing) }));
  const prompt = 'Put each one in its group.';
  const said = kinds.map((kind, k) => `${cap(HEAD[kind])}: ${items.filter((_, i) => sides[i] === k).map((thing) => thing.name).join(', ')}.`);
  return {
    type: 'sort',
    mode: 'look',
    facts: { ask: 'kind', items: items.map((thing) => thing.name), binAttrs: kinds },
    prompt: { text: prompt, speak: [prompt] },
    items: items.map(picture),
    bins,
    answerBin: sides,
    explanation: { speak: said, steps: said, visual: { kind: 'row', children: items.filter((_, i) => sides[i] === 0).map(picture) } },
  };
}

export const sortKindGenerator: SkillGenerator = skill({
  skillId: 'M-PK-D6',
  maxLevel: 3,
  itemTypes: ['sort'],
  lists: ['h2-world'],
  generate: sortKind,
  exampleSeed: 933,
  lesson: { see: 'Things of the same kind go together: animals with animals, food with food.', remember: 'Ask: what kind of thing is it?' },
  oracle: 'h2World',
});
