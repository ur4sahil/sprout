// Letter sounds (the owner's choice, Nov 21, 2026). Each phonics sound is recorded once (Chatterbox) and used in
// phonics questions, lessons, tapped letters, hints and wrong-answer steps. Spoken text names one with the Say part
// `{ sound: key }`. It is written on screen as `shown` (/b/), and said from its recording: once inside a sentence,
// three times when it is all there is to say. Until the recordings exist it is said by its letters ("the sound of
// B", see `soundFallback` in src/audio/say.ts). This is the one list of sounds.

export interface LetterSound {
  letters: string; // the spelling, named letter by letter while there is no recording: "the sound of S, H"
  shown: string; // how the sound is written on screen
  as: string; // a word with the sound in it, which says which sound is meant
  long?: true; // a long vowel, named "long A" while there is no recording
}

export const SOUNDS = {
  // Short vowels
  a: { letters: 'a', shown: '/a/', as: 'apple' },
  e: { letters: 'e', shown: '/e/', as: 'egg' },
  i: { letters: 'i', shown: '/i/', as: 'itch' },
  o: { letters: 'o', shown: '/o/', as: 'octopus' },
  u: { letters: 'u', shown: '/u/', as: 'up' },
  // Consonants. c and g are the hard sounds, as in cat and goat.
  b: { letters: 'b', shown: '/b/', as: 'bat' },
  c: { letters: 'c', shown: '/k/', as: 'cat' },
  d: { letters: 'd', shown: '/d/', as: 'dog' },
  f: { letters: 'f', shown: '/f/', as: 'fish' },
  g: { letters: 'g', shown: '/g/', as: 'goat' },
  h: { letters: 'h', shown: '/h/', as: 'hat' },
  j: { letters: 'j', shown: '/j/', as: 'jam' },
  k: { letters: 'k', shown: '/k/', as: 'kite' },
  l: { letters: 'l', shown: '/l/', as: 'lion' },
  m: { letters: 'm', shown: '/m/', as: 'moon' },
  n: { letters: 'n', shown: '/n/', as: 'nest' },
  p: { letters: 'p', shown: '/p/', as: 'pig' },
  qu: { letters: 'qu', shown: '/kw/', as: 'queen' },
  r: { letters: 'r', shown: '/r/', as: 'rabbit' },
  s: { letters: 's', shown: '/s/', as: 'sun' },
  t: { letters: 't', shown: '/t/', as: 'top' },
  v: { letters: 'v', shown: '/v/', as: 'van' },
  w: { letters: 'w', shown: '/w/', as: 'web' },
  x: { letters: 'x', shown: '/ks/', as: 'box' },
  y: { letters: 'y', shown: '/y/', as: 'yes' },
  z: { letters: 'z', shown: '/z/', as: 'zebra' },
  // Two letters, one sound
  sh: { letters: 'sh', shown: '/sh/', as: 'ship' },
  ch: { letters: 'ch', shown: '/ch/', as: 'chin' },
  th: { letters: 'th', shown: '/th/', as: 'thumb' },
  wh: { letters: 'wh', shown: '/wh/', as: 'whale' },
  ng: { letters: 'ng', shown: '/ng/', as: 'ring' },
  ck: { letters: 'ck', shown: '/k/', as: 'duck' },
  // Long vowels: the vowel says its name
  'long-a': { letters: 'a', shown: '/ā/', as: 'cake', long: true },
  'long-e': { letters: 'e', shown: '/ē/', as: 'he', long: true },
  'long-i': { letters: 'i', shown: '/ī/', as: 'kite', long: true },
  'long-o': { letters: 'o', shown: '/ō/', as: 'rope', long: true },
  'long-u': { letters: 'u', shown: '/ū/', as: 'cube', long: true },
  // Vowel teams and r-controlled vowels. Spellings that make one sound share how it is shown.
  ai: { letters: 'ai', shown: '/ā/', as: 'rain' },
  ay: { letters: 'ay', shown: '/ā/', as: 'play' },
  ee: { letters: 'ee', shown: '/ē/', as: 'bee' },
  ea: { letters: 'ea', shown: '/ē/', as: 'seat' },
  oa: { letters: 'oa', shown: '/ō/', as: 'boat' },
  ie: { letters: 'ie', shown: '/ī/', as: 'pie' },
  igh: { letters: 'igh', shown: '/ī/', as: 'night' },
  oi: { letters: 'oi', shown: '/oi/', as: 'coin' },
  oy: { letters: 'oy', shown: '/oi/', as: 'boy' },
  ou: { letters: 'ou', shown: '/ou/', as: 'out' },
  ow: { letters: 'ow', shown: '/ou/', as: 'cow' },
  ar: { letters: 'ar', shown: '/ar/', as: 'car' },
  er: { letters: 'er', shown: '/er/', as: 'her' },
  ir: { letters: 'ir', shown: '/er/', as: 'bird' },
  ur: { letters: 'ur', shown: '/er/', as: 'fur' },
  or: { letters: 'or', shown: '/or/', as: 'corn' },
} as const satisfies Record<string, LetterSound>;

export type SoundKey = keyof typeof SOUNDS;

export const SOUND_KEYS = Object.keys(SOUNDS) as SoundKey[];

export function isSoundKey(value: unknown): value is SoundKey {
  return typeof value === 'string' && Object.hasOwn(SOUNDS, value);
}

export function soundOf(key: SoundKey): LetterSound {
  return SOUNDS[key];
}
