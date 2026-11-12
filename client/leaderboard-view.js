// What the Leaderboard panel shows, worked out from the server's answer.
//
// For one track the panel shows three things:
//   - the ten fastest whole races of all players   (from the server)
//   - the ten fastest single laps of all players   (from the server)
//   - your own practice bests                      (kept in this browser)
//
// This file only decides WHAT to show: which rows, which one is yours, and
// which sentence when there is nothing to show. It is plain data and text,
// so it can be tested without a browser. leaderboard.js asks the server, and
// leaderboard-panel.js puts the result on the page.
//
// Nothing the server sends is trusted to have the right shape. A row that is
// broken is left out, and an answer that is broken becomes a calm sentence.

import { bestTimeText } from "./records.js";
import { practiceBests } from "./track-list.js";
import { saidYes, reasonText } from "./answers.js";
import { usernameKey } from "../shared/account-rules.js";

/** A board never shows more rows than this. */
export const BOARD_SIZE = 10;

export const LOADING_TEXT = "Loading the shared board…";
// A board with no rows. Only signed-in players' online races are saved, so
// the sentence says what to do, and a visitor is also told to sign in.
export const EMPTY_TEXT = "No times yet. Finish an online race on this track to be the first.";
export const EMPTY_SIGN_IN_TEXT = "No times yet. Sign in and finish an online race on this track to be the first.";
export const SIGN_IN_TEXT = "Sign in to see where you rank.";
export const NO_RESULT_TEXT = "You have no time on this track yet. Finish an online race here to get one.";

/** A rank or a time we are willing to show: a whole number above zero. */
function isCount(value) {
  return Number.isSafeInteger(value) && value > 0;
}

/** The user name of the signed-in player, or null when nobody is signed in (or we do not know). */
export function signedInName(me) {
  const signedIn = me !== null && typeof me === "object" && me.signedIn === true;
  return signedIn && typeof me.username === "string" && me.username !== "" ? me.username : null;
}

/**
 * The rows of one board, ready to show.
 *   list    "races" or "laps" from the server's answer
 *   myName  the signed-in player's user name, or null
 * Gives at most ten of { rank, username, time, isMe, podium }:
 *   time    the time as text, such as "0:24.30"
 *   isMe    true for the signed-in player's own row
 *   podium  1, 2 or 3 for the first three rows, 0 for the others
 * A row without a sensible rank, name and time is left out.
 */
export function boardRows(list, myName) {
  const rows = [];
  if (!Array.isArray(list)) {
    return rows;
  }
  for (const entry of list) {
    if (rows.length === BOARD_SIZE) {
      break;
    }
    if (entry === null || typeof entry !== "object") {
      continue;
    }
    const { rank, username, steps } = entry;
    if (!isCount(rank) || !isCount(steps) || typeof username !== "string" || username === "") {
      continue;
    }
    rows.push({
      rank,
      username, // shown as plain text by leaderboard-panel.js, whatever is in it
      time: bestTimeText(steps),
      // "Ana" and "ana" are the same player (shared/account-rules.js).
      isMe: myName !== null && usernameKey(username) === usernameKey(myName),
      podium: rows.length < 3 ? rows.length + 1 : 0,
    });
  }
  return rows;
}

/**
 * What a board says about the signed-in player, under its rows.
 *   rows           from boardRows()
 *   me             what the server said about who is signed in, or null
 *   rank, steps    the player's own best on this board, from "mine"
 * Gives one of:
 *   null                       nothing to add (your row is already in the list, or the board is empty)
 *   { kind: "row", row }       your own row, when you are outside the ten shown
 *   { kind: "text", text }     a sentence: sign in, or no result yet
 */
export function myLine(rows, me, rank, steps) {
  const myName = signedInName(me);
  if (myName !== null && isCount(rank) && isCount(steps)) {
    if (rows.some((row) => row.isMe)) {
      return null;
    }
    return { kind: "row", row: { rank, username: myName, time: bestTimeText(steps), isMe: true, podium: 0 } };
  }
  if (rows.length === 0) {
    return null; // the board already says it is empty
  }
  if (myName !== null) {
    return { kind: "text", text: NO_RESULT_TEXT };
  }
  // Only invite to sign in when the server has accounts and nobody is signed in.
  const canSignIn = me !== null && typeof me === "object" && me.available === true;
  return canSignIn ? { kind: "text", text: SIGN_IN_TEXT } : null;
}

/**
 * The shared part of the panel: the two boards of all players.
 *   loading  true while we wait for the server
 *   answer   what accountApi.getLeaderboard() answered
 *   me       what the server said about who is signed in, or null
 * Gives one of:
 *   { kind: "loading", text }
 *   { kind: "notice", text }            the server said no, or could not be reached
 *   { kind: "ready", races, laps }      each board is { rows, empty, mine }
 */
export function sharedBoards({ loading, answer, me }) {
  if (loading) {
    return { kind: "loading", text: LOADING_TEXT };
  }
  if (!saidYes(answer)) {
    return { kind: "notice", text: reasonText(answer) };
  }
  const mine = answer.mine !== null && typeof answer.mine === "object" ? answer.mine : {};
  return {
    kind: "ready",
    races: oneBoard(answer.races, me, mine.raceRank, mine.raceSteps),
    laps: oneBoard(answer.laps, me, mine.lapRank, mine.lapSteps),
  };
}

function oneBoard(list, me, myRank, mySteps) {
  const rows = boardRows(list, signedInName(me));
  const emptyText = signedInName(me) === null ? EMPTY_SIGN_IN_TEXT : EMPTY_TEXT;
  return {
    rows,
    empty: rows.length === 0 ? emptyText : "", // the sentence for a board with no rows
    mine: myLine(rows, me, myRank, mySteps),
  };
}

/**
 * Everything the panel shows.
 *   tracks     the list from shared/tracks/index.js: short name -> track
 *   shortName  the short name of the chosen track; it must be in the list
 *   loading, answer, me   see sharedBoards()
 *   storage    this browser's storage, or null (see storage.js)
 * Gives { tracks, trackName, shared, practice }:
 *   tracks     one { shortName, name, chosen } for each track, for the switcher
 *   shared     from sharedBoards()
 *   practice   your own practice bests: { race, lap, any }
 */
export function leaderboardView({ tracks, shortName, loading, answer, me, storage }) {
  const track = tracks[shortName];
  return {
    tracks: Object.entries(tracks).map(([name, listed]) => ({
      shortName: name,
      name: listed.name,
      chosen: name === shortName,
    })),
    trackName: track.name,
    shared: sharedBoards({ loading, answer, me }),
    practice: practiceBests(storage, track),
  };
}
