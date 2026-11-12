// The tracks a player can choose in the menu, as plain facts for the cards:
// the name, the number of laps, the address of the race, and your own best
// times on it.
//
// The tracks come from the list in shared/tracks/index.js. A track added to
// that list shows up here by itself. This file needs no browser, so it has
// tests. track-panel.js puts the cards on the page.

import { bestTimesFor, bestTimeText } from "./records.js";

/** What a card says where there is no best time yet. */
export const NO_TIME = "No time yet";

/**
 * The two kinds of race a track can be chosen for, and what the "Choose a
 * track" panel says for each:
 *   page   the page that runs the race; the track is added to its address
 *   title  the title of the panel
 *   lead   the sentence under the title
 *   go     the word on the button of each card
 */
export const RACE_KINDS = Object.freeze({
  single: {
    page: "/race.html",
    title: "Choose a track",
    lead: "A single race is you against the clock. It runs in your browser, and your best times are kept in this browser only.",
    go: "Race",
  },
  online: {
    page: "/online.html",
    title: "Choose a track to race online",
    lead: "Our server runs the online races. Everyone who opens the same track is in the same room. Anyone can race, but only the times of signed-in players are saved for the leaderboard.",
    go: "Join the room",
  },
});

/**
 * The address that opens a track: "/race.html?track=campus-loop" for a
 * single race, "/online.html?track=campus-loop" for an online one.
 * Refuses a kind of race that does not exist.
 */
export function trackAddress(kind, shortName) {
  if (!Object.hasOwn(RACE_KINDS, kind)) {
    throw new Error(`There is no kind of race called "${kind}". The kinds are: ${Object.keys(RACE_KINDS).join(", ")}.`);
  }
  // encodeURIComponent makes any text safe to put in an address.
  return `${RACE_KINDS[kind].page}?track=${encodeURIComponent(shortName)}`;
}

/** "3 laps", or "1 lap". */
export function lapsText(laps) {
  return laps === 1 ? "1 lap" : `${laps} laps`;
}

/**
 * Your own best times on one track, as text: { race, lap, any }.
 * "any" is false when there is no time at all yet. The times are the
 * practice times kept in this browser (records.js).
 */
export function practiceBests(storage, track) {
  const best = bestTimesFor(storage, track.name);
  return {
    race: best.raceSteps === null ? NO_TIME : bestTimeText(best.raceSteps),
    lap: best.lapSteps === null ? NO_TIME : bestTimeText(best.lapSteps),
    any: best.raceSteps !== null || best.lapSteps !== null,
  };
}

/**
 * One card for each track in the list, in the order of the list.
 *   tracks   the list from shared/tracks/index.js: short name -> track
 *   storage  this browser's storage, or null (see storage.js)
 *   kind     "single" or "online": which page the cards lead to
 * Gives a list of { shortName, name, laps, address, best, track }.
 */
export function trackCards(tracks, storage, kind) {
  return Object.entries(tracks).map(([shortName, track]) => ({
    shortName,
    name: track.name,
    laps: lapsText(track.laps),
    address: trackAddress(kind, shortName),
    best: practiceBests(storage, track),
    track, // the track itself, for the small map on the card
  }));
}
