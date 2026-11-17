// Tests for client/scenery.js (buildings with real fronts, roofs to drive
// under, railings) and for the small helpers that came with it:
// hullOf in client/ground-art.js, shapeCovers and lettersFromGround in
// client/nova-lap-ground.js, and the new "noBarrierAt" of client/buildings.js.
//
// How the scenery looks is checked by eye in a browser. These tests check the
// arithmetic, on tiny hand-made tracks where the right answer is easy to see:
// where a wall is cut into strips, how tall each strip is, which strips and
// pieces of roof can be seen from behind the kart, and what is refused.
//
// The real buildings of the Nova lap are checked in nova-lap-look.test.js.

import { describe, it, expect } from "vitest";
import { createScenery, sceneryInView, squaresWithScenery, cutAtSquares, squaresUnder } from "../client/scenery.js";
import { LIGHT } from "../client/scenery-paint.js";
import { createBuildings } from "../client/buildings.js";
import { RACE, SCREEN, eyeOf } from "../client/camera.js";
import { hullOf } from "../client/ground-art.js";
import { shapeCovers, lettersFromGround } from "../client/nova-lap-ground.js";
import { createTrack } from "../shared/track.js";

// An open field with a wall all round: 40 columns by 11 rows, 10 units a
// square. So square column 20 starts at x = 200, and row 4 at y = 40.
const FIELD = createTrack({
  name: "Scenery test field",
  tileSize: 10,
  laps: 1,
  map: ["#".repeat(40), ...Array.from({ length: 9 }, () => `#${".".repeat(38)}#`), "#".repeat(40)],
  start: { column: 1, row: 5, angle: 0 },
  checkpoints: [
    { name: "a", column: 5, row: 1, columns: 1, rows: 9 },
    { name: "b", column: 20, row: 1, columns: 1, rows: 9 },
    { name: "c", column: 35, row: 1, columns: 1, rows: 9 },
  ],
});

// In these tests one metre is 5 units: a box with "top: 2" is 10 units tall.
const PER_METRE = 5;

/** The scenery of the field for a list of boxes and fences. */
const sceneryOf = (model) => createScenery(FIELD, { unitsPerMetre: PER_METRE, ...model });

/** Checks a list of [x, y] points against the expected ones, allowing for tiny rounding differences. */
function expectPoints(actual, expected) {
  expect(actual).toHaveLength(expected.length);
  expected.forEach(([x, y], i) => {
    expect(actual[i][0]).toBeCloseTo(x);
    expect(actual[i][1]).toBeCloseTo(y);
  });
}

const stripsOnly = (shapes) => shapes.filter((shape) => shape.kind === "strip");
const flatsOnly = (shapes) => shapes.filter((shape) => shape.kind === "flat");

describe("cutting a line where it crosses from one square into the next", () => {
  it("cuts a line along the edge of the squares at every whole number", () => {
    const pieces = cutAtSquares([1, 2], [4, 2]);
    expect(pieces).toHaveLength(3);
    expectPoints(pieces.map((piece) => piece.a), [[1, 2], [2, 2], [3, 2]]);
    expectPoints(pieces.map((piece) => piece.b), [[2, 2], [3, 2], [4, 2]]);
  });

  it("gives pieces that join up, and says how far from the start each one begins and ends", () => {
    const pieces = cutAtSquares([1, 2], [4, 2]);
    expect(pieces[0].fromStart).toBe(0);
    for (let i = 1; i < pieces.length; i++) {
      expectPoints([pieces[i].a], [pieces[i - 1].b]);
      expect(pieces[i].fromStart).toBeCloseTo(pieces[i - 1].toStart);
    }
    expect(pieces.map((piece) => piece.toStart - piece.fromStart).reduce((sum, length) => sum + length, 0)).toBeCloseTo(3);
    expect(pieces[pieces.length - 1].toStart).toBeCloseTo(3); // the whole line is 3 squares long
  });

  it("starts at the first point given, also when that is the right-hand end", () => {
    const pieces = cutAtSquares([4, 2], [1, 2]);
    expectPoints(pieces.map((piece) => piece.a), [[4, 2], [3, 2], [2, 2]]);
    expect(pieces[0].fromStart).toBe(0);
    expect(pieces[2].toStart).toBeCloseTo(3);
  });

  it("cuts a slanting line at the upright lines and at the level lines", () => {
    // From the middle of square 0,0 two squares right and one down. It
    // crosses x = 1 and x = 2 (upright lines) and y = 1 (a level line).
    const pieces = cutAtSquares([0.5, 0.5], [2.5, 1.5]);
    expect(pieces).toHaveLength(4);
    expectPoints(pieces.map((piece) => piece.a), [[0.5, 0.5], [1, 0.75], [1.5, 1], [2, 1.25]]);
    expectPoints([pieces[3].b], [[2.5, 1.5]]);
    expect(pieces[3].toStart).toBeCloseTo(Math.hypot(2, 1));
  });

  it("cuts a line through the corner of a square once there, not twice", () => {
    const pieces = cutAtSquares([0, 0], [2, 2]);
    expect(pieces).toHaveLength(2);
    expectPoints([pieces[0].b, pieces[1].a], [[1, 1], [1, 1]]);
  });

  it("leaves a line inside one square in one piece", () => {
    const pieces = cutAtSquares([1.2, 1.2], [1.8, 1.6]);
    expect(pieces).toHaveLength(1);
    expectPoints([pieces[0].a, pieces[0].b], [[1.2, 1.2], [1.8, 1.6]]);
    expect(pieces[0].fromStart).toBe(0);
    expect(pieces[0].toStart).toBeCloseTo(Math.hypot(0.6, 0.4));
  });
});

