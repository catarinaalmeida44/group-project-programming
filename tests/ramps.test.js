// Tests for the ramps: shared/ramps.js (which ramp is under a kart, when a
// kart takes off, how high it is drawn), the jump and the extra speed in
// shared/race.js and shared/physics.js, the check of a track's ramps in
// shared/track.js, and bananas under a flying kart (shared/hazards.js).
// (Ramps in an online room and in the practice race are tested in
// room-street-life.test.js.)
//
// Most of these tests place a kart by hand on a small strip of road. That
// is the easiest way to try the things that must NOT happen.

import { describe, it, expect, vi, afterEach } from "vitest";
import {
  JUMP_STEPS,
  JUMP_HEIGHT,
  BOOST_STEPS,
  BOOST_SHARE,
  TAKE_OFF_SPEED,
  TAKE_OFF_WITHIN,
  jumpHeight,
  rampAt,
  takesOff,
  launchKart,
} from "../shared/ramps.js";
import { createRacer, stepRacer, KART_RADIUS } from "../shared/race.js";
import { createKart, flyKart, speedOf, topSpeedOf, STEP_SECONDS } from "../shared/physics.js";
import { createTrack, tileKindAt } from "../shared/track.js";
import { nextCheckpoint } from "../shared/laps.js";
import {
  BANANA_RADIUS,
  SPIN_STEPS,
  createBananaMaker,
  canBeSpun,
  bananaHits,
  spinOut,
  stepBananas,
} from "../shared/hazards.js";
import { TEST_DRIVER } from "../shared/characters.js";
import { ROAD, GRASS } from "../shared/surfaces.js";
import { TEST_OVAL } from "../shared/tracks/test-oval.js";
import { CAMPUS_LOOP } from "../shared/tracks/campus-loop.js";
import { NOVA_LAP } from "../shared/tracks/nova-lap.js";
import { smallTrackDescription } from "./small-track.js";

afterEach(() => {
  vi.restoreAllMocks();
});

// ---- A small track with two ramps ----
//
// A long strip, 60 squares of 32 units. Rows 1 to 3 are road, rows 4 and 5
// are grass, and there is wall all round.
//
//   ramp 0   column 5, row 2: the square from x=160..192, y=64..96, its
//            middle at (176, 80). It is driven east (angle 0, to the right)
//   ramp 1   column 30, row 3: the square from x=960..992, y=96..128. It is
//            driven north (up the screen), straight at the wall along the top
//
// A kart that drives east along y=80 goes over ramp 0 and passes beside ramp 1.

const COLUMNS = 60;
const WALL_ROW = "#".repeat(COLUMNS);
const ROAD_ROW = "#" + ".".repeat(COLUMNS - 2) + "#";
const GRASS_ROW = "#" + ",".repeat(COLUMNS - 2) + "#";
const NORTH = -Math.PI / 2;

function stripDescription() {
  return {
    name: "Ramp test strip",
    tileSize: 32,
    laps: 1,
    map: [WALL_ROW, ROAD_ROW, ROAD_ROW, ROAD_ROW, GRASS_ROW, GRASS_ROW, WALL_ROW],
    start: { column: 1, row: 2, angle: 0 },
    checkpoints: [
      { name: "finish line", column: 57, row: 1, columns: 1, rows: 5 },
      { name: "first", column: 10, row: 1, columns: 1, rows: 5 },
      { name: "second", column: 40, row: 1, columns: 1, rows: 5 },
    ],
    ramps: [
      { column: 5, row: 2, angle: 0 },
      { column: 30, row: 3, angle: NORTH },
    ],
  };
}

/** The strip with some parts of its description changed. */
function stripWith(changes) {
  return { ...stripDescription(), ...changes };
}

const STRIP = createTrack(stripDescription());
const [EAST_RAMP, NORTH_RAMP] = STRIP.ramps;

const GAS = { gas: true, brake: false, left: false, right: false };
const NO_KEYS = { gas: false, brake: false, left: false, right: false };
const TOP_SPEED = topSpeedOf(TEST_DRIVER, ROAD); //  the usual top speed on the road
const BOOSTED_SPEED = TOP_SPEED * BOOST_SHARE; //    the top speed with extra speed from a ramp
const HIT_DISTANCE = KART_RADIUS + BANANA_RADIUS; // closer than this, a kart touches a banana

/** A racer on the strip at a position, with a speed, pointing along "angle". "extra" sets counters by hand. */
function racerAt(x, y, vx = 0, vy = 0, angle = 0, extra = {}) {
  return { ...createRacer(STRIP), kart: { ...createKart(x, y, angle), vx, vy }, ...extra };
}

/** Steps a racer with the same keys and gives the racer after every step, as a list. */
function everyStep(racer, keys, steps, track = STRIP) {
  const list = [];
  for (let step = 0; step < steps; step++) {
    racer = stepRacer(track, racer, keys, TEST_DRIVER);
    list.push(racer);
  }
  return list;
}

/** Is the middle of this racer's kart on a ramp of the strip? */
function isOnARamp(racer) {
  return rampAt(STRIP, racer.kart.x, racer.kart.y) !== null;
}

/**
 * Drives a kart east along the row of ramp 0 with the gas held, from a
 * little before the ramp. Gives { run, takeOff }: the racer after every
 * step, and where in that list it took off.
 */
function driveOverTheEastRamp(steps = 260) {
  const run = everyStep(racerAt(100, 80, 250, 0), GAS, steps);
  return { run, takeOff: run.findIndex((racer) => racer.airSteps > 0) };
}

/** A racer that has just taken off from ramp 0. */
function justTookOff() {
  const { run, takeOff } = driveOverTheEastRamp(40);
  return run[takeOff];
}

