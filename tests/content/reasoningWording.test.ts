// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { ANALOGY_CLASHES, ANALOGY_PAIRS } from '../../src/content/data/analogies';
import { RIDDLES } from '../../src/content/data/riddles';
import { NEAR_MISSES, NOT_ASKED, PAIR_SENTENCES, VERBAL_CLASHES, VERBAL_RELATIONS, WORD_CLASSES } from '../../src/content/data/verbal';
import { CATALOGUE } from '../../src/content/catalogue';
import { generateQuestion } from '../../src/content/registry';
import { describeVisual, sayText } from '../../src/engine/describe';
import type { Level, Question, Visual } from '../../src/engine/types';

// The Reasoning wording audit (Nov 22, 2026): how each puzzle is asked, the steps after a miss and the hint.
// After a miss the screen shows only the child's answer and the right one, so a step names what it talks about.

const SEEDS = 300;
const all = (skillId: string, level: Level): Question[] => Array.from({ length: SEEDS }, (_, i) => generateQuestion(skillId, level, i + 1));
type Choice = Extract<Question, { type: 'choice' }>;
function choices(skillId: string, level: Level): Choice[] {
  return all(skillId, level).map((question) => {
    if (question.type !== 'choice') throw new Error(`${skillId} level ${level} gave a ${question.type}`);
    return question;
  });
}
const levelsOf = (skillId: string): Level[] => Array.from({ length: CATALOGUE.find((skill) => skill.id === skillId)?.maxLevel ?? 0 }, (_, i) => (i + 1) as Level);
const REASONING = CATALOGUE.filter((skill) => skill.subject === 'reasoning').map((skill) => skill.id);
const words = (question: Question, name = 'options'): string[] => question.facts[name] as string[];
const answerText = (question: Choice): string => describeVisual(question.options[question.answerIndex] as Visual);
const article = (phrase: string): string => (/^[aeiou]/.test(phrase) ? `an ${phrase}` : `a ${phrase}`);
type Shape = Extract<Visual, { kind: 'shape' }>;
const asShape = (visual: Visual | 'blank' | undefined): Shape => {
  if (visual === undefined || visual === 'blank' || visual.kind !== 'shape') throw new Error('not a shape');
  return visual;
};

// Which way a shape's pointing part goes, worked out from the drawing (src/visuals/geometry.ts and ShapeVisual.tsx):
// the arrow runs from its tail to its tip at the top, the flag's cloth from the pole to its tip on the right, the
// foot of the L from the bar to its end on the right. Shapes turn clockwise about the middle, and a flip mirrors
// left and right before the turn. When it points up or down, the side it points from is said too.
const POINTING: Record<string, [[number, number], [number, number]]> = { arrow: [[50, 70], [50, 6]], flag: [[29, 31], [86, 30]], lShape: [[46, 80], [82, 80]] };
function pointing(visual: Shape, withSide: boolean): string {
  const [from, to] = POINTING[visual.shape] as [[number, number], [number, number]];
  const angle = (visual.rotation * Math.PI) / 180;
  const place = ([x, y]: [number, number]): [number, number] => {
    const dx = (visual.flip ? 100 - x : x) - 50;
    const dy = y - 50;
    return [50 + dx * Math.cos(angle) - dy * Math.sin(angle), 50 + dx * Math.sin(angle) + dy * Math.cos(angle)];
  };
  const [a, b] = [place(from), place(to)];
  const [across, down] = [b[0] - a[0], b[1] - a[1]];
  if (Math.abs(across) > Math.abs(down)) return across > 0 ? 'right' : 'left';
  const way = down > 0 ? 'down' : 'up';
  return withSide ? `${way} at the ${(a[0] + b[0]) / 2 > 50 ? 'right' : 'left'}` : way;
}

