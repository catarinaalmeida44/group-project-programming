// Tests for the picture side of ramps and walkers: client/street-life.js
// (which walkers are drawn, and where), the ramp boxes of client/scenery.js,
// and how client/net.js reads the walkers out of a message from the server.
//
// The rules themselves (who takes off, who topples) are in shared/ramps.js
// and shared/walkers.js and have their own tests. These tests check that
// the picture cannot disagree with the rules, and that a strange message
// from the server cannot break the page.

import { describe, it, expect } from "vitest";
import { walkersToShow, WALKER_LOOKS } from "../client/street-life.js";
import { rampBlocks, createScenery, RAMP_FLAT_STYLES } from "../client/scenery.js";
import { walkersOf } from "../client/net.js";
import { walkerAt, createWalkers, DOWN_STEPS, INSIDE_STEPS, WALKER_SPEED } from "../shared/walkers.js";
import { createTrack } from "../shared/track.js";

// A field of road 12 squares wide and 6 tall, with a wall round it. One
// walker crosses it from left to right along row 3: 8 squares, 80 units.
const FIELD = createTrack({
  name: "Street test field",
  tileSize: 10,
  laps: 1,
  map: ["##############", ...Array(6).fill("#............#"), "##############"],
  start: { column: 2, row: 2, angle: 0 },
  checkpoints: [
    { name: "a", column: 3, row: 1, columns: 1, rows: 6 },
    { name: "b", column: 6, row: 1, columns: 1, rows: 6 },
    { name: "c", column: 9, row: 1, columns: 1, rows: 6 },
  ],
  ramps: [
    { column: 2, row: 5, angle: 0 }, //             driven to the right
    { column: 4, row: 5, angle: Math.PI }, //       to the left
    { column: 6, row: 5, angle: Math.PI / 2 }, //   down the map
    { column: 8, row: 5, angle: -Math.PI / 2 }, //  up the map
  ],
  walkers: [{ path: [[2, 3.5], [10, 3.5]] }, { path: [[10, 2.5], [2, 2.5]], startShare: 0.5 }],
});
const WALK_STEPS = Math.ceil(80 / (WALKER_SPEED / 60)); // steps to cross the field once

describe("which walkers the picture shows", () => {
  it("shows a walker exactly where the rules say it is", () => {
    const walkers = [{ time: 40, downSteps: 0 }, { time: 40, downSteps: 0 }];
    const [first] = walkersToShow(FIELD, walkers);
    const ruled = walkerAt(FIELD, 0, walkers[0]);
    expect(first.x).toBeCloseTo(ruled.x);
    expect(first.y).toBeCloseTo(ruled.y);
    expect(first.angle).toBeCloseTo(ruled.angle);
    expect(first.down).toBe(false);
  });

  it("leaves out a walker that is inside a building", () => {
    // Walker 0 has just arrived at the far door: inside for INSIDE_STEPS.
    const inside = { time: WALK_STEPS + 5, downSteps: 0 };
    expect(walkerAt(FIELD, 0, inside).outside).toBe(false);
    const shown = walkersToShow(FIELD, [inside, { time: 20, downSteps: 0 }]);
    expect(shown).toHaveLength(1);
    expect(shown[0].look).toBe(1); // the one left is walker 1, in its own jumper
    expect(INSIDE_STEPS).toBeGreaterThan(5);
  });

  it("shows no walkers for a race that has none, or for something that is not a list", () => {
    for (const nothing of [undefined, null, 7, "walkers", {}]) {
      expect(walkersToShow(FIELD, nothing)).toEqual([]);
    }
    expect(walkersToShow(FIELD, [])).toEqual([]);
  });

  it("lets a walker walk on between two messages from the server", () => {
    const now = walkersToShow(FIELD, createWalkers(FIELD), 0)[0];
    const later = walkersToShow(FIELD, createWalkers(FIELD), 30)[0];
    const thirtyStepsOn = walkerAt(FIELD, 0, { time: 30, downSteps: 0 });
    expect(later.x).toBeGreaterThan(now.x);
    expect(later.x).toBeCloseTo(thirtyStepsOn.x);
  });

  it("keeps a walker sitting while it is down, and lets it walk only the steps after it got up", () => {
    const down = [{ time: 40, downSteps: 20 }];
    const stillSitting = walkersToShow(FIELD, down, 10)[0];
    expect(stillSitting.down).toBe(true);
    expect(stillSitting.x).toBeCloseTo(walkerAt(FIELD, 0, { time: 40, downSteps: 0 }).x); // it has not moved
    const upAgain = walkersToShow(FIELD, down, 50)[0]; // 20 steps sitting, then 30 walking
    expect(upAgain.down).toBe(false);
    expect(upAgain.x).toBeCloseTo(walkerAt(FIELD, 0, { time: 70, downSteps: 0 }).x);
  });

  it("says how far through the sit-down a walker is, from 0 to 1", () => {
    const justToppled = walkersToShow(FIELD, [{ time: 40, downSteps: DOWN_STEPS }])[0];
    const nearlyUp = walkersToShow(FIELD, [{ time: 40, downSteps: 1 }])[0];
    expect(justToppled.downShare).toBeCloseTo(0);
    expect(nearlyUp.downShare).toBeGreaterThan(0.95);
    expect(nearlyUp.downShare).toBeLessThanOrEqual(1);
  });

  it("does not break on strange numbers: they count as a walker at the start of its round", () => {
    const strange = [{ time: NaN, downSteps: -5 }, null];
    const shown = walkersToShow(FIELD, strange, -3);
    expect(shown[0].x).toBeCloseTo(walkerAt(FIELD, 0, { time: 0, downSteps: 0 }).x);
    expect(shown[0].down).toBe(false);
    for (const walker of shown) {
      expect(walker.look).toBeLessThan(WALKER_LOOKS);
    }
  });
});

