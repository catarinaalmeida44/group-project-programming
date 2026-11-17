// Tests for the walkers: shared/walkers.js (where a walker is, who topples
// one, how long it sits on the ground) and the check of a track's walkers
// in shared/track.js.
// (Walkers in an online room and in the practice race are tested in
// room-street-life.test.js.)
//
// Most of these tests place a kart by hand on a small square. That is the
// easiest way to try the things that must NOT happen.

import { describe, it, expect, vi, afterEach } from "vitest";
import {
  WALKER_SPEED,
  WALKER_RADIUS,
  INSIDE_STEPS,
  DOWN_STEPS,
  TOPPLE_SPEED,
  SPEED_KEPT_AFTER_WALKER,
  createWalkers,
  walkerAt,
  stepWalkers,
  walkerSpots,
} from "../shared/walkers.js";
import { createRacer, stepRacer, KART_RADIUS } from "../shared/race.js";
import { createKart, speedOf, STEP_SECONDS } from "../shared/physics.js";
import { createTrack, tileKindAt } from "../shared/track.js";
import { TEST_DRIVER } from "../shared/characters.js";
import { TEST_OVAL } from "../shared/tracks/test-oval.js";
import { NOVA_LAP } from "../shared/tracks/nova-lap.js";

afterEach(() => {
  vi.restoreAllMocks();
});

// ---- A small square with two walkers ----
//
// 12 squares of 32 units wide and 7 high. Road inside the walls, with one
// row of grass along the bottom.
//
//   walker 0   walks straight down the screen: from (160, 48) to (160, 176),
//              128 units. Its last steps are on the grass
//   walker 1   has a bend in its path: up from (256, 160) to (256, 64), then
//              right to (320, 64), 160 units in all. It starts a quarter of
//              the way into its round

function plazaDescription() {
  return {
    name: "Walker test plaza",
    tileSize: 32,
    laps: 1,
    map: [
      "############",
      "#..........#",
      "#..........#",
      "#..........#",
      "#..........#",
      "#,,,,,,,,,,#",
      "############",
    ],
    start: { column: 1, row: 3, angle: 0 },
    checkpoints: [
      { name: "finish line", column: 10, row: 1, columns: 1, rows: 5 },
      { name: "first", column: 4, row: 1, columns: 1, rows: 5 },
      { name: "second", column: 7, row: 1, columns: 1, rows: 5 },
    ],
    walkers: [
      { path: [[5, 1.5], [5, 5.5]] },
      { path: [[8, 5], [8, 2], [10, 2]], startShare: 0.25 },
    ],
  };
}

/** The plaza with some parts of its description changed. */
function plazaWith(changes) {
  return { ...plazaDescription(), ...changes };
}

const PLAZA = createTrack(plazaDescription());

// The same square with two walkers on the very same path, side by side all
// the time, to try one kart driving into two people at once.
const PAIR = createTrack(plazaWith({ walkers: [{ path: [[5, 1.5], [5, 5.5]] }, { path: [[5, 1.5], [5, 5.5]] }] }));

const GAS = { gas: true, brake: false, left: false, right: false };
const REACH = KART_RADIUS + WALKER_RADIUS; // closer than this, a kart touches a walker
const PER_STEP = WALKER_SPEED * STEP_SECONDS; // how far a walker walks in one step

/** A racer on the plaza with its kart at a spot, moving at (vx, vy). "extra" sets counters by hand. */
function racerAt(x, y, vx = 0, vy = 0, extra = {}) {
  return { ...createRacer(PLAZA), kart: { ...createKart(x, y, 0), vx, vy }, ...extra };
}

/** Where a walker is at each time from 0 up to "until", as a list. */
function walk(number, until, track = PLAZA) {
  const spots = [];
  for (let time = 0; time <= until; time++) {
    spots.push(walkerAt(track, number, { time, downSteps: 0 }));
  }
  return spots;
}

/**
 * Where a walker will stand when the bumps of the next step are checked:
 * one step of its clock from now. A test puts a kart there.
 */
function nextSpot(walkers, number = 0, track = PLAZA) {
  return walkerAt(track, number, stepWalkers(track, walkers, []).walkers[number]);
}

/** Freezes a thing and everything inside it, so that any attempt to change it stops the test with an error. */
function deepFreeze(thing) {
  if (thing !== null && typeof thing === "object" && !Object.isFrozen(thing)) {
    Object.freeze(thing);
    Object.values(thing).forEach(deepFreeze);
  }
  return thing;
}

// The time at which walker 0 first goes inside, found by watching it.
const GOES_IN = walk(0, 2000).findIndex((spot) => !spot.outside);

// ---- The walkers of a track ----