describe('every Reasoning puzzle', () => {
  it('has a hint, and no step points at pictures that are gone or says it the old way', () => {
    const old = /\b(these|this one|each step|quarter turn|half turn|do the same|do all three|each pair|this side|the other side|layers?|distance)\b/i;
    for (const skillId of REASONING) {
      for (const level of levelsOf(skillId)) {
        for (const question of all(skillId, level)) {
          expect(question.explanation.hint?.text.trim().length ?? 0, `${skillId} level ${level} has no hint`).toBeGreaterThan(0);
          for (const step of question.explanation.steps) expect(step, `${skillId} level ${level}`).not.toMatch(old);
          // Every step is a sentence: a capital or a number first, a full stop last, and no colon lists ("sofa, bed: furniture").
          for (const step of question.explanation.steps) expect(step, `${skillId} level ${level}`).toMatch(/^[A-Z0-9][^:]*\.$/);
        }
      }
    }
  });

  it('asks in a young child\'s words: no pairs, punching, balancing, gaps or mirror pictures', () => {
    const asked = /\b(pairs?|punched|balance|mirror picture|piece|gap)\b/i;
    for (const skillId of REASONING) {
      for (const level of levelsOf(skillId)) for (const question of all(skillId, level)) expect(question.prompt.text, skillId).not.toMatch(asked);
    }
  });
});

describe('pictures and words that belong together (A.1, A.2, A.16)', () => {
  it('A.1 names the ones that go together at every level, and shows them in the explanation picture', () => {
    for (const level of [3, 4] as Level[]) {
      for (const question of choices('R-A1', level)) {
        const [together, odd] = question.explanation.steps as [string, string];
        expect(together).toMatch(/^Three of them (are|have) /);
        expect(odd).toMatch(/^The [a-z ]+ (does not belong|is round, so it does not belong)\.$/);
        // The odd one is named the way it looks: "The red triangle", "The big star", "The oval".
        const shape = asShape(question.options[question.answerIndex]);
        expect(odd).toContain(shape.shape);
        const picture = question.explanation.visual;
        if (picture?.kind !== 'row') throw new Error('the explanation shows the ones that go together');
        expect(picture.children).toHaveLength(3);
      }
    }
  });

  it('A.2 names the examples, then "So is a glove.", and things that go are said by what they do', () => {
    for (const level of [1, 2, 3] as Level[]) {
      for (const question of choices('R-A2', level)) {
        const examples = words(question, 'examples');
        const [named, more] = question.explanation.steps as [string, string];
        const lower = named.toLowerCase();
        examples.forEach((example) => expect(lower).toContain(example));
        expect(lower.indexOf(examples[0] as string)).toBeLessThan(lower.indexOf(examples[1] as string));
        expect(more).toMatch(new RegExp(`^So (is|are|does|do) (an? )?${question.facts.answer as string}\\.$`));
        expect(named).not.toContain('vehicles');
        if (question.facts.target === 'vehicles') expect(named).toMatch(/take us places\.$/);
      }
    }
  });

  it('A.1 and A.2 never show the king: his picture is a young prince', () => {
    for (const skillId of ['R-A1', 'R-A2']) {
      for (const level of levelsOf(skillId)) for (const question of all(skillId, level)) expect(JSON.stringify(question.facts)).not.toContain('king');
    }
  });

  it('A.16 says the words before it asks, so a child who cannot read them yet hears them', () => {
    for (const level of [1, 2, 3] as Level[]) {
      for (const question of choices('R-A16', level)) expect(sayText(question.prompt.speak)).toBe(`${words(question).join(', ')}. Which word does not belong?`);
    }
  });

  it('A.16 says only true things: wheels and water by what they do, and a peach is never the odd one among colors', () => {
    const groupOf = (word: string): string => Object.entries(WORD_CLASSES).find(([, members]) => members.includes(word))?.[0] ?? '?';
    const ARE: Record<string, string> = { fruit: 'are fruits', vegetable: 'are vegetables', farmAnimal: 'are farm animals', wildAnimal: 'are wild animals', land: 'have wheels', water: 'go on water', clothes: 'are clothes', furniture: 'are furniture', colour: 'are colors', shape: 'are shapes', weather: 'are kinds of weather' };
    for (const level of [1, 2, 3] as Level[]) {
      for (const question of choices('R-A16', level)) {
        const list = words(question);
        const odd = list[question.answerIndex] as string;
        const same = list.filter((word) => word !== odd);
        const group = groupOf(same[0] as string);
        const [together, notIt] = question.explanation.steps as [string, string];
        // The words in the order shown, then what they are.
        let from = 0;
        for (const word of same) {
          const at = together.toLowerCase().indexOf(word, from);
          expect(at, together).toBeGreaterThanOrEqual(0);
          from = at + word.length;
        }
        expect(together.endsWith(`${ARE[group] as string}.`), together).toBe(true);
        expect(notIt).toMatch(new RegExp(`^(An? )?${odd} (is|does) not\\.$`, 'i'));
        if (group === 'colour') expect(['peach', 'plum']).not.toContain(odd);
      }
    }
  });

  it('A.16 never makes a peach or a plum the odd one among colors: they are colors too (5,000 questions)', () => {
    const colours = WORD_CLASSES.colour ?? [];
    let asked = 0;
    for (let seed = 1; seed <= 5000; seed += 1) {
      const question = generateQuestion('R-A16', 1, seed);
      if (question.type !== 'choice') throw new Error('not a choice');
      const list = words(question);
      const odd = list[question.answerIndex] as string;
      if (!list.filter((word) => word !== odd).every((word) => colours.includes(word))) continue;
      asked += 1;
      expect(['peach', 'plum']).not.toContain(odd);
    }
    expect(asked).toBeGreaterThan(100);
  });

  it('A.16 uses everyday words: no yacht, ferry, sleet, hail or fog', () => {
    const lists = Object.values(WORD_CLASSES).flat();
    for (const hard of ['yacht', 'ferry', 'sleet', 'hail', 'fog']) expect(lists).not.toContain(hard);
  });
});

