// Tests for shared/practice-race.js: a single race against computer karts.

import { describe, it, expect } from "vitest";
import { createPracticeRace, stepPracticeRace, placesInput, COMPUTER_KARTS } from "../shared/practice-race.js";
import { COUNTDOWN_STEPS } from "../shared/countdown.js";
import { gridSpot, GRID_PLACES } from "../shared/grid.js";
import { speedOf, topSpeedOf } from "../shared/physics.js";
import { tileKindAt } from "../shared/track.js";
import { TEST_DRIVER } from "../shared/characters.js";
import { TEST_OVAL } from "../shared/tracks/test-oval.js";
import { CAMPUS_LOOP } from "../shared/tracks/campus-loop.js";
import { lookOfTrack } from "../client/track-looks.js";
import { routePoints } from "../client/route.js";
import { placeLine } from "../client/standings.js";
import { CAST } from "../shared/cast.js";
import { personalityOf } from "../shared/computer-driver.js";

const NO_KEYS = { gas: false, brake: false, left: false, right: false };
const lineOf = (track) => routePoints(track, lookOfTrack(track).route);

/** Runs a race with the player standing still, until every computer kart has finished or the time is up. */
function runRace(track, seconds, seed = 7, watch = () => {}) {
  let race = createPracticeRace(track, seed, lineOf(track));
  for (let step = 0; step < seconds * 60; step++) {
    race = stepPracticeRace(track, race, NO_KEYS, TEST_DRIVER);
    watch(race);
    if (race.racers.slice(1).every((racer) => racer.progress.finished)) {
      break;
    }
  }
  return race;
}

describe("starting a single race", () => {
  it("puts five computer karts on the front of the grid and the player behind them", () => {
    const race = createPracticeRace(TEST_OVAL, 1, lineOf(TEST_OVAL));
    expect(COMPUTER_KARTS).toBe(5);
    expect(race.racers).toHaveLength(6);
    expect(race.drivers).toHaveLength(5);
    const playerSpot = gridSpot(TEST_OVAL, 5);
    expect(race.racers[0].kart).toMatchObject({ x: playerSpot.x, y: playerSpot.y });
    for (let number = 0; number < 5; number++) {
      expect(race.racers[number + 1].kart).toMatchObject({ x: gridSpot(TEST_OVAL, number).x, y: gridSpot(TEST_OVAL, number).y });
    }
  });

  it("gives every computer kart a different driver", () => {
    const race = createPracticeRace(TEST_OVAL, 1, lineOf(TEST_OVAL));
    expect(new Set(race.drivers.map((driver) => driver.personality.name)).size).toBe(5);
  });

  it("makes the computer karts the five characters the player did not choose", () => {
    for (const mine of CAST) {
      const race = createPracticeRace(TEST_OVAL, 1, lineOf(TEST_OVAL), 5, mine.id);
      const theirs = race.drivers.map((driver) => driver.character.id);
      expect(theirs, mine.id).not.toContain(mine.id);
      expect(new Set(theirs).size).toBe(5);
      expect(theirs.every((id) => CAST.some((character) => character.id === id))).toBe(true);
    }
  });

  it("lets each character drive with its own personality", () => {
    const race = createPracticeRace(TEST_OVAL, 1, lineOf(TEST_OVAL), 5, "pcp");
    for (const driver of race.drivers) {
      expect(driver.personality, driver.character.id).toBe(personalityOf(driver.character.id));
    }
  });

  it("without a chosen character, still takes five different characters", () => {
    const race = createPracticeRace(TEST_OVAL, 1, lineOf(TEST_OVAL), 5, null);
    expect(new Set(race.drivers.map((driver) => driver.character.id)).size).toBe(5);
  });

  it("never has more computer karts than there are characters left", () => {
    const race = createPracticeRace(TEST_OVAL, 1, lineOf(TEST_OVAL), 7, "dean");
    expect(race.drivers).toHaveLength(CAST.length - 1);
  });

  it("refuses a player character that is not in the cast", () => {
    for (const id of ["nobody", "PCP", "", 3]) {
      expect(() => createPracticeRace(TEST_OVAL, 1, lineOf(TEST_OVAL), 5, id), String(id)).toThrow(/cast/);
    }
  });

  it("has no computer karts on a track without a racing line: they would not know the way", () => {
    for (const line of [null, [], [{ x: 0, y: 0 }]]) {
      const race = createPracticeRace(TEST_OVAL, 1, line);
      expect(race.racers).toHaveLength(1);
      expect(race.drivers).toHaveLength(0);
    }
  });

  it("can have fewer computer karts, or none, but never more than the grid has room for", () => {
    expect(createPracticeRace(TEST_OVAL, 1, lineOf(TEST_OVAL), 0).racers).toHaveLength(1);
    expect(createPracticeRace(TEST_OVAL, 1, lineOf(TEST_OVAL), 2).racers).toHaveLength(3);
    expect(createPracticeRace(TEST_OVAL, 1, lineOf(TEST_OVAL), 50).racers.length).toBeLessThanOrEqual(GRID_PLACES);
  });

  it("refuses a number of computer karts that is not a whole number from 0 up", () => {
    for (const count of [-1, 1.5, "3", NaN]) {
      expect(() => createPracticeRace(TEST_OVAL, 1, lineOf(TEST_OVAL), count)).toThrow(/whole number/);
    }
  });
});

