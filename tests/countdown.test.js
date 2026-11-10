// Tests for shared/countdown.js: the 3, 2, 1, GO! before a race.
//
// How to read a test:
//   it("says what should happen", () => { expect(what we got).toBe(what we wanted); });
// If what we got is different from what we wanted, the test fails.

import { describe, it, expect } from "vitest";
import {
  COUNTDOWN_FROM,
  STEPS_PER_NUMBER,
  COUNTDOWN_STEPS,
  GO_STEPS,
  countdownAt,
  createCountdownRace,
  stepCountdownRace,
} from "../shared/countdown.js";
import { createRacer, stepRacer } from "../shared/race.js";
import { speedOf } from "../shared/physics.js";
import { TEST_DRIVER } from "../shared/characters.js";
import { TEST_OVAL } from "../shared/tracks/test-oval.js";

const GAS = { gas: true, brake: false, left: false, right: false };
const ALL_KEYS = { gas: true, brake: true, left: true, right: true };
const NO_KEYS = { gas: false, brake: false, left: false, right: false };

/** Runs a race with a countdown for a number of steps, holding the same keys. */
function run(race, keys, steps) {
  for (let step = 0; step < steps; step++) {
    race = stepCountdownRace(TEST_OVAL, race, keys, TEST_DRIVER);
  }
  return race;
}

describe("what the countdown says", () => {
  it("counts from 3 and each number lasts one second", () => {
    expect(COUNTDOWN_FROM).toBe(3);
    expect(STEPS_PER_NUMBER).toBe(60);
    expect(COUNTDOWN_STEPS).toBe(180);
  });

  it("says 3 for the whole first second", () => {
    expect(countdownAt(0).label).toBe("3");
    expect(countdownAt(59).label).toBe("3");
  });

  it("says 2 for the whole second second", () => {
    expect(countdownAt(60).label).toBe("2");
    expect(countdownAt(119).label).toBe("2");
  });

  it("says 1 for the whole third second", () => {
    expect(countdownAt(120).label).toBe("1");
    expect(countdownAt(179).label).toBe("1");
  });

  it("says GO! after three seconds, and keeps saying it for a while", () => {
    expect(countdownAt(COUNTDOWN_STEPS).label).toBe("GO!");
    expect(countdownAt(COUNTDOWN_STEPS + GO_STEPS - 1).label).toBe("GO!");
  });

  it("says nothing once GO! has been shown long enough", () => {
    expect(countdownAt(COUNTDOWN_STEPS + GO_STEPS).label).toBe("");
    expect(countdownAt(100000).label).toBe("");
  });

  it("goes through 3, 2, 1, GO! in that order and never back", () => {
    const seen = [];
    for (let steps = 0; steps < COUNTDOWN_STEPS + GO_STEPS + 10; steps++) {
      const { label } = countdownAt(steps);
      if (seen.at(-1) !== label) {
        seen.push(label);
      }
    }
    expect(seen).toEqual(["3", "2", "1", "GO!", ""]);
  });
});

describe("when the race begins", () => {
  it("is not racing at any step before GO", () => {
    for (let steps = 0; steps < COUNTDOWN_STEPS; steps++) {
      expect(countdownAt(steps).racing).toBe(false);
    }
  });

  it("is racing from the very step GO! appears, and stays racing", () => {
    expect(countdownAt(COUNTDOWN_STEPS).racing).toBe(true);
    expect(countdownAt(COUNTDOWN_STEPS + GO_STEPS).racing).toBe(true);
    expect(countdownAt(100000).racing).toBe(true);
  });
});

describe("the countdown refuses bad input", () => {
  it("refuses a step count below zero", () => {
    expect(() => countdownAt(-1)).toThrow(RangeError);
  });

  it("refuses a step count that is not a whole number", () => {
    expect(() => countdownAt(1.5)).toThrow(TypeError);
    expect(() => countdownAt(Infinity)).toThrow(TypeError);
  });

  it("refuses NaN, the 'not a number' result of a broken calculation", () => {
    expect(() => countdownAt(NaN)).toThrow(TypeError);
  });

  it("refuses something that is not a number, even if it looks like one", () => {
    expect(() => countdownAt("180")).toThrow(TypeError);
    expect(() => countdownAt(undefined)).toThrow(TypeError);
    expect(() => countdownAt(null)).toThrow(TypeError);
  });
});

describe("a race with a countdown", () => {
  it("begins with the racer at the start and the countdown at zero", () => {
    const race = createCountdownRace(TEST_OVAL);
    expect(race.racer).toEqual(createRacer(TEST_OVAL));
    expect(race.countdownSteps).toBe(0);
  });

  it("counts one countdown step for every step of the game", () => {
    const race = run(createCountdownRace(TEST_OVAL), NO_KEYS, 25);
    expect(race.countdownSteps).toBe(25);
  });

  it("does not change the race it is given, but gives back a new one", () => {
    const before = createCountdownRace(TEST_OVAL);
    const after = stepCountdownRace(TEST_OVAL, before, GAS, TEST_DRIVER);
    expect(before.countdownSteps).toBe(0);
    expect(after).not.toBe(before);
  });
});

describe("what must NOT happen before GO", () => {
  it("does not move the kart while the gas is held during 3, 2 and 1", () => {
    const start = createCountdownRace(TEST_OVAL);
    const race = run(start, GAS, COUNTDOWN_STEPS);
    expect(race.racer.kart).toEqual(start.racer.kart);
    expect(speedOf(race.racer.kart)).toBe(0);
  });

  it("does not move or turn the kart whichever keys are held", () => {
    const start = createCountdownRace(TEST_OVAL);
    const race = run(start, ALL_KEYS, COUNTDOWN_STEPS);
    expect(race.racer.kart).toEqual(start.racer.kart);
  });

  it("does not run the race clock during the countdown", () => {
    const race = run(createCountdownRace(TEST_OVAL), GAS, COUNTDOWN_STEPS);
    expect(race.racer.progress.steps).toBe(0);
  });

  it("gives no head start for holding the gas early: the kart is still at rest on the last step before GO", () => {
    const race = run(createCountdownRace(TEST_OVAL), GAS, COUNTDOWN_STEPS - 1);
    expect(countdownAt(race.countdownSteps).racing).toBe(false);
    const oneMore = stepCountdownRace(TEST_OVAL, race, GAS, TEST_DRIVER);
    expect(speedOf(oneMore.racer.kart)).toBe(0);
  });
});

describe("what happens from GO on", () => {
  it("moves the kart on the first step after the countdown when the gas is held", () => {
    const start = createCountdownRace(TEST_OVAL);
    const race = run(start, GAS, COUNTDOWN_STEPS + 1);
    expect(speedOf(race.racer.kart)).toBeGreaterThan(0);
    expect(race.racer.progress.steps).toBe(1);
  });

  it("drives exactly as a race without a countdown would, only three seconds later", () => {
    const stepsOfDriving = 120;
    const withCountdown = run(createCountdownRace(TEST_OVAL), GAS, COUNTDOWN_STEPS + stepsOfDriving);

    let without = createRacer(TEST_OVAL);
    for (let step = 0; step < stepsOfDriving; step++) {
      without = stepRacer(TEST_OVAL, without, GAS, TEST_DRIVER);
    }
    expect(withCountdown.racer).toEqual(without);
  });

  it("runs the race clock from GO even when no key is held", () => {
    const race = run(createCountdownRace(TEST_OVAL), NO_KEYS, COUNTDOWN_STEPS + 30);
    expect(race.racer.progress.steps).toBe(30);
    expect(speedOf(race.racer.kart)).toBe(0);
  });
});
