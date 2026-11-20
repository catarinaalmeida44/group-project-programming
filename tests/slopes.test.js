// Tests for shared/slopes.js and the slopes in shared/race.js: parts of a
// track that go downhill one way, so that going down is fast and going up
// is slow. (Added on 20 November 2026 for the stairs and the path past the
// beach tunnel on the Nova lap.)
//
// The tests drive karts with the real rules (stepRacer) on a long, wide
// strip of road made just for them: once flat, once all downhill to the
// east, and once all downhill to the west, so that driving east there is
// going uphill. They compare behaviours ("downhill gets further"), not
// exact numbers, so the numbers can be tuned without breaking them.

import { describe, it, expect } from "vitest";
import { createTrack } from "../shared/track.js";
import { createRacer, stepRacer } from "../shared/race.js";
import { speedOf, topSpeedOf } from "../shared/physics.js";
import { TEST_DRIVER } from "../shared/characters.js";
import {
  readSlopes,
  slopeAt,
  downhillShare,
  slopeShare,
  pullDownhill,
  DOWNHILL,
  SLOPE_TOP_SPEED,
} from "../shared/slopes.js";
import { NOVA_LAP } from "../shared/tracks/nova-lap.js";

const GAS = { gas: true, brake: false, left: false, right: false };
const NO_KEYS = { gas: false, brake: false, left: false, right: false };
const TILE = 48;

/** A strip of road 60 squares long and 9 wide, with the start in the middle, pointing east. */
function strip(slopes, start = { column: 30, row: 4, angle: 0 }) {
  const wall = "#".repeat(60);
  const road = "#" + ".".repeat(58) + "#";
  return createTrack({
    name: "Slope test strip",
    tileSize: TILE,
    laps: 1,
    map: [wall, road, road, road, road, road, road, road, wall],
    start,
    checkpoints: [
      { name: "finish line", column: 57, row: 1, columns: 1, rows: 7 },
      { name: "first", column: 5, row: 1, columns: 1, rows: 7 },
      { name: "second", column: 50, row: 1, columns: 1, rows: 7 },
    ],
    ...(slopes === undefined ? {} : { slopes }),
  });
}

const ALL_OF_IT = { column: 1, row: 1, columns: 58, rows: 7 };
const FLAT = strip();
const DOWN_EAST = strip([{ ...ALL_OF_IT, downhill: "east", steepness: 1 }]);
const DOWN_WEST = strip([{ ...ALL_OF_IT, downhill: "west", steepness: 1 }]); // driving east here is uphill

/** Drives a racer from the start for a number of steps, holding these keys. */
function drive(track, keys, steps, racer = createRacer(track)) {
  let now = racer;
  for (let step = 0; step < steps; step++) {
    now = stepRacer(track, now, keys, TEST_DRIVER);
  }
  return now;
}

describe("reading the slopes of a track", () => {
  it("gives no slopes to a track that lists none, as every track had before", () => {
    expect(FLAT.slopes).toEqual([]);
  });

  it("turns a slope into a rectangle in units, with its downhill direction and steepness", () => {
    const [slope] = strip([{ name: "test", column: 2, row: 3, columns: 4, rows: 2, downhill: "south", steepness: 0.5 }]).slopes;
    expect(slope).toEqual({ name: "test", angle: DOWNHILL.south, steepness: 0.5, left: 96, top: 144, right: 288, bottom: 240 });
  });

  it("refuses slopes that are not a list", () => {
    expect(() => strip("downhill")).toThrow(/must be a list/);
    expect(() => strip({ column: 1 })).toThrow(/must be a list/);
  });

  it("refuses a slope with no proper rectangle, or one that reaches outside the map", () => {
    const bad = [
      { column: 1, row: 1, columns: 0, rows: 2 },
      { column: 1, row: 1, columns: 2 },
      { column: 1.5, row: 1, columns: 2, rows: 2 },
      { column: "1", row: 1, columns: 2, rows: 2 },
      { column: 55, row: 1, columns: 10, rows: 2 },
      { column: -1, row: 1, columns: 2, rows: 2 },
    ];
    for (const shape of bad) {
      expect(() => strip([{ ...shape, downhill: "east", steepness: 1 }]), JSON.stringify(shape)).toThrow(/slope 0/);
    }
  });

  it("refuses a slope without a downhill direction it knows", () => {
    for (const downhill of [undefined, "up", "down", "East", "constructor", "__proto__", 0]) {
      expect(() => strip([{ ...ALL_OF_IT, downhill, steepness: 1 }]), String(downhill)).toThrow(/downhill/);
    }
  });

  it("refuses a steepness that is not above 0 and at most 1", () => {
    for (const steepness of [0, -0.5, 1.01, 2, "1", NaN, undefined, null]) {
      expect(() => strip([{ ...ALL_OF_IT, downhill: "east", steepness }]), String(steepness)).toThrow(/steepness/);
    }
  });

  it("does the same for a list given straight to readSlopes", () => {
    expect(readSlopes(undefined, TILE, () => true)).toEqual([]);
    expect(() => readSlopes([null], TILE, () => true)).toThrow(/slope 0/);
  });
});

