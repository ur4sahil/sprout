import type { Rng } from '../../../../engine/rng';
import { makeRng } from '../../../../engine/rng';
import type { LessonStep, Level, QuestionDraft, Say, ShapeName, Visual } from '../../../../engine/types';
import type { SkillGenerator } from '../../../generator';
import { numeral } from '../../../generator';
import { numeralChoices } from '../k/numerals';
import { shape } from '../pk/parts';

// Grade 1 skills added by the Nov 17, 2026 curriculum check: B.11 order does not matter, B.12 subtract by
// thinking of adding, B.13 count on to add, C.5 measure with paper clips, D.3 how many pieces make a shape.

type Explanation = { speak: Say; steps: string[]; visual: Visual };
const equation = (...parts: (number | string)[]): Visual => ({ kind: 'equation', parts });
// Words with numbers in them, said with each number as a number.
const spoken = (words: string): Say => words.split(/(\d+)/).filter((part) => part.length > 0).map((part) => (/^\d+$/.test(part) ? { number: Number(part) } : part));
const text = (value: string, speak: Say): Visual => ({ kind: 'text', value, size: 'l', speak });

// ---- B.11 Order does not matter ----
// Levels: 3 + 5 = 5 + ? / which is the same as 4 + 7 / typed, to 20. Oracle: turnaround.

function turnExplanation(a: number, b: number): Explanation {
  return {
    speak: ['Adding in any order gives the same total.', { number: a }, 'plus', { number: b }, 'and', { number: b }, 'plus', { number: a }, 'both make', { number: a + b }, '.'],
    steps: ['Adding in any order gives the same total.', `${a} + ${b} = ${b} + ${a} = ${a + b}.`],
    visual: equation(a, '+', b, '=', b, '+', a),
  };
}

function turnaround(level: Level, rng: Rng): QuestionDraft {
  const a = rng.int(1, level === 1 ? 6 : 10);
  let b = rng.int(1, level === 1 ? 6 : 10);
  if (b === a) b = a === 1 ? 2 : a - 1;
  if (level === 2) {
    const options = rng.shuffle([`${b} + ${a}`, `${a} + ${b + 1}`, `${a} + ${a}`].filter((each, i, all) => all.indexOf(each) === i));
    const prompt = `Which is the same as ${a} + ${b}?`;
    return {
      type: 'choice',
      mode: 'look',
      facts: { a, b, ask: 'same', options },
      prompt: { text: prompt, speak: ['Which is the same as', { number: a }, 'plus', { number: b }, '?'] },
      options: options.map((each) => {
        const [x = '0', , y = '0'] = each.split(' ');
        return text(each, [{ number: Number(x) }, 'plus', { number: Number(y) }]);
      }),
      answerIndex: options.indexOf(`${b} + ${a}`),
      explanation: turnExplanation(a, b),
    };
  }
  const prompt = { text: `${a} + ${b} = ${b} + ?`, speak: [{ number: a }, 'plus', { number: b }, 'equals', { number: b }, 'plus what?'] as Say };
  const base = { mode: 'look' as const, facts: { a, b, ask: 'missing' }, prompt, stimulus: equation(a, '+', b, '=', b, '+', 'blank'), explanation: turnExplanation(a, b) };
  if (level === 3) return { ...base, type: 'numberPad', answer: a, maxDigits: 2 };
  const values = numeralChoices(a, [b, a + b, a + 1], 0, 20, rng);
  return { ...base, type: 'choice', facts: { ...base.facts, options: values }, options: values.map((value) => numeral(value)), answerIndex: values.indexOf(a) };
}

