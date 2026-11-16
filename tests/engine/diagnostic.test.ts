// @vitest-environment node
import { describe, expect, it } from 'vitest';
import type { DiagnosticLadder, LadderSkill } from '../../src/engine/diagnostic';
import {
  answerWalk,
  applyPlacement,
  endSitting,
  estimateOf,
  ladderCap,
  newProgress,
  newWalk,
  nextStep,
  placementOf,
  placementsOf,
  recordAnswer,
  shouldWalk,
  sittingCap,
  startSkill,
  unwalkedPlacement,
} from '../../src/engine/diagnostic';
import type { DiagnosticProgress, Grade, LadderWalk, SkillState } from '../../src/storage/schema';
import { newSkillState } from '../../src/storage/schema';
import type { SkillGrade } from '../../src/engine/types';

const NOW = '2026-03-02T15:00:00.000Z';

// A made-up ladder: grades given as "how many skills in each grade".
function ladder(id: string, shape: [SkillGrade, number][], maxLevel: 1 | 2 | 3 | 4 = 4): DiagnosticLadder {
  const skills: LadderSkill[] = [];
  for (const [grade, count] of shape) {
    for (let i = 0; i < count; i += 1) skills.push({ id: `${id}-${grade}-${i + 1}`, grade, maxLevel });
  }
  return { id, skills };
}

const LONG = ladder('long', [['PK', 8], ['K', 8], ['1', 8], ['2', 8]]); // 32 skills

// A child who knows exactly the first `known` skills of a ladder and never guesses.
function walkWith(l: DiagnosticLadder, grade: Grade, known: number, cap = ladderCap(grade)): { walk: LadderWalk; tested: string[] } {
  let walk = newWalk(l, grade);
  const tested: string[] = [];
  let guard = 0;
  while (!walk.done && walk.currentSkillId !== null) {
    const index = l.skills.findIndex((skill) => skill.id === walk.currentSkillId);
    if (tested[tested.length - 1] !== walk.currentSkillId) tested.push(walk.currentSkillId);
    walk = answerWalk(walk, l, index < known, cap);
    guard += 1;
    if (guard > 200) throw new Error('the walk did not stop');
  }
  return { walk, tested };
}

function placedIndex(l: DiagnosticLadder, walk: LadderWalk): number {
  const placement = placementOf(walk, l);
  return placement === null ? l.skills.length : l.skills.findIndex((skill) => skill.id === placement);
}

describe('which ladders are walked', () => {
  it('needs 4 or more skills and a first skill at or below the child\'s grade', () => {
    expect(shouldWalk(LONG, 'PK')).toBe(true);
    expect(shouldWalk(ladder('short', [['K', 3]]), 'K')).toBe(false);
    expect(shouldWalk(ladder('four', [['K', 4]]), 'K')).toBe(true);
    expect(shouldWalk(ladder('later', [['1', 5]]), 'K')).toBe(false);
    expect(shouldWalk(ladder('later', [['1', 5]]), '1')).toBe(true);
    expect(shouldWalk(ladder('reason', [['all', 9]]), '2')).toBe(false);
    expect(shouldWalk({ id: 'empty', skills: [] }, 'K')).toBe(false);
  });

  it('a ladder that is not walked is placed at its first skill at or above the child\'s grade', () => {
    const time = ladder('time', [['1', 1], ['2', 1]]);
    expect(unwalkedPlacement(time, 'K')).toBe('time-1-1');
    expect(unwalkedPlacement(time, '1')).toBe('time-1-1');
    expect(unwalkedPlacement(time, '2')).toBe('time-2-1');
    expect(unwalkedPlacement(time, '3')).toBe('time-2-1'); // everything is below the child: the top skill
    expect(unwalkedPlacement({ id: 'empty', skills: [] }, 'K')).toBeNull();
  });
});

describe('where a walk starts', () => {
  it('at the first skill of the child\'s grade', () => {
    expect(startSkill(LONG, 'PK')).toBe('long-PK-1');
    expect(startSkill(LONG, 'K')).toBe('long-K-1');
    expect(startSkill(LONG, '2')).toBe('long-2-1');
  });

  it('at the first skill of the next grade up when the ladder has none in the child\'s grade', () => {
    const gap = ladder('gap', [['PK', 3], ['1', 3]]);
    expect(startSkill(gap, 'K')).toBe('gap-1-1');
  });

  it('at the top skill when nothing is at or above the child\'s grade', () => {
    expect(startSkill(ladder('low', [['PK', 4]]), '2')).toBe('low-PK-4');
  });

  it('at the last placement when there is one', () => {
    expect(startSkill(LONG, 'K', 'long-PK-5')).toBe('long-PK-5');
    expect(startSkill(LONG, 'K', 'not-on-this-ladder')).toBe('long-K-1');
  });
});

