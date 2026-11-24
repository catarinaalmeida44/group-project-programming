// A single race: the player against computer karts.
//
// This is countdown.js for a whole field of karts instead of one. Every step
// of the race:
//   1. the countdown: during 3, 2 and 1 nothing moves
//   2. every kart moves by the rules in race.js. The player's kart with the
//      keys the player holds, every computer kart with the keys its driver
//      chooses (computer-driver.js)
//   3. the karts bump into each other (bumps.js)
//   4. the bananas: whoever drives over one spins out (hazards.js)
//   5. the walkers: people who cross the track walk on, and whoever drives
//      into one fast loses speed (walkers.js). Most tracks have none
// That is the same order as an online race on the server (server/room.js).
// (Ramps need no line here: jumping is part of how one kart moves, in race.js.)
//
// The player is racer 0. The computer karts are racers 1, 2, 3 ... and start
// in the places in front of the player on the grid (grid.js): the player
// starts at the back and has to work their way forwards.
//
// Each computer kart is one of the characters (cast.js) that the player did
// not choose, so no character is in the race twice. It drives with the
// personality of that character (computer-driver.js).
//
// A computer kart that has finished keeps rolling with no keys pressed. The
// race of the player ends when the player finishes, as before.

import { countdownAt } from "./countdown.js";
import { createRacer, stepRacer } from "./race.js";
import { bumpKarts } from "./bumps.js";
import { createBananaMaker, stepBananas } from "./hazards.js";
import { createWalkers, stepWalkers, walkerSpots } from "./walkers.js";
import { createComputerDriver, decide, personalityInRace, moodFor, atLevel, isLevel, DEFAULT_LEVEL } from "./computer-driver.js";
import { CAST, isCharacterId } from "./cast.js";
import { GRID_PLACES } from "./grid.js";

/** How many computer karts race against the player, unless the page asks for another number. */
export const COMPUTER_KARTS = 5;

const NO_KEYS = Object.freeze({ gas: false, brake: false, left: false, right: false });

/**
 * A single race before the countdown:
 *   racers          [player, computer 1, computer 2, ...] (race.js)
 *   drivers         one computer driver for each computer kart, in the same
 *                   order: drivers[0] drives racers[1]
 *   countdownSteps  how many steps of the countdown have passed
 *   bananas, bananaMaker  as in countdown.js
 *   walkers         what is remembered about each person who crosses the
 *                   track (walkers.js). An empty list on a track without any
 *
 * Each driver also has "character": the character of cast.js it is.
 *
 *   seed    the number the bananas grow from (hazards.js), or null for none
 *   line    the racing line of the track: [{ x, y }]. Without one (null),
 *           the race has no computer karts: they would not know the way
 *   count   how many computer karts, from 0 up to the free places on the grid
 *   playerCharacter  the id of the character the player chose, or null for
 *           none. The computer karts never take it
 *   level   how good the computer karts are: "easy", "normal" (the default)
 *           or "hard" (computer-driver.js). Anything else is refused
 */
export function createPracticeRace(track, seed = null, line = null, count = COMPUTER_KARTS, playerCharacter = null, level = DEFAULT_LEVEL) {
  if (!isLevel(level)) {
    throw new RangeError("createPracticeRace: the level must be easy, normal or hard");
  }
  if (!Number.isInteger(count) || count < 0) {
    throw new RangeError("createPracticeRace: the number of computer karts must be a whole number from 0 up");
  }
  if (playerCharacter !== null && !isCharacterId(playerCharacter)) {
    throw new RangeError("createPracticeRace: the player's character must be one of the cast, or null");
  }
  const free = CAST.filter((character) => character.id !== playerCharacter);
  const computers = line === null || line.length < 3 ? 0 : Math.min(count, GRID_PLACES - 1, free.length);
  // The computer karts take the front places, the player the one behind them.
  const player = createRacer(track, computers);
  const others = [];
  const drivers = [];
  for (let number = 0; number < computers; number++) {
    others.push(createRacer(track, number));
    // Its personality, dealt out for this race, in a mood picked from this race's seed (computer-driver.js).
    const personality = personalityInRace(free[number].id, seed);
    const mood = atLevel(moodFor(personality, seed, free[number].id), level);
    drivers.push({ ...createComputerDriver(personality, mood), character: free[number] });
  }
  return {
    racers: [player, ...others],
    level, // how good the computer karts are
    drivers,
    line: computers === 0 ? null : line,
    countdownSteps: 0,
    bananas: [],
    bananaMaker: seed === null ? null : createBananaMaker(seed),
    walkers: createWalkers(track),
  };
}

/**
 * Moves a single race forward by one step and gives back the new race.
 * "input" is the keys the player holds. Computer karts choose their own.
 */
export function stepPracticeRace(track, race, input, character) {
  const { racing } = countdownAt(race.countdownSteps);
  const countdownSteps = race.countdownSteps + 1;
  if (!racing) {
    return { ...race, countdownSteps };
  }

  // 2. Every kart moves. Each computer driver decides from the race as it was
  //    at the start of this step, so the order of the karts does not matter.
  const karts = race.racers.map((racer) => racer.kart);
  // What a computer driver steers round: the bananas, and the people who are
  // out on the track and standing up. To a driver they are the same thing:
  // a spot on the road to keep away from.
  const toSteerRound = [...race.bananas, ...walkerSpots(track, race.walkers)];
  const drivers = [];
  const moved = race.racers.map((racer, index) => {
    if (index === 0) {
      return stepRacer(track, racer, input, character);
    }
    const driver = race.drivers[index - 1];
    if (racer.progress.finished) {
      drivers.push(driver);
      return stepRacer(track, racer, NO_KEYS, character);
    }
    const others = karts.filter((_, other) => other !== index);
    const decision = decide(driver, track, racer, race.line, others, toSteerRound, character);
    drivers.push(decision.driver);
    return stepRacer(track, racer, decision.keys, character);
  });

  // 3. Bumps. Only the karts change: laps and clocks stay as they are.
  const before = moved.map((racer) => racer.kart);
  const after = bumpKarts(track, before);
  const bumped = moved.map((racer, index) => (after[index] === before[index] ? racer : { ...racer, kart: after[index] }));

  // 4. Bananas.
  const result = stepBananas(track, race.bananas, race.bananaMaker, bumped);

  // 5. Walkers. (A race made by hand without any gets fresh ones here.)
  const street = stepWalkers(track, race.walkers, result.racers);
  return {
    ...race,
    racers: street.racers,
    drivers,
    countdownSteps,
    bananas: result.bananas,
    bananaMaker: result.maker,
    walkers: street.walkers,
  };
}

/**
 * The karts of a race in the form standings.js expects, to work out places:
 * [{ id, x, y, finished, steps, passed }]. The player has id 0.
 */
export function placesInput(race) {
  return race.racers.map((racer, id) => ({
    id,
    x: racer.kart.x,
    y: racer.kart.y,
    finished: racer.progress.finished,
    steps: racer.progress.steps,
    passed: racer.progress.passed,
  }));
}