describe("a track with walkers", () => {
  it("keeps each walker's path in units, with its length and how far into its round it starts", () => {
    expect(PLAZA.walkers).toEqual([
      { points: [{ x: 160, y: 48 }, { x: 160, y: 176 }], length: 128, startShare: 0 },
      { points: [{ x: 256, y: 160 }, { x: 256, y: 64 }, { x: 320, y: 64 }], length: 160, startShare: 0.25 },
    ]);
  });

  it("accepts a path over grass, a start share of 0 or 1, and an empty list", () => {
    expect(tileKindAt(PLAZA, 160, 176)).toBe("grass"); // the end of walker 0's path
    for (const startShare of [0, 1, 0.999]) {
      const track = createTrack(plazaWith({ walkers: [{ path: [[2, 2], [4, 2]], startShare }] }));
      expect(track.walkers[0].startShare).toBe(startShare);
    }
    expect(createTrack(plazaWith({ walkers: [] })).walkers).toEqual([]);
  });

  it("refuses a path with only one point, with none, or that is not a list", () => {
    for (const path of [[[5, 2]], [], undefined, null, "5,2", { from: [5, 2], to: [5, 4] }]) {
      expect(() => createTrack(plazaWith({ walkers: [{ path }] })), JSON.stringify(path)).toThrow(
        /walker 0 needs a path of at least two points/,
      );
    }
  });

  it("refuses a path with a point in a wall, or outside the map", () => {
    for (const point of [[0.5, 3], [5, 6.5], [11.5, 0.5], [-1, 3], [5, 99]]) {
      expect(() => createTrack(plazaWith({ walkers: [{ path: [[5, 2], point] }] })), String(point)).toThrow(
        /walker 0 has a point inside a wall/,
      );
    }
  });

  it("refuses a path with two points on the same spot", () => {
    expect(() => createTrack(plazaWith({ walkers: [{ path: [[5, 2], [5, 2]] }] }))).toThrow(/walker 0 has two points on the same spot/);
    expect(() => createTrack(plazaWith({ walkers: [{ path: [[5, 2], [7, 2], [7, 2]] }] }))).toThrow(/same spot/);
  });

  it("refuses a point that is not a column and a row", () => {
    for (const point of [{ x: 5, y: 2 }, [5], ["5", 2], [5, NaN], 5, null]) {
      expect(() => createTrack(plazaWith({ walkers: [{ path: [[5, 2], point] }] })), JSON.stringify(point)).toThrow(
        /walker 0 has a point that is not \[column, row\]/,
      );
    }
  });

  it("refuses a start share that is not a number from 0 to 1", () => {
    for (const startShare of [-0.1, 1.1, 5, "0.5", NaN, {}]) {
      expect(() => createTrack(plazaWith({ walkers: [{ path: [[5, 2], [5, 4]], startShare }] })), String(startShare)).toThrow(
        /walker 0 has a startShare that is not from 0 to 1/,
      );
    }
  });

  it("refuses a list of walkers that is not a list, and a walker that is not there", () => {
    for (const walkers of [{}, "walkers", 3, null, true]) {
      expect(() => createTrack(plazaWith({ walkers })), String(walkers)).toThrow(/walkers must be a list/);
    }
    expect(() => createTrack(plazaWith({ walkers: [null] }))).toThrow(/walker 0/);
    expect(() => createTrack(plazaWith({ walkers: [undefined] }))).toThrow(/walker 0/);
  });

  it("says which walker is wrong", () => {
    const walkers = [{ path: [[5, 2], [5, 4]] }, { path: [[6, 2]] }];
    expect(() => createTrack(plazaWith({ walkers }))).toThrow(/walker 1/);
  });
});

describe("the walkers at the start of a race", () => {
  it("are one for each walker of the track, all standing up with their clocks at zero", () => {
    expect(createWalkers(PLAZA)).toEqual([
      { time: 0, downSteps: 0 },
      { time: 0, downSteps: 0 },
    ]);
  });

  it("are made afresh each time", () => {
    const first = createWalkers(PLAZA);
    first[0].time = 99;
    expect(createWalkers(PLAZA)[0].time).toBe(0);
  });

  it("are none on a track without walkers, and on a track made by hand that has no list at all", () => {
    expect(createWalkers(TEST_OVAL)).toEqual([]);
    expect(createWalkers({ tileSize: 32 })).toEqual([]);
  });
});

// ---- Where a walker is ----

