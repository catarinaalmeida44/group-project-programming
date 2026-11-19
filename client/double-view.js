// What the two-player page tells each of its two drivers.
//
// Two people race on one computer, each on one half of the screen
// (double.js). The rules of that race are in shared/two-player-race.js. This
// file only turns a race into the words and the karts each half shows. It
// is plain text and arithmetic, so it is tested without a browser
// (tests/double-view.test.js).

import { PLAYERS } from "../shared/two-player-race.js";
import { characterById } from "../shared/cast.js";
import { finishedWords } from "./podium.js";
import { formatTime } from "./format.js";

/**
 * The two drivers, in the order of the halves of the screen. The driver on
 * the left of the screen uses the keys on the left of the keyboard.
 *   label  what they are called on the page
 *   short  the tag above their kart in the other driver's half
 *   keys   their driving keys, as they are printed on the keyboard: gas,
 *          left, brake, right
 *   words  the same keys in a sentence
 */
export const DRIVERS = Object.freeze([
  Object.freeze({ label: "Player 1", short: "P1", keys: Object.freeze(["W", "A", "S", "D"]), words: "W, A, S and D" }),
  Object.freeze({ label: "Player 2", short: "P2", keys: Object.freeze(["↑", "←", "↓", "→"]), words: "the arrow keys" }),
]);

/** What both halves say before the first key press. */
export const START_WORDS = "Press a driving key to start";

/** What the buttons on the podium add: nothing of a two-player race is kept. */
export const NOT_SAVED_WORDS = "Two-player races are not saved: no stats, no leaderboard.";

/** The name on a driver's plate: their character's name, or "Player 1" for a driver without one. */
export function plateName(player, characterId) {
  return characterById(characterId)?.name ?? DRIVERS[player].label;
}

/**
 * The words in the middle of one half of the screen: { text, big }.
 *   started    has the countdown started? (at the first key press of either driver)
 *   label      the countdown: "3", "2", "1", "GO!" or ""
 *   finished   has this driver finished?
 *   place      the place this driver finished in (1, 2, ...), when finished
 *   steps      their race time in steps, when finished
 *   warning    "Wrong way" or a missed checkpoint, or null
 *   over       is the race over for everyone? The podium is up then, and the halves say nothing
 * "big" is true for the countdown, shown as one big number.
 */
export function halfMessage({ started, label = "", finished = false, place = 1, steps = 0, warning = null, over = false }) {
  if (over) {
    return { text: "", big: false };
  }
  if (finished) {
    return { text: finishedWords(place, steps, formatTime), big: false };
  }
  if (!started) {
    return { text: START_WORDS, big: false };
  }
  if (typeof warning === "string" && warning !== "") {
    return { text: warning, big: false };
  }
  return { text: label, big: label !== "" };
}

/**
 * The names shown above karts in one half: only the other driver's kart
 * gets a tag ("P1" or "P2"), so each driver can find their friend among the
 * computer karts. A Map from a kart's number to its tag.
 */
export function tagsFor(player) {
  const tags = new Map();
  for (let other = 0; other < PLAYERS; other++) {
    if (other !== player) {
      tags.set(other, DRIVERS[other].short);
    }
  }
  return tags;
}

/**
 * How one half is laid out when the two pictures stand side by side: the
 * share of the picture's width that is shown. The race picture is wider than
 * a half of the screen is tall, so each half shows the middle of it, where
 * the kart and the road are, and cuts the same strip off the left and the
 * right. 1 would be the whole picture.
 */
export const HALF_SHOWS = 0.72;
