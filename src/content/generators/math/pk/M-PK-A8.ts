import type { Rng } from '../../../../engine/rng';
import { makeRng } from '../../../../engine/rng';
import type { Hint, LessonStep, Level, QuestionDraft, Say, Visual } from '../../../../engine/types';
import type { SkillGenerator } from '../../../generator';
import { countAloud, listText, numeral } from '../../../generator';
import { nearbyNumbers } from './parts';

// Math pre-K A.8, Dot cards. Family: Count objects.
// Levels: dice patterns 1 to 4 / 1 to 6 / dots in two colours, to 6.

const DOT = '⚫';
const RED = '🔴';
const BLUE = '🔵';

function card(n: number, red?: number): Visual {
  if (red === undefined) return { kind: 'emojiGroup', emoji: DOT, count: n, layout: 'dice' };
  return { kind: 'emojiGroup', emoji: RED, count: red, layout: 'dice', emoji2: BLUE, count2: n - red };
}

function explain(n: number, red?: number): { speak: Say; steps: string[]; visual: Visual; hint: Hint } {
  const there = n === 1 ? 'There is' : 'There are';
  const dots = n === 1 ? 'dot' : 'dots';
  return {
    speak: ["Let's count.", ...countAloud(n), there, { number: n }, `${dots}.`],
    steps: [`Let's count: ${listText(Array.from({ length: n }, (_, i) => i + 1))}.`, `${there} ${n} ${dots}.`],
    visual: red === undefined ? { kind: 'emojiGroup', emoji: DOT, count: n, layout: 'dice', numbered: true } : { kind: 'emojiGroup', emoji: RED, count: red, layout: 'dice', emoji2: BLUE, count2: n - red, numbered: true },
    hint: { text: red === undefined ? 'Touch each dot as you count. Say a number for each.' : 'Touch every dot as you count, the red and the blue. Say a number for each.' },
  };
}

// With two colours a child might count one colour only, so the question says to count them all.
const ONE_COLOUR = 'How many dots are there?';
const TWO_COLOURS = 'How many dots are there in all? Count the red and the blue.';

function build(n: number, max: number, rng: Rng, red?: number): QuestionDraft {
  const values = nearbyNumbers(n, 1, max, rng);
  const facts: QuestionDraft['facts'] = { n, options: values };
  if (red !== undefined) facts.red = red;
  const prompt = red === undefined ? ONE_COLOUR : TWO_COLOURS;
  return {
    type: 'choice',
    mode: 'look',
    facts,
    prompt: { text: prompt, speak: [prompt] },
    stimulus: card(n, red),
    options: values.map((value) => numeral(value)),
    answerIndex: values.indexOf(n),
    explanation: explain(n, red),
  };
}

function generate(level: Level, rng: Rng): QuestionDraft {
  if (level === 1) return build(rng.int(1, 4), 4, rng);
  if (level === 2) return build(rng.int(1, 6), 6, rng);
  // Two colours: at least one dot of each, so 2 to 6 dots in all.
  const n = rng.int(2, 6);
  return build(n, 6, rng, rng.int(1, n - 1));
}

function lesson(): LessonStep[] {
  return [
    {
      beat: 'see',
      text: 'Dots on a card make a pattern. This card has 4 dots.',
      speak: ['Dots on a card make a pattern. This card has', { number: 4 }, 'dots.'],
      visual: card(4),
    },
    { beat: 'watch', text: "Let's count: 1, 2, 3, 4, 5. There are 5 dots.", speak: explain(5).speak, visual: explain(5).visual },
    {
      beat: 'try',
      text: 'How many dots are there?',
      speak: ['How many dots are there?'],
      visual: card(3),
      reveal: { text: "Let's count: 1, 2, 3. There are 3 dots.", speak: explain(3).speak, visual: explain(3).visual },
    },
    {
      beat: 'remember',
      text: 'Touch each one once and say one number.',
      speak: ['Touch each one once and say one number.'],
      visual: explain(6).visual,
    },
  ];
}

const EXAMPLE_SEED = 9;

// A card is its number of dots and nothing else, so level 1 has 4 different questions and level 2 has 6.
export const generator: SkillGenerator = {
  skillId: 'M-PK-A8',
  maxLevel: 3,
  itemTypes: ['choice'],
  lists: [],
  pool: { 1: 4, 2: 6 },
  generate,
  exampleSeed: EXAMPLE_SEED,
  example: () => generate(1, makeRng(EXAMPLE_SEED)),
  lesson,
  oracle: 'count',
};
