// Tests for shared/two-player-race.js: two people on one computer, with or
// without computer karts.

import { describe, it, expect } from "vitest";
import {
  PLAYERS,
  COMPUTER_KARTS_FOR_TWO,
  WAIT_FOR_COMPUTERS_STEPS,
  createTwoPlayerRace,
  stepTwoPlayerRace,
  twoPlayerRaceIsOver,
  twoPlayerEndsIn,
  twoPlayerKarts,
} from "../shared/two-player-race.js";
import { COUNTDOWN_STEPS } from "../shared/countdown.js";
import { FINISH_WINDOW_STEPS, RACE_LIMIT_STEPS } from "../shared/race-time.js";
import { gridSpot } from "../shared/grid.js";
import { speedOf } from "../shared/physics.js";
import { CAST } from "../shared/cast.js";
import { createComputerDriver, decide, personalityOf } from "../shared/computer-driver.js";
import { TEST_DRIVER } from "../shared/characters.js";
import { TEST_OVAL } from "../shared/tracks/test-oval.js";
import { lookOfTrack } from "../client/track-looks.js";
import { routePoints } from "../client/route.js";
import { standings } from "../client/standings.js";

const NO_KEYS = { gas: false, brake: false, left: false, right: false };
const GAS = { ...NO_KEYS, gas: true };
const LINE = routePoints(TEST_OVAL, lookOfTrack(TEST_OVAL).route);

const newRace = (computers = COMPUTER_KARTS_FOR_TWO, characters = ["ro", "dean"], level = "normal", seed = 7) =>
  createTwoPlayerRace(TEST_OVAL, seed, LINE, computers, characters, level);

/** Steps a race this many times with the same keys. */
function run(race, steps, inputs = [NO_KEYS, NO_KEYS]) {
  let now = race;
  for (let step = 0; step < steps; step++) {
    now = stepTwoPlayerRace(TEST_OVAL, now, inputs, TEST_DRIVER);
  }
  return now;
}

/** A race just after GO: the countdown is over, nobody has moved yet. */
const afterGo = (race = newRace()) => ({ ...race, countdownSteps: COUNTDOWN_STEPS });

/** The same race with these racers marked as finished, standing still. */
function withFinished(race, ids, steps = 3000) {
  return {
    ...race,
    racers: race.racers.map((racer, id) =>
      ids.includes(id) ? { ...racer, kart: { ...racer.kart, vx: 0, vy: 0 }, progress: { ...racer.progress, finished: true, steps: steps + id } } : racer,
    ),
  };
}

