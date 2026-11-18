// Who stands on the podium, and when it comes.
//
// The podium (podium-shape.js, painted by podium-view.js) comes when a race
// is over:
//   - online, when the server says so: everyone has finished, or the time
//     ran out (server/room.js)
//   - in a single race, when every kart has finished, or at the latest
//     WAIT_AFTER_YOU_SECONDS after the player finished, so that a computer
//     kart that is stuck somewhere does not keep the player waiting
// The first three karts that finished stand on it. A kart that did not
// finish never does. After PODIUM_SECONDS the online page also shows the
// results board, with everyone.
//
// This file is plain sums, so it is tested without a browser.

import { standings } from "./standings.js";
import { characterById } from "../shared/cast.js";
import { hairOf, headOf, danceOf, lookOfCharacter } from "./cast-choice.js";
import { lookOf } from "./kart-shape.js";
import { STEP_SECONDS } from "../shared/physics.js";

/** How long the podium is shown on its own before the results board comes up online, in seconds. */
export const PODIUM_SECONDS = 10;

/** In a single race: the longest the player waits for the computer karts after finishing, in seconds. */
export const WAIT_AFTER_YOU_SECONDS = 30;

/**
 * The drivers on the podium, at most three, the winner first:
 *   [{ place, id, character, name, look, hair, head, dance, steps }]
 *   place      1, 2 or 3: the step they stand on, in the order they finished
 *   character  the id of their character (shared/cast.js), or null
 *   name       the character's name, or "Kart" and the kart's number
 *   look       the colours of their kart and suit (kart-shape.js)
 *   hair, head, dance  from cast-choice.js; null for a kart without a character
 *   steps      their race time, in steps
 * Only karts that finished stand on it.
 *   karts  [{ id, character?, place?, look?, finished, steps, passed, x, y }]
 *          as the online page has them, or as podiumKartsOf() makes them for
 *          a single race
 */
export function podiumLineup(karts, track) {
  const usable = Array.isArray(karts) ? karts.filter((kart) => kart !== null && typeof kart === "object") : [];
  const finishers = standings(usable, track).filter((kart) => kart.finished === true);
  return finishers.slice(0, 3).map((kart, index) => {
    const character = characterById(kart.character);
    return {
      place: index + 1,
      id: kart.id,
      character: character === null ? null : character.id,
      name: character === null ? `Kart ${kart.id}` : character.name,
      look: character === null ? lookOf(kart) : lookOfCharacter(character.id),
      hair: character === null ? null : hairOf(character.id),
      head: character === null ? null : headOf(character.id),
      dance: character === null ? null : danceOf(character.id),
      steps: kart.steps,
    };
  });
}

/**
 * The karts of a single race in the form podiumLineup() expects. The player
 * is racer 0 with their own character (or none); computer kart n is racer
 * n with the character its driver is (shared/practice-race.js).
 */
export function podiumKartsOf(race, playerCharacter) {
  return race.racers.map((racer, id) => ({
    id,
    character: id === 0 ? playerCharacter : (race.drivers[id - 1]?.character?.id ?? null),
    place: id,
    finished: racer.progress.finished,
    steps: racer.progress.steps,
    passed: racer.progress.passed,
    x: racer.kart.x,
    y: racer.kart.y,
  }));
}

/**
 * Is a single race over, so the podium can come? Yes when every kart has
 * finished. Also yes when the player has finished and has waited
 * WAIT_AFTER_YOU_SECONDS for the others. Never before the player finished.
 *   race               the race (shared/practice-race.js)
 *   stepsSinceYouFinished  how many steps of the race have passed since the
 *                      player crossed the finish line
 */
export function singleRaceIsOver(race, stepsSinceYouFinished) {
  const [you, ...others] = race.racers;
  if (!you.progress.finished) {
    return false;
  }
  if (others.every((racer) => racer.progress.finished)) {
    return true;
  }
  return stepsSinceYouFinished * STEP_SECONDS >= WAIT_AFTER_YOU_SECONDS;
}

/** The line under the podium: "1st PCP 1:02.34 · 2nd Dean 1:04.10 · 3rd FranFon 1:05.00". */
export function podiumCaption(lineup, formatTime) {
  const places = ["1st", "2nd", "3rd"];
  return lineup.map((driver) => `${places[driver.place - 1]} ${driver.name} ${formatTime(driver.steps * STEP_SECONDS)}`).join("  ·  ");
}
