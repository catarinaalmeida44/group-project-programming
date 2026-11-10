// Tests for shared/track.js: reading a track, the ground, and walls.

import { describe, it, expect } from "vitest";
import {
  createTrack,
  tileKindAt,
  surfaceAt,
  isInsideCheckpoint,
  bounceOffWalls,
  WALL_BOUNCE,
} from "../shared/track.js";
import { createKart } from "../shared/physics.js";
import { ROAD, GRASS } from "../shared/surfaces.js";
import { TEST_OVAL } from "../shared/tracks/test-oval.js";
import { smallTrackDescription } from "./small-track.js";

/** The small track with some parts of its description changed. */
function smallTrackWith(changes) {
  return { ...smallTrackDescription(), ...changes };
}

describe("reading a track", () => {
  const track = createTrack(smallTrackDescription());

  it("works out the size of the track from the letters", () => {
    expect(track.columns).toBe(7);
    expect(track.rows).toBe(5);
    expect(track.width).toBe(70);
    expect(track.height).toBe(50);
  });

  it("puts the start in the middle of its tile", () => {
    expect(track.start).toEqual({ x: 45, y: 15, angle: 0 });
  });

  it("says what the ground is at a position", () => {
    expect(tileKindAt(track, 15, 15)).toBe("road");
    expect(tileKindAt(track, 25, 25)).toBe("grass");
    expect(tileKindAt(track, 35, 25)).toBe("wall");
    expect(tileKindAt(track, 5, 5)).toBe("wall");
  });

  it("tells the driving rules whether the ground is road or grass", () => {
    expect(surfaceAt(track, 15, 15)).toBe(ROAD);
    expect(surfaceAt(track, 25, 25)).toBe(GRASS);
  });

  it("counts everything outside the map as wall", () => {
    expect(tileKindAt(track, -5, 20)).toBe("wall");
    expect(tileKindAt(track, 20, -5)).toBe("wall");
    expect(tileKindAt(track, 1000, 20)).toBe("wall");
    expect(tileKindAt(track, 20, 1000)).toBe("wall");
  });

  it("knows which positions are inside a checkpoint", () => {
    // Checkpoint 0, the finish line, is the tile at column 3, row 1.
    expect(isInsideCheckpoint(track, 0, 35, 15)).toBe(true);
    expect(isInsideCheckpoint(track, 0, 30, 10)).toBe(true); // its top-left corner
    expect(isInsideCheckpoint(track, 0, 45, 15)).toBe(false); // one tile to the right
    expect(isInsideCheckpoint(track, 1, 35, 15)).toBe(false); // a different checkpoint
  });

  it("says 'no' for a checkpoint number that does not exist", () => {
    expect(isInsideCheckpoint(track, 99, 35, 15)).toBe(false);
    expect(isInsideCheckpoint(track, -1, 35, 15)).toBe(false);
  });
});

describe("the test oval", () => {
  it("is 30 tiles wide and 18 tiles tall", () => {
    expect(TEST_OVAL.columns).toBe(30);
    expect(TEST_OVAL.rows).toBe(18);
  });

  it("has a finish line and three more checkpoints, and three laps", () => {
    expect(TEST_OVAL.checkpoints).toHaveLength(4);
    expect(TEST_OVAL.checkpoints[0].name).toBe("finish line");
    expect(TEST_OVAL.laps).toBe(3);
  });

  it("starts on the road, outside every checkpoint", () => {
    const { x, y } = TEST_OVAL.start;
    expect(tileKindAt(TEST_OVAL, x, y)).toBe("road");
    for (let number = 0; number < TEST_OVAL.checkpoints.length; number++) {
      expect(isInsideCheckpoint(TEST_OVAL, number, x, y)).toBe(false);
    }
  });

  it("is closed in by walls on every side", () => {
    for (let x = 16; x < TEST_OVAL.width; x += 32) {
      expect(tileKindAt(TEST_OVAL, x, 16)).toBe("wall");
      expect(tileKindAt(TEST_OVAL, x, TEST_OVAL.height - 16)).toBe("wall");
    }
    for (let y = 16; y < TEST_OVAL.height; y += 32) {
      expect(tileKindAt(TEST_OVAL, 16, y)).toBe("wall");
      expect(tileKindAt(TEST_OVAL, TEST_OVAL.width - 16, y)).toBe("wall");
    }
  });
});