describe("the part of a rectangle that lies in each square", () => {
  it("gives two whole squares for a rectangle of 2 by 1", () => {
    expect(squaresUnder([1, 1, 3, 2])).toEqual([
      { column: 1, row: 1, corners: [[1, 1], [2, 1], [2, 2], [1, 2]] },
      { column: 2, row: 1, corners: [[2, 1], [3, 1], [3, 2], [2, 2]] },
    ]);
  });

  it("gives one piece with the corners of the rectangle itself, for a thin one inside a square", () => {
    expect(squaresUnder([1.2, 1.3, 1.4, 1.9])).toEqual([{ column: 1, row: 1, corners: [[1.2, 1.3], [1.4, 1.3], [1.4, 1.9], [1.2, 1.9]] }]);
  });

  it("splits a rectangle that lies across the line between two squares, at that line", () => {
    expect(squaresUnder([1.5, 1, 2.5, 2])).toEqual([
      { column: 1, row: 1, corners: [[1.5, 1], [2, 1], [2, 2], [1.5, 2]] },
      { column: 2, row: 1, corners: [[2, 1], [2.5, 1], [2.5, 2], [2, 2]] },
    ]);
  });
});

describe("making the scenery of a track: what is refused", () => {
  it("refuses scenery that does not say how many units a metre is", () => {
    // (A text such as "5" and an endless number are refused too: added on 17 November 2026, when the check was made stricter.)
    for (const unitsPerMetre of [undefined, null, 0, -5, NaN, "5", Infinity]) {
      expect(() => createScenery(FIELD, { unitsPerMetre, blocks: [] }), String(unitsPerMetre)).toThrow(/Scenery: unitsPerMetre/);
    }
  });

  it("refuses a box that sticks out of the map, and names it", () => {
    for (const rect of [[38, 1, 41, 2], [-1, 1, 2, 2], [1, 9, 2, 12], [1, -0.5, 2, 2]]) {
      expect(() => sceneryOf({ blocks: [{ name: "shed", rect, top: 3 }] }), String(rect)).toThrow(/Scenery: "shed" does not fit inside the map/);
    }
  });

  it("refuses a box with no room inside, or without four numbers for its rectangle", () => {
    for (const rect of [[2, 2, 2, 3], [2, 3, 4, 3], [4, 2, 3, 3], [2, 2, 3], undefined]) {
      expect(() => sceneryOf({ blocks: [{ rect, top: 3 }] }), String(rect)).toThrow(/Scenery: "block 0" needs a rect/);
    }
  });

  it("refuses a box whose top is not above its base", () => {
    const bad = [
      { top: 0 }, //                       on the ground, and no taller than the ground
      { base: 3, top: 3 }, //              starts and ends at the same height
      { base: 3, top: 2 }, //              ends below where it starts
      { base: 2, top: 3, topEnd: 1 }, //   a sloping top that dips below the base
      { base: -1, top: 3 }, //             starts below the ground
      {}, //                               no top at all
    ];
    for (const heights of bad) {
      expect(() => sceneryOf({ blocks: [{ name: "shed", rect: [1, 1, 2, 2], ...heights }] }), JSON.stringify(heights)).toThrow(
        /Scenery: "shed" must end higher than it starts/,
      );
    }
  });

  it("refuses a fence without a picture, without a top above its base, or without length", () => {
    const good = { name: "rail", from: [1, 1], to: [3, 1], top: 1, art: "railing" };
    expect(() => sceneryOf({ fences: [good] })).not.toThrow();
    expect(() => sceneryOf({ fences: [{ ...good, art: undefined }] })).toThrow(/Scenery: "rail" needs from, to, an art and a top above its base/);
    expect(() => sceneryOf({ fences: [{ ...good, base: 1 }] })).toThrow(/Scenery: "rail" needs/);
    expect(() => sceneryOf({ fences: [{ ...good, to: undefined }] })).toThrow(/Scenery: "rail" needs/);
    expect(() => sceneryOf({ fences: [{ ...good, to: [1, 1] }] })).toThrow(/Scenery: "rail" has no length/);
  });
});