describe("where a walker is", () => {
  it("starts on the first point of its path, outside and standing up, facing the way it will walk", () => {
    const spot = walkerAt(PLAZA, 0, { time: 0, downSteps: 0 });
    expect(spot).toEqual({ x: 160, y: 48, angle: Math.PI / 2, outside: true, down: false, downShare: 0 });
  });

  it("walks along its path at WALKER_SPEED", () => {
    const spots = walk(0, 60);
    for (let time = 1; time <= 60; time++) {
      expect(spots[time].x).toBe(160);
      expect(spots[time].y - spots[time - 1].y).toBeCloseTo(PER_STEP);
      expect(spots[time].outside).toBe(true);
    }
    expect(spots[60].y).toBeCloseTo(48 + WALKER_SPEED); // one second of walking
  });

  it("reaches the end of its path after its length divided by its speed, and goes inside", () => {
    expect(GOES_IN).toBeGreaterThan(0);
    expect(Math.abs(GOES_IN - 128 / PER_STEP)).toBeLessThan(1); // to the step
    const spots = walk(0, GOES_IN);
    expect(spots[GOES_IN - 1].outside).toBe(true);
    expect(spots[GOES_IN - 1].y).toBeGreaterThan(176 - PER_STEP - 0.000001); // one step from the door
    expect(spots[GOES_IN]).toMatchObject({ x: 160, y: 176, outside: false });
  });

  it("stays inside for exactly INSIDE_STEPS, at the end of its path", () => {
    const spots = walk(0, GOES_IN + INSIDE_STEPS);
    for (let time = GOES_IN; time < GOES_IN + INSIDE_STEPS; time++) {
      expect(spots[time]).toMatchObject({ x: 160, y: 176, outside: false, down: false });
    }
    expect(spots[GOES_IN + INSIDE_STEPS].outside).toBe(true);
  });

  it("then walks back along the same path, facing the other way", () => {
    const comesOut = GOES_IN + INSIDE_STEPS;
    const spots = walk(0, comesOut + GOES_IN);
    expect(spots[comesOut]).toMatchObject({ x: 160, y: 176, outside: true });
    for (let time = comesOut + 1; time < comesOut + GOES_IN; time++) {
      expect(spots[time].outside).toBe(true);
      expect(spots[time].x).toBe(160);
      expect(spots[time].y).toBeLessThan(spots[time - 1].y); // up the screen now
      // On the way out it faced down the screen (the sine of its angle was 1). Now it faces up.
      expect(Math.sin(spots[time].angle)).toBeCloseTo(-1);
      expect(Math.cos(spots[time].angle)).toBeCloseTo(0);
    }
  });

  it("goes inside at the other end too, for INSIDE_STEPS, and then starts its round again", () => {
    const backHome = 2 * GOES_IN + INSIDE_STEPS;
    const round = 2 * (GOES_IN + INSIDE_STEPS);
    const spots = walk(0, round + 60);
    for (let time = backHome; time < round; time++) {
      expect(spots[time]).toMatchObject({ x: 160, y: 48, outside: false });
    }
    expect(spots[round]).toEqual(spots[0]);
    for (let time = 0; time <= 60; time++) {
      expect(spots[round + time].y).toBeCloseTo(spots[time].y);
      expect(spots[round + time].outside).toBe(spots[time].outside);
    }
  });

  it("repeats its round for ever: many rounds later it is where it was", () => {
    const round = 2 * (GOES_IN + INSIDE_STEPS);
    for (const time of [0, 17, GOES_IN + 5, GOES_IN + INSIDE_STEPS + 40, round - 3]) {
      const now = walkerAt(PLAZA, 0, { time, downSteps: 0 });
      const later = walkerAt(PLAZA, 0, { time: time + 25 * round, downSteps: 0 });
      expect(later.y).toBeCloseTo(now.y);
      expect(later.outside).toBe(now.outside);
    }
  });

  it("never leaves its path, and is never in a wall", () => {
    for (const spot of walk(0, 3 * 2 * (GOES_IN + INSIDE_STEPS))) {
      expect(spot.x).toBe(160);
      expect(spot.y).toBeGreaterThanOrEqual(48);
      expect(spot.y).toBeLessThanOrEqual(176);
      expect(tileKindAt(PLAZA, spot.x, spot.y)).not.toBe("wall");
    }
  });

  it("follows a bend in its path", () => {
    // Walker 1 without its head start: up 96 units, then right 64 units.
    const track = createTrack(plazaWith({ walkers: [{ path: [[8, 5], [8, 2], [10, 2]] }] }));
    const spots = walk(0, 400, track);
    const atTheBend = Math.ceil(96 / PER_STEP);
    for (let time = 1; time < atTheBend; time++) {
      expect(spots[time].x).toBe(256);
      expect(spots[time].y).toBeLessThan(spots[time - 1].y);
      expect(Math.sin(spots[time].angle)).toBeCloseTo(-1); // facing up the screen
    }
    for (let time = atTheBend + 1; spots[time].outside; time++) {
      expect(spots[time].y).toBe(64);
      expect(spots[time].x).toBeGreaterThan(spots[time - 1].x);
      expect(spots[time].angle).toBeCloseTo(0); // facing right
    }
    const goesIn = spots.findIndex((spot) => !spot.outside);
    expect(spots[goesIn]).toMatchObject({ x: 320, y: 64 });
    expect(Math.abs(goesIn - 160 / PER_STEP)).toBeLessThan(1);
  });

  it("is further into its round at the start when the track gives it a start share", () => {
    // Walker 1 starts a quarter of the way into its round.
    const plain = createTrack(plazaWith({ walkers: [{ path: [[8, 5], [8, 2], [10, 2]] }] }));
    const goesIn = walk(0, 2000, plain).findIndex((spot) => !spot.outside);
    const round = 2 * (goesIn + INSIDE_STEPS);
    for (const time of [0, 10, 100, 333]) {
      const shifted = walkerAt(PLAZA, 1, { time, downSteps: 0 });
      const same = walkerAt(plain, 0, { time: time + 0.25 * round, downSteps: 0 });
      expect(shifted.x).toBeCloseTo(same.x);
      expect(shifted.y).toBeCloseTo(same.y);
      expect(shifted.outside).toBe(same.outside);
    }
    // So at the start it is not on its first point: it is already past the bend.
    expect(walkerAt(PLAZA, 1, { time: 0, downSteps: 0 }).x).toBeGreaterThan(256);
  });

  it("says when the walker sits on the ground, and how far it is towards getting up", () => {
    const up = walkerAt(PLAZA, 0, { time: 40, downSteps: 0 });
    expect(up.down).toBe(false);
    expect(up.downShare).toBe(0);
    const justToppled = walkerAt(PLAZA, 0, { time: 40, downSteps: DOWN_STEPS });
    expect(justToppled.down).toBe(true);
    expect(justToppled.downShare).toBe(0);
    const halfway = walkerAt(PLAZA, 0, { time: 40, downSteps: DOWN_STEPS / 2 });
    expect(halfway.downShare).toBeCloseTo(0.5);
    const almostUp = walkerAt(PLAZA, 0, { time: 40, downSteps: 1 });
    expect(almostUp.down).toBe(true);
    expect(almostUp.downShare).toBeCloseTo(1 - 1 / DOWN_STEPS);
    // Sitting down does not move it.
    expect(justToppled.x).toBe(up.x);
    expect(justToppled.y).toBe(up.y);
  });

  it("is nowhere (null) for a walker the track does not have, or one that nothing is remembered about", () => {
    expect(walkerAt(PLAZA, 2, { time: 0, downSteps: 0 })).toBe(null);
    expect(walkerAt(PLAZA, -1, { time: 0, downSteps: 0 })).toBe(null);
    expect(walkerAt(PLAZA, 0, undefined)).toBe(null);
    expect(walkerAt(PLAZA, 0, null)).toBe(null);
    expect(walkerAt(TEST_OVAL, 0, { time: 0, downSteps: 0 })).toBe(null);
  });

  it("counts a clock that is not a number as zero, and never gives a spot that is not a number", () => {
    const atZero = walkerAt(PLAZA, 0, { time: 0, downSteps: 0 });
    for (const time of [undefined, null, NaN, Infinity, "late"]) {
      expect(walkerAt(PLAZA, 0, { time, downSteps: 0 }), String(time)).toEqual(atZero);
    }
    const beforeTheStart = walkerAt(PLAZA, 0, { time: -10, downSteps: 0 });
    expect(Number.isFinite(beforeTheStart.x) && Number.isFinite(beforeTheStart.y)).toBe(true);
  });

  it("is the same answer every time, and changes nothing it is given", () => {
    const track = deepFreeze(createTrack(plazaDescription()));
    const walker = deepFreeze({ time: 77, downSteps: 3 });
    expect(walkerAt(track, 1, walker)).toEqual(walkerAt(track, 1, walker));
    expect(walker).toEqual({ time: 77, downSteps: 3 });
  });
});

