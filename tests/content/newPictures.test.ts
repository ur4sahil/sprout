// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { CATALOGUE } from '../../src/content/catalogue';
import { DAY_THINGS } from '../../src/content/data/h2-world';
import { generateQuestion } from '../../src/content/registry';
import type { Level, Question, Visual } from '../../src/engine/types';

// Where the pictures the owner chose on Nov 22, 2026 are used, and the rules each use keeps (AFTER-MERGE, agent P):
// a unit on every ruler in a measuring question, the same line on an inch and a centimeter ruler (grade 2 C.5),
// a title on every graph, words under the a.m. and p.m. picture choices (grade 2 C.8), a rectangle drawn to its
// sides (grade 3 F.4 level 2, F.9 levels 2 and 3), plates or baskets to share onto (grade 3 D.1), a pencil or
// crayon over the paper clips (grade 1 C.5), and a drawn measuring cup (kindergarten F.3).

const SEEDS = 120;
const all = (skillId: string, level: Level, seeds = SEEDS): Question[] => Array.from({ length: seeds }, (_, i) => generateQuestion(skillId, level, i + 1));
const levelsOf = (skillId: string): Level[] => Array.from({ length: CATALOGUE.find((skill) => skill.id === skillId)?.maxLevel ?? 3 }, (_, i) => (i + 1) as Level);
const every = (skillId: string, seeds = SEEDS): Question[] => levelsOf(skillId).flatMap((level) => all(skillId, level, seeds));
const n = (question: Question, name: string): number => question.facts[name] as number;

// Every picture a question draws: the stimulus, the things to tap, the working, and the pictures inside a row.
function pictures(question: Question): Visual[] {
  const out: Visual[] = [];
  const walk = (visual: Visual | 'blank' | undefined): void => {
    if (!visual || visual === 'blank') return;
    out.push(visual);
    if (visual.kind === 'row') visual.children.forEach(walk);
    if (visual.kind === 'sequence') visual.items.forEach(walk);
    if (visual.kind === 'matrix') visual.cells.forEach(walk);
  };
  walk(question.stimulus);
  walk(question.explanation.visual);
  if (question.type === 'choice' || question.type === 'multiSelect' || question.type === 'dragWord') question.options.forEach(walk);
  if (question.type === 'order' || question.type === 'sort') question.items.forEach(walk);
  if (question.type === 'match') [...question.left, ...question.right].forEach(walk);
  return out;
}
const ofKind = <K extends Visual['kind']>(question: Question, kind: K): Extract<Visual, { kind: K }>[] => pictures(question).filter((visual): visual is Extract<Visual, { kind: K }> => visual.kind === kind);
const choiceOf = (question: Question): Extract<Question, { type: 'choice' }> => {
  if (question.type !== 'choice') throw new Error(`${question.skillId} level ${question.level} is not a choice`);
  return question;
};

describe('rulers and units', () => {
  it('every ruler drawn in a question says its unit, and grade 2 C.3 and C.6 measure in centimeters', () => {
    let rulers = 0;
    for (const skill of CATALOGUE) {
      for (const question of every(skill.id, 30)) {
        for (const ruler of ofKind(question, 'ruler')) {
          rulers += 1;
          expect(ruler.unit, `${skill.id} level ${question.level}`).toBeDefined();
        }
      }
    }
    expect(rulers).toBeGreaterThan(100);
    for (const skillId of ['M-2-C3', 'M-2-C6']) {
      for (const question of every(skillId)) {
        const found = ofKind(question, 'ruler');
        expect(found.length, skillId).toBeGreaterThan(0);
        for (const ruler of found) expect(ruler.unit).toBe('cm');
        expect(`${question.prompt.text} ${question.explanation.steps.join(' ')}`).toMatch(/centimeter/);
      }
    }
  });

  it('grade 2 C.5 level 2 measures one thing on both rulers, in the question and in its working, and the facts say how long', () => {
    const lengths = new Set<string>();
    for (const question of all('M-2-C5', 2)) {
      const [stimulus, working] = [question.stimulus, question.explanation.visual];
      if (stimulus?.kind !== 'twoRulers') throw new Error('not on two rulers');
      expect(working).toEqual(stimulus);
      expect(question.facts.thing).toBe(stimulus.object);
      expect(n(question, 'inches')).toBe(stimulus.inches);
      lengths.add(`${stimulus.object} ${stimulus.inches}`);
    }
    // Pencils, crayons and ribbons of 2, 4 and 6 inches, all of them.
    expect(lengths.size).toBe(9);
    // Levels 1 and 3 ask about a thing's size, with its picture.
    for (const level of [1, 3] as Level[]) for (const question of all('M-2-C5', level)) expect(question.stimulus?.kind).toBe('emojiGroup');
  });
});

