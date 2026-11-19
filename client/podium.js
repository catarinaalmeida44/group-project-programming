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
// When four or more karts raced, the driver who came last stands on the
// floor beside the podium and cries, while everyone else cheers
// (podiumLoser below; Catarina's idea, 19 November 2026).
//
// This file is plain sums, so it is tested without a browser.

import { standings } from "./standings.js";
import { characterById } from "../shared/cast.js";
import { hairOf, longHairOf, headOf, danceOf, lookOfCharacter } from "./cast-choice.js";
import { lookOf } from "./kart-shape.js";
import { STEP_SECONDS } from "../shared/physics.js";
import { placeText } from "./net.js";

/** How long the podium is shown on its own before the results board comes up online, in seconds. */
export const PODIUM_SECONDS = 10;

/** How long the camera takes to come in to the podium when it comes up, in seconds. */
export const CAMERA_IN_SECONDS = 2.8;
/** How many times further away than in the end the camera starts. */
export const CAMERA_STARTS = 4;

/**
 * How far back the camera of the podium is, "seconds" after the podium came
 * up, as a multiple of where it ends: it starts far away, with the whole
 * crowd in the picture, and comes in to the podium, fast at first and
 * gently at the end. 1 once it has arrived. A strange time counts as the
 * start.
 */
export function cameraPullBack(seconds) {
  if (typeof seconds !== "number" || !Number.isFinite(seconds) || seconds <= 0) {
    return CAMERA_STARTS;
  }
  const share = Math.min(seconds / CAMERA_IN_SECONDS, 1);
  const arrived = 1 - (1 - share) ** 3; // fast at first, gently at the end
  return CAMERA_STARTS + (1 - CAMERA_STARTS) * arrived;
}

/**
 * The driver who came last is shown crying when at least this many karts
 * raced. With three or fewer, everyone who finished is on the podium, and
 * nobody cries.
 */
export const CRY_FROM_KARTS = 4;

/**
 * The driver who came last, who stands beside the podium and cries, or null
 * when fewer than CRY_FROM_KARTS karts raced.
 *
 * "Last" is the last line of the results: the karts that finished come
 * first, in the order they crossed the line, then the karts that did not
 * finish, the one closest to the finish first (standings.js). So a kart
 * that never finished can be the one, and with four or more karts the last
 * one is never also on the podium. Only that one driver cries: with five
 * karts the fourth is neither on the podium nor crying.
 *
 * Gives { place, id, character, name, look, hair, longHair, head, finished },
 * as a driver of podiumLineup() is described there. "place" is their place
 * in the race, the same as the number of karts.
 */
export function podiumLoser(karts, track) {
  const usable = Array.isArray(karts) ? karts.filter((kart) => kart !== null && typeof kart === "object") : [];
  if (usable.length < CRY_FROM_KARTS) {
    return null;
  }
  const order = standings(usable, track);
  const last = order[order.length - 1];
  const { dance, steps, ...driver } = driverOf(last); // someone who cries does not dance, and may have no race time
  return { place: order.length, ...driver, finished: last.finished === true };
}

/** A kart as a driver to paint: who they are, their colours, hair and head (cast-choice.js). */
function driverOf(kart) {
  const character = characterById(kart.character);
  return {
    id: kart.id,
    character: character === null ? null : character.id,
    name: character === null ? `Kart ${kart.id}` : character.name,
    look: character === null ? lookOf(kart) : lookOfCharacter(character.id),
    hair: character === null ? null : hairOf(character.id),
    longHair: character === null ? null : longHairOf(character.id),
    head: character === null ? null : headOf(character.id),
    dance: character === null ? null : danceOf(character.id),
    steps: kart.steps,
  };
}

/** In a single race: the longest the player waits for the computer karts after finishing, in seconds. */
export const WAIT_AFTER_YOU_SECONDS = 30;

/**
 * The drivers on the podium, at most three, the winner first:
 *   [{ place, id, character, name, look, hair, longHair, head, dance, steps }]
 *   place      1, 2 or 3: the step they stand on, in the order they finished
 *   character  the id of their character (shared/cast.js), or null
 *   name       the character's name, or "Kart" and the kart's number
 *   look       the colours of their kart and suit (kart-shape.js)
 *   hair, longHair, head, dance  from cast-choice.js; null for a kart without a character
 *   steps      their race time, in steps
 * Only karts that finished stand on it.
 *   karts  [{ id, character?, place?, look?, finished, steps, passed, x, y }]
 *          as the online page has them, or as podiumKartsOf() makes them for
 *          a single race
 */
export function podiumLineup(karts, track) {
  const usable = Array.isArray(karts) ? karts.filter((kart) => kart !== null && typeof kart === "object") : [];
  const finishers = standings(usable, track).filter((kart) => kart.finished === true);
  return finishers.slice(0, 3).map((kart, index) => ({ place: index + 1, ...driverOf(kart) }));
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

/** The crowd cheers again every this many seconds while the podium is shown (one cheer lasts about 2), this many times. */
export const CHEER_EVERY_SECONDS = 2.3;
export const CHEERS = 8;

/**
 * How many times the crowd should have cheered by now, "seconds" after the
 * podium came up: once straight away, then again every CHEER_EVERY_SECONDS,
 * CHEERS times in all, so it does not go on for ever.
 */
export function cheersDue(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) {
    return 0; // also for null, which JavaScript would otherwise count as 0
  }
  return Math.min(CHEERS, Math.floor(seconds / CHEER_EVERY_SECONDS) + 1);
}

/**
 * The place a kart finished in: 1 for the winner, 2, 3, ... Two karts
 * with the same race time share a place. Null when that kart has not
 * finished (or is not in the list).
 */
export function finishPlace(karts, id) {
  const usable = Array.isArray(karts) ? karts.filter((kart) => kart !== null && typeof kart === "object") : [];
  const mine = usable.find((kart) => kart.id === id);
  if (mine === undefined || mine.finished !== true) {
    return null;
  }
  return 1 + usable.filter((kart) => kart.finished === true && kart.steps < mine.steps).length;
}

/**
 * What a driver who has just finished is told, until the podium comes:
 * "You finished 2nd, in 1:02.34! Wait for all the drivers to finish the race!"
 */
export function finishedWords(place, steps, formatTime) {
  return `You finished ${placeText(place)}, in ${formatTime(steps * STEP_SECONDS)}! ${WAIT_FOR_ALL}`;
}

/** The second half of the words at the finish. */
export const WAIT_FOR_ALL = "Wait for all the drivers to finish the race!";

/** The line under the podium: "1st PCP 1:02.34 · 2nd Dean 1:04.10 · 3rd FranFon 1:05.00". */
export function podiumCaption(lineup, formatTime) {
  const places = ["1st", "2nd", "3rd"];
  return lineup.map((driver) => `${places[driver.place - 1]} ${driver.name} ${formatTime(driver.steps * STEP_SECONDS)}`).join("  ·  ");
}
