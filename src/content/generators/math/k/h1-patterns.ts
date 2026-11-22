import type { Rng } from '../../../../engine/rng';
import type { Hint, Level, QuestionDraft, Say, ShapeName, Visual } from '../../../../engine/types';
import type { ColorName } from '../../../data/colors';
import type { Countable } from '../../../data/countables';
import { COUNTABLES } from '../../../data/countables';
import type { SkillGenerator } from '../../../generator';
import { shape, twoClearColors } from '../pk/parts';
import { h1Skill, lessonOf, picture } from './h1-parts';

// An explanation with the hint and spoken steps the generator gives (h1-parts' type has neither).
type Explanation = { speak: Say; steps: string[]; visual: Visual; hint?: Hint; stepsSay?: (Say | null)[] };

// Math kindergarten, plan section 15 wave H1: F.6 how were they sorted, G.2 same pattern, new pictures.

// ---- F.6 How were they sorted? ----
// Two groups of four shapes, each in its own box. Levels: by colour or by shape / or by size /
// the other two things change inside each group too. Oracle: h1SortRule.

type Rule = 'colour' | 'shape' | 'size';
type Size = 's' | 'm' | 'l';
type Item = [ShapeName, ColorName, Size];
const FORMS: ShapeName[] = ['circle', 'square', 'triangle', 'star', 'heart'];
const INDEX: Record<Rule, number> = { shape: 0, colour: 1, size: 2 };
// The word a child sees and hears for each rule.
const SAID: Record<Rule, string> = { shape: 'shape', colour: 'color', size: 'size' };

// The attributes that are the same inside each group and different between the groups.
function rulesOf(groups: Item[][]): Rule[] {
  return (['shape', 'colour', 'size'] as Rule[]).filter((rule) => {
    const firsts = groups.map((group) => (group[0] as Item)[INDEX[rule]]);
    const inside = groups.every((group) => group.every((item) => item[INDEX[rule]] === (group[0] as Item)[INDEX[rule]]));
    return inside && new Set(firsts).size === groups.length;
  });
}

const box = (group: Item[]): Visual => ({ kind: 'matrix', cells: group.map(([form, color, size]) => shape(form, color, size)) });

function sortRule(level: Level, rng: Rng): QuestionDraft {
  const rules: Rule[] = level === 1 ? ['colour', 'shape'] : ['colour', 'shape', 'size'];
  const rule = rng.pick(rules);
  for (;;) {
    const colors = twoClearColors(rng);
    const forms = rng.sample(FORMS, 2) as [ShapeName, ShapeName];
    const sizes: [Size, Size] = rng.bool() ? ['s', 'l'] : ['l', 's'];
    const groups = [0, 1].map((g) =>
      Array.from({ length: 4 }, (): Item => [
        rule === 'shape' ? forms[g] as ShapeName : rng.pick(forms),
        rule === 'colour' ? colors[g] as ColorName : rng.pick(colors),
        rule === 'size' ? sizes[g] as Size : level === 1 ? 'm' : rng.pick(sizes),
      ]),
    );
    // The other attributes must change inside the groups, or the picture would fit two rules.
    const found = rulesOf(groups);
    // Level 3: they change inside both groups.
    const changes = (group: Item[], each: Rule): boolean => new Set(group.map((item) => item[INDEX[each]])).size > 1;
    const mixed = rules.filter((each) => each !== rule).every((each) => (level === 3 ? groups.every((group) => changes(group, each)) : groups.some((group) => changes(group, each))));
    if (found.length !== 1 || found[0] !== rule || !mixed) continue;
    const options = rules.map((each) => `by ${SAID[each]}`);
    const line = rule === 'colour' ? 'Each group is all one color.' : rule === 'shape' ? 'Each group is all one shape.' : 'One group is all small. The other is all big.';
    const explanation: Explanation = { speak: [`${line} They were sorted by ${SAID[rule]}.`], steps: [line, `They were sorted by ${SAID[rule]}.`], visual: { kind: 'row', children: groups.map(box) }, hint: { text: 'Find what is the same inside each group.' } };
    const prompt = 'How were the shapes sorted?';
    return {
      type: 'choice',
      mode: 'look',
      fixedOrder: true,
      facts: { groups, options },
      prompt: { text: prompt, speak: [prompt] },
      stimulus: { kind: 'row', children: groups.map(box) },
      options: options.map((each): Visual => ({ kind: 'text', value: each, size: 'l', speak: [each] })),
      answerIndex: rules.indexOf(rule),
      explanation,
    };
  }
}