/** A banana maker that will not add a banana for a very long time, for tests that place bananas by hand. */
function quietMaker() {
  return { ...createBananaMaker(1), stepsToNext: 1000000 };
}

// ---- The ramps of a track ----

describe("a track with ramps", () => {
  it("keeps each ramp in units: its middle, the direction it is driven in, and the four edges of its square", () => {
    expect(STRIP.ramps).toEqual([
      { x: 176, y: 80, angle: 0, left: 160, top: 64, right: 192, bottom: 96 },
      { x: 976, y: 112, angle: NORTH, left: 960, top: 96, right: 992, bottom: 128 },
    ]);
  });

  it("has an empty list of ramps, and of walkers, when its description names neither", () => {
    const plain = createTrack(smallTrackDescription());
    expect(plain.ramps).toEqual([]);
    expect(plain.walkers).toEqual([]);
    for (const track of [TEST_OVAL, CAMPUS_LOOP]) {
      expect(track.ramps, track.name).toEqual([]);
      expect(track.walkers, track.name).toEqual([]);
    }
  });

  it("accepts an empty list of ramps", () => {
    expect(createTrack(stripWith({ ramps: [] })).ramps).toEqual([]);
  });

  it("refuses a ramp on a wall", () => {
    expect(() => createTrack(stripWith({ ramps: [{ column: 0, row: 2, angle: 0 }] }))).toThrow(/ramp 0 must stand on a square of road/);
    expect(() => createTrack(stripWith({ ramps: [{ column: 5, row: 6, angle: 0 }] }))).toThrow(/ramp 0/);
  });

  it("refuses a ramp on grass", () => {
    expect(() => createTrack(stripWith({ ramps: [{ column: 5, row: 4, angle: 0 }] }))).toThrow(/ramp 0 must stand on a square of road/);
  });

  it("refuses a ramp outside the map, or on something that is not a square of it", () => {
    for (const [column, row] of [[-1, 2], [COLUMNS, 2], [5, -1], [5, 7], [5, 99], [5.5, 2], [5, "2"], [undefined, undefined]]) {
      expect(() => createTrack(stripWith({ ramps: [{ column, row, angle: 0 }] })), `${column}, ${row}`).toThrow(/ramp 0/);
    }
  });

  it("refuses a ramp without an angle", () => {
    for (const angle of [undefined, null, NaN, "0", {}]) {
      expect(() => createTrack(stripWith({ ramps: [{ column: 5, row: 2, angle }] })), String(angle)).toThrow(/ramp 0 needs an angle/);
    }
  });

  it("refuses a list of ramps that is not a list, and a ramp that is not there", () => {
    for (const ramps of [{}, "ramps", 5, null, true]) {
      expect(() => createTrack(stripWith({ ramps })), String(ramps)).toThrow(/ramps must be a list/);
    }
    expect(() => createTrack(stripWith({ ramps: [null] }))).toThrow(/ramp 0/);
    expect(() => createTrack(stripWith({ ramps: [undefined] }))).toThrow(/ramp 0/);
  });

  it("says which ramp is wrong", () => {
    const ramps = [
      { column: 5, row: 2, angle: 0 },
      { column: 6, row: 4, angle: 0 }, // on grass
    ];
    expect(() => createTrack(stripWith({ ramps }))).toThrow(/ramp 1/);
  });
});

describe("the ramp under a spot", () => {
  it("is the ramp whose square the spot is on", () => {
    expect(rampAt(STRIP, 176, 80)).toBe(EAST_RAMP);
    expect(rampAt(STRIP, 160, 64)).toBe(EAST_RAMP); // its top left corner
    expect(rampAt(STRIP, 191.9, 95.9)).toBe(EAST_RAMP);
    expect(rampAt(STRIP, 976, 112)).toBe(NORTH_RAMP);
  });

  it("is none just beside a ramp", () => {
    expect(rampAt(STRIP, 159.9, 80)).toBe(null); // one step to the left
    expect(rampAt(STRIP, 192, 80)).toBe(null); //   the square to the right begins here
    expect(rampAt(STRIP, 176, 63.9)).toBe(null); // the row above
    expect(rampAt(STRIP, 176, 96)).toBe(null); //   the row below
    expect(rampAt(STRIP, 500, 80)).toBe(null);
  });

  it("is none on a track without ramps, and on a track made by hand that has no list at all", () => {
    expect(rampAt(TEST_OVAL, 432, 80)).toBe(null);
    expect(rampAt({ tileSize: 32 }, 176, 80)).toBe(null);
  });
});

describe("how high a jumping kart is drawn", () => {
  it("is 0 on the ground", () => {
    expect(jumpHeight(0)).toBe(0);
  });

  it("is 0 at take-off and highest in the middle of the jump", () => {
    expect(jumpHeight(JUMP_STEPS)).toBe(0);
    expect(jumpHeight(JUMP_STEPS / 2)).toBeCloseTo(JUMP_HEIGHT);
    for (let airSteps = 0; airSteps <= JUMP_STEPS; airSteps++) {
      expect(jumpHeight(airSteps)).toBeLessThanOrEqual(JUMP_HEIGHT + 0.000001);
    }
  });

  it("goes up in the first half of a jump and comes down in the second", () => {
    // airSteps counts down, so the jump starts at JUMP_STEPS and ends at 0.
    for (let airSteps = JUMP_STEPS; airSteps > JUMP_STEPS / 2 + 1; airSteps--) {
      expect(jumpHeight(airSteps - 1)).toBeGreaterThan(jumpHeight(airSteps));
    }
    for (let airSteps = Math.floor(JUMP_STEPS / 2) - 1; airSteps > 0; airSteps--) {
      expect(jumpHeight(airSteps - 1)).toBeLessThan(jumpHeight(airSteps));
    }
  });

  it("is never below the ground, whatever number it is given", () => {
    for (let airSteps = -5; airSteps <= JUMP_STEPS + 20; airSteps++) {
      expect(jumpHeight(airSteps)).toBeGreaterThanOrEqual(0);
    }
    for (const strange of [undefined, null, NaN, "high", -1000, 1000000, {}]) {
      expect(jumpHeight(strange), String(strange)).toBe(0);
    }
  });
});

