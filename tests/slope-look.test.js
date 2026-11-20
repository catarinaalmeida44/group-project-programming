// Tests for client/slope-look.js: the small hints that show a slope in the
// race view, where the ground is drawn flat. Only the picture: the rules
// are tested in slopes.test.js.

import { describe, it, expect } from "vitest";
import { slopeLook, SLOPE_SQUASH, STEP_BUMP } from "../client/slope-look.js";
import { DOWNHILL } from "../shared/slopes.js";
import { NOVA_LAP } from "../shared/tracks/nova-lap.js";

const tile = NOVA_LAP.tileSize;
/** A kart on the Nova lap at a square, pointing and moving as given. */
const kartAt = (column, row, angle, speed = 0, air = 0) => ({
  x: (column + 0.5) * tile,
  y: (row + 0.5) * tile,
  angle,
  vx: Math.cos(angle) * speed,
  vy: Math.sin(angle) * speed,
  air,
});
const STAIRS = [67, 65];
const PATH = [55, 72];
const PLAZA = [68, 72];

describe("a kart on a slope in the race view", () => {
  it("is drawn shorter pointing downhill, as if its nose dipped, and taller pointing uphill", () => {
    expect(slopeLook(NOVA_LAP, kartAt(...STAIRS, DOWNHILL.south)).squash).toBeCloseTo(1 - SLOPE_SQUASH);
    expect(slopeLook(NOVA_LAP, kartAt(...STAIRS, DOWNHILL.north)).squash).toBeCloseTo(1 + SLOPE_SQUASH);
    // The path goes up to the west, gently: taller, but not as much.
    const up = slopeLook(NOVA_LAP, kartAt(...PATH, DOWNHILL.west)).squash;
    expect(up).toBeGreaterThan(1);
    expect(up).toBeLessThan(1 + SLOPE_SQUASH);
  });

  it("is drawn as usual on the flat, across a slope, and in the air", () => {
    expect(slopeLook(NOVA_LAP, kartAt(...PLAZA, 0, 200))).toEqual({ squash: 1, bump: 0 });
    expect(slopeLook(NOVA_LAP, kartAt(...STAIRS, DOWNHILL.east)).squash).toBeCloseTo(1);
    expect(slopeLook(NOVA_LAP, kartAt(...STAIRS, DOWNHILL.south, 200, 10))).toEqual({ squash: 1, bump: 0 });
  });

  it("jolts on the stairs while it moves, never higher than a step, and not at all standing still", () => {
    const bumps = [];
    for (let i = 0; i < 40; i++) {
      const kart = { ...kartAt(...STAIRS, DOWNHILL.south, 200), y: (63 + i * 0.15) * tile };
      bumps.push(slopeLook(NOVA_LAP, kart).bump);
    }
    expect(Math.max(...bumps)).toBeGreaterThan(STEP_BUMP / 2);
    expect(Math.max(...bumps)).toBeLessThanOrEqual(STEP_BUMP);
    expect(Math.min(...bumps)).toBeGreaterThanOrEqual(0);
    expect(slopeLook(NOVA_LAP, kartAt(...STAIRS, DOWNHILL.south, 0)).bump).toBe(0);
  });

  it("does not jolt on the gentle path: it is a slope, not stairs", () => {
    expect(slopeLook(NOVA_LAP, kartAt(...PATH, DOWNHILL.west, 200)).bump).toBe(0);
  });

  it("looks the same every time for the same kart, so the picture never flickers", () => {
    const kart = kartAt(...STAIRS, 1.2, 180);
    expect(slopeLook(NOVA_LAP, kart)).toEqual(slopeLook(NOVA_LAP, kart));
  });

  it("does not break on a kart without a speed (an older update)", () => {
    const kart = { x: kartAt(...STAIRS, 0).x, y: kartAt(...STAIRS, 0).y, angle: DOWNHILL.south };
    expect(slopeLook(NOVA_LAP, kart).bump).toBe(0);
  });
});
