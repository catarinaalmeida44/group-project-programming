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
  cheersDue,
  finishPlace,
  finishedWords,
  WAIT_FOR_ALL,
  CHEER_EVERY_SECONDS,
  CHEERS,
  PODIUM_SECONDS,
  WAIT_AFTER_YOU_SECONDS,
} from "../client/podium.js";
import {
  PODIUM_STEPS,
  STEP_WIDTH,
  STEP_DEPTH,
  CROWD_SIZE,
  CROWD_CHEERS,
  CROWD_JUMP,
  crowdSpots,
  crowdPerson,
  hallParts,
  hallLabels,
  podiumDriver,
  podiumMoving,
  podiumGroups,
} from "../client/podium-shape.js";
import { TRACKS } from "../shared/tracks/index.js";
import { tileKindAt } from "../shared/track.js";
import { NOVA_LAP_LOOK } from "../client/nova-lap-look.js";
import { lookOfTrack } from "../client/track-looks.js";
import { poseAt, trophyParts } from "../client/pilot-shape.js";
import { lookOfCharacter, hairOf, longHairOf, headOf, danceOf } from "../client/cast-choice.js";
import { cameraPullBack, CAMERA_IN_SECONDS, CAMERA_STARTS } from "../client/podium.js";
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

describe("at the finish, before the podium", () => {
  const karts = [kart(1, "dean", true, 4000), kart(2, "pcp", true, 3700), kart(3, "cici", false, 900), kart(4, "ro", true, 3700)];

  it("knows the place each finisher came in, sharing a place on the same time", () => {
    expect(finishPlace(karts, 2)).toBe(1);
    expect(finishPlace(karts, 4)).toBe(1); // the same time as kart 2
    expect(finishPlace(karts, 1)).toBe(3);
  });

  it("has no place for a kart that has not finished, or is not there", () => {
    expect(finishPlace(karts, 3)).toBe(null);
    expect(finishPlace(karts, 99)).toBe(null);
    expect(finishPlace(null, 1)).toBe(null);
  });

  it("tells the driver their place and time, and to wait for everyone", () => {
    const words = finishedWords(2, 3600, formatTime);
    expect(words).toBe(`You finished 2nd, in ${formatTime(60)}! Wait for all the drivers to finish the race!`);
    expect(words.endsWith(WAIT_FOR_ALL)).toBe(true);
    expect(finishedWords(1, 60, formatTime)).toContain("1st");
    expect(finishedWords(3, 60, formatTime)).toContain("3rd");
  });
});

describe("the crowd's cheering on the podium", () => {
  it("starts at once, when the podium comes up", () => {
    expect(cheersDue(0)).toBe(1);
  });

  it("cheers again every little while", () => {
    expect(cheersDue(CHEER_EVERY_SECONDS - 0.01)).toBe(1);
    expect(cheersDue(CHEER_EVERY_SECONDS)).toBe(2);
    expect(cheersDue(CHEER_EVERY_SECONDS * 3 + 0.1)).toBe(4);
  });

  it("stops after a while, so it does not go on for ever", () => {
    expect(cheersDue(1000)).toBe(CHEERS);
  });

  it("never cheers before the podium, or on a strange time", () => {
    for (const strange of [-1, NaN, undefined, null]) {
      expect(cheersDue(strange), String(strange)).toBe(0);
    }
  });
});

