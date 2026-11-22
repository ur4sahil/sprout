// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { HINTS_PER_PART, HINT_REFILL_EVERY, canHint, exampleFor, hintId, hintWindow, hintsLeft, nudgeFor, takeHint } from '../../src/app/hints';
import { stepSay } from '../../src/audio/stepSay';
import { sayText } from '../../src/engine/describe';
import { givesAway, names } from '../../src/engine/giveaway';
import type { HintBook } from '../../src/app/hints';
import { generateQuestion } from '../../src/content/registry';
import { CATALOGUE } from '../../src/content/catalogue';
import { flawless } from '../../src/engine/fastTrack';
import { recount } from '../../src/engine/merge';
import { reviewRight } from '../../src/engine/review';
import { applyAnswer, applyPractice, hintedGain } from '../../src/engine/skillscore';
import type { Question, Say } from '../../src/engine/types';
import type { Attempt, SkillState } from '../../src/storage/schema';
import { newSkillState } from '../../src/storage/schema';

// Hints (the owner's choice, Nov 21, 2026): a nudge, then an example; 3 a part; a right answer after one counts for half.

const NOW = '2026-03-02T15:00:00.000Z';
const state = (change: Partial<SkillState> = {}): SkillState => ({ ...newSkillState('child', 'M-K-C4', NOW), ...change });

describe('a right answer after a hint', () => {
  it('gains half its band, rounded up, with no streak bonus, and leaves the streak as it was', () => {
    // Under 30 the gain is 10: 5 with a hint. A streak of 4 would add a bonus of 3 without one.
    expect(applyAnswer({ score: 20, streak: 4, masteredAt: null }, true, false)).toEqual({ score: 33, streak: 5, mastered: false });
    expect(applyAnswer({ score: 20, streak: 4, masteredAt: null }, true, false, true)).toEqual({ score: 25, streak: 4, mastered: false });
    // 70 to 80 gains 5: 3 with a hint (rounded up).
    expect(applyAnswer({ score: 72, streak: 0, masteredAt: null }, true, false, true)).toEqual({ score: 75, streak: 0, mastered: false });
    // In the challenge zone the gain is 2: 1 with a hint.
    expect(applyAnswer({ score: 95, streak: 1, masteredAt: null }, true, false, true)).toEqual({ score: 96, streak: 1, mastered: false });
    expect(hintedGain(10)).toBe(5);
    expect(hintedGain(5)).toBe(3);
    expect(hintedGain(2)).toBe(1);
  });

  it('can still reach 100, one small step at a time', () => {
    expect(applyAnswer({ score: 99, streak: 0, masteredAt: null }, true, false, true)).toEqual({ score: 100, streak: 0, mastered: true });
  });

  it('a wrong answer after a hint is like any wrong answer', () => {
    expect(applyAnswer({ score: 60, streak: 3, masteredAt: null }, false, false, true)).toEqual(applyAnswer({ score: 60, streak: 3, masteredAt: null }, false, false));
    expect(applyAnswer({ score: 60, streak: 3, masteredAt: null }, false, true, true)).toEqual(applyAnswer({ score: 60, streak: 3, masteredAt: null }, false, true));
  });

  it('is counted on the skill as right, and as helped', () => {
    const after = applyPractice(state({ score: 40, attempts: 6, correct: 5 }), true, false, NOW, true).state;
    expect(after.correct).toBe(6);
    expect(after.hintedRight).toBe(1);
    expect(applyPractice(state(), true, false, NOW).state.hintedRight).toBe(0);
    expect(applyPractice(state(), false, false, NOW, true).state.hintedRight).toBe(0);
  });

  it('never opens the fast track: five right needs all five on the child\'s own', () => {
    const four = state({ score: 40, streak: 4, attempts: 4, correct: 4 });
    expect(applyPractice(four, true, false, NOW).state.score).toBe(90);
    expect(applyPractice(four, true, false, NOW, true).state.score).toBeLessThan(90);
    expect(applyPractice({ ...four, hintedRight: 1 }, true, false, NOW).state.score).toBeLessThan(90);
  });

  it('means a mastered skill is not flawless, so it earns no skip test on the next one', () => {
    const mastered = { masteredAt: NOW, attempts: 10, correct: 10, hintedRight: 0 };
    expect(flawless(mastered)).toBe(true);
    expect(flawless({ ...mastered, hintedRight: 1 })).toBe(false);
  });

  it('is recounted from the attempt log when two devices merge', () => {
    const attempt = (id: string, correct: boolean, hinted: boolean): Attempt => ({
      id, childId: 'child', skillId: 'M-K-C4', sessionId: 's', level: 1, seed: 1, itemType: 'choice', response: { index: 0 }, contentVersion: 1,
      snapshot: { prompt: '', correct: '', given: '' }, correct, hinted, ms: 1000, scoreBefore: 0, scoreAfter: 0, kind: 'practice', day: '2026-03-02', createdAt: `${NOW.slice(0, 18)}${id}.000Z`,
    });
    const counted = recount(state(), [attempt('1', true, true), attempt('2', true, false), attempt('3', false, true), attempt('4', true, true)]);
    expect(counted).toMatchObject({ attempts: 4, correct: 3, hintedRight: 2 });
  });
});

