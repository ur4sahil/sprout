// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { HINTS_PER_PART, HINT_REFILL_EVERY, canHint, exampleFor, hintId, hintWindow, hintsLeft, nudgeFor, takeHint } from '../../src/app/hints';
import type { HintBook } from '../../src/app/hints';
import { generateQuestion } from '../../src/content/registry';
import { CATALOGUE } from '../../src/content/catalogue';
import { flawless } from '../../src/engine/fastTrack';
import { recount } from '../../src/engine/merge';
import { reviewRight } from '../../src/engine/review';
import { applyAnswer, applyPractice, hintedGain } from '../../src/engine/skillscore';
import type { Question } from '../../src/engine/types';
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

describe('the nudge', () => {
  it('is the first step, and only when there are at least 3, so it cannot be the answer', () => {
    let nudged = 0;
    let withheld = 0;
    for (const skill of CATALOGUE) {
      for (let seed = 1; seed <= 3; seed += 1) {
        let q: Question;
        try {
          q = question(skill.id, 1, seed);
        } catch {
          continue;
        }
        const nudge = nudgeFor(q);
        const steps = q.explanation.steps;
        if (steps.length < 3) {
          expect(nudge, `${skill.id} has ${steps.length} steps`).toBeNull();
          withheld += 1;
        } else {
          expect(nudge?.text).toBe(steps[0]);
          // The step that gives the answer is always a later one.
          expect(nudge?.text).not.toBe(steps[steps.length - 1]);
          nudged += 1;
        }
      }
    }
    expect(nudged).toBeGreaterThan(100);
    expect(withheld).toBeGreaterThan(100);
  });

  it('is said when it can be read safely, and only shown when it cannot', () => {
    const counting = question('M-1-B1', 2, 7); // "Start at 9." "Count on 2 more: 10, 11." "2 + 9 = 11"
    expect(nudgeFor(counting)).toEqual({ text: 'Start at 9.', say: expect.any(Array) });
    const rhyme = question('E-K-B6', 2, 7); // two steps: the first gives the odd one out away
    expect(nudgeFor(rhyme)).toBeNull();
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