describe("the podium on the Nova lap, in front of the school's name", () => {
  const track = TRACKS["nova-lap"];
  const spot = NOVA_LAP_LOOK.podium;

  it("has its spot in the Nova lap's look", () => {
    expect(lookOfTrack(track).podium).toBe(spot);
  });

  it("stands right in front of the white wall with the name, at the end of the avenue", () => {
    const [column, row] = spot.at;
    // The white wall with the name is column 53, from row 4 to row 9 (client/nova-lap-buildings.js).
    expect(column).toBeGreaterThan(48);
    expect(column).toBeLessThan(53);
    expect(row).toBeGreaterThanOrEqual(4);
    expect(row).toBeLessThanOrEqual(9);
  });

  it("is looked at from the west, the camera on the same lawn, closer than the wall", () => {
    const [column, row] = spot.at;
    const [cameraColumn, cameraRow] = spot.camera;
    expect(cameraColumn).toBeLessThan(column);
    expect(Math.abs(cameraRow - row)).toBeLessThan(1);
  });

  it("stands on the lawn and not in the way of the karts: no part of it on a road square", () => {
    const size = track.tileSize;
    const [column, row] = spot.at;
    for (const group of podiumGroups([], 1)) {
      // Facing the camera in the west: the podium's own directions turned half round.
      const x = column * size - group.at[0];
      const y = row * size - group.at[1];
      if (Math.abs(group.at[1]) < 20) {
        // The steps, and the crowd close to them.
        expect(tileKindAt(track, x, y), `${group.at}`).not.toBe("road");
      }
    }
  });
});
describe("the podium as groups, for a track", () => {
  const driver = (place) => ({ place, look: lookOfCharacter("pcp"), hair: hairOf("pcp"), picture: null, dance: "clap" });

  it("has one group for each step, with its driver, and one for each student", () => {
    const groups = podiumGroups([driver(1), driver(2), driver(3)], 1);
    expect(groups).toHaveLength(PODIUM_STEPS.length + CROWD_SIZE);
    for (const step of PODIUM_STEPS) {
      const group = groups.find((one) => one.at[1] === step.y && one.at[0] === 0);
      expect(group.parts.find((one) => one.name === `step ${step.place}`)).toBeDefined();
      expect(group.labels[0].text).toBe(String(step.place));
    }
  });

  it("measures each group from where it stands: the step's driver stands over the middle of the group", () => {
    const groups = podiumGroups([driver(2)], 1);
    const second = groups.find((one) => one.at[1] === PODIUM_STEPS[1].y);
    const shoes = [part("left shoe", second.parts), part("right shoe", second.parts)];
    for (const [, y] of pointsOf(shoes)) {
      expect(Math.abs(y)).toBeLessThan(STEP_WIDTH / 2);
    }
    expect(lowest(shoes)).toBeCloseTo(PODIUM_STEPS[1].height);
  });

  it("leaves a step empty when nobody came in that place", () => {
    const groups = podiumGroups([driver(1)], 1);
    const third = groups.find((one) => one.at[1] === PODIUM_STEPS[2].y);
    expect(third.parts).toHaveLength(1); // only the step
  });
});
// ---------------------------------------------------------------------------
// Added on 18 November 2026, for Catarina: the crowd waves, jumps and claps,
// and a driver with long hair keeps it on the podium.
// ---------------------------------------------------------------------------