describe('a review with hints', () => {
  it('counts a right answer after a hint as half, rounded down', () => {
    expect(reviewRight(3, 0)).toBe(3); // up a box
    expect(reviewRight(2, 1)).toBe(2); // keeps the medal, does not move up
    expect(reviewRight(1, 2)).toBe(2); // keeps the medal
    expect(reviewRight(0, 3)).toBe(1); // three hints: back to practice
    expect(reviewRight(1, 1)).toBe(1);
    expect(reviewRight(0, 0)).toBe(0);
  });
});

function question(skillId: string, level: number, seed: number): Question {
  return generateQuestion(skillId, level, seed);
}

// The question as if its generator gave no hint of its own, to check the rules for a nudge taken from the steps.
function withoutHint(q: Question): Question {
  const explanation = { ...q.explanation };
  delete explanation.hint;
  return { ...q, explanation };
}

describe('the nudge', () => {
  it('is the first step, only when there are at least 3, never from a sort, order or match, and never one that names the answer', () => {
    let nudged = 0;
    let withheld = 0;
    let guarded = 0;
    let hinted = 0;
    for (const skill of CATALOGUE) {
      for (let seed = 1; seed <= 3; seed += 1) {
        let q: Question;
        try {
          q = question(skill.id, 1, seed);
        } catch {
          continue;
        }
        // A generator's own hint comes first, whatever its steps, said as its own speech or through stepSay, and it
        // never names the answer either.
        const own = q.explanation.hint;
        if (own) {
          expect(nudgeFor(q), `${skill.id} gives its own hint`).toEqual({ text: own.text, say: own.say ?? stepSay(own.text) });
          expect(givesAway(q, own.text, own.say ? sayText(own.say) : null), `${skill.id}: ${own.text}`).toBe(false);
          hinted += 1;
        }
        // The rules for a nudge taken from the steps, the fallback when a generator gives no hint, are checked with
        // the generator's own hint left out.
        const nudge = nudgeFor(withoutHint(q));
        const steps = q.explanation.steps;
        const listsAnswer = q.type === 'sort' || q.type === 'order' || q.type === 'match';
        if (steps.length < 3 || listsAnswer) {
          expect(nudge, `${skill.id} has ${steps.length} steps and is a ${q.type}`).toBeNull();
          withheld += 1;
        } else if (givesAway(q, steps[0] ?? '', null)) {
          expect(nudge, `${skill.id}: "${steps[0]}" names the answer`).toBeNull();
          guarded += 1;
        } else {
          expect(nudge?.text).toBe(steps[0]);
          // The step that gives the answer is always a later one.
          expect(nudge?.text).not.toBe(steps[steps.length - 1]);
          nudged += 1;
        }
        // Whatever is offered, it never names the answer.
        for (const offered of [nudge, nudgeFor(q)]) if (offered) expect(givesAway(q, offered.text, null), `${skill.id}: ${offered.text}`).toBe(false);
      }
    }
    expect(nudged).toBeGreaterThan(100);
    expect(withheld).toBeGreaterThan(100);
    expect(guarded).toBeGreaterThan(10);
    expect(hinted).toBeGreaterThan(100);
  });

  it('is said when it can be read safely, and only shown when it cannot', () => {
    const counting = question('M-1-B1', 2, 7); // "Start at 9." "Count on 2 more: 10, 11." "2 + 9 = 11"
    expect(nudgeFor(counting)).toEqual({ text: 'Start at 9.', say: expect.any(Array) });
    const rhyme = question('E-K-B6', 2, 7); // two steps: the first gives the odd one out away
    expect(nudgeFor(withoutHint(rhyme))).toBeNull();
  });

  it("is the generator's own hint when it gives one, said through stepSay unless it has its own speech", () => {
    const q = question('M-1-B1', 2, 7);
    const hinted = (hint: Question['explanation']['hint']): Question => ({ ...q, explanation: { ...q.explanation, hint } });
    expect(nudgeFor(hinted({ text: 'Count on from the bigger number.' }))).toEqual({ text: 'Count on from the bigger number.', say: ['Count on from the bigger number.'] });
    expect(nudgeFor(hinted({ text: 'Start at 9 and count on.' }))?.say).toEqual(['Start at', { number: 9 }, 'and count on.']);
    const say: Say = ['Count up from', { number: 9 }, ', one number at a time.'];
    expect(nudgeFor(hinted({ text: 'Count up from 9.', say }))).toEqual({ text: 'Count up from 9.', say });
    // A hint is offered even where no step could be: a sort, an order, or one with too few steps.
    const sort = withoutHint(question('M-PK-D6', 3, 1));
    expect(nudgeFor(sort)).toBeNull();
    expect(nudgeFor({ ...sort, explanation: { ...sort.explanation, hint: { text: 'Look at each picture. What is it?' } } })?.text).toBe('Look at each picture. What is it?');
    // As M-PK-D6 does itself (the wording audit, Nov 22, 2026).
    expect(nudgeFor(question('M-PK-D6', 3, 1))?.text).toBe('Look at each picture. Is it something to wear, a food or an animal?');
  });

  it('a step with its own speech in stepsSay is said that way as the nudge', () => {
    const q = question('M-1-B1', 2, 7);
    const own: Say = ['Put', { number: 9 }, 'in your head.'];
    expect(nudgeFor({ ...q, explanation: { ...q.explanation, stepsSay: [own, null, null] } })).toEqual({ text: 'Start at 9.', say: own });
  });

  it('never comes from the steps of a sort, an order or a match, which list the answer', () => {
    expect(question('M-PK-D6', 3, 1).explanation.steps[0]).toBe('Clothes: shoe, shirt.');
    expect(nudgeFor(withoutHint(question('M-PK-D6', 3, 1)))).toBeNull(); // sort
    expect(question('M-K-B3', 1, 1).explanation.steps[0]).toBe('2 is the smallest.');
    expect(nudgeFor(withoutHint(question('M-K-B3', 1, 1)))).toBeNull(); // order
    // Their own hints say how to start, never a step.
    expect(nudgeFor(question('M-PK-D6', 3, 1))?.text).not.toBe('Clothes: shoe, shirt.');
    expect(nudgeFor(question('M-K-B3', 1, 1))?.text).toBe('Find the smallest number first. Then find the next one.');
    // An order with its own hint offers the hint, never its first step ("1. The turtle wanted to see the sea.").
    const story = question('E-2-D3', 1, 1);
    expect(story.type).toBe('order');
    expect(nudgeFor(withoutHint(story))).toBeNull(); // order
    expect(nudgeFor(story)?.text).toBe(story.explanation.hint?.text);
    expect(nudgeFor(story)?.text).not.toBe(story.explanation.steps[0]);
  });

  it('never offers a step that names the right option, the number, the word or the sign', () => {
    // Each of these first steps was offered as a nudge before (the wording audit, Nov 21, 2026).
    const cases: [string, number, number, string][] = [
      ['M-2-C12', 1, 1, 'A bed is big: meters.'],
      ['E-K-E4', 1, 1, 'Wheat grows in a field.'],
      ['M-3-C11', 1, 1, 'An even number times any number is even.'],
      ['M-3-C6', 1, 3, 'Count by twos to 8: 2, 4, 6, 8.'],
      // Read questions: the words to read are never said before the child answers.
      ['M-2-A7', 2, 1, 'Six hundred nine is 6 hundreds, 0 tens and 9 ones.'],
      ['M-3-A2', 3, 1, 'six thousand thirty-nine'],
    ];
    // Where the content has since been reworded (M-2-C12 and M-2-A7, Nov 22, 2026), the old line is put back as
    // the first of three steps, with no hint of the generator's own, so the guard is still tested on it.
    const reworded = new Set(['M-2-C12', 'M-2-A7']);
    for (const [skillId, level, seed, first] of cases) {
      const now = question(skillId, level, seed);
      const q: Question = reworded.has(skillId) ? { ...now, explanation: { speak: now.explanation.speak, steps: [first, 'Look again.', 'That is it.'] } } : now;
      expect(q.explanation.steps[0], skillId).toBe(first);
      expect(q.explanation.steps.length, skillId).toBeGreaterThanOrEqual(3);
      // The guard on the steps: a generator's own hint, when it has one, is left out.
      expect(nudgeFor(withoutHint(q)), `${skillId}: ${first}`).toBeNull();
    }
    // M-1-C4 now names the coin only in its last step and gives its own hint (round 2). Its old steps, which named
    // the coin first, are put back here, so the guard is still tested on them.
    const oldSteps = (q: Question, steps: string[]): Question => ({ ...q, explanation: { ...q.explanation, steps, hint: undefined, stepsSay: undefined } });
    const dime = question('M-1-C4', 1, 1);
    expect(dime.stimulus).toEqual({ kind: 'coins', coins: ['dime'] });
    expect(nudgeFor(oldSteps(dime, ['This is a dime.', 'It is worth 10 cents.', 'Look at its size, its color and its picture.']))).toBeNull();
    const worthMore = question('M-1-C4', 3, 1);
    expect(worthMore.facts.coins).toEqual(['quarter', 'nickel']);
    expect(nudgeFor(oldSteps(worthMore, ['A quarter is worth 25 cents.', 'A nickel is worth 5 cents.', 'The quarter is worth more.']))).toBeNull();
  });
});

