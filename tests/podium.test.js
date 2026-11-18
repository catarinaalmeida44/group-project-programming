// Tests for the podium at the end of a race: who stands on it and when it
// comes (client/podium.js), and the shapes of the scene in the Hovione
// Atrium (client/podium-shape.js). The painting itself (podium-view.js) is
// checked by eye in a browser.

import { describe, it, expect } from "vitest";
import {
  podiumLineup,
  podiumKartsOf,
  singleRaceIsOver,
  podiumCaption,
  PODIUM_SECONDS,
  WAIT_AFTER_YOU_SECONDS,
} from "../client/podium.js";
import {
  PODIUM_STEPS,
  STEP_WIDTH,
  STEP_DEPTH,
  CROWD_SIZE,
  crowdSpots,
  crowdPerson,
  hallParts,
  hallLabels,
  podiumDriver,
  podiumMoving,
} from "../client/podium-shape.js";
import { poseAt, trophyParts } from "../client/pilot-shape.js";
import { lookOfCharacter, hairOf, headOf, danceOf } from "../client/cast-choice.js";
import { LOOKS } from "../client/kart-shape.js";
import { createPracticeRace, stepPracticeRace } from "../shared/practice-race.js";
import { createComputerDriver, decide, personalityOf } from "../shared/computer-driver.js";
import { TEST_DRIVER } from "../shared/characters.js";
import { TEST_OVAL } from "../shared/tracks/test-oval.js";
import { lookOfTrack } from "../client/track-looks.js";
import { routePoints } from "../client/route.js";
import { formatTime } from "../client/format.js";
import { STEP_SECONDS } from "../shared/physics.js";

const STEPS_PER_SECOND = Math.round(1 / STEP_SECONDS);

/** A kart as the online page has it from the server. */
function kart(id, character, finished, steps, passed = 10) {
  return { id, character, place: id, finished, steps, passed, x: 0, y: 0 };
}

/** Every corner of a list of parts, and the top, bottom and sides of a ball or a head. */
function pointsOf(parts) {
  return parts.flatMap((one) => {
    if (one.faces) {
      return [...one.faces, ...(one.decals ?? [])].flatMap((face) => face.points);
    }
    const [x, y, z] = (one.ball ?? one.head).middle;
    const half = one.ball ? one.ball.radius : one.head.height / 2;
    return [
      [x, y, z],
      [x - half, y - half, z - half],
      [x + half, y + half, z + half],
    ];
  });
}

const lowest = (parts) => Math.min(...pointsOf(parts).map((point) => point[2]));
const part = (name, parts) => parts.find((one) => one.name === name);
const middleOf = (one) => {
  const points = pointsOf([one]);
  return [0, 1, 2].map((axis) => points.reduce((sum, point) => sum + point[axis], 0) / points.length);
};