describe('testing one skill', () => {
  it('two right is a pass, two wrong is a fail, one of each asks a third and the majority decides', () => {
    const l = ladder('t', [['K', 9]]);
    const start = newWalk(l, 'K');
    const answer = (walk: LadderWalk, ...answers: boolean[]): LadderWalk => answers.reduce((w, a) => answerWalk(w, l, a, 99), walk);
    expect(answer(start, true, true).passed).toEqual(['t-K-1']);
    expect(answer(start, false, false).failed).toEqual(['t-K-1']);
    const split = answer(start, true, false);
    expect(split.currentSkillId).toBe('t-K-1');
    expect(split.passed).toEqual([]);
    expect(split.failed).toEqual([]);
    expect(answer(split, true).passed).toEqual(['t-K-1']);
    expect(answer(split, false).failed).toEqual(['t-K-1']);
    expect(answer(start, true, true).asked).toBe(2);
    expect(answer(split, true).asked).toBe(3);
  });

  it('after a pass climbs 2, then 4, then 8, and stops at the top skill', () => {
    const { tested } = walkWith(LONG, 'PK', 32, 99);
    expect(tested).toEqual(['long-PK-1', 'long-PK-3', 'long-PK-7', 'long-K-7', 'long-1-7', 'long-2-7', 'long-2-8']);
  });

  it('after a fail goes down 2, then 4, then 8, and stops at the bottom skill', () => {
    const { tested, walk } = walkWith(LONG, '2', 0, 99);
    expect(tested).toEqual(['long-2-1', 'long-1-7', 'long-1-3', 'long-K-3', 'long-PK-3', 'long-PK-1']);
    expect(placementOf(walk, LONG)).toBe('long-PK-1');
  });

  it('with a pass and a fail, tests the middle untested skill between them, rounding down', () => {
    // Knows 5 skills. Start at K (index 8): fail. Down 2 to index 6: fail. Down 4 to index 2: pass.
    // Then the middle of 2 and 6 is 4: pass. Then the middle of 4 and 6 is 5: fail. Placement: index 5.
    const { tested, walk } = walkWith(LONG, 'K', 5, 99);
    expect(tested).toEqual(['long-K-1', 'long-PK-7', 'long-PK-3', 'long-PK-5', 'long-PK-6']);
    expect(placedIndex(LONG, walk)).toBe(5);
  });

  it('rounds the middle down when two skills sit in the middle', () => {
    const l = ladder('r', [['K', 10]]);
    // Passed index 2, failed index 7. The middle of 2 and 7 is 4.5: test index 4, not 5.
    const walk: LadderWalk = { currentSkillId: 'r-K-8', right: 0, wrong: 1, passed: ['r-K-3'], failed: [], asked: 3, done: false };
    const after = answerWalk(walk, l, false, 99);
    expect(after.failed).toEqual(['r-K-8']);
    expect(after.currentSkillId).toBe('r-K-5');
  });

  it('a fail at or below an earlier pass wins, and the passes at or above it are dropped', () => {
    const l = ladder('c', [['K', 9]]);
    const walk: LadderWalk = { currentSkillId: 'c-K-2', right: 0, wrong: 0, passed: ['c-K-1', 'c-K-4', 'c-K-6'], failed: [], asked: 6, done: false };
    const after = answerWalk(answerWalk(walk, l, false, 99), l, false, 99);
    expect(after.failed).toEqual(['c-K-2']);
    expect(after.passed).toEqual(['c-K-1']);
    expect(after.done).toBe(true); // the fail sits directly above the highest pass left
    expect(placementOf(after, l)).toBe('c-K-2');
  });

  it('asks level 2, or the skill\'s top level when that is lower', () => {
    const one = ladder('one', [['K', 5]], 1);
    const step = nextStep(newProgress('kid', 'math', NOW), [one, LONG], 'K', { asked: 0, elapsedMs: 0 });
    expect(step).toEqual({ kind: 'ask', ladderId: 'one', skillId: 'one-K-1', level: 1 });
    const step2 = nextStep(newProgress('kid', 'math', NOW), [LONG], 'K', { asked: 0, elapsedMs: 0 });
    expect(step2).toMatchObject({ kind: 'ask', level: 2 });
  });
});