// ---- One step of the walkers ----

describe("one step of the walkers: their clocks", () => {
  it("moves the clock of every walker that is up on by one, so each walks a little further", () => {
    const after = stepWalkers(PLAZA, createWalkers(PLAZA), []);
    expect(after).toEqual({
      walkers: [
        { time: 1, downSteps: 0 },
        { time: 1, downSteps: 0 },
      ],
      racers: [],
      hits: [],
    });
    expect(walkerAt(PLAZA, 0, after.walkers[0]).y).toBeCloseTo(48 + PER_STEP);
  });

  it("lets a walker that sits on the ground sit one step less, while its own clock stands still", () => {
    const after = stepWalkers(PLAZA, [{ time: 50, downSteps: 40 }, { time: 50, downSteps: 0 }], []);
    expect(after.walkers).toEqual([
      { time: 50, downSteps: 39 },
      { time: 51, downSteps: 0 },
    ]);
  });

  it("keeps the clocks running while the walkers are inside", () => {
    let walkers = [{ time: GOES_IN, downSteps: 0 }, { time: 0, downSteps: 0 }];
    for (let step = 1; step <= INSIDE_STEPS; step++) {
      ({ walkers } = stepWalkers(PLAZA, walkers, []));
      expect(walkers[0].time).toBe(GOES_IN + step);
    }
    expect(walkerAt(PLAZA, 0, walkers[0]).outside).toBe(true); // out again
  });
});

describe("a kart that drives into a walker fast", () => {
  it("topples it: the walker sits down for DOWN_STEPS, and the step says who toppled whom", () => {
    const walkers = createWalkers(PLAZA);
    const spot = nextSpot(walkers);
    const racers = [racerAt(spot.x - 5, spot.y + 3, 200, 0)];
    const after = stepWalkers(PLAZA, walkers, racers);
    expect(after.hits).toEqual([{ racer: 0, walker: 0 }]);
    expect(after.walkers[0]).toEqual({ time: 1, downSteps: DOWN_STEPS });
    expect(walkerAt(PLAZA, 0, after.walkers[0])).toMatchObject({ x: spot.x, y: spot.y, down: true, outside: true });
    expect(after.walkers[1]).toEqual({ time: 1, downSteps: 0 }); // the other walker walks on
  });

  it("keeps SPEED_KEPT_AFTER_WALKER of its speed, in the same direction", () => {
    expect(SPEED_KEPT_AFTER_WALKER).toBeGreaterThan(0);
    expect(SPEED_KEPT_AFTER_WALKER).toBeLessThan(1);
    const walkers = createWalkers(PLAZA);
    const spot = nextSpot(walkers);
    // Moving right and up the screen at once: 120 and 160 make a speed of 200.
    const racers = [racerAt(spot.x, spot.y, 120, -160)];
    const [after] = stepWalkers(PLAZA, walkers, racers).racers;
    expect(after.kart.vx).toBeCloseTo(120 * SPEED_KEPT_AFTER_WALKER);
    expect(after.kart.vy).toBeCloseTo(-160 * SPEED_KEPT_AFTER_WALKER);
    expect(speedOf(after.kart)).toBeCloseTo(200 * SPEED_KEPT_AFTER_WALKER);
    expect(Math.atan2(after.kart.vy, after.kart.vx)).toBeCloseTo(Math.atan2(-160, 120));
  });

  it("is not moved or turned, and its laps, clock and spin are left as they were", () => {
    const walkers = createWalkers(PLAZA);
    const spot = nextSpot(walkers);
    const racer = racerAt(spot.x + 2, spot.y, 200, 0, { spinShieldSteps: 7 });
    const [after] = stepWalkers(PLAZA, walkers, [racer]).racers;
    expect(after.kart).toMatchObject({ x: racer.kart.x, y: racer.kart.y, angle: racer.kart.angle });
    expect(after.progress).toBe(racer.progress);
    expect(after).toMatchObject({ spinSteps: 0, spinShieldSteps: 7, airSteps: 0, boostSteps: 0 });
  });

  it("topples it when the two circles overlap, however little, and not when they only come close", () => {
    expect(WALKER_RADIUS).toBeGreaterThan(0);
    const walkers = createWalkers(PLAZA);
    const spot = nextSpot(walkers);
    const hitsFrom = (dx, dy) => stepWalkers(PLAZA, walkers, [racerAt(spot.x + dx, spot.y + dy, 200, 0)]).hits;
    expect(hitsFrom(REACH - 0.01, 0)).toHaveLength(1);
    expect(hitsFrom(0, -(REACH - 0.01))).toHaveLength(1);
    expect(hitsFrom(12, 12)).toHaveLength(1); //     17.0 units away, diagonally: just inside
    expect(hitsFrom(REACH + 0.01, 0)).toEqual([]);
    expect(hitsFrom(0, REACH + 0.01)).toEqual([]);
    expect(hitsFrom(12.1, 12.1)).toEqual([]); //     17.1 units away
    expect(hitsFrom(100, 0)).toEqual([]);
  });

  it("topples it while spinning out too: a sliding kart is moving", () => {
    const walkers = createWalkers(PLAZA);
    const spot = nextSpot(walkers);
    const spinning = racerAt(spot.x, spot.y, 150, 0, { spinSteps: 30, spinShieldSteps: 90 });
    const after = stepWalkers(PLAZA, walkers, [spinning]);
    expect(after.hits).toEqual([{ racer: 0, walker: 0 }]);
    expect(after.racers[0].spinSteps).toBe(30); // the spin goes on as it was
    expect(speedOf(after.racers[0].kart)).toBeCloseTo(150 * SPEED_KEPT_AFTER_WALKER);
  });

  it("topples it after finishing the race too, and keeps its result", () => {
    const walkers = createWalkers(PLAZA);
    const spot = nextSpot(walkers);
    const start = racerAt(spot.x, spot.y, 150, 0);
    const finished = { ...start, progress: { ...start.progress, finished: true, lapsDone: 1, steps: 900, lapSteps: [900] } };
    const after = stepWalkers(PLAZA, walkers, [finished]);
    expect(after.hits).toEqual([{ racer: 0, walker: 0 }]);
    expect(after.racers[0].progress).toBe(finished.progress);
  });
});

