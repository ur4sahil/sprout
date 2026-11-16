// Letters, and the ones a young child mixes up (plan section 5, distractor rules).

export const ALPHABET: readonly string[] = 'abcdefghijklmnopqrstuvwxyz'.split('');

// Lowercase letters that look alike. Each set is offered together from level 2 up.
export const LOOK_ALIKE_LOWER: readonly (readonly string[])[] = [
  ['b', 'd', 'p', 'q'],
  ['m', 'n'],
  ['u', 'v'],
  ['h', 'n'],
];

// Uppercase letters that look alike.
export const LOOK_ALIKE_UPPER: readonly (readonly string[])[] = [
  ['E', 'F'],
  ['O', 'Q'],
  ['M', 'N'],
  ['U', 'V'],
  ['M', 'W'],
  ['P', 'R', 'B'],
  ['C', 'G'],
];

// Letters whose big and small shapes are different, such as A a and B b.
// The rest (C c, O o, S s and so on) are the same shape at two sizes.
export const DIFFERENT_SHAPES: readonly string[] = ['a', 'b', 'd', 'e', 'g', 'h', 'n', 'q', 'r', 't'];

// Never sorted as "letter or number": each has a look-alike on the other side.
// The plan lists O, I, l, S, Z and B. The small o, s and z are the same shapes, and
// small b, g and q are close to 6 and 9, so they are left out too.
export const SORT_EXCLUDED_LETTERS: readonly string[] = ['O', 'o', 'I', 'l', 'S', 's', 'Z', 'z', 'B', 'b', 'g', 'q'];
export const SORT_EXCLUDED_DIGITS: readonly number[] = [0, 1, 2, 5, 8];