describe('figures (A.3, A.4, A.5, A.6, A.7, A.13)', () => {
  const SIZE: Record<string, string> = { s: 'small', m: 'big', l: 'big' };
  const NAMES = ['shape', 'color', 'size', 'number of shapes'];
  const worded = (i: number, value: string): string => (i === 2 ? (SIZE[value] as string) : i === 3 ? (value === '1' ? 'one' : 'two') : value);

  it('A.3 says each change on its own, then what the bottom shape becomes', () => {
    for (const level of [1, 2, 3] as Level[]) {
      for (const question of choices('R-A3', level)) {
        const [from, to, base] = [question.facts.from, question.facts.to, question.facts.base] as string[][] as [string[], string[], string[]];
        const answer = (words(question)[question.answerIndex] as string).split('|');
        const changes = from.map((_, i) => i).filter((i) => from[i] !== to[i]).map((i) => `The ${NAMES[i] as string} changes from ${worded(i, from[i] as string)} to ${worded(i, to[i] as string)}.`);
        const picture = (figure: string[]): string => `${SIZE[figure[2] as string] as string} ${figure[1] as string} ${figure[0] as string}`;
        const many = (figure: string[]): boolean => figure[3] === '2';
        const theBase = many(base) ? `the two ${picture(base)}s` : `the ${picture(base)}`;
        const anAnswer = many(answer) ? `two ${picture(answer)}s` : article(picture(answer));
        expect(question.explanation.steps).toEqual([...changes, `So ${theBase} ${many(base) ? 'become' : 'becomes'} ${anAnswer}.`]);
      }
    }
  });

  it('A.4 and A.13 ask the same thing, read across and down, and say what the box needs', () => {
    for (const skillId of ['R-A4', 'R-A13']) {
      for (const level of levelsOf(skillId)) {
        for (const question of choices(skillId, level)) {
          expect(question.prompt.text).toBe('Which one goes in the empty box?');
          const last = question.explanation.steps.at(-1) as string;
          // One name for the box in both puzzles: never a piece or a gap.
          for (const step of question.explanation.steps) expect(step).not.toMatch(/\b(piece|gap)\b/i);
          if (skillId === 'R-A4' && level === 2) {
            expect(last).toMatch(/^The box needs (one|two) (small|big) [a-z]+\.$/);
            continue;
          }
          const answer = asShape(question.options[question.answerIndex]);
          if (skillId === 'R-A4' && level === 3) {
            // A turned arrow is named by the way it points, as it is drawn.
            expect(last).toBe(`The box needs ${article(answer.color)} arrow pointing ${pointing(answer, false)}.`);
          } else {
            expect(last).toMatch(new RegExp(`^(So the|The) box needs ${article(`${answer.color} ${answer.shape}`)}\\.$`));
          }
        }
      }
    }
  });

  it('A.13 follows the stripe the box is in, and a checkerboard by its turns, never along a line', () => {
    for (const question of choices('R-A13', 1)) {
      const blank = question.facts.blank as number;
      const across = (question.facts.colAttrs as string[]).every((value) => value === 'square');
      const where = across ? (blank < 3 ? 'at the top' : 'at the bottom') : blank % 3 === 0 ? 'on the left' : 'on the right';
      const color = asShape(question.options[question.answerIndex]).color;
      expect(question.explanation.steps).toEqual([`The stripe ${where} is all ${color}.`, `So the box needs ${article(color)} square.`]);
    }
    for (const question of choices('R-A13', 2)) {
      if (question.stimulus?.kind !== 'matrix') throw new Error('not a grid');
      // The squares beside the middle are the other colour: following a line through the box would give the wrong one.
      const beside = [1, 3, 5, 7].map((i) => asShape(question.stimulus?.kind === 'matrix' ? question.stimulus.cells[i] : undefined).color);
      expect(new Set(beside).size).toBe(1);
      const color = asShape(question.options[question.answerIndex]).color;
      expect(beside[0]).not.toBe(color);
      expect(question.explanation.steps).toEqual(['The colors take turns, like a checkerboard.', `The squares next to the box are ${beside[0] as string}.`, `So the box needs ${article(color)} square.`]);
    }
  });

  it('A.5 names which way the shape points at the top level too, with the color', () => {
    for (const question of choices('R-A5', 4)) {
      if (question.stimulus?.kind !== 'sequence') throw new Error('not a row');
      const shown = question.stimulus.items.slice(0, 3).map(asShape);
      const answer = asShape(question.options[question.answerIndex]);
      const subject = answer.shape === 'arrow' ? 'The arrow' : 'The foot of the L';
      const named = answer.shape === 'arrow' ? `${article(answer.color)} arrow pointing ${pointing(answer, false)}` : `${article(answer.color)} L with its foot pointing ${pointing(answer, false)}`;
      expect(question.explanation.steps).toEqual([`${subject} points ${shown.map((each) => pointing(each, false)).join(', then ')}.`, `The color goes ${shown.map((each) => each.color).join(', ')}.`, `So next is ${named}.`]);
    }
  });

  it('A.6 asks for the picture in a mirror, and says where it points before and after', () => {
    for (const level of [1, 2, 3, 4] as Level[]) {
      for (const question of choices('R-A6', level)) {
        expect(question.prompt.text).toBe('Which one shows this picture in a mirror?');
        // The first step is the one a browser test reads (e2e/reasoning.spec.ts).
        expect(question.explanation.steps[0]).toBe('A mirror flips left and right.');
        if (level === 4) continue;
        const start = asShape(question.stimulus);
        const answer = asShape(question.options[question.answerIndex]);
        const subject = start.shape === 'flag' ? 'The flag' : 'The foot of the L';
        expect(question.explanation.steps[1]).toBe(`${subject} points ${pointing(start, true)}, so in a mirror it points ${pointing(answer, true)}.`);
      }
    }
  });

  it('A.7 says each rule through four beats, so the quick one never sounds as if it stops', () => {
    for (const level of [1, 2, 3] as Level[]) {
      for (const question of choices('R-A7', level)) {
        for (const rule of question.explanation.steps.slice(0, 2)) expect(rule).toMatch(/^The (color|size|shape) goes [a-z]+, [a-z]+, [a-z]+, [a-z]+\.$/);
      }
    }
  });
});

