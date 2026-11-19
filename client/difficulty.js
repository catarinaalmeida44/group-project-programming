// The level of the computer karts in a single race: Easy, Normal or Hard.
//
// The player chooses it with three buttons above the track (race.html), and
// this browser remembers the choice for next time (storage.js), like the
// character. What a level does to the computer karts is in
// shared/computer-driver.js. Online every race is Normal.
//
// Words and checks only, so it is tested without a browser
// (tests/difficulty.test.js).

import { LEVELS, DEFAULT_LEVEL, isLevel } from "../shared/computer-driver.js";
import { readSaved, writeSaved } from "./storage.js";

const STORAGE_KEY = "kart-level";

/** The words on each level's button. */
export const LEVEL_WORDS = Object.freeze({ easy: "Easy", normal: "Normal", hard: "Hard" });

/** The level this browser remembers, or Normal if none (or something that is not a level) was saved. */
export function readLevel(storage) {
  const saved = readSaved(storage, STORAGE_KEY)?.level;
  return isLevel(saved) ? saved : DEFAULT_LEVEL;
}

/** Remembers a level. Refuses anything that is not a level. Gives true if it was saved, false if the browser refused. */
export function saveLevel(storage, level) {
  if (!isLevel(level)) {
    throw new Error("That is not a level: easy, normal or hard.");
  }
  return writeSaved(storage, STORAGE_KEY, { level });
}

/**
 * What the three buttons show for the level in use: for each level its
 * words and whether it is the one pressed (for aria-pressed, so a screen
 * reader says which one is on).
 */
export function levelButtons(current) {
  return LEVELS.map((level) => ({ level, words: LEVEL_WORDS[level], pressed: level === current }));
}
