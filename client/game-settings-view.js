// The game settings, as words for the page, and what this browser remembers
// of them.
//
// The settings themselves are in shared/game-settings.js: computer karts or
// not, how good they are, and (online only) at most how many people. This
// file turns them into the words of the "Game settings" card that comes up
// over the picture before a race, and of the small label in the corner of an
// online room that says who the host is.
//
// For a single race and a two-player race the browser remembers the choice
// (storage.js), like the character. Online nothing is remembered here: the
// server keeps the settings of the room, and every page shows what it says.
//
// Words and checks only, so it is tested without a browser
// (tests/game-settings-view.test.js). game-settings-card.js puts the card on
// the page.

import { LEVELS, isLevel } from "../shared/computer-driver.js";
import { FEWEST_PLAYERS, MOST_PLAYERS, playerLimitChoices } from "../shared/game-settings.js";
import { LEVEL_WORDS, readLevel, saveLevel } from "./difficulty.js";
import { readSaved, writeSaved } from "./storage.js";

const STORAGE_KEY = "kart-computers";

/** The kinds of race the card is used for. */
export const CARD_MODES = Object.freeze(["online", "single", "double"]);

// ---------------------------------------------------------------------------
// What this browser remembers, for a single race and a two-player race
// ---------------------------------------------------------------------------

/**
 * The choice this browser remembers: { computers, level }. Computer karts
 * are on unless the player switched them off; the level is the one of the
 * single race (difficulty.js), Normal if none was saved.
 */
export function readGameChoice(storage) {
  const saved = readSaved(storage, STORAGE_KEY)?.on;
  return { computers: saved !== false, level: readLevel(storage) };
}

/**
 * Remembers a choice. Refuses anything that is not a true or false with one
 * of the three levels. Gives true if both parts were saved, false if the
 * browser refused.
 */
export function saveGameChoice(storage, choice) {
  if (choice === null || typeof choice !== "object" || typeof choice.computers !== "boolean" || !isLevel(choice.level)) {
    throw new Error("That is not a choice of game settings: computer karts yes or no, and a level.");
  }
  const savedLevel = saveLevel(storage, choice.level);
  const savedComputers = writeSaved(storage, STORAGE_KEY, { on: choice.computers });
  return savedLevel && savedComputers;
}

// ---------------------------------------------------------------------------
// The words of the card
// ---------------------------------------------------------------------------

/** What the button at the bottom of the card says. */
export const CONFIRM_WORDS = "Confirm game settings";

/**
 * The top of the card: { badge, title, lead }.
 *   mode       "online", "single" or "double"
 *   firstTime  true when the card came up by itself before the first race:
 *              the host who was first in an online room, or a race page that
 *              has just opened
 * "badge" is the small label above the title, "" for none.
 */
export function cardWords(mode, firstTime = false) {
  if (!CARD_MODES.includes(mode)) {
    throw new Error(`There is no game settings card for "${mode}". The kinds are: ${CARD_MODES.join(", ")}.`);
  }
  if (mode === "online") {
    return firstTime
      ? {
          badge: "You are the host",
          title: "Start online game",
          lead: "You were first in the room, so you choose how the races are run. You can change this between races.",
        }
      : { badge: "You are the host", title: "Game settings", lead: "What you choose counts from the next race." };
  }
  if (mode === "single") {
    return { badge: "Single race", title: "Game settings", lead: "Choose who you race against. A change starts the race again." };
  }
  return { badge: "Two players", title: "Game settings", lead: "Choose who the two of you race against. A change starts the race again." };
}

/**
 * The row "Players" of the card (online only): one button for each limit,
 * and the sentence under them.
 *   most        the limit chosen on the card now
 *   peopleHere  how many people are in the room
 * Gives { choices: [{ most, allowed, pressed }], hint }.
 */
export function limitRow(most, peopleHere) {
  const choices = playerLimitChoices(peopleHere).map((choice) => ({ ...choice, pressed: choice.most === most }));
  const hint =
    peopleHere > FEWEST_PLAYERS
      ? `At most this many people in the room. ${peopleHere} are here now, so not fewer than ${peopleHere}.`
      : "At most this many people in the room.";
  return { choices, hint };
}

/** The row "Computer karts": On and Off, and the sentence under them for this kind of race. */
export function computersRow(on, mode) {
  const alone = { online: "Only people race.", single: "You race alone, against the clock.", double: "Only the two of you race." };
  return {
    choices: [
      { on: true, words: "On", pressed: on === true },
      { on: false, words: "Off", pressed: on === false },
    ],
    hint: on ? "They fill the race up to six karts." : (alone[mode] ?? alone.online),
  };
}

/** The row "Their level": Easy, Normal, Hard. "usable" is false while computer karts are off: there is nobody to set a level for. */
export function levelRow(level, computersOn) {
  return {
    choices: LEVELS.map((each) => ({ level: each, words: LEVEL_WORDS[each], pressed: each === level })),
    usable: computersOn === true,
  };
}

// ---------------------------------------------------------------------------
// The settings in one line, and the label in the corner of an online room
// ---------------------------------------------------------------------------

/**
 * The settings in a few words: "Computer karts: Hard", or "No computer
 * karts". With "withLimit" (online), the limit comes first when the host
 * lowered it: "Up to 4 players · Computer karts: Hard".
 */
export function settingsSummary(settings, { withLimit = false } = {}) {
  const computers = settings.computers ? `Computer karts: ${LEVEL_WORDS[settings.level] ?? LEVEL_WORDS.normal}` : "No computer karts";
  return withLimit && settings.most < MOST_PLAYERS ? `Up to ${settings.most} players · ${computers}` : computers;
}

/**
 * The small label in the corner of the picture of an online room, while it
 * waits for its first race: who the host is and how the races are run.
 *   race      from readRace() in race-view.js
 *   myId      this player's number, or null
 *   names     a Map from player number to user name (signed-in players)
 *   settings  the settings of the room (readGameSettings)
 * Gives null when there is nothing to say (no host known yet, or a race has
 * been started), or { mine, who, summary }: "mine" is true for the host, who
 * also gets the button to change the settings.
 */
export function roomLabel({ race, myId, names, settings }) {
  if (race.phase !== "open" || race.host === null || myId === null) {
    return null;
  }
  const mine = race.host === myId;
  const name = names instanceof Map ? names.get(race.host) : undefined;
  const who = mine ? "You are the host" : `Host: ${typeof name === "string" && name !== "" ? name : "a guest"}`;
  return { mine, who, summary: settingsSummary(settings, { withLimit: true }) };
}