export const turnaroundGenerator: SkillGenerator = {
  skillId: 'M-1-B11',
  maxLevel: 3,
  itemTypes: ['choice', 'numberPad'],
  lists: [],
  generate: turnaround,
  exampleSeed: 651,
  example: () => turnaround(1, makeRng(651)),
  lesson: (): LessonStep[] => [
    { beat: 'see', text: 'You can add numbers in any order. The total stays the same.', speak: ['You can add numbers in any order. The total stays the same.'], visual: equation(3, '+', 5, '=', 5, '+', 3) },
    { beat: 'watch', text: turnExplanation(3, 5).steps.join(' '), speak: turnExplanation(3, 5).speak, visual: turnExplanation(3, 5).visual },
    { beat: 'try', text: '2 + 7 = 7 + ?', speak: [{ number: 2 }, 'plus', { number: 7 }, 'equals', { number: 7 }, 'plus what?'], visual: equation(2, '+', 7, '=', 7, '+', 'blank'), reveal: { text: turnExplanation(2, 7).steps.join(' '), speak: turnExplanation(2, 7).speak, visual: turnExplanation(2, 7).visual } },
    { beat: 'remember', text: 'Turn it around: same total.', speak: ['Turn it around: same total.'], visual: equation(4, '+', 6, '=', 6, '+', 4) },
  ],
  oracle: 'turnaround',
};

// ---- B.12 Subtract by adding ----
// Levels: 9 − 4 as 4 + ? = 9 with a picture / without / typed, to 20. Oracle: subtract.

function thinkAddExplanation(whole: number, part: number): Explanation {
  return {
    speak: ['To find', { number: whole }, 'minus', { number: part }, ', think:', { number: part }, 'plus what makes', { number: whole }, '?', { number: part }, 'plus', { number: whole - part }, 'is', { number: whole }, '.'],
    steps: [`Think: ${part} + ? = ${whole}.`, `${part} + ${whole - part} = ${whole}.`, `So ${whole} − ${part} = ${whole - part}.`],
    visual: equation(part, '+', whole - part, '=', whole),
  };
}

function subtractByAdding(level: Level, rng: Rng): QuestionDraft {
  const whole = rng.int(level === 1 ? 5 : 8, level === 1 ? 10 : 20);
  const part = rng.int(Math.max(1, whole - 10), whole - 1);
  const answer = whole - part;
  const prompt = { text: `${whole} − ${part} = ?  Think: ${part} + ? = ${whole}.`, speak: [{ number: whole }, 'minus', { number: part }, 'equals what? Think:', { number: part }, 'plus what equals', { number: whole }, '?'] as Say };
  const stimulus: Visual = level === 1 ? { kind: 'emojiGroup', emoji: '🔴', count: part, emoji2: '⚪', count2: answer, layout: whole > 10 ? 'grid5' : 'row' } : equation(part, '+', 'blank', '=', whole);
  const base = { mode: 'look' as const, facts: { a: whole, b: part }, prompt, stimulus, explanation: thinkAddExplanation(whole, part) };
  if (level === 3) return { ...base, type: 'numberPad', answer, maxDigits: 2 };
  const values = numeralChoices(answer, [whole, answer + 1, answer - 1, part], 0, 20, rng);
  return { ...base, type: 'choice', facts: { ...base.facts, options: values }, options: values.map((value) => numeral(value)), answerIndex: values.indexOf(answer) };
}

export const subtractByAddingGenerator: SkillGenerator = {
  skillId: 'M-1-B12',
  maxLevel: 3,
  itemTypes: ['choice', 'numberPad'],
  lists: [],
  generate: subtractByAdding,
  exampleSeed: 652,
  example: () => subtractByAdding(1, makeRng(652)),
  lesson: (): LessonStep[] => [
    { beat: 'see', text: 'Taking away is the same as finding the missing part.', speak: ['Taking away is the same as finding the missing part.'], visual: equation(4, '+', 'blank', '=', 9) },
    { beat: 'watch', text: thinkAddExplanation(9, 4).steps.join(' '), speak: thinkAddExplanation(9, 4).speak, visual: thinkAddExplanation(9, 4).visual },
    { beat: 'try', text: '12 − 5 = ?  Think: 5 + ? = 12.', speak: [{ number: 12 }, 'minus', { number: 5 }, 'equals what? Think:', { number: 5 }, 'plus what equals', { number: 12 }, '?'], visual: equation(5, '+', 'blank', '=', 12), reveal: { text: thinkAddExplanation(12, 5).steps.join(' '), speak: thinkAddExplanation(12, 5).speak, visual: thinkAddExplanation(12, 5).visual } },
    { beat: 'remember', text: 'Minus? Think plus.', speak: ['Minus? Think plus.'], visual: equation(4, '+', 5, '=', 9) },
  ],
  oracle: 'subtract',
};