describe("refusing a badly drawn track", () => {
  it("refuses rows of different lengths", () => {
    const map = ["#####", "#...#", "#..#", "#####"];
    expect(() => createTrack(smallTrackWith({ map }))).toThrow(/row 2/);
  });

  it("refuses a letter it does not know", () => {
    const map = smallTrackDescription().map;
    map[1] = "#..X..#";
    expect(() => createTrack(smallTrackWith({ map }))).toThrow(/unknown letter "X"/);
  });

  it("refuses a missing or empty map", () => {
    expect(() => createTrack(smallTrackWith({ map: [] }))).toThrow(/map/);
    expect(() => createTrack(smallTrackWith({ map: undefined }))).toThrow(/map/);
    expect(() => createTrack(smallTrackWith({ map: [""] }))).toThrow(/map/);
  });

  it("refuses a tile size that is not a number above zero", () => {
    for (const tileSize of [0, -10, "big", undefined, NaN]) {
      expect(() => createTrack(smallTrackWith({ tileSize }))).toThrow(/tileSize/);
    }
  });

  it("refuses a number of laps that is not a whole number, 1 or more", () => {
    for (const laps of [0, -1, 2.5, "three", undefined]) {
      expect(() => createTrack(smallTrackWith({ laps }))).toThrow(/laps/);
    }
  });

  it("refuses a start outside the map", () => {
    const start = { column: 50, row: 1, angle: 0 };
    expect(() => createTrack(smallTrackWith({ start }))).toThrow(/start/);
    expect(() => createTrack(smallTrackWith({ start: undefined }))).toThrow(/start/);
  });

  it("refuses a start inside a wall", () => {
    const start = { column: 0, row: 0, angle: 0 };
    expect(() => createTrack(smallTrackWith({ start }))).toThrow(/inside a wall/);
  });

  it("refuses a start with no direction", () => {
    const start = { column: 4, row: 1 };
    expect(() => createTrack(smallTrackWith({ start }))).toThrow(/angle/);
  });

  it("refuses a track with fewer than three checkpoints", () => {
    const checkpoints = smallTrackDescription().checkpoints.slice(0, 2);
    expect(() => createTrack(smallTrackWith({ checkpoints }))).toThrow(/at least two more/);
    expect(() => createTrack(smallTrackWith({ checkpoints: undefined }))).toThrow(/checkpoint/);
  });

  it("refuses a checkpoint that sticks out of the map", () => {
    const checkpoints = smallTrackDescription().checkpoints;
    checkpoints[1] = { name: "too wide", column: 5, row: 2, columns: 9, rows: 1 };
    expect(() => createTrack(smallTrackWith({ checkpoints }))).toThrow(/checkpoint 1/);
  });

  it("refuses a checkpoint with no size", () => {
    const checkpoints = smallTrackDescription().checkpoints;
    checkpoints[2] = { name: "flat", column: 3, row: 3, columns: 1, rows: 0 };
    expect(() => createTrack(smallTrackWith({ checkpoints }))).toThrow(/checkpoint 2/);
  });

  it("refuses a checkpoint that no kart could ever reach", () => {
    const checkpoints = smallTrackDescription().checkpoints;
    checkpoints[3] = { name: "in the wall", column: 3, row: 2, columns: 1, rows: 1 };
    expect(() => createTrack(smallTrackWith({ checkpoints }))).toThrow(/entirely inside walls/);
  });
});