describe('graphs', () => {
  it('every graph a question draws has a title, and so does every bar graph a child builds', () => {
    const titles = new Map<string, Set<string>>();
    for (const skill of CATALOGUE) {
      for (const question of every(skill.id, 30)) {
        for (const graph of ofKind(question, 'graph')) {
          expect(graph.title, `${skill.id} level ${question.level}`).toBeTruthy();
          titles.set(skill.id, (titles.get(skill.id) ?? new Set()).add(graph.title ?? ''));
        }
        if (question.type === 'buildBar') {
          expect(question.title, skill.id).toBe('Our favorite things');
          titles.set(skill.id, (titles.get(skill.id) ?? new Set()).add(question.title ?? ''));
        }
      }
    }
    // Grade 1 C.3, grade 2 C.4 and C.11, grade 3 F.6: the skills with graphs. Kindergarten has none.
    expect([...titles.keys()].sort()).toEqual(['M-1-C3', 'M-2-C11', 'M-2-C4', 'M-3-F6']);
    // The children's favorites are called that; grade 3's things were counted.
    for (const skillId of ['M-1-C3', 'M-2-C4', 'M-2-C11']) expect(titles.get(skillId), skillId).toEqual(new Set(['Our favorite things']));
    expect(titles.get('M-3-F6')).toEqual(new Set(['Things we counted']));
  });

  it('the title matches what the question says was picked', () => {
    for (const skillId of ['M-1-C3', 'M-2-C4', 'M-2-C11']) {
      for (const question of every(skillId)) {
        if (question.type === 'buildBar') continue;
        expect(question.prompt.text, skillId).toMatch(/^(Children chose|Kids picked) their favorite thing\. /);
      }
    }
  });
});

describe('a.m. and p.m. pictures', () => {
  it('grade 2 C.8 level 3 prints what you do under each picture, the same words it says', () => {
    const doing = new Set<string>();
    for (const question of all('M-2-C8', 3)) {
      for (const option of choiceOf(question).options) {
        if (option.kind !== 'emojiGroup') throw new Error('not a picture');
        expect(option.caption).toBeDefined();
        expect(option.speak).toEqual([option.caption]);
        expect(option.caption).toMatch(/^(eat|get|hear|go|look|take) /);
        doing.add(option.caption ?? '');
      }
    }
    expect(doing).toEqual(new Set(DAY_THINGS.map((thing) => thing.verb.replace(/^goes\b/, 'go').replace(/^(\w+?)s\b/, '$1'))));
    expect(doing).toContain('eat breakfast');
    expect(doing).toContain('go to bed');
  });
});

describe('rectangles drawn to their sides', () => {
  it('grade 3 F.4 level 2 shows the rectangle it tells, labelled top and side, and its working labels every side', () => {
    for (const question of all('M-3-F4', 2)) {
      const [length, width] = [n(question, 'length'), n(question, 'width')];
      expect(question.prompt.text).toBe(`A rectangle is ${length} centimeters long and ${width} centimeters wide. What is its perimeter?`);
      expect(question.stimulus).toEqual({ kind: 'measuredRect', length, width, unit: 'cm' });
      expect(question.explanation.visual).toEqual({ kind: 'measuredRect', length, width, unit: 'cm', allSides: true });
    }
    // Level 1 counts the squares of a grid, and level 3 is told in words only.
    for (const question of all('M-3-F4', 1)) expect(question.stimulus?.kind).toBe('array');
    for (const question of all('M-3-F4', 3)) expect(question.stimulus).toBeUndefined();
    // Area (F.3) keeps its squares.
    for (const question of all('M-3-F3', 2)) expect(question.stimulus?.kind).toBe('array');
  });

  it('grade 3 F.9 levels 2 and 3 show the side given and a "?" on the side to find', () => {
    let fromArea = 0;
    for (const level of [2, 3] as Level[]) {
      for (const question of all('M-3-F9', level)) {
        const given = Number(/One side is (\d+) centimeters long/.exec(question.prompt.text)?.[1]);
        const answer = question.type === 'numberPad' ? question.answer : Number((question.facts.options as number[])[choiceOf(question).answerIndex]);
        expect(question.stimulus).toEqual({ kind: 'measuredRect', length: given, width: answer, unit: 'cm', unknown: 'width' });
        const area = /area of/.test(question.prompt.text);
        if (area) fromArea += 1;
        // A perimeter's working labels every side, the side found too; an area's working counts its squares.
        expect(question.explanation.visual).toEqual(area ? { kind: 'array', rows: answer, cols: given, emoji: '🟩' } : { kind: 'measuredRect', length: given, width: answer, unit: 'cm', allSides: true });
      }
    }
    expect(fromArea).toBeGreaterThan(20);
  });

  it('grade 3 F.8 level 2 stays a story with no picture, as the plan says', () => {
    for (const question of all('M-3-F8', 2)) expect(question.stimulus).toBeUndefined();
  });
});

