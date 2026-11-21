import type { Skill } from '../content/catalogue';
import { generateQuestion } from '../content/registry';
import { check } from '../engine/check';
import { describeAnswer, describePrompt, describeResponse } from '../engine/describe';
import type { PracticeResult } from '../engine/skillscore';
import { applyPractice } from '../engine/skillscore';
import type { Question, Response } from '../engine/types';
import { localDay } from '../lib/clock';
import { newId } from '../lib/ids';
import type { Attempt, Child, Session, SkillState } from '../storage/schema';
import { TIMING } from './timing';

// What one practice answer turns into: the attempt row, the new skill state and the session so far.
// Pure, apart from making an id. The screen saves all three before the next question renders.

export interface AnswerOutcome extends PracticeResult {
  correct: boolean;
  attempt: Attempt;
  session: Session;
}

export function recordAnswer(input: {
  child: Child;
  skill: Skill;
  state: SkillState;
  session: Session;
  question: Question;
  response: Response;
  shownAt: Date;
  answeredAt: Date;
  hinted?: boolean; // the child opened a hint on this question: a right answer counts for half
}): AnswerOutcome {
  const { child, skill, state, session, question, response, shownAt, answeredAt } = input;
  const hinted = input.hinted === true;
  const correct = check(question, response);
  const at = answeredAt.toISOString();
  const result = applyPractice(state, correct, child.settings.gentleScoring, at, hinted);
  const ms = Math.min(Math.max(answeredAt.getTime() - shownAt.getTime(), 0), TIMING.maxAnswerMs);
  const attempt: Attempt = {
    id: newId(),
    childId: child.id,
    skillId: skill.id,
    sessionId: session.id,
    level: question.level, // the level actually asked
    seed: question.seed, // the seed that produced the question shown
    itemType: question.type,
    response, // exactly what the child submitted
    contentVersion: skill.version,
    snapshot: { prompt: describePrompt(question), correct: describeAnswer(question), given: describeResponse(question, response) },
    correct,
    hinted,
    ms,
    scoreBefore: state.score,
    scoreAfter: result.state.score,
    kind: 'practice',
    day: localDay(answeredAt),
    createdAt: at,
  };
  return {
    ...result,
    correct,
    attempt,
    session: { ...session, questions: session.questions + 1, correct: session.correct + (correct ? 1 : 0) },
  };
}

export function newSession(child: Child, skillId: string, startedAt: Date): Session {
  return {
    id: newId(),
    childId: child.id,
    kind: 'practice',
    skillId,
    startedAt: startedAt.toISOString(),
    endedAt: null,
    questions: 0,
    correct: 0,
    day: localDay(startedAt),
    mixed: false,
  };
}

// The keys of the child's latest questions on a skill, oldest first, worked out again from their seeds.
export function recentKeys(attempts: readonly Attempt[], skill: Skill): string[] {
  return attempts
    .filter((attempt) => attempt.kind === 'practice' && attempt.contentVersion === skill.version)
    .slice(-6)
    .map((attempt) => generateQuestion(skill.id, attempt.level, attempt.seed).key);
}

// One review answer. Review answers are logged with kind `review` and never change the score by themselves:
// the result of the whole review is applied once, after its last question.
export function recordReviewAnswer(input: { child: Child; skill: Skill; state: SkillState; session: Session; question: Question; response: Response; shownAt: Date; answeredAt: Date; hinted?: boolean }): { correct: boolean; attempt: Attempt; session: Session } {
  const { child, skill, state, session, question, response, shownAt, answeredAt } = input;
  const hinted = input.hinted === true;
  const correct = check(question, response);
  const attempt: Attempt = {
    id: newId(),
    childId: child.id,
    skillId: skill.id,
    sessionId: session.id,
    level: question.level,
    seed: question.seed,
    itemType: question.type,
    response,
    contentVersion: skill.version,
    snapshot: { prompt: describePrompt(question), correct: describeAnswer(question), given: describeResponse(question, response) },
    correct,
    hinted,
    ms: Math.min(Math.max(answeredAt.getTime() - shownAt.getTime(), 0), TIMING.maxAnswerMs),
    scoreBefore: state.score,
    scoreAfter: state.score,
    kind: 'review',
    day: localDay(answeredAt),
    createdAt: answeredAt.toISOString(),
  };
  return { correct, attempt, session: { ...session, questions: session.questions + 1, correct: session.correct + (correct ? 1 : 0) } };
}

export function newReviewSession(child: Child, startedAt: Date): Session {
  return { ...newSession(child, '', startedAt), kind: 'review', skillId: null };
}
