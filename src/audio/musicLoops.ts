import { makeRng } from '../engine/rng';

// The notes of Sprout's music (game feel, phase 8), written as data so they can be tuned by ear.
//
// How a bar is written: notes in order, each "pitch:beats", separated by spaces. A pitch is a letter, an optional
// # or b, and an octave ("C4" is middle C). Notes sounded together are joined with "+" ("C4+E4+G4:4" is a chord
// held for four beats). "-:2" is a rest of two beats. Every bar of a loop adds up to the same number of beats,
// and every part of a loop has the same number of bars, so the loop always ends on a whole bar and joins itself
// with no seam (tests/audio/music.test.ts checks both).

export type Mood = 'garden' | 'practice' | 'night';
export const MOODS: readonly Mood[] = ['garden', 'practice', 'night'];

// pad: a soft, held chord. marimba: a warm wooden note that dies away. bell: a music-box note.
// bass: a soft low note.
export type Instrument = 'pad' | 'marimba' | 'bell' | 'bass';

export interface Track {
  instrument: Instrument;
  gain: number; // how loud this part is beside the others, 0 to 1
  bars: readonly string[];
}

export interface Loop {
  mood: Mood;
  bpm: number; // beats a minute: all slow
  beatsPerBar: number;
  // How far the music dips while the voice speaks: a third under the garden, nothing at all under a question.
  duck: number;
  tracks: readonly Track[];
}

// The garden: a warm, unhurried tune in C major, sixteen bars. A soft pad, a gentle bass and a marimba tune
// on the five notes of the pentatonic scale, so nothing ever clashes.
const GARDEN_LOOP: Loop = {
  mood: 'garden',
  bpm: 72,
  beatsPerBar: 4,
  duck: 1 / 3,
  tracks: [
    {
      instrument: 'pad',
      gain: 0.32,
      // C, Am, F, G twice; then F, G, Em, Am, F, C, Dm, G, which leads back to the C at the start.
      bars: [
        'C4+E4+G4:4', 'C4+E4+A4:4', 'C4+F4+A4:4', 'B3+D4+G4:4',
        'C4+E4+G4:4', 'C4+E4+A4:4', 'C4+F4+A4:4', 'B3+D4+G4:4',
        'C4+F4+A4:4', 'B3+D4+G4:4', 'B3+E4+G4:4', 'C4+E4+A4:4',
        'C4+F4+A4:4', 'C4+E4+G4:4', 'D4+F4+A4:4', 'B3+D4+G4:4',
      ],
    },
    {
      instrument: 'bass',
      gain: 0.4,
      bars: [
        'C3:2 G2:2', 'A2:2 E3:2', 'F2:2 C3:2', 'G2:2 D3:2',
        'C3:2 G2:2', 'A2:2 E3:2', 'F2:2 C3:2', 'G2:2 D3:2',
        'F2:2 C3:2', 'G2:2 D3:2', 'E2:2 B2:2', 'A2:2 E3:2',
        'F2:2 C3:2', 'C3:2 G2:2', 'D3:2 A2:2', 'G2:2 D3:2',
      ],
    },
    {
      instrument: 'marimba',
      gain: 0.5,
      bars: [
        'E5:1 G5:1 A5:1 G5:1', 'E5:2 C5:2', 'A4:1 C5:1 D5:1 C5:1', 'D5:3 -:1',
        'E5:1 G5:1 A5:1 C6:1', 'A5:2 G5:1 E5:1', 'G5:1 E5:1 D5:1 C5:1', 'D5:2 -:2',
        'C5:1 A4:1 C5:1 D5:1', 'D5:2 G4:2', 'E5:1 G5:1 E5:1 D5:1', 'C5:3 -:1',
        'A4:1 C5:1 A5:2', 'G5:1 E5:1 C5:2', 'D5:2 A4:1 C5:1', 'D5:2 -:2',
      ],
    },
  ],
};

// Practice: lighter and sparser, in F major, eight bars. A thin, high pad, one low marimba note a bar, and a few
// music-box notes with room between them, so it never competes with a question.
const PRACTICE_LOOP: Loop = {
  mood: 'practice',
  bpm: 66,
  beatsPerBar: 4,
  duck: 0,
  tracks: [
    {
      instrument: 'pad',
      gain: 0.22,
      // F, Dm, Bb, C twice; the C leads back to the F.
      bars: ['A3+C4+F4:4', 'A3+D4+F4:4', 'Bb3+D4+F4:4', 'G3+C4+E4:4', 'A3+C4+F4:4', 'A3+D4+F4:4', 'Bb3+D4+F4:4', 'G3+C4+E4:4'],
    },
    {
      instrument: 'marimba',
      gain: 0.3,
      bars: ['F3:4', 'D3:4', 'Bb2:4', 'C3:4', 'F3:4', 'D3:4', 'Bb2:4', 'C3:4'],
    },
    {
      instrument: 'bell',
      gain: 0.32,
      bars: ['A5:1 C6:1 -:2', '-:1 D6:1 A5:2', 'F5:2 -:2', '-:2 G5:1 A5:1', 'C6:1 A5:1 -:2', '-:1 F5:1 A5:2', 'D6:1 C6:1 -:2', 'G5:2 -:2'],
    },
  ],
};

