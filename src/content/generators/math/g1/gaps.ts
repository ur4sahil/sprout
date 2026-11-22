import type { Rng } from '../../../../engine/rng';
import { makeRng } from '../../../../engine/rng';
import type { ClipObject, LessonStep, Level, QuestionDraft, Say, ShapeName, Visual } from '../../../../engine/types';
import { figureFor } from '../../../../engine/figures';
import type { SkillGenerator } from '../../../generator';
import { numeral } from '../../../generator';
import { numeralChoices } from '../k/numerals';
import type { Shown } from './wording';
import { explain, hintFor } from './wording';

// Grade 1 skills added by the Nov 17, 2026 curriculum check: B.11 order does not matter, B.12 subtract by
// thinking of adding, B.13 count on to add, C.5 measure with paper clips, D.3 how many pieces make a shape.

const equation = (...parts: (number | string)[]): Visual => ({ kind: 'equation', parts });
// Words with numbers in them, said with each number as a number.
const spoken = (words: string): Say => words.split(/(\d+)/).filter((part) => part.length > 0).map((part) => (/^\d+$/.test(part) ? { number: Number(part) } : part));
const text = (value: string, speak: Say): Visual => ({ kind: 'text', value, size: 'l', speak });

// ---- B.11 Order does not matter ----
// Levels: 3 + 5 = 5 + ? / which is the same as 4 + 7 / typed, to 20. Oracle: turnaround.

// "4 + 1 and 1 + 4 both make 5.", never a chain of "equals ... equals", which is hard to follow by ear.
function turnExplanation(a: number, b: number): Shown {
  return explain(['Adding in any order gives the same total.', `${a} + ${b} and ${b} + ${a} both make ${a + b}.`], equation(a, '+', b, '=', b, '+', a), { text: 'Adding the same numbers in any order makes the same total.' });
}

