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
//
// WHEN A KART TAKES OFF
// All of these have to be true, just after the kart has moved (takesOff):
//   - the middle of the kart is on a ramp
//   - it moves at TAKE_OFF_SPEED or faster
//   - the direction it MOVES in is close to the direction the ramp points.
//     What counts is where the kart is going, not where its nose points
// and race.js adds: it is on the ground and it is not spinning out.
//
// WHAT TAKING OFF DOES
// launchKart() gives the kart its extra speed at once, in the direction it
// was already going. race.js then sets the two counters. While airSteps is
// above zero the kart flies (flyKart in physics.js): no steering, no
// braking, no slowing down. After landing, for as long as boostSteps is
// above zero, its top speed is BOOST_SHARE times the usual one.
//
// A ramp that a kart passes over while it is in the air does nothing. Nor
// does one it rolls over too slowly, sideways or against its direction.
// Nothing here is left to chance.

import { speedOf, topSpeedOf } from "./physics.js";

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

/**
 * Does a kart on the ground take off here? (The three rules about the ramp
 * from the top of this file. Whether the kart is on the ground at all, and
 * whether it is spinning, is for race.js to say.)
 */
export function takesOff(track, kart) {
  const ramp = rampAt(track, kart.x, kart.y);
  if (ramp === null) {
    return false;
  }
  const speed = speedOf(kart);
  if (!(speed > 0) || speed < TAKE_OFF_SPEED) {
    return false; // standing still or too slow: it just rolls across
  }
  // The direction the kart is going, which can differ from where it points.
  const going = Math.atan2(kart.vy, kart.vx);
  return Math.abs(turnBetween(ramp.angle, going)) <= TAKE_OFF_WITHIN;
}

/**
 * The kart at the moment it leaves a ramp: it goes on in the direction it
 * was already going, at its driver's usual top speed on the road times
 * BOOST_SHARE. A kart that was already faster than that keeps its speed:
 * a ramp never slows a kart down. The kart given is not changed.
 */
export function launchKart(kart, character) {
  const speed = speedOf(kart);
  const launchSpeed = topSpeedOf(character) * BOOST_SHARE;
  if (!(speed > 0) || speed >= launchSpeed) {
    return kart;
  }
  const grown = launchSpeed / speed; // how many times faster it gets
  return { ...kart, vx: kart.vx * grown, vy: kart.vy * grown };
}

/** How much to turn from one direction to another, from -pi to pi (half a turn each way). */
function turnBetween(from, to) {
  return Math.atan2(Math.sin(to - from), Math.cos(to - from));
}
