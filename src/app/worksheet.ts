import type { Skill } from '../content/catalogue';
import { generateQuestion } from '../content/registry';
import { describeAnswer, describeVisual } from '../engine/describe';
import { levelToAsk } from '../engine/skillscore';
import type { Level, Question } from '../engine/types';
import type { SkillState } from '../storage/schema';

// Printable worksheets (plan section 15.6). The questions come from the same generators with fixed seeds,
// so a sheet and its answer key always match, and the same seed prints the same sheet again.

export type Shift = -1 | 0 | 1; // one level easier, the child's level, one harder
export interface SheetRequest {
  skillIds: string[];
  count: number; // 10 or 20
  shift: Shift;
  seed: number; // printed on the sheet
}
export interface SheetItem {
  number: number;
  skill: Skill;
  question: Question;
  answer: string; // for the answer key
}
export interface Sheet {
  items: SheetItem[];
  left: { skill: Skill; why: string }[]; // skills that could not go on paper
}

export const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];
const TRIES = 12; // seeds tried for a question that works on paper

// What a child writes on paper, for the answer key.
export function paperAnswer(question: Question): string {
  switch (question.type) {
    case 'choice':
      return LETTERS[question.answerIndex] ?? '';
    case 'multiSelect':
      return question.answerIndexes.map((index) => LETTERS[index]).join(', ');
    case 'numberPad':
      return String(question.answer);
    case 'tapCount':
      return String(question.answer);
    case 'order':
      return question.answerOrder.map((index) => index + 1).join(', ');
    case 'sort':
      return question.bins.map((bin, b) => `${bin.label}: ${question.answerBin.flatMap((at, item) => (at === b ? [item + 1] : [])).join(', ')}`).join('; ');
    case 'match':
      return question.answerPairs.map(([left, right]) => `${left + 1}–${LETTERS[right]}`).join(', ');
    case 'tiles':
      return question.answer;
    case 'numberLineTap':
    case 'setClock':
    case 'buildBar':
      return describeAnswer(question);
    case 'columnSum':
    case 'fillShape':
      return String(question.answer);
    case 'dragWord':
      return `${LETTERS[question.answerIndex] ?? ''} (${describeVisual(question.options[question.answerIndex] ?? 'blank')})`;
  }
}

// A question can go on paper unless it is heard: a listen question needs the voice.
export function onPaper(question: Question): boolean {
  return question.mode !== 'listen';
}

export function buildSheet(skills: readonly Skill[], states: readonly SkillState[], request: SheetRequest): Sheet {
  const byId = new Map(states.map((state) => [state.skillId, state]));
  const usable: Skill[] = [];
  const left: Sheet['left'] = [];
  const levelOf = (skill: Skill): Level => {
    const base = levelToAsk(byId.get(skill.id)?.score ?? 0, false, skill.maxLevel as Level);
    return Math.min(Math.max(base + request.shift, 1), skill.maxLevel) as Level;
  };
  // A skill whose every try at this level is a listen question cannot go on paper.
  for (const skill of skills) {
    const level = levelOf(skill);
    const fits = Array.from({ length: TRIES }, (_, i) => generateQuestion(skill.id, level, request.seed + i)).some(onPaper);
    if (fits) usable.push(skill);
    else left.push({ skill, why: 'it is answered by listening, and a sheet of paper cannot speak' });
  }
  const items: SheetItem[] = [];
  const seen = new Set<string>();
  for (let n = 0; items.length < request.count && usable.length > 0 && n < request.count * TRIES; n += 1) {
    const skill = usable[items.length % usable.length] as Skill;
    const level = levelOf(skill);
    const question = generateQuestion(skill.id, level, request.seed + n);
    if (!onPaper(question) || seen.has(question.key)) continue;
    seen.add(question.key);
    items.push({ number: items.length + 1, skill, question, answer: paperAnswer(question) });
  }
  return { items, left };
}
