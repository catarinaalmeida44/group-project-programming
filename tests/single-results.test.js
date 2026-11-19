// Tests for server/single-results.js: is a reported single race one that
// could really have been driven?
//
// A single race runs in the player's browser, so the server cannot see it.
// Before it is saved for the player's own stats, the numbers must at least
// make sense. Most of these tests are things that must be REFUSED.

import { describe, it, expect } from "vitest";
import { singleResultProblem, fastestBelievableSteps, LONGEST_RACE_STEPS, FASTER_THAN_TOP_SPEED } from "../server/single-results.js";
import { TRACKS } from "../shared/tracks/index.js";
import { CAST } from "../shared/cast.js";
import { createPracticeRace, stepPracticeRace, COMPUTER_KARTS } from "../shared/practice-race.js";
import { fastestLapSteps } from "../shared/laps.js";
import { TEST_DRIVER } from "../shared/characters.js";
import { topSpeedOf, STEP_SECONDS } from "../shared/physics.js";
import { routePoints } from "../client/route.js";
import { lookOfTrack } from "../client/track-looks.js";

const NOVA = TRACKS["nova-lap"];
/** A result nothing is wrong with: three minutes on the Nova lap. */
const GOOD = { track: "nova-lap", raceSteps: 60 * 180, bestLapSteps: Math.floor((60 * 180) / NOVA.laps) - 100, position: 2, character: "dean" };

describe("a single race that could be real", () => {
  it("is believed", () => {
    expect(singleResultProblem(GOOD)).toBe(null);
  });

  it("is believed on every track, with every character, and in every place a race has", () => {
    for (const track of Object.keys(TRACKS)) {
      const raceSteps = fastestBelievableSteps(TRACKS[track]) * 3;
      const bestLapSteps = Math.floor(raceSteps / TRACKS[track].laps);
      for (const { id } of CAST) {
        for (let position = 1; position <= COMPUTER_KARTS + 1; position++) {
          const result = { track, raceSteps, bestLapSteps, position, character: id };
          expect(singleResultProblem(result), JSON.stringify(result)).toBe(null);
        }
      }
    }
  });

  it("is believed without a character: a player who never chose one has none", () => {
    expect(singleResultProblem({ ...GOOD, character: null })).toBe(null);
    const { character, ...withoutOne } = GOOD;
    expect(singleResultProblem(withoutOne)).toBe(null);
  });

  it("is believed at each of the three levels, and without one (an older page sends none)", () => {
    for (const level of ["easy", "normal", "hard", null, undefined]) {
      expect(singleResultProblem({ ...GOOD, level }), String(level)).toBe(null);
    }
  });

  it("is believed when every lap took exactly as long as the best one", () => {
    const raceSteps = NOVA.laps * 4000;
    expect(singleResultProblem({ ...GOOD, raceSteps, bestLapSteps: 4000 })).toBe(null);
  });
});

describe("a single race that cannot be real is refused", () => {
  const refused = (change) => singleResultProblem({ ...GOOD, ...change });

  it("when it is not a result at all", () => {
    for (const nothing of [null, undefined, "a race", 42, true]) {
      expect(typeof singleResultProblem(nothing), String(nothing)).toBe("string");
    }
    expect(typeof singleResultProblem([])).toBe("string");
    expect(typeof singleResultProblem({})).toBe("string");
  });

  it("on a track that does not exist", () => {
    for (const track of ["rainbow-road", "", "NOVA-LAP", " nova-lap", "toString", "constructor", "__proto__", null, undefined, 7, ["nova-lap"]]) {
      expect(refused({ track }), String(track)).toBe("no such track");
    }
  });

  it("with a time that is not a whole number of steps from 1 up to an hour", () => {
    for (const steps of [0, -1, 1.5, NaN, Infinity, "9000", null, undefined, LONGEST_RACE_STEPS + 1, 2 ** 53]) {
      expect(typeof refused({ raceSteps: steps }), `race ${String(steps)}`).toBe("string");
      expect(typeof refused({ bestLapSteps: steps }), `lap ${String(steps)}`).toBe("string");
    }
  });

  it("with a best lap that is too long for the race time", () => {
    // The laps add up to the race, and the best lap is the shortest of them.
    const raceSteps = NOVA.laps * 4000;
    expect(refused({ raceSteps, bestLapSteps: 4001 })).toBe("the best lap is too long for this race time");
    expect(refused({ raceSteps, bestLapSteps: raceSteps })).toBe("the best lap is too long for this race time");
  });

  it("when no kart is that fast", () => {
    const fastest = fastestBelievableSteps(NOVA);
    expect(refused({ raceSteps: fastest - 1, bestLapSteps: 1 })).toBe("no kart is that fast");
    expect(refused({ raceSteps: NOVA.laps, bestLapSteps: 1 })).toBe("no kart is that fast"); // a "race" of three steps
    expect(refused({ raceSteps: fastest, bestLapSteps: 1 })).toBe(null); // the fastest that is believed
  });

  it("in a place a single race does not have", () => {
    for (const position of [0, -1, COMPUTER_KARTS + 2, 100, 1.5, "1", null, undefined, NaN]) {
      expect(refused({ position }), String(position)).toBe("no such place");
    }
  });

  it("at a level the computer karts do not have", () => {
    for (const level of ["medium", "Easy", "HARD", " easy", "", "toString", 1, {}, ["hard"], true]) {
      expect(refused({ level }), String(level)).toBe("no such level");
    }
  });

  it("with a character that is not in the cast", () => {
    for (const character of ["mario", "PCP", " pcp", "", "toString", 3, {}, ["dean"], true]) {
      expect(refused({ character }), String(character)).toBe("no such character");
    }
  });
});