describe("making the scenery of a track: boxes", () => {
  it("gives a box of one square with the same picture all round four strips, one facing each way", () => {
    const { strips, unitsPerMetre } = sceneryOf({ blocks: [{ rect: [3, 3, 4, 4], top: 2, art: "white" }] });
    expect(unitsPerMetre).toBe(PER_METRE);
    expect(strips.map((strip) => strip.facing).sort()).toEqual(["east", "north", "south", "west"]);
    for (const strip of strips) {
      expect(Math.hypot(strip.b[0] - strip.a[0], strip.b[1] - strip.a[1])).toBeCloseTo(10); // one square long
      expect(strip.uB - strip.uA).toBeCloseTo(10); // and it shows one square of its picture
      expect(strip.base).toBe(0);
      expect(strip.topA).toBe(10); // 2 metres of 5 units
      expect(strip.topB).toBe(10);
      expect(strip.highest).toBe(10);
      expect(strip.art).toBe("white");
      expect(strip.bothSides).toBe(false);
      expect([strip.column, strip.row]).toEqual([3, 3]); // the square the box stands on
    }
  });

  it("reads each side from its left end, as someone standing outside the box sees it", () => {
    const { strips } = sceneryOf({ blocks: [{ rect: [3, 3, 4, 4], top: 2, art: "white" }] });
    const side = (facing) => strips.find((strip) => strip.facing === facing);
    // Seen from the south (looking up the map), left is west.
    expect(side("south")).toMatchObject({ a: [30, 40], b: [40, 40], outward: [0, 1] });
    // Seen from the north (looking down the map), left is east.
    expect(side("north")).toMatchObject({ a: [40, 30], b: [30, 30], outward: [0, -1] });
    expect(side("west")).toMatchObject({ a: [30, 30], b: [30, 40], outward: [-1, 0] });
    expect(side("east")).toMatchObject({ a: [40, 40], b: [40, 30], outward: [1, 0] });
  });

  it("gives a side without a picture no strip: nobody can see it", () => {
    const { strips } = sceneryOf({ blocks: [{ rect: [3, 3, 4, 4], top: 2, faces: { north: "white" } }] });
    expect(strips.map((strip) => strip.facing)).toEqual(["north"]);
    expect(sceneryOf({ blocks: [{ rect: [3, 3, 4, 4], top: 2 }] }).strips).toEqual([]);
  });

  it("cuts a long side into one strip per square, with the picture running on from strip to strip", () => {
    const { strips } = sceneryOf({ blocks: [{ rect: [3, 3, 6, 4], top: 2, faces: { south: "bands" } }] });
    expect(strips).toHaveLength(3);
    expect(strips.map((strip) => [strip.uA, strip.uB])).toEqual([[0, 10], [10, 20], [20, 30]]);
    expect(strips.map((strip) => strip.column)).toEqual([3, 4, 5]);
  });

  it("starts the picture further along when a side has a shift, by that many squares", () => {
    const { strips } = sceneryOf({ blocks: [{ rect: [3, 3, 5, 4], top: 2, faces: { south: { art: "bands", shift: 3 } } }] });
    expect(strips.map((strip) => strip.art)).toEqual(["bands", "bands"]);
    expect(strips.map((strip) => [strip.uA, strip.uB])).toEqual([[30, 40], [40, 50]]);
  });

  it("gives every side a group of its own, shared by its strips", () => {
    // sceneryInView leaves out a whole wall at once. A "group" is one wall.
    const { strips } = sceneryOf({ blocks: [{ rect: [3, 3, 5, 4], top: 2, faces: { south: "white", north: "white" } }] });
    const groupsOf = (facing) => new Set(strips.filter((strip) => strip.facing === facing).map((strip) => strip.group));
    expect(groupsOf("south").size).toBe(1);
    expect(groupsOf("north").size).toBe(1);
    expect([...groupsOf("south")][0]).not.toBe([...groupsOf("north")][0]);
  });

  it("gives a box on the ground a top, one piece per square, and no underside", () => {
    const { flats } = sceneryOf({ blocks: [{ rect: [1, 1, 3, 2], top: 2 }] });
    expect(flats.map((flat) => flat.kind)).toEqual(["top", "top"]);
    expect(flats.map((flat) => flat.height)).toEqual([10, 10]);
    expect(flats[0].corners).toEqual([[10, 10], [20, 10], [20, 20], [10, 20]]);
    expect(flats.map((flat) => [flat.column, flat.row])).toEqual([[1, 1], [2, 1]]);
  });

  it("gives a box that starts above the ground an underside as well, at the height where it starts", () => {
    const { flats, strips } = sceneryOf({ blocks: [{ rect: [1, 1, 3, 2], base: 4, top: 5, faces: { south: "white" } }] });
    const under = flats.filter((flat) => flat.kind === "under");
    expect(under).toHaveLength(2);
    expect(under.map((flat) => flat.height)).toEqual([20, 20]); // 4 metres up
    expect(flats.filter((flat) => flat.kind === "top").map((flat) => flat.height)).toEqual([25, 25]);
    // Its sides start up there too.
    expect(strips.map((strip) => [strip.base, strip.topA])).toEqual([[20, 25], [20, 25]]);
  });

  it("leaves the underside out with soffit: null, and the top with roof: null", () => {
    const noUnderside = sceneryOf({ blocks: [{ rect: [1, 1, 3, 2], base: 4, top: 5, soffit: null }] }).flats;
    expect(noUnderside.map((flat) => flat.kind)).toEqual(["top", "top"]);
    const noTop = sceneryOf({ blocks: [{ rect: [1, 1, 3, 2], base: 4, top: 5, roof: null }] }).flats;
    expect(noTop.map((flat) => flat.kind)).toEqual(["under", "under"]);
  });

  it("colours tops and undersides from the styles, and adds a small piece for each part of a style", () => {
    const flatStyles = {
      slate: { colour: "#445566" },
      beams: { colour: "#663322", parts: [{ rect: [0, 0.4, 1, 0.6], colour: "#aa7744" }] },
    };
    const { flats } = sceneryOf({ flatStyles, blocks: [{ rect: [2, 2, 3, 3], base: 4, top: 5, roof: "slate", soffit: "beams" }] });
    const top = flats.filter((flat) => flat.kind === "top");
    const under = flats.filter((flat) => flat.kind === "under");
    expect(top.map((flat) => [flat.colour, flat.detail])).toEqual([["#445566", false]]);
    // The underside: the whole square in the colour of the style, then one beam across it.
    expect(under.map((flat) => [flat.colour, flat.detail])).toEqual([["#663322", false], ["#aa7744", true]]);
    expectPoints(under[0].corners, [[20, 20], [30, 20], [30, 30], [20, 30]]);
    expectPoints(under[1].corners, [[20, 24], [30, 24], [30, 26], [20, 26]]);
    expect(under[1].height).toBe(20);
  });

  it("never lets a part stick out of a roof that covers only some of a square", () => {
    const flatStyles = { beams: { colour: "#663322", parts: [{ rect: [0, 0.4, 1, 0.6], colour: "#aa7744" }] } };
    const { flats } = sceneryOf({ flatStyles, blocks: [{ rect: [2, 2, 2.5, 3], base: 4, top: 5, roof: null, soffit: "beams" }] });
    const beam = flats.find((flat) => flat.detail);
    expectPoints(beam.corners, [[20, 24], [25, 24], [25, 26], [20, 26]]);
  });

  it("paints a top whose style nobody defined plain grey, instead of breaking", () => {
    const { flats } = sceneryOf({ blocks: [{ rect: [2, 2, 3, 3], top: 1, roof: "no-such-style" }] });
    expect(flats).toHaveLength(1);
    expect(flats[0].colour).toMatch(/^#[0-9a-f]{6}$/i);
  });

  it("slopes the top of a box along x: the strips along the slope change height, the ends do not", () => {
    // 3 squares long, 6 metres (30 units) at its left end, 3 metres (15 units) at its right end.
    const { strips, flats } = sceneryOf({ blocks: [{ rect: [1, 1, 4, 2], top: 6, topEnd: 3, slope: "x", art: "white" }] });
    const tops = (facing) => strips.filter((strip) => strip.facing === facing).map((strip) => [strip.topA, strip.topB]);
    const south = tops("south"); // read from the west end: going down
    const north = tops("north"); // read from the east end: going up
    [[30, 25], [25, 20], [20, 15]].forEach(([topA, topB], i) => {
      expect(south[i][0]).toBeCloseTo(topA);
      expect(south[i][1]).toBeCloseTo(topB);
    });
    [[15, 20], [20, 25], [25, 30]].forEach(([topA, topB], i) => {
      expect(north[i][0]).toBeCloseTo(topA);
      expect(north[i][1]).toBeCloseTo(topB);
    });
    // Across the slope each end wall is level: its two top corners are equally high.
    expect(tops("west")).toEqual([[30, 30]]);
    expect(tops("east")).toEqual([[15, 15]]);
    for (const strip of strips) {
      expect(strip.highest).toBe(30);
    }
    // A sloping top is not painted as flat pieces.
    expect(flats.filter((flat) => flat.kind === "top")).toEqual([]);
  });

  it("slopes the top of a box along y when asked", () => {
    const { strips } = sceneryOf({ blocks: [{ rect: [1, 1, 2, 4], top: 6, topEnd: 3, slope: "y", art: "white" }] });
    const tops = (facing) => strips.filter((strip) => strip.facing === facing).map((strip) => [strip.topA, strip.topB]);
    expect(tops("north")).toEqual([[30, 30]]); // the high end
    expect(tops("south")).toEqual([[15, 15]]); // the low end
    for (const [topA, topB] of [...tops("west"), ...tops("east")]) {
      expect(Math.abs(topA - topB)).toBeCloseTo(5); // one metre lower for each square along
    }
  });
});

describe("making the scenery of a track: fences", () => {
  it("gives a fence strips that are seen from both sides, one per square", () => {
    const { strips, flats } = sceneryOf({ fences: [{ from: [1, 2.5], to: [3, 2.5], base: 1, top: 2, art: "railing" }] });
    expect(strips).toHaveLength(2);
    for (const strip of strips) {
      expect(strip.bothSides).toBe(true);
      expect(strip.facing).toBe("fence");
      expect(strip.art).toBe("railing");
      expect(strip.base).toBe(5);
      expect(strip.topA).toBe(10);
      expect(strip.topB).toBe(10);
      expect(strip.row).toBe(2);
    }
    expect(strips.map((strip) => strip.column)).toEqual([1, 2]);
    expect(strips.map((strip) => [strip.uA, strip.uB])).toEqual([[0, 10], [10, 20]]);
    expect(strips[0].group).toBe(strips[1].group);
    expect(flats).toEqual([]); // a fence has no top and no underside
  });

  it("puts a fence on the line between two squares in the square it leans towards", () => {
    const rowOf = (lean) => sceneryOf({ fences: [{ from: [1, 2], to: [2, 2], top: 1, art: "railing", lean }] }).strips[0].row;
    expect(rowOf([0, 1])).toBe(2); //  leans down the map
    expect(rowOf([0, -1])).toBe(1); // leans up the map
  });

  it("has a brightness in scenery-paint.js for every way a strip can face", () => {
    const { strips } = sceneryOf({
      blocks: [{ rect: [3, 3, 4, 4], top: 2, art: "white" }],
      fences: [{ from: [1, 2], to: [2, 2], top: 1, art: "railing" }],
    });
    for (const facing of new Set(strips.map((strip) => strip.facing))) {
      expect(LIGHT[facing], facing).toBeGreaterThan(0);
      expect(LIGHT[facing], facing).toBeLessThanOrEqual(1);
    }
  });
});

describe("the scenery seen from behind the kart, with the race camera", () => {
  // The eye of the race camera is about 36 units above the ground and 81
  // units behind the kart. A box with "top: 8" (40 units) is taller than the
  // eye, a box with "top: 2" (10 units) is lower.
  const eye = eyeOf(RACE);
  const TALL = 8;
  const LOW = 2;
  const view = (scenery, kart) => sceneryInView(scenery, kart, RACE, SCREEN);
  // On the middle row of the field, looking east (right) and looking west.
  const lookingEastFrom = (x) => ({ x, y: 55, angle: 0 });
  const lookingWestFrom = (x) => ({ x, y: 55, angle: Math.PI });

  // A wall across the way at x = 200, three squares wide, with a picture on its west side only.
  const wall = sceneryOf({ blocks: [{ rect: [20, 4, 21, 7], top: TALL, faces: { west: "white" } }] });
  // A fence on the same line.
  const fence = sceneryOf({ fences: [{ from: [20, 4], to: [20, 7], top: TALL, art: "railing" }] });

  it("has the eye where these tests assume: between the low and the tall box, well behind the kart", () => {
    expect(eye.height).toBeGreaterThan(LOW * PER_METRE);
    expect(eye.height).toBeLessThan(TALL * PER_METRE);
    expect(eye.behind).toBeGreaterThan(60);
  });

  it("shows nothing when a track has no scenery", () => {
    expect(view(null, lookingEastFrom(100))).toEqual([]);
    expect(view(undefined, lookingEastFrom(100))).toEqual([]);
    expect(view(sceneryOf({}), lookingEastFrom(100))).toEqual([]);
  });

  it("gives a wall ahead that faces the kart as strips, each with its ends as seen from the kart", () => {
    const shapes = view(wall, lookingEastFrom(100));
    expect(shapes).toHaveLength(3);
    for (const shape of shapes) {
      expect(shape).toMatchObject({ kind: "strip", facing: "west", art: "white", base: 0, topA: 40, topB: 40, column: 20 });
      expect(shape.ahead).toBeCloseTo(100); // the wall is 100 units ahead of the kart
      expect(shape.a.ahead).toBeCloseTo(100);
      expect(shape.b.ahead).toBeCloseTo(100);
      expect(shape.uB - shape.uA).toBeCloseTo(10);
    }
    expect(shapes.map((shape) => shape.row).sort()).toEqual([4, 5, 6]);
    // From 15 units left of the kart to 15 units right of it.
    expect(Math.min(...shapes.map((shape) => shape.a.sideways))).toBeCloseTo(-15);
    expect(Math.max(...shapes.map((shape) => shape.b.sideways))).toBeCloseTo(15);
  });

  it("does not show the same wall from behind: its picture faces away", () => {
    expect(view(wall, lookingWestFrom(300))).toEqual([]);
  });

  it("shows a fence from both sides", () => {
    expect(stripsOnly(view(fence, lookingEastFrom(100)))).toHaveLength(3);
    expect(stripsOnly(view(fence, lookingWestFrom(300)))).toHaveLength(3);
  });

  it("shows a wall a long way ahead, but nothing beyond what the camera's settings say it sees", () => {
    expect(view(wall, lookingEastFrom(200 - (RACE.viewAhead - 200))).length).toBeGreaterThan(0);
    expect(view(wall, lookingEastFrom(200 - (RACE.viewAhead + 200)))).toEqual([]);
    expect(view(fence, lookingEastFrom(200 - (RACE.viewAhead + 200)))).toEqual([]);
  });

  it("does not show a wall that the kart has driven past: it is behind the camera", () => {
    expect(view(fence, lookingEastFrom(200 + eye.behind + 50))).toEqual([]);
  });

  it("leaves out a tall wall that stands between the camera and the kart", () => {
    // The kart is 40 units past the wall, straight in front of its middle.
    // Painted, the wall would cover the kart: the camera looks through it.
    const shapes = view(wall, lookingEastFrom(240));
    expect(shapes).toEqual([]);
  });

  it("draws the same wall when it stands to the side of the kart instead", () => {
    // Three rows further down the map: from 15 to 45 units to the right of the kart.
    const beside = sceneryOf({ blocks: [{ rect: [20, 7, 21, 10], top: TALL, faces: { west: "white" } }] });
    const shapes = view(beside, lookingEastFrom(240));
    expect(shapes.length).toBeGreaterThan(0);
    for (const shape of shapes) {
      expect(shape.kind).toBe("strip");
      expect(shape.ahead).toBeCloseTo(-40); // behind the kart, in front of the camera
    }
  });

  it("leaves the whole of that wall out, also the parts off to the side, but not another wall next to it", () => {
    // One long wall across the whole field, and a separate one in the same line.
    const scenery = sceneryOf({
      blocks: [
        { name: "long wall", rect: [20, 1, 21, 7], top: TALL, faces: { west: "white" } },
        { name: "another wall", rect: [20, 7, 21, 10], top: TALL, faces: { west: "bands" } },
      ],
    });
    const arts = view(scenery, lookingEastFrom(240)).map((shape) => shape.art);
    expect(arts).not.toContain("white");
    expect(arts).toContain("bands");
  });

  it("keeps a low wall in the same spot: the camera sees the kart over it", () => {
    // 20 units behind the kart. The tall wall hides the kart there too. A
    // wall of 1.8 metres (9 units) does not: the line from the eye to the
    // kart passes over its top.
    expect(view(wall, lookingEastFrom(220))).toEqual([]);
    const low = sceneryOf({ blocks: [{ rect: [20, 4, 21, 7], top: 1.8, roof: null, faces: { west: "low-wall" } }] });
    expect(stripsOnly(view(low, lookingEastFrom(220)))).toHaveLength(3);
  });

  it("does not leave out a roof above the kart: it gives its underside, seen from below", () => {
    // A slab from 40 to 45 units up, higher than the camera's eye, over the kart.
    const slab = sceneryOf({ blocks: [{ rect: [19, 4, 22, 7], base: TALL, top: TALL + 1 }] });
    expect(TALL * PER_METRE).toBeGreaterThan(eye.height);
    const shapes = view(slab, lookingEastFrom(205));
    expect(shapes.length).toBeGreaterThan(0);
    for (const shape of shapes) {
      expect(shape.kind).toBe("flat");
      expect(shape.under).toBe(true); // its top is above the eye and never seen
      expect(shape.points.length).toBeGreaterThanOrEqual(3);
      // An underside higher than the eye is in the upper part of the picture, above the horizon.
      for (const [x, y] of shape.points) {
        expect(Number.isFinite(x)).toBe(true);
        expect(y).toBeLessThan(RACE.horizonY);
      }
    }
    // The piece right over the kart is among them.
    expect(shapes.some((shape) => shape.column === 20 && shape.row === 5)).toBe(true);
  });

  it("draws the edge of such a roof even where it crosses between the camera and the kart", () => {
    // The same place as the tall wall that was left out, but starting above the eye: it hides nothing.
    const beam = sceneryOf({ blocks: [{ rect: [20, 4, 21, 7], base: TALL, top: TALL + 1, soffit: null, faces: { west: "fascia" } }] });
    const strips = stripsOnly(view(beam, lookingEastFrom(240)));
    expect(strips).toHaveLength(3);
    for (const strip of strips) {
      expect(strip.base).toBe(40);
    }
  });

  it("gives a low box its top, seen from above, and no underside", () => {
    const box = sceneryOf({ blocks: [{ rect: [25, 5, 26, 6], top: LOW, art: "white" }] });
    expect(LOW * PER_METRE).toBeLessThan(eye.height);
    const shapes = view(box, lookingEastFrom(100));
    const flats = flatsOnly(shapes);
    expect(flats).toHaveLength(1);
    expect(flats[0]).toMatchObject({ kind: "flat", under: false, column: 25, row: 5 });
    expect(flats[0].points).toHaveLength(4);
    expect(flats[0].ahead).toBeCloseTo(155); // its middle is 155 units ahead of the kart
    // A top lower than the eye is in the lower part of the picture, below the horizon.
    for (const [, y] of flats[0].points) {
      expect(y).toBeGreaterThan(RACE.horizonY);
    }
    // Of its four sides only the one facing the camera is given.
    expect(stripsOnly(shapes).map((strip) => strip.facing)).toEqual(["west"]);
  });

  it("gives no top for a box taller than the eye, and no underside for a roof lower than it", () => {
    const tallBox = sceneryOf({ blocks: [{ rect: [25, 5, 26, 6], top: TALL }] });
    expect(view(tallBox, lookingEastFrom(100))).toEqual([]);
    const lowShelf = sceneryOf({ blocks: [{ rect: [25, 5, 26, 6], base: 1, top: LOW }] });
    expect(view(lowShelf, lookingEastFrom(100)).map((shape) => shape.under)).toEqual([false]);
  });

  it("cuts a strip where it passes behind the camera, and keeps the picture glued to the wall", () => {
    // A railing along the whole field, 8 units to the left of the kart. It
    // runs from far behind the camera to far ahead. Along it "u" (how far
    // along the picture) equals x, so for every end of every strip given
    // back, u must still equal the x of that end: kart.x + ahead.
    const kart = lookingEastFrom(200);
    const rail = sceneryOf({ fences: [{ from: [0, 4.7], to: [40, 4.7], top: TALL, art: "railing" }] });
    const strips = stripsOnly(view(rail, kart));
    expect(strips.length).toBeGreaterThan(10);
    let cutShort = 0;
    for (const strip of strips) {
      expect(strip.uA).toBeCloseTo(kart.x + strip.a.ahead);
      expect(strip.uB).toBeCloseTo(kart.x + strip.b.ahead);
      expect(strip.a.sideways).toBeCloseTo(-8);
      expect(strip.a.ahead).toBeGreaterThan(-eye.behind); // nothing from behind the eye
      cutShort += strip.b.ahead - strip.a.ahead < 9.99 ? 1 : 0;
    }
    expect(cutShort).toBe(1); // the one strip that crosses the line just in front of the eye

    // The same railing listed from its other end: "u" now counts down from 400.
    const turned = sceneryOf({ fences: [{ from: [40, 4.7], to: [0, 4.7], top: TALL, art: "railing" }] });
    for (const strip of stripsOnly(view(turned, kart))) {
      expect(strip.uA).toBeCloseTo(400 - (kart.x + strip.a.ahead));
      expect(strip.uB).toBeCloseTo(400 - (kart.x + strip.b.ahead));
      expect(strip.b.ahead).toBeGreaterThan(-eye.behind);
    }
  });
});

describe("the squares that have scenery standing on them", () => {
  const squaresOf = (model) => squaresWithScenery(sceneryOf(model), FIELD.tileSize);

  it("includes the square a box on the ground stands on, and not squares far from it", () => {
    const squares = squaresOf({ blocks: [{ rect: [3, 3, 4, 4], top: 2, art: "white" }] });
    expect(squares.has("3 3")).toBe(true);
    expect(squares.has("0 0")).toBe(false);
    expect(squares.has("6 3")).toBe(false);
    expect(squares.has("20 5")).toBe(false);
  });

  it("adds nothing for a roof or a railing that starts above the ground: it does not show where a wall is", () => {
    expect(squaresOf({ blocks: [{ rect: [3, 3, 4, 4], base: 4, top: 5, art: "white" }] }).size).toBe(0);
    expect(squaresOf({ fences: [{ from: [3, 3], to: [6, 3], base: 1, top: 2, art: "railing" }] }).size).toBe(0);
  });

  it("includes the squares on both sides of a fence that runs at a slant through their corners", () => {
    const squares = squaresOf({ fences: [{ from: [1, 1], to: [4, 4], top: 1, art: "low-wall" }] });
    for (const square of ["1 1", "2 2", "3 3", "2 1", "1 2", "3 2", "2 3"]) {
      expect(squares.has(square), square).toBe(true);
    }
    expect(squares.has("5 1")).toBe(false);
    expect(squares.has("1 5")).toBe(false);
  });

  it("is empty for scenery with nothing in it", () => {
    expect(squaresOf({}).size).toBe(0);
  });
});

describe("the outline round a set of points (hullOf in ground-art.js)", () => {
  it("gives the four corners of a square, and drops the points inside it", () => {
    const corners = [[0, 0], [2, 0], [2, 2], [0, 2]];
    const hull = hullOf([...corners, [1, 1], [0.5, 1.5], [1.7, 0.2]]);
    const sorted = (points) => [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    expect(sorted(hull)).toEqual(sorted(corners));
  });

  it("drops a point on the edge between two corners as well", () => {
    expect(hullOf([[0, 0], [1, 0], [2, 0], [2, 2], [0, 2]])).toHaveLength(4);
  });

  it("goes round in one direction: each corner is next to its two neighbours", () => {
    const hull = hullOf([[0, 0], [2, 2], [2, 0], [0, 2], [1, 1]]);
    for (let i = 0; i < hull.length; i++) {
      const next = hull[(i + 1) % hull.length];
      // Neighbours on a square share an x or a y. Opposite corners share neither.
      expect(hull[i][0] === next[0] || hull[i][1] === next[1]).toBe(true);
    }
  });
});

describe("which squares a shape of the ground covers (nova-lap-ground.js)", () => {
  it("counts a square when its middle lies inside a rectangle", () => {
    const shape = { rect: [1, 1, 3, 2] }; // columns 1 and 2, row 1
    expect(shapeCovers(shape, 1, 1)).toBe(true);
    expect(shapeCovers(shape, 2, 1)).toBe(true);
    expect(shapeCovers(shape, 0, 1)).toBe(false);
    expect(shapeCovers(shape, 3, 1)).toBe(false);
    expect(shapeCovers(shape, 1, 0)).toBe(false);
    expect(shapeCovers(shape, 1, 2)).toBe(false);
  });

  it("includes the left and top edges of a rectangle, but not its right and bottom edges", () => {
    // The middle of square 1,1 is at 1.5, 1.5.
    expect(shapeCovers({ rect: [1.5, 1.5, 3, 3] }, 1, 1)).toBe(true); //   exactly on the left and top edge
    expect(shapeCovers({ rect: [0, 0, 1.5, 3] }, 1, 1)).toBe(false); //    exactly on the right edge
    expect(shapeCovers({ rect: [0, 0, 3, 1.5] }, 1, 1)).toBe(false); //    exactly on the bottom edge
    expect(shapeCovers({ rect: [0, 0, 1.6, 1.6] }, 1, 1)).toBe(true); //   just inside
  });

  it("knows which squares are inside a triangle", () => {
    // A corner piece: the top left half of a square of 4 by 4.
    const triangle = { poly: [[0, 0], [4, 0], [0, 4]] };
    expect(shapeCovers(triangle, 0, 0)).toBe(true);
    expect(shapeCovers(triangle, 1, 1)).toBe(true); //  middle at 1.5, 1.5: inside the slanting edge
    expect(shapeCovers(triangle, 2, 0)).toBe(true);
    expect(shapeCovers(triangle, 2, 2)).toBe(false); // middle at 2.5, 2.5: beyond it
    expect(shapeCovers(triangle, 3, 3)).toBe(false);
    expect(shapeCovers(triangle, 4, 0)).toBe(false); // outside altogether
    expect(shapeCovers(triangle, 0, 4)).toBe(false);
  });
});

describe("the letter map that shapes describe (lettersFromGround)", () => {
  const SIZE = { columns: 4, rows: 2 };

  it("is wall where no shape lies, and the letter of the rule where one does", () => {
    const ground = [
      { surface: "ochre", rule: "road", rect: [0, 0, 2, 1] },
      { surface: "lawn", rule: "grass", rect: [2, 0, 3, 1] },
      { surface: "scrub", rule: "wall", rect: [0, 1, 1, 2] },
    ];
    expect(lettersFromGround(ground, SIZE)).toEqual(["..,#", "####"]);
  });

  it("lets a later shape win over an earlier one, as paint does", () => {
    const ground = [
      { surface: "ochre", rule: "road", rect: [0, 0, 4, 2] },
      { surface: "lawn", rule: "grass", rect: [1, 0, 3, 2] },
      { surface: "scrub", rule: "wall", rect: [2, 1, 4, 2] },
    ];
    expect(lettersFromGround(ground, SIZE)).toEqual([".,,.", ".,##"]);
  });

  it("changes nothing for a shape without a rule: it is paint only", () => {
    const ground = [
      { surface: "ochre", rule: "road", rect: [0, 0, 4, 1] },
      { surface: "glass-floor", rect: [1, 0, 3, 2] },
    ];
    expect(lettersFromGround(ground, SIZE)).toEqual(["....", "####"]);
  });

  it("makes the extra rectangles wall whatever lies under them: buildings always win", () => {
    const ground = [
      { surface: "ochre", rule: "road", rect: [0, 0, 4, 2] },
      { surface: "lawn", rule: "grass", rect: [3, 0, 4, 2] },
    ];
    expect(lettersFromGround(ground, SIZE, [[1, 0, 2, 2], [3, 1, 4, 2]])).toEqual([".#.,", ".#.#"]);
  });

  it("takes no square for a wall so thin that no middle of a square lies inside it", () => {
    const ground = [{ surface: "ochre", rule: "road", rect: [0, 0, 4, 2] }];
    expect(lettersFromGround(ground, SIZE, [[1, 0, 1.3, 2]])).toEqual(["....", "...."]);
  });

  it("gives a slanting edge to a shape with corners, square by square", () => {
    // A triangle in the top left corner. Its slanting edge runs from 3.5
    // squares along the top to 3.5 squares down the left side, so it passes
    // between the middles of the squares and never exactly through one.
    const ground = [{ surface: "ochre", rule: "road", poly: [[0, 0], [3.5, 0], [0, 3.5]] }];
    expect(lettersFromGround(ground, { columns: 4, rows: 4 })).toEqual(["...#", "..##", ".###", "####"]);
  });
});

describe("walls that have scenery of their own get no barrier (noBarrierAt in buildings.js)", () => {
  // A ring of road round one block of wall, inside a thick border of wall
  // (the same small track as in track-looks.test.js).
  const track = createTrack({
    name: "Bank test track",
    tileSize: 10,
    laps: 1,
    map: ["#######", "#######", "##...##", "##.#.##", "##...##", "#######", "#######"],
    start: { column: 2, row: 2, angle: 0 },
    checkpoints: [
      { name: "a", column: 2, row: 3, columns: 1, rows: 1 },
      { name: "b", column: 3, row: 2, columns: 1, rows: 1 },
      { name: "c", column: 4, row: 3, columns: 1, rows: 1 },
    ],
  });
  const raisedIn = (buildings) => buildings.roofs.map((roof) => `${roof.column},${roof.row}`).sort();
  const before = createBuildings(track, null, { barrierHeight: 4 });

  it("changes nothing when the option is left out, is null, or never says yes", () => {
    expect(before.roofs).toHaveLength(17); // the ring of wall round the road, and the block in the middle
    expect(createBuildings(track, null, { barrierHeight: 4, noBarrierAt: null })).toEqual(before);
    expect(createBuildings(track, null, { barrierHeight: 4, noBarrierAt: () => false })).toEqual(before);
  });

  it("gives the square it says yes for no barrier, while its neighbours keep theirs", () => {
    const buildings = createBuildings(track, null, { barrierHeight: 4, noBarrierAt: (column, row) => column === 1 && row === 3 });
    const raised = raisedIn(buildings);
    expect(raised).not.toContain("1,3");
    expect(raised).toContain("1,2"); // the square above it
    expect(raised).toContain("1,4"); // the square below it
    expect(raised).toHaveLength(16);
    expect(raised).toEqual(raisedIn(before).filter((square) => square !== "1,3"));
    expect(buildings.sides.some((side) => side.column === 1 && side.row === 3)).toBe(false);
  });

  it("stands a side at the end of the barrier where the gap is, so the barrier does not look cut open", () => {
    const isEndAtTheGap = (side) => side.column === 1 && side.row === 2 && side.facing === "south";
    expect(before.sides.some(isEndAtTheGap)).toBe(false); // one unbroken barrier: no side between two squares of it
    const buildings = createBuildings(track, null, { barrierHeight: 4, noBarrierAt: (column, row) => column === 1 && row === 3 });
    expect(buildings.sides.some(isEndAtTheGap)).toBe(true);
  });

  it("takes only an exact true for a yes", () => {
    for (const answer of ["yes", 1, {}, undefined]) {
      expect(createBuildings(track, null, { barrierHeight: 4, noBarrierAt: () => answer }), String(answer)).toEqual(before);
    }
    // And something that is not a function is ignored, instead of breaking.
    expect(createBuildings(track, null, { barrierHeight: 4, noBarrierAt: "everywhere" })).toEqual(before);
  });

  it("leaves no barrier at all when every wall has scenery, and still makes none without a barrier height", () => {
    const none = createBuildings(track, null, { barrierHeight: 4, noBarrierAt: () => true });
    expect(none.roofs).toEqual([]);
    expect(none.sides).toEqual([]);
    expect(createBuildings(track, null, { noBarrierAt: () => true })).toBe(null);
  });

  it("never takes a building away: a square with storeys stays a building", () => {
    const storeys = { storeyMetres: 3, squareMetres: 10, rows: ["0000000", "0000000", "0000000", "0002000", "0000000", "0000000", "0000000"] };
    const buildings = createBuildings(track, storeys, { barrierHeight: 4, noBarrierAt: () => true });
    expect(buildings.roofs.map((roof) => [roof.column, roof.row, roof.style, roof.height])).toEqual([[3, 3, "building", 6]]);
  });
});