describe("starting a two-player race", () => {
  it("has two players and four computer karts: six karts in all", () => {
    expect(PLAYERS).toBe(2);
    expect(COMPUTER_KARTS_FOR_TWO).toBe(4);
    const race = newRace();
    expect(race.racers).toHaveLength(6);
    expect(race.drivers).toHaveLength(4);
  });

  it("puts the computer karts on the front of the grid", () => {
    const race = newRace();
    for (let number = 0; number < 4; number++) {
      const spot = gridSpot(TEST_OVAL, number);
      expect(race.racers[number + 2].kart).toMatchObject({ x: spot.x, y: spot.y });
    }
  });

  it("puts the two players side by side in the row behind, player 1 on the left: nobody has a head start", () => {
    const race = newRace();
    const left = gridSpot(TEST_OVAL, 4);
    const right = gridSpot(TEST_OVAL, 5);
    expect(race.racers[0].kart).toMatchObject({ x: left.x, y: left.y });
    expect(race.racers[1].kart).toMatchObject({ x: right.x, y: right.y });
  });

  it("keeps the players side by side with an odd number of computer karts too", () => {
    const race = newRace(3);
    expect(race.drivers).toHaveLength(3);
    expect(race.racers[0].kart).toMatchObject({ x: gridSpot(TEST_OVAL, 4).x, y: gridSpot(TEST_OVAL, 4).y });
    expect(race.racers[1].kart).toMatchObject({ x: gridSpot(TEST_OVAL, 5).x, y: gridSpot(TEST_OVAL, 5).y });
  });

  it("puts the players on the front row when there are no computer karts", () => {
    const race = newRace(0);
    expect(race.racers).toHaveLength(2);
    expect(race.drivers).toEqual([]);
    expect(race.racers[0].kart).toMatchObject({ x: gridSpot(TEST_OVAL, 0).x, y: gridSpot(TEST_OVAL, 0).y });
    expect(race.racers[1].kart).toMatchObject({ x: gridSpot(TEST_OVAL, 1).x, y: gridSpot(TEST_OVAL, 1).y });
  });

  it("makes the computer karts the four characters neither player chose, each once", () => {
    for (const first of CAST) {
      for (const second of CAST.filter((character) => character.id !== first.id)) {
        const race = newRace(4, [first.id, second.id]);
        const theirs = race.drivers.map((driver) => driver.character.id);
        expect(theirs).not.toContain(first.id);
        expect(theirs).not.toContain(second.id);
        expect(new Set(theirs).size).toBe(4);
      }
    }
  });

  it("lets each computer kart drive with the personality of its character", () => {
    for (const driver of newRace().drivers) {
      expect(driver.personality).toBe(personalityOf(driver.character.id));
    }
  });

  it("never has more than six karts, however many computer karts are asked for", () => {
    expect(newRace(20).racers).toHaveLength(6);
  });

  it("has no computer karts on a track without a racing line: they would not know the way", () => {
    expect(createTwoPlayerRace(TEST_OVAL, 7, null, 4, ["ro", "dean"]).racers).toHaveLength(2);
    expect(createTwoPlayerRace(TEST_OVAL, 7, [{ x: 1, y: 1 }], 4, ["ro", "dean"]).racers).toHaveLength(2);
  });

  it("can be started by players without a character", () => {
    expect(newRace(4, [null, null]).racers).toHaveLength(6);
    expect(newRace(4, ["ro", null]).drivers.map((driver) => driver.character.id)).not.toContain("ro");
  });

  it("refuses the same character for both players", () => {
    expect(() => newRace(4, ["ro", "ro"])).toThrow(RangeError);
  });

  it("refuses characters that are not in the cast, and anything that is not two characters", () => {
    for (const characters of [["ro", "nobody"], ["ro"], ["ro", "dean", "pcp"], "ro", null, [1, 2], ["ro", undefined]]) {
      expect(() => newRace(4, characters)).toThrow(RangeError);
    }
  });

  it("refuses a level that is not easy, normal or hard", () => {
    for (const level of ["medium", "Hard", "", null, 3]) {
      expect(() => newRace(4, ["ro", "dean"], level)).toThrow(RangeError);
    }
  });

  it("refuses a number of computer karts that is not a whole number from 0 up", () => {
    for (const computers of [-1, 2.5, "4", null, NaN]) {
      expect(() => newRace(computers)).toThrow(RangeError);
    }
  });

  it("remembers the level and the characters, and starts with every clock at zero", () => {
    const race = newRace(4, ["cici", "pcp"], "hard");
    expect(race).toMatchObject({ level: "hard", characters: ["cici", "pcp"], countdownSteps: 0, raceSteps: 0, firstFinishAt: null, playersDoneAt: null, over: false });
  });
});

describe("the countdown of a two-player race", () => {
  it("lets nobody move during 3, 2 and 1, whatever keys are held", () => {
    const start = newRace();
    const waiting = run(start, COUNTDOWN_STEPS, [GAS, GAS]);
    expect(waiting.racers.map((racer) => racer.kart)).toEqual(start.racers.map((racer) => racer.kart));
    expect(waiting.raceSteps).toBe(0);
    expect(waiting.racers.every((racer) => racer.progress.steps === 0)).toBe(true);
  });

  it("starts the race clock at GO", () => {
    expect(run(newRace(), COUNTDOWN_STEPS + 10).raceSteps).toBe(10);
  });
});

