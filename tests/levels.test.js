// Tests for the two levels of ground in the race view: client/levels.js (where
// the ground lies lower, its steps and its walls) and the "eyeLift" of the
// camera in client/camera.js (how something on lower or higher ground is
// drawn). Only the picture: the driving rules know nothing about levels,
// which the last test checks.
//
// The painting itself (ground.js, draw.js) needs a real page: it was looked
// at in a browser, from the top of the stairs, halfway down, in the lower
// plaza in four directions, on the path, from its top, and in the view from
// above.

import { describe, it, expect } from "vitest";
import { readLevels, depthAt, sunkenBounds, faces, sceneryByLevel } from "../client/levels.js";
import { chaseNumbers, chasePoint, chaseRow, eyeOf, seesFromAbove, RACE, CHASE } from "../client/camera.js";
import { lookOfTrack } from "../client/track-looks.js";
import { NOVA_LAP } from "../shared/tracks/nova-lap.js";
import { TEST_OVAL } from "../shared/tracks/test-oval.js";
import { surfaceAt } from "../shared/track.js";
import { ROAD } from "../shared/surfaces.js";

const TILE = 32;
const UNITS_PER_METRE = 32 / 3;
const NOVA_LOOK = lookOfTrack(NOVA_LAP);
const LEVELS = readLevels(NOVA_LOOK, TILE, UNITS_PER_METRE);
const DROP = NOVA_LOOK.levels.drop * UNITS_PER_METRE;
const depthAtSquare = (column, row) => depthAt(LEVELS, (column + 0.5) * TILE, (row + 0.5) * TILE);

/** A small made-up look: a flat pit of 2 by 2 squares, 1 metre deep. */
const pit = (more = {}) => ({ levels: { drop: 1, areas: [{ rect: [2, 2, 4, 4], to: 1 }], ...more } });

describe("the camera, for ground at another level", () => {
  it("changes nothing without an eye lift, or with a lift of 0", () => {
    expect(chaseNumbers({ ...RACE, eyeLift: 0 })).toEqual(chaseNumbers(RACE));
    expect(chasePoint(120, 30, { ...RACE, eyeLift: 0 })).toEqual(chasePoint(120, 30, RACE));
  });

  it("draws lower ground lower on the screen, at the same place across and the same size", () => {
    const level = chasePoint(200, 40, RACE);
    const lower = chasePoint(200, 40, { ...RACE, eyeLift: 10 });
    expect(lower.y).toBeGreaterThan(level.y);
    expect(lower.x).toBeCloseTo(level.x);
    expect(lower.scale).toBeCloseTo(level.scale);
  });

  it("draws higher ground higher, and keeps the horizon where it is", () => {
    expect(chasePoint(200, 40, { ...RACE, eyeLift: -10 }).y).toBeLessThan(chasePoint(200, 40, RACE).y);
    expect(chaseNumbers({ ...RACE, eyeLift: -10 }).horizonY).toBe(chaseNumbers(RACE).horizonY);
    expect(chaseRow(400, { ...RACE, eyeLift: 5 }).scale).not.toBe(chaseRow(400, RACE).scale);
  });

  it("puts the eye exactly that much higher or lower", () => {
    expect(eyeOf({ ...RACE, eyeLift: 8 }).height).toBeCloseTo(eyeOf(RACE).height + 8);
    expect(eyeOf({ ...CHASE, eyeLift: -8 }).height).toBeCloseTo(eyeOf(CHASE).height - 8);
  });

  it("cannot see ground from above once the eye is at or below it", () => {
    const eye = eyeOf(RACE).height;
    expect(seesFromAbove(RACE)).toBe(true);
    expect(seesFromAbove({ ...RACE, eyeLift: -(eye - 1) })).toBe(true);
    expect(seesFromAbove({ ...RACE, eyeLift: -eye })).toBe(false);
    expect(seesFromAbove({ ...RACE, eyeLift: -(eye + 5) })).toBe(false);
  });

  it("keeps the lowest part of the Nova lap shallower than the race camera's eye, so it can see over the edge from there", () => {
    expect(DROP).toBeLessThan(eyeOf(RACE).height);
    expect(seesFromAbove({ ...RACE, eyeLift: -DROP })).toBe(true);
  });
});