describe("a walker that must NOT be toppled", () => {
  /** One step with a single kart standing right on walker 0. Gives what stepWalkers gives, and the racers handed in. */
  function kartOnWalker(walkers, vx, vy = 0, extra = {}) {
    const spot = nextSpot(walkers);
    const racers = [racerAt(spot.x, spot.y, vx, vy, extra)];
    return { ...stepWalkers(PLAZA, walkers, racers), given: racers };
  }

  it("is one that a kart only nudges: at TOPPLE_SPEED or slower nothing happens", () => {
    expect(TOPPLE_SPEED).toBeGreaterThan(0);
    for (const speed of [0, 1, TOPPLE_SPEED / 2, TOPPLE_SPEED]) {
      const after = kartOnWalker(createWalkers(PLAZA), speed);
      expect(after.hits, String(speed)).toEqual([]);
      expect(after.walkers[0]).toEqual({ time: 1, downSteps: 0 }); // it walks on
      expect(after.racers).toBe(after.given); // and the kart keeps all its speed
    }
    // A little faster, in any direction, and it topples.
    expect(kartOnWalker(createWalkers(PLAZA), TOPPLE_SPEED + 0.5).hits).toHaveLength(1);
    expect(kartOnWalker(createWalkers(PLAZA), 0, -(TOPPLE_SPEED + 0.5)).hits).toHaveLength(1);
  });

  it("is one that is inside a building: a kart drives over the spot at full speed", () => {
    const inside = [{ time: GOES_IN + 10, downSteps: 0 }, { time: 0, downSteps: 0 }];
    expect(nextSpot(inside).outside).toBe(false);
    const after = kartOnWalker(inside, 300);
    expect(after.hits).toEqual([]);
    expect(after.walkers[0]).toEqual({ time: GOES_IN + 11, downSteps: 0 });
    expect(after.racers).toBe(after.given);
  });

  it("is one that already sits on the ground: it is not toppled again, and karts pass", () => {
    const down = [{ time: 50, downSteps: 40 }, { time: 0, downSteps: 0 }];
    const after = kartOnWalker(down, 300);
    expect(after.hits).toEqual([]);
    expect(after.walkers[0]).toEqual({ time: 50, downSteps: 39 }); // counting down, never back up
    expect(after.racers).toBe(after.given);
  });

  it("is one that sits on the ground, for as long as it sits, however many karts drive over it", () => {
    let walkers = createWalkers(PLAZA);
    const spot = nextSpot(walkers);
    const racers = [racerAt(spot.x, spot.y, 300, 0), racerAt(spot.x + 4, spot.y, 0, 250)];
    let hits;
    ({ walkers, hits } = stepWalkers(PLAZA, walkers, racers));
    expect(hits).toHaveLength(1);
    // While it sits (all but the last step, when it gets up), nobody can topple it.
    for (let step = 1; step < DOWN_STEPS; step++) {
      const after = stepWalkers(PLAZA, walkers, racers);
      expect(after.hits).toEqual([]);
      expect(after.racers).toBe(racers);
      expect(after.walkers[0].downSteps).toBe(DOWN_STEPS - step);
      walkers = after.walkers;
    }
  });

  it("is one under a kart that is in the air: it flies over people's heads", () => {
    for (const airSteps of [30, 1]) {
      const after = kartOnWalker(createWalkers(PLAZA), 400, 0, { airSteps });
      expect(after.hits, String(airSteps)).toEqual([]);
      expect(after.walkers[0]).toEqual({ time: 1, downSteps: 0 });
      expect(after.racers).toBe(after.given);
    }
    // The same kart on its wheels does topple it.
    expect(kartOnWalker(createWalkers(PLAZA), 400, 0, { airSteps: 0 }).hits).toHaveLength(1);
  });

  it("is one that nobody is near", () => {
    const racers = [racerAt(48, 112, 300, 0)];
    const after = stepWalkers(PLAZA, createWalkers(PLAZA), racers);
    expect(after.hits).toEqual([]);
    expect(after.racers).toBe(racers);
  });
});

