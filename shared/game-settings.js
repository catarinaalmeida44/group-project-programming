// The game settings: what is chosen before a race.
//
// Three things can be chosen:
//   computers  do computer karts fill the race, up to six karts? true or false
//   level      how good those computer karts are: "easy", "normal" or "hard"
//              (computer-driver.js)
//   most       online only: at most how many people may be in the room, from
//              FEWEST_PLAYERS to MOST_PLAYERS
//
// In an online room only the host chooses, and the server keeps the settings
// (server/online.js). In a single race and a two-player race the player
// chooses, and the browser remembers (client/game-choice.js).
//
// Both the server and the browser read this file, so they can never disagree
// about what a setting may be. It is plain checking, so it is tested without
// a server or a browser (tests/game-settings.test.js).

import { CAST } from "./cast.js";
import { GRID_PLACES } from "./grid.js";
import { DEFAULT_LEVEL, isLevel } from "./computer-driver.js";

/** The most people an online room takes: one for each character (the same number as MAX_PLAYERS in server/room.js). */
export const MOST_PLAYERS = Math.min(CAST.length, GRID_PLACES);

/** A room for fewer than two people would not be a race with others. */
export const FEWEST_PLAYERS = 2;

/** The settings when nobody has chosen anything: computer karts on, at their usual level, and the room open to six. */
export const DEFAULT_GAME_SETTINGS = Object.freeze({ computers: true, level: DEFAULT_LEVEL, most: MOST_PLAYERS });

/** Is this a number of people a room can be limited to? Only whole numbers from FEWEST_PLAYERS to MOST_PLAYERS. */
export function isPlayerLimit(most) {
  return Number.isInteger(most) && most >= FEWEST_PLAYERS && most <= MOST_PLAYERS;
}

/**
 * Settings sent by a browser, checked. Gives { computers, level, most },
 * built fresh from the three checked parts only, or null when any of them is
 * missing or is not exactly what it may be: "computers" a true or a false,
 * "level" one of the three words, "most" a whole number in the range.
 */
export function cleanGameSettings(value) {
  if (value === null || typeof value !== "object") {
    return null;
  }
  const { computers, level, most } = value;
  if (typeof computers !== "boolean" || !isLevel(level) || !isPlayerLimit(most)) {
    return null;
  }
  return { computers, level, most };
}

/**
 * Settings received by a browser, for showing: the same check, but anything
 * unusable gives the default settings. A page must not break on a strange
 * message.
 */
export function readGameSettings(value) {
  return cleanGameSettings(value) ?? { ...DEFAULT_GAME_SETTINGS };
}

/**
 * The settings of a room after its host asked for "wanted", with
 * "peopleHere" people in the room. The host cannot set the limit below the
 * number of people who are already there: nobody is thrown out. The limit
 * then stays as it was; the rest of what was asked still counts.
 */
export function settingsAfter(current, wanted, peopleHere) {
  const most = wanted.most < peopleHere ? current.most : wanted.most;
  return { computers: wanted.computers, level: wanted.level, most };
}

/**
 * The limits a host can pick from, for the buttons: one for each number from
 * FEWEST_PLAYERS to MOST_PLAYERS, with "allowed" false for the numbers below
 * the people who are already in the room.
 */
export function playerLimitChoices(peopleHere) {
  const choices = [];
  for (let most = FEWEST_PLAYERS; most <= MOST_PLAYERS; most++) {
    choices.push({ most, allowed: most >= peopleHere });
  }
  return choices;
}
