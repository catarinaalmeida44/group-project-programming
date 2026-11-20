// Tests for client/stairs-bump.js: a kart jolting on the stairs of the Nova
// lap, in the race view. Only the picture: the driving on the stairs is the
// same as on any road, which the last test checks.

import { describe, it, expect } from "vitest";
import { stairsBump, onStairs, STEP_BUMP } from "../client/stairs-bump.js";
import { lookOfTrack } from "../client/track-looks.js";
import { NOVA_LAP } from "../shared/tracks/nova-lap.js";
import { TEST_OVAL } from "../shared/tracks/test-oval.js";
import { surfaceAt } from "../shared/track.js";
import { ROAD } from "../shared/surfaces.js";

const STAIRS = lookOfTrack(NOVA_LAP).stairs;
const TILE = NOVA_LAP.tileSize;
/** A kart on the Nova lap at a square (it may be a fraction), moving south at "speed". */
const kartAt = (column, row, speed = 200, air = 0) => ({ x: column * TILE, y: row * TILE, vx: 0, vy: speed, air });

describe("the stairs of the Nova lap", () => {
  it("are the wide stairs from the promenade down to the lower plaza", () => {
    expect(onStairs(STAIRS, TILE, 67.5 * TILE, 65.5 * TILE)).toBe(true);
    expect(onStairs(STAIRS, TILE, 64 * TILE, 63 * TILE)).toBe(true); //    the top left corner
    expect(onStairs(STAIRS, TILE, 71 * TILE, 65 * TILE)).toBe(false); //   just past the right edge
    expect(onStairs(STAIRS, TILE, 67 * TILE, 50 * TILE)).toBe(false); //   the promenade
    expect(onStairs(STAIRS, TILE, 67 * TILE, 72 * TILE)).toBe(false); //   the lower plaza
  });

  it("are on the Nova lap only: other tracks have none", () => {
    expect(lookOfTrack(TEST_OVAL).stairs).toBeUndefined();
    expect(onStairs(undefined, 32, 100, 100)).toBe(false);
  });
});

describe("a kart going over the stairs", () => {
  it("jolts up and down as it moves down them, never higher than a step", () => {
    const bumps = [];
    for (let i = 0; i <= 60; i++) {
      bumps.push(stairsBump(STAIRS, TILE, kartAt(67.5, 63 + i * 0.1)));
    }
    expect(Math.max(...bumps)).toBeGreaterThan(STEP_BUMP / 2);
    expect(Math.max(...bumps)).toBeLessThanOrEqual(STEP_BUMP);
    expect(Math.min(...bumps)).toBeGreaterThanOrEqual(0);
    // It goes up and down again many times: once per step, not once for the whole flight of stairs.
    const upsAndDowns = bumps.filter((bump, i) => i > 0 && bump > 0.5 && bumps[i - 1] <= 0.5).length;
    expect(upsAndDowns).toBeGreaterThan(5);
  });

  it("does not jolt standing still, off the stairs, or in the air", () => {
    expect(stairsBump(STAIRS, TILE, kartAt(67.5, 65.3, 0))).toBe(0);
    expect(stairsBump(STAIRS, TILE, kartAt(67.5, 55.3))).toBe(0);
    expect(stairsBump(STAIRS, TILE, kartAt(67.5, 65.3, 200, 12))).toBe(0);
  });

  it("jolts less when it goes slowly", () => {
    const slow = stairsBump(STAIRS, TILE, kartAt(67.5, 65.3, 40));
    const fast = stairsBump(STAIRS, TILE, kartAt(67.5, 65.3, 200));
    expect(slow).toBeLessThan(fast);
  });

  it("looks the same every time for the same kart, so the picture never flickers", () => {
    expect(stairsBump(STAIRS, TILE, kartAt(66.2, 64.7))).toBe(stairsBump(STAIRS, TILE, kartAt(66.2, 64.7)));
  });

  it("does not break on a kart without a speed (an older update)", () => {
    expect(stairsBump(STAIRS, TILE, { x: 67.5 * TILE, y: 65.5 * TILE })).toBe(0);
  });

  it("drives on the stairs exactly as on any road: they are only a picture", () => {
    expect(surfaceAt(NOVA_LAP, 67.5 * TILE, 65.5 * TILE)).toEqual(ROAD);
    expect(NOVA_LAP.slopes).toBeUndefined(); // no slopes in the rules, after the try of 20 November
  });
});