describe("the keys of the two players", () => {
  it("move only their own kart: player 1's keys do nothing to player 2's kart", () => {
    const start = afterGo(newRace(0));
    const after = run(start, 30, [GAS, NO_KEYS]);
    expect(speedOf(after.racers[0].kart)).toBeGreaterThan(0);
    expect(after.racers[1].kart).toEqual(start.racers[1].kart);
  });

  it("move only their own kart: player 2's keys do nothing to player 1's kart", () => {
    const start = afterGo(newRace(0));
    const after = run(start, 30, [NO_KEYS, GAS]);
    expect(speedOf(after.racers[1].kart)).toBeGreaterThan(0);
    expect(after.racers[0].kart).toEqual(start.racers[0].kart);
  });

  it("can be different at the same moment: one steers left while the other steers right", () => {
    const start = afterGo(newRace(0));
    const after = run(start, 40, [{ ...GAS, left: true }, { ...GAS, right: true }]);
    const turned = (id) => after.racers[id].kart.angle - start.racers[id].kart.angle;
    expect(turned(0)).toBeLessThan(0);
    expect(turned(1)).toBeGreaterThan(0);
  });

  it("count as no keys when they are missing, so the race never breaks on them", () => {
    const start = afterGo(newRace(0));
    for (const inputs of [undefined, null, [], [null, null], [undefined, GAS], "gas"]) {
      expect(() => run(start, 5, inputs)).not.toThrow();
    }
    const after = run(start, 30, [undefined, GAS]);
    expect(after.racers[0].kart).toEqual(start.racers[0].kart);
    expect(speedOf(after.racers[1].kart)).toBeGreaterThan(0);
  });

  it("cannot drive a computer kart: only the first two sets of keys are looked at", () => {
    const start = afterGo();
    const brake = { ...NO_KEYS, brake: true };
    const braking = run(start, 60, [NO_KEYS, NO_KEYS, brake, brake, brake, brake]);
    const free = run(start, 60, [NO_KEYS, NO_KEYS]);
    expect(braking.racers.slice(2).map((racer) => racer.kart)).toEqual(free.racers.slice(2).map((racer) => racer.kart));
    expect(speedOf(braking.racers[2].kart)).toBeGreaterThan(0);
  });

  it("do nothing any more for a player who has finished", () => {
    const start = withFinished(afterGo(newRace(0)), [0]);
    const after = run(start, 30, [GAS, NO_KEYS]);
    expect(after.racers[0].kart).toEqual(start.racers[0].kart);
  });
});

describe("a step of a two-player race", () => {
  it("does not change the race it was given", () => {
    const start = afterGo();
    const copy = JSON.stringify(start);
    stepTwoPlayerRace(TEST_OVAL, start, [GAS, GAS], TEST_DRIVER);
    expect(JSON.stringify(start)).toBe(copy);
  });

  it("is the same every time for the same race and the same keys", () => {
    const one = run(afterGo(), 300, [GAS, { ...GAS, left: true }]);
    const two = run(afterGo(), 300, [GAS, { ...GAS, left: true }]);
    expect(JSON.stringify(one.racers)).toBe(JSON.stringify(two.racers));
  });

  it("moves the computer karts by themselves", () => {
    const after = run(afterGo(), 120);
    for (const racer of after.racers.slice(2)) {
      expect(speedOf(racer.kart)).toBeGreaterThan(0);
    }
  });
});

describe("the level of the computer karts in a two-player race", () => {
  /** The race times of the four computer karts added together, in steps, with both players standing still. */
  function computerTimesAt(level) {
    let race = newRace(4, ["ro", "dean"], level, 5);
    for (let step = 0; step < 120 * 60 && !race.racers.slice(2).every((racer) => racer.progress.finished); step++) {
      race = stepTwoPlayerRace(TEST_OVAL, race, [NO_KEYS, NO_KEYS], TEST_DRIVER);
    }
    expect(race.racers.slice(2).every((racer) => racer.progress.finished)).toBe(true);
    return race.racers.slice(2).reduce((sum, racer) => sum + racer.progress.steps, 0);
  }

  it("makes them faster on Hard than on Normal, and slower on Easy", () => {
    const easy = computerTimesAt("easy");
    const normal = computerTimesAt("normal");
    const hard = computerTimesAt("hard");
    expect(hard).toBeLessThan(normal);
    expect(normal).toBeLessThan(easy);
  });
});