describe('a simulated child who knows the first N skills', () => {
  it('is placed at N, give or take 1, for N within 8 skills of the start', () => {
    // Kindergarten starts at index 8 of the long ladder.
    for (const known of [1, 4, 8, 9, 12, 16]) {
      const { walk } = walkWith(LONG, 'K', known);
      expect(Math.abs(placedIndex(LONG, walk) - known), `knows ${known}`).toBeLessThanOrEqual(1);
    }
    // And exactly at N when the question cap is not in the way.
    for (const known of [1, 4, 8, 9, 12, 16]) {
      expect(placedIndex(LONG, walkWith(LONG, 'K', known, 99).walk), `knows ${known}`).toBe(known);
    }
  });

  it('is never placed above N plus 1, for any N, grade or ladder length', () => {
    for (const grade of ['PK', 'K', '1', '2'] as Grade[]) {
      for (const size of [4, 5, 7, 11, 20, 32]) {
        const l = ladder(`n${size}`, [['PK', Math.ceil(size / 4)], ['K', Math.floor(size / 4)], ['1', Math.floor(size / 4)], ['2', size - Math.ceil(size / 4) - 2 * Math.floor(size / 4)]]);
        for (let known = 0; known <= l.skills.length; known += 1) {
          const { walk } = walkWith(l, grade, known);
          expect(placedIndex(l, walk), `${grade}, ${size} skills, knows ${known}`).toBeLessThanOrEqual(known + 1);
          expect(walk.asked).toBeLessThanOrEqual(ladderCap(grade));
        }
      }
    }
  });

  it('never tests a skill twice', () => {
    for (const grade of ['PK', 'K', '1', '2'] as Grade[]) {
      for (let known = 0; known <= LONG.skills.length; known += 1) {
        const { tested } = walkWith(LONG, grade, known, 99);
        expect(new Set(tested).size, `${grade} knows ${known}`).toBe(tested.length);
      }
    }
  });

  it('finds the exact placement for every N when there is no question cap', () => {
    for (const grade of ['PK', 'K', '1', '2'] as Grade[]) {
      for (let known = 0; known <= LONG.skills.length; known += 1) {
        expect(placedIndex(LONG, walkWith(LONG, grade, known, 999).walk), `${grade} knows ${known}`).toBe(known);
      }
    }
  });

  it('stops when the top skill is passed, with no placement', () => {
    const { walk } = walkWith(LONG, '2', 32, 99);
    expect(walk.done).toBe(true);
    expect(placementOf(walk, LONG)).toBeNull();
  });

  it('stops when the bottom skill is failed, placed at the first skill', () => {
    const { walk } = walkWith(LONG, 'PK', 0);
    expect(walk.done).toBe(true);
    expect(walk.asked).toBe(2);
    expect(placementOf(walk, LONG)).toBe('long-PK-1');
  });

  it('stops after 14 questions, or 8 for pre-K', () => {
    expect(ladderCap('PK')).toBe(8);
    expect(ladderCap('K')).toBe(14);
    // A child who always gets one right and one wrong, then right: 3 questions a skill.
    for (const grade of ['PK', '2'] as Grade[]) {
      let walk = newWalk(LONG, grade);
      const answers = [true, false, true];
      let i = 0;
      while (!walk.done) {
        walk = answerWalk(walk, LONG, answers[i % 3] as boolean, ladderCap(grade));
        i += 1;
      }
      expect(walk.asked).toBeLessThanOrEqual(ladderCap(grade));
      expect(walk.asked).toBeGreaterThanOrEqual(ladderCap(grade) - 2);
    }
  });

  it('an answer after the walk is done changes nothing', () => {
    const { walk } = walkWith(LONG, 'PK', 0);
    expect(answerWalk(walk, LONG, true, 99)).toBe(walk);
  });
});

describe('estimate', () => {
  it('is the grade of the placement skill and the share of that grade below it', () => {
    expect(estimateOf('long-K-1', LONG)).toEqual({ grade: 'K', fraction: 0 });
    expect(estimateOf('long-K-5', LONG)).toEqual({ grade: 'K', fraction: 0.5 });
    expect(estimateOf('long-2-8', LONG)).toEqual({ grade: '2', fraction: 7 / 8 });
  });

  it('is empty when the top skill passed', () => {
    expect(estimateOf(null, LONG)).toEqual({ grade: null, fraction: null });
  });
});