// ---- Taking off ----

describe("a kart that drives over a ramp the right way, fast enough", () => {
  it("takes off on the ramp: a kart that starts from a standstill in the row of the ramp", () => {
    const run = everyStep(racerAt(48, 80), GAS, 120);
    const takeOff = run.findIndex((racer) => racer.airSteps > 0);
    expect(takeOff).toBeGreaterThan(0);
    // Until then it drove on the ground, with no counter running.
    for (const racer of run.slice(0, takeOff)) {
      expect(racer.airSteps).toBe(0);
      expect(racer.boostSteps).toBe(0);
    }
    expect(rampAt(STRIP, run[takeOff].kart.x, run[takeOff].kart.y)).toBe(EAST_RAMP);
    expect(isOnARamp(run[takeOff - 1])).toBe(false); // it took off in the very step it reached the ramp
  });

  it("is in the air for JUMP_STEPS and has extra speed for BOOST_STEPS more", () => {
    const racer = justTookOff();
    expect(racer.airSteps).toBe(JUMP_STEPS);
    expect(racer.boostSteps).toBe(JUMP_STEPS + BOOST_STEPS);
  });

  it("leaves the ramp at its usual top speed on the road times BOOST_SHARE, going the way it was going", () => {
    const { run, takeOff } = driveOverTheEastRamp(40);
    const before = run[takeOff - 1].kart;
    const after = run[takeOff].kart;
    expect(BOOST_SHARE).toBeGreaterThan(1);
    expect(speedOf(before)).toBeLessThan(TOP_SPEED + 0.000001); // it came at an ordinary speed
    expect(speedOf(after)).toBeCloseTo(BOOSTED_SPEED);
    expect(Math.atan2(after.vy, after.vx)).toBeCloseTo(0); // still going east
    expect(after.angle).toBe(before.angle);
  });

  it("is never slowed down by the ramp: a kart that is already faster keeps its speed", () => {
    const [after] = everyStep(racerAt(170, 80, BOOSTED_SPEED + 150, 0, 0, { airSteps: 0 }), NO_KEYS, 1);
    expect(after.airSteps).toBe(JUMP_STEPS);
    expect(speedOf(after.kart)).toBeGreaterThan(BOOSTED_SPEED + 100);
  });

  it("takes off by the direction it MOVES in, not the direction its nose points", () => {
    // Its nose points south (down the screen), but it slides east over the ramp.
    const [sliding] = everyStep(racerAt(165, 80, 260, 0, Math.PI / 2), NO_KEYS, 1);
    expect(sliding.airSteps).toBe(JUMP_STEPS);
    expect(sliding.kart.vx).toBeGreaterThan(0);
    expect(sliding.kart.angle).toBe(Math.PI / 2);

    // Its nose points east, the way the ramp is driven, but it slides south across it.
    const [across] = everyStep(racerAt(176, 70, 0, 260, 0), NO_KEYS, 1);
    expect(isOnARamp(across)).toBe(true);
    expect(across.airSteps).toBe(0);
  });

  it("takes off on a ramp that points another way too: north, towards the top of the map", () => {
    const run = everyStep(racerAt(976, 150, 0, -250, NORTH), GAS, 6);
    const takeOff = run.findIndex((racer) => racer.airSteps > 0);
    expect(takeOff).toBeGreaterThan(-1);
    expect(rampAt(STRIP, run[takeOff].kart.x, run[takeOff].kart.y)).toBe(NORTH_RAMP);
    expect(run[takeOff].kart.vy).toBeLessThan(-TOP_SPEED); // faster than usual, and still going north
    expect(run[takeOff].kart.vx).toBeCloseTo(0);
  });

  it("can still jump after it has finished the race", () => {
    const start = racerAt(150, 80, 250, 0);
    const finished = { ...start, progress: { ...start.progress, finished: true } };
    const run = everyStep(finished, NO_KEYS, 10);
    expect(run.some((racer) => racer.airSteps > 0)).toBe(true);
    expect(run[9].progress).toEqual(finished.progress); // and its result stands
  });
});