describe("where the slopes are", () => {
  const track = strip([{ column: 10, row: 2, columns: 3, rows: 2, downhill: "north", steepness: 0.4 }]);

  it("finds the slope under a spot inside it, and none outside it", () => {
    expect(slopeAt(track, 11 * TILE, 3 * TILE)).not.toBeNull();
    expect(slopeAt(track, 9.9 * TILE, 3 * TILE)).toBeNull();
    expect(slopeAt(track, 13 * TILE, 3 * TILE)).toBeNull(); // the right edge is no longer the slope
    expect(slopeAt(FLAT, 11 * TILE, 3 * TILE)).toBeNull();
  });

  it("knows which way is down: straight down 1, straight up -1, across 0, times the steepness", () => {
    const slope = slopeAt(track, 11 * TILE, 3 * TILE);
    expect(downhillShare(slope, DOWNHILL.north)).toBeCloseTo(0.4);
    expect(downhillShare(slope, DOWNHILL.south)).toBeCloseTo(-0.4);
    expect(downhillShare(slope, DOWNHILL.east)).toBeCloseTo(0);
    expect(downhillShare(null, 1.23)).toBe(0);
  });

  it("raises the top speed pointing down, lowers it pointing up, and leaves it on the flat and across", () => {
    const slope = slopeAt(DOWN_EAST, 30 * TILE, 4 * TILE);
    expect(slopeShare(slope, DOWNHILL.east)).toBeCloseTo(1 + SLOPE_TOP_SPEED);
    expect(slopeShare(slope, DOWNHILL.west)).toBeCloseTo(1 - SLOPE_TOP_SPEED);
    expect(slopeShare(slope, DOWNHILL.south)).toBeCloseTo(1);
    expect(slopeShare(null, 0)).toBe(1);
  });

  it("pulls only on a slope: on the flat the kart is left exactly as it was", () => {
    const kart = { x: 1, y: 2, angle: 0, vx: 3, vy: 4 };
    expect(pullDownhill(kart, null)).toBe(kart);
  });
});