describe("when a two-player race is over", () => {
  const racers = (finished) => finished.map((done) => ({ progress: { finished: done } }));

  it("is not while anyone is still driving and no time limit has run out", () => {
    expect(twoPlayerRaceIsOver(racers([false, false, false, false]), 500, null, null)).toBe(false);
    expect(twoPlayerRaceIsOver(racers([true, false, true, true]), 5000, 4000, null)).toBe(false);
  });

  it("is when every kart has finished", () => {
    expect(twoPlayerRaceIsOver(racers([true, true, true, true]), 5000, 4000, 4900)).toBe(true);
    expect(twoPlayerRaceIsOver(racers([true, true]), 5000, 4000, 5000)).toBe(true);
  });

  it("is when both players have finished and have waited 30 seconds for the computer karts", () => {
    expect(WAIT_FOR_COMPUTERS_STEPS).toBe(30 * 60);
    const waiting = racers([true, true, false, false]);
    expect(twoPlayerRaceIsOver(waiting, 4000 + WAIT_FOR_COMPUTERS_STEPS - 1, 3500, 4000)).toBe(false);
    expect(twoPlayerRaceIsOver(waiting, 4000 + WAIT_FOR_COMPUTERS_STEPS, 3500, 4000)).toBe(true);
  });

  it("is two minutes after the first kart finished, even when a player never finishes", () => {
    const stuck = racers([true, false, true, true]);
    expect(twoPlayerRaceIsOver(stuck, 3000 + FINISH_WINDOW_STEPS - 1, 3000, null)).toBe(false);
    expect(twoPlayerRaceIsOver(stuck, 3000 + FINISH_WINDOW_STEPS, 3000, null)).toBe(true);
  });

  it("is ten minutes after GO at the latest, even when nobody ever finishes", () => {
    const nobody = racers([false, false]);
    expect(twoPlayerRaceIsOver(nobody, RACE_LIMIT_STEPS - 1, null, null)).toBe(false);
    expect(twoPlayerRaceIsOver(nobody, RACE_LIMIT_STEPS, null, null)).toBe(true);
  });
});

describe("the clocks of a two-player race", () => {
  it("note the moment the first kart finishes, whoever it is", () => {
    const start = withFinished({ ...afterGo(), raceSteps: 2000 }, [3]);
    const after = run(start, 1);
    expect(after.firstFinishAt).toBe(2001);
    expect(after.playersDoneAt).toBeNull();
    expect(run(after, 50).firstFinishAt).toBe(2001); // and never move it afterwards
  });

  it("note the moment both players have finished, not when only one has", () => {
    const one = run(withFinished({ ...afterGo(), raceSteps: 2000 }, [0]), 1);
    expect(one.playersDoneAt).toBeNull();
    const both = run(withFinished(one, [0, 1]), 1);
    expect(both.playersDoneAt).toBe(2002);
    expect(both.firstFinishAt).toBe(2001);
    expect(both.over).toBe(false); // the computer karts are still driving
  });

  it("end the race when every kart has finished", () => {
    const after = run(withFinished(afterGo(), [0, 1, 2, 3, 4, 5]), 1);
    expect(after.over).toBe(true);
  });

  it("end the race 30 seconds after both players finished, if the computer karts are not home by then", () => {
    // Computer karts that never arrive: the players wait, then the race is over.
    let race = run(withFinished({ ...afterGo(newRace(0)), raceSteps: 100 }, [0, 1]), 1);
    expect(race.over).toBe(true); // with no computer karts, everyone has finished
    race = { ...withFinished(afterGo(), [0, 1]), raceSteps: 100, firstFinishAt: 50, playersDoneAt: 60 };
    const justBefore = { ...race, raceSteps: 60 + WAIT_FOR_COMPUTERS_STEPS - 2 };
    expect(run(justBefore, 1).over).toBe(false);
    expect(run(justBefore, 2).over).toBe(true);
  });

  it("change nothing once the race is over: the same race comes back", () => {
    const over = run(withFinished(afterGo(), [0, 1, 2, 3, 4, 5]), 1);
    expect(stepTwoPlayerRace(TEST_OVAL, over, [GAS, GAS], TEST_DRIVER)).toBe(over);
  });
});

