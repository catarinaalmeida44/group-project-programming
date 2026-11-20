// A two-player race: two people on one computer, each with their own keys,
// with or without computer karts.
//
// It is practice-race.js with two players instead of one. Every step of the
// race, in the same order as there and as in an online race (server/room.js):
//   1. the countdown: during 3, 2 and 1 nothing moves
//   2. every kart moves by the rules in race.js. Each player's kart with the
//      keys that player holds, every computer kart with the keys its driver
//      chooses (computer-driver.js)
//   3. the karts bump into each other (bumps.js)
//   4. the bananas (hazards.js)
//   5. the walkers (walkers.js)
//   6. the end: is the race over?
//
// The players are racers 0 and 1. The computer karts are racers 2, 3 ... and
// start in the places in front of them on the grid (grid.js). The two
// players start side by side in the row behind, so neither has a head
// start. Player 1 is on the right and player 2 on the left: player 1 drives
// with the arrow keys, which are on the right of the keyboard, and has the
// right half of the screen (client/double-view.js).
//
// No character is in the race twice: the computer karts are the characters
// the two players did not choose.
//
// WHEN IT IS OVER
// A single race ends for the player when they finish. Here there are two
// players, and one of them may never finish. So the race has an end of its
// own, with the same two time limits as an online race (race-time.js). It is
// over when:
//   - every kart has finished, or
//   - both players have finished and have waited WAIT_FOR_COMPUTERS_STEPS for
//     the computer karts, or
//   - FINISH_WINDOW_STEPS have passed since the first kart finished, or
//   - RACE_LIMIT_STEPS have passed since GO.
// Once it is over nothing moves any more: the page shows the podium.
//
// Nothing here knows about keyboards or screens, so it is tested without a
// browser (tests/two-player-race.test.js). The page is client/double.js.

import { countdownAt } from "./countdown.js";
import { createRacer, stepRacer } from "./race.js";
import { bumpKarts } from "./bumps.js";
import { createBananaMaker, stepBananas } from "./hazards.js";
import { createWalkers, stepWalkers, walkerSpots } from "./walkers.js";
import { createComputerDriver, decide, personalityOf, moodFor, atLevel, isLevel, DEFAULT_LEVEL } from "./computer-driver.js";
import { CAST, isCharacterId } from "./cast.js";
import { GRID_PLACES } from "./grid.js";
import { FINISH_WINDOW_STEPS, RACE_LIMIT_STEPS } from "./race-time.js";

/** How many people drive. */
export const PLAYERS = 2;

/** How many computer karts race with the two players, unless the page asks for another number: six karts in all. */
export const COMPUTER_KARTS_FOR_TWO = 4;

/** Once both players have finished, they wait at most this many steps for the computer karts: 30 seconds, as in a single race. */
export const WAIT_FOR_COMPUTERS_STEPS = 30 * 60;

const NO_KEYS = Object.freeze({ gas: false, brake: false, left: false, right: false });

/**
 * A two-player race before the countdown:
 *   racers          [player 1, player 2, computer 1, computer 2, ...] (race.js)
 *   characters      the ids of the two players' characters (or null for none)
 *   drivers         one computer driver for each computer kart, in the same
 *                   order: drivers[0] drives racers[2]. Each has "character"
 *   level           how good the computer karts are
 *   countdownSteps  how many steps of the countdown have passed
 *   raceSteps       how many steps have passed since GO
 *   firstFinishAt   "raceSteps" when the first kart finished, or null
 *   playersDoneAt   "raceSteps" when both players had finished, or null
 *   over            true once the race is over (see the top of this file)
 *   bananas, bananaMaker, walkers   as in practice-race.js
 *
 *   seed        the number the bananas grow from (hazards.js), or null for none
 *   line        the racing line of the track: [{ x, y }]. Without one (null),
 *               the race has no computer karts: they would not know the way
 *   computers   how many computer karts, from 0 up to the free places
 *   characters  the two players' characters: two ids of the cast, or null
 *               for a player without one. The same character twice is refused
 *   level       "easy", "normal" (the default) or "hard". Anything else is refused
 */
export function createTwoPlayerRace(track, seed = null, line = null, computers = COMPUTER_KARTS_FOR_TWO, characters = [null, null], level = DEFAULT_LEVEL) {
  if (!isLevel(level)) {
    throw new RangeError("createTwoPlayerRace: the level must be easy, normal or hard");
  }
  if (!Number.isInteger(computers) || computers < 0) {
    throw new RangeError("createTwoPlayerRace: the number of computer karts must be a whole number from 0 up");
  }
  if (!Array.isArray(characters) || characters.length !== PLAYERS || characters.some((id) => id !== null && !isCharacterId(id))) {
    throw new RangeError("createTwoPlayerRace: the characters must be two of the cast, or null");
  }
  if (characters[0] !== null && characters[0] === characters[1]) {
    throw new RangeError("createTwoPlayerRace: the two players cannot be the same character");
  }
  const free = CAST.filter((character) => !characters.includes(character.id));
  const count = line === null || line.length < 3 ? 0 : Math.min(computers, GRID_PLACES - PLAYERS, free.length);
  // The computer karts take the front places. The players take the first
  // whole row behind them: an even place (left) and the odd one beside it
  // (right). Player 1 has the right one, player 2 the left one.
  const firstPlace = count + (count % 2);
  const players = [createRacer(track, firstPlace + 1), createRacer(track, firstPlace)];
  const others = [];
  const drivers = [];
  for (let number = 0; number < count; number++) {
    others.push(createRacer(track, number));
    // Its personality, in a mood picked from this race's seed, at the chosen level (as in practice-race.js).
    const personality = personalityOf(free[number].id);
    const mood = atLevel(moodFor(personality, seed, free[number].id), level);
    drivers.push({ ...createComputerDriver(personality, mood), character: free[number] });
  }
  return {
    racers: [...players, ...others],
    characters: [...characters],
    level,
    drivers,
    line: count === 0 ? null : line,
    countdownSteps: 0,
    raceSteps: 0,
    firstFinishAt: null,
    playersDoneAt: null,
    over: false,
    bananas: [],
    bananaMaker: seed === null ? null : createBananaMaker(seed),
    walkers: createWalkers(track),
  };
}