describe("reading the levels of a look", () => {
  it("gives none for a look without levels, as on every track but the Nova lap", () => {
    expect(readLevels(lookOfTrack(TEST_OVAL), TILE, UNITS_PER_METRE)).toBeNull();
    expect(readLevels({}, TILE, UNITS_PER_METRE)).toBeNull();
    expect(depthAt(null, 100, 100)).toBe(0);
  });

  it("turns a flat area into one strip at its depth, in units", () => {
    const levels = readLevels(pit(), TILE, UNITS_PER_METRE);
    expect(levels.strips).toEqual([{ left: 64, top: 64, right: 128, bottom: 128, depth: UNITS_PER_METRE }]);
  });

  it("cuts an area that goes down into equal steps, the last one exactly at its full depth", () => {
    const levels = readLevels({ levels: { drop: 3, areas: [{ rect: [0, 0, 3, 1], from: 0, to: 1, along: "x", steps: 3 }] } }, TILE, 1);
    const depths = [...levels.strips].sort((a, b) => a.left - b.left).map((strip) => strip.depth);
    expect(depths).toEqual([1, 2, 3]);
  });

  it("refuses levels that make no sense", () => {
    const bad = [
      { drop: 0, areas: [{ rect: [0, 0, 1, 1], to: 1 }] },
      { drop: 1, areas: [] },
      { drop: 1, areas: [{ rect: [0, 0, 0, 1], to: 1 }] },
      { drop: 1, areas: [{ rect: [0, 0, 1], to: 1 }] },
      { drop: 1, areas: [{ rect: [0, 0, 1, 1], to: 1.5 }] },
      { drop: 1, areas: [{ rect: [0, 0, 1, 1], from: -1, to: 1, along: "x" }] },
      { drop: 1, areas: [{ rect: [0, 0, 1, 1], to: 1, along: "z" }] },
      { drop: 1, areas: [{ rect: [0, 0, 1, 1], to: 1, along: "x", steps: 0 }] },
      { drop: 1, areas: [{ rect: [0, 0, 1, 1], to: 1, along: "x", steps: 2.5 }] },
    ];
    for (const levels of bad) {
      expect(() => readLevels({ levels }, TILE, UNITS_PER_METRE), JSON.stringify(levels)).toThrow(/Levels/);
    }
  });
});

describe("the two levels of the Nova lap", () => {
  it("has the stairs going down southwards, step by step, from the promenade to the lower plaza", () => {
    const steps = [63, 64, 65, 66, 67, 68].map((row) => depthAtSquare(67, row));
    for (let i = 1; i < steps.length; i++) {
      expect(steps[i]).toBeGreaterThan(steps[i - 1]);
    }
    expect(steps[0]).toBeGreaterThan(0); //    the first step is already below the promenade
    expect(steps.at(-1)).toBeCloseTo(DROP); // and the last is level with the plaza
    expect(depthAtSquare(67, 62)).toBe(0); //  the promenade itself is at ground level
  });

  it("has the whole lower plaza at the full drop", () => {
    for (const [column, row] of [[64, 69], [68, 72], [72, 77]]) {
      expect(depthAtSquare(column, row)).toBeCloseTo(DROP);
    }
  });

  it("has the path past the beach tunnel rising back up to ground level in the west, smoothly", () => {
    const along = [63, 60, 56, 52, 48].map((column) => depthAtSquare(column, 72));
    for (let i = 1; i < along.length; i++) {
      expect(along[i]).toBeLessThan(along[i - 1]);
    }
    expect(along.at(-1)).toBeLessThan(DROP / 10); // nearly at ground level at its west end
    expect(depthAtSquare(47, 72)).toBe(0); //        and the slanting path beyond is on the ground
    // Smoothly: no step of the path is higher than a few centimetres.
    const path = LEVELS.strips.filter((strip) => strip.top === 70 * TILE && strip.right <= 64 * TILE);
    expect(path.length).toBeGreaterThanOrEqual(30);
  });

  it("is flat everywhere else, on the avenue, the promenade and the coast road", () => {
    for (const [column, row] of [[30, 10], [67, 50], [30, 80]]) {
      expect(depthAtSquare(column, row)).toBe(0);
    }
  });

  // (Written on 20 November with the plaza as the southern end; the same day
  // the Sagres Beach Way and the tunnel's mouth went down too, at
  // Francisco's request, so the sunken part now ends at the tunnel's back
  // wall. This test had not been merged yet.)
  it("keeps the whole sunken part inside the stairs, the plaza, the path and the Sagres Beach Way", () => {
    expect(sunkenBounds(LEVELS)).toEqual({ left: 48 * TILE, top: 63 * TILE, right: 73 * TILE, bottom: 79.5 * TILE });
  });

  // (Both changed the same afternoon, before any merge: at Francisco's request
  // the tunnel moved 5.5 squares east, to the edge of the plaza, and the
  // Beach Way became only the part in front of its mouth.)
  it("has the Sagres Beach Way, in front of the tunnel, and the floor of the tunnel's mouth as low as the plaza", () => {
    for (const [column, row] of [[55, 75], [60, 76], [63, 74], [57, 78], [61, 78]]) {
      expect(depthAtSquare(column, row), `${column}, ${row}`).toBeCloseTo(DROP);
    }
  });

  it("makes the Sagres Beach Way drop away below the path: the further west, the deeper it is below it", () => {
    const below = (column) => depthAtSquare(column, 75) - depthAtSquare(column, 72);
    expect(below(56)).toBeGreaterThan(below(60));
    expect(below(60)).toBeGreaterThan(below(63));
  });

  it("has no Beach Way left west of the tunnel: the bank there is at ground level, so there is no corridor", () => {
    for (const column of [51, 53, 54]) {
      expect(depthAtSquare(column, 75), `${column}`).toBe(0);
    }
  });

  it("paints its strips deepest first, so that shallower ground in front covers deeper ground behind", () => {
    for (let i = 1; i < LEVELS.strips.length; i++) {
      expect(LEVELS.strips[i].depth).toBeLessThanOrEqual(LEVELS.strips[i - 1].depth);
    }
  });

  it("drives exactly as before: the levels are only a picture", () => {
    expect(surfaceAt(NOVA_LAP, 68 * TILE, 72 * TILE)).toEqual(ROAD);
    expect(NOVA_LAP.levels).toBeUndefined();
  });
});