describe("the three questions a ramp asks (takesOff)", () => {
  /** A kart on the middle of ramp 0, moving at "speed" in the direction "going" (radians). */
  function kartOnTheRamp(speed, going = 0) {
    return { ...createKart(176, 80, 0), vx: Math.cos(going) * speed, vy: Math.sin(going) * speed };
  }

  it("says yes at exactly TAKE_OFF_SPEED, and no just below it", () => {
    expect(TAKE_OFF_SPEED).toBeGreaterThan(0);
    expect(takesOff(STRIP, kartOnTheRamp(TAKE_OFF_SPEED))).toBe(true);
    expect(takesOff(STRIP, kartOnTheRamp(TAKE_OFF_SPEED + 100))).toBe(true);
    expect(takesOff(STRIP, kartOnTheRamp(TAKE_OFF_SPEED - 0.01))).toBe(false);
    expect(takesOff(STRIP, kartOnTheRamp(0))).toBe(false);
  });

  it("says yes up to TAKE_OFF_WITHIN to either side of the ramp's direction, and no beyond", () => {
    expect(TAKE_OFF_WITHIN).toBeGreaterThan(0);
    expect(TAKE_OFF_WITHIN).toBeLessThan(Math.PI / 2); // straight across is never "the right way"
    for (const side of [1, -1]) {
      expect(takesOff(STRIP, kartOnTheRamp(250, side * (TAKE_OFF_WITHIN - 0.01)))).toBe(true);
      expect(takesOff(STRIP, kartOnTheRamp(250, side * (TAKE_OFF_WITHIN + 0.01)))).toBe(false);
      expect(takesOff(STRIP, kartOnTheRamp(250, side * (Math.PI / 2)))).toBe(false); // sideways
    }
    expect(takesOff(STRIP, kartOnTheRamp(250, Math.PI))).toBe(false); // backwards
  });

  it("measures the direction the short way round, also for a ramp that points west", () => {
    // A ramp that points west has the angle pi. A kart going west may have
    // a direction just below pi or just above -pi: both are "the right way".
    const west = createTrack(stripWith({ ramps: [{ column: 5, row: 2, angle: Math.PI }] }));
    expect(takesOff(west, kartOnTheRamp(250, Math.PI - 0.2))).toBe(true);
    expect(takesOff(west, kartOnTheRamp(250, -Math.PI + 0.2))).toBe(true);
    expect(takesOff(west, kartOnTheRamp(250, 0))).toBe(false);
  });

  it("says no anywhere that is not a ramp", () => {
    const beside = { ...createKart(176, 100, 0), vx: 250, vy: 0 };
    expect(takesOff(STRIP, beside)).toBe(false);
    expect(takesOff(TEST_OVAL, { ...createKart(432, 80, 0), vx: 250, vy: 0 })).toBe(false);
  });

  it("does not change the kart it is asked about, and launching makes a new kart", () => {
    const kart = Object.freeze(kartOnTheRamp(250));
    expect(takesOff(STRIP, kart)).toBe(true);
    const launched = launchKart(kart, TEST_DRIVER);
    expect(kart.vx).toBe(250);
    expect(launched).not.toBe(kart);
    expect(speedOf(launched)).toBeCloseTo(BOOSTED_SPEED);
    expect(launched.x).toBe(kart.x);
    expect(launched.y).toBe(kart.y);
  });
});

describe("a kart that must NOT take off", () => {
  it("is one that rolls over the ramp too slowly", () => {
    const run = everyStep(racerAt(162, 80, TAKE_OFF_SPEED - 5, 0), NO_KEYS, 10);
    for (const racer of run) {
      expect(isOnARamp(racer)).toBe(true);
      expect(racer.airSteps).toBe(0);
      expect(racer.boostSteps).toBe(0);
    }
  });

  it("is one that is still too slow when it leaves the ramp, even with the gas held", () => {
    const run = everyStep(racerAt(186, 80, 40, 0), GAS, 30);
    expect(isOnARamp(run[0])).toBe(true);
    expect(isOnARamp(run[29])).toBe(false); // it has driven off the far end
    expect(run.every((racer) => racer.airSteps === 0)).toBe(true);
  });

  it("is one that stands still on the ramp", () => {
    for (const racer of everyStep(racerAt(176, 80), NO_KEYS, 60)) {
      expect(racer.airSteps).toBe(0);
      expect(racer.kart.x).toBe(176);
    }
  });

  it("is one that crosses the ramp sideways", () => {
    // Driving north (up the screen) across the ramp that is driven east.
    const run = everyStep(racerAt(176, 110, 0, -250, NORTH), GAS, 12);
    expect(run.some(isOnARamp)).toBe(true);
    expect(run.every((racer) => racer.airSteps === 0 && racer.boostSteps === 0)).toBe(true);

    // Driving east across the ramp that is driven north.
    const east = everyStep(racerAt(940, 112, 250, 0, 0), GAS, 12);
    expect(east.some(isOnARamp)).toBe(true);
    expect(east.every((racer) => racer.airSteps === 0)).toBe(true);
  });

  it("is one that drives over the ramp backwards, against its direction", () => {
    const run = everyStep(racerAt(220, 80, -250, 0, Math.PI), GAS, 20);
    expect(run.some(isOnARamp)).toBe(true);
    expect(run[19].kart.x).toBeLessThan(160); // it drove right across
    expect(run.every((racer) => racer.airSteps === 0 && racer.boostSteps === 0)).toBe(true);
  });

  it("is one that is already in the air: it passes over the ramp, and its jump is not made longer", () => {
    const run = everyStep(racerAt(150, 80, 300, 0, 0, { airSteps: 12, boostSteps: 20 }), GAS, 12);
    expect(run.some(isOnARamp)).toBe(true);
    run.forEach((racer, index) => {
      expect(racer.airSteps).toBe(12 - (index + 1)); // counting down, never back up
      expect(racer.boostSteps).toBe(20 - (index + 1));
    });
    expect(isOnARamp(run[11])).toBe(false); // it came down beyond the ramp
  });

  it("is one that is spinning out: it slides over the ramp", () => {
    const run = everyStep(spinOut(racerAt(150, 80, 300, 0)), GAS, 20);
    expect(run.some(isOnARamp)).toBe(true);
    expect(run[19].kart.x).toBeGreaterThan(192);
    for (const racer of run) {
      expect(racer.spinSteps).toBeGreaterThan(0);
      expect(racer.airSteps).toBe(0);
      expect(racer.boostSteps).toBe(0);
    }
  });

  it("is one that drives past beside the ramp", () => {
    // Along row 1 (y=48), one row above the ramp.
    const run = everyStep(racerAt(100, 48, 250, 0), GAS, 60);
    expect(run[59].kart.x).toBeGreaterThan(192);
    expect(run.every((racer) => racer.airSteps === 0)).toBe(true);
  });

  it("is any kart on a track without ramps, however fast", () => {
    const racer = { ...createRacer(TEST_OVAL), kart: { ...createKart(200, 80, 0), vx: TOP_SPEED, vy: 0 } };
    for (const now of everyStep(racer, GAS, 120, TEST_OVAL)) {
      expect(now.airSteps).toBe(0);
      expect(now.boostSteps).toBe(0);
    }
  });
});