describe("the ramps as boxes for the picture", () => {
  const blocks = rampBlocks(FIELD);

  it("makes one box for each ramp, one square big, that the driving rules do not treat as a wall", () => {
    expect(blocks).toHaveLength(4);
    expect(blocks[0].rect).toEqual([2, 5, 3, 6]);
    for (const block of blocks) {
      expect(block.solid).toBe(false);
    }
  });

  it("is low where the kart drives on and high where it takes off, whichever way the ramp points", () => {
    const [right, left, down, up] = blocks;
    // "top" is the height at the left (or upper) edge, "topEnd" at the right (or lower) edge.
    expect(right.slope).toBe("x");
    expect(right.topEnd).toBeGreaterThan(right.top); // rises to the right
    expect(left.slope).toBe("x");
    expect(left.top).toBeGreaterThan(left.topEnd); //   rises to the left
    expect(down.slope).toBe("y");
    expect(down.topEnd).toBeGreaterThan(down.top); //   rises down the map
    expect(up.slope).toBe("y");
    expect(up.top).toBeGreaterThan(up.topEnd); //       rises up the map
  });

  it("gives no boxes for a track without ramps", () => {
    expect(rampBlocks({ tileSize: 10 })).toEqual([]);
    expect(rampBlocks({ tileSize: 10, ramps: [] })).toEqual([]);
  });

  it("stands up in the scenery with a sloping top, each corner at its own height", () => {
    const scenery = createScenery(FIELD, { unitsPerMetre: 10, blocks, flatStyles: RAMP_FLAT_STYLES });
    const tops = scenery.flats.filter((flat) => flat.kind === "top" && !flat.detail);
    expect(tops).toHaveLength(4);
    const [first] = tops; // the ramp driven to the right: its two right corners are the high ones
    expect(first.heights[1]).toBeGreaterThan(first.heights[0]);
    expect(first.heights[2]).toBeCloseTo(first.heights[1]);
    expect(first.heights[3]).toBeCloseTo(first.heights[0]);
    // The dark bars across it slope with it.
    const bars = scenery.flats.filter((flat) => flat.kind === "top" && flat.detail && flat.column === 2);
    expect(bars.length).toBeGreaterThan(0);
    for (const bar of bars) {
      expect(bar.height).toBeLessThanOrEqual(first.height + 1e-9);
    }
  });
});

describe("reading the walkers out of a message from the server", () => {
  it("turns the server's { time, down } into the { time, downSteps } of the rules", () => {
    expect(walkersOf({ walkers: [{ time: 120, down: 0 }, { time: 7, down: 33 }] })).toEqual([
      { time: 120, downSteps: 0 },
      { time: 7, downSteps: 33 },
    ]);
  });

  it("gives no walkers for a message without a usable list", () => {
    for (const message of [undefined, null, {}, { walkers: "many" }, { walkers: 3 }]) {
      expect(walkersOf(message)).toEqual([]);
    }
  });

  it("keeps every walker's place in the list when one entry is broken", () => {
    const read = walkersOf({ walkers: [null, { time: "soon", down: -4 }, { time: 50, down: 2 }] });
    expect(read).toEqual([
      { time: 0, downSteps: 0 },
      { time: 0, downSteps: 0 },
      { time: 50, downSteps: 2 },
    ]);
  });

  it("never reads more walkers than a track could have", () => {
    const flood = { walkers: Array(500).fill({ time: 1, down: 0 }) };
    expect(walkersOf(flood).length).toBeLessThanOrEqual(40);
  });
});