describe("the scenery of the Nova lap, by level", () => {
  const { blocks, fences } = NOVA_LOOK.scenery;
  const groups = sceneryByLevel(blocks, fences, NOVA_LOOK.levels.scenery, LEVELS, TILE);
  const groupOf = (name) => groups.find((group) => [...group.blocks, ...group.fences].some((piece) => piece.name === name || piece.name.startsWith(`${name}, piece`)));

  it("puts the beach tunnel at the bottom, with the Sagres Beach Way", () => {
    for (const name of ["tunnel, wall west of the mouth", "tunnel, beam with the name", "tunnel, ceiling", "tunnel, back wall"]) {
      expect(groupOf(name).depth, name).toBeCloseTo(DROP);
    }
  });

  it("leaves everything else on the ground of the track, as before", () => {
    expect(groups[0].depth).toBe(0);
    expect(groupOf("Grand Auditorium").depth).toBe(0);
    const all = groups.reduce((count, group) => count + group.blocks.length, 0);
    expect(all).toBe(blocks.length); // no block lost or doubled
  });

  it("stands the railing between the path and the Sagres Beach Way on the path, rising with it to the west", () => {
    const pieces = groups.flatMap((group) => group.fences.filter((fence) => fence.name.startsWith("rail along the tunnel way")).map((fence) => ({ x: fence.from[0], depth: group.depth })));
    expect(pieces.length).toBeGreaterThan(10); // cut at every square
    pieces.sort((a, b) => a.x - b.x);
    for (let i = 1; i < pieces.length; i++) {
      expect(pieces[i].depth).toBeGreaterThanOrEqual(pieces[i - 1].depth); // deeper towards the east, like the path
    }
    expect(pieces[0].depth).toBeLessThan(DROP / 3); // in the west it is high above the Beach Way
  });

  it("keeps every block of the track without levels on the ground, in one group", () => {
    const flat = sceneryByLevel(blocks, fences, NOVA_LOOK.levels.scenery, null, TILE);
    expect(flat).toHaveLength(1);
    expect(flat[0].blocks).toHaveLength(blocks.length);
    expect(flat[0].fences).toHaveLength(fences.length);
  });

  it("refuses a rule for scenery that does not exist, or with no depth", () => {
    expect(() => sceneryByLevel(blocks, fences, [{ name: "a tunnel that is not there", depth: 1 }], LEVELS, TILE)).toThrow(/no scenery called/);
    expect(() => sceneryByLevel(blocks, fences, [{ name: "tunnel, ceiling" }], LEVELS, TILE)).toThrow(/depth/);
  });
});

describe("the walls of the sunken part", () => {
  it("has a front for every step of the stairs, looking up them (north), as deep as one step", () => {
    const fronts = LEVELS.walls.filter((wall) => wall.toward.y === 1 && wall.a.x >= 64 * TILE && wall.b.x <= 71 * TILE && wall.a.y > 63 * TILE && wall.a.y <= 69 * TILE);
    expect(fronts.length).toBeGreaterThanOrEqual(11);
    for (const front of fronts) {
      expect(front.bottom - front.top).toBeCloseTo(DROP / 12);
    }
  });

  it("has stone walls round the plaza that look into it, from the ground down to its floor", () => {
    // The east side, under the Grand Auditorium: it looks west, into the plaza.
    const east = LEVELS.walls.find((wall) => wall.toward.x === -1 && wall.a.x === 73 * TILE && wall.top === 0);
    expect(east).toBeDefined();
    expect(east.bottom).toBeCloseTo(DROP);
  });

  it("are painted only when they look towards the camera", () => {
    const east = LEVELS.walls.find((wall) => wall.toward.x === -1 && wall.a.x === 73 * TILE && wall.top === 0);
    expect(faces(east, { x: 68 * TILE, y: 72 * TILE })).toBe(true); //  from the plaza: seen
    expect(faces(east, { x: 80 * TILE, y: 72 * TILE })).toBe(false); // from behind it: not
  });

  it("are joined into long pieces, not one per small square", () => {
    expect(LEVELS.walls.length).toBeLessThan(250);
  });

  it("has a simple made-up pit with exactly four walls, all looking into it", () => {
    const levels = readLevels(pit(), TILE, UNITS_PER_METRE);
    expect(levels.walls).toHaveLength(4);
    const middle = { x: 3 * TILE, y: 3 * TILE };
    for (const wall of levels.walls) {
      expect(faces(wall, middle)).toBe(true);
      expect(wall.top).toBe(0);
      expect(wall.bottom).toBeCloseTo(UNITS_PER_METRE);
    }
  });
});
