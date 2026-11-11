// Tests for client/buildings.js (buildings standing up in the view behind the
// kart) and storeysOf in shared/tracks/index.js.
//
// How the buildings look is checked by eye in a browser. These tests check the
// arithmetic: which sides and roofs exist, how tall they are, which ones can
// be seen from the kart, and that bad storeys are refused.

import { describe, it, expect } from "vitest";
import { createBuildings, buildingsInView } from "../client/buildings.js";
import { createTrack } from "../shared/track.js";
import { storeysOf } from "../shared/tracks/index.js";
import { CAMPUS_LOOP } from "../shared/tracks/campus-loop.js";
import { CAMPUS_LOOP_STOREYS } from "../shared/tracks/campus-loop-storeys.js";
import { TEST_OVAL } from "../shared/tracks/test-oval.js";

// A small track with one block of wall in the middle, 10 units a square.
//   column: 01234
const BLOCK_TRACK = createTrack({
  name: "Block test track",
  tileSize: 10,
  laps: 1,
  map: ["#####", "#...#", "#.#.#", "#...#", "#####"],
  start: { column: 1, row: 1, angle: 0 },
  checkpoints: [
    { name: "a", column: 1, row: 2, columns: 1, rows: 1 },
    { name: "b", column: 2, row: 1, columns: 1, rows: 1 },
    { name: "c", column: 3, row: 2, columns: 1, rows: 1 },
  ],
});

/** Storeys for the block track. One storey is 3 metres and a square 10 metres, so one storey is 3 units. */
function blockStoreys(rows) {
  return { storeyMetres: 3, squareMetres: 10, rows };
}

const ONE_BLOCK = blockStoreys(["00000", "00000", "00200", "00000", "00000"]);

// A long, thin track to look along: a road on rows 2 and 3, and room for
// blocks on row 1 at any distance from a kart that looks east from the left.
function longTrack(blockColumns) {
  const wallRow = "#".repeat(60);
  const blockRow = [...".".repeat(60)].map((letter, column) => (blockColumns.includes(column) ? "#" : letter)).join("");
  const track = createTrack({
    name: "Long test track",
    tileSize: 10,
    laps: 1,
    map: [wallRow, blockRow, ".".repeat(60), ".".repeat(60), wallRow],
    start: { column: 0, row: 2, angle: 0 },
    checkpoints: [
      { name: "a", column: 5, row: 2, columns: 1, rows: 2 },
      { name: "b", column: 25, row: 2, columns: 1, rows: 2 },
      { name: "c", column: 50, row: 2, columns: 1, rows: 2 },
    ],
  });
  const storeyRow = [..."0".repeat(60)].map((digit, column) => (blockColumns.includes(column) ? "3" : digit)).join("");
  const storeys = blockStoreys(["0".repeat(60), storeyRow, "0".repeat(60), "0".repeat(60), "0".repeat(60)]);
  return { track, buildings: createBuildings(track, storeys) };
}

describe("making the buildings of a track", () => {
  it("makes none for a track without storeys, so its walls stay flat", () => {
    expect(createBuildings(TEST_OVAL, null)).toBe(null);
    expect(createBuildings(TEST_OVAL, undefined)).toBe(null);
  });

  it("works out how tall one storey is in units, from the metres", () => {
    expect(createBuildings(BLOCK_TRACK, ONE_BLOCK).unitsPerStorey).toBe(3);
    // The campus loop: 3.5 metres a storey, 6 metres and 32 units a square.
    expect(createBuildings(CAMPUS_LOOP, CAMPUS_LOOP_STOREYS).unitsPerStorey).toBeCloseTo((3.5 / 6) * 32);
  });

  it("gives a block with road all round four sides from the ground to its top, and a roof", () => {
    const { sides, roofs } = createBuildings(BLOCK_TRACK, ONE_BLOCK);
    expect(sides.map((side) => side.facing).sort()).toEqual(["east", "north", "south", "west"]);
    for (const side of sides) {
      expect(side.bottom).toBe(0);
      expect(side.top).toBe(6); // 2 storeys of 3 units
    }
    expect(roofs).toHaveLength(1);
    expect(roofs[0].height).toBe(6);
    expect(roofs[0].corners).toEqual([[20, 20], [30, 20], [30, 30], [20, 30]]);
  });

  it("puts the sides on the edges of the square, facing outwards", () => {
    const { sides } = createBuildings(BLOCK_TRACK, ONE_BLOCK);
    const north = sides.find((side) => side.facing === "north");
    expect(north.from).toEqual([20, 20]);
    expect(north.to).toEqual([30, 20]);
    expect(north.outward).toEqual([0, -1]);
  });

  it("between a taller and a lower building, stands only the part of the taller one that sticks out", () => {
    const map = ["######", "#....#", "#.##.#", "#....#", "######"];
    const track = createTrack({
      name: "Two blocks",
      tileSize: 10,
      laps: 1,
      map,
      start: { column: 1, row: 1, angle: 0 },
      checkpoints: [
        { name: "a", column: 1, row: 2, columns: 1, rows: 1 },
        { name: "b", column: 2, row: 1, columns: 1, rows: 1 },
        { name: "c", column: 4, row: 2, columns: 1, rows: 1 },
      ],
    });
    const { sides } = createBuildings(track, blockStoreys(["000000", "000000", "003100", "000000", "000000"]));
    // The two blocks touch at x = 30: the 3-storey one is columns 20 to 30,
    // the 1-storey one columns 30 to 40.
    const between = sides.filter((side) => side.from[0] === 30 && side.to[0] === 30 && side.facing === "east");
    expect(between).toHaveLength(1);
    expect(between[0].bottom).toBe(3); // from the top of the 1-storey block
    expect(between[0].top).toBe(9); // up to the top of the 3-storey block
    // The lower block has no side facing the taller one: it would be hidden inside it.
    expect(sides.some((side) => side.facing === "west" && side.from[0] === 30)).toBe(false);
  });

  it("leaves the walls with 0 storeys flat, such as the edge of the map", () => {
    const { sides, roofs } = createBuildings(BLOCK_TRACK, ONE_BLOCK);
    expect(sides).toHaveLength(4); // only the middle block
    expect(roofs).toHaveLength(1);
  });

  it("refuses storeys that do not fit the track", () => {
    const bad = [
      [{ ...ONE_BLOCK, storeyMetres: 0 }, /storeyMetres/],
      [{ ...ONE_BLOCK, squareMetres: "6" }, /squareMetres/],
      [{ ...ONE_BLOCK, squareMetres: Infinity }, /squareMetres/],
      [blockStoreys(["00000", "00000", "00200", "00000"]), /one row of storeys for each of the 5 rows/],
      [blockStoreys(["00000", "00000", "0020", "00000", "00000"]), /row 2 of the storeys is not as long/],
      [blockStoreys(["00000", "00000", "00x00", "00000", "00000"]), /not a number of storeys/],
      [blockStoreys(["00000", "00000", "00-00", "00000", "00000"]), /not a number of storeys/],
      [blockStoreys(["00000", "02000", "00000", "00000", "00000"]), /row 1, column 1 has storeys but is not a wall/],
      [{ storeyMetres: 3, squareMetres: 10 }, /one row of storeys/],
    ];
    for (const [storeys, message] of bad) {
      expect(() => createBuildings(BLOCK_TRACK, storeys)).toThrow(message);
    }
  });
});

