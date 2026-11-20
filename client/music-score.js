// The music of the game, written down as notes.
//
// Like every other sound of the game, the music is made by our own code:
// no music files, and no tunes from any other game (PROJECT_BRIEF.md: no
// Nintendo music). The tunes below were composed for this game. music.js
// plays them with the browser's own sound system; this file is only the
// notes and the sums for when each one sounds, so it is tested
// (tests/music.test.js).
//
// THE SONGS
//   menu    the menus: relaxed and bouncy, C major, loops
//   race    during a race: faster, driving, A minor, loops. On the final
//           lap it is played faster (FINAL_LAP_SPEED)
//   finish  when you cross the line: a short fanfare, played once, then
//           the podium song follows by itself
//   podium  the podium: happy, F major, loops
//
// HOW A SONG IS WRITTEN
// A song has a speed (beats per minute) and voices. Every bar of every
// voice has 8 steps (eighth notes): two steps to a beat, four beats to a
// bar. A step is one of:
//   a note   like "A4": the letter, maybe "#" for sharp, and the octave
//            ("A4" is the A that orchestras tune to; "C4" is middle C)
//   "-"      the note before goes on for another step
//   "."      silence
// The drums have letters instead of notes: k (kick drum), s (snare), h
// (hi-hat), and they can be put together ("kh" is a kick and a hi-hat).
//
// THE VOICES
//   lead  the tune           bass  the low notes
//   arp   the chords, one note at a time, quietly
//   drums

/** Steps in a bar: eighth notes, four beats. */
export const STEPS_PER_BAR = 8;

/** How much faster the race song plays on the final lap. */
export const FINAL_LAP_SPEED = 1.15;

/** The lowest and highest note any voice may play (outside, it would boom or whistle). */
export const LOWEST_NOTE = "C2";
export const HIGHEST_NOTE = "C7";

/** The names of the songs. */
export const SONG_NAMES = Object.freeze(["menu", "race", "finish", "podium"]);

/** A bar written as one string: "E5 - G5 ." becomes ["E5", "-", "G5", "."]. */
const bar = (text) => text.trim().split(/\s+/);

export const SONGS = Object.freeze({
  menu: {
    tempo: 108,
    loops: true,
    voices: {
      lead: [
        "E5 - G5 - E5 D5 C5 -", //   C
        "E5 - A5 - G5 E5 C5 -", //   A minor
        "F5 - A5 - C6 - A5 F5", //   F
        "G5 - - . D5 E5 F5 D5", //   G
        "E5 - G5 - C6 - G5 E5", //   C
        "A5 - G5 E5 C5 - E5 -", //   A minor
        "F5 - E5 D5 A5 - F5 D5", //  D minor
        "G5 - - - B4 - D5 .", //     G
      ].map(bar),
      bass: [
        "C3 . G2 . C3 . G2 .",
        "A2 . E2 . A2 . E2 .",
        "F2 . C3 . F2 . C3 .",
        "G2 . D3 . G2 . B2 .",
        "C3 . G2 . C3 . G2 .",
        "A2 . E2 . A2 . E2 .",
        "D3 . A2 . D3 . A2 .",
        "G2 . D3 . G2 . B2 .",
      ].map(bar),
      arp: [
        "C4 E4 G4 E4 C4 E4 G4 E4",
        "A3 C4 E4 C4 A3 C4 E4 C4",
        "F3 A3 C4 A3 F3 A3 C4 A3",
        "G3 B3 D4 B3 G3 B3 D4 B3",
        "C4 E4 G4 E4 C4 E4 G4 E4",
        "A3 C4 E4 C4 A3 C4 E4 C4",
        "D4 F4 A4 F4 D4 F4 A4 F4",
        "G3 B3 D4 B3 G3 B3 D4 B3",
      ].map(bar),
      drums: Array.from({ length: 8 }, () => bar("k . h . s . h k")),
    },
  },

  race: {
    tempo: 152,
    loops: true,
    voices: {
      lead: [
        "A4 - C5 - E5 - D5 C5", //   A minor
        "F5 - E5 - C5 - A4 -", //    F
        "G4 - C5 - E5 - G5 -", //    C
        "F5 - E5 D5 B4 - G4 -", //   G
        "A4 - C5 - E5 - A5 -", //    A minor
        "C6 - A5 - F5 - C5 -", //    F
        "D5 - G5 - B5 - D6 -", //    G
        "B5 - G#5 - E5 - D5 B4", //  E
      ].map(bar),
      bass: [
        "A2 A3 A2 A3 A2 A3 A2 A3",
        "F2 F3 F2 F3 F2 F3 F2 F3",
        "C3 C4 C3 C4 C3 C4 C3 C4",
        "G2 G3 G2 G3 G2 G3 G2 G3",
        "A2 A3 A2 A3 A2 A3 A2 A3",
        "F2 F3 F2 F3 F2 F3 F2 F3",
        "G2 G3 G2 G3 G2 G3 G2 G3",
        "E2 E3 E2 E3 G#2 G#3 B2 B3",
      ].map(bar),
      arp: [
        "A3 C4 E4 A4 E4 C4 A3 C4",
        "F3 A3 C4 F4 C4 A3 F3 A3",
        "C4 E4 G4 C5 G4 E4 C4 E4",
        "G3 B3 D4 G4 D4 B3 G3 B3",
        "A3 C4 E4 A4 E4 C4 A3 C4",
        "F3 A3 C4 F4 C4 A3 F3 A3",
        "G3 B3 D4 G4 D4 B3 G3 B3",
        "E3 G#3 B3 E4 B3 G#3 E3 G#3",
      ].map(bar),
      drums: [...Array.from({ length: 7 }, () => bar("kh h sh h kh h sh h")), bar("kh h sh h kh s s s")],
    },
  },

  finish: {
    tempo: 132,
    loops: false,
    then: "podium",
    voices: {
      lead: ["C5 E5 G5 C6 - G5 C6 -", "E6 - - - - - . ."].map(bar),
      bass: ["C3 - - - G2 - - -", "C3 - - - - - . ."].map(bar),
      arp: ["E4 G4 C5 E5 - - G4 -", "G4 C5 E5 G5 - - . ."].map(bar),
      drums: ["k . k . k s k s", "ks . . . . . . ."].map(bar),
    },
  },

  podium: {
    tempo: 120,
    loops: true,
    voices: {
      lead: [
        "C5 - F5 - A5 - G5 F5", //   F
        "E5 - G5 - C6 - . .", //     C
        "D5 - F5 - A5 - F5 D5", //   D minor
        "D5 - F5 - A#5 - A5 G5", //  B flat
        "A5 - C6 - A5 - F5 -", //    F
        "G5 - E5 - C5 - E5 G5", //   C
        "F5 - D5 - A#4 - D5 F5", //  B flat
        "E5 - G5 - C6 - - -", //     C
      ].map(bar),
      bass: [
        "F2 . C3 . F2 . C3 .",
        "C3 . G2 . C3 . G2 .",
        "D3 . A2 . D3 . A2 .",
        "A#2 . F2 . A#2 . F2 .",
        "F2 . C3 . F2 . C3 .",
        "C3 . G2 . C3 . G2 .",
        "A#2 . F2 . A#2 . F2 .",
        "C3 . G2 . C3 . E3 .",
      ].map(bar),
      arp: [
        "F3 A3 C4 A3 F3 A3 C4 A3",
        "C4 E4 G4 E4 C4 E4 G4 E4",
        "D4 F4 A4 F4 D4 F4 A4 F4",
        "A#3 D4 F4 D4 A#3 D4 F4 D4",
        "F3 A3 C4 A3 F3 A3 C4 A3",
        "C4 E4 G4 E4 C4 E4 G4 E4",
        "A#3 D4 F4 D4 A#3 D4 F4 D4",
        "C4 E4 G4 E4 C4 E4 G4 E4",
      ].map(bar),
      drums: Array.from({ length: 8 }, () => bar("kh h sh h kh h sh h")),
    },
  },
});