// ---- In the air ----

describe("a kart in the air", () => {
  it("lands after exactly JUMP_STEPS, counting down by one each step", () => {
    const flight = everyStep(justTookOff(), NO_KEYS, JUMP_STEPS + 5);
    flight.forEach((racer, index) => {
      expect(racer.airSteps).toBe(Math.max(0, JUMP_STEPS - (index + 1)));
    });
    expect(flight[JUMP_STEPS - 2].airSteps).toBe(1); // still flying one step before
    expect(flight[JUMP_STEPS - 1].airSteps).toBe(0); // landed
  });

  it("is not steered, sped up or braked by its keys: whatever is held, it flies exactly the same path", () => {
    const start = justTookOff();
    const noKeys = everyStep(start, NO_KEYS, JUMP_STEPS);
    for (const keys of [
      { gas: false, brake: false, left: true, right: false },
      { gas: false, brake: false, left: false, right: true },
      { gas: false, brake: true, left: false, right: false },
      { gas: true, brake: false, left: true, right: false },
      { gas: true, brake: true, left: true, right: true },
    ]) {
      expect(everyStep(start, keys, JUMP_STEPS)).toEqual(noKeys);
    }
  });

  it("obeys its keys again as soon as it has landed", () => {
    const landed = everyStep(justTookOff(), NO_KEYS, JUMP_STEPS)[JUMP_STEPS - 1];
    const [straight] = everyStep(landed, GAS, 1);
    const [turning] = everyStep(landed, { ...GAS, right: true }, 1);
    const [braking] = everyStep(landed, { ...NO_KEYS, brake: true }, 1);
    expect(turning.kart.angle).toBeGreaterThan(straight.kart.angle);
    expect(speedOf(braking.kart)).toBeLessThan(speedOf(straight.kart));
  });

  it("keeps exactly the speed and the direction it took off with, and points where it pointed", () => {
    const start = justTookOff();
    let before = start.kart;
    for (const racer of everyStep(start, { gas: false, brake: true, left: true, right: false }, JUMP_STEPS)) {
      expect(racer.kart.vx).toBe(start.kart.vx);
      expect(racer.kart.vy).toBe(start.kart.vy);
      expect(racer.kart.angle).toBe(start.kart.angle);
      expect(racer.kart.x).toBeCloseTo(before.x + start.kart.vx * STEP_SECONDS);
      expect(racer.kart.y).toBeCloseTo(before.y);
      before = racer.kart;
    }
  });

  it("flies a long way: several squares, at more than its usual top speed", () => {
    const start = justTookOff();
    const landed = everyStep(start, NO_KEYS, JUMP_STEPS)[JUMP_STEPS - 1];
    const flown = landed.kart.x - start.kart.x;
    expect(flown).toBeCloseTo(BOOSTED_SPEED * JUMP_STEPS * STEP_SECONDS);
    expect(flown).toBeGreaterThan(TOP_SPEED * JUMP_STEPS * STEP_SECONDS);
    expect(flown).toBeGreaterThan(5 * STRIP.tileSize);
  });

  it("is not slowed by the ground under it: over grass it loses nothing", () => {
    // Row 4 (y=144) is grass. A kart on its wheels is slowed there at once.
    const flying = everyStep(racerAt(200, 144, 300, 0, 0, { airSteps: 30 }), GAS, 30);
    const driving = everyStep(racerAt(200, 144, 300, 0), GAS, 30);
    for (const racer of flying) {
      expect(tileKindAt(STRIP, racer.kart.x, racer.kart.y)).toBe("grass");
      expect(speedOf(racer.kart)).toBe(300);
    }
    expect(speedOf(driving[29].kart)).toBeLessThan(300 - 30);
  });

  it("is still stopped by walls: it bounces off and is never inside one", () => {
    // Flying east at the wall at the end of the strip, which begins at x=1888.
    let bounced = false;
    for (const racer of everyStep(racerAt(1800, 80, 400, 0, 0, { airSteps: JUMP_STEPS }), NO_KEYS, JUMP_STEPS)) {
      expect(tileKindAt(STRIP, racer.kart.x, racer.kart.y)).not.toBe("wall");
      expect(racer.kart.x).toBeLessThanOrEqual(1888 - KART_RADIUS + 0.000001);
      if (racer.kart.vx < 0 && racer.airSteps > 0) {
        bounced = true;
      }
    }
    expect(bounced).toBe(true);
  });

  it("is stopped by the wall when a real ramp throws it at one", () => {
    // Ramp 1 is driven north, and the wall along the top begins three squares further on, at y=32.
    const run = everyStep(racerAt(976, 150, 0, -250, NORTH), GAS, 4 + JUMP_STEPS);
    const takeOff = run.findIndex((racer) => racer.airSteps > 0);
    let cameBack = false;
    for (const racer of run.slice(takeOff)) {
      expect(tileKindAt(STRIP, racer.kart.x, racer.kart.y)).not.toBe("wall");
      expect(racer.kart.y).toBeGreaterThanOrEqual(32 + KART_RADIUS - 0.000001);
      if (racer.kart.vy > 0 && racer.airSteps > 0) {
        cameBack = true; // going south again, still in the air
      }
    }
    expect(cameBack).toBe(true);
  });

  it("has its checkpoints counted and its clock running as usual", () => {
    // The checkpoint "first" (x=320..352) lies under the flight from ramp 0.
    const { run, takeOff } = driveOverTheEastRamp(40 + JUMP_STEPS);
    expect(nextCheckpoint(run[takeOff].progress, STRIP)).toBe(1);
    const landed = run[takeOff + JUMP_STEPS];
    expect(landed.airSteps).toBe(0);
    expect(nextCheckpoint(landed.progress, STRIP)).toBe(2); // it was counted while the kart flew over it
    expect(landed.progress.steps).toBe(run[takeOff].progress.steps + JUMP_STEPS);
    const inTheAirAtTheCheckpoint = run.find((racer) => racer.kart.x >= 320 && racer.kart.x < 352);
    expect(inTheAirAtTheCheckpoint.airSteps).toBeGreaterThan(0);
  });

  it("takes off again if it comes down on a ramp and drives on along it", () => {
    // Four more steps of flight bring this kart down on ramp 0.
    const run = everyStep(racerAt(150, 80, 300, 0, 0, { airSteps: 4 }), GAS, 5);
    expect(run[3].airSteps).toBe(0);
    expect(isOnARamp(run[3])).toBe(true);
    expect(run[4].airSteps).toBe(JUMP_STEPS); // the first step on its wheels
  });

  it("does not change the racer it was given", () => {
    const racer = justTookOff();
    const before = Object.freeze({ ...racer, kart: Object.freeze({ ...racer.kart }), progress: Object.freeze({ ...racer.progress }) });
    const after = stepRacer(STRIP, before, GAS, TEST_DRIVER);
    expect(before.airSteps).toBe(JUMP_STEPS);
    expect(before.kart.x).toBe(racer.kart.x);
    expect(after.airSteps).toBe(JUMP_STEPS - 1);
    expect(after.kart.x).toBeGreaterThan(before.kart.x);
  });

  it("moves by flyKart(), which takes only the kart: no keys, no driver, no ground", () => {
    const kart = Object.freeze({ ...createKart(200, 80, 1.1), vx: 120, vy: -60 });
    const after = flyKart(kart);
    expect(after).toEqual({ x: 200 + 120 * STEP_SECONDS, y: 80 - 60 * STEP_SECONDS, angle: 1.1, vx: 120, vy: -60 });
    expect(flyKart(createKart(200, 80, 0.5))).toEqual(createKart(200, 80, 0.5)); // standing still in the air stays put
  });
});

