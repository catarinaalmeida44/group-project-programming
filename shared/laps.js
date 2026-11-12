// Laps: counting them, and timing the race.
//
// A track has checkpoints: invisible rectangles across the road, numbered
// in the order they are driven. Checkpoint 0 is the finish line.
//
// WHERE A KART STARTS
// On the real tracks the karts start BEHIND the finish line, as in real
// racing. Crossing the line for the first time starts lap 1. It does not
// count as a lap. The race clock starts at GO, not at the line, so the time
// of lap 1 includes the short run from the grid to the line.
// (The older rule, a start just AFTER the line, still exists: the small
// tracks in the tests use it. A track says which one it wants, see
// "behindLine" in track.js.)
//
// HOW LAPS ARE COUNTED
// The game keeps one number for each kart: "passed", the count of
// checkpoints it has gone through.
//   - Driving into the NEXT checkpoint adds one.
//   - Driving back into the checkpoint BEFORE the last one takes one away.
//   - Driving into any other checkpoint changes nothing.
// A lap is complete each time "passed" reaches a new full round of all the
// checkpoints. So skipping a checkpoint, taking them in the wrong order or
// driving the wrong way round can never complete a lap, and a kart that
// drove backwards first has to make up for it.
//
// HOW TIME IS COUNTED
// In steps of the game (60 per second), not with a clock. That way the
// finish time is exact and is the same on every computer.

import { STEP_SECONDS } from "./physics.js";
import { isInsideCheckpoint } from "./track.js";

/** The progress of a kart at the start of a race, when it starts just AFTER the finish line. */
export function createProgress() {
  return {
    passed: 0, //       checkpoints gone through forwards, minus those gone through backwards
    lapsDone: 0, //     how many laps are complete
    steps: 0, //        how many steps of game time the kart has raced
    lapSteps: [], //    the step count at the end of each completed lap
    finished: false, // true once all laps are done
  };
}

/**
 * The progress of a kart at the start of a race, when it starts BEHIND the
 * finish line.
 *
 * "passed" starts at -1 instead of 0: the kart is one checkpoint short of
 * the line. That makes the finish line the next checkpoint, so crossing it
 * brings the count to 0 without completing a lap. From there on, laps are
 * counted exactly as for any other kart.
 */
export function createProgressBehindLine() {
  return { ...createProgress(), passed: -1 };
}

/** The progress of a kart waiting at the start of this track: behind the line if the track says so. */
export function progressAtStart(track) {
  return track.startsBehindLine ? createProgressBehindLine() : createProgress();
}

/** The number of the checkpoint the kart has to reach next. (Number 0 is the finish line.) */
export function nextCheckpoint(progress, track) {
  return wrap(progress.passed + 1, track.checkpoints.length);
}

/**
 * Gives the progress one step later, for a kart at its new position.
 * The progress given is not changed: a new one is made.
 */
export function updateProgress(progress, kart, track) {
  if (progress.finished) {
    return progress; // the race is over for this kart: the clock has stopped
  }
  const steps = progress.steps + 1;
  const count = track.checkpoints.length;
  const next = wrap(progress.passed + 1, count);
  const before = wrap(progress.passed - 1, count);

  if (isInsideCheckpoint(track, before, kart.x, kart.y)) {
    // Went backwards through a checkpoint: take one away.
    return { ...progress, steps, passed: progress.passed - 1 };
  }
  if (!isInsideCheckpoint(track, next, kart.x, kart.y)) {
    return { ...progress, steps }; // nothing happened this step
  }

  // Went forwards through the next checkpoint: add one.
  const passed = progress.passed + 1;
  const roundsDone = Math.floor(passed / count);
  if (roundsDone <= progress.lapsDone) {
    return { ...progress, steps, passed };
  }

  // That completed a round the kart had not completed before: one more lap.
  return {
    ...progress,
    steps,
    passed,
    lapsDone: roundsDone,
    lapSteps: [...progress.lapSteps, steps],
    finished: roundsDone >= track.laps,
  };
}

/** How long the kart has raced, in seconds. Stops growing when the kart finishes. */
export function raceSeconds(progress) {
  return progress.steps * STEP_SECONDS;
}

/**
 * The fastest single lap, in steps, from the step count at the end of each
 * lap: [480, 1000, 1500] means laps of 480, 520 and 500 steps, so it gives
 * 480. Gives null when no lap is complete.
 */
export function fastestLapSteps(lapSteps) {
  let fastest = null;
  for (let lap = 0; lap < lapSteps.length; lap++) {
    const took = lapSteps[lap] - (lap === 0 ? 0 : lapSteps[lap - 1]);
    if (fastest === null || took < fastest) {
      fastest = took;
    }
  }
  return fastest;
}

/** The lap the kart is on, for showing "Lap 2 of 3". Never more than the number of laps. */
export function currentLap(progress, track) {
  return Math.min(progress.lapsDone + 1, track.laps);
}

/** Wraps a number round into the range 0 .. count-1, so that -1 becomes the last one. */
function wrap(number, count) {
  return ((number % count) + count) % count;
}
