// One racer in a race: the kart and its lap progress together.
//
// stepRacer() is the one function that moves a racer forward by one step of
// game time. It puts the other rule files together, in this order:
//   1. look at the ground under the kart        (track.js)
//   2. move the kart                            (physics.js)
//   3. bounce it off any wall it ran into       (track.js)
//   4. update its checkpoints, laps and time    (laps.js)
//
// The browser uses it for practice. The server will use it for online races.

import { createKart, stepKart } from "./physics.js";
import { surfaceAt, bounceOffWalls } from "./track.js";
import { progressAtStart, updateProgress } from "./laps.js";
import { gridSpot } from "./grid.js";

/** For walls, a kart is treated as a circle this many units across, from the middle to the edge. */
export const KART_RADIUS = 10;

/**
 * A racer waiting on the starting grid of a track, standing still.
 *
 *   place   which place on the grid (see grid.js). Left out, it is place 0,
 *           pole: that is where the kart of a practice race starts.
 *
 * On a track whose start is behind the finish line, the racer's progress
 * says so (see laps.js), so that the first crossing of the line starts lap 1.
 */
export function createRacer(track, place = 0) {
  const spot = gridSpot(track, place);
  return {
    kart: createKart(spot.x, spot.y, spot.angle),
    progress: progressAtStart(track),
  };
}

/**
 * Moves a racer forward by one step and gives back the new racer.
 * Once the racer has finished, the keys are ignored and the kart rolls to a stop.
 */
export function stepRacer(track, racer, input, character) {
  const keys = racer.progress.finished ? {} : input;
  const kart = moveKart(track, racer.kart, keys, character);
  const progress = updateProgress(racer.progress, kart, track);
  return { ...racer, kart, progress };
}

/**
 * Lets the kart of a racer roll on by itself for one step, with no key
 * held, and gives back the new racer. Its laps and its clock are NOT
 * touched.
 *
 * The room uses this while it is open, for a kart whose driver has not
 * started yet and that was pushed by another kart: it rolls to a stop, and
 * its clock still starts at its driver's first key press.
 */
export function rollRacer(track, racer, character) {
  return { ...racer, kart: moveKart(track, racer.kart, {}, character) };
}

/** Steps 1 to 3 of the list at the top: the ground, the driving rules and the walls. */
function moveKart(track, kart, keys, character) {
  const surface = surfaceAt(track, kart.x, kart.y);
  const moved = stepKart(kart, keys, character, surface);
  return bounceOffWalls(track, moved, KART_RADIUS);
}
