// The countdown before a race: 3, 2, 1, GO!
//
// Like the race clock, the countdown is counted in steps of the game
// (60 per second), not with a real clock. The same number of steps then
// always gives the same answer, in the browser and on the server.
//
// During 3, 2 and 1 the kart is not moved and the race clock stands still,
// whatever keys are held. At GO the race begins.
//
// The practice race in the browser uses all of this. An online race uses
// countdownAt(), with one countdown for the whole room (server/room.js).
//
// A race with a countdown also carries the bananas of the race (hazards.js):
// none during 3, 2 and 1, the first one a few seconds after GO.

import { STEP_SECONDS } from "./physics.js";
import { createRacer, stepRacer } from "./race.js";
import { createBananaMaker, stepBananas } from "./hazards.js";

/** The countdown starts at this number. */
export const COUNTDOWN_FROM = 3;

/** Each number stays for one second: 60 steps. */
export const STEPS_PER_NUMBER = Math.round(1 / STEP_SECONDS);

/** How many steps pass before GO: 3 numbers of 60 steps each. */
export const COUNTDOWN_STEPS = COUNTDOWN_FROM * STEPS_PER_NUMBER;

/** "GO!" stays on the screen this long after the race has begun. */
export const GO_STEPS = STEPS_PER_NUMBER;

/**
 * What the countdown says after a number of steps.
 *
 * Gives { label, racing }:
 *   label   the text to show: "3", "2", "1", "GO!" or "" (nothing)
 *   racing  false during 3, 2 and 1. True from GO on.
 *
 * Examples:
 *   countdownAt(0)    gives { label: "3", racing: false }
 *   countdownAt(60)   gives { label: "2", racing: false }
 *   countdownAt(179)  gives { label: "1", racing: false }
 *   countdownAt(180)  gives { label: "GO!", racing: true }
 *   countdownAt(240)  gives { label: "", racing: true }
 *
 * It refuses anything that is not a whole number from 0 up, by stopping
 * with an error. A wrong step count must never start a race early.
 */
export function countdownAt(steps) {
  if (!Number.isInteger(steps)) {
    throw new TypeError("countdownAt: steps must be a whole number");
  }
  if (steps < 0) {
    throw new RangeError("countdownAt: steps cannot be below zero");
  }
  if (steps < COUNTDOWN_STEPS) {
    const numbersDone = Math.floor(steps / STEPS_PER_NUMBER);
    return { label: String(COUNTDOWN_FROM - numbersDone), racing: false };
  }
  if (steps < COUNTDOWN_STEPS + GO_STEPS) {
    return { label: "GO!", racing: true };
  }
  return { label: "", racing: true };
}

/**
 * A race that begins with a countdown:
 *   racer           the racer waiting at the start of the track
 *   countdownSteps  how many steps of the countdown have passed
 *   bananas         the banana peels on the road: [{ id, x, y }]. None yet
 *   bananaMaker     what decides when and where the next banana appears,
 *                   or null for a race without bananas
 *
 *   seed   the number the bananas of this race grow from (see hazards.js):
 *          a whole number from 0 to 4294967295. The same seed and the same
 *          driving always give the same bananas, so the page should pick a
 *          new one by chance for every race. Left out, the race has no
 *          bananas.
 */
export function createCountdownRace(track, seed = null) {
  return {
    racer: createRacer(track),
    countdownSteps: 0,
    bananas: [],
    bananaMaker: seed === null ? null : createBananaMaker(seed),
  };
}

/**
 * Moves a race with a countdown forward by one step and gives back the new race.
 *
 * Before GO, the racer is given back exactly as it was: the keys are
 * ignored, the kart does not move and the race clock does not run. No
 * banana appears and none can be hit.
 * From GO on, the racer moves by the normal rules in race.js, and the
 * bananas follow the rules in hazards.js.
 */
export function stepCountdownRace(track, race, input, character) {
  const { racing } = countdownAt(race.countdownSteps);
  const countdownSteps = race.countdownSteps + 1;
  if (!racing) {
    return { ...race, countdownSteps };
  }
  const moved = stepRacer(track, race.racer, input, character);
  const after = stepBananas(track, race.bananas, race.bananaMaker, [moved]);
  return {
    ...race,
    racer: after.racers[0],
    countdownSteps,
    bananas: after.bananas,
    bananaMaker: after.maker,
  };
}
