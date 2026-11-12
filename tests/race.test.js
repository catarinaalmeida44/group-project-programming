// Tests for shared/race.js: all the rules working together on the test oval.
//
// Nobody can press keys during a test, so these tests use a simple "robot
// driver": a few lines of code that steer towards the next corner of the track.

import { describe, it, expect } from "vitest";
import { createRacer, stepRacer, KART_RADIUS } from "../shared/race.js";
import { createKart, speedOf, topSpeedOf } from "../shared/physics.js";
import { createProgress, createProgressBehindLine, raceSeconds } from "../shared/laps.js";
import { GRID_GAP_SIDEWAYS } from "../shared/grid.js";
import { tileKindAt, isInsideCheckpoint } from "../shared/track.js";
import { TEST_DRIVER } from "../shared/characters.js";
import { ROAD, GRASS } from "../shared/surfaces.js";
import { TEST_OVAL } from "../shared/tracks/test-oval.js";

// ---- The robot driver ----

// The middle of the road at the four corners of the oval, in clockwise order,
// starting with the corner the kart reaches first.
const CORNERS = [
  { x: 864, y: 96 }, //  top right
  { x: 864, y: 480 }, // bottom right
  { x: 96, y: 480 }, //  bottom left
  { x: 96, y: 96 }, //   top left
];

/** Which keys the robot presses to head for a target point. */
function robotKeys(kart, target) {
  const wantedAngle = Math.atan2(target.y - kart.y, target.x - kart.x);
  // How far the kart has to turn, from -3.14 (half a turn left) to 3.14 (half a turn right).
  const turn = Math.atan2(Math.sin(wantedAngle - kart.angle), Math.cos(wantedAngle - kart.angle));
  return {
    // Ease off the gas in a sharp turn, but never when nearly stopped.
    gas: Math.abs(turn) < 1.2 || speedOf(kart) < 120,
    left: turn < -0.05,
    right: turn > 0.05,
  };
}

/**
 * Lets the robot drive for up to a number of seconds, or until it finishes.
 * "corners" is the list of points to visit, over and over.
 * "everyStep" is called after each step, so a test can watch the drive.
 */
function robotDrive(racer, corners, seconds, everyStep = () => {}) {
  let cornerNumber = 0;
  for (let step = 0; step < seconds * 60 && !racer.progress.finished; step++) {
    const target = corners[cornerNumber];
    if (Math.hypot(target.x - racer.kart.x, target.y - racer.kart.y) < 110) {
      cornerNumber = (cornerNumber + 1) % corners.length; // close enough: aim for the next corner
    }
    racer = stepRacer(TEST_OVAL, racer, robotKeys(racer.kart, corners[cornerNumber]), TEST_DRIVER);
    everyStep(racer);
  }
  return racer;
}

/** Holds the same keys for a number of seconds. */
function holdKeys(racer, keys, seconds, everyStep = () => {}) {
  for (let step = 0; step < seconds * 60; step++) {
    racer = stepRacer(TEST_OVAL, racer, keys, TEST_DRIVER);
    everyStep(racer);
  }
  return racer;
}

// ---- The tests ----

describe("the start of a race", () => {
  // Changed on 12 November 2026 with the start rule (team lead's request):
  // karts now start on the grid behind the finish line, and the first
  // crossing of the line starts lap 1. Before, this test put the racer
  // exactly on the track's start, just after the line.
  it("puts the racer on pole, in the front row of the grid behind the finish line, standing still, with no laps", () => {
    const racer = createRacer(TEST_OVAL);
    // The track's start is the middle of the front row. Pole is the left place of that row.
    expect(racer.kart.x).toBe(TEST_OVAL.start.x);
    expect(racer.kart.y).toBe(TEST_OVAL.start.y - GRID_GAP_SIDEWAYS);
    expect(racer.kart.angle).toBe(TEST_OVAL.start.angle);
    expect(speedOf(racer.kart)).toBe(0);
    // The whole kart is behind the finish line, not on it.
    expect(racer.kart.x + KART_RADIUS).toBeLessThan(TEST_OVAL.checkpoints[0].left);
    // No laps, no time, and one checkpoint short of the line: the line is what it has to reach first.
    expect(racer.progress).toEqual(createProgressBehindLine());
    expect(racer.progress).toEqual({ passed: -1, lapsDone: 0, steps: 0, lapSteps: [], finished: false });
  });
});

describe("a whole race", () => {
  it("is completed by a kart that drives three laps, which gets a finish time", () => {
    const racer = robotDrive(createRacer(TEST_OVAL), CORNERS, 180);
    expect(racer.progress.finished).toBe(true);
    expect(racer.progress.lapsDone).toBe(3);
    expect(racer.progress.lapSteps).toHaveLength(3);
    // Each lap ends later than the one before.
    expect(racer.progress.lapSteps[1]).toBeGreaterThan(racer.progress.lapSteps[0]);
    expect(racer.progress.lapSteps[2]).toBeGreaterThan(racer.progress.lapSteps[1]);
    // The finish time is the time at the end of the last lap.
    expect(raceSeconds(racer.progress)).toBeCloseTo(racer.progress.lapSteps[2] / 60);
  });

  it("cannot be finished faster than top speed allows", () => {
    // One lap along the middle of the road is about 2300 units long, so even
    // a perfect driver needs more than 7 seconds per lap at top speed.
    const racer = robotDrive(createRacer(TEST_OVAL), CORNERS, 180);
    const shortestLapLength = 2 * (864 - 96) + 2 * (480 - 96) - 4 * 128;
    const fastestPossible = (3 * shortestLapLength) / topSpeedOf(TEST_DRIVER, ROAD);
    expect(raceSeconds(racer.progress)).toBeGreaterThan(fastestPossible);
  });

  it("gives exactly the same finish time when driven the same way twice", () => {
    const first = robotDrive(createRacer(TEST_OVAL), CORNERS, 180);
    const second = robotDrive(createRacer(TEST_OVAL), CORNERS, 180);
    expect(second.progress).toEqual(first.progress);
    expect(second.kart).toEqual(first.kart);
  });

  it("ignores the keys after the finish, so the kart rolls to a stop and the clock stays stopped", () => {
    const finished = robotDrive(createRacer(TEST_OVAL), CORNERS, 180);
    const later = holdKeys(finished, { gas: true }, 10);
    expect(speedOf(later.kart)).toBe(0);
    expect(later.progress).toEqual(finished.progress);
  });
});