describe('numbers (A.8, A.10, A.11)', () => {
  it('A.8 says what the arrows mean, and every number "goes up by", "goes down by" or "doubles"', () => {
    for (const level of [1, 2, 3, 4] as Level[]) {
      for (const question of all('R-A8', level)) {
        const base = question.facts.base as number;
        expect(question.prompt.text).toBe(`Each number changes the same way. What does ${base} change to?`);
        const [rule] = question.explanation.steps as [string];
        expect(rule).toMatch(/^Each number (goes up by \d+|goes down by \d+|doubles|doubles, then goes (up|down) by \d+|becomes \d+ times as big)\.$/);
      }
    }
  });

  it('A.8 level 4: the hint points at a first move and leaves the rule to find, with numbers from one example only', () => {
    for (const question of all('R-A8', 4)) {
      const hint = question.explanation.hint?.text ?? '';
      expect(hint).not.toMatch(/times as big|doubles, then|up by|down by|take away|add/);
      const examples = question.facts.examples as [number, number][];
      const named = (hint.match(/\d+/g) ?? []).map(Number);
      expect(named).toHaveLength(2);
      expect(examples.some(([from, to]) => named[0] === from && named[1] === to), hint).toBe(true);
    }
  });

  it('A.8 level 4 multiplies a number up to 5, and A.10 level 4 multiplies by 3 only from 1, so the hardest sum is 27 times 3', () => {
    for (const question of all('R-A8', 4)) {
      if (question.type !== 'numberPad') throw new Error('not typed');
      const [[a, b]] = question.facts.examples as [[number, number]];
      if (b % a === 0 && b / a >= 3) expect(question.answer).toBeLessThanOrEqual(25);
    }
    for (const question of all('R-A10', 4)) {
      if (question.type !== 'numberPad') throw new Error('not typed');
      if (question.facts.rule === 'times' && (question.facts.steps as number[])[0] === 3) {
        expect(question.facts.start).toBe(1);
        expect(question.answer).toBe(81);
      }
    }
  });

  it('A.11 names the right side and adds up the left: "1 and 7 make 8, so the box is 7."', () => {
    for (const level of [1, 2, 3] as Level[]) {
      for (const question of all('R-A11', level)) {
        const { a, b, total } = question.facts as { a: number; b: number; total: number };
        const right = question.facts.right as number[];
        expect(question.prompt.text).toBe(level === 3 ? 'What number makes both sides the same?' : 'Which number makes both sides the same?');
        expect(question.explanation.steps).toEqual([right.length === 1 ? `The right side is ${total}.` : `On the right, ${right[0]} and ${right[1]} make ${total}.`, `${a} and ${b} make ${total}, so the box is ${b}.`]);
      }
    }
    for (const question of all('R-A11', 4)) {
      if (question.type !== 'numberPad' || question.stimulus?.kind !== 'scale') throw new Error('not a typed scale');
      const boxes = question.stimulus.left.filter((value) => value === 'blank').length;
      const rest = boxes * question.answer;
      expect(question.explanation.steps.at(-1)).toBe(`${boxes} boxes make ${rest}, so each box is ${question.answer}.`);
    }
  });
});