// ---- B.13 Count on to add ----
// Levels: count on 1 or 2 on a number line / count on 3 / typed, to 20. Oracle: add.

function countOnExplanation(start: number, more: number): Explanation {
  const steps = Array.from({ length: more }, (_, i) => start + i + 1);
  return {
    speak: ['Start at', { number: start }, '. Count on', { number: more }, ':', ...steps.flatMap((n) => [{ number: n }]), '.'],
    steps: [`Start at ${start}.`, `Count on ${more}: ${steps.join(', ')}.`, `${start} + ${more} = ${start + more}.`],
    visual: { kind: 'numberLine', min: start - 1, max: start + more + 1, step: 1, marked: [start, start + more] },
  };
}

function countOn(level: Level, rng: Rng): QuestionDraft {
  const more = level === 1 ? rng.int(1, 2) : rng.int(2, 3);
  const start = rng.int(level === 1 ? 3 : 5, level === 1 ? 9 : 17);
  const answer = start + more;
  const prompt = { text: `Start at ${start}. Count on ${more}. Where do you land?`, speak: ['Start at', { number: start }, '. Count on', { number: more }, '. Where do you land?'] as Say };
  const stimulus: Visual = level === 3 ? equation(start, '+', more, '=', 'blank') : { kind: 'numberLine', min: start - 2, max: start + 6, step: 1, marked: [start] };
  const base = { mode: 'look' as const, facts: { a: start, b: more }, prompt, stimulus, explanation: countOnExplanation(start, more) };
  if (level === 3) return { ...base, type: 'numberPad', answer, maxDigits: 2 };
  const values = numeralChoices(answer, [answer - 1, answer + 1, start + more + 2], 0, 25, rng);
  return { ...base, type: 'choice', facts: { ...base.facts, options: values }, options: values.map((value) => numeral(value)), answerIndex: values.indexOf(answer) };
}

export const countOnGenerator: SkillGenerator = {
  skillId: 'M-1-B13',
  maxLevel: 3,
  itemTypes: ['choice', 'numberPad'],
  lists: [],
  generate: countOn,
  exampleSeed: 653,
  example: () => countOn(1, makeRng(653)),
  lesson: (): LessonStep[] => [
    { beat: 'see', text: 'To add a small number, start at the big number and count on.', speak: ['To add a small number, start at the big number and count on.'], visual: { kind: 'numberLine', min: 6, max: 12, step: 1, marked: [8] } },
    { beat: 'watch', text: countOnExplanation(8, 3).steps.join(' '), speak: countOnExplanation(8, 3).speak, visual: countOnExplanation(8, 3).visual },
    { beat: 'try', text: 'Start at 6. Count on 2. Where do you land?', speak: ['Start at', { number: 6 }, '. Count on', { number: 2 }, '. Where do you land?'], visual: { kind: 'numberLine', min: 4, max: 12, step: 1, marked: [6] }, reveal: { text: countOnExplanation(6, 2).steps.join(' '), speak: countOnExplanation(6, 2).speak, visual: countOnExplanation(6, 2).visual } },
    { beat: 'remember', text: 'Start big, count on small.', speak: ['Start big, count on small.'], visual: { kind: 'numberLine', min: 6, max: 12, step: 1, marked: [8, 11] } },
  ],
  oracle: 'add',
};

// ---- C.5 Measure with paper clips ----
// Levels: count the clips / which is measured the right way / how many clips longer, typed. Oracles: count,
// lineUp, subtract.

const CLIP = '📎';
const clips = (count: number): Visual => ({ kind: 'emojiGroup', emoji: CLIP, count, layout: 'row' });
const measured = (emoji: string, count: number): Visual => ({ kind: 'row', children: [{ kind: 'emojiGroup', emoji, count: 1, layout: 'row' }, clips(count)] });
// Clips along one row of the 5 by 4 grid, with a gap at `gap`, or none.
const spaced = (count: number, gap: number | null): Visual => ({ kind: 'emojiGroup', emoji: CLIP, count, layout: 'scatter', slots: Array.from({ length: count }, (_, i) => (gap !== null && i >= gap ? i + 1 : i)) });