describe('what gives an answer away', () => {
  const find = (prompt: string, right: string, wrong: string[], change: Partial<Question> = {}): Question =>
    ({
      skillId: 'T-1', level: 1, seed: 1, key: 'k', mode: 'look', type: 'choice', answerIndex: 0,
      facts: { options: [right, ...wrong] },
      prompt: { text: prompt, speak: [prompt] },
      options: [right, ...wrong].map((value) => ({ kind: 'text', value, size: 'l' })),
      explanation: { speak: ['x'], steps: ['x'] },
      ...change,
    }) as Question;

  it('a whole word or number, never part of a longer one', () => {
    expect(names('This is a dime.', 'dime')).toBe(true);
    expect(names('Dimes are small.', 'dime')).toBe(false);
    expect(names('Count to 16.', '6')).toBe(false);
    expect(names('It is 6/8.', '6')).toBe(false);
    expect(names('It is 4,306.', '306')).toBe(false);
    expect(names('So it is 6.', '6')).toBe(true);
    expect(names('So it is 1/2.', '1/2')).toBe(true);
    expect(names('Catch it.', 'cat')).toBe(false);
  });

  it('a target the question names is no giveaway, unless the question names the wrong answers too', () => {
    expect(givesAway(find('Find the square.', 'square', ['circle', 'oval']), 'A square has 4 equal sides.', null)).toBe(false);
    expect(givesAway(find('Is 6 × 10 even or odd?', 'even', ['odd']), 'An even number times any number is even.', null)).toBe(true);
    expect(givesAway(find('Which one is round?', 'ball', ['box', 'book']), 'A ball is round.', null)).toBe(true);
  });

  it('a number in words or digits, and a sign by its name', () => {
    const typed = { ...find('Which words?', 'x', []), type: 'numberPad', answer: 609, maxDigits: 3 } as Question;
    expect(givesAway(typed, 'Six hundred nine is 6 hundreds.', null)).toBe(true);
    expect(givesAway(typed, 'It is 609.', null)).toBe(true);
    expect(givesAway(typed, 'Find the hundreds word first.', null)).toBe(false);
    const sign = find('Which sign goes between 54 and 68?', '<', ['>', '=']);
    expect(givesAway(sign, '54 is less than 68.', null)).toBe(true);
    expect(givesAway(sign, '54 < 68', null)).toBe(true);
    expect(givesAway(sign, 'Look at the tens first.', null)).toBe(false);
    // Its own speech is checked too.
    expect(givesAway(sign, 'Look at this.', 'It is less than.')).toBe(true);
  });

  it('a listen question never shows its target, and a read question never says the words to read', () => {
    const listen = find('Listen. Tap the word.', 'cat', ['dog'], { mode: 'listen', facts: { target: 'cat', options: ['cat', 'dog'] } });
    expect(givesAway(listen, 'Cat starts with c.', null)).toBe(true);
    const read = find('Read the word. Which picture?', 'bed', ['cup'], { mode: 'read', facts: { read: ['big red bus'], options: ['bed', 'cup'] } });
    expect(givesAway(read, 'Read it: big red bus.', null)).toBe(true);
    expect(givesAway(read, 'Look at the first word: big.', null)).toBe(false);
    expect(givesAway(read, 'Look at it.', 'It says big red bus.')).toBe(true);
  });
});