export const sortRuleGenerator: SkillGenerator = h1Skill({
  skillId: 'M-K-F6',
  maxLevel: 3,
  itemTypes: ['choice'],
  oracle: 'h1SortRule',
  exampleSeed: 871,
  lists: ['colors'],
  generate: sortRule,
  lesson: (make) =>
    lessonOf(
      'Things can be sorted by color, by shape or by size.',
      { kind: 'row', children: [box([['circle', 'red', 'm'], ['square', 'red', 'm'], ['star', 'red', 'm'], ['circle', 'red', 'm']]), box([['square', 'blue', 'm'], ['circle', 'blue', 'm'], ['square', 'blue', 'm'], ['star', 'blue', 'm']])] },
      make(1, 871),
      make(2, 872),
      'Find what is the same inside each group.',
    ),
});

// ---- G.2 Same pattern, new pictures ----
// A pattern of shapes. Which row of pictures has the same pattern? Levels: AB or AAB / ABB, AAB or ABC /
// AABB, ABC or ABB. Oracle: h1PatternKind.

const UNITS = ['AB', 'AAB', 'ABB', 'ABC', 'AABB'] as const;
type Unit = (typeof UNITS)[number];
const TARGETS: Record<Level, Unit[]> = { 1: ['AB', 'AAB'], 2: ['ABB', 'AAB', 'ABC'], 3: ['AABB', 'ABC', 'ABB'], 4: ['AABB'] };
const repeatOf = (unit: Unit): string[] => [...unit, ...unit].slice(0, unit.length <= 2 ? 4 : unit.length * 2).map(String);

function patternExplanation(unit: Unit, shapes: string, pictures: string, visual: Visual): Explanation {
  const way = unit.length === 2 ? 'one, then another, over and over.' : unit === 'AAB' ? 'two the same, then one different, over and over.' : unit === 'ABB' ? 'one, then two the same, over and over.' : unit === 'ABC' ? 'three different ones, over and over.' : 'two of one, then two of another, over and over.';
  const steps = [`The shapes go ${shapes}.`, `The pictures go ${pictures}.`, `Both rows repeat the same way: ${way}`];
  return { speak: [steps.join(' ')], steps, visual, hint: { text: 'Say the shapes out loud. Then say each row of pictures. Which row goes the same way?' } };
}

function samePattern(level: Level, rng: Rng): QuestionDraft {
  const unit = rng.pick(TARGETS[level]);
  const others = rng.sample(UNITS.filter((each) => each !== unit), 2);
  const forms = rng.sample(['circle', 'square', 'triangle', 'star'] as ShapeName[], 3);
  const color: ColorName = 'blue';
  const letters = repeatOf(unit);
  const formOf = (letter: string): ShapeName => forms['ABC'.indexOf(letter)] as ShapeName;
  const target: Visual = { kind: 'sequence', items: letters.map((letter) => shape(formOf(letter), color, 's')) };
  const things = rng.sample(COUNTABLES, 3) as [Countable, Countable, Countable];
  const thingOf = (letter: string): Countable => things['ABC'.indexOf(letter)] as Countable;
  const row = (each: Unit): Visual => ({ kind: 'sequence', items: repeatOf(each).map((letter) => picture(thingOf(letter).emoji)) });
  const words = (each: Unit): string => repeatOf(each).map((letter) => thingOf(letter).one).join(' ');
  const units = rng.shuffle([unit, ...others]);
  const prompt = 'Which row has the same pattern?';
  return {
    type: 'choice',
    mode: 'look',
    facts: { target: letters.map(formOf).join(' '), options: units.map(words) },
    prompt: { text: prompt, speak: [prompt] },
    stimulus: target,
    options: units.map(row),
    answerIndex: units.indexOf(unit),
    explanation: patternExplanation(unit, letters.map(formOf).join(', '), repeatOf(unit).map((letter) => thingOf(letter).one).join(', '), row(unit)),
  };
}

export const samePatternGenerator: SkillGenerator = h1Skill({
  skillId: 'M-K-G2',
  maxLevel: 3,
  itemTypes: ['choice'],
  oracle: 'h1PatternKind',
  exampleSeed: 873,
  lists: ['countables'],
  generate: samePattern,
  lesson: (make) =>
    lessonOf(
      'The same pattern can be made with different pictures.',
      { kind: 'row', children: [{ kind: 'sequence', items: [shape('circle', 'blue', 's'), shape('square', 'blue', 's'), shape('circle', 'blue', 's'), shape('square', 'blue', 's')] }, { kind: 'sequence', items: [picture('🍎'), picture('🍌'), picture('🍎'), picture('🍌')] }] },
      make(1, 873),
      make(2, 874),
      'Find the part that repeats. Then look for it in new pictures.',
    ),
});