function paperClips(level: Level, rng: Rng): QuestionDraft {
  if (level === 2) {
    const count = rng.int(3, 4);
    const gap = rng.int(1, count - 1);
    const shapes = rng.shuffle(['lined', 'gap', 'start'] as const);
    const draw = (kind: (typeof shapes)[number]): Visual => (kind === 'lined' ? spaced(count, null) : kind === 'gap' ? spaced(count, gap) : { kind: 'emojiGroup', emoji: CLIP, count, layout: 'scatter', slots: Array.from({ length: count }, (_, i) => i + 1) });
    const prompt = 'Which row of paper clips is lined up the right way, from the start with no gaps?';
    return {
      type: 'choice',
      mode: 'look',
      facts: { ask: 'lined', rows: shapes.map((kind) => (kind === 'lined' ? 'start,nogap' : kind === 'gap' ? 'start,gap' : 'late,nogap')), options: [...shapes] },
      prompt: { text: prompt, speak: [prompt] },
      options: shapes.map(draw),
      answerIndex: shapes.indexOf('lined'),
      explanation: { speak: ['Start at the very end and leave no gaps between the clips.'], steps: ['Start at the very end.', 'Leave no gaps.'], visual: spaced(count, null) },
    };
  }
  const thing = rng.pick([{ emoji: '✏️', name: 'pencil' }, { emoji: '🖍️', name: 'crayon' }, { emoji: '🥄', name: 'spoon' }]);
  if (level === 3) {
    const [long, short] = [rng.int(5, 9), rng.int(2, 4)];
    const prompt = { text: `The ${thing.name} is ${long} paper clips long. A key is ${short} paper clips long. How many clips longer is the ${thing.name}?`, speak: [`The ${thing.name} is`, { number: long }, 'paper clips long. A key is', { number: short }, `paper clips long. How many clips longer is the ${thing.name}?`] as Say };
    return {
      type: 'numberPad',
      mode: 'look',
      facts: { a: long, b: short, oracle: 'subtract' },
      prompt,
      stimulus: { kind: 'row', children: [measured(thing.emoji, long), measured('🔑', short)] },
      answer: long - short,
      maxDigits: 1,
      explanation: { speak: [{ number: long }, 'minus', { number: short }, 'is', { number: long - short }, '.'], steps: [`${long} − ${short} = ${long - short}.`, `The ${thing.name} is ${long - short} clips longer.`], visual: equation(long, '-', short, '=', long - short) },
    };
  }
  const count = rng.int(2, 8);
  const values = numeralChoices(count, [count + 1, count - 1, count + 2], 1, 10, rng);
  const prompt = `How many paper clips long is the ${thing.name}?`;
  return {
    type: 'choice',
    mode: 'look',
    facts: { n: count, oracle: 'count', options: values },
    prompt: { text: prompt, speak: [prompt] },
    stimulus: measured(thing.emoji, count),
    options: values.map((value) => numeral(value)),
    answerIndex: values.indexOf(count),
    explanation: { speak: ['Count the clips from end to end:', { number: count }, '.'], steps: [`Count the clips from end to end: ${count}.`], visual: measured(thing.emoji, count) },
  };
}

export const paperClipsGenerator: SkillGenerator = {
  skillId: 'M-1-C5',
  maxLevel: 3,
  itemTypes: ['choice', 'numberPad'],
  lists: [],
  pool: { 1: 7, 2: 6 },
  generate: paperClips,
  exampleSeed: 654,
  example: () => paperClips(1, makeRng(654)),
  lesson: (): LessonStep[] => [
    { beat: 'see', text: 'Measure by lining up the same things end to end, with no gaps.', speak: ['Measure by lining up the same things end to end, with no gaps.'], visual: measured('✏️', 5) },
    { beat: 'watch', text: 'The pencil is 5 paper clips long.', speak: ['The pencil is five paper clips long.'], visual: measured('✏️', 5) },
    { beat: 'try', text: 'How many paper clips long is the spoon?', speak: ['How many paper clips long is the spoon?'], visual: measured('🥄', 3), reveal: { text: 'Count them: 3 paper clips.', speak: ['Count them: three paper clips.'], visual: measured('🥄', 3) } },
    { beat: 'remember', text: 'Start at the end. No gaps.', speak: ['Start at the end. No gaps.'], visual: spaced(4, null) },
  ],
  oracle: 'lineUp',
};

