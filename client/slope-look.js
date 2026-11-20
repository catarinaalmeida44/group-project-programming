// How a kart on a slope looks in the race view (shared/slopes.js has the
// rules; this is only the picture).
//
// The ground is drawn flat, so a slope cannot be seen in it. Two small hints
// show it instead:
//   squash  the kart is drawn a little shorter when it points downhill, as
//           if its nose dipped, and a little taller when it points uphill.
//           1 means unchanged
//   bump    on the stairs (the steepest slopes) a moving kart jolts up and
//           down as it goes over the steps, in units above the road. It
//           follows where the kart is, not the clock, so a kart standing
//           still does not jolt, and the same spot always looks the same
//
// A kart in the air (after a ramp) is above the slope: no hint at all.

import { slopeAt, downhillShare } from "../shared/slopes.js";
import { speedOf } from "../shared/physics.js";

/** At full steepness, pointing straight down, the kart is drawn this share shorter (and pointing up, this share taller). */
export const SLOPE_SQUASH = 0.08;
/** How high a kart jolts on the stairs, at most, in units. */
export const STEP_BUMP = 1.6;
/** A slope at least this steep is stairs: karts jolt on it. */
export const STAIRS_FROM = 0.9;
/** How far a kart goes from one step to the next, in units (it jolts once per step). */
const STEP_LENGTH = 7;
/** From this speed on (units per second), a kart jolts at full height. */
const FULL_BUMP_SPEED = 150;

/** { squash, bump } for a kart at this moment ("air" is how many more steps it flies, as in the race view). */
export function slopeLook(track, kart) {
  if (kart.air > 0) {
    return { squash: 1, bump: 0 };
  }
  const slope = slopeAt(track, kart.x, kart.y);
  if (slope === null) {
    return { squash: 1, bump: 0 };
  }
  const squash = 1 - SLOPE_SQUASH * downhillShare(slope, kart.angle);
  const moving = Math.min(speedOf({ vx: kart.vx ?? 0, vy: kart.vy ?? 0 }) / FULL_BUMP_SPEED, 1);
  const travelled = Math.abs(kart.x) + Math.abs(kart.y); // grows as the kart moves, whichever way
  const bump = slope.steepness >= STAIRS_FROM ? STEP_BUMP * moving * Math.abs(Math.sin((travelled / STEP_LENGTH) * Math.PI)) : 0;
  return { squash, bump };
}
