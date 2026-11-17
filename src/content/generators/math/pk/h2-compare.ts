import type { Rng } from '../../../../engine/rng';
import type { Level, QuestionDraft, Visual } from '../../../../engine/types';
import { COUNTABLES } from '../../../data/countables';
import { WEIGHED } from '../../../data/h2-world';
import type { SkillGenerator } from '../../../generator';
import { numeral } from '../../../generator';
import { skill } from './h2-lesson';
import { tidyGroup } from './parts';

// Math pre-K, wave H2 (plan section 15): B.3 more or less with numbers, B.4 most and fewest, C.4 heavy and light.

type Ask = 'most' | 'least';
const dots = (n: number): Visual => ({ kind: 'emojiGroup', emoji: '⚫', count: n, layout: n <= 5 ? 'row' : 'grid5' });

// Numbers from lo to hi, all different, each pair at least `gap` apart.
function spread(count: number, lo: number, hi: number, gap: number, rng: Rng): number[] {
  for (;;) {
    const values = rng.sample(Array.from({ length: hi - lo + 1 }, (_, i) => lo + i), count);
    const sorted = [...values].sort((x, y) => x - y);
    if (sorted.every((value, i) => i === 0 || value - (sorted[i - 1] as number) >= gap)) return values;
  }
}

// ---- B.3 More or less with numbers ----
// Levels: two numbers to 5 with dots, 2 or more apart / to 10, more or less / to 10, next to each other. Oracle: compare.

function moreLess(level: Level, rng: Rng): QuestionDraft {
  const values = level === 1 ? spread(2, 1, 5, 2, rng) : level === 2 ? spread(2, 1, 10, 2, rng) : ((n: number) => rng.shuffle([n, n + 1]))(rng.int(1, 9));
  const ask: Ask = level === 1 ? 'most' : rng.pick(['most', 'least']);
  const word = ask === 'most' ? 'more' : 'less';
  const [big, small] = [Math.max(...values), Math.min(...values)];
  const prompt = `Which number is ${word}?`;
  const options = values.map((value): Visual => (level === 1 ? { kind: 'row', children: [numeral(value), dots(value)] } : numeral(value)));
  const answer = ask === 'most' ? big : small;
  const other = ask === 'most' ? small : big;
  return {
    type: 'choice',
    mode: 'look',
    facts: { values, ask, options: values },
    prompt: { text: prompt, speak: [prompt] },
    options,
    answerIndex: values.indexOf(answer),
    explanation: {
      speak: [{ number: big }, 'comes after', { number: small }, 'when we count.', { number: answer }, `is ${word} than`, { number: other }, '.'],
      steps: [`${big} comes after ${small} when we count.`, `${answer} is ${word} than ${other}.`],
      visual: { kind: 'row', children: [{ kind: 'row', children: [numeral(small, 'l'), dots(small)] }, { kind: 'row', children: [numeral(big, 'l'), dots(big)] }] },
    },
  };
}

export const moreLessGenerator: SkillGenerator = skill({
  skillId: 'M-PK-B3',
  maxLevel: 3,
  itemTypes: ['choice'],
  lists: [],
  generate: moreLess,
  exampleSeed: 911,
  lesson: { see: 'A number that comes later when we count is more.', remember: 'Later numbers are more. Earlier numbers are less.', tryLevel: 2 },
  oracle: 'compare',
});

// ---- B.4 Most and fewest ----
// Levels: three groups, 2 or more apart, which has the most / the most or the fewest / next to each other. Oracle: compare.

