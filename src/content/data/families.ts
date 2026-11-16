// Word families (plan section 9). Written words only: no pictures.

export interface WordFamily {
  ending: string; // 'at' for cat, hat, bat
  words: readonly string[];
}

const ROWS: Record<string, string> = {
  at: 'cat hat bat mat sat rat',
  an: 'can fan man pan ran van',
  ig: 'big dig fig pig wig',
  op: 'hop mop pop top',
  ug: 'bug hug mug rug',
  et: 'jet net pet wet',
  in: 'bin fin pin win',
  ot: 'dot hot pot not',
};

export const WORD_FAMILIES: readonly WordFamily[] = Object.entries(ROWS).map(([ending, words]) => ({ ending, words: words.split(' ') }));