describe("who stands on the podium", () => {
  it("is the first three to finish, the fastest on the top step", () => {
    const lineup = podiumLineup([kart(1, "dean", true, 4000), kart(2, "pcp", true, 3700), kart(3, "cici", true, 3900), kart(4, "ro", true, 4100)], TEST_OVAL);
    expect(lineup.map((driver) => [driver.place, driver.character])).toEqual([
      [1, "pcp"],
      [2, "cici"],
      [3, "dean"],
    ]);
  });

  it("never includes a kart that did not finish, even if it is in front on the track", () => {
    const lineup = podiumLineup([kart(1, "dean", true, 4000), kart(2, "pcp", false, 9000, 99), kart(3, "cici", true, 3900)], TEST_OVAL);
    expect(lineup.map((driver) => driver.character)).toEqual(["cici", "dean"]);
  });

  it("can be fewer than three, or nobody", () => {
    expect(podiumLineup([kart(1, "dean", true, 4000)], TEST_OVAL)).toHaveLength(1);
    expect(podiumLineup([kart(1, "dean", false, 4000)], TEST_OVAL)).toEqual([]);
    expect(podiumLineup([], TEST_OVAL)).toEqual([]);
  });

  it("gives each driver their name, colours, head picture, hair and dance", () => {
    const [winner] = podiumLineup([kart(1, "ro", true, 4000)], TEST_OVAL);
    expect(winner).toMatchObject({
      name: "Ró Versos",
      look: lookOfCharacter("ro"),
      hair: hairOf("ro"),
      head: headOf("ro"),
      dance: danceOf("ro"),
      steps: 4000,
    });
  });

  it("gives a kart that is no character its own colours and no head picture", () => {
    const [plain] = podiumLineup([kart(7, undefined, true, 4000)], TEST_OVAL);
    expect(plain).toMatchObject({ character: null, name: "Kart 7", head: null, dance: null, hair: null });
    expect(plain.look).toBe(LOOKS[7 % LOOKS.length]);
  });

  it("does not break on a strange list", () => {
    for (const strange of [null, undefined, "karts", [null, 3, "x"], [{}]]) {
      expect(() => podiumLineup(strange, TEST_OVAL), JSON.stringify(strange)).not.toThrow();
    }
    expect(podiumLineup([null, kart(1, "mario", true, 10)], TEST_OVAL)[0].character).toBe(null);
  });

  it("reads under the picture as places, names and times", () => {
    const lineup = podiumLineup([kart(1, "pcp", true, 3600), kart(2, "dean", true, 3660)], TEST_OVAL);
    expect(podiumCaption(lineup, formatTime)).toBe(`1st PCP ${formatTime(60)}  ·  2nd Dean ${formatTime(61)}`);
  });
});

describe("a single race", () => {
  const line = routePoints(TEST_OVAL, lookOfTrack(TEST_OVAL).route);

  it("puts the player's character and the computer karts' characters on the podium", () => {
    const race = createPracticeRace(TEST_OVAL, 1, line, 5, "pcp");
    const karts = podiumKartsOf(race, "pcp");
    expect(karts[0].character).toBe("pcp");
    expect(karts.slice(1).map((one) => one.character)).toEqual(race.drivers.map((driver) => driver.character.id));
    expect(podiumKartsOf(race, null)[0].character).toBe(null);
  });

  it("is not over before the player has finished, however long it takes", () => {
    const race = createPracticeRace(TEST_OVAL, 1, line, 5, "pcp");
    expect(singleRaceIsOver(race, 10_000_000)).toBe(false);
  });

  it("is over as soon as every kart has finished", () => {
    const race = createPracticeRace(TEST_OVAL, 1, line, 2, "pcp");
    const done = { ...race, racers: race.racers.map((racer) => ({ ...racer, progress: { ...racer.progress, finished: true } })) };
    expect(singleRaceIsOver(done, 0)).toBe(true);
  });

  it("waits for the computer karts after the player finished, but not for ever", () => {
    const race = createPracticeRace(TEST_OVAL, 1, line, 2, "pcp");
    const youDone = { ...race, racers: race.racers.map((racer, i) => (i === 0 ? { ...racer, progress: { ...racer.progress, finished: true } } : racer)) };
    const wait = WAIT_AFTER_YOU_SECONDS * STEPS_PER_SECOND;
    expect(singleRaceIsOver(youDone, 0)).toBe(false);
    expect(singleRaceIsOver(youDone, wait - 1)).toBe(false);
    expect(singleRaceIsOver(youDone, wait)).toBe(true);
  });

  it(
    "ends on the podium when a whole race is driven: three characters, all different, the fastest first",
    () => {
      // The computer drives the player's kart too, with PCP's personality.
      let race = createPracticeRace(TEST_OVAL, 3, line, 5, "pcp");
      let mine = createComputerDriver(personalityOf("pcp"));
      let finishedAt = null;
      let step = 0;
      while (step < 60 * STEPS_PER_SECOND * 6) {
        const others = race.racers.slice(1).map((racer) => racer.kart);
        const decision = decide(mine, TEST_OVAL, race.racers[0], line, others, race.bananas, TEST_DRIVER);
        mine = decision.driver;
        race = stepPracticeRace(TEST_OVAL, race, decision.keys, TEST_DRIVER);
        step++;
        if (finishedAt === null && race.racers[0].progress.finished) {
          finishedAt = step;
        }
        if (finishedAt !== null && singleRaceIsOver(race, step - finishedAt)) {
          break;
        }
      }
      expect(finishedAt).not.toBe(null);
      expect(singleRaceIsOver(race, step - finishedAt)).toBe(true);
      const lineup = podiumLineup(podiumKartsOf(race, "pcp"), TEST_OVAL);
      expect(lineup).toHaveLength(3);
      expect(new Set(lineup.map((driver) => driver.character)).size).toBe(3);
      expect(lineup.map((driver) => driver.place)).toEqual([1, 2, 3]);
      expect(lineup[0].steps).toBeLessThanOrEqual(lineup[1].steps);
      expect(lineup[1].steps).toBeLessThanOrEqual(lineup[2].steps);
    },
    60_000, // a whole race of six karts takes a few seconds to work out
  );
});