describe('the worked example', () => {
  it('is another question of the same skill and level, never the one on screen, and always the same one', () => {
    for (const skill of CATALOGUE) {
      for (const level of [1, 2]) {
        let q: Question;
        try {
          q = question(skill.id, level, 11);
        } catch {
          continue;
        }
        const example = exampleFor(q);
        if (!example) continue;
        expect(example.key, skill.id).not.toBe(q.key);
        expect(example.skillId).toBe(q.skillId);
        expect(example.level).toBe(q.level);
        expect(exampleFor(q)?.key).toBe(example.key);
      }
    }
  });

  it('is found for nearly every skill', () => {
    const missing = CATALOGUE.filter((skill) => exampleFor(question(skill.id, 1, 5)) === null).map((skill) => skill.id);
    expect(missing.length, missing.join(' ')).toBeLessThan(CATALOGUE.length / 20);
  });
});

describe('how many hints', () => {
  const q1 = hintId(question('M-K-C4', 1, 1));
  const ids = [1, 2, 3, 4, 5].map((seed) => `q${seed}`);

  it('3 a part; the same question opens again for free; a fourth question gets none', () => {
    let book: HintBook = new Map();
    expect(hintsLeft(book, 0)).toBe(HINTS_PER_PART);
    for (const id of ids.slice(0, 3)) book = takeHint(book, id, 0);
    expect(hintsLeft(book, 0)).toBe(0);
    expect(canHint(book, 'q2', 0)).toBe(true); // already had one
    expect(canHint(book, 'q4', 0)).toBe(false);
    expect(takeHint(book, 'q4', 0)).toBe(book);
    expect(takeHint(book, 'q1', 0)).toBe(book); // reopening uses nothing
    expect(q1).toMatch(/\|1$/);
  });

  it('plain practice gets 3 again every 10 answers; a part that is one sitting never refills', () => {
    expect(HINT_REFILL_EVERY).toBe(10);
    expect([0, 9, 10, 19, 20].map((n) => hintWindow(n, HINT_REFILL_EVERY))).toEqual([0, 0, 1, 1, 2]);
    expect(hintWindow(25, undefined)).toBe(0);
    let book: HintBook = new Map();
    for (const id of ids.slice(0, 3)) book = takeHint(book, id, 0);
    expect(hintsLeft(book, 0)).toBe(0);
    expect(hintsLeft(book, 1)).toBe(3);
    book = takeHint(book, 'q4', 1);
    expect(hintsLeft(book, 1)).toBe(2);
    // A question that had its hint before the refill opens it again for free after it.
    book = takeHint(book, 'q1', 1);
    expect(hintsLeft(book, 1)).toBe(2);
    expect(hintsLeft(book, 0)).toBe(0);
  });
});