describe('paper folding (A.12)', () => {
  it('asks in a child\'s words, and says how many holes there are, half on each side of the fold', () => {
    for (const level of [1, 2, 3, 4] as Level[]) {
      for (const question of choices('R-A12', level)) {
        const punched = (question.facts.holes as unknown[]).length;
        expect(question.prompt.text).toBe(punched === 1 ? 'We fold the paper and make a hole. Which one shows it opened up?' : `We fold the paper and make ${punched} holes. Which one shows it opened up?`);
        const answer = question.options[question.answerIndex];
        if (answer?.kind !== 'foldPunch') throw new Error('not paper');
        expect(answer.holes).toHaveLength(2 * punched);
        expect(question.explanation.steps[1]).toBe(`Opened up, there are ${2 * punched} holes, ${punched === 1 ? 'one' : punched} on each side of the fold.`);
      }
    }
  });
});

describe('picture analogies and riddles (A.9, A.14)', () => {
  it('every pair goes one way only: three pairs a relation, no picture in two pairs, and no weather', () => {
    const relations = [...new Set(ANALOGY_PAIRS.map((pair) => pair.relation))];
    expect(relations).not.toContain('weather');
    for (const relation of relations) expect(ANALOGY_PAIRS.filter((pair) => pair.relation === relation)).toHaveLength(3);
    const pictures = ANALOGY_PAIRS.flatMap((pair) => [pair.first.word, pair.second.word]);
    expect(new Set(pictures).size).toBe(pictures.length);
    expect(ANALOGY_PAIRS.find((pair) => pair.first.word === 'bird')?.second.word).toBe('nest');
  });

  it('A.9 never offers a picture that could be argued for, at any level', () => {
    const clash = (first: string, second: string): boolean => ANALOGY_CLASHES.some(([one, two]) => one === first && two === second);
    for (const level of [1, 2] as Level[]) {
      for (const question of choices('R-A9', level)) for (const option of words(question)) expect(clash(question.facts.target as string, option)).toBe(false);
    }
    for (const question of choices('R-A9', 3)) for (const option of words(question)) expect(clash(option, question.facts.target as string)).toBe(false);
  });

  it('A.14: no riddle fits a second picture (a car keeps you dry, a clock can be read)', () => {
    const riddleOf = (word: string): string => RIDDLES.find((riddle) => riddle.word === word)?.riddle ?? '';
    expect(riddleOf('umbrella')).not.toMatch(/dry/);
    expect(riddleOf('book')).toMatch(/pages/);
  });
});

