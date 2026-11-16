import type { Question, Response } from './types';

function sameList(a: readonly unknown[], b: readonly unknown[]): boolean {
  return a.length === b.length && a.every((item, i) => item === b[i]);
}

function wholeNumbers(list: unknown): list is number[] {
  return Array.isArray(list) && list.every((item) => Number.isInteger(item));
}

// Whether the child's answer is right. A response of the wrong shape is wrong, never an error.
export function check(question: Question, response: Response): boolean {
  switch (question.type) {
    case 'choice':
      return 'index' in response && response.index === question.answerIndex;
    case 'multiSelect': {
      if (!('indexes' in response) || !wholeNumbers(response.indexes)) return false;
      const chosen = new Set(response.indexes);
      const right = new Set(question.answerIndexes);
      return chosen.size === response.indexes.length && chosen.size === right.size && [...right].every((i) => chosen.has(i));
    }
    case 'tapCount':
      return 'count' in response && response.count === question.answer;
    case 'numberPad':
      return 'value' in response && response.value === question.answer;
    case 'order':
      return 'order' in response && wholeNumbers(response.order) && sameList(response.order, question.answerOrder);
    case 'sort':
      return 'bins' in response && wholeNumbers(response.bins) && sameList(response.bins, question.answerBin);
    case 'match': {
      if (!('pairs' in response) || !Array.isArray(response.pairs)) return false;
      const asText = (pairs: readonly (readonly [number, number])[]) => pairs.map(([l, r]) => `${l}-${r}`).sort();
      if (!response.pairs.every((pair) => Array.isArray(pair) && pair.length === 2)) return false;
      const given = asText(response.pairs);
      return new Set(given).size === given.length && sameList(given, asText(question.answerPairs));
    }
    case 'tiles':
      return (
        'tiles' in response &&
        Array.isArray(response.tiles) &&
        response.tiles.every((tile) => typeof tile === 'string') &&
        response.tiles.join('') === question.answer
      );
  }
}
