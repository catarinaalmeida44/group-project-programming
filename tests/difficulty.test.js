// Tests for the levels of the computer karts in a single race (Easy, Normal,
// Hard): shared/computer-driver.js, shared/practice-race.js and client/difficulty.js.

import { describe, it, expect } from "vitest";
import { LEVELS, DEFAULT_LEVEL, LEVEL_SHIFT, isLevel, atLevel, moodFor, PERSONALITIES, personalityOf } from "../shared/computer-driver.js";
import { createPracticeRace, stepPracticeRace } from "../shared/practice-race.js";
import { readLevel, saveLevel, levelButtons, LEVEL_WORDS } from "../client/difficulty.js";
import { tileKindAt } from "../shared/track.js";
import { speedOf, topSpeedOf } from "../shared/physics.js";
import { TEST_DRIVER } from "../shared/characters.js";
import { TEST_OVAL } from "../shared/tracks/test-oval.js";
import { CAMPUS_LOOP } from "../shared/tracks/campus-loop.js";
import { lookOfTrack } from "../client/track-looks.js";
import { routePoints } from "../client/route.js";

const NO_KEYS = { gas: false, brake: false, left: false, right: false };
const lineOf = (track) => routePoints(track, lookOfTrack(track).route);

/** A pretend browser storage: a Map behind getItem and setItem. */
function pretendStorage(start = {}) {
  const kept = new Map(Object.entries(start));
  return { getItem: (key) => (kept.has(key) ? kept.get(key) : null), setItem: (key, value) => kept.set(key, value), kept };
}

describe("the levels", () => {
  it("are Easy, Normal and Hard, and Normal is the default", () => {
    expect(LEVELS).toEqual(["easy", "normal", "hard"]);
    expect(DEFAULT_LEVEL).toBe("normal");
    expect(Object.isFrozen(LEVELS)).toBe(true);
    expect(Object.isFrozen(LEVEL_SHIFT)).toBe(true);
  });

  it("are only the exact words", () => {
    for (const level of LEVELS) {
      expect(isLevel(level)).toBe(true);
    }
    for (const wrong of ["Easy", "HARD", "", "medium", "toString", null, undefined, 1, ["easy"]]) {
      expect(isLevel(wrong), String(wrong)).toBe(false);
    }
  });

  it("leave a personality exactly as it is on Normal", () => {
    const daredevil = personalityOf("pcp");
    expect(atLevel(daredevil, "normal")).toBe(daredevil);
  });

  it("make every personality slower, less daring and more careful on Easy, and the other way on Hard", () => {
    for (const personality of PERSONALITIES) {
      const easy = atLevel(personality, "easy");
      const hard = atLevel(personality, "hard");
      expect(easy.pace, personality.name).toBeLessThan(personality.pace);
      expect(easy.daring).toBeLessThanOrEqual(personality.daring);
      expect(easy.care).toBeGreaterThanOrEqual(personality.care);
      expect(hard.pace).toBeGreaterThanOrEqual(personality.pace);
      expect(hard.daring).toBeGreaterThanOrEqual(personality.daring);
      expect(hard.care).toBeLessThanOrEqual(personality.care);
    }
  });

  it("keep every number in range, for every personality in any mood", () => {
    for (const personality of PERSONALITIES) {
      for (let seed = 0; seed < 50; seed++) {
        for (const level of LEVELS) {
          const now = atLevel(moodFor(personality, seed * 7919, personality.name), level);
          expect(now.daring).toBeGreaterThanOrEqual(0);
          expect(now.daring).toBeLessThanOrEqual(1);
          expect(now.care).toBeGreaterThanOrEqual(0);
          expect(now.care).toBeLessThanOrEqual(1);
          expect(now.pace).toBeGreaterThanOrEqual(0.65);
          expect(now.pace).toBeLessThanOrEqual(1); // never faster than the kart can go: no cheating
        }
      }
    }
  });

  it("keep the character's personality and mood: the Daredevil is still the Daredevil, aiming where it likes", () => {
    const mood = moodFor(personalityOf("pcp"), 42, "pcp");
    const easy = atLevel(mood, "easy");
    expect(easy.name).toBe("Daredevil");
    expect(easy.aside).toBe(mood.aside);
    expect(Object.isFrozen(easy)).toBe(true);
  });

  it("refuse a level that does not exist", () => {
    for (const wrong of ["Easy", "impossible", null, 2]) {
      expect(() => atLevel(personalityOf("pcp"), wrong), String(wrong)).toThrow(/easy, normal or hard/);
    }
  });
});