describe("a racer made by hand without the two ramp counters", () => {
  it("is on the ground with no extra speed: it drives as always, and takes off like any other", () => {
    const plain = { kart: { ...createKart(100, 80, 0), vx: 250, vy: 0 }, progress: createRacer(STRIP).progress };
    const withCounters = racerAt(100, 80, 250, 0);
    const [first] = everyStep(plain, GAS, 1);
    expect(first.kart).toEqual(everyStep(withCounters, GAS, 1)[0].kart);
    expect(first.airSteps).toBe(0);
    expect(first.boostSteps).toBe(0);
    expect(everyStep(plain, GAS, 40).some((racer) => racer.airSteps === JUMP_STEPS)).toBe(true);
  });

  it("is made with both counters at zero by createRacer", () => {
    expect(createRacer(STRIP).airSteps).toBe(0);
    expect(createRacer(STRIP).boostSteps).toBe(0);
  });
});

// ---- Extra speed ----

describe("the extra speed after a ramp", () => {
  it("lasts BOOST_STEPS after landing, counting down by one each step from take-off", () => {
    const { run, takeOff } = driveOverTheEastRamp();
    const landing = takeOff + JUMP_STEPS;
    expect(run[landing].airSteps).toBe(0);
    expect(run[landing].boostSteps).toBe(BOOST_STEPS);
    for (let step = 0; step <= JUMP_STEPS + BOOST_STEPS + 10; step++) {
      expect(run[takeOff + step].boostSteps).toBe(Math.max(0, JUMP_STEPS + BOOST_STEPS - step));
    }
  });

  it("lets the kart drive faster than its usual top speed, but never faster than BOOST_SHARE times it", () => {
    const { run, takeOff } = driveOverTheEastRamp();
    const landing = takeOff + JUMP_STEPS;
    for (const racer of run.slice(landing, landing + BOOST_STEPS + 1)) {
      expect(racer.airSteps).toBe(0);
      expect(speedOf(racer.kart)).toBeGreaterThan(TOP_SPEED * 1.2);
    }
    for (const racer of run) {
      expect(speedOf(racer.kart)).toBeLessThanOrEqual(BOOSTED_SPEED + 0.000001);
    }
  });

  it("is over some time after it ran out: the kart is back at its usual top speed, and stays there", () => {
    const { run, takeOff } = driveOverTheEastRamp();
    const ranOut = takeOff + JUMP_STEPS + BOOST_STEPS;
    expect(run[ranOut].boostSteps).toBe(0);
    expect(speedOf(run[ranOut].kart)).toBeGreaterThan(TOP_SPEED * 1.2); // still fast at that moment
    // It slows down step by step, never speeding up again...
    for (let index = ranOut + 1; index < ranOut + 60; index++) {
      expect(speedOf(run[index].kart)).toBeLessThanOrEqual(speedOf(run[index - 1].kart) + 0.000001);
    }
    // ...and a second later it is at its usual top speed, not below it.
    for (const racer of run.slice(ranOut + 60, ranOut + 90)) {
      expect(speedOf(racer.kart)).toBeLessThanOrEqual(TOP_SPEED + 0.000001);
      expect(speedOf(racer.kart)).toBeGreaterThan(TOP_SPEED * 0.95);
    }
  });

  it("is something a kart without it never has: with the gas held on the road it stays at its usual top speed", () => {
    // The same drive along row 1, beside the ramp.
    for (const racer of everyStep(racerAt(100, 48, 250, 0), GAS, 260)) {
      expect(racer.boostSteps).toBe(0);
      expect(speedOf(racer.kart)).toBeLessThanOrEqual(TOP_SPEED + 0.000001);
    }
  });

  it("works on grass too: the top speed there is BOOST_SHARE times the usual one on grass", () => {
    const grassSpeed = topSpeedOf(TEST_DRIVER, GRASS);
    expect(grassSpeed).toBeLessThan(TOP_SPEED);
    // Row 4 (y=144) is grass. Three seconds with the gas held, from a standstill.
    const boosted = everyStep(racerAt(200, 144, 0, 0, 0, { boostSteps: 500 }), GAS, 180);
    const usual = everyStep(racerAt(200, 144), GAS, 180);
    for (const racer of [...boosted, ...usual]) {
      expect(tileKindAt(STRIP, racer.kart.x, racer.kart.y)).toBe("grass");
    }
    expect(speedOf(usual[179].kart)).toBeLessThanOrEqual(grassSpeed + 0.000001);
    expect(speedOf(boosted[179].kart)).toBeGreaterThan(grassSpeed * 1.2);
    expect(speedOf(boosted[179].kart)).toBeGreaterThan(speedOf(usual[179].kart) + 30);
    for (const racer of boosted) {
      expect(speedOf(racer.kart)).toBeLessThanOrEqual(grassSpeed * BOOST_SHARE + 0.000001);
    }
  });

  it("is a higher top speed and nothing else: it pushes nobody who does not press the gas", () => {
    for (const racer of everyStep(racerAt(300, 80, 0, 0, 0, { boostSteps: 100 }), NO_KEYS, 60)) {
      expect(speedOf(racer.kart)).toBe(0);
    }
    // And a kart that only rolls slows down as it always does.
    const rolling = everyStep(racerAt(300, 80, 200, 0, 0, { boostSteps: 100 }), NO_KEYS, 60);
    const usual = everyStep(racerAt(300, 80, 200, 0), NO_KEYS, 60);
    expect(rolling.map((racer) => racer.kart)).toEqual(usual.map((racer) => racer.kart));
  });

  it("is told to the driving rules as a boost on the ground: topSpeedOf multiplies by it", () => {
    expect(topSpeedOf(TEST_DRIVER, { ...ROAD, boost: BOOST_SHARE })).toBeCloseTo(TOP_SPEED * BOOST_SHARE);
    expect(topSpeedOf(TEST_DRIVER, { ...GRASS, boost: BOOST_SHARE })).toBeCloseTo(topSpeedOf(TEST_DRIVER, GRASS) * BOOST_SHARE);
    expect(topSpeedOf(TEST_DRIVER, { ...ROAD, boost: 1 })).toBe(TOP_SPEED);
    expect(ROAD.boost).toBe(undefined); // the ground itself is never changed
    expect(GRASS.boost).toBe(undefined);
  });

  it("counts a boost that is left out, or is not a number above zero, as none", () => {
    expect(topSpeedOf(TEST_DRIVER, ROAD)).toBe(TOP_SPEED);
    for (const boost of [undefined, null, 0, -1, NaN, Infinity, "2", {}]) {
      expect(topSpeedOf(TEST_DRIVER, { ...ROAD, boost }), String(boost)).toBe(TOP_SPEED);
    }
  });

  it("keeps running down while the kart spins out, and does not make the spin any faster", () => {
    const boosted = spinOut(racerAt(300, 80, 250, 0, 0, { boostSteps: 40 }));
    const usual = spinOut(racerAt(300, 80, 250, 0));
    const run = everyStep(boosted, GAS, 50);
    run.forEach((racer, index) => {
      expect(racer.boostSteps).toBe(Math.max(0, 40 - (index + 1)));
      expect(racer.spinSteps).toBe(SPIN_STEPS - (index + 1));
    });
    expect(run.map((racer) => racer.kart)).toEqual(everyStep(usual, GAS, 50).map((racer) => racer.kart));
  });
});

