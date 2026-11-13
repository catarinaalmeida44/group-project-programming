// Tests for client/buildings.js (buildings standing up in the view behind the
// kart) and storeysOf in shared/tracks/index.js.
//
// How the buildings look is checked by eye in a browser. These tests check the
// arithmetic: which sides and roofs exist, how tall they are, which ones can
// be seen from the kart, and that bad storeys are refused.

import { describe, it, expect } from "vitest";
import { createBuildings, buildingsInView, nearestInSightLine } from "../client/buildings.js";
import { RACE, eyeOf } from "../client/camera.js";
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

// Added on 13 November 2026. With the low race camera, buildings beside the
// kart were cut off early, and squares of wall near the kart went missing.
describe("buildings beside and behind the kart, with the low race camera", () => {
  // Like longTrack, but the blocks are 90 units tall: far taller than the
  // eye of the race camera, which is about 36 units above the ground.
  function tallBlocks(blockColumns, digit = "9") {
    const wallRow = "#".repeat(60);
    const blockRow = [...".".repeat(60)].map((letter, column) => (blockColumns.includes(column) ? "#" : letter)).join("");
    const track = createTrack({
      name: "Tall test track",
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
    const storeyRow = [..."0".repeat(60)].map((zero, column) => (blockColumns.includes(column) ? digit : zero)).join("");
    const rows = ["0".repeat(60), storeyRow, "0".repeat(60), "0".repeat(60), "0".repeat(60)];
    return createBuildings(track, { storeyMetres: 10, squareMetres: 10, rows });
  }
  const everyColumn = Array.from({ length: 60 }, (unused, column) => column);
  const eye = eyeOf(RACE);

  it("has the eye of the race camera lower than the tall blocks, and well behind the kart", () => {
    expect(eye.height).toBeLessThan(90);
    expect(eye.behind).toBeGreaterThan(60);
  });

  it("shows a tall wall beside the kart all the way back to the camera, so it reaches the edge of the screen", () => {
    // A wall along the whole road, 15 units to the left of the kart.
    const buildings = tallBlocks(everyColumn);
    const kart = { x: 300, y: 35, angle: 0 };
    const sides = buildingsInView(buildings, kart, RACE).filter((shape) => shape.kind === "side");
    // The ground at the bottom of the screen is only about 24 units behind
    // the kart. The wall is shown much further back than that.
    expect(Math.min(...sides.map((side) => side.ahead))).toBeLessThan(-60);
    expect(Math.min(...sides.map((side) => side.ahead))).toBeGreaterThan(-eye.behind);
    // So it runs off the left edge of the screen, with no gap beside it.
    expect(sides.some((side) => side.points.some(([x]) => x <= 0))).toBe(true);
    // And the wall right beside the kart is all there.
    expect(sides.some((side) => Math.abs(side.ahead) < 10)).toBe(true);
  });

  it("fills nothing below the screen, though the feet of a wall may stand below it", () => {
    const buildings = tallBlocks(everyColumn);
    const sides = buildingsInView(buildings, { x: 300, y: 35, angle: 0 }, RACE).filter((shape) => shape.kind === "side");
    let feetBelowTheScreen = 0;
    for (const side of sides) {
      expect(side.corners).toHaveLength(4);
      const [footA, footB, topB, topA] = side.corners;
      expect(topA[1]).toBeLessThan(footA[1]);
      expect(topB[1]).toBeLessThan(footB[1]);
      feetBelowTheScreen += footA[1] > 576 || footB[1] > 576 ? 1 : 0;
      for (const [x, y] of side.points) {
        expect(Number.isFinite(x) && Number.isFinite(y)).toBe(true);
        expect(y).toBeLessThanOrEqual(576.5);
      }
    }
    expect(feetBelowTheScreen).toBeGreaterThan(0);
  });

  it("leaves out a tall block that stands between the camera and the kart", () => {
    // The kart is on the row of the blocks, 20 units in front of block 27.
    const buildings = tallBlocks([27, 40]);
    const kart = { x: 300, y: 15, angle: 0 };
    const shapes = buildingsInView(buildings, kart, RACE);
    expect(shapes.filter((shape) => shape.column === 27)).toEqual([]);
    // The block ahead of the kart is shown as always.
    expect(shapes.some((shape) => shape.column === 40 && shape.facing === "west")).toBe(true);
  });

  it("leaves out the rest of the same straight wall behind the kart, but not a separate building next to it", () => {
    // The kart looks south, away from a wall of four blocks right behind
    // it. One more block stands in the same line, after a gap.
    const buildings = tallBlocks([25, 26, 27, 28, 30]);
    const kart = { x: 275, y: 28, angle: Math.PI / 2 };
    const shapes = buildingsInView(buildings, kart, RACE);
    expect(shapes.filter((shape) => shape.column >= 25 && shape.column <= 28)).toEqual([]);
    expect(shapes.some((shape) => shape.column === 30 && shape.facing === "north")).toBe(true);
  });

  it("never takes a wall that the kart touches for one that stands in the way", () => {
    // The kart drives along the wall with its side against it: its middle is 10 units from the wall.
    const buildings = tallBlocks(everyColumn);
    const sides = buildingsInView(buildings, { x: 300, y: 30, angle: 0 }, RACE).filter((shape) => shape.kind === "side");
    const columnsShown = new Set(sides.map((side) => side.column));
    for (let column = 23; column <= 40; column++) {
      expect(columnsShown.has(column), `column ${column}`).toBe(true);
    }
  });

  it("keeps a low block in the same spot: it does not hide the kart", () => {
    const buildings = tallBlocks([27], "1"); // 10 units tall
    const shapes = buildingsInView(buildings, { x: 300, y: 15, angle: 0 }, RACE);
    const seen = shapes.filter((shape) => shape.column === 27).map((shape) => `${shape.kind} ${shape.facing}`);
    expect(seen.sort()).toEqual(["roof up", "side west"]);
  });

  it("keeps a tall block that is behind the kart but off to the side", () => {
    // The same block, seen from the road two rows down: it is not in the line from the camera to the kart.
    const buildings = tallBlocks([27]);
    const shapes = buildingsInView(buildings, { x: 300, y: 38, angle: 0 }, RACE);
    expect(shapes.some((shape) => shape.column === 27 && shape.kind === "side")).toBe(true);
  });
});

describe("what stands in the line from the camera to the kart", () => {
  const BEHIND = 80; // the eye is 80 units behind the kart
  const HALF = 14; //   the kart is 28 units wide
  const at = (ahead, sideways) => ({ ahead, sideways });

  it("finds a line that crosses straight behind the kart, and says how far behind", () => {
    expect(nearestInSightLine(at(-30, -50), at(-30, 50), BEHIND, HALF)).toBeCloseTo(-30);
    expect(nearestInSightLine(at(-30, 50), at(-30, -50), BEHIND, HALF)).toBeCloseTo(-30);
  });

  it("gives the spot nearest to the kart when the line runs along the way", () => {
    // From the eye's end towards the kart, down the middle.
    expect(nearestInSightLine(at(-70, 0), at(-10, 0), BEHIND, HALF)).toBeCloseTo(-10);
    expect(nearestInSightLine(at(-70, 0), at(40, 0), BEHIND, HALF)).toBeCloseTo(0); // never ahead of the kart
  });

  it("gives null for a line beside the kart, ahead of it, or behind the camera", () => {
    expect(nearestInSightLine(at(-70, 20), at(10, 20), BEHIND, HALF)).toBe(null); // beside
    expect(nearestInSightLine(at(-70, -20), at(10, -20), BEHIND, HALF)).toBe(null);
    expect(nearestInSightLine(at(5, -50), at(5, 50), BEHIND, HALF)).toBe(null); // ahead of the kart
    expect(nearestInSightLine(at(-100, -50), at(-100, 50), BEHIND, HALF)).toBe(null); // behind the eye
  });

  it("knows the space is narrow near the camera and as wide as the kart at the kart", () => {
    // 10 units to the side: inside right behind the kart, outside near the eye.
    expect(nearestInSightLine(at(-5, 10), at(-5, 30), BEHIND, HALF)).not.toBe(null);
    expect(nearestInSightLine(at(-70, 10), at(-70, 30), BEHIND, HALF)).toBe(null);
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