describe("the buildings seen from behind the kart", () => {
  const lookingEast = { x: 5, y: 25, angle: 0 }; // on the road, at the left end, looking right

  it("shows nothing when there are no buildings", () => {
    expect(buildingsInView(null, lookingEast)).toEqual([]);
  });

  it("shows the roof and the sides that face the kart, not the sides facing away", () => {
    const { buildings } = longTrack([10]);
    const shapes = buildingsInView(buildings, lookingEast);
    const seen = shapes.map((shape) => `${shape.kind} ${shape.facing}`).sort();
    // The block is ahead and a little to the left: its near end (west) and the
    // side along the road (south) face the kart. North and east face away.
    expect(seen).toEqual(["roof up", "side south", "side west"]);
  });

  it("stands every side up: its top is higher on the screen than its foot", () => {
    const { buildings } = longTrack([10]);
    for (const shape of buildingsInView(buildings, lookingEast).filter((each) => each.kind === "side")) {
      const [footA, footB, topB, topA] = shape.points;
      expect(topA[1]).toBeLessThan(footA[1]);
      expect(topB[1]).toBeLessThan(footB[1]);
    }
  });

  it("draws a building further away smaller than the same building nearer", () => {
    const { buildings } = longTrack([10, 25]);
    const westSides = buildingsInView(buildings, lookingEast).filter((shape) => shape.facing === "west");
    expect(westSides).toHaveLength(2);
    const [near, far] = westSides.sort((a, b) => a.ahead - b.ahead);
    const heightOnScreen = (shape) => shape.points[0][1] - shape.points[3][1];
    expect(heightOnScreen(far)).toBeLessThan(heightOnScreen(near));
    expect(far.ahead).toBeGreaterThan(near.ahead); // draw.js paints the larger "ahead" first
  });

  it("does not show a building behind the camera, or one beyond the top of the screen", () => {
    const { buildings } = longTrack([10]);
    const pastIt = { x: 400, y: 25, angle: 0 }; // the block is 300 units behind
    expect(buildingsInView(buildings, pastIt)).toEqual([]);
    const farAway = longTrack([55]).buildings; // 550 units ahead: further than the camera shows
    expect(buildingsInView(farAway, lookingEast)).toEqual([]);
  });

  it("cuts a building that reaches behind the bottom of the screen, so nothing is drawn below it", () => {
    // A long block beside the road, reaching 100 units behind the kart. The
    // bottom row of the screen shows ground only about 30 units behind it.
    const { buildings } = longTrack([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
    const besideKart = { x: 100, y: 25, angle: 0 };
    const shapes = buildingsInView(buildings, besideKart);
    expect(shapes.length).toBeGreaterThan(0);
    for (const shape of shapes) {
      for (const [x, y] of shape.points) {
        expect(Number.isFinite(x) && Number.isFinite(y)).toBe(true);
        expect(y).toBeLessThanOrEqual(576.5); // the screen is 576 pixels tall
      }
    }
  });
});

describe("the storeys of each track", () => {
  it("gives the campus loop its storeys, and the test oval none", () => {
    expect(storeysOf(CAMPUS_LOOP)).toBe(CAMPUS_LOOP_STOREYS);
    expect(storeysOf(TEST_OVAL)).toBe(null);
  });

  it("gives no storeys for something that is not a track on the list", () => {
    expect(storeysOf({ name: "Campus loop" })).toBe(null);
    expect(storeysOf(null)).toBe(null);
    expect(storeysOf(undefined)).toBe(null);
  });

  it("has campus storeys that fit the campus loop: one digit per square, only on walls", () => {
    expect(() => createBuildings(CAMPUS_LOOP, CAMPUS_LOOP_STOREYS)).not.toThrow();
    const { sides, roofs } = createBuildings(CAMPUS_LOOP, CAMPUS_LOOP_STOREYS);
    expect(roofs.length).toBeGreaterThan(0);
    expect(sides.length).toBeGreaterThan(0);
  });
});