/**
 * Is the race over, from the karts and the three clocks? (The rules are at
 * the top of this file.)
 */
export function twoPlayerRaceIsOver(racers, raceSteps, firstFinishAt, playersDoneAt) {
  if (racers.every((racer) => racer.progress.finished)) {
    return true;
  }
  if (playersDoneAt !== null && raceSteps - playersDoneAt >= WAIT_FOR_COMPUTERS_STEPS) {
    return true;
  }
  if (firstFinishAt !== null && raceSteps - firstFinishAt >= FINISH_WINDOW_STEPS) {
    return true;
  }
  return raceSteps >= RACE_LIMIT_STEPS;
}

/**
 * Moves a two-player race forward by one step and gives back the new race.
 * "inputs" is the keys each player holds: [player 1's, player 2's]. A
 * missing one counts as no keys. Computer karts choose their own. Once the
 * race is over, it is given back unchanged.
 */
export function stepTwoPlayerRace(track, race, inputs, character) {
  if (race.over) {
    return race;
  }
  const { racing } = countdownAt(race.countdownSteps);
  const countdownSteps = race.countdownSteps + 1;
  if (!racing) {
    return { ...race, countdownSteps };
  }
  const keysOf = (player) => (Array.isArray(inputs) && inputs[player] !== null && typeof inputs[player] === "object" ? inputs[player] : NO_KEYS);

  // 2. Every kart moves. Each computer driver decides from the race as it was
  //    at the start of this step, so the order of the karts does not matter.
  const karts = race.racers.map((racer) => racer.kart);
  const toSteerRound = [...race.bananas, ...walkerSpots(track, race.walkers)];
  const drivers = [];
  const moved = race.racers.map((racer, index) => {
    if (index < PLAYERS) {
      return stepRacer(track, racer, keysOf(index), character); // race.js ignores the keys of a player who has finished
    }
    const driver = race.drivers[index - PLAYERS];
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

  // 4. Bananas, and 5. walkers.
  const result = stepBananas(track, race.bananas, race.bananaMaker, bumped);
  const street = stepWalkers(track, race.walkers, result.racers);

  // 6. The end.
  const raceSteps = race.raceSteps + 1;
  const racers = street.racers;
  const firstFinishAt = race.firstFinishAt ?? (racers.some((racer) => racer.progress.finished) ? raceSteps : null);
  const playersDoneAt = race.playersDoneAt ?? (racers.slice(0, PLAYERS).every((racer) => racer.progress.finished) ? raceSteps : null);
  return {
    ...race,
    racers,
    drivers,
    countdownSteps,
    raceSteps,
    firstFinishAt,
    playersDoneAt,
    over: twoPlayerRaceIsOver(racers, raceSteps, firstFinishAt, playersDoneAt),
    bananas: result.bananas,
    bananaMaker: result.maker,
    walkers: street.walkers,
  };
}

/**
 * How many steps are left until the race is over for everyone, once that is
 * known: after the first kart has finished, or near the ten-minute limit.
 * Gives null while there is no end in sight (nobody has finished yet), and
 * 0 once the race is over. The page shows it as "The race ends in 42 s".
 */
export function twoPlayerEndsIn(race) {
  if (race.over) {
    return 0;
  }
  const limits = [RACE_LIMIT_STEPS - race.raceSteps];
  if (race.firstFinishAt !== null) {
    limits.push(race.firstFinishAt + FINISH_WINDOW_STEPS - race.raceSteps);
  }
  if (race.playersDoneAt !== null) {
    limits.push(race.playersDoneAt + WAIT_FOR_COMPUTERS_STEPS - race.raceSteps);
  }
  const left = Math.max(0, Math.min(...limits));
  return race.firstFinishAt === null && left > FINISH_WINDOW_STEPS ? null : left;
}

/**
 * The karts of a race in the form standings.js and podium.js expect:
 * [{ id, character, place, x, y, finished, steps, passed, lapsDone }]. The
 * players have ids 0 and 1, with their own characters; computer kart n has
 * the character its driver is.
 */
export function twoPlayerKarts(race) {
  return race.racers.map((racer, id) => ({
    id,
    character: id < PLAYERS ? race.characters[id] : (race.drivers[id - PLAYERS]?.character?.id ?? null),
    place: id,
    x: racer.kart.x,
    y: racer.kart.y,
    finished: racer.progress.finished,
    steps: racer.progress.steps,
    passed: racer.progress.passed,
    lapsDone: racer.progress.lapsDone,
  }));
}
