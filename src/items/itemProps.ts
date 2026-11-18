import type { Question, Response, Say } from '../engine/types';

// What every question component is given.
export interface ItemProps<T extends Question['type']> {
  question: Extract<Question, { type: T }>;
  disabled: boolean; // inputs lock on submit
  // The child's answer so far, or null while it is not yet complete.
  onChange: (response: Response | null) => void;
  // Asked to say a picture's spoken label. Never called in a listen question.
  onSpeak: (say: Say) => void;
  // True once this answer has been marked right: the component plays its own small celebration.
  right?: boolean;
}

// A picture's spoken label may be said on tap, except in a listen question,
// where tapping around must not reveal the answer.
export function speakable(question: Question, say: Say | undefined): Say | null {
  if (question.mode === 'listen' || !say || say.length === 0) return null;
  return say;
}
