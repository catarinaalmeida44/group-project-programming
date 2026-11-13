// Who is in front in an online race, and the list of results at its end.
//
// The server sends, for every kart, whether it has finished, its race time
// in steps, and its count of checkpoints ("passed", shared/laps.js). This
// file only puts the karts in order and turns that into words. It decides
// nothing: the result that is saved to the leaderboard is the server's own
// (server/room.js and server/online.js).
//
// It is plain arithmetic and text, so it can be tested without a browser.

import { STEP_SECONDS } from "../shared/physics.js";
import { formatTime } from "./format.js";
import { placeText } from "./net.js";

/** How far a spot is from the nearest point of a checkpoint, in units. 0 inside it. */
export function distanceToCheckpoint(track, number, x, y) {
  const { left, top, right, bottom } = track.checkpoints[number];
  const nearestX = Math.min(Math.max(x, left), right);
  const nearestY = Math.min(Math.max(y, top), bottom);
  return Math.hypot(x - nearestX, y - nearestY);
}

/**
 * The karts in the order of the race, the leader first:
 *   1. karts that have finished, the shortest race time first
 *   2. then the karts still driving: the one that has passed more
 *      checkpoints is in front, and of two that have passed the same
 *      number, the one nearer to its next checkpoint
 * A kart whose numbers are missing or strange counts as having passed
 * nothing: the page must not break on a strange message.
 */
export function standings(karts, track) {
  const count = track.checkpoints.length;
  const measured = karts.map((kart) => {
    const passed = Number.isInteger(kart.passed) ? kart.passed : -1;
    const next = (((passed + 1) % count) + count) % count;
    return {
      kart,
      finished: kart.finished === true,
      steps: Number.isFinite(kart.steps) ? kart.steps : 0,
      passed,
      toNext: Number.isFinite(kart.x) && Number.isFinite(kart.y) ? distanceToCheckpoint(track, next, kart.x, kart.y) : Infinity,
    };
  });
  measured.sort((a, b) => {
    if (a.finished !== b.finished) {
      return a.finished ? -1 : 1;
    }
    if (a.finished) {
      return a.steps - b.steps || a.kart.id - b.kart.id;
    }
    return b.passed - a.passed || a.toNext - b.toNext || a.kart.id - b.kart.id;
  });
  return measured.map((each) => each.kart);
}

/**
 * This player's place in the race as words, such as "2nd of 4". Gives ""
 * when the player has no kart in the race, or races alone.
 */
export function placeLine(karts, track, myId) {
  const index = standings(karts, track).findIndex((kart) => kart.id === myId);
  return index === -1 || karts.length < 2 ? "" : `${placeText(index + 1)} of ${karts.length}`;
}

/**
 * The lines of the results list, the winner first:
 *   [{ place, who, time, mine }]
 *   place  "1st", "2nd", ... or "-" for a kart that did not finish
 *   who    the user name of a signed-in player, or "Guest" with the
 *          player's number
 *   time   the race time, "still racing", or "did not finish" once the
 *          race is over
 *   mine   true for this player's own line
 * Two karts with the same race time share a place, as on the server.
 *
 *   names  a Map from player number to user name (the "names" message)
 *   over   has the race ended for everyone?
 */
export function resultLines(karts, track, names, myId, over) {
  const ordered = standings(karts, track);
  const finishers = ordered.filter((kart) => kart.finished === true);
  return ordered.map((kart) => {
    const finished = kart.finished === true;
    const name = names instanceof Map ? names.get(kart.id) : undefined;
    return {
      place: finished ? placeText(1 + finishers.filter((other) => other.steps < kart.steps).length) : "-",
      who: typeof name === "string" ? name : `Guest ${kart.id}`,
      time: finished ? formatTime(kart.steps * STEP_SECONDS) : over ? "did not finish" : "still racing",
      mine: kart.id === myId,
    };
  });
}