function turnaround(level: Level, rng: Rng): QuestionDraft {
  const a = rng.int(1, level === 1 ? 6 : 10);
  let b = rng.int(1, level === 1 ? 6 : 10);
  if (b === a) b = a === 1 ? 2 : a - 1;
  if (level === 2) {
    const options = rng.shuffle([`${b} + ${a}`, `${a} + ${b + 1}`, `${a} + ${a}`].filter((each, i, all) => all.indexOf(each) === i));
    // "The same" is said in full, as in B.4 and B.19.
    const prompt = `Which one has the same answer as ${a} + ${b}?`;
    return {
      type: 'choice',
      mode: 'look',
      facts: { a, b, ask: 'same', options },
      prompt: { text: prompt, speak: ['Which one has the same answer as', { number: a }, 'plus', { number: b }, '?'] },
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

// The same words as B.5: "Think: 1 plus what makes 8?" The hint is a new move, never the question again.
function thinkAddExplanation(whole: number, part: number): Shown {
  const answer = whole - part;
  const hint = hintFor(answer, `Count up from ${part} to ${whole}.`, 'Count up from the number you take away to the first number.');
  return explain([`Think: ${part} plus what makes ${whole}?`, `${part} + ${answer} = ${whole}.`, `So ${whole} − ${part} = ${answer}.`], equation(part, '+', answer, '=', whole), hint);
}

function subtractByAdding(level: Level, rng: Rng): QuestionDraft {
  const whole = rng.int(level === 1 ? 5 : 8, level === 1 ? 10 : 20);
  const part = rng.int(Math.max(1, whole - 10), whole - 1);
  const answer = whole - part;
  const prompt = { text: `What is ${whole} − ${part}? Think: ${part} + ? = ${whole}.`, speak: ['What is', { number: whole }, 'minus', { number: part }, '? Think:', { number: part }, 'plus what equals', { number: whole }, '?'] as Say };
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
    { beat: 'try', text: 'What is 12 − 5? Think: 5 + ? = 12.', speak: ['What is', { number: 12 }, 'minus', { number: 5 }, '? Think:', { number: 5 }, 'plus what equals', { number: 12 }, '?'], visual: equation(5, '+', 'blank', '=', 12), reveal: { text: thinkAddExplanation(12, 5).steps.join(' '), speak: thinkAddExplanation(12, 5).speak, visual: thinkAddExplanation(12, 5).visual } },
    { beat: 'remember', text: 'Minus? Think plus.', speak: ['Minus? Think plus.'], visual: equation(4, '+', 5, '=', 9) },
  ],
  oracle: 'subtract',
};

// ---- B.13 Count on to add ----
// Levels: count on 1 or 2 on a number line / count on 3 / typed, to 20. Oracle: add.

// The hint is a new move, never the question again: "Put your finger on 3. Hop 2 times."
function countOnExplanation(start: number, more: number, line: boolean): Shown {
  const steps = Array.from({ length: more }, (_, i) => start + i + 1);
  const hops = more === 1 ? 'Hop once.' : `Hop ${more} times.`;
  const hint = line ? `Put your finger on ${start}. ${hops}` : `Say ${start}, then count on ${more} more.`;
  return explain([`Start at ${start}.`, `Count on ${more}: ${steps.join(', ')}.`, `${start} + ${more} = ${start + more}.`], { kind: 'numberLine', min: start - 1, max: start + more + 1, step: 1, marked: [start, start + more] }, { text: hint });
}

function countOn(level: Level, rng: Rng): QuestionDraft {
  const more = level === 1 ? rng.int(1, 2) : rng.int(2, 3);
  const start = rng.int(level === 1 ? 3 : 5, level === 1 ? 9 : 17);
  const answer = start + more;
  // With no number line to land on (level 3), the question asks for the number reached.
  const ask = level === 3 ? 'What number do you get to?' : 'Where do you land?';
  const prompt = { text: `Start at ${start}. Count on ${more}. ${ask}`, speak: ['Start at', { number: start }, '. Count on', { number: more }, `. ${ask}`] as Say };
  const stimulus: Visual = level === 3 ? equation(start, '+', more, '=', 'blank') : { kind: 'numberLine', min: start - 2, max: start + 6, step: 1, marked: [start] };
  const base = { mode: 'look' as const, facts: { a: start, b: more }, prompt, stimulus, explanation: countOnExplanation(start, more, level !== 3) };
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
    { beat: 'watch', text: countOnExplanation(8, 3, true).steps.join(' '), speak: countOnExplanation(8, 3, true).speak, visual: countOnExplanation(8, 3, true).visual },
    { beat: 'try', text: 'Start at 6. Count on 2. Where do you land?', speak: ['Start at', { number: 6 }, '. Count on', { number: 2 }, '. Where do you land?'], visual: { kind: 'numberLine', min: 4, max: 12, step: 1, marked: [6] }, reveal: { text: countOnExplanation(6, 2, true).steps.join(' '), speak: countOnExplanation(6, 2, true).speak, visual: countOnExplanation(6, 2, true).visual } },
    { beat: 'remember', text: 'Start big, count on small.', speak: ['Start big, count on small.'], visual: { kind: 'numberLine', min: 6, max: 12, step: 1, marked: [8, 11] } },
  ],
  oracle: 'add',
};

// ---- C.5 Measure with paper clips ----
// Levels: count the clips / which is measured the right way / how many clips longer, typed. Oracles: count,
// lineUp, subtract.

// The clips lie under a drawn thing (the owner's choice, Nov 22, 2026), so lining them up is measuring something:
// they start at its end, touch, and reach its other end. `at` lists where each clip lies, in clip lengths from
// the thing's left end.
const clipsUnder = (object: ClipObject, length: number, at: number[], bent = false): Visual => ({ kind: 'clipRow', object, length, clips: at, ...(bent ? { bent: true as const } : {}) });
const endToEnd = (count: number): number[] => Array.from({ length: count }, (_, i) => i);
const measured = (object: ClipObject, count: number): Visual => clipsUnder(object, count, endToEnd(count));

function paperClips(level: Level, rng: Rng): QuestionDraft {
  if (level === 2) {
    // Lined up the right way: from the end of the pencil or crayon above, in a straight line, each clip touching
    // the next. The wrong rows have a gap between two clips (so they hold one clip fewer), or are not straight.
    const count = rng.int(3, 4);
    const gap = rng.int(1, count - 2);
    const shapes = rng.shuffle(['lined', 'gap', 'bent'] as const);
    const object = rng.pick(['pencil', 'crayon'] as const);
    const draw = (kind: (typeof shapes)[number]): Visual =>
      kind === 'lined' ? measured(object, count) : kind === 'gap' ? clipsUnder(object, count, endToEnd(count).filter((at) => at !== gap)) : clipsUnder(object, count, endToEnd(count), true);
    const prompt = `Which paper clips measure the ${object} the right way?`;
    const lines = [`The clips must start at the end of the ${object}.`, 'They must go in a straight line.', 'Each clip must touch the next one, with no gaps.', 'Only one row does all three.'];
    return {
      type: 'choice',
      mode: 'look',
      facts: { ask: 'lined', rows: shapes.map((kind) => (kind === 'lined' ? 'start,nogap' : kind === 'gap' ? 'start,gap' : 'bent,nogap')), options: [...shapes] },
      prompt: { text: prompt, speak: [prompt] },
      options: shapes.map(draw),
      answerIndex: shapes.indexOf('lined'),
      explanation: explain(lines, measured(object, count), { text: 'Look for clips in a straight line, with no gaps.' }),
    };
  }
  const thing = rng.pick([{ object: 'pencil', name: 'pencil' }, { object: 'crayon', name: 'crayon' }, { object: 'spoon', name: 'spoon' }] as const);
  if (level === 3) {
    const [long, short] = [rng.int(5, 9), rng.int(2, 4)];
    const prompt = { text: `The ${thing.name} is ${long} paper clips long. A key is ${short} paper clips long. How many clips longer is the ${thing.name}?`, speak: [`The ${thing.name} is`, { number: long }, 'paper clips long. A key is', { number: short }, `paper clips long. How many clips longer is the ${thing.name}?`] as Say };
    const lines = [`The ${thing.name} is ${long} clips. The key is ${short} clips.`, `${long} − ${short} = ${long - short}.`, `The ${thing.name} is ${long - short} ${long - short === 1 ? 'clip' : 'clips'} longer.`];
    return {
      type: 'numberPad',
      mode: 'look',
      facts: { a: long, b: short, oracle: 'subtract' },
      prompt,
      answer: long - short,
      maxDigits: 1,
      explanation: explain(lines, equation(long, '-', short, '=', long - short), { text: `Count up from the key's clips to the ${thing.name}'s clips.` }),
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
    stimulus: measured(thing.object, count),
    options: values.map((value) => numeral(value)),
    answerIndex: values.indexOf(count),
    explanation: explain(['Count the clips from one end to the other.', `The ${thing.name} is ${count} paper clips long.`], measured(thing.object, count), { text: 'Count the clips, one by one.' }),
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
    { beat: 'see', text: 'Measure by lining up the same things end to end, with no gaps.', speak: ['Measure by lining up the same things end to end, with no gaps.'], visual: measured('pencil', 5) },
    { beat: 'watch', text: 'The pencil is 5 paper clips long.', speak: ['The pencil is five paper clips long.'], visual: measured('pencil', 5) },
    { beat: 'try', text: 'How many paper clips long is the spoon?', speak: ['How many paper clips long is the spoon?'], visual: measured('spoon', 3), reveal: { text: 'Count them: 3 paper clips.', speak: ['Count them: three paper clips.'], visual: measured('spoon', 3) } },
    { beat: 'remember', text: 'Start at the end. No gaps.', speak: ['Start at the end. No gaps.'], visual: measured('crayon', 4) },
  ],
  oracle: 'lineUp',
};

// ---- D.3 How many pieces make a shape ----
// The child fills the shape with pieces that really fit (the owner's request, Nov 18, 2026), then answers with
// how many it took. Levels: shapes of 2 to 4 pieces / every shape / every shape, with a piece in the tray that does not fit.
// Oracle: composeShape.

const PIECES: readonly { piece: ShapeName; count: number; makes: ShapeName }[] = [
  { piece: 'square', count: 2, makes: 'rectangle' },
  { piece: 'triangle', count: 2, makes: 'square' },
  { piece: 'trapezoid', count: 2, makes: 'hexagon' },
  { piece: 'triangle', count: 6, makes: 'hexagon' },
  { piece: 'triangle', count: 4, makes: 'triangle' },
];

function howManyPieces(level: Level, rng: Rng): QuestionDraft {
  const entry = rng.pick(level === 1 ? PIECES.filter((each) => each.count <= 4) : PIECES);
  const figure = figureFor(entry.makes, entry.piece, entry.count);
  if (!figure) throw new Error(`No figure for ${entry.count} ${entry.piece}s making a ${entry.makes}`);
  const whole = entry.makes === entry.piece ? `big ${entry.makes}` : entry.makes;
  const prompt = `Fill the ${whole} with ${entry.piece}s. How many does it take?`;
  const line = `${entry.count} ${entry.piece}s fit together to make the ${whole}.`;
  const first = level === 3 ? 'One piece in the tray does not fit. Leave it out.' : `Fit the ${entry.piece}s in, with no gaps.`;
  return {
    type: 'fillShape',
    mode: 'look',
    figure,
    odd: level === 3,
    answer: entry.count,
    facts: { ask: 'count', piece: entry.piece, makes: entry.makes },
    prompt: { text: prompt, speak: spoken(prompt) },
    explanation: explain([first, line], { kind: 'figure', figure, show: 'cut' }, { text: 'Put the pieces in one at a time. Count them as you go.' }),
  };
}

export const howManyPiecesGenerator: SkillGenerator = {
  skillId: 'M-1-D3',
  maxLevel: 3,
  itemTypes: ['fillShape'],
  lists: [],
  pool: { 1: 4, 2: 5, 3: 5 },
  generate: howManyPieces,
  exampleSeed: 655,
  example: () => howManyPieces(1, makeRng(655)),
  lesson: (): LessonStep[] => [
    { beat: 'see', text: 'Shapes can be built from smaller shapes.', speak: ['Shapes can be built from smaller shapes.'], visual: { kind: 'figure', figure: 'hex-6tri', show: 'whole' } },
    { beat: 'watch', text: '6 triangles fit together to make a hexagon.', speak: ['Six triangles fit together to make a hexagon.'], visual: { kind: 'figure', figure: 'hex-6tri', show: 'cut' } },
    { beat: 'try', text: 'How many triangles make this square?', speak: ['How many triangles make this square?'], visual: { kind: 'figure', figure: 'square-2tri', show: 'whole' }, reveal: { text: '2 triangles make the square.', speak: ['Two triangles make the square.'], visual: { kind: 'figure', figure: 'square-2tri', show: 'cut' } } },
    { beat: 'remember', text: 'Big shapes can be split into small ones.', speak: ['Big shapes can be split into small ones.'], visual: { kind: 'figure', figure: 'hex-6tri', show: 'pieces' } },
  ],
  oracle: 'composeShape',
};