describe("a walker that sits on the ground", () => {
  /** Topples walker 0 at the start of a race. Gives the walkers just after. */
  function toppled() {
    const walkers = createWalkers(PLAZA);
    const spot = nextSpot(walkers);
    return stepWalkers(PLAZA, walkers, [racerAt(spot.x, spot.y, 200, 0)]).walkers;
  }

  it("gets up after exactly DOWN_STEPS, and its clock stands still all that time", () => {
    let walkers = toppled();
    const clockWhenToppled = walkers[0].time;
    const where = walkerAt(PLAZA, 0, walkers[0]);
    for (let step = 1; step <= DOWN_STEPS; step++) {
      ({ walkers } = stepWalkers(PLAZA, walkers, []));
      expect(walkers[0]).toEqual({ time: clockWhenToppled, downSteps: DOWN_STEPS - step });
      const now = walkerAt(PLAZA, 0, walkers[0]);
      expect(now.down).toBe(step < DOWN_STEPS); // still sitting one step before, up at the last
      expect(now.x).toBe(where.x);
      expect(now.y).toBe(where.y);
    }
    // The other walker walked on all the while.
    expect(walkers[1].time).toBe(1 + DOWN_STEPS);
  });

  it("walks on from where it sat", () => {
    let walkers = toppled();
    const where = walkerAt(PLAZA, 0, walkers[0]);
    for (let step = 0; step < DOWN_STEPS; step++) {
      ({ walkers } = stepWalkers(PLAZA, walkers, []));
    }
    ({ walkers } = stepWalkers(PLAZA, walkers, []));
    expect(walkers[0]).toEqual({ time: 2, downSteps: 0 });
    expect(walkerAt(PLAZA, 0, walkers[0]).y).toBeCloseTo(where.y + PER_STEP);
  });

  it("is further towards getting up with every step", () => {
    let walkers = toppled();
    let shareBefore = walkerAt(PLAZA, 0, walkers[0]).downShare;
    expect(shareBefore).toBe(0);
    for (let step = 1; step < DOWN_STEPS; step++) {
      ({ walkers } = stepWalkers(PLAZA, walkers, []));
      const share = walkerAt(PLAZA, 0, walkers[0]).downShare;
      expect(share).toBeGreaterThan(shareBefore);
      expect(share).toBeLessThan(1);
      shareBefore = share;
    }
  });

  it("can be toppled again as soon as it is up: in the very step its count reaches zero", () => {
    const lastStepDown = [{ time: 50, downSteps: 1 }, { time: 0, downSteps: 0 }];
    const spot = nextSpot(lastStepDown);
    expect(spot.down).toBe(false);
    const after = stepWalkers(PLAZA, lastStepDown, [racerAt(spot.x, spot.y, 200, 0)]);
    expect(after.hits).toEqual([{ racer: 0, walker: 0 }]);
    expect(after.walkers[0]).toEqual({ time: 50, downSteps: DOWN_STEPS });
  });
});

describe("several karts and several walkers in one step", () => {
  it("lets only one kart topple a walker: the first in the list that reaches it", () => {
    const walkers = createWalkers(PLAZA);
    const spot = nextSpot(walkers);
    const racers = [racerAt(spot.x - 3, spot.y, 200, 0), racerAt(spot.x + 3, spot.y, -260, 0)];
    const after = stepWalkers(PLAZA, walkers, racers);
    expect(after.hits).toEqual([{ racer: 0, walker: 0 }]);
    expect(speedOf(after.racers[0].kart)).toBeCloseTo(200 * SPEED_KEPT_AFTER_WALKER);
    expect(after.racers[1]).toBe(racers[1]); // the second kart keeps all its speed
  });

  it("passes over a kart that cannot topple the walker, to the next one in the list that can", () => {
    const walkers = createWalkers(PLAZA);
    const spot = nextSpot(walkers);
    const racers = [
      racerAt(spot.x, spot.y, 10, 0), //                    creeping
      racerAt(spot.x, spot.y, 400, 0, { airSteps: 9 }), //  in the air
      racerAt(spot.x + 60, spot.y, 300, 0), //              too far away
      racerAt(spot.x, spot.y + 4, 0, 180), //               this one
    ];
    const after = stepWalkers(PLAZA, walkers, racers);
    expect(after.hits).toEqual([{ racer: 3, walker: 0 }]);
    expect(after.racers.slice(0, 3)).toEqual(racers.slice(0, 3));
    expect(after.racers[0]).toBe(racers[0]);
    expect(after.racers[3].kart.vy).toBeCloseTo(180 * SPEED_KEPT_AFTER_WALKER);
  });

  it("lets one kart topple two walkers at once, losing speed only once", () => {
    const walkers = createWalkers(PAIR);
    const spot = nextSpot(walkers, 0, PAIR);
    expect(nextSpot(walkers, 1, PAIR)).toEqual(spot); // the two walk side by side
    const after = stepWalkers(PAIR, walkers, [racerAt(spot.x, spot.y, 100, 0)]);
    expect(after.hits).toEqual([
      { racer: 0, walker: 0 },
      { racer: 0, walker: 1 },
    ]);
    expect(after.walkers.map((walker) => walker.downSteps)).toEqual([DOWN_STEPS, DOWN_STEPS]);
    // Once: 100 becomes 40. Twice would have left 16.
    expect(speedOf(after.racers[0].kart)).toBeCloseTo(100 * SPEED_KEPT_AFTER_WALKER);
    expect(100 * SPEED_KEPT_AFTER_WALKER).toBeLessThan(TOPPLE_SPEED); // too slow for a second walker, had it been judged afterwards
  });

  it("names every pair when two karts topple a walker each, in the order of the walkers", () => {
    const walkers = createWalkers(PLAZA);
    const first = nextSpot(walkers, 0);
    const second = nextSpot(walkers, 1);
    const racers = [racerAt(second.x, second.y, 200, 0), racerAt(first.x, first.y, 200, 0), racerAt(48, 48, 200, 0)];
    const after = stepWalkers(PLAZA, walkers, racers);
    expect(after.hits).toEqual([
      { racer: 1, walker: 0 },
      { racer: 0, walker: 1 },
    ]);
    expect(after.racers[2]).toBe(racers[2]); // the third kart touched nobody
  });
});

