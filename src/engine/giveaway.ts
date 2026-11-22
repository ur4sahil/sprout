import { numberWords } from '../audio/say';
import { describeAnswer, describeVisual, sayText } from './describe';
import type { FactValue, Question, Visual } from './types';

// Whether a line offered before the child answers (a hint) gives the answer away (the owner's rule, Nov 21, 2026):
// it names the right option (its label, its description or its plain value), the number to type, the word to
// spell, or the sign. A word that the question names without naming the wrong answers is no giveaway: "Find the
// square." may be helped with "A square has 4 equal sides.", but "Is 6 × 10 even or odd?" may not hear "even".
// A listen question's hint must not show the target (rule 14), and a read question's must not say the words to be
// read (rule 15).

// The words a sign goes by, so a hint cannot name it in words either.
const SIGN_WORDS: Record<string, string[]> = {
  '<': ['less than'],
  '>': ['greater than'],
  '=': ['equal', 'equals'],
  '+': ['plus'],
  '−': ['minus', 'take away'],
  '-': ['minus', 'take away'],
  '×': ['times'],
  '÷': ['divided by'],
};

function optionTexts(option: Visual | undefined, value: FactValue | undefined): string[] {
  if (!option) return [];
  const texts = [describeVisual(option)];
  if (option.speak) texts.push(sayText(option.speak));
  if (typeof value === 'string' || typeof value === 'number') texts.push(String(value));
  return texts;
}

function factOption(question: Question, i: number): FactValue | undefined {
  const options = question.facts.options;
  return Array.isArray(options) ? options[i] : undefined;
}

// The right answer as text, and the wrong options as text (to tell a question that names its target from one that
// lists its choices). Sort, order, match and bar answers are lists, so nothing short names them.
function answerAndOthers(question: Question): { right: string[]; wrong: string[] } {
  switch (question.type) {
    case 'choice':
    case 'dragWord':
      return {
        right: optionTexts(question.options[question.answerIndex], factOption(question, question.answerIndex)),
        wrong: question.options.flatMap((option, i) => (i === question.answerIndex ? [] : optionTexts(option, factOption(question, i)))),
      };
    case 'multiSelect':
      return {
        right: question.answerIndexes.flatMap((i) => optionTexts(question.options[i], factOption(question, i))),
        wrong: question.options.flatMap((option, i) => (question.answerIndexes.includes(i) ? [] : optionTexts(option, factOption(question, i)))),
      };
    case 'numberPad':
    case 'tapCount':
    case 'columnSum':
    case 'fillShape':
    case 'tiles':
      return { right: [String(question.answer)], wrong: [] };
    case 'numberLineTap':
    case 'setClock':
      return { right: [describeAnswer(question)], wrong: [] };
    case 'buildBar':
    case 'order':
    case 'sort':
    case 'match':
      return { right: [], wrong: [] };
  }
}

const isNumeric = (text: string): boolean => /\d/.test(text);

// Whether `line` names `text`: as a whole word or number, in any case, never as part of a longer one
// ("6" is not named by "16" or "6/8"; "cat" is not named by "catch").
export function names(line: string, text: string): boolean {
  const needle = text.trim();
  if (needle.length === 0) return false;
  const escaped = needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const before = /^[A-Za-z]/.test(needle) ? '(?<![A-Za-z])' : /^\d/.test(needle) ? '(?<![\\d/:.,])' : '';
  const after = /[A-Za-z]$/.test(needle) ? '(?![A-Za-z])' : /\d$/.test(needle) ? '(?![\\d/:]|[.,]\\d)' : '';
  return new RegExp(`${before}${escaped}${after}`, 'i').test(line);
}

// Every form of the right answer a hint must not name.
export function answerForms(question: Question): string[] {
  const { right, wrong } = answerAndOthers(question);
  const prompt = question.prompt.text;
  const listsChoices = wrong.some((text) => names(prompt, text));
  const forms = new Set<string>();
  for (const text of right) {
    const trimmed = text.trim();
    if (trimmed.length === 0) continue;
    // The question's own target, named in the question, is not a giveaway.
    if (!isNumeric(trimmed) && !listsChoices && names(prompt, trimmed)) continue;
    forms.add(trimmed);
    for (const word of SIGN_WORDS[trimmed] ?? []) forms.add(word);
    const n = Number(trimmed.replace(/,/g, ''));
    if (/^\d{1,3}(,?\d{3})*$/.test(trimmed) && Number.isInteger(n) && n <= 10_000) {
      forms.add(String(n));
      forms.add(n.toLocaleString('en-US'));
      forms.add(numberWords(n));
    }
  }
  return [...forms];
}

function wordsOf(text: string): string[] {
  return text.toLowerCase().split(/[^a-z']+/).filter((word) => word.length > 0);
}

// Whether a hint gives the answer away. `shown` is its text. `said` is its speech written out (sayText) when that
// was written apart from the text (a hint's `say`, an entry of `stepsSay`); null when the text itself is read aloud.
export function givesAway(question: Question, shown: string, said: string | null): boolean {
  const lines = said === null ? [shown] : [shown, said];
  if (answerForms(question).some((form) => lines.some((line) => names(line, form)))) return true;
  const { target, read } = question.facts;
  if (question.mode === 'listen' && (typeof target === 'string' || typeof target === 'number') && names(shown, String(target))) return true;
  if (question.mode === 'read') {
    const toRead = typeof read === 'string' ? [read] : Array.isArray(read) ? read.filter((each): each is string => typeof each === 'string') : [];
    const heard = new Set(wordsOf(said ?? shown));
    // One word to read must not be said at all; a sentence must not be said in full (as rule 15).
    if (toRead.some((text) => wordsOf(text).length > 0 && wordsOf(text).every((word) => heard.has(word)))) return true;
  }
  return false;
}