describe('sharing onto plates or into baskets', () => {
  it('grade 3 D.1 draws the things beside empty plates or baskets, one for each share, and its working fills them', () => {
    const holders = new Set<string>();
    for (const level of [1, 2, 3] as Level[]) {
      for (const question of all('M-3-D1', level)) {
        const [total, groups] = [n(question, 'total'), n(question, 'by')];
        const stimulus = question.stimulus;
        if (stimulus?.kind !== 'row') throw new Error('not things beside plates');
        const [things, empty] = stimulus.children;
        if (things?.kind !== 'emojiGroup' || empty?.kind !== 'holders') throw new Error('not things beside plates');
        expect(things.count).toBe(total);
        expect(empty).toEqual({ kind: 'holders', holder: empty.holder, count: groups });
        // Things to eat go on plates, the rest in baskets, and the question names the one drawn.
        const food = ['🍎', '🍪', '🍓', '🍌'].includes(things.emoji);
        expect(empty.holder).toBe(food ? 'plate' : 'basket');
        expect(question.prompt.text).toMatch(empty.holder === 'plate' ? new RegExp(`onto ${groups} plates\\. How many go on each plate\\?$`) : new RegExp(`into ${groups} baskets\\. How many go in each basket\\?$`));
        expect(question.explanation.visual).toEqual({ kind: 'holders', holder: empty.holder, count: groups, filled: { emoji: things.emoji, each: total / groups } });
        holders.add(empty.holder);
      }
    }
    expect(holders).toEqual(new Set(['plate', 'basket']));
  });
});

describe('paper clips under a thing', () => {
  it('grade 1 C.5 level 1 lays the clips end to end under the thing it names', () => {
    const things = new Set<string>();
    for (const question of all('M-1-C5', 1)) {
      const count = n(question, 'n');
      const thing = /long is the (\w+)\?$/.exec(question.prompt.text)?.[1] ?? '';
      const row = { kind: 'clipRow', object: thing, length: count, clips: Array.from({ length: count }, (_, i) => i) };
      expect(question.stimulus).toEqual(row);
      expect(question.explanation.visual).toEqual(row);
      things.add(thing);
    }
    expect(things).toEqual(new Set(['pencil', 'crayon', 'spoon']));
  });

  it('no paper clip is an emoji any more: each one is drawn, under the thing it measures', () => {
    for (const question of every('M-1-C5')) {
      for (const visual of pictures(question)) expect(visual.kind === 'emojiGroup' && visual.emoji === '📎').toBe(false);
    }
  });
});

describe('the measuring cup', () => {
  it('kindergarten F.3 draws the measuring cup wherever it is meant, and never the glass of milk', () => {
    let cups = 0;
    for (const question of every('M-K-F3')) {
      for (const visual of pictures(question)) {
        expect(visual.kind === 'emojiGroup' && visual.emoji === '🥛', `${question.prompt.text}`).toBe(false);
        if (visual.kind === 'measuringCup') cups += 1;
      }
      const cupAsked = /measuring cup|how much something holds|how much it holds/.test(`${question.prompt.text} ${question.explanation.steps.join(' ')}`);
      if (question.facts.ask === 'tells' && question.facts.tool === 'a measuring cup') expect(question.stimulus).toEqual({ kind: 'measuringCup', speak: ['a measuring cup'] });
      if (cupAsked && question.facts.ask !== 'tool') expect(question.explanation.visual?.kind).toBe('measuringCup');
    }
    expect(cups).toBeGreaterThan(50);
    // At the top level the cup is one of the three tools to tap, and says its name.
    for (const question of all('M-K-F3', 3)) expect(choiceOf(question).options[2]).toEqual({ kind: 'measuringCup', speak: ['a measuring cup'] });
  });

  it('kindergarten F.5 keeps the glass where a glass is meant', () => {
    const glasses = every('M-K-F5').flatMap((question) => pictures(question)).filter((visual) => visual.kind === 'emojiGroup' && visual.emoji === '🥛');
    // The glass to tap says its name; the same glass in the working is drawn without one.
    const named = glasses.filter((glass) => glass.speak !== undefined);
    expect(named.length).toBeGreaterThan(0);
    for (const glass of named) expect(glass.speak).toEqual(['glass']);
    expect(every('M-K-F5').flatMap((question) => pictures(question)).some((visual) => visual.kind === 'measuringCup')).toBe(false);
  });
});