describe("driving on a slope", () => {
  it("goes further downhill than on the flat, and less far uphill, with the same keys and time", () => {
    const flat = drive(FLAT, GAS, 120).kart.x;
    const down = drive(DOWN_EAST, GAS, 120).kart.x;
    const up = drive(DOWN_WEST, GAS, 120).kart.x;
    expect(down).toBeGreaterThan(flat);
    expect(up).toBeLessThan(flat);
  });

  it("reaches a higher top speed downhill and a lower one uphill", () => {
    const start = (track) => createRacer(track);
    const speedAfter = (track) => speedOf(drive(track, GAS, 150, start(track)).kart);
    expect(speedAfter(DOWN_EAST)).toBeGreaterThan(speedAfter(FLAT));
    expect(speedAfter(DOWN_WEST)).toBeLessThan(speedAfter(FLAT));
  });

  it("goes past the flat top speed downhill and stays well under it uphill, once at full speed", () => {
    // Long enough to reach full speed, short enough not to reach the end of the strip.
    const top = topSpeedOf(TEST_DRIVER);
    expect(speedOf(drive(DOWN_EAST, GAS, 200).kart)).toBeGreaterThan(top * 1.1);
    expect(speedOf(drive(DOWN_WEST, GAS, 200).kart)).toBeLessThan(top * 0.9);
    expect(speedOf(drive(FLAT, GAS, 200).kart)).toBeLessThanOrEqual(top + 0.001);
  });

  it("lets a kart standing on a slope roll down it, with no key held; on the flat it stays put", () => {
    const flat = drive(FLAT, NO_KEYS, 60);
    expect(flat.kart).toEqual(createRacer(FLAT).kart);
    const rolled = drive(DOWN_EAST, NO_KEYS, 60);
    expect(rolled.kart.x).toBeGreaterThan(createRacer(DOWN_EAST).kart.x);
    const rolledBack = drive(DOWN_WEST, NO_KEYS, 60); // pointing east, uphill: it rolls back, west
    expect(rolledBack.kart.x).toBeLessThan(createRacer(DOWN_WEST).kart.x);
  });

  it("lets a kart standing on a gentle slope stay put: the pull is too weak to beat the rolling friction", () => {
    // Only a slope steeper than SLOPE_PULL * steepness > the coasting slowdown
    // (120 a second, physics.js) rolls a kart that stands still: the stairs do,
    // a gentle path does not.
    const gentle = strip([{ ...ALL_OF_IT, downhill: "east", steepness: 0.3 }]);
    expect(drive(gentle, NO_KEYS, 60).kart).toEqual(createRacer(gentle).kart);
  });

  it("still makes a gentle slope faster down and slower up for a kart that is driven", () => {
    const gentleDown = strip([{ ...ALL_OF_IT, downhill: "east", steepness: 0.3 }]);
    const gentleUp = strip([{ ...ALL_OF_IT, downhill: "west", steepness: 0.3 }]);
    const flat = drive(FLAT, GAS, 120).kart.x;
    expect(drive(gentleDown, GAS, 120).kart.x).toBeGreaterThan(flat);
    expect(drive(gentleUp, GAS, 120).kart.x).toBeLessThan(flat);
    // ...and less so than the steepest slope.
    expect(drive(gentleDown, GAS, 120).kart.x).toBeLessThan(drive(DOWN_EAST, GAS, 120).kart.x);
  });

  it("slows a kart going uphill without gas faster than on the flat", () => {
    const fast = (track) => drive(track, GAS, 90); // the same speed on each, first on the flat...
    const atSpeed = fast(FLAT);
    const coastFlat = drive(FLAT, NO_KEYS, 30, atSpeed);
    const coastUp = drive(DOWN_WEST, NO_KEYS, 30, { ...atSpeed }); // ...then the same kart coasts up a slope
    expect(speedOf(coastUp.kart)).toBeLessThan(speedOf(coastFlat.kart));
  });

  it("does not raise the top speed of a kart driving across the slope", () => {
    const across = { column: 30, row: 4, angle: DOWNHILL.south };
    const flat = strip(undefined, across);
    const slope = strip([{ ...ALL_OF_IT, downhill: "east", steepness: 1 }], across);
    // A short run, before the walls are reached: forward speed is about the same.
    const forward = (racer) => racer.kart.vy;
    expect(forward(drive(slope, GAS, 30))).toBeCloseTo(forward(drive(flat, GAS, 30)), 0);
  });

  it("never touches the laps or the clock: the clock runs exactly as on the flat", () => {
    expect(drive(DOWN_EAST, GAS, 100).progress.steps).toBe(drive(FLAT, GAS, 100).progress.steps);
    expect(drive(DOWN_WEST, NO_KEYS, 100).progress.lapsDone).toBe(0);
  });

  it("does nothing to a kart in the air: it flies on exactly as on the flat", () => {
    const flying = (track) => ({ ...createRacer(track), kart: { ...createRacer(track).kart, vx: 300 }, airSteps: 20 });
    expect(drive(DOWN_WEST, GAS, 10, flying(DOWN_WEST)).kart).toEqual(drive(FLAT, GAS, 10, flying(FLAT)).kart);
  });

  it("changes nothing for a kart on the flat part of a track that has a slope somewhere else", () => {
    const elsewhere = strip([{ column: 1, row: 1, columns: 3, rows: 7, downhill: "east", steepness: 1 }]);
    expect(drive(elsewhere, GAS, 60)).toEqual(drive(FLAT, GAS, 60));
  });
});

describe("the slopes of the Nova lap", () => {
  const at = (column, row) => slopeAt(NOVA_LAP, (column + 0.5) * NOVA_LAP.tileSize, (row + 0.5) * NOVA_LAP.tileSize);

  it("has the wide stairs going down, southwards, as steep as a slope gets", () => {
    for (const [column, row] of [[64, 63], [67, 65], [70, 68]]) {
      const slope = at(column, row);
      expect(slope, `${column}, ${row}`).not.toBeNull();
      expect(slope.angle).toBe(DOWNHILL.south);
      expect(slope.steepness).toBe(1);
    }
  });

  it("has the path past the beach tunnel going up a little, driven west", () => {
    for (const [column, row] of [[48, 70], [55, 72], [63, 73]]) {
      const slope = at(column, row);
      expect(slope, `${column}, ${row}`).not.toBeNull();
      expect(downhillShare(slope, DOWNHILL.west)).toBeLessThan(0); // west is uphill
      expect(slope.steepness).toBeLessThan(1); //                    and not as steep as the stairs
    }
  });

  it("is flat everywhere else, for example on the promenade, the lower plaza and the avenue", () => {
    for (const [column, row] of [[67, 50], [68, 72], [30, 10]]) {
      expect(at(column, row), `${column}, ${row}`).toBeNull();
    }
  });
});
