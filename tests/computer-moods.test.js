// Tests for the mood of the day (shared/computer-driver.js): each race,
// each computer kart drives its personality a little differently, so no two
// races are alike, but the same seed always gives the same race.

import { describe, it, expect } from "vitest";
import { PERSONALITIES, MOOD_SWING, moodFor, personalityOf, lookAround, createComputerDriver } from "../shared/computer-driver.js";
import { createPracticeRace, stepPracticeRace } from "../shared/practice-race.js";
import { createComputerPlayers } from "../server/computer-players.js";
import { createRoom } from "../server/room.js";
import { createCastKeeper } from "../server/cast-keeper.js";
import { createRacer } from "../shared/race.js";
import { CAST } from "../shared/cast.js";
import { TEST_DRIVER } from "../shared/characters.js";
import { TEST_OVAL } from "../shared/tracks/test-oval.js";
import { lookOfTrack } from "../client/track-looks.js";
import { routePoints } from "../client/route.js";

const LINE = routePoints(TEST_OVAL, lookOfTrack(TEST_OVAL).route);
const NO_KEYS = { gas: false, brake: false, left: false, right: false };
const DAREDEVIL = personalityOf("pcp");

describe("the mood of the day", () => {
  it("without a seed, is the personality as it is, aiming at the line", () => {
    for (const personality of PERSONALITIES) {
      expect(moodFor(personality, null, "pcp")).toEqual({ ...personality, aside: 0 });
    }
  });

  it("is the same every time for the same seed and character", () => {
    expect(moodFor(DAREDEVIL, 123, "pcp")).toEqual(moodFor(DAREDEVIL, 123, "pcp"));
  });

  it("changes from one race to the next", () => {
    const moods = new Set();
    for (let seed = 1; seed <= 20; seed++) {
      moods.add(JSON.stringify(moodFor(DAREDEVIL, seed, "pcp")));
    }
    expect(moods.size).toBe(20);
  });

  it("is different for each character in the same race", () => {
    const steady = personalityOf("dean");
    const asides = CAST.map((character) => moodFor(steady, 99, character.id).aside);
    expect(new Set(asides).size).toBe(CAST.length);
  });

  it("only moves each number a little (daring and care by 0.15, pace by 0.03, 10 units aside), and keeps it in range, whatever the seed", () => {
    expect(MOOD_SWING).toEqual({ daring: 0.15, care: 0.15, pace: 0.03, aside: 10 });
    for (const personality of PERSONALITIES) {
      for (let seed = 0; seed < 300; seed++) {
        const mood = moodFor(personality, seed * 104729, personality.name);
        expect(Math.abs(mood.daring - personality.daring)).toBeLessThanOrEqual(0.15 + 1e-9);
        expect(Math.abs(mood.care - personality.care)).toBeLessThanOrEqual(0.15 + 1e-9);
        expect(Math.abs(mood.pace - personality.pace)).toBeLessThanOrEqual(0.03 + 1e-9);
        expect(Math.abs(mood.aside)).toBeLessThanOrEqual(10);
        expect(mood.daring).toBeGreaterThanOrEqual(0);
        expect(mood.daring).toBeLessThanOrEqual(1);
        expect(mood.care).toBeGreaterThanOrEqual(0);
        expect(mood.care).toBeLessThanOrEqual(1);
        expect(mood.pace).toBeGreaterThanOrEqual(0.8);
        expect(mood.pace).toBeLessThanOrEqual(1);
      }
    }
  });

  it("keeps the character's personality name, and cannot be changed by other code", () => {
    const mood = moodFor(DAREDEVIL, 5, "pcp");
    expect(mood.name).toBe("Daredevil");
    expect(Object.isFrozen(mood)).toBe(true);
  });

  it("aims to the side of the racing line it likes: plus is to the right of the way it runs", () => {
    // On the top straight of the test oval the line runs to the right (+x),
    // so its right-hand side is further down the map (+y).
    const racer = { ...createRacer(TEST_OVAL), kart: { ...createRacer(TEST_OVAL).kart, x: 300, y: 80, vx: 200, vy: 0, angle: 0 }, spinSteps: 0 };
    const memory = createComputerDriver(DAREDEVIL).memory;
    const see = (aside) => lookAround(TEST_OVAL, racer, memory, LINE, [], [], TEST_DRIVER, aside).view.target;
    expect(see(10).y - see(0).y).toBeCloseTo(10, 5);
    expect(see(-10).y - see(0).y).toBeCloseTo(-10, 5);
    expect(see(10).x).toBeCloseTo(see(0).x, 5);
  });
});

describe("moods in a race", () => {
  /** The finishing times of the computer karts in a single race on the test oval with this seed. */
  function finishTimes(seed) {
    let race = createPracticeRace(TEST_OVAL, seed, LINE, 5, "ro");
    for (let step = 0; step < 90 * 60 && !race.racers.slice(1).every((racer) => racer.progress.finished); step++) {
      race = stepPracticeRace(TEST_OVAL, race, NO_KEYS, TEST_DRIVER);
    }
    return race.racers.slice(1).map((racer) => racer.progress.steps);
  }

  it("make two single races with different seeds end differently", () => {
    expect(finishTimes(1)).not.toEqual(finishTimes(2));
  });

  it("give each computer kart of a single race its own mood, from the race's seed", () => {
    const race = createPracticeRace(TEST_OVAL, 77, LINE, 5, "ro");
    for (const driver of race.drivers) {
      expect(driver.mood).toEqual(moodFor(driver.personality, 77, driver.character.id));
    }
  });

  it("make online races with different seeds end differently, and races without a seed alike", () => {
    /** An online room on the test oval with one person who does not drive, raced to the end. */
    function onlineTimes(seed) {
      const room = createRoom(TEST_OVAL, TEST_DRIVER, 8, () => 5); // the same bananas every time
      const { id } = room.addPlayer();
      const cast = createCastKeeper();
      const computers = createComputerPlayers(TEST_OVAL, LINE, TEST_DRIVER);
      computers.fill(room, cast, 6, seed);
      room.startRace(id);
      const finished = () => room.snapshot().karts.filter((kart) => computers.isComputer(kart.id)).every((kart) => kart.finished);
      for (let step = 0; step < 90 * 60 && !finished(); step++) {
        computers.drive(room);
        room.step();
      }
      return room.snapshot().karts.filter((kart) => computers.isComputer(kart.id)).map((kart) => kart.steps);
    }
    expect(onlineTimes(31)).not.toEqual(onlineTimes(32));
    expect(onlineTimes(null)).toEqual(onlineTimes(null));
    expect(onlineTimes(31)).toEqual(onlineTimes(31));
  });
});