describe("one step of the walkers: what it must never do", () => {
  it("never changes anything it was given", () => {
    const track = deepFreeze(createTrack(plazaDescription()));
    const walkers = deepFreeze(createWalkers(track));
    const spot = nextSpot(walkers, 0, track);
    const racers = deepFreeze([racerAt(spot.x, spot.y, 200, 0), racerAt(48, 48, 100, 0)]);
    // Changing something frozen stops with an error, so getting here at all is the test.
    const after = stepWalkers(track, walkers, racers);
    expect(after.hits).toHaveLength(1);
    expect(walkers).toEqual([
      { time: 0, downSteps: 0 },
      { time: 0, downSteps: 0 },
    ]);
    expect(racers[0].kart.vx).toBe(200);
    expect(after.walkers).not.toBe(walkers);
    expect(after.racers).not.toBe(racers);
    expect(after.racers[0]).not.toBe(racers[0]);
    expect(after.racers[1]).toBe(racers[1]);
  });

  it("never rolls dice or looks at a clock: the same walkers and karts give the same answer", () => {
    const dice = vi.spyOn(Math, "random");
    const clock = vi.spyOn(Date, "now");
    const walkers = [{ time: 41, downSteps: 0 }, { time: 300, downSteps: 12 }];
    const spot = nextSpot(walkers);
    const racers = [racerAt(spot.x, spot.y, 200, 30), racerAt(100, 100, 50, 0)];
    const first = stepWalkers(PLAZA, walkers, racers);
    const second = stepWalkers(PLAZA, walkers, racers);
    expect(second).toEqual(first);
    expect(first.hits).toHaveLength(1);
    expect(dice).not.toHaveBeenCalled();
    expect(clock).not.toHaveBeenCalled();
  });

  it("never stops a race over a list of walkers that is too short, or not a list: the missing ones start afresh", () => {
    const fresh = [
      { time: 1, downSteps: 0 },
      { time: 1, downSteps: 0 },
    ];
    for (const walkers of [[], undefined, null, "walkers", 7, {}, true]) {
      expect(stepWalkers(PLAZA, walkers, []).walkers, String(walkers)).toEqual(fresh);
    }
    expect(stepWalkers(PLAZA, [{ time: 30, downSteps: 5 }], []).walkers).toEqual([
      { time: 30, downSteps: 4 },
      { time: 1, downSteps: 0 },
    ]);
  });

  it("leaves out walkers the track does not have", () => {
    const tooMany = [{ time: 5, downSteps: 0 }, { time: 6, downSteps: 0 }, { time: 7, downSteps: 0 }, { time: 8, downSteps: 3 }];
    expect(stepWalkers(PLAZA, tooMany, []).walkers).toEqual([
      { time: 6, downSteps: 0 },
      { time: 7, downSteps: 0 },
    ]);
  });

  it("puts right a walker whose numbers are not numbers, instead of passing them on", () => {
    const strange = [null, { time: "late", downSteps: -3 }];
    expect(stepWalkers(PLAZA, strange, []).walkers).toEqual([
      { time: 1, downSteps: 0 },
      { time: 1, downSteps: 0 },
    ]);
    const more = [{ time: 30 }, { time: NaN, downSteps: Infinity }];
    expect(stepWalkers(PLAZA, more, []).walkers).toEqual([
      { time: 31, downSteps: 0 },
      { time: 1, downSteps: 0 },
    ]);
    // A kart can still topple a walker that was put right.
    const spot = walkerAt(PLAZA, 0, { time: 1, downSteps: 0 });
    expect(stepWalkers(PLAZA, strange, [racerAt(spot.x, spot.y, 200, 0)]).hits).toEqual([{ racer: 0, walker: 0 }]);
  });

  it("does nothing at all on a track without walkers", () => {
    const racers = [{ ...createRacer(TEST_OVAL), kart: { ...createKart(300, 80, 0), vx: 250, vy: 0 } }];
    const after = stepWalkers(TEST_OVAL, [{ time: 5, downSteps: 0 }], racers);
    expect(after).toEqual({ walkers: [], racers, hits: [] });
    expect(after.racers).toBe(racers);
    expect(stepWalkers({ tileSize: 32 }, undefined, racers).walkers).toEqual([]);
  });
});

describe("the spots to steer round", () => {
  it("are where every walker is that is outside and standing up", () => {
    const walkers = [{ time: 20, downSteps: 0 }, { time: 0, downSteps: 0 }];
    const first = walkerAt(PLAZA, 0, walkers[0]);
    const second = walkerAt(PLAZA, 1, walkers[1]);
    expect(walkerSpots(PLAZA, walkers)).toEqual([
      { x: first.x, y: first.y },
      { x: second.x, y: second.y },
    ]);
  });

  it("leave out a walker that sits on the ground, and one that is inside", () => {
    const second = walkerAt(PLAZA, 1, { time: 0, downSteps: 0 });
    expect(walkerSpots(PLAZA, [{ time: 20, downSteps: 5 }, { time: 0, downSteps: 0 }])).toEqual([{ x: second.x, y: second.y }]);
    expect(walkerSpots(PLAZA, [{ time: GOES_IN + 1, downSteps: 0 }, { time: 0, downSteps: 0 }])).toEqual([
      { x: second.x, y: second.y },
    ]);
    expect(walkerSpots(PLAZA, [{ time: GOES_IN + 1, downSteps: 0 }, { time: 0, downSteps: 9 }])).toEqual([]);
  });

  it("are worked out without stopping, whatever list they are given", () => {
    const fresh = walkerSpots(PLAZA, createWalkers(PLAZA));
    expect(fresh).toHaveLength(2);
    for (const walkers of [undefined, null, [], "walkers", 7]) {
      expect(walkerSpots(PLAZA, walkers), String(walkers)).toEqual(fresh);
    }
    expect(walkerSpots(TEST_OVAL, [{ time: 5, downSteps: 0 }])).toEqual([]);
  });

  it("change nothing they are given", () => {
    const walkers = deepFreeze([{ time: 20, downSteps: 0 }, { time: 0, downSteps: 0 }]);
    expect(walkerSpots(PLAZA, walkers)).toHaveLength(2);
    expect(walkers[0]).toEqual({ time: 20, downSteps: 0 });
  });
});