describe("levels in a single race", () => {
  /** The finishing times of the computer karts on the test oval at a level, with the same bananas. */
  function finishTimes(level, seed = 11) {
    let race = createPracticeRace(TEST_OVAL, seed, lineOf(TEST_OVAL), 5, "ro", level);
    for (let step = 0; step < 90 * 60 && !race.racers.slice(1).every((racer) => racer.progress.finished); step++) {
      race = stepPracticeRace(TEST_OVAL, race, NO_KEYS, TEST_DRIVER);
    }
    return race.racers.slice(1).map((racer) => racer.progress.steps);
  }
  const average = (numbers) => numbers.reduce((sum, each) => sum + each, 0) / numbers.length;

  it("is Normal when no level is given, and says which level it is", () => {
    expect(createPracticeRace(TEST_OVAL, 1, lineOf(TEST_OVAL)).level).toBe("normal");
    expect(createPracticeRace(TEST_OVAL, 1, lineOf(TEST_OVAL), 5, null, "hard").level).toBe("hard");
  });

  it("gives every computer kart its mood of the day at that level", () => {
    const race = createPracticeRace(TEST_OVAL, 77, lineOf(TEST_OVAL), 5, "ro", "easy");
    for (const driver of race.drivers) {
      expect(driver.mood).toEqual(atLevel(moodFor(driver.personality, 77, driver.character.id), "easy"));
    }
  });

  it("refuses a level that does not exist", () => {
    for (const wrong of ["Easy", "medium", null]) {
      expect(() => createPracticeRace(TEST_OVAL, 1, lineOf(TEST_OVAL), 5, null, wrong), String(wrong)).toThrow(/easy, normal or hard/);
    }
  });

  it("makes the computer karts finish later on Easy and sooner on Hard than on Normal", () => {
    const easy = average(finishTimes("easy"));
    const normal = average(finishTimes("normal"));
    const hard = average(finishTimes("hard"));
    expect(easy).toBeGreaterThan(normal * 1.08); // clearly slower: at least 8%
    expect(hard).toBeLessThan(normal);
  });

  for (const level of ["easy", "hard"]) {
    it(`on ${level}, every computer kart still finishes the campus loop, never inside a wall, never driving faster than a player could`, () => {
      const track = CAMPUS_LOOP;
      let race = createPracticeRace(track, 5, lineOf(track), 5, "ro", level);
      let wallMoments = 0;
      let fastest = 0;
      for (let step = 0; step < 200 * 60 && !race.racers.slice(1).every((racer) => racer.progress.finished); step++) {
        race = stepPracticeRace(track, race, NO_KEYS, TEST_DRIVER);
        for (const racer of race.racers.slice(1)) {
          wallMoments += tileKindAt(track, racer.kart.x, racer.kart.y) === "wall" ? 1 : 0;
          // A bump from another kart can push a kart a little past top speed
          // (shared/bumps.js, the same for players), so only count moments
          // with no other kart close by: then it is the driving alone.
          const bumped = race.racers.some((other) => other !== racer && Math.hypot(other.kart.x - racer.kart.x, other.kart.y - racer.kart.y) < 40);
          if (!bumped) {
            fastest = Math.max(fastest, speedOf(racer.kart));
          }
        }
      }
      expect(race.racers.slice(1).every((racer) => racer.progress.finished)).toBe(true);
      expect(wallMoments).toBe(0);
      expect(fastest).toBeLessThanOrEqual(topSpeedOf(TEST_DRIVER) + 1);
    });
  }
});

describe("choosing the level on the race page", () => {
  it("is Normal when nothing was saved, or something that is not a level", () => {
    expect(readLevel(pretendStorage())).toBe("normal");
    expect(readLevel(null)).toBe("normal");
    expect(readLevel(pretendStorage({ "kart-level": '{"level":"impossible"}' }))).toBe("normal");
    expect(readLevel(pretendStorage({ "kart-level": "not even data" }))).toBe("normal");
  });

  it("remembers the level chosen", () => {
    const storage = pretendStorage();
    expect(saveLevel(storage, "hard")).toBe(true);
    expect(readLevel(storage)).toBe("hard");
  });

  it("refuses to remember something that is not a level", () => {
    const storage = pretendStorage();
    expect(() => saveLevel(storage, "Hard")).toThrow(/not a level/);
    expect(storage.kept.size).toBe(0);
  });

  it("shows three buttons, Easy, Normal and Hard, with only the level in use pressed", () => {
    const buttons = levelButtons("easy");
    expect(buttons.map((each) => each.words)).toEqual(["Easy", "Normal", "Hard"]);
    expect(buttons.filter((each) => each.pressed).map((each) => each.level)).toEqual(["easy"]);
    expect(LEVEL_WORDS.normal).toBe("Normal");
  });
});