const LETTERS = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

/** The number of a note, counted in half steps from A4 (A4 is 0, A#4 is 1, A3 is -12). null if it is not a note. */
export function halfStepsFromA4(note) {
  const match = /^([A-G])(#?)([0-9])$/.exec(note);
  if (match === null) {
    return null;
  }
  const [, letter, sharp, octave] = match;
  return LETTERS[letter] + (sharp === "#" ? 1 : 0) + (Number(octave) - 4) * 12 - 9;
}

/** How high a note sounds, in hertz: A4 is 440, and every octave up doubles it. null if it is not a note. */
export function hertzOf(note) {
  const steps = halfStepsFromA4(note);
  return steps === null ? null : 440 * 2 ** (steps / 12);
}

/** Is this a drum step: only the letters k, s and h, each at most once? */
export function isDrumStep(step) {
  return /^(?!.*(.).*\1)[ksh]+$/.test(step);
}

/** How many bars a song has (all its voices have the same number). */
export function barsOf(song) {
  return song.voices.lead.length;
}

/** How long one step of a song lasts, in seconds, at a speed (1 is as written). */
export function stepSeconds(song, speed = 1) {
  return 60 / (song.tempo * speed) / 2; // two steps to a beat
}

/**
 * The notes of one voice to start in the steps from "from" up to (not
 * including) "to", counting steps from the start of the song. In a song that
 * loops, the steps go round and round. Each note says when it starts (its
 * step), what it is, and for how many steps it lasts ("-" steps after it).
 * Drums give their letters. A song that does not loop has no steps after its
 * end.
 */
export function notesBetween(song, voice, from, to) {
  const bars = song.voices[voice];
  const total = bars.length * STEPS_PER_BAR;
  const stepAt = (step) => {
    const inSong = song.loops ? ((step % total) + total) % total : step;
    if (inSong < 0 || inSong >= total) {
      return null;
    }
    return bars[Math.floor(inSong / STEPS_PER_BAR)][inSong % STEPS_PER_BAR];
  };
  const notes = [];
  for (let step = Math.max(from, 0); step < to; step++) {
    const now = stepAt(step);
    if (now === null || now === "-" || now === ".") {
      continue;
    }
    let length = 1;
    while (length < total && stepAt(step + length) === "-") {
      length++;
    }
    notes.push({ step, note: now, steps: length });
  }
  return notes;
}