describe("online", () => {
  it("shows the podium on its own for a while before the results board", () => {
    expect(PODIUM_SECONDS).toBeGreaterThanOrEqual(5);
  });
});

describe("the podium in the atrium", () => {
  it("has the winner's step in the middle and highest, 2nd on the left and 3rd on the right of the camera", () => {
    const [first, second, third] = [1, 2, 3].map((place) => PODIUM_STEPS.find((step) => step.place === place));
    expect(first.y).toBe(0);
    expect(second.y).toBeGreaterThan(0); // positive is the camera's left
    expect(third.y).toBeLessThan(0);
    expect(first.height).toBeGreaterThan(second.height);
    expect(second.height).toBeGreaterThan(third.height);
  });

  it("has steps that do not overlap", () => {
    const sorted = [...PODIUM_STEPS].sort((a, b) => a.y - b.y);
    for (let i = 1; i < sorted.length; i++) {
      expect(sorted[i].y - sorted[i - 1].y).toBeGreaterThanOrEqual(STEP_WIDTH);
    }
  });

  it("has a floor, the back wall with glass, the three steps, and the NOVA SBE sign in our own letters", () => {
    const names = hallParts().map((one) => one.name);
    expect(names).toEqual(expect.arrayContaining(["floor", "back wall", "step 1", "step 2", "step 3"]));
    expect(part("back wall", hallParts()).decals.length).toBeGreaterThan(3);
    const texts = hallLabels().map((label) => label.text);
    expect(texts).toEqual(expect.arrayContaining(["NOVA SBE", "1", "2", "3"]));
  });
});

