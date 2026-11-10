// The driving rules: how a kart moves.
//
// The browser and the server both use this file, so a kart moves in exactly
// the same way in both places.
//
// HOW IT WORKS
// Time moves in small steps, 60 per second. For each step, stepKart() takes
// where the kart is now and which keys are pressed, and gives back where the
// kart is one step later. It never changes the kart it was given: it makes a
// new one. That makes the rules easy to test.
//
// WHAT A KART IS
//   x, y    where it is on the track. x grows to the right, y grows downwards,
//           like pixels on a screen.
//   angle   the direction it points, in radians. 0 points right (east).
//           A bigger angle turns it clockwise on the screen. Half a turn is
//           3.14 radians (the number pi).
//   vx, vy  how fast it is really moving, to the right and downwards.
//           This can differ from the direction it points: that is a slide.
//
// WHAT IS NOT HERE YET
// Walls, drifting and boosts, karts bumping each other, sand and sea.

import { clamp } from "./numbers.js";
import { STAT_LOWEST, STAT_HIGHEST } from "./characters.js";
import { ROAD } from "./surfaces.js";

/** The length of one step of game time, in seconds. */
export const STEP_SECONDS = 1 / 60;

// ---------------------------------------------------------------------------
// NUMBERS TO TUNE BY PLAYTESTING
// Distances are in "units". One unit is one pixel of the track drawing.
// Speeds are in units per second.
// ---------------------------------------------------------------------------

// What a driver's score means in real motion. Each pair is
// [value for the lowest score, value for the highest score].
const TOP_SPEED = [240, 360]; //           units per second
const ACCELERATION = [0.8, 1.8]; //        share of the missing speed gained each second
const TURN_SPEED = [1.8, 3.0]; //          radians per second
const GRIP = [8, 20]; //                   share of a sideways slide removed each second
const SPEED_KEPT_ON_GRASS = [0.6, 0.88]; // a middle score keeps about 74%

// The same for every driver.
const COAST_SLOWDOWN = 120; //      speed lost each second with no pedal pressed
const BRAKE_SLOWDOWN = 600; //      speed lost each second while braking
const REVERSE_TOP_SPEED = 90; //    reversing is slow
const REVERSE_PUSH = 240; //        speed gained each second while reversing
const OVER_LIMIT_SLOWDOWN = 400; // speed lost each second when faster than the ground allows
const FULL_STEERING_FROM = 0.25; // steering is at full strength from 25% of top speed
const STEERING_LOST_AT_TOP_SPEED = 0.2; // turns are 20% slower at top speed
const SLIDE_TOO_SMALL_TO_SEE = 0.5; //     below this, a sideways slide is set to zero

// ---------------------------------------------------------------------------

/** Makes a kart that is standing still. */
export function createKart(x, y, angle = 0) {
  return { x, y, angle, vx: 0, vy: 0 };
}

/** How fast a kart is moving, whatever its direction. */
export function speedOf(kart) {
  return Math.hypot(kart.vx, kart.vy);
}

/** The highest speed this driver can reach on this kind of ground. */
export function topSpeedOf(character, surface = ROAD) {
  const onRoad = fromScore(character.speed, TOP_SPEED);
  if (!surface.offRoad) {
    return onRoad;
  }
  return onRoad * fromScore(character.offRoad, SPEED_KEPT_ON_GRASS);
}

/**
 * Moves a kart forward in time by one step and gives back the new kart.
 *
 *   kart       the kart now
 *   input      which keys are pressed: { gas, brake, left, right }
 *   character  the driver's scores (see characters.js)
 *   surface    the kind of ground under the kart (see surfaces.js)
 */
export function stepKart(kart, input, character, surface = ROAD) {
  // Only an exact "true" counts as a pressed key. Anything else (missing,
  // a word, a number) counts as not pressed, so a strange message from a
  // browser can never produce a strange movement.
  const gas = input?.gas === true;
  const brake = input?.brake === true;
  const left = input?.left === true;
  const right = input?.right === true;
  const steer = (right ? 1 : 0) - (left ? 1 : 0); // -1 left, 0 straight, 1 right

  const topSpeedOnRoad = topSpeedOf(character, ROAD);
  const topSpeedHere = topSpeedOf(character, surface);

  // 1. STEERING: turn the direction the kart points.
  const forwardBefore = kart.vx * Math.cos(kart.angle) + kart.vy * Math.sin(kart.angle);
  const angle =
    kart.angle + steer * turnSpeed(character, forwardBefore, topSpeedOnRoad) * STEP_SECONDS;

  // 2. Split the kart's real movement in two parts, seen from the direction
  //    it now points: how fast it goes forward, and how fast it slides sideways.
  const pointX = Math.cos(angle);
  const pointY = Math.sin(angle);
  let forward = kart.vx * pointX + kart.vy * pointY;
  let sideways = -kart.vx * pointY + kart.vy * pointX;

  // 3. PEDALS: speed up, brake, reverse or coast.
  forward = applyPedals(forward, gas, brake, character, topSpeedHere);

  // 4. GRIP: the tyres remove part of the sideways slide. More grip removes
  //    it faster, so the kart follows the direction it points more closely.
  const slideRemoved = Math.min(1, fromScore(character.grip, GRIP) * STEP_SECONDS);
  sideways -= sideways * slideRemoved;
  if (Math.abs(sideways) < SLIDE_TOO_SMALL_TO_SEE) {
    sideways = 0;
  }

  // 5. Put the two parts back together and move the kart.
  const vx = forward * pointX - sideways * pointY;
  const vy = forward * pointY + sideways * pointX;
  return {
    ...kart,
    x: kart.x + vx * STEP_SECONDS,
    y: kart.y + vy * STEP_SECONDS,
    angle,
    vx,
    vy,
  };
}

/** How fast the kart turns right now, in radians per second. */
function turnSpeed(character, forward, topSpeedOnRoad) {
  const shareOfTopSpeed = clamp(Math.abs(forward) / topSpeedOnRoad, 0, 1);
  // No steering when standing still, growing to full strength at low speed.
  const steeringAvailable = clamp(shareOfTopSpeed / FULL_STEERING_FROM, 0, 1);
  // Slightly wider turns at high speed.
  const lostToSpeed = STEERING_LOST_AT_TOP_SPEED * shareOfTopSpeed;
  // When reversing, the steering is mirrored, as in a real car.
  const direction = forward < 0 ? -1 : 1;
  return (
    direction * fromScore(character.handling, TURN_SPEED) * steeringAvailable * (1 - lostToSpeed)
  );
}

/** Gives the new forward speed after one step of gas, brake or coasting. */
function applyPedals(forward, gas, brake, character, topSpeedHere) {
  if (brake) {
    // Brake wins over gas when both are pressed.
    if (forward > 0) {
      forward = Math.max(0, forward - BRAKE_SLOWDOWN * STEP_SECONDS);
    } else {
      // Already stopped: holding the brake reverses, slowly.
      forward = Math.max(-REVERSE_TOP_SPEED, forward - REVERSE_PUSH * STEP_SECONDS);
    }
  } else if (gas) {
    if (forward < 0) {
      // Rolling backwards: stop first.
      forward = Math.min(0, forward + BRAKE_SLOWDOWN * STEP_SECONDS);
    } else {
      // Gain a share of the speed that is still missing. The gain is big
      // when the kart is slow and small when it is near its top speed.
      const missing = topSpeedHere - forward;
      forward += fromScore(character.acceleration, ACCELERATION) * missing * STEP_SECONDS;
    }
  } else {
    // No pedal: slow down gradually until stopped.
    forward = moveTowardZero(forward, COAST_SLOWDOWN * STEP_SECONDS);
  }

  // Faster than this ground allows (for example, just left the road for the
  // grass at full speed): slow down quickly to the limit.
  if (forward > topSpeedHere) {
    forward = Math.max(topSpeedHere, forward - OVER_LIMIT_SLOWDOWN * STEP_SECONDS);
  }
  return forward;
}

/** Brings a number closer to zero by "amount", without going past zero. */
function moveTowardZero(value, amount) {
  if (value > 0) {
    return Math.max(0, value - amount);
  }
  return Math.min(0, value + amount);
}

/**
 * Turns a driver's score into a real value.
 * The lowest score gives range[0], the highest score gives range[1], and the
 * scores in between are spread evenly. A score outside the allowed scores is
 * pulled back to the nearest allowed one. A score that is not a number is
 * refused with an error.
 */
function fromScore(score, range) {
  const allowed = clamp(score, STAT_LOWEST, STAT_HIGHEST);
  const share = (allowed - STAT_LOWEST) / (STAT_HIGHEST - STAT_LOWEST); // from 0 to 1
  return range[0] + share * (range[1] - range[0]);
}
