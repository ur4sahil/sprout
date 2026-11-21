import type { Say } from '../engine/types';

// The fixed lines the app says outside questions. They live here, in one place, so the voice can be
// made for every one of them ahead of time (scripts/voice-sentences.ts) and none is missed.
export const LINES = {
  dailyLimit: ['All done for today. Great work. See you tomorrow.'],
  checkInSitting: ['All done for today. Here is a sticker.'],
  checkInDone: ['The check-in is finished. Here is a sticker.'],
  newSticker: ['You earned a new sticker.'],
  newStickers: ['You earned new stickers.'],
  reviewDone: ['Review done. Nice work.'],
  nextOne: ['Nice work! On to the next one?'],
  knownAlready: ['You know this one already. On to the next.'],
  mixedDone: ['Mixed bag done. Great work.'],
  // Home: Sprout over today's plan cards. "Next up!" is followed by the next card's own words.
  nextUp: ['Next up!'],
  planDone: ['Plan done! Great work.'],
  // The bulb's choice screen: what it offers.
  choose: ['Pick a lesson with Sprout, or an example.'],
  chooseWithVideo: ['Pick a video, a lesson with Sprout, or an example.'],
  // A hint (the owner's choice, Nov 21, 2026): the nudge is followed by the step itself, the example by its question.
  hintNudge: ['Here is a hint.'],
  hintExample: ['Here is one like it, worked out.'],
} as const satisfies Record<string, Say>;

// The words and picture of each milestone card, shown and said.
export const MILESTONE_WORDS: Record<number, { emoji: string; title: string; line: string }> = {
  50: { emoji: '⭐', title: 'Halfway there!', line: 'You are halfway to mastering this skill.' },
  80: { emoji: '🎗️', title: 'Proficient!', line: 'You earned a ribbon.' },
  90: { emoji: '🔥', title: 'Challenge zone!', line: 'These are the hardest questions. You are ready.' },
  100: { emoji: '🏅', title: 'Mastered!', line: 'You earned a medal.' },
};