describe("walls", () => {
  // An empty room: 7 tiles of road wide, 3 tall, each tile 32 units.
  // The open ground goes from x=32 to x=256 and from y=32 to y=128.
  const room = createTrack({
    name: "Empty room",
    tileSize: 32,
    laps: 1,
    map: [
      "#########",
      "#.......#",
      "#.......#",
      "#.......#",
      "#########",
    ],
    start: { column: 4, row: 2, angle: 0 },
    checkpoints: [
      { name: "finish line", column: 1, row: 1, columns: 1, rows: 1 },
      { name: "a", column: 7, row: 1, columns: 1, rows: 1 },
      { name: "b", column: 7, row: 3, columns: 1, rows: 1 },
    ],
  });
  const RADIUS = 10;

  /** A kart at a position with a speed. */
  function kartAt(x, y, vx = 0, vy = 0) {
    return { ...createKart(x, y), vx, vy };
  }

  it("leaves a kart alone when it touches no wall", () => {
    const kart = kartAt(150, 80, 200, 50);
    expect(bounceOffWalls(room, kart, RADIUS)).toBe(kart);
  });

  it("pushes a kart that overlaps a wall back out, until it only just touches", () => {
    const after = bounceOffWalls(room, kartAt(37, 80), RADIUS);
    expect(after.x).toBeCloseTo(42); // wall edge at 32, plus the kart's radius
    expect(after.y).toBe(80);
  });

  it("sends a kart that hits a wall head-on back at half speed", () => {
    const after = bounceOffWalls(room, kartAt(37, 80, -200, 0), RADIUS);
    expect(after.vx).toBeCloseTo(200 * WALL_BOUNCE);
    expect(after.vy).toBeCloseTo(0);
    expect(WALL_BOUNCE).toBe(0.5);
  });

  it("keeps the speed along the wall when a kart only scrapes it", () => {
    const after = bounceOffWalls(room, kartAt(37, 80, -50, 200), RADIUS);
    expect(after.vy).toBeCloseTo(200); // along the wall: kept
    expect(after.vx).toBeCloseTo(25); //  into the wall: turned round and halved
  });

  it("does not bounce a kart that is already moving away from the wall", () => {
    const after = bounceOffWalls(room, kartAt(37, 80, 60, 0), RADIUS);
    expect(after.vx).toBe(60);
    expect(after.x).toBeCloseTo(42);
  });

  it("bounces off all four walls", () => {
    expect(bounceOffWalls(room, kartAt(251, 80, 200, 0), RADIUS).vx).toBeCloseTo(-100); // right
    expect(bounceOffWalls(room, kartAt(150, 37, 0, -200), RADIUS).vy).toBeCloseTo(100); // top
    expect(bounceOffWalls(room, kartAt(150, 123, 0, 200), RADIUS).vy).toBeCloseTo(-100); // bottom
  });

  it("gets a kart out of both walls when it is driven into a corner", () => {
    const after = bounceOffWalls(room, kartAt(36, 36, -100, -100), RADIUS);
    expect(after.x).toBeGreaterThanOrEqual(42 - 0.000001);
    expect(after.y).toBeGreaterThanOrEqual(42 - 0.000001);
    expect(after.vx).toBeGreaterThan(0);
    expect(after.vy).toBeGreaterThan(0);
  });

  it("does not snag on the joins between wall tiles when sliding along a wall", () => {
    // Slide along the left wall across three tiles, leaning into it all the
    // way: first downwards, then back upwards. The joins are at y=64 and y=96.
    for (const speedAlongWall of [200, -200]) {
      let kart = kartAt(42, speedAlongWall > 0 ? 40 : 120, -30, speedAlongWall);
      for (let step = 0; step < 20; step++) {
        kart = { ...kart, vx: -30 }; // keep leaning into the wall
        kart = { ...kart, x: kart.x + kart.vx / 60, y: kart.y + kart.vy / 60 };
        kart = bounceOffWalls(room, kart, RADIUS);
        expect(kart.vy).toBeCloseTo(speedAlongWall);
        expect(kart.x).toBeCloseTo(42);
      }
      // It really crossed both joins.
      expect(Math.abs(kart.y - (speedAlongWall > 0 ? 40 : 120))).toBeGreaterThan(60);
    }
  });

  it("treats the edge of the map as a wall, even with no wall tiles drawn", () => {
    const field = createTrack({
      name: "Open field",
      tileSize: 32,
      laps: 1,
      map: ["....", "....", "...."],
      start: { column: 1, row: 1, angle: 0 },
      checkpoints: [
        { name: "finish line", column: 0, row: 0, columns: 1, rows: 1 },
        { name: "a", column: 3, row: 0, columns: 1, rows: 1 },
        { name: "b", column: 3, row: 2, columns: 1, rows: 1 },
      ],
    });
    const after = bounceOffWalls(field, kartAt(4, 50, -200, 0), RADIUS);
    expect(after.x).toBeCloseTo(10);
    expect(after.vx).toBeCloseTo(100);
  });

  it("brings a kart whose middle is inside a wall back to open ground", () => {
    const after = bounceOffWalls(room, kartAt(20, 80, -100, 0), RADIUS);
    expect(tileKindAt(room, after.x, after.y)).toBe("road");
    expect(after.x).toBeGreaterThanOrEqual(42 - 0.000001);
    expect(after.vx).toBeGreaterThan(0);
  });

  it("does not change the kart it was given", () => {
    const before = Object.freeze(kartAt(37, 80, -200, 0));
    const after = bounceOffWalls(room, before, RADIUS);
    expect(before.x).toBe(37);
    expect(before.vx).toBe(-200);
    expect(after).not.toBe(before);
  });

  it("keeps any extra information stored on the kart", () => {
    const after = bounceOffWalls(room, { ...kartAt(37, 80, -200, 0), colour: "red" }, RADIUS);
    expect(after.colour).toBe("red");
  });
});
