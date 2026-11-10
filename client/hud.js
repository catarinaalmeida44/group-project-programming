// The numbers and words around the track: lap, clock, lap times, camera
// name and the message in the middle. Used by both the practice page and
// the online page, so they show a race in the same way.

import { STEP_SECONDS } from "../shared/physics.js";
import { formatTime } from "./format.js";

/** What each camera view is called on the page. */
export const VIEW_NAMES = {
  chase: "Behind the kart",
  follow: "From above",
  map: "Whole track",
};

/**
 * The time each finished lap took, as text such as "Lap 1: 0:08.37".
 * "lapSteps" is the step count at the end of each lap, so a lap's own time
 * is its end minus the end of the lap before.
 */
export function lapTimesText(lapSteps) {
  return lapSteps
    .map((endStep, index) => {
      const startStep = index === 0 ? 0 : lapSteps[index - 1];
      return `Lap ${index + 1}: ${formatTime((endStep - startStep) * STEP_SECONDS)}`;
    })
    .join("   ");
}

/**
 * Finds the parts of the page once, and gives back show(), which fills
 * them in:
 *   lap, laps   "Lap 2 of 3"
 *   steps       the race time, in steps of the game
 *   lapSteps    the step count at the end of each finished lap
 *   view        the camera view: "chase", "follow" or "map"
 *   message     the text in the middle of the track ("" for none)
 */
export function createHud(page) {
  const lapText = page.getElementById("lap");
  const lapsText = page.getElementById("laps");
  const timeText = page.getElementById("time");
  const viewText = page.getElementById("view");
  const lapTimes = page.getElementById("lap-times");
  const messageText = page.getElementById("message");

  return function show({ lap, laps, steps, lapSteps, view, message }) {
    lapText.textContent = lap;
    lapsText.textContent = laps;
    timeText.textContent = formatTime(steps * STEP_SECONDS);
    viewText.textContent = VIEW_NAMES[view];
    lapTimes.textContent = lapTimesText(lapSteps);
    messageText.textContent = message;
  };
}
