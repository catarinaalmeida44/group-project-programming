// One racer in a race: the kart, its lap progress and whether it is
// spinning out, together.
//
// stepRacer() is the one function that moves a racer forward by one step of
// game time. It puts the other rule files together, in this order:
//   1. look at the ground under the kart        (track.js)
//   2. move the kart                            (physics.js)
//   3. bounce it off any wall it ran into       (track.js)
//   4. update its checkpoints, laps and time    (laps.js)
//
// A racer that hit a banana (hazards.js) is spinning out. For as long as the
// spin lasts, step 2 is different: the keys are ignored and the kart slides
// the way it was going, slowing down quickly. Steps 3 and 4 go on as usual,
// so a spinning kart still bounces off walls and its clock keeps running.
//
// The browser uses this file for practice, the server for online races.
// Karts bumping into each other is not here: that needs all the karts of a
// room at once (bumps.js).

import { createKart, stepKart, slideKart } from "./physics.js";
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
 * A racer is:
 *   kart             where the kart is and how it moves (physics.js)
 *   progress         its checkpoints, laps and clock (laps.js). On a track
 *                    whose start is behind the finish line it says so, so
 *                    that the first crossing of the line starts lap 1
 *   spinSteps        how many more steps it will spin. 0 when it is not spinning
 *   spinShieldSteps  how many more steps it cannot be spun (again): the
 *                    rest of its spin, and a short moment after
 */
export function createRacer(track, place = 0) {
  const spot = gridSpot(track, place);
  return {
    kart: createKart(spot.x, spot.y, spot.angle),
    progress: progressAtStart(track),
    spinSteps: 0,
    spinShieldSteps: 0,
  };
}

/**
 * Moves a racer forward by one step and gives back the new racer.
 * Once the racer has finished, the keys are ignored and the kart rolls to a stop.
 * While the racer is spinning, the keys are ignored and the kart slides.
 */
export function stepRacer(track, racer, input, character) {
  const kart =
    racer.spinSteps > 0
      ? bounceOffWalls(track, slideKart(racer.kart), KART_RADIUS)
      : moveKart(track, racer.kart, racer.progress.finished ? {} : input, character);
  const progress = updateProgress(racer.progress, kart, track);
  return {
    ...racer,
    kart,
    progress,
    spinSteps: oneLess(racer.spinSteps),
    spinShieldSteps: oneLess(racer.spinShieldSteps),
  };
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

/**
 * A counter of steps one step later: one less, and never below zero.
 * Anything that is not a number above zero counts as zero. That includes a
 * missing counter, so a racer made by hand without one is simply not spinning.
 */
function oneLess(steps) {
  return steps > 0 ? steps - 1 : 0;
}