describe("the level a single race reports", () => {
  it("stays with the race from its first step to its last, so the page reports the level that was really driven", () => {
    const track = TRACKS["test-oval"];
    const line = routePoints(track, lookOfTrack(track).route);
    for (const level of ["easy", "normal", "hard"]) {
      let race = createPracticeRace(track, 3, line, COMPUTER_KARTS, "dean", level);
      for (let step = 0; step < 400; step++) {
        race = stepPracticeRace(track, race, { gas: true, brake: false, left: false, right: false }, TEST_DRIVER);
      }
      expect(race.level).toBe(level);
      expect(singleResultProblem({ track: "test-oval", raceSteps: 2000, bestLapSteps: 600, position: 2, character: "dean", level: race.level })).toBe(null);
    }
  });
});

describe("the fastest race that is believed", () => {
  /** How long the way round is, along the middle of the road. */
  function lapLength(track) {
    const line = routePoints(track, lookOfTrack(track).route);
    return line.reduce((sum, point, i) => {
      const next = line[(i + 1) % line.length];
      return sum + Math.hypot(next.x - point.x, next.y - point.y);
    }, 0);
  }

  it("is, on every track, all laps at twice the top speed of a kart", () => {
    expect(FASTER_THAN_TOP_SPEED).toBe(2);
    for (const [name, track] of Object.entries(TRACKS)) {
      const steps = fastestBelievableSteps(track);
      // How far a kart gets in one step at top speed, with the one driver everybody uses.
      const unitsPerStep = topSpeedOf(TEST_DRIVER) * STEP_SECONDS;
      const expected = (track.laps * lapLength(track)) / (unitsPerStep * 2);
      expect(Math.abs(steps - expected), name).toBeLessThanOrEqual(1);
      expect(steps, name).toBeGreaterThan(60 * 5); // never under five seconds
    }
  });

  it("is one step for each lap on a track that has no route", () => {
    const noRoute = { ...TRACKS["test-oval"], name: "A track without a look" };
    expect(lookOfTrack(noRoute).route ?? null).toBe(null);
    expect(fastestBelievableSteps(noRoute)).toBe(noRoute.laps);
  });

  // A whole race of computer karts takes a moment to work out.
  it("is well under what the computer karts really drive, so no real race is refused", () => {
    for (const [name, track] of Object.entries(TRACKS)) {
      const line = routePoints(track, lookOfTrack(track).route);
      let race = createPracticeRace(track, 7, line, COMPUTER_KARTS, "dean");
      const computers = () => race.racers.slice(1);
      for (let step = 0; step < 60 * 60 * 6 && !computers().every((racer) => racer.progress.finished); step++) {
        race = stepPracticeRace(track, race, { gas: false, brake: false, left: false, right: false }, TEST_DRIVER);
      }
      expect(computers().every((racer) => racer.progress.finished), name).toBe(true);
      const fastest = Math.min(...computers().map((racer) => racer.progress.steps));
      // The computer karts drive near top speed. The limit is at least a third faster still.
      expect(fastestBelievableSteps(track) * 1.33, name).toBeLessThan(fastest);
      // And each of their results would be believed, in the place it had.
      computers()
        .map((racer) => racer.progress)
        .sort((a, b) => a.steps - b.steps)
        .forEach((progress, index) => {
          const result = { track: name, raceSteps: progress.steps, bestLapSteps: fastestLapSteps(progress.lapSteps), position: index + 1, character: "pcp" };
          expect(singleResultProblem(result), `${name}: ${JSON.stringify(result)}`).toBe(null);
        });
    }
  }, 60000);
});