describe("races that must NOT be completed", () => {
  it("never finishes for a kart that stands still, but its clock keeps running", () => {
    const racer = holdKeys(createRacer(TEST_OVAL), {}, 30);
    expect(racer.progress.lapsDone).toBe(0);
    expect(racer.progress.finished).toBe(false);
    expect(racer.progress.steps).toBe(30 * 60);
  });

  it("never counts a lap for a kart that drives the wrong way round", () => {
    // Turn the kart round at the start and visit the corners in the opposite order.
    const start = createRacer(TEST_OVAL);
    const facingBackwards = { ...start, kart: createKart(start.kart.x, start.kart.y, Math.PI) };
    const wrongWay = [CORNERS[3], CORNERS[2], CORNERS[1], CORNERS[0]];

    // Count how often it crosses the finish line, to be sure it really went round.
    let finishLineCrossings = 0;
    let wasOnFinishLine = false;
    const racer = robotDrive(facingBackwards, wrongWay, 60, (now) => {
      const onFinishLine = isInsideCheckpoint(TEST_OVAL, 0, now.kart.x, now.kart.y);
      if (onFinishLine && !wasOnFinishLine) {
        finishLineCrossings++;
      }
      wasOnFinishLine = onFinishLine;
    });

    expect(finishLineCrossings).toBeGreaterThanOrEqual(3);
    expect(racer.progress.lapsDone).toBe(0);
    expect(racer.progress.finished).toBe(false);
  });

  it("never counts a lap for a kart that reverses over the finish line and drives back", () => {
    let racer = holdKeys(createRacer(TEST_OVAL), { brake: true }, 3); // reverse over the line
    expect(racer.kart.x).toBeLessThan(TEST_OVAL.checkpoints[0].left);
    racer = holdKeys(racer, { gas: true }, 3); // and forwards over it again
    expect(racer.kart.x).toBeGreaterThan(TEST_OVAL.checkpoints[0].right);
    expect(racer.progress.lapsDone).toBe(0);
  });
});

describe("walls and ground during a race", () => {
  it("never lets a kart into or through a wall, even flat out with no steering", () => {
    let fastestHit = 0;
    holdKeys(createRacer(TEST_OVAL), { gas: true }, 20, (racer) => {
      const { x, y } = racer.kart;
      expect(tileKindAt(TEST_OVAL, x, y)).not.toBe("wall");
      // The whole kart, not just its middle, stays out of the right-hand wall.
      expect(x).toBeLessThanOrEqual(TEST_OVAL.width - 32 - KART_RADIUS + 0.000001);
      fastestHit = Math.max(fastestHit, speedOf(racer.kart));
    });
    expect(fastestHit).toBeGreaterThan(200); // it really was going fast
  });

  it("never lets the robot's kart into a wall during a whole race", () => {
    robotDrive(createRacer(TEST_OVAL), CORNERS, 180, (racer) => {
      expect(tileKindAt(TEST_OVAL, racer.kart.x, racer.kart.y)).not.toBe("wall");
    });
  });

  it("makes a kart slower on the grass strip than on the road", () => {
    // Two karts drive straight to the right for two seconds: one along the
    // road (row 2) and one along the grass strip (row 5).
    const onRoad = { kart: createKart(200, 80, 0), progress: createProgress() };
    const onGrass = { kart: createKart(200, 176, 0), progress: createProgress() };
    expect(tileKindAt(TEST_OVAL, 200, 176)).toBe("grass");

    const roadKart = holdKeys(onRoad, { gas: true }, 2).kart;
    const grassKart = holdKeys(onGrass, { gas: true }, 2).kart;

    expect(tileKindAt(TEST_OVAL, grassKart.x, grassKart.y)).toBe("grass"); // still on the strip
    expect(speedOf(grassKart)).toBeLessThanOrEqual(topSpeedOf(TEST_DRIVER, GRASS) + 0.000001);
    expect(speedOf(grassKart)).toBeLessThan(speedOf(roadKart));
  });
});

describe("the rules are safe to share", () => {
  it("does not change the racer it was given", () => {
    const racer = createRacer(TEST_OVAL);
    const before = Object.freeze({
      kart: Object.freeze({ ...racer.kart }),
      progress: Object.freeze({ ...racer.progress }),
    });
    const after = stepRacer(TEST_OVAL, before, { gas: true }, TEST_DRIVER);
    expect(before.kart.x).toBe(TEST_OVAL.start.x);
    expect(before.progress.steps).toBe(0);
    expect(after.kart.x).toBeGreaterThan(before.kart.x);
    expect(after.progress.steps).toBe(1);
  });

  it("keeps any extra information stored on the racer", () => {
    const racer = { ...createRacer(TEST_OVAL), name: "Player one" };
    expect(stepRacer(TEST_OVAL, racer, {}, TEST_DRIVER).name).toBe("Player one");
  });
});