describe('placing out', () => {
  const l = ladder('p', [['K', 5]]);
  const st = (skillId: string, change: Partial<SkillState>): SkillState => ({ ...newSkillState('kid', skillId, NOW), ...change });

  it('sets skills below the placement to 80, flagged, with bestScore 80', () => {
    const changed = applyPlacement([], l, 'p-K-3', 'kid', NOW);
    expect(changed.map((state) => state.skillId)).toEqual(['p-K-1', 'p-K-2']);
    for (const state of changed) expect(state).toMatchObject({ score: 80, bestScore: 80, placedOut: true, masteredAt: null, attempts: 0 });
  });

  it('never lowers a higher score, and leaves the placement skill and those above it alone', () => {
    const states = [st('p-K-1', { score: 92, bestScore: 95 }), st('p-K-2', { score: 30, bestScore: 60, attempts: 7 }), st('p-K-4', { score: 10 })];
    const changed = applyPlacement(states, l, 'p-K-3', 'kid', NOW);
    expect(changed).toHaveLength(1);
    expect(changed[0]).toMatchObject({ skillId: 'p-K-2', score: 80, bestScore: 80, placedOut: true, attempts: 7 });
    // A higher best score is kept.
    expect(applyPlacement([st('p-K-1', { score: 70, bestScore: 88 })], l, 'p-K-2', 'kid', NOW)[0]).toMatchObject({ score: 80, bestScore: 88 });
  });

  it('places out the whole ladder when the top skill passed, and nothing when placed at the first skill', () => {
    expect(applyPlacement([], l, null, 'kid', NOW)).toHaveLength(5);
    expect(applyPlacement([], l, 'p-K-1', 'kid', NOW)).toEqual([]);
  });
});

describe('sittings', () => {
  const A = ladder('a', [['PK', 4], ['K', 4], ['1', 4]]);
  const B = ladder('b', [['K', 6], ['1', 6]]);
  const SHORT = ladder('short', [['K', 2]]);
  const LATER = ladder('later', [['2', 5]]);
  const ladders = [A, SHORT, B, LATER];

  // Runs one sitting for a child who knows `known[ladderId]` skills on each ladder.
  function sit(progress: DiagnosticProgress, grade: Grade, known: Record<string, number>): { progress: DiagnosticProgress; asked: number; ladderIds: string[]; last: string } {
    let asked = 0;
    const ladderIds: string[] = [];
    for (;;) {
      const step = nextStep(progress, ladders, grade, { asked, elapsedMs: asked * 10_000 });
      if (step.kind !== 'ask') return { progress: endSitting(progress, NOW), asked, ladderIds, last: step.kind };
      const l = ladders.find((candidate) => candidate.id === step.ladderId) as DiagnosticLadder;
      const index = l.skills.findIndex((skill) => skill.id === step.skillId);
      progress = recordAnswer(progress, ladders, grade, step.ladderId, index < (known[step.ladderId] ?? 0), NOW);
      asked += 1;
      if (!ladderIds.includes(step.ladderId)) ladderIds.push(step.ladderId);
      if (asked > 500) throw new Error('the sitting did not stop');
    }
  }

  it('a ladder that starts above the child\'s grade, or is too short, asks nothing', () => {
    const { ladderIds, progress } = sit(newProgress('kid', 'math', NOW), 'K', { a: 6, b: 3 });
    expect(ladderIds).toEqual(['a', 'b']);
    expect(progress.ladders.later).toBeUndefined();
    expect(progress.ladders.short).toBeUndefined();
    const placements = placementsOf(progress, ladders, 'K');
    expect(placements.find((p) => p.ladderId === 'later')).toMatchObject({ walked: false, placementSkillId: 'later-2-1' });
    expect(placements.find((p) => p.ladderId === 'short')).toMatchObject({ walked: false, placementSkillId: 'short-K-1' });
  });

  it('works through the ladders in order and finishes with every walked ladder placed', () => {
    const { progress, last } = sit(newProgress('kid', 'math', NOW), 'K', { a: 6, b: 3 });
    expect(last).toBe('done');
    expect(progress.done).toBe(true);
    expect(progress.sittings).toBe(1);
    const placements = placementsOf(progress, ladders, 'K');
    expect(placements.find((p) => p.ladderId === 'a')).toMatchObject({ walked: true, placementSkillId: 'a-K-3', estimateGrade: 'K', estimateFraction: 0.5 });
    expect(placements.find((p) => p.ladderId === 'b')).toMatchObject({ walked: true, placementSkillId: 'b-K-4' });
  });

  it('stops at its question cap, and the next sitting picks up where it left off', () => {
    expect([sittingCap('PK'), sittingCap('K'), sittingCap('1'), sittingCap('2')]).toEqual([12, 16, 20, 20]);
    const many = Array.from({ length: 6 }, (_, i) => ladder(`m${i}`, [['PK', 6], ['K', 6], ['1', 6], ['2', 6]]));
    const known = Object.fromEntries(many.map((l, i) => [l.id, 3 + i * 3]));
    let progress = newProgress('kid', 'math', NOW);
    const sittings: number[] = [];
    const seen: string[] = [];
    for (let round = 0; round < 20 && !progress.done; round += 1) {
      let asked = 0;
      for (;;) {
        const step = nextStep(progress, many, 'K', { asked, elapsedMs: 0 });
        if (step.kind !== 'ask') break;
        const l = many.find((candidate) => candidate.id === step.ladderId) as DiagnosticLadder;
        seen.push(`${step.ladderId}:${step.skillId}`);
        progress = recordAnswer(progress, many, 'K', step.ladderId, l.skills.findIndex((s) => s.id === step.skillId) < (known[step.ladderId] ?? 0), NOW);
        asked += 1;
      }
      progress = endSitting(progress, NOW);
      sittings.push(asked);
    }
    expect(progress.done).toBe(true);
    expect(sittings.length).toBeGreaterThan(1);
    for (const asked of sittings) expect(asked).toBeLessThanOrEqual(sittingCap('K'));
    expect(sittings.slice(0, -1).every((asked) => asked === sittingCap('K'))).toBe(true);
    expect(progress.sittings).toBe(sittings.length);
    // Resuming never re-tests a skill it had already decided.
    const decided = new Map<string, number>();
    let previous = '';
    for (const key of seen) {
      if (key !== previous) decided.set(key, (decided.get(key) ?? 0) + 1);
      previous = key;
    }
    expect([...decided.values()].every((count) => count === 1)).toBe(true);
    // Every ladder ended at the right place.
    for (const placement of placementsOf(progress, many, 'K')) {
      const l = many.find((candidate) => candidate.id === placement.ladderId) as DiagnosticLadder;
      const index = l.skills.findIndex((s) => s.id === placement.placementSkillId);
      expect(Math.abs(index - (known[l.id] ?? 0)), l.id).toBeLessThanOrEqual(1);
    }
  });

  it('stops after 8 minutes even when few questions were asked', () => {
    const progress = newProgress('kid', 'math', NOW);
    expect(nextStep(progress, ladders, 'K', { asked: 3, elapsedMs: 8 * 60 * 1000 })).toEqual({ kind: 'sittingOver' });
    expect(nextStep(progress, ladders, 'K', { asked: 3, elapsedMs: 8 * 60 * 1000 - 1 }).kind).toBe('ask');
  });

  it('a diagnostic stopped in the middle of a skill resumes on the same skill with its answers kept', () => {
    let progress = newProgress('kid', 'math', NOW);
    progress = recordAnswer(progress, ladders, 'K', 'a', true, NOW);
    const saved = JSON.parse(JSON.stringify(progress)) as DiagnosticProgress; // as if written to storage and read back
    expect(saved.ladders.a).toMatchObject({ currentSkillId: 'a-K-1', right: 1, wrong: 0, asked: 1 });
    const step = nextStep(saved, ladders, 'K', { asked: 0, elapsedMs: 0 });
    expect(step).toMatchObject({ kind: 'ask', ladderId: 'a', skillId: 'a-K-1' });
    const after = recordAnswer(saved, ladders, 'K', 'a', true, NOW);
    expect(after.ladders.a?.passed).toEqual(['a-K-1']);
  });

  it('starts from the last placement when the diagnostic is taken again', () => {
    const step = nextStep(newProgress('kid', 'math', NOW), ladders, 'K', { asked: 0, elapsedMs: 0 }, { a: 'a-1-2' });
    expect(step).toMatchObject({ kind: 'ask', ladderId: 'a', skillId: 'a-1-2' });
  });

  it('an answer for a ladder that does not exist changes nothing', () => {
    const progress = newProgress('kid', 'math', NOW);
    expect(recordAnswer(progress, ladders, 'K', 'nope', true, NOW)).toBe(progress);
  });
});