// Night: a lullaby in G major, rocking in threes, twelve bars at a slow pace. A warm pad, a soft bass, and a
// music-box tune.
const NIGHT_LOOP: Loop = {
  mood: 'night',
  bpm: 56,
  beatsPerBar: 3,
  duck: 1 / 3,
  tracks: [
    {
      instrument: 'pad',
      gain: 0.3,
      // G, D, G, C, G, Em, Am, D, G, C, G, D; the last D leads back to the G at the start.
      bars: [
        'G3+B3+D4:3', 'F#3+A3+D4:3', 'G3+B3+D4:3', 'G3+C4+E4:3',
        'G3+B3+D4:3', 'G3+B3+E4:3', 'A3+C4+E4:3', 'F#3+A3+D4:3',
        'G3+B3+D4:3', 'G3+C4+E4:3', 'G3+B3+D4:3', 'F#3+A3+D4:3',
      ],
    },
    {
      instrument: 'bass',
      gain: 0.32,
      bars: ['G2:3', 'D3:3', 'G2:3', 'C3:3', 'G2:3', 'E3:3', 'A2:3', 'D3:3', 'G2:3', 'C3:3', 'G2:3', 'D3:3'],
    },
    {
      instrument: 'bell',
      gain: 0.4,
      bars: [
        'B4:2 D5:1', 'A4:2 D5:1', 'B4:1 A4:1 G4:1', 'E5:2 D5:1',
        'D5:2 B4:1', 'E5:1 D5:1 B4:1', 'A4:2 E5:1', 'D5:3',
        'B4:2 D5:1', 'E5:1 D5:1 B4:1', 'G4:2 B4:1', 'A4:3',
      ],
    },
  ],
};

export const LOOPS: Readonly<Record<Mood, Loop>> = { garden: GARDEN_LOOP, practice: PRACTICE_LOOP, night: NIGHT_LOOP };

// The lowest and highest notes any loop may use: nothing rumbles below what an iPad can play, nothing shrill.
export const LOWEST_NOTE = 40; // E2
export const HIGHEST_NOTE = 88; // E6

const LETTERS: Readonly<Record<string, number>> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

// A pitch such as "F#3" as a note number (middle C, "C4", is 60), or null if it cannot be read.
export function noteNumber(pitch: string): number | null {
  const match = /^([A-G])([#b]?)(\d)$/.exec(pitch);
  if (!match) return null;
  const letter = LETTERS[match[1] ?? ''];
  if (letter === undefined) return null;
  const shift = match[2] === '#' ? 1 : match[2] === 'b' ? -1 : 0;
  return 12 * (Number(match[3]) + 1) + letter + shift;
}

// A note number as its pitch in hertz (A4, note 69, is 440).
export function hertz(note: number): number {
  return 440 * 2 ** ((note - 69) / 12);
}

export interface BarNote {
  beat: number; // where it starts in the bar
  beats: number; // how long it lasts
  notes: number[]; // empty for a rest
}

// Reads one bar. Throws on anything it cannot read, so a typo shows up in the tests, never in a child's ears.
export function readBar(bar: string): BarNote[] {
  const out: BarNote[] = [];
  let beat = 0;
  for (const word of bar.trim().split(/\s+/)) {
    const [pitches, length] = word.split(':');
    const beats = Number(length);
    if (!pitches || !(beats > 0)) throw new Error(`Cannot read "${word}" in the bar "${bar}"`);
    const notes =
      pitches === '-'
        ? []
        : pitches.split('+').map((pitch) => {
            const note = noteNumber(pitch);
            if (note === null) throw new Error(`Cannot read the pitch "${pitch}" in the bar "${bar}"`);
            return note;
          });
    out.push({ beat, beats, notes });
    beat += beats;
  }
  return out;
}

// How many beats a bar holds.
export function barBeats(bar: string): number {
  return readBar(bar).reduce((sum, note) => sum + note.beats, 0);
}

export function loopBars(loop: Loop): number {
  return loop.tracks[0]?.bars.length ?? 0;
}

// How long one time round the loop takes, in seconds.
export function loopSeconds(loop: Loop): number {
  return (loopBars(loop) * loop.beatsPerBar * 60) / loop.bpm;
}

// One note to play: when (seconds from the start of the loop), for how long, which note, on what, how loud.
export interface MusicEvent {
  at: number;
  seconds: number;
  note: number;
  instrument: Instrument;
  gain: number;
}

const SEEDS: Readonly<Record<Mood, number>> = { garden: 101, practice: 202, night: 303 };

// Every note of a loop, in time order. Each note's loudness varies a little (always the same way, from the seeded
// random numbers), so the tune sounds played rather than stamped out. A chord shares its part's loudness among
// its notes, so a three-note chord is no louder than one note.
export function loopEvents(loop: Loop): MusicEvent[] {
  const rng = makeRng(SEEDS[loop.mood]);
  const beat = 60 / loop.bpm;
  const events: MusicEvent[] = [];
  for (const track of loop.tracks) {
    track.bars.forEach((bar, index) => {
      const start = index * loop.beatsPerBar;
      for (const part of readBar(bar)) {
        for (const note of part.notes) {
          const touch = 0.9 + rng.int(0, 20) / 100;
          events.push({ at: (start + part.beat) * beat, seconds: part.beats * beat, note, instrument: track.instrument, gain: (track.gain / part.notes.length) * touch });
        }
      }
    });
  }
  return events.sort((a, b) => a.at - b.at || a.note - b.note);
}
