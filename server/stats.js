// A player's own stats, worked out from their saved races.
//
// The database gives a plain list of one player's races (store.js,
// resultsOf). This file turns that list into what "Your account" shows:
// how many races, how many wins, the three best times, the best lap and the
// character driven most. It also writes the list out as a file that a
// spreadsheet program such as Excel can open ("Download my results").
//
// Nothing here talks to the database or to the internet, and nothing here
// decides who may ask: accounts.js only ever hands in the list of the
// signed-in player. So it is tested with plain lists.

import { isCharacterId, characterById } from "../shared/cast.js";
import { STEP_SECONDS } from "../shared/physics.js";
import { formatTime } from "../client/format.js";

/** How many of a player's best race times are shown. */
export const BEST_TIMES_SHOWN = 3;

/** The two kinds of saved race. */
export const ONLINE = "online";
export const SINGLE = "single";

/**
 * The stats of one track from a player's saved races.
 *   rows   [{ track, mode, raceSteps, bestLapSteps, position, character, at }]
 *   track  the short name of the track, such as "nova-lap"
 *
 * Gives:
 *   races, online, single   how many races in all, and of each kind
 *   wins, podiums           how many were finished first, and in the first three
 *   bestRaces               the fastest whole races, fastest first, at most
 *                           BEST_TIMES_SHOWN: [{ steps, mode, at, character }]
 *   bestLap                 the fastest single lap: { steps, mode, at }, or null
 *   favourite               the character driven most: { character, races,
 *                           counted }, or null. "counted" is how many races
 *                           have a character at all: races saved before 19
 *                           November 2026 have none
 *   lastAt                  when the newest race was saved, or null
 * Times are in steps of the game, 60 to a second. "at" is in milliseconds.
 */
export function statsFrom(rows, track) {
  const mine = rows.filter((row) => row.track === track);

  // Fastest first. Two races with exactly the same time: the one driven first comes first.
  const byRaceTime = [...mine].sort((a, b) => a.raceSteps - b.raceSteps || a.at - b.at);
  const byLapTime = [...mine].sort((a, b) => a.bestLapSteps - b.bestLapSteps || a.at - b.at);

  return {
    races: mine.length,
    online: mine.filter((row) => row.mode === ONLINE).length,
    single: mine.filter((row) => row.mode === SINGLE).length,
    wins: mine.filter((row) => row.position === 1).length,
    podiums: mine.filter((row) => row.position <= 3).length,
    bestRaces: byRaceTime
      .slice(0, BEST_TIMES_SHOWN)
      .map((row) => ({ steps: row.raceSteps, mode: row.mode, at: row.at, character: knownCharacter(row.character) })),
    bestLap: byLapTime.length === 0 ? null : { steps: byLapTime[0].bestLapSteps, mode: byLapTime[0].mode, at: byLapTime[0].at },
    favourite: favouriteOf(mine),
    lastAt: mine.length === 0 ? null : Math.max(...mine.map((row) => row.at)),
  };
}

/** The id of a character that is in the cast today, or null. */
function knownCharacter(id) {
  return isCharacterId(id) ? id : null;
}

/**
 * The character driven in the most races. With the same number of races
 * for two characters, the one driven most recently. Null if no race has a
 * character.
 */
function favouriteOf(rows) {
  const driven = new Map(); // character id -> { races, lastAt }
  let counted = 0;
  for (const row of rows) {
    const id = knownCharacter(row.character);
    if (id === null) {
      continue;
    }
    counted += 1;
    const so = driven.get(id) ?? { races: 0, lastAt: -Infinity };
    driven.set(id, { races: so.races + 1, lastAt: Math.max(so.lastAt, row.at) });
  }
  let best = null;
  for (const [character, { races, lastAt }] of driven) {
    if (best === null || races > best.races || (races === best.races && lastAt > best.lastAt)) {
      best = { character, races, lastAt };
    }
  }
  return best === null ? null : { character: best.character, races: best.races, counted };
}

// ---- The file for a spreadsheet ----

/** The first line of the file: the names of the columns. */
export const CSV_COLUMNS = Object.freeze([
  "Date (UTC)",
  "Track",
  "Kind of race",
  "Place",
  "Race time",
  "Best lap",
  "Race time in thousandths of a second",
  "Best lap in thousandths of a second",
  "Character",
]);

/**
 * One cell of the file, written so that a spreadsheet program takes it as
 * plain text or as a plain number, and as nothing else.
 *   - A text goes between quotation marks, and a quotation mark inside it
 *     is written twice. A comma or a new line in a text then cannot start a
 *     new cell or a new row.
 *   - A text that begins with = + - or @ could be taken for a formula and
 *     worked out by the program. It gets an apostrophe in front, which
 *     tells the program "this is text". Every text in our file comes from
 *     our own lists, so this should never be needed. It is here in case a
 *     list changes one day.
 *   - A whole number is written as it is.
 */
export function csvCell(value) {
  if (Number.isSafeInteger(value)) {
    return String(value);
  }
  const text = String(value ?? "");
  const safe = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
  return `"${safe.replaceAll('"', '""')}"`;
}

/** "2026-11-19 16:05": a moment as a date and time that reads the same in every country. */
function dateText(at) {
  const date = new Date(at);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 16).replace("T", " ");
}

/** Steps of the game (60 to a second) as whole thousandths of a second. */
function thousandths(steps) {
  return Math.round(steps * STEP_SECONDS * 1000);
}

/**
 * A player's saved races as the text of a ".csv" file: one line for each
 * race, the newest first, the cells separated by commas.
 *   rows        as for statsFrom
 *   trackNames  { "nova-lap": "Nova lap", ... }: the name to show for each
 *               short name. A track that is not listed keeps its short name
 *
 * The times are there twice: as on the screen ("1:23.45"), and as a whole
 * number that a spreadsheet can sort and add up in any country (some write
 * 83.45, some 83,45: a whole number has neither problem).
 */
export function resultsAsCsv(rows, trackNames = {}) {
  const lines = [CSV_COLUMNS.map(csvCell).join(",")];
  for (const row of rows) {
    lines.push(
      [
        dateText(row.at),
        Object.hasOwn(trackNames, row.track) ? trackNames[row.track] : row.track,
        row.mode === ONLINE ? "online" : "single race",
        row.position,
        formatTime(row.raceSteps * STEP_SECONDS),
        formatTime(row.bestLapSteps * STEP_SECONDS),
        thousandths(row.raceSteps),
        thousandths(row.bestLapSteps),
        characterById(row.character)?.name ?? "",
      ]
        .map(csvCell)
        .join(","),
    );
  }
  // "\r\n" is how lines end in this kind of file.
  return `${lines.join("\r\n")}\r\n`;
}