describe('word analogies (A.15)', () => {
  const pairsWith = (c: string, w: string): boolean => Object.values(VERBAL_RELATIONS).some((rel) => rel.pairs.some(([x, y]) => x === c && y === w));
  const clash = (c: string, w: string): boolean => VERBAL_CLASHES.some(([x, y]) => x === c && y === w);

  it('uses everyday words, and key means only a door key', () => {
    const listed = Object.values(VERBAL_RELATIONS).flatMap((rel) => rel.pairs.flat());
    for (const hard of ['sty', 'coal', 'piano']) expect(listed).not.toContain(hard);
    expect(Object.values(VERBAL_RELATIONS).filter((rel) => rel.pairs.some(([x]) => x === 'key'))).toHaveLength(1);
    // Every pair has its own sentence, with its articles.
    for (const [a, b] of Object.values(VERBAL_RELATIONS).flatMap((rel) => rel.pairs)) {
      const said = PAIR_SENTENCES[`${a}|${b}`] ?? '';
      expect(said, `${a} ${b}`).toMatch(/^[A-Z].*\.$/);
      expect(said.toLowerCase()).toContain(a);
      expect(said.toLowerCase()).toContain(b);
    }
  });

  it('shows both pairs, asks "goes with" and then "is to", and says each pair\'s sentence', () => {
    for (const level of [1, 2, 3] as Level[]) {
      for (const question of choices('R-A15', level)) {
        const [a, b] = words(question, 'from') as [string, string];
        const c = question.facts.base as string;
        const d = words(question)[question.answerIndex] as string;
        if (question.stimulus?.kind !== 'matrix') throw new Error('both pairs are shown in a grid');
        expect(question.stimulus.cells.map((cell) => (cell === 'blank' ? 'blank' : describeVisual(cell)))).toEqual([a, b, c, 'blank']);
        expect(question.prompt.text).toMatch(level === 3 ? / is to .* as .* is to what\?$/ : / goes with .*\. .* goes with what\?$/);
        expect(question.explanation.steps).toEqual([PAIR_SENTENCES[`${a}|${b}`], PAIR_SENTENCES[`${c}|${d}`]]);
        // A word few children know is never asked for, or shown in the example pair.
        for (const word of [a, b, d]) expect(NOT_ASKED.has(word)).toBe(false);
      }
    }
  });

  it('levels 1 and 2 offer only unrelated wrong words; level 3 always has a near miss', () => {
    for (const level of [1, 2] as Level[]) {
      for (const question of choices('R-A15', level)) {
        const c = question.facts.base as string;
        const wrong = words(question).filter((_, i) => i !== question.answerIndex);
        for (const word of wrong) expect(pairsWith(c, word) || clash(c, word) || (NEAR_MISSES[c] ?? []).includes(word), `${c} with ${word}`).toBe(false);
      }
    }
    for (const question of choices('R-A15', 3)) {
      const c = question.facts.base as string;
      const wrong = words(question).filter((_, i) => i !== question.answerIndex);
      const near = (word: string): boolean => pairsWith(c, word) || (NEAR_MISSES[c] ?? []).includes(word);
      expect(wrong.some(near), JSON.stringify(question.facts)).toBe(true);
      // The near miss is meant to tempt (a tree is green). The other wrong word is never one that could be argued for.
      for (const word of wrong.filter((each) => !near(each))) expect(clash(c, word), `${c} with ${word}`).toBe(false);
    }
  });
});

// The answer is named in each closing step, so the right answer is never left for the child to guess.
describe('the last step names the answer', () => {
  it('A.1 to A.17, where the answer is a picture with a name', () => {
    for (const question of choices('R-A3', 1)) expect(question.explanation.steps.at(-1)).toContain(answerText(question).replace('large', 'big'));
    for (const question of choices('R-A14', 1)) expect((question.explanation.steps[0] as string).toLowerCase()).toContain(answerText(question));
  });
});