describe("how long a two-player race still lasts", () => {
  it("is not known while nobody has finished", () => {
    expect(twoPlayerEndsIn(run(afterGo(), 100))).toBeNull();
  });

  it("is two minutes from the moment the first kart finishes, and counts down", () => {
    const race = { ...afterGo(), raceSteps: 3000, firstFinishAt: 3000 };
    expect(twoPlayerEndsIn(race)).toBe(FINISH_WINDOW_STEPS);
    expect(twoPlayerEndsIn({ ...race, raceSteps: 3600 })).toBe(FINISH_WINDOW_STEPS - 600);
  });

  it("is at most 30 seconds once both players have finished", () => {
    const race = { ...afterGo(), raceSteps: 3100, firstFinishAt: 3000, playersDoneAt: 3100 };
    expect(twoPlayerEndsIn(race)).toBe(WAIT_FOR_COMPUTERS_STEPS);
  });

  it("is shown in the last two minutes before the ten-minute limit, even if nobody has finished", () => {
    expect(twoPlayerEndsIn({ ...afterGo(), raceSteps: RACE_LIMIT_STEPS - 600 })).toBe(600);
    expect(twoPlayerEndsIn({ ...afterGo(), raceSteps: RACE_LIMIT_STEPS - FINISH_WINDOW_STEPS - 1 })).toBeNull();
  });

  it("is nothing once the race is over", () => {
    expect(twoPlayerEndsIn({ ...afterGo(), over: true })).toBe(0);
  });
});

describe("the karts of a two-player race, for the places and the podium", () => {
  it("are the players as karts 0 and 1 with their own characters, then the computer karts with theirs", () => {
    const race = newRace(4, ["cici", "pcp"]);
    const karts = twoPlayerKarts(race);
    expect(karts.map((kart) => kart.id)).toEqual([0, 1, 2, 3, 4, 5]);
    expect(karts[0].character).toBe("cici");
    expect(karts[1].character).toBe("pcp");
    expect(karts.slice(2).map((kart) => kart.character)).toEqual(race.drivers.map((driver) => driver.character.id));
    expect(new Set(karts.map((kart) => kart.character)).size).toBe(6);
  });

  it("say where each kart is and how far it has come", () => {
    const [first] = twoPlayerKarts(newRace());
    expect(first).toMatchObject({ finished: false, steps: 0, lapsDone: 0 });
    expect(Number.isFinite(first.x) && Number.isFinite(first.y)).toBe(true);
    expect(Number.isInteger(first.passed)).toBe(true);
  });

  it("have no character for a player without one", () => {
    expect(twoPlayerKarts(newRace(4, [null, "pcp"]))[0].character).toBeNull();
  });
});

describe("a whole two-player race, driven to the end", () => {
  it("is over when every kart has finished, with the two players in the results like everyone else", () => {
    // Both players are driven by the same brain as the computer karts, to have someone who knows the way.
    let race = newRace(4, ["ro", "dean"], "normal", 3);
    let robots = [createComputerDriver(personalityOf("ro")), createComputerDriver(personalityOf("dean"))];
    let steps = 0;
    while (!race.over && steps < 6 * 60 * 60) {
      const karts = race.racers.map((racer) => racer.kart);
      const inputs = [0, 1].map((player) => {
        const others = karts.filter((_, other) => other !== player);
        const decision = decide(robots[player], TEST_OVAL, race.racers[player], LINE, others, race.bananas, TEST_DRIVER);
        robots = robots.map((robot, index) => (index === player ? decision.driver : robot));
        return decision.keys;
      });
      race = stepTwoPlayerRace(TEST_OVAL, race, inputs, TEST_DRIVER);
      steps++;
    }
    expect(race.over).toBe(true);
    expect(race.racers.every((racer) => racer.progress.finished)).toBe(true);
    expect(race.playersDoneAt).not.toBeNull();
    expect(race.firstFinishAt).toBeLessThanOrEqual(race.playersDoneAt);
    const order = standings(twoPlayerKarts(race), TEST_OVAL);
    expect(order).toHaveLength(6);
    expect(order.map((kart) => kart.id).sort()).toEqual([0, 1, 2, 3, 4, 5]);
  });
});