describe("a driver on the podium", () => {
  const driver = (place, extra = {}) => ({ place, look: lookOfCharacter("pcp"), hair: hairOf("pcp"), picture: { fake: "picture" }, dance: "siu", ...extra });

  it("stands on their own step, feet on its top", () => {
    for (const place of [1, 2, 3]) {
      const step = PODIUM_STEPS.find((one) => one.place === place);
      for (const seconds of [0, 0.4, 1.1]) {
        const parts = podiumDriver(driver(place, { dance: "clap" }), seconds);
        const shoes = [part("left shoe", parts), part("right shoe", parts)];
        expect(lowest(shoes)).toBeCloseTo(step.height);
        for (const [, y] of pointsOf(shoes)) {
          expect(Math.abs(y - step.y)).toBeLessThan(STEP_WIDTH / 2);
        }
      }
    }
  });

  it("has no helmet: neither on the head nor on the floor", () => {
    for (const place of [1, 2, 3]) {
      const parts = podiumDriver(driver(place), 0.5);
      expect(parts.some((one) => one.ball !== undefined), String(place)).toBe(false);
      expect(part("head", parts).head.picture).toEqual({ fake: "picture" });
    }
  });

  it("keeps a helmet on when they are no character, so no empty head is shown", () => {
    const parts = podiumDriver(driver(1, { picture: null, hair: null, dance: null, look: LOOKS[2] }), 0.5);
    expect(part("head", parts)).toBeUndefined();
    expect(part("helmet on the head", parts).ball.colour).toBe(LOOKS[2].helmet);
  });

  it("lifts the trophy when they won, high above the shoulders, and only then", () => {
    for (const seconds of [0, 0.3, 0.9, 1.6]) {
      const winner = podiumDriver(driver(1), seconds);
      const cup = part("trophy cup top", winner);
      expect(cup, String(seconds)).toBeDefined();
      expect(middleOf(cup)[2]).toBeGreaterThan(PODIUM_STEPS[0].height + 24); // above the head height of a standing pilot
      expect(part("trophy cup top", podiumDriver(driver(2), seconds))).toBeUndefined();
      expect(part("trophy cup top", podiumDriver(driver(3), seconds))).toBeUndefined();
    }
  });

  it("does their own dance when they came 2nd or 3rd", () => {
    // Ró Versos drives: the steering wheel is there.
    const ro = podiumDriver(driver(2, { dance: "drive" }), 1);
    expect(part("steering wheel", ro)).toBeDefined();
  });

  it("is refused for a place that has no step", () => {
    expect(() => podiumDriver(driver(4), 0)).toThrow(/1, 2 and 3/);
  });
});

describe("the trophy", () => {
  it("is gold, stands on its base and gets bigger with its size", () => {
    const small = trophyParts([0, 0, 0], 1);
    const big = trophyParts([0, 0, 0], 2);
    expect(lowest(small)).toBeCloseTo(0);
    const top = (parts) => Math.max(...pointsOf(parts).map((point) => point[2]));
    expect(top(big)).toBeCloseTo(top(small) * 2);
    expect(part("trophy cup top", small).faces.some((face) => face.colour === "#e8b923")).toBe(true);
  });

  it("is held in the right hand in the winner's pose", () => {
    expect(poseAt("trophy", 0.5).trophy).toBe(1);
    expect(poseAt("trophy", 0.5).rightHand[1]).toBeGreaterThan(0);
  });
});

describe("the crowd", () => {
  it("has its students always in the same places and colours", () => {
    expect(crowdSpots()).toEqual(crowdSpots());
    expect(crowdSpots()).toHaveLength(CROWD_SIZE);
  });

  it("never stands on or in front of the podium, where it would hide the drivers", () => {
    for (const spot of crowdSpots()) {
      const onTheSteps = Math.abs(spot.y) < 13 + STEP_WIDTH / 2 + 2 && spot.x > -STEP_DEPTH / 2 - 3;
      expect(onTheSteps, `${spot.x.toFixed(1)}, ${spot.y.toFixed(1)}`).toBe(false);
    }
  });

  it("cheers: arms up, bouncing, but the feet never go through the floor", () => {
    const spot = crowdSpots()[0];
    const heights = [];
    for (let seconds = 0; seconds < 2; seconds += 0.1) {
      const parts = crowdPerson(spot, seconds);
      expect(lowest(parts)).toBeGreaterThanOrEqual(0);
      const hand = middleOf(part("crowd left arm", parts))[2];
      const shoulder = middleOf(part("crowd body", parts))[2];
      expect(hand).toBeGreaterThan(shoulder); // the arms are up
      heights.push(middleOf(part("crowd head", parts))[2]);
    }
    expect(Math.max(...heights) - Math.min(...heights)).toBeGreaterThan(0.3); // bouncing
  });

  it("is part of everything that moves, with a shadow for each student and each step", () => {
    const moving = podiumMoving([], 1);
    expect(moving.parts.filter((one) => one.name === "crowd head")).toHaveLength(CROWD_SIZE);
    expect(moving.shadows).toHaveLength(CROWD_SIZE + PODIUM_STEPS.length);
  });
});
