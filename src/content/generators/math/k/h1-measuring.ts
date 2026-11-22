import type { Rng } from '../../../../engine/rng';
import type { Hint, Level, QuestionDraft, Say, Visual } from '../../../../engine/types';
import type { Tiered } from '../../../data/h1-things';
import { HOLD_THINGS, WEIGHT_THINGS } from '../../../data/h1-things';
import type { SkillGenerator } from '../../../generator';
import { a, h1Skill, lessonOf, picture } from './h1-parts';

// An explanation with the hint and spoken steps the generator gives (h1-parts' type has neither).
type Explanation = { speak: Say; steps: string[]; visual: Visual; hint?: Hint; stepsSay?: (Say | null)[] };

// Math kindergarten, plan section 15 wave H1: F.4 heavier and lighter, F.5 holds more and holds less.
// Things are only compared with things of another tier (data/h1-things.ts), so the answer is plain.

type Kind = 'weight' | 'holds';
const WORDS: Record<Kind, { more: string; less: string; most: string; least: string }> = {
  weight: { more: 'heavier', less: 'lighter', most: 'the heaviest', least: 'the lightest' },
  holds: { more: 'holds more', less: 'holds less', most: 'holds the most', least: 'holds the least' },
};

// Two or three things, each from a different tier; level 1 pairs are at least two tiers apart.
function pickThings(things: readonly Tiered[], count: number, apart: number, rng: Rng): Tiered[] {
  for (;;) {
    const picked = rng.sample(things, count);
    const tiers = picked.map((thing) => thing.tier).sort((x, y) => x - y);
    if (tiers.every((tier, i) => i === 0 || tier - (tiers[i - 1] as number) >= apart)) return picked;
  }
}

// The steps use the word the question asks about: "A leaf is lighter than a horse." for "Which one is lighter?"
// (the wording audit, Nov 21, 2026).
const HINT: Record<Kind, Record<'more' | 'less' | 'most' | 'least', string>> = {
  weight: { more: 'Think: which one would be harder to lift?', less: 'Think: which one would be easier to lift?', most: 'Think: which one would be hardest to lift?', least: 'Think: which one would be easiest to lift?' },
  holds: { more: 'Think: which one has more room inside?', less: 'Think: which one has less room inside?', most: 'Think: which one has the most room inside?', least: 'Think: which one has the least room inside?' },
};

function orderExplanation(kind: Kind, things: Tiered[], ask: 'most' | 'least'): Explanation {
  const sorted = [...things].sort((x, y) => y.tier - x.tier);
  const top = sorted[0] as Tiered;
  const bottom = sorted[sorted.length - 1] as Tiered;
  const verb = kind === 'weight' ? 'is' : '';
  const than = (more: boolean): string => (kind === 'weight' ? (more ? 'is heavier than' : 'is lighter than') : more ? 'holds more than' : 'holds less than');
  const lines =
    things.length === 2
      ? ask === 'most'
        ? [`${a(top.name).replace(/^a/, 'A')} ${than(true)} ${a(bottom.name)}.`]
        : [`${a(bottom.name).replace(/^a/, 'A')} ${than(false)} ${a(top.name)}.`]
      : [`${a(top.name).replace(/^a/, 'A')} ${verb ? `${verb} ${WORDS[kind].most}` : WORDS[kind].most}.`, `${a(bottom.name).replace(/^a/, 'A')} ${verb ? `${verb} ${WORDS[kind].least}` : WORDS[kind].least}.`];
  const picked = ask === 'most' ? top : bottom;
  const hint = HINT[kind][things.length === 2 ? (ask === 'most' ? 'more' : 'less') : ask];
  return { speak: [lines.join(' ')], steps: lines, visual: picture(picked.emoji), hint: { text: hint } };
}

function compareThings(kind: Kind) {
  const things = kind === 'weight' ? WEIGHT_THINGS : HOLD_THINGS;
  return (level: Level, rng: Rng): QuestionDraft => {
    const picked = pickThings(things, level === 3 ? 3 : 2, level === 1 ? 2 : 1, rng);
    const ask = level === 1 ? 'most' : level === 2 ? 'least' : rng.pick(['most', 'least'] as const);
    const word = level === 3 ? WORDS[kind][ask] : ask === 'most' ? WORDS[kind].more : WORDS[kind].less;
    const prompt = kind === 'weight' ? `Which one is ${word}?` : `Which one ${word}?`;
    const tiers = picked.map((thing) => thing.tier);
    const want = ask === 'most' ? Math.max(...tiers) : Math.min(...tiers);
    return {
      type: 'choice',
      mode: 'look',
      facts: { kind, ask, things: picked.map((thing) => thing.name).sort(), options: picked.map((thing) => thing.name) },
      prompt: { text: prompt, speak: [prompt] },
      options: picked.map((thing) => picture(thing.emoji, thing.name)),
      answerIndex: tiers.indexOf(want),
      explanation: orderExplanation(kind, picked, ask),
    };
  };
}

export const heavierGenerator: SkillGenerator = h1Skill({
  skillId: 'M-K-F4',
  maxLevel: 3,
  itemTypes: ['choice'],
  oracle: 'h1MeasureOrder',
  exampleSeed: 861,
  lists: ['h1-things'],
  generate: compareThings('weight'),
  lesson: (make) => lessonOf('Heavy things are hard to lift. Light things are easy to lift.', { kind: 'row', children: [picture('🐘'), picture('🍃')] }, make(1, 861), make(2, 862), 'Think: which would be harder to lift?'),
});

export const holdsMoreGenerator: SkillGenerator = h1Skill({
  skillId: 'M-K-F5',
  maxLevel: 3,
  itemTypes: ['choice'],
  oracle: 'h1MeasureOrder',
  exampleSeed: 863,
  lists: ['h1-things'],
  pool: { 1: 4 },
  generate: compareThings('holds'),
  lesson: (make) => lessonOf('Some things hold a lot of water. Some hold only a little.', { kind: 'row', children: [picture('🛁'), picture('🥄')] }, make(1, 863), make(2, 864), 'The bigger inside, the more it holds.'),
});