describe("how the crowd cheers (added 18 November 2026)", () => {
  const crowd = crowdSpots();
  const one = (cheer) => crowd.find((spot) => spot.cheer === cheer);
  const lowestOf = (parts) => Math.min(...pointsOf(parts).map((point) => point[2]));
  const named = (name, parts) => parts.find((each) => each.name === name);
  /** Where the hand end of an arm is: its highest corners, averaged. */
  const handOf = (arm) => {
    const points = arm.faces.flatMap((face) => face.points);
    const top = Math.max(...points.map((point) => point[2]));
    const high = points.filter((point) => point[2] > top - 0.8);
    return [0, 1, 2].map((axis) => high.reduce((sum, point) => sum + point[axis], 0) / high.length);
  };
  const during = (spot, seconds = 2) => Array.from({ length: Math.round(seconds * 30) }, (_, i) => crowdPerson(spot, i / 30));

  it("has students who wave, who jump and who clap, about a third each", () => {
    for (const cheer of CROWD_CHEERS) {
      const count = crowd.filter((spot) => spot.cheer === cheer).length;
      expect(count, cheer).toBeGreaterThanOrEqual(Math.floor(CROWD_SIZE / 3));
    }
    expect(crowd.every((spot) => CROWD_CHEERS.includes(spot.cheer))).toBe(true);
  });

  it("is the same crowd every time", () => {
    expect(crowdSpots()).toEqual(crowdSpots());
  });

  it("jumping: leaves the ground, comes down again, and never goes below it", () => {
    const lows = during(one("jump")).map(lowestOf);
    expect(Math.max(...lows)).toBeGreaterThan(CROWD_JUMP * 0.9);
    expect(Math.min(...lows)).toBeGreaterThanOrEqual(0);
    expect(Math.min(...lows)).toBeLessThan(0.5); // back on the ground between two jumps
  });

  it("waving and clapping: the feet stay on the ground", () => {
    for (const cheer of ["wave", "clap"]) {
      for (const parts of during(one(cheer))) {
        const feet = lowestOf([named("crowd left leg", parts), named("crowd right leg", parts)]);
        expect(feet, cheer).toBeLessThan(0.5);
        expect(feet, cheer).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it("clapping: the hands meet over the head and open again", () => {
    const gaps = during(one("clap")).map((parts) => {
      const left = handOf(named("crowd left arm", parts));
      const right = handOf(named("crowd right arm", parts));
      const head = named("crowd head", parts).ball;
      expect(Math.min(left[2], right[2])).toBeGreaterThan(head.middle[2]); // over the head
      return Math.hypot(left[0] - right[0], left[1] - right[1], left[2] - right[2]);
    });
    expect(Math.min(...gaps)).toBeLessThan(1.5);
    expect(Math.max(...gaps)).toBeGreaterThan(4.5);
  });

  it("waving: the hands stay apart, going from side to side together", () => {
    const gaps = during(one("wave")).map((parts) => {
      const left = handOf(named("crowd left arm", parts));
      const right = handOf(named("crowd right arm", parts));
      return Math.hypot(left[0] - right[0], left[1] - right[1], left[2] - right[2]);
    });
    expect(Math.min(...gaps)).toBeGreaterThan(4.5);
  });

  it("keeps everybody's arms up, however they cheer", () => {
    for (const cheer of CROWD_CHEERS) {
      for (const parts of during(one(cheer))) {
        const body = named("crowd body", parts).faces.flatMap((face) => face.points);
        const shoulders = Math.max(...body.map((point) => point[2]));
        expect(handOf(named("crowd left arm", parts))[2], cheer).toBeGreaterThan(shoulders);
        expect(handOf(named("crowd right arm", parts))[2], cheer).toBeGreaterThan(shoulders);
      }
    }
  });

  it("treats a student who does not say how they cheer as waving", () => {
    const { cheer, ...plain } = one("wave");
    expect(cheer).toBe("wave");
    expect(crowdPerson(plain, 0.7)).toEqual(crowdPerson(one("wave"), 0.7));
  });
});

describe("long hair on the podium (added 18 November 2026)", () => {
  it("is in the lineup for Cici Boss, and for nobody else", () => {
    const lineup = podiumLineup([kart(1, "cici", true, 4000), kart(2, "pcp", true, 4100), kart(7, undefined, true, 4200)], TEST_OVAL);
    expect(lineup[0].longHair).toEqual(longHairOf("cici"));
    expect(lineup[1].longHair).toBe(null);
    expect(lineup[2].longHair).toBe(null);
  });

  it("is on the head of the driver standing on the step, with their picture", () => {
    const picture = { fake: "picture" };
    const driver = { place: 2, look: lookOfCharacter("cici"), hair: hairOf("cici"), longHair: longHairOf("cici"), picture, dance: danceOf("cici") };
    const head = podiumDriver(driver, 1).find((each) => each.name === "head").head;
    expect(head.long).toEqual(longHairOf("cici"));
    expect(head.picture).toBe(picture);
    const short = podiumDriver({ ...driver, longHair: null }, 1).find((each) => each.name === "head").head;
    expect("long" in short).toBe(false);
  });

  it("does the gangnam on the podium when second or third, and lifts the trophy when first", () => {
    const second = podiumDriver({ place: 2, look: lookOfCharacter("cici"), hair: hairOf("cici"), picture: { fake: "picture" }, dance: danceOf("cici") }, 0.5);
    const first = podiumDriver({ place: 1, look: lookOfCharacter("cici"), hair: hairOf("cici"), picture: { fake: "picture" }, dance: danceOf("cici") }, 0.5);
    expect(first.some((each) => each.name.startsWith("trophy"))).toBe(true);
    expect(second.some((each) => each.name.startsWith("trophy"))).toBe(false);
    // The gangnam lifts a foot: at some moment one shoe is clearly higher than the other.
    const shoe = (parts, name) => Math.min(...parts.find((each) => each.name === name).faces.flatMap((face) => face.points.map((point) => point[2])));
    const gaps = Array.from({ length: 40 }, (_, i) => {
      const parts = podiumDriver({ place: 2, look: lookOfCharacter("cici"), hair: hairOf("cici"), picture: { fake: "picture" }, dance: danceOf("cici") }, i / 20);
      return Math.abs(shoe(parts, "left shoe") - shoe(parts, "right shoe"));
    });
    expect(Math.max(...gaps)).toBeGreaterThan(1.2);
  });
});

// ---------------------------------------------------------------------------
// Added late on 18 November 2026, for Catarina: a crowd that looks like a
// lot of people, and a camera that comes in to the podium.
// ---------------------------------------------------------------------------

describe("a big crowd, spread wide (added 18 November 2026)", () => {
  const crowd = crowdSpots();

  it("is 80 students, where there were 28", () => {
    expect(CROWD_SIZE).toBe(80);
    expect(crowd).toHaveLength(80);
  });

  it("reaches far out to both sides and well behind the podium", () => {
    const across = crowd.map((spot) => spot.y);
    const deep = crowd.map((spot) => spot.x);
    expect(Math.max(...across)).toBeGreaterThan(50);
    expect(Math.min(...across)).toBeLessThan(-50);
    expect(Math.min(...deep)).toBeLessThan(-25); //  four rows deep behind
    expect(Math.max(...deep)).toBeGreaterThan(10); // and forwards at the sides, towards the camera
  });

  it("stays on the floor of the hall of the other tracks: in front of its back wall, inside its sides", () => {
    for (const spot of crowd) {
      expect(spot.x, `${spot.x}, ${spot.y}`).toBeGreaterThan(-29.5); // the wall is at -30
      expect(Math.abs(spot.y)).toBeLessThan(68); //                    the floor ends at 70
    }
  });

  it("leaves a way through on each side of the block behind the steps, where nobody stands", () => {
    for (const spot of crowd) {
      const inAWay = Math.abs(spot.y) > 18.5 && Math.abs(spot.y) < 30.5;
      expect(inAWay, `${spot.x.toFixed(1)}, ${spot.y.toFixed(1)}`).toBe(false);
    }
  });

  it("has as many students on one side as on the other, give or take a few", () => {
    const left = crowd.filter((spot) => spot.y > 0).length;
    expect(Math.abs(left - (crowd.length - left))).toBeLessThan(8);
  });

  it("keeps everybody apart: no two students stand in the same place", () => {
    for (let i = 0; i < crowd.length; i++) {
      for (let j = i + 1; j < crowd.length; j++) {
        expect(Math.hypot(crowd[i].x - crowd[j].x, crowd[i].y - crowd[j].y), `${i} and ${j}`).toBeGreaterThan(1);
      }
    }
  });
});

describe("the camera comes in to the podium (added 18 November 2026)", () => {
  it("starts several times further away than it ends", () => {
    expect(cameraPullBack(0)).toBe(CAMERA_STARTS);
    expect(CAMERA_STARTS).toBeGreaterThan(2);
  });

  it("comes nearer all the time, fast at first and gently at the end", () => {
    let before = cameraPullBack(0);
    for (let seconds = 0.05; seconds <= CAMERA_IN_SECONDS; seconds += 0.05) {
      const now = cameraPullBack(seconds);
      expect(now).toBeLessThanOrEqual(before);
      before = now;
    }
    const firstTenth = cameraPullBack(0) - cameraPullBack(CAMERA_IN_SECONDS * 0.1);
    const lastTenth = cameraPullBack(CAMERA_IN_SECONDS * 0.9) - cameraPullBack(CAMERA_IN_SECONDS);
    expect(firstTenth).toBeGreaterThan(lastTenth * 5);
  });

  it("has arrived after a few seconds, and then stays where it is", () => {
    expect(cameraPullBack(CAMERA_IN_SECONDS)).toBe(1);
    expect(cameraPullBack(CAMERA_IN_SECONDS + 5)).toBe(1);
    expect(cameraPullBack(1000)).toBe(1);
    expect(CAMERA_IN_SECONDS).toBeLessThan(5); // "a small animation": not a long wait
  });

  it("is never nearer than its end, and counts a strange time as the start", () => {
    for (let seconds = 0; seconds < 10; seconds += 0.1) {
      expect(cameraPullBack(seconds)).toBeGreaterThanOrEqual(1);
    }
    for (const strange of [-1, NaN, Infinity, null, undefined, "2", {}]) {
      expect(cameraPullBack(strange), String(strange)).toBe(CAMERA_STARTS);
    }
  });

  it("starts on the lawn of the Nova lap: still west of the podium, on the same row", () => {
    const [column, row] = NOVA_LAP_LOOK.podium.at;
    const [cameraColumn, cameraRow] = NOVA_LAP_LOOK.podium.camera;
    const startColumn = column + (cameraColumn - column) * CAMERA_STARTS;
    const startRow = row + (cameraRow - row) * CAMERA_STARTS;
    expect(startColumn).toBeLessThan(cameraColumn);
    expect(startColumn).toBeGreaterThan(40); // not back on the start grid
    expect(startRow).toBeCloseTo(row);
    // Not on the avenue: it looks at the podium over the lawn. (The lawn is
    // "wall" for the driving rules, because no kart can go there.)
    const track = TRACKS["nova-lap"];
    expect(tileKindAt(track, startColumn * track.tileSize, startRow * track.tileSize)).not.toBe("road");
  });
});