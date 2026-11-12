// The parts of the picture that depend on the countdown: how far the camera
// has come down, and which start lights are on.
//
// Both race pages use this, so a single race and an online race open in the
// same way. It is plain arithmetic, so it can be tested without a browser.
// The countdown itself is a rule (shared/countdown.js). Nothing here can
// start a race early: it only decides what is shown.

import { COUNTDOWN_STEPS, countdownAt } from "../shared/countdown.js";

/** The camera reaches its place behind the kart when this share of the countdown has passed, a moment before GO. */
const CAMERA_DOWN_AT = 0.85;

/**
 * How far the camera has come down from high above the grid: 0 is all the
 * way up, 1 is behind the kart.
 *   counting        true while 3, 2, 1 is being counted (or about to be)
 *   countdownSteps  how many steps of the countdown have passed
 * Outside a countdown the camera is down.
 */
export function introShare(counting, countdownSteps) {
  if (!counting) {
    return 1;
  }
  if (!Number.isInteger(countdownSteps) || countdownSteps < 0) {
    return 0;
  }
  return Math.min(1, countdownSteps / (COUNTDOWN_STEPS * CAMERA_DOWN_AT));
}

/**
 * The start lights on the gantry: { red, green }.
 *   red    how many red lights are on: one more for each number counted
 *   green  true while "GO!" is shown
 * Everything is off before the countdown and after GO has gone.
 */
export function startLights(counting, countdownSteps) {
  if (!counting || !Number.isInteger(countdownSteps) || countdownSteps < 0) {
    return { red: 0, green: false };
  }
  const { label, racing } = countdownAt(countdownSteps);
  if (racing) {
    return { red: 0, green: label !== "" };
  }
  // "3" lights one lamp, "2" two, "1" all three.
  return { red: 4 - Number(label), green: false };
}