describe("the countdown", () => {
  it("moves nothing during 3, 2 and 1: not the player, not the computer karts", () => {
    let race = createPracticeRace(TEST_OVAL, 1, lineOf(TEST_OVAL));
    const before = race.racers.map((racer) => ({ ...racer.kart }));
    for (let step = 0; step < COUNTDOWN_STEPS; step++) {
      race = stepPracticeRace(TEST_OVAL, race, { ...NO_KEYS, gas: true }, TEST_DRIVER);
    }
    race.racers.forEach((racer, index) => expect(racer.kart).toEqual(before[index]));
  });

  it("lets the computer karts drive off at GO", () => {
    let race = createPracticeRace(TEST_OVAL, 1, lineOf(TEST_OVAL));
    for (let step = 0; step < COUNTDOWN_STEPS + 60; step++) {
      race = stepPracticeRace(TEST_OVAL, race, NO_KEYS, TEST_DRIVER);
    }
    for (const racer of race.racers.slice(1)) {
      expect(speedOf(racer.kart)).toBeGreaterThan(50);
    }
  });
});

describe("a whole race", () => {
  for (const [track, seconds] of [[TEST_OVAL, 90], [CAMPUS_LOOP, 180]]) {
    it(`on ${track.name}: every computer kart drives all ${track.laps} laps, never inside a wall, never faster than a player could`, () => {
      let wallMoments = 0;
      let fastest = 0;
      const race = runRace(track, seconds, 7, (now) => {
        for (const racer of now.racers.slice(1)) {
          if (tileKindAt(track, racer.kart.x, racer.kart.y) === "wall") {
            wallMoments++;
          }
          fastest = Math.max(fastest, speedOf(racer.kart));
        }
      });
      for (const [index, racer] of race.racers.slice(1).entries()) {
        expect(racer.progress.finished, race.drivers[index].personality.name).toBe(true);
        expect(racer.progress.lapsDone).toBe(track.laps);
      }
      expect(wallMoments).toBe(0);
      expect(fastest).toBeLessThanOrEqual(topSpeedOf(TEST_DRIVER) + 1);
    });
  }

  it("ends the same way every time with the same bananas: nothing is left to chance", () => {
    const times = (race) => race.racers.map((racer) => racer.progress.steps);
    expect(times(runRace(TEST_OVAL, 90, 99))).toEqual(times(runRace(TEST_OVAL, 90, 99)));
  });

  it("lets a computer kart that has finished keep its time, and roll to a stop with no keys pressed", () => {
    let race = runRace(TEST_OVAL, 90);
    const finishTimes = race.racers.slice(1).map((racer) => racer.progress.steps);
    for (let step = 0; step < 4 * 60; step++) {
      race = stepPracticeRace(TEST_OVAL, race, NO_KEYS, TEST_DRIVER);
    }
    expect(race.racers.slice(1).map((racer) => racer.progress.steps)).toEqual(finishTimes);
    for (const racer of race.racers.slice(1)) {
      expect(speedOf(racer.kart)).toBeLessThan(5); // stopped, not driving another lap
    }
  });
});

describe("places", () => {
  it("gives every kart in the form the place words need, the player as number 0", () => {
    const race = createPracticeRace(TEST_OVAL, 1, lineOf(TEST_OVAL));
    const karts = placesInput(race);
    expect(karts).toHaveLength(6);
    expect(karts[0]).toMatchObject({ id: 0, finished: false, steps: 0 });
  });

  it("puts a player who has not moved last, once the computer karts are on their way", () => {
    let race = createPracticeRace(TEST_OVAL, 1, lineOf(TEST_OVAL));
    for (let step = 0; step < COUNTDOWN_STEPS + 300; step++) {
      race = stepPracticeRace(TEST_OVAL, race, NO_KEYS, TEST_DRIVER);
    }
    expect(placeLine(placesInput(race), TEST_OVAL, 0)).toBe("6th of 6");
  });

  it("says nothing about places when the player races alone", () => {
    const race = createPracticeRace(TEST_OVAL, 1, null);
    expect(placeLine(placesInput(race), TEST_OVAL, 0)).toBe("");
  });
});
