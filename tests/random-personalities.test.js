// Tests for dealing out the personalities of the computer karts again for
// every race (personalitiesInRace and personalityInRace in
// shared/computer-driver.js), decided by the team on 24 November 2026.
//
// They check that:
//   - every race has each of the six personalities exactly once (the field
//     stays balanced: never two Daredevils, never no Careful driver);
//   - the same seed always deals the same way, so a race can be played again;
//   - over many races every character gets every personality, about as
//     often as each other (so it really is a shuffle, and a fair one);
//   - with no seed nothing is shuffled (the old table), and an id that is
//     not a character gets no personality;
//   - single races and two-player races really use the dealt personalities.
// Online rooms call the same function (server/computer-players.js); the
// room does not show a kart's personality, so that is checked by reading.

import { describe, it, expect } from "vitest";
import { PERSONALITIES, PERSONALITY_OF_CHARACTER, personalityOf, personalitiesInRace, personalityInRace } from "../shared/computer-driver.js";
import { CAST } from "../shared/cast.js";
import { createPracticeRace } from "../shared/practice-race.js";
import { createTwoPlayerRace } from "../shared/two-player-race.js";
import { TEST_OVAL } from "../shared/tracks/test-oval.js";
import { lookOfTrack } from "../client/track-looks.js";
import { routePoints } from "../client/route.js";

const LINE = routePoints(TEST_OVAL, lookOfTrack(TEST_OVAL).route);
const SEEDS = Array.from({ length: 600 }, (_, index) => index * 7919 + 3);
const namesIn = (dealt) => Object.values(dealt).map((personality) => personality.name);

describe("dealing out the personalities for a race", () => {
  it("gives every character of the cast exactly one personality", () => {
    const dealt = personalitiesInRace(12345);
    expect(Object.keys(dealt).sort()).toEqual(CAST.map((character) => character.id).sort());
    expect(Object.isFrozen(dealt)).toBe(true);
  });

  it("uses each of the six personalities exactly once in every race", () => {
    const allNames = PERSONALITIES.map((personality) => personality.name).sort();
    for (const seed of SEEDS) {
      expect(namesIn(personalitiesInRace(seed)).sort(), String(seed)).toEqual(allNames);
    }
  });

  it("deals the very same personalities (not copies) the brain knows", () => {
    for (const personality of Object.values(personalitiesInRace(99))) {
      expect(PERSONALITIES).toContain(personality);
    }
  });

  it("always deals the same way for the same seed, so a race can be played again", () => {
    for (const seed of SEEDS.slice(0, 50)) {
      expect(personalitiesInRace(seed)).toEqual(personalitiesInRace(seed));
    }
  });

  it("does not deal the same way in every race", () => {
    const deals = new Set(SEEDS.map((seed) => namesIn(personalitiesInRace(seed)).join(",")));
    expect(deals.size).toBeGreaterThan(100);
  });

  it("gives every character every personality over many races, about equally often", () => {
    // 600 races and 6 personalities: about 100 each. A fair shuffle stays
    // well inside 60 to 140; a broken one (always the same, or lopsided) does not.
    for (const character of CAST) {
      const counts = new Map(PERSONALITIES.map((personality) => [personality.name, 0]));
      for (const seed of SEEDS) {
        const name = personalityInRace(character.id, seed).name;
        counts.set(name, counts.get(name) + 1);
      }
      for (const [name, count] of counts) {
        expect(count, `${character.id} as ${name}`).toBeGreaterThan(60);
        expect(count, `${character.id} as ${name}`).toBeLessThan(140);
      }
    }
  });

  it("shuffles nothing when there is no seed: the old table is used", () => {
    for (const id of Object.keys(PERSONALITY_OF_CHARACTER)) {
      expect(personalityInRace(id, null)).toBe(personalityOf(id));
      expect(personalityInRace(id, undefined)).toBe(personalityOf(id));
    }
  });

  it("gives no personality to an id that is not a character", () => {
    for (const wrong of ["nobody", "", null, undefined, 3, "toString", "__proto__"]) {
      expect(personalityInRace(wrong, 42), String(wrong)).toBe(null);
    }
  });
});

describe("races use the dealt personalities", () => {
  it("in a single race, each computer kart drives with what its character was dealt", () => {
    for (const seed of SEEDS.slice(0, 40)) {
      const race = createPracticeRace(TEST_OVAL, seed, LINE, 5, "ro");
      expect(race.drivers).toHaveLength(5);
      for (const driver of race.drivers) {
        expect(driver.personality, `${seed} ${driver.character.id}`).toBe(personalityInRace(driver.character.id, seed));
      }
    }
  });

  it("in a single race, the same character does not always get the same personality", () => {
    const pcpAs = new Set(
      SEEDS.slice(0, 60).map((seed) => createPracticeRace(TEST_OVAL, seed, LINE, 5, "ro").drivers.find((driver) => driver.character.id === "pcp").personality.name),
    );
    expect(pcpAs.size).toBeGreaterThan(1);
  });

  it("in a single race, the computer karts never share a personality", () => {
    for (const seed of SEEDS.slice(0, 40)) {
      const names = createPracticeRace(TEST_OVAL, seed, LINE, 5, "dean").drivers.map((driver) => driver.personality.name);
      expect(new Set(names).size, String(seed)).toBe(names.length);
    }
  });

  it("in a two-player race, each computer kart drives with what its character was dealt", () => {
    for (const seed of SEEDS.slice(0, 40)) {
      const race = createTwoPlayerRace(TEST_OVAL, seed, LINE, 4, ["ro", "dean"], "normal");
      expect(race.drivers.length).toBeGreaterThan(0);
      for (const driver of race.drivers) {
        expect(driver.personality, `${seed} ${driver.character.id}`).toBe(personalityInRace(driver.character.id, seed));
      }
    }
  });

  it("keeps the mood of the day and the level on top of the dealt personality", () => {
    const easy = createPracticeRace(TEST_OVAL, 77, LINE, 5, "ro", "easy").drivers;
    const hard = createPracticeRace(TEST_OVAL, 77, LINE, 5, "ro", "hard").drivers;
    for (let index = 0; index < easy.length; index++) {
      expect(easy[index].personality).toBe(hard[index].personality); // the same deal
      expect(easy[index].mood.name).toBe(easy[index].personality.name); // the mood is of that personality
      expect(easy[index].mood.pace).toBeLessThan(hard[index].mood.pace); // and the level still counts
    }
  });
});
