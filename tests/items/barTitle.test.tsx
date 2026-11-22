import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { generateQuestion } from '../../src/content/registry';
import { questionKey } from '../../src/engine/canonical';
import type { Question, QuestionBase } from '../../src/engine/types';
import { validateQuestion } from '../../src/engine/validate';
import ItemView from '../../src/items/ItemView';

// A bar graph a child builds has its title over its rows, as a graph picture does (the owner's choice, Nov 22, 2026).

function base(): QuestionBase {
  const facts = { id: 'x' };
  return { skillId: 'T-1', level: 1, seed: 1, key: questionKey('T-1', 1, facts), facts, mode: 'look', prompt: { text: 'Make it.', speak: ['Make it.'] }, explanation: { speak: ['Like this.'], steps: ['Like this.'] } };
}
const bars = (title?: string): Question => ({ ...base(), type: 'buildBar', categories: [{ label: 'cats', emoji: '🐱' }, { label: 'dogs', emoji: '🐶' }], max: 5, answer: [2, 3], ...(title ? { title } : {}) });

describe('the title over a bar graph to build', () => {
  it('shows above the rows and names the graph for a screen reader', () => {
    render(<ItemView question={bars('Our favorite things')} disabled={false} onChange={() => undefined} onSpeak={() => undefined} />);
    const title = document.querySelector('[data-title]');
    expect(title?.textContent).toBe('Our favorite things');
    const graph = screen.getByRole('group', { name: 'Bar graph: Our favorite things' });
    // The title comes before the rows.
    expect(title?.compareDocumentPosition(graph) && Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(validateQuestion(bars('Our favorite things'))).toEqual([]);
  });

  it('is left out when the graph has none', () => {
    render(<ItemView question={bars()} disabled={false} onChange={() => undefined} onSpeak={() => undefined} />);
    expect(document.querySelector('[data-title]')).toBeNull();
    expect(screen.getByRole('group', { name: 'Bar graph' })).toBeTruthy();
  });

  it('grade 2 C.4 level 4 builds "Our favorite things", like the graphs it reads', () => {
    const question = generateQuestion('M-2-C4', 4, 7);
    if (question.type !== 'buildBar') throw new Error('not a bar graph to build');
    expect(question.title).toBe('Our favorite things');
    expect(question.explanation.visual).toMatchObject({ kind: 'graph', type: 'bar', title: 'Our favorite things' });
  });
});
