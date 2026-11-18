import type { Question } from '../../src/engine/types';
import type { OracleAnswer } from './types';
import { same } from './types';

function sameSet(a: readonly number[], b: readonly number[]): boolean {
  return a.length === b.length && new Set(a).size === a.length && a.every((item) => b.includes(item));
}

function pairText(pairs: readonly (readonly [number, number])[]): string[] {
  return pairs.map(([l, r]) => `${l}-${r}`).sort();
}

// Compares the answer a generator marked with the answer an oracle worked out.
// Returns the problems found. An empty list means they agree and no wrong option is also right.
export function judge(question: Question, answer: OracleAnswer): string[] {
  const q = question;
  switch (answer.kind) {
    case 'value': {
      if (q.type === 'choice' || q.type === 'multiSelect' || q.type === 'dragWord') {
        const plain = q.facts.options;
        if (!Array.isArray(plain) || plain.length !== q.options.length) return ['facts.options does not list every option'];
        const right = plain.flatMap((value, index) => (same(value, answer.value) ? [index] : []));
        if (q.type === 'choice' || q.type === 'dragWord') {
          if (right.length === 0) return [`no option is the right answer ${String(answer.value)}`];
          if (right.length > 1) return [`options ${right.join(' and ')} are both right`];
          return right[0] === q.answerIndex ? [] : [`marked option ${q.answerIndex}, but option ${right[0]} is right`];
        }
        return sameSet(right, q.answerIndexes) ? [] : [`marked ${q.answerIndexes.join(',')}, but the right set is ${right.join(',')}`];
      }
      if (q.type === 'numberPad' || q.type === 'tapCount' || q.type === 'tiles' || q.type === 'numberLineTap' || q.type === 'columnSum' || q.type === 'fillShape') {
        return q.answer === answer.value ? [] : [`marked ${String(q.answer)}, but the answer is ${String(answer.value)}`];
      }
      if (q.type === 'setClock') {
        const marked = `${q.answer.hour}:${String(q.answer.minute).padStart(2, '0')}`;
        return marked === answer.value ? [] : [`marked ${marked}, but the answer is ${String(answer.value)}`];
      }
      if (q.type === 'buildBar') return same(q.answer, answer.value) ? [] : [`marked bars ${q.answer.join(',')}, but they are ${String(answer.value)}`];
      break;
    }
    case 'index':
      if (q.type === 'choice') return q.answerIndex === answer.index ? [] : [`marked option ${q.answerIndex}, but option ${answer.index} is right`];
      break;
    case 'indexes':
      if (q.type === 'multiSelect') return sameSet(q.answerIndexes, answer.indexes) ? [] : ['the marked set is not the right set'];
      break;
    case 'order':
      if (q.type === 'order') return same(q.answerOrder, answer.order) ? [] : [`marked order ${q.answerOrder.join(',')}, but it is ${answer.order.join(',')}`];
      break;
    case 'bins':
      if (q.type === 'sort') return same(q.answerBin, answer.bins) ? [] : ['the marked bins are not the right bins'];
      break;
    case 'pairs':
      if (q.type === 'match') return same(pairText(q.answerPairs), pairText(answer.pairs)) ? [] : ['the marked pairs are not the right pairs'];
      break;
  }
  return [`a ${answer.kind} answer does not fit a ${q.type} question`];
}
