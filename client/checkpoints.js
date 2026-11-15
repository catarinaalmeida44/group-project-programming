// Showing the player which checkpoint comes next, and telling them when
// they have missed one.
//
// The rules count a lap only when every checkpoint was driven through, in
// order (shared/laps.js). On a track with open squares it is easy to leave
// one out without noticing: on the campus loop, driving straight on past
// the CTT Student Hall instead of round its end. The lap then does not
// count, and before 13 November 2026 nothing on the screen said why.
//
// Nothing here changes a rule. This file only works out what to show:
//   - where the next checkpoint is, so that draw.js can light it up, and
//   - whether the kart has driven into a checkpoint it should not have
//     reached yet, which means it left one out.
//
// It is plain arithmetic, so it can be tested without a browser.

import { isInsideCheckpoint } from "../shared/track.js";

/** The number of the checkpoint a kart has to reach next, from its count of checkpoints ("passed" in shared/laps.js). */
export function nextCheckpointNumber(passed, track) {
  return wrap(passed + 1, track.checkpoints.length);
}

/**
 * A checkpoint as a line across the road, cut into one piece for each
 * square of the map it crosses: [{ from: { x, y }, to: { x, y }, column, row }].
 * Squares of wall are left out. draw.js stands a low curtain of light on
 * each piece. (One piece per square, so that a building nearer to the
 * camera hides the right part of it.)
 *
 * Gives an empty list for a number that is not a checkpoint of this track.
 */
export function checkpointPieces(track, number) {
  const checkpoint = Number.isInteger(number) ? track.checkpoints[number] : undefined;
  if (checkpoint === undefined) {
    return [];
  }
  const size = track.tileSize;
  const { left, top, right, bottom } = checkpoint;
  const isOpen = (column, row) => track.map[row]?.[column] !== undefined && track.map[row][column] !== "#";
  const pieces = [];
  if (right - left >= bottom - top) {
    // Wider than tall: the line runs from left to right, through the middle.
    const y = (top + bottom) / 2;
    const row = Math.floor(y / size);
    for (let column = Math.floor(left / size); column * size < right; column++) {
      if (isOpen(column, row)) {
        pieces.push({ from: { x: Math.max(left, column * size), y }, to: { x: Math.min(right, (column + 1) * size), y }, column, row });
      }
    }
  } else {
    // Taller than wide: the line runs from top to bottom.
    const x = (left + right) / 2;
    const column = Math.floor(x / size);
    for (let row = Math.floor(top / size); row * size < bottom; row++) {
      if (isOpen(column, row)) {
        pieces.push({ from: { x, y: Math.max(top, row * size) }, to: { x, y: Math.min(bottom, (row + 1) * size) }, column, row });
      }
    }
  }
  return pieces;
}

/**
 * Watches one kart for a missed checkpoint. Gives a function to call for
 * every picture with the kart and its count of checkpoints. It answers null
 * while all is well, or the number of the checkpoint to go back to.
 *
 * How it knows: a kart is only ever expected inside three checkpoints: the
 * one it passed last, the next one, and the one before the last (when it
 * rolls back a little). Inside any other checkpoint, it must have left one
 * out on the way. The answer stays until the count changes, which is when
 * the kart has gone through the checkpoint it missed, or a new race began.
 *
 * A track with three checkpoints or fewer has no "other" checkpoint, so
 * nothing is ever reported there.
 */
export function watchForMissedCheckpoint(track) {
  const count = track.checkpoints.length;
  let countThen = null;
  let missed = false;
  return (kart, passed) => {
    if (!Number.isInteger(passed) || !Number.isFinite(kart?.x) || !Number.isFinite(kart?.y)) {
      return null;
    }
    if (passed !== countThen) {
      countThen = passed;
      missed = false;
    }
    const expected = [wrap(passed - 1, count), wrap(passed, count), wrap(passed + 1, count)];
    for (let number = 0; number < count && !missed; number++) {
      missed = !expected.includes(number) && isInsideCheckpoint(track, number, kart.x, kart.y);
    }
    return missed ? wrap(passed + 1, count) : null;
  };
}

/** What the page says when a checkpoint was missed. The name comes from the track file. */
export function missedCheckpointMessage(track, number) {
  const name = track.checkpoints[number]?.name;
  const where = typeof name === "string" && name !== "" ? `: ${name}` : "";
  return `You missed a checkpoint${where}. This lap does not count until you drive through the yellow light.`;
}

/** Wraps a number round into the range 0 .. count-1, so that -1 becomes the last one. */
function wrap(number, count) {
  return ((number % count) + count) % count;
}
