// A kart jolting on stairs, in the race view. Only the picture: on stairs a
// kart drives exactly as on any road (the rules in shared/ know nothing
// about stairs).
//
// A track's look can list stairs (see "stairs" in nova-lap-look.js). A kart
// moving over them jolts up and down once for every step it goes over. The
// jolt follows where the kart is, not the clock: a kart standing still does
// not jolt, and the same spot always looks the same, so the picture never
// flickers. A kart in the air (after a ramp) is above the stairs: no jolt.

import { speedOf } from "../shared/physics.js";

/** How high a kart jolts on the stairs, at most, in units. */
export const STEP_BUMP = 1.6;
/** How far a kart goes from one step to the next, in units: it jolts once per step. */
export const STEP_LENGTH = 7;
/** From this speed on (units per second), a kart jolts at full height. Slower, it jolts less. */
export const FULL_BUMP_SPEED = 150;

/** Is this spot (in units) on stairs? "stairs" is the look's list of [left, top, right, bottom] in squares. */
export function onStairs(stairs, tileSize, x, y) {
  const column = x / tileSize;
  const row = y / tileSize;
  return (stairs ?? []).some(([left, top, right, bottom]) => column >= left && column < right && row >= top && row < bottom);
}

/**
 * How high above the road a kart is drawn at this moment because of the
 * stairs, in units: 0 off the stairs, standing still or in the air.
 * "kart" has x, y, vx, vy and "air" (how many more steps it flies).
 */
export function stairsBump(stairs, tileSize, kart) {
  if (kart.air > 0 || !onStairs(stairs, tileSize, kart.x, kart.y)) {
    return 0;
  }
  const moving = Math.min(speedOf({ vx: kart.vx ?? 0, vy: kart.vy ?? 0 }) / FULL_BUMP_SPEED, 1);
  const travelled = Math.abs(kart.x) + Math.abs(kart.y); // grows as the kart moves, whichever way
  return STEP_BUMP * moving * Math.abs(Math.sin((travelled / STEP_LENGTH) * Math.PI));
}
