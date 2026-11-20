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
// A racer that drove over a ramp (ramps.js) is in the air for a moment.
// Step 2 is different then too: the keys are ignored and the kart flies on
// exactly as it took off, whatever ground is under it. Steps 3 and 4 go on
// as usual, so walls still stop a flying kart and its laps are counted.
// After landing it has extra speed for a little while: its top speed is
// higher, on road and on grass. Whether a racer takes off is decided at the
// very end of a step, from where its kart has just moved to.
//
// The browser uses this file for practice, the server for online races.
// Karts bumping into each other is not here: that needs all the karts of a
// room at once (bumps.js). Nor are the people who walk across the track
// (walkers.js), for the same reason.

import { createKart, stepKart, slideKart, flyKart } from "./physics.js";
import { surfaceAt, bounceOffWalls } from "./track.js";
import { progressAtStart, updateProgress } from "./laps.js";
import { gridSpot } from "./grid.js";
import { JUMP_STEPS, BOOST_STEPS, BOOST_SHARE, takesOff, launchKart } from "./ramps.js";

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
 *   airSteps         how many more steps it is in the air after a ramp
 *                    (ramps.js). 0 when it is on the ground
 *   boostSteps       how many more steps it has extra speed after a ramp.
 *                    0 when it has none
 */
export function createRacer(track, place = 0) {
  const spot = gridSpot(track, place);
  return {
    kart: createKart(spot.x, spot.y, spot.angle),
    progress: progressAtStart(track),
    spinSteps: 0,
    spinShieldSteps: 0,
    airSteps: 0,
    boostSteps: 0,
  };
}

/**
 * Moves a racer forward by one step and gives back the new racer.
 * Once the racer has finished, the keys are ignored and the kart rolls to a stop.
 * While the racer is spinning, the keys are ignored and the kart slides.
 * While the racer is in the air, the keys are ignored and the kart flies on.
 *
 * All four counters of the racer run down by one each step, whatever the
 * racer is doing: a racer that spins out keeps using up its extra speed.
 */
export function stepRacer(track, racer, input, character) {
  const inTheAir = racer.airSteps > 0;
  const spinning = racer.spinSteps > 0;

  let kart;
  if (inTheAir) {
    kart = bounceOffWalls(track, flyKart(racer.kart), KART_RADIUS);
  } else if (spinning) {
    kart = bounceOffWalls(track, slideKart(racer.kart), KART_RADIUS);
  } else {
    const keys = racer.progress.finished ? {} : input;
    kart = moveKart(track, racer.kart, keys, character, racer.boostSteps > 0);
  }
  const progress = updateProgress(racer.progress, kart, track);

  let airSteps = oneLess(racer.airSteps);
  let boostSteps = oneLess(racer.boostSteps);

  // The ramps. Only a kart that drove this step, on its wheels, can take
  // off: not one that was flying (it passes over the ramp) and not one that
  // was spinning out. A kart that has finished the race can still jump.
  if (!inTheAir && !spinning && takesOff(track, kart)) {
    kart = launchKart(kart, character);
    airSteps = JUMP_STEPS;
    boostSteps = JUMP_STEPS + BOOST_STEPS; // the extra speed lasts through the jump and BOOST_STEPS more
  }

  return {
    ...racer,
    kart,
    progress,
    spinSteps: oneLess(racer.spinSteps),
    spinShieldSteps: oneLess(racer.spinShieldSteps),
    airSteps,
    boostSteps,
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

/**
 * Steps 1 to 3 of the list at the top: the ground, the driving rules and the walls.
 * "boosted" says the kart has extra speed from a ramp: the ground under it
 * is then handed to the driving rules with a boost on it, which raises the
 * top speed there (see topSpeedOf in physics.js). Left out, there is none.
 */
function moveKart(track, kart, keys, character, boosted = false) {
  const ground = surfaceAt(track, kart.x, kart.y);
  const surface = boosted ? { ...ground, boost: BOOST_SHARE } : ground;
  const moved = stepKart(kart, keys, character, surface);
  return bounceOffWalls(track, moved, KART_RADIUS);
}

/**
 * A counter of steps one step later: one less, and never below zero.
 * Anything that is not a number above zero counts as zero. That includes a
 * missing counter, so a racer made by hand without one is simply not
 * spinning, not in the air and has no extra speed.
 */
function oneLess(steps) {
  return steps > 0 ? steps - 1 : 0;
}
