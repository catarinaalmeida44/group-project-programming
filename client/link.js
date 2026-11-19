// The live connection of the online page: what to do when it cannot be
// made or is lost, and what to tell the player meanwhile.
//
// Until 19 November 2026 the page tried to connect once. If that failed,
// or the connection was lost later, a small line under the picture said
// "reload the page", and the player had to do it by hand, perhaps several
// times while the server was waking up (see waking.js).
//
// Now the page tries again by itself, and a card in the middle of the
// picture says what is happening: connecting, the server waking up, the
// connection lost, the room full. This file decides when to try again and
// what the card says. It is plain sums and words, so it is tested without a
// browser. online.js opens the connection and puts the card on the page.

import { SLOW_AFTER_MS, WAKE_SECONDS } from "./waking.js";
import { QUIET_AFTER_MS } from "./net.js";

/**
 * Connecting normally takes a fraction of a second. The card only comes up
 * when it takes longer than this, so that it does not flash on and off
 * every time the page opens.
 */
export const CARD_AFTER_MS = 700;

/** Waking up should be over after WAKE_SECONDS. A quarter of a minute later the card says that it is taking longer than usual. */
export const LONGER_THAN_USUAL_MS = (WAKE_SECONDS + 15) * 1000;

/** The page keeps trying to connect for this long. Then it stops and offers a button. */
export const GIVE_UP_AFTER_MS = 150_000;

/**
 * In the room the server sends news 20 times a second. If none has come
 * for this long, the connection is dead, even if the browser has not
 * noticed yet (that can take it 20 seconds). The page then drops it and
 * joins the room again.
 */
export const LOST_AFTER_QUIET_MS = 8000;

/** The code a connection closes with when the server sent the browser away for breaking the rules (server/online.js). */
export const BROKE_THE_RULES = 1008;

// How long to wait before each new try: soon at first, then every five seconds.
const RETRY_WAITS_MS = [500, 1000, 2000, 3000, 5000];

/** How long to wait before trying to connect again, after this many tries in a row have failed. */
export function retryWaitMs(failedTries) {
  const tries = Number.isInteger(failedTries) && failedTries > 0 ? failedTries : 1;
  return RETRY_WAITS_MS[Math.min(tries, RETRY_WAITS_MS.length) - 1];
}

/**
 * What the page does when its connection has closed.
 *   code      the number the connection closed with
 *   toldFull  the server said "the room is full" before it closed
 *   leaving   the player is leaving the page, so the page closed it itself
 * Gives:
 *   "stop"      nothing: the player is leaving
 *   "full"      show "the room is full", with a button to try again
 *   "sentAway"  the server sent this browser away: show that, with a button.
 *               Trying again by itself could go round in circles
 *   "again"     try again by itself
 */
export function afterClose({ code, toldFull, leaving }) {
  if (leaving === true) {
    return "stop";
  }
  if (toldFull === true) {
    return "full";
  }
  if (code === BROKE_THE_RULES) {
    return "sentAway";
  }
  return "again";
}

/**
 * The card in the middle of the picture.
 *   state      "connecting"  the page is trying to connect, for the first
 *                            time or again after a loss
 *              "joined"      in the room
 *              "full"        the room is full
 *              "sentAway"    the server sent this browser away
 *              "gaveUp"      the page has stopped trying
 *   waitedMs   connecting: how long the page has been trying
 *   wasInRoom  connecting: true when the player was in the room before, so
 *              this is a connection that was lost
 *   quietMs    joined: how long ago the server last sent anything
 *   online     false when the browser says the computer has no internet
 *
 * Gives null when there is nothing to say, or { title, text, waited, share, button }:
 *   title, text  what the card says
 *   waited       "Waiting for 14 s", or "" for nothing
 *   share        how far the little kart on the card has driven, from 0 to
 *                1, or null for no road. It reaches the end after
 *                WAKE_SECONDS, the longest that waking up usually takes
 *   button       the words on the button, or null for no button
 */
export function linkCard({ state, waitedMs = 0, wasInRoom = false, quietMs = 0, online = true }) {
  const card = (title, text, more = {}) => ({ title, text, waited: "", share: null, button: null, ...more });

  if (state === "joined") {
    return quietMs > QUIET_AFTER_MS
      ? card("The server has gone quiet", "Waiting for it to answer. If it stays quiet, the page joins the room again by itself.")
      : null;
  }
  if (state === "full") {
    return card("The room is full", "Every place on the grid of this track is taken. Try again in a few minutes, or race on another track.", {
      button: "Try again",
    });
  }
  if (state === "sentAway") {
    return card("The server closed the connection", "It did not understand what this page sent. Join the room again to go on.", {
      button: "Join again",
    });
  }
  if (state === "gaveUp") {
    return card("The server cannot be reached", "It has not answered for more than two minutes. Check your internet connection, then try again.", {
      button: "Try again",
    });
  }

  // Connecting. A strange time counts as "only just started".
  const waited = Number.isFinite(waitedMs) && waitedMs > 0 ? waitedMs : 0;
  if (online === false) {
    return card("No internet connection", "This computer is not connected to the internet. The page joins the room by itself as soon as it is back.");
  }
  if (waited < CARD_AFTER_MS) {
    return null;
  }
  const seconds = Math.floor(waited / 1000);
  const slow = { waited: `Waiting for ${seconds} s`, share: Math.min(seconds / WAKE_SECONDS, 1) };
  if (wasInRoom) {
    return waited < SLOW_AFTER_MS
      ? card("Connection lost", "Joining the room again…")
      : card(
          "Connection lost",
          "Still trying to reach the server. You do not need to do anything: the page joins the room again by itself. If a race is on, you watch it and drive in the next one.",
          slow,
        );
  }
  if (waited < SLOW_AFTER_MS) {
    return card("Connecting…", "");
  }
  if (waited < LONGER_THAN_USUAL_MS) {
    return card(
      "The server is waking up",
      "That can take up to a minute. It falls asleep when nobody has played for a while. Stay on this page: you join the room by itself.",
      slow,
    );
  }
  return card("Still waking up", "This is taking longer than usual. The page keeps trying: stay here, and you join the room by itself.", slow);
}