// ---- Ramps and bananas ----

describe("a banana under a kart that is in the air", () => {
  const banana = { id: 1, x: 300, y: 80 };

  it("cannot spin it: a flying racer cannot be spun, and spinOut gives it back as it was", () => {
    const flying = racerAt(300, 80, 400, 0, 0, { airSteps: 20 });
    expect(canBeSpun(flying)).toBe(false);
    expect(spinOut(flying)).toBe(flying);
    expect(bananaHits([banana], [flying])).toEqual([]);
    // One step before landing it is still safe. On the ground it is not.
    expect(canBeSpun({ ...flying, airSteps: 1 })).toBe(false);
    expect(canBeSpun({ ...flying, airSteps: 0 })).toBe(true);
  });

  it("stays where it is, and the kart is unharmed", () => {
    const racers = [racerAt(300, 80, 400, 0, 0, { airSteps: 20 })];
    const bananas = [banana];
    const after = stepBananas(STRIP, bananas, quietMaker(), racers);
    expect(after.racers).toBe(racers);
    expect(after.bananas).toBe(bananas);
  });

  it("still spins a kart that is on the ground at the same spot, and is gone", () => {
    const after = stepBananas(STRIP, [banana], quietMaker(), [racerAt(300, 80, 400, 0)]);
    expect(after.racers[0].spinSteps).toBe(SPIN_STEPS);
    expect(after.bananas).toEqual([]);
  });

  it("spins the kart on the ground and not the one in the air, when both are over it", () => {
    const racers = [racerAt(300, 80, 400, 0, 0, { airSteps: 20 }), racerAt(304, 82, 200, 0)];
    const after = stepBananas(STRIP, [banana], quietMaker(), racers);
    expect(after.racers[0]).toBe(racers[0]);
    expect(after.racers[1].spinSteps).toBe(SPIN_STEPS);
    expect(after.bananas).toEqual([]);
  });

  it("is flown over by a kart that takes the ramp, and hit by the next kart that drives along the ground", () => {
    // The banana lies in the row of ramp 0, under the flight.
    let bananas = [banana];
    let maker = quietMaker();
    let racers = [racerAt(100, 80, 250, 0)];
    let flewOverIt = false;
    for (let step = 0; step < 30 + JUMP_STEPS; step++) {
      racers = racers.map((racer) => stepRacer(STRIP, racer, GAS, TEST_DRIVER));
      ({ bananas, maker, racers } = stepBananas(STRIP, bananas, maker, racers));
      expect(racers[0].spinSteps).toBe(0);
      expect(bananas).toEqual([banana]);
      if (Math.hypot(racers[0].kart.x - banana.x, racers[0].kart.y - banana.y) < HIT_DISTANCE) {
        expect(racers[0].airSteps).toBeGreaterThan(0);
        flewOverIt = true;
      }
    }
    expect(flewOverIt).toBe(true);
    expect(racers[0].kart.x).toBeGreaterThan(banana.x + HIT_DISTANCE); // it is past the banana

    // The next kart starts beyond the ramp, so it stays on the ground.
    racers = [racerAt(230, 80, 200, 0)];
    for (let step = 0; step < 60 && racers[0].spinSteps === 0; step++) {
      racers = racers.map((racer) => stepRacer(STRIP, racer, GAS, TEST_DRIVER));
      ({ bananas, maker, racers } = stepBananas(STRIP, bananas, maker, racers));
    }
    expect(racers[0].airSteps).toBe(0);
    expect(racers[0].spinSteps).toBe(SPIN_STEPS);
    expect(bananas).toEqual([]);
  });
});

