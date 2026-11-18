import { makeRng } from '../engine/rng';
import type { Rng } from '../engine/rng';
import type { Say } from '../engine/types';
import { now } from '../lib/clock';
import type { Who } from './types';

// What the friends say (plan section 19, phase 3). Short and warm, and each friend sounds like itself: Sprout
// talks of growing, Pip of spots and counting, Olive of words and stories, Finn of hops and puzzles.
// No line ever speaks of a miss as a loss, of a missed day, or of hurrying.
// Every line is a `Say` made of plain words only, so the recorded voice can say it.

export const LINE_KINDS = ['greet', 'cheer', 'cheerBig', 'encourage', 'think', 'goodnight'] as const;
export type LineKind = (typeof LINE_KINDS)[number];

export const LINES: Record<Who, Record<LineKind, readonly Say[]>> = {
  sprout: {
    greet: [['Hello! I am so glad you are here.'], ['Hi there! The garden is ready for you.'], ['Welcome back, my friend!'], ['Hello, hello! Shall we grow something today?'], ['There you are! Come on in.']],
    cheer: [['You did it!'], ['Yes! Just right.'], ['Lovely work!'], ['That is the one!'], ['You are growing!']],
    cheerBig: [['Wow! Look how much you have grown!'], ['Hooray! That was wonderful!'], ['You did it all! I am so proud of you.'], ['What a day! The whole garden is cheering.']],
    encourage: [['Good try. Let us look at it together.'], ['Nearly. Have another go.'], ['That was a tricky one. You can do it.'], ['Every try helps you grow.'], ['Let us take it one step at a time.']],
    think: [['Hmm, let me think.'], ['Let us look closely.'], ['I wonder.'], ['Take your time. I am thinking too.']],
    goodnight: [['Good night. The garden will be here tomorrow.'], ['Sleep well, my friend.'], ['Time to rest. See you soon.'], ['Sweet dreams. You did well today.']],
  },
  pip: {
    greet: [['Hi! It is me, Pip!'], ['Hello! Ready to count with me?'], ['Pip is here! Let us play with numbers.'], ['Oh good, it is you! Let us go.'], ['Hello, number friend!']],
    cheer: [['Spot on!'], ['Yes! You got it!'], ['That adds up!'], ['Zip! Just right.'], ['You counted that so well!']],
    cheerBig: [['Wow! You are a number star!'], ['Hooray! Every single one!'], ['Look at you go! That was amazing!'], ['My spots are dancing! You did it!']],
    encourage: [['Good try! Let us count it again.'], ['So close. Have another go.'], ['Numbers can be tricky. We can do it.'], ['Let us go slowly, one at a time.'], ['I like how you tried that.']],
    think: [['Hmm, let me count.'], ['Let us see. How many are there?'], ['I am thinking, thinking.'], ['Ooh, a good one. Let me look.']],
    goodnight: [['Good night! I will count the stars for you.'], ['Sleep tight, number friend.'], ['Time to tuck in my wings. Good night!'], ['See you tomorrow for more counting.']],
  },
  olive: {
    greet: [['Hello, dear reader.'], ['Good day! I have words to share with you.'], ['Hello! Come and sit with me.'], ['Oh, how nice to see you!'], ['Welcome! Shall we read together?']],
    cheer: [['Well done!'], ['Yes, that is right.'], ['Beautifully done!'], ['What a clever reader!'], ['You know your words!']],
    cheerBig: [['Bravo! That was splendid!'], ['Hoo hoo hooray! You did it all!'], ['What a wonderful reader you are!'], ['I am so very proud of you.']],
    encourage: [['A good try. Let us look again.'], ['Not to worry. Have another go.'], ['Some words are tricky. We will get there.'], ['Let us say it slowly together.'], ['You are learning. That is what matters.']],
    think: [['Hmm, let me think.'], ['Now, what does it say?'], ['Let us listen closely.'], ['A good one to wonder about.']],
    goodnight: [['Good night, dear reader.'], ['Sleep well. I will keep watch.'], ['The story will wait for tomorrow.'], ['Close your eyes. Sweet dreams.']],
  },
  finn: {
    greet: [['Ribbit! Hello!'], ['Hi! Finn here. Ready for a puzzle?'], ['Hop on over! I have something to show you.'], ['Hello, puzzle friend!'], ['There you are! Let us think together.']],
    cheer: [['You cracked it!'], ['Yes! Good thinking!'], ['Hop, hop, hooray!'], ['That is it!'], ['Clever you!']],
    cheerBig: [['Wow! What a thinker you are!'], ['Splash! You got every one!'], ['That was a giant leap! Well done!'], ['Ribbit, ribbit, hooray! You did it!']],
    encourage: [['Good try! Let us look for a clue.'], ['Almost. Have another hop at it.'], ['Puzzles take a few tries. That is the fun.'], ['Let us look at it another way.'], ['I like how you are thinking.']],
    think: [['Hmm, a puzzle.'], ['Let me think. What changes?'], ['I spy a clue.'], ['Ooh, this is a good one.']],
    goodnight: [['Good night! Time for my lily pad.'], ['Sleep well, puzzle friend.'], ['Ribbit. See you tomorrow.'], ['The pond is quiet now. Sweet dreams.']],
  },
};

export interface PickedLine {
  index: number; // hand this back as `lastIndex` next time
  say: Say;
}

// The choosing starts from the clock, so a friend does not open with the same words at every launch.
let chooser: Rng | null = null;

// A line for a friend to say, never the one it said last time. `lastIndex` is the `index` this gave before for
// the same friend and kind, or null the first time.
export function pickLine(who: Who, kind: LineKind, lastIndex: number | null = null, rng?: Rng): PickedLine {
  const lines = LINES[who][kind];
  chooser ??= makeRng(now().getTime() % 2147483647);
  const others = lines.map((_, index) => index).filter((index) => index !== lastIndex);
  const index = (rng ?? chooser).pick(others);
  return { index, say: lines[index] as Say };
}