// ---- Driving ----

describe("a kart that is driven across the square", () => {
  /**
   * Drives a kart right along the middle row (y=112) with the gas held,
   * while walker 0 crosses that row. Gives what happened at the first bump.
   */
  function driveAtTheWalker(walkers) {
    let racers = [racerAt(48, 112)];
    for (let step = 0; step < 150; step++) {
      const moved = racers.map((racer) => stepRacer(PLAZA, racer, GAS, TEST_DRIVER));
      const after = stepWalkers(PLAZA, walkers, moved);
      if (after.hits.length > 0) {
        return { step, before: moved[0], after: after.racers[0], walkers: after.walkers, hits: after.hits };
      }
      racers = after.racers;
      walkers = after.walkers;
    }
    return { step: null, after: racers[0], walkers, hits: [] };
  }

  it("topples the walker that is in its way, and loses most of its speed", () => {
    // 50 steps into its walk, walker 0 is about to cross the row the kart drives along.
    const bump = driveAtTheWalker([{ time: 50, downSteps: 0 }, { time: 0, downSteps: 0 }]);
    expect(bump.hits).toEqual([{ racer: 0, walker: 0 }]);
    expect(speedOf(bump.before.kart)).toBeGreaterThan(TOPPLE_SPEED + 50); // it came fast
    expect(speedOf(bump.after.kart)).toBeCloseTo(speedOf(bump.before.kart) * SPEED_KEPT_AFTER_WALKER);
    expect(bump.walkers[0].downSteps).toBe(DOWN_STEPS);
    const walker = walkerAt(PLAZA, 0, bump.walkers[0]);
    expect(Math.hypot(walker.x - bump.after.kart.x, walker.y - bump.after.kart.y)).toBeLessThan(REACH);
  });

  it("drives on afterwards: the walker on the ground is not a wall", () => {
    const bump = driveAtTheWalker([{ time: 50, downSteps: 0 }, { time: 0, downSteps: 0 }]);
    let racer = bump.after;
    let walkers = bump.walkers;
    const slow = speedOf(racer.kart);
    for (let step = 0; step < 30; step++) {
      const after = stepWalkers(PLAZA, walkers, [stepRacer(PLAZA, racer, GAS, TEST_DRIVER)]);
      expect(after.hits).toEqual([]);
      [racer] = after.racers;
      walkers = after.walkers;
    }
    expect(racer.kart.x).toBeGreaterThan(160 + REACH); // through the spot and out the other side
    expect(speedOf(racer.kart)).toBeGreaterThan(slow + 50); // and picking up speed again
  });

  it("touches nobody when the walker is not there yet", () => {
    // From the very start of its walk, walker 0 has not reached the middle row when the kart passes.
    const bump = driveAtTheWalker(createWalkers(PLAZA));
    expect(bump.hits).toEqual([]);
    expect(bump.walkers.every((walker) => walker.downSteps === 0)).toBe(true);
  });
});

// ---- The real track ----

describe("the walkers of the Nova lap", () => {
  const track = NOVA_LAP;
  const size = track.tileSize;
  const squareOf = (x, y) => `column ${Math.floor(x / size)}, row ${Math.floor(y / size)}`;

  it("are there, each with a path of some length and a start share from 0 to 1", () => {
    expect(track.walkers.length).toBeGreaterThan(0);
    expect(createWalkers(track)).toHaveLength(track.walkers.length);
    for (const walker of track.walkers) {
      expect(walker.points.length).toBeGreaterThanOrEqual(2);
      expect(walker.length).toBeGreaterThan(size);
      expect(walker.startShare).toBeGreaterThanOrEqual(0);
      expect(walker.startShare).toBeLessThanOrEqual(1);
    }
  });

  it("walk on open ground all the way: no step of any path, taken every 4 units, is in a wall", () => {
    track.walkers.forEach((walker, number) => {
      for (let i = 1; i < walker.points.length; i++) {
        const from = walker.points[i - 1];
        const to = walker.points[i];
        const steps = Math.ceil(Math.hypot(to.x - from.x, to.y - from.y) / 4);
        for (let step = 0; step <= steps; step++) {
          const x = from.x + ((to.x - from.x) * step) / steps;
          const y = from.y + ((to.y - from.y) * step) / steps;
          expect(tileKindAt(track, x, y), `walker ${number} walks through a wall at ${squareOf(x, y)}`).not.toBe("wall");
        }
      }
    });
  });

  it("are never in a wall at any moment of a whole round, wherever their clock says they are", () => {
    track.walkers.forEach((walker, number) => {
      const round = 2 * (Math.ceil(walker.length / PER_STEP) + INSIDE_STEPS);
      let wentInside = false;
      for (let time = 0; time <= round; time++) {
        const spot = walkerAt(track, number, { time, downSteps: 0 });
        expect(tileKindAt(track, spot.x, spot.y), `walker ${number} at time ${time}, ${squareOf(spot.x, spot.y)}`).not.toBe("wall");
        wentInside = wentInside || !spot.outside;
      }
      expect(wentInside).toBe(true);
    });
  });
});