function mostFewest(level: Level, rng: Rng): QuestionDraft {
  const thing = rng.pick(COUNTABLES);
  const values = spread(3, 1, level === 3 ? 8 : 10, level === 3 ? 1 : 2, rng);
  const ask: Ask = level === 1 ? 'most' : rng.pick(['most', 'least']);
  const word = ask === 'most' ? 'the most' : 'the fewest';
  const answer = ask === 'most' ? Math.max(...values) : Math.min(...values);
  const prompt = `Which group has ${word}?`;
  return {
    type: 'choice',
    mode: 'look',
    facts: { values, ask, thing: thing.one, options: values },
    prompt: { text: prompt, speak: [prompt] },
    options: values.map((n) => tidyGroup(thing, n)),
    answerIndex: values.indexOf(answer),
    explanation: {
      speak: ['The groups have', { number: values[0] as number }, ',', { number: values[1] as number }, 'and', { number: values[2] as number }, '.', { number: answer }, `is ${word}.`],
      steps: [`The groups have ${values.join(', ')}.`, `${answer} is ${word}.`],
      visual: tidyGroup(thing, answer),
    },
  };
}

export const mostFewestGenerator: SkillGenerator = skill({
  skillId: 'M-PK-B4',
  maxLevel: 3,
  itemTypes: ['choice'],
  lists: ['countables'],
  generate: mostFewest,
  exampleSeed: 912,
  lesson: { see: 'Count each group. The biggest count is the most. The smallest count is the fewest.', remember: 'Count every group before you choose.', tryLevel: 2 },
  oracle: 'compare',
});

// ---- C.4 Heavy and light ----
// Levels: which is heavier, far apart / heavier or lighter / the heaviest or lightest of 3. Oracle: h2World.

const picture = (thing: { emoji: string; name: string }): Visual => ({ kind: 'emojiGroup', emoji: thing.emoji, count: 1, layout: 'row', speak: [thing.name] });
const an = (name: string): string => (/^[aeiou]/.test(name) ? `an ${name}` : `a ${name}`);

function heavyLight(level: Level, rng: Rng): QuestionDraft {
  const count = level === 3 ? 3 : 2;
  let things: (typeof WEIGHED)[number][];
  for (;;) {
    things = rng.sample(WEIGHED, count);
    const steps = things.map((thing) => thing.step).sort();
    const gaps = steps.slice(1).map((step, i) => step - (steps[i] as number));
    if (gaps.every((gap) => gap >= (level === 1 ? 2 : 1))) break;
  }
  const want: Ask = level === 1 ? 'most' : rng.pick(['most', 'least']);
  const word = level === 3 ? (want === 'most' ? 'the heaviest' : 'the lightest') : want === 'most' ? 'heavier' : 'lighter';
  const sorted = [...things].sort((x, y) => x.step - y.step);
  const answer = (want === 'most' ? sorted[sorted.length - 1] : sorted[0]) as (typeof WEIGHED)[number];
  const heavy = sorted[sorted.length - 1] as (typeof WEIGHED)[number];
  const light = sorted[0] as (typeof WEIGHED)[number];
  const prompt = `Which one is ${word}?`;
  const line = `${an(heavy.name)} is heavier than ${an(light.name)}.`;
  const lineCap = `${line.charAt(0).toUpperCase()}${line.slice(1)}`;
  return {
    type: 'choice',
    mode: 'look',
    facts: { ask: 'heavy', want, set: things.map((thing) => thing.name).sort(), options: things.map((thing) => thing.name) },
    prompt: { text: prompt, speak: [prompt] },
    options: things.map(picture),
    answerIndex: things.indexOf(answer),
    explanation: { speak: [lineCap, `The ${answer.name} is ${word}.`], steps: [lineCap, `The ${answer.name} is ${word}.`], visual: picture(answer) },
  };
}

export const heavyLightGenerator: SkillGenerator = skill({
  skillId: 'M-PK-C4',
  maxLevel: 3,
  itemTypes: ['choice'],
  lists: ['h2-world'],
  generate: heavyLight,
  exampleSeed: 913,
  lesson: { see: 'Some things are heavy and hard to lift. Some things are light.', remember: 'Think: which one would be harder to lift?', tryLevel: 2 },
  oracle: 'h2World',
});
