// Ramps: squares of road that throw a kart into the air.
//
// A track can list ramps (track.js checks them). A kart that drives over a
// ramp the right way, fast enough, takes off: it flies for a moment, cannot
// steer or brake while it is in the air, and comes down with extra speed
// that lasts a little while. A kart that drives over it slowly, or the
// wrong way, just rolls across.
//
// The browser and the server both use this file.
//
// A racer (race.js) carries two counters for this:
//   airSteps    how many more steps it is in the air. 0 on the ground
//   boostSteps  how many more steps it has extra speed. 0 when it has none

// ---------------------------------------------------------------------------
// NUMBERS TO TUNE BY PLAYTESTING
// ---------------------------------------------------------------------------

/** How long a jump lasts, in steps (60 steps are one second). */
export const JUMP_STEPS = 42;
/** How high a kart is at the top of its jump, in units. For the picture only. */
export const JUMP_HEIGHT = 15;
/** How long the extra speed lasts after landing, in steps. */
export const BOOST_STEPS = 60;
/** While it has extra speed, a kart's top speed is this many times its usual one. */
export const BOOST_SHARE = 1.35;
/** A kart slower than this (units per second) rolls over a ramp without taking off. */
export const TAKE_OFF_SPEED = 120;
/** A kart takes off only if it moves within this angle of the way the ramp points (radians: about 60 degrees). */
export const TAKE_OFF_WITHIN = 1.05;

// ---------------------------------------------------------------------------

/**
 * How high above the ground a kart is, in units, when it has "airSteps"
 * more steps to fly: 0 at take-off, highest in the middle, 0 again on
 * landing. Only the picture uses this: the rules know "in the air or not".
 */
export function jumpHeight(airSteps) {
  if (!(airSteps > 0)) {
    return 0;
  }
  const done = 1 - Math.min(airSteps, JUMP_STEPS) / JUMP_STEPS; // from 0 (just took off) to 1 (landing)
  return 4 * JUMP_HEIGHT * done * (1 - done);
}

/** The ramp under a spot of the track, or null if there is none there. */
export function rampAt(track, x, y) {
  for (const ramp of track.ramps ?? []) {
    if (x >= ramp.left && x < ramp.right && y >= ramp.top && y < ramp.bottom) {
      return ramp;
    }
  }
  return null;
}