describe("the ramp rules", () => {
  it("never roll real dice and are the same every time", () => {
    const dice = vi.spyOn(Math, "random");
    const first = driveOverTheEastRamp().run;
    const second = driveOverTheEastRamp().run;
    expect(second).toEqual(first);
    expect(dice).not.toHaveBeenCalled();
  });
});

// ---- The real track ----

describe("the ramps of the Nova lap", () => {
  const track = NOVA_LAP;
  const size = track.tileSize;
  // How far a kart with the test driver flies: JUMP_STEPS at its boosted top speed.
  const flight = BOOSTED_SPEED * JUMP_STEPS * STEP_SECONDS;
  const squareOf = (x, y) => `column ${Math.floor(x / size)}, row ${Math.floor(y / size)}`;

  it("are there, each on a square of road", () => {
    expect(track.ramps.length).toBeGreaterThan(0);
    for (const ramp of track.ramps) {
      expect(tileKindAt(track, ramp.x, ramp.y), squareOf(ramp.x, ramp.y)).toBe("road");
      expect(rampAt(track, ramp.x, ramp.y)).toBe(ramp);
    }
  });

  it("each have a clear flight: straight on from the middle of the ramp there is road all the way to the landing", () => {
    expect(flight).toBeGreaterThan(4 * size);
    for (const ramp of track.ramps) {
      const from = squareOf(ramp.x, ramp.y);
      const samples = [];
      for (let along = 0; along < flight; along += 4) {
        samples.push(along);
      }
      samples.push(flight); // and the landing spot itself
      for (const along of samples) {
        const x = ramp.x + Math.cos(ramp.angle) * along;
        const y = ramp.y + Math.sin(ramp.angle) * along;
        expect(tileKindAt(track, x, y), `the flight from the ramp at ${from} is over ${squareOf(x, y)}`).toBe("road");
      }
    }
  });

  it("each throw a kart that drives over the middle of them to a landing on the road, without touching a wall", () => {
    for (const ramp of track.ramps) {
      const from = squareOf(ramp.x, ramp.y);
      // A kart 20 units before the middle of the ramp, driving along it at a good speed.
      const kart = {
        ...createKart(ramp.x - Math.cos(ramp.angle) * 20, ramp.y - Math.sin(ramp.angle) * 20, ramp.angle),
        vx: Math.cos(ramp.angle) * 250,
        vy: Math.sin(ramp.angle) * 250,
      };
      const run = everyStep({ ...createRacer(track), kart }, GAS, 6 + JUMP_STEPS, track);
      const takeOff = run.findIndex((racer) => racer.airSteps > 0);
      expect(takeOff, `no take-off from the ramp at ${from}`).toBeGreaterThan(-1);
      const launchSpeed = speedOf(run[takeOff].kart);
      for (const racer of run.slice(takeOff, takeOff + JUMP_STEPS + 1)) {
        // A wall would have changed its speed. (The speed is worked out again each step, so allow for rounding.)
        expect(speedOf(racer.kart), `the flight from the ramp at ${from} touched a wall`).toBeCloseTo(launchSpeed);
        expect(tileKindAt(track, racer.kart.x, racer.kart.y)).not.toBe("wall");
      }
      const landed = run[takeOff + JUMP_STEPS];
      expect(landed.airSteps).toBe(0);
      expect(tileKindAt(track, landed.kart.x, landed.kart.y), `the landing from the ramp at ${from}`).toBe("road");
    }
  });
});