// ---- D.3 How many pieces make a shape ----
// Levels: 2-piece shapes / up to 6 pieces / typed. Oracle: composeShape.

const PIECES: readonly { piece: ShapeName; count: number; makes: ShapeName }[] = [
  { piece: 'square', count: 2, makes: 'rectangle' },
  { piece: 'triangle', count: 2, makes: 'square' },
  { piece: 'trapezoid', count: 2, makes: 'hexagon' },
  { piece: 'triangle', count: 6, makes: 'hexagon' },
  { piece: 'triangle', count: 4, makes: 'triangle' },
];

function howManyPieces(level: Level, rng: Rng): QuestionDraft {
  const entry = rng.pick(level === 1 ? PIECES.filter((each) => each.count <= 4) : PIECES);
  const prompt = `How many ${entry.piece}s make this ${entry.makes}?`;
  const base = {
    mode: 'look' as const,
    facts: { ask: 'count', piece: entry.piece, makes: entry.makes },
    prompt: { text: prompt, speak: [prompt] },
    stimulus: { kind: 'row', children: [shape(entry.makes, 'orange', 'l'), shape(entry.piece, 'blue', 's')] } as Visual,
    explanation: { speak: spoken(`${entry.count} ${entry.piece}s fit together to make a ${entry.makes === entry.piece ? `bigger ${entry.makes}` : entry.makes}.`), steps: [`${entry.count} ${entry.piece}s fit together to make a ${entry.makes}.`], visual: { kind: 'row', children: Array.from({ length: entry.count }, (): Visual => shape(entry.piece, 'blue', 's')) } as Visual },
  };
  if (level === 3) return { ...base, type: 'numberPad', answer: entry.count, maxDigits: 1 };
  const values = numeralChoices(entry.count, [entry.count + 1, entry.count - 1, entry.count + 2, entry.count - 2], 1, 8, rng);
  return { ...base, type: 'choice', facts: { ...base.facts, options: values }, options: values.map((value) => numeral(value)), answerIndex: values.indexOf(entry.count) };
}

export const howManyPiecesGenerator: SkillGenerator = {
  skillId: 'M-1-D3',
  maxLevel: 3,
  itemTypes: ['choice', 'numberPad'],
  lists: [],
  pool: { 1: 4, 2: 5, 3: 5 },
  generate: howManyPieces,
  exampleSeed: 655,
  example: () => howManyPieces(1, makeRng(655)),
  lesson: (): LessonStep[] => [
    { beat: 'see', text: 'Shapes can be built from smaller shapes.', speak: ['Shapes can be built from smaller shapes.'], visual: shape('hexagon', 'orange', 'l') },
    { beat: 'watch', text: '6 triangles fit together to make a hexagon.', speak: ['Six triangles fit together to make a hexagon.'], visual: { kind: 'row', children: Array.from({ length: 6 }, (): Visual => shape('triangle', 'blue', 's')) } },
    { beat: 'try', text: 'How many squares make this rectangle?', speak: ['How many squares make this rectangle?'], visual: shape('rectangle', 'orange', 'l'), reveal: { text: '2 squares make a rectangle.', speak: ['Two squares make a rectangle.'], visual: { kind: 'row', children: [shape('square', 'blue', 's'), shape('square', 'blue', 's')] } } },
    { beat: 'remember', text: 'Big shapes can be split into small ones.', speak: ['Big shapes can be split into small ones.'], visual: shape('hexagon', 'orange', 'l') },
  ],
  oracle: 'composeShape',
};
