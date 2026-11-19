// Tests for the shore past the south edge of a map (client/shore.js), and the
// beach and sea of the Nova lap (client/nova-lap-look.js).

import { describe, it, expect } from "vitest";
import { rowOnMap, spanFrom, shoreBands } from "../client/shore.js";
import { NOVA_LAP_LOOK, NOVA_LAP_UNITS_PER_METRE } from "../client/nova-lap-look.js";
import { NOVA_LAP } from "../shared/tracks/nova-lap.js";
import { lookOfTrack } from "../client/track-looks.js";
import { TRACKS } from "../shared/tracks/index.js";

const WIDTH = 960;

/**
 * Where a spot of the map lands on the screen in ground.js, worked out the
 * way ground.js lays the picture under a row: x = a*u + c*v + e for a
 * picture pixel (u, v), with one pixel per unit here. Gives the x on the row
 * that shows the spot, or null if the spot is not on that row.
 */
function screenXOf(spot, camera) {
  const { along, across, ahead, scale, cos, sin } = camera;
  const onThisRow = Math.abs(spot.x * cos + spot.y * sin - (along + ahead)) < 1e-6;
  if (!onThisRow) {
    return null;
  }
  return -scale * sin * spot.x + scale * cos * spot.y + WIDTH / 2 + scale * across;
}

/** A camera looking in a direction, from a spot: the numbers ground.js works with. */
function cameraAt(x, y, angle, ahead = 400, scale = 0.8) {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return { along: x * cos + y * sin, across: x * sin - y * cos, ahead, scale, cos, sin, width: WIDTH };
}

describe("where a row of the race view lies on the map", () => {
  it("agrees with the way ground.js lays the map under the row, in every direction", () => {
    for (const angle of [0, 0.4, 1.57, 2.5, 3.14, 4.0, 4.71, 5.9]) {
      const camera = cameraAt(1200, 2600, angle);
      const row = rowOnMap(camera);
      // Take spots along the row's line of ground and check where they land.
      for (const sideways of [-300, -50, 0, 120, 400]) {
        const forward = camera.along + camera.ahead;
        const spot = {
          x: forward * camera.cos + sideways * camera.sin,
          y: forward * camera.sin - sideways * camera.cos,
        };
        const x = screenXOf(spot, camera);
        expect(row.atLeft + row.perPixel * x, `angle ${angle}`).toBeCloseTo(spot.y, 6);
      }
    }
  });
});

describe("the part of a row past a line", () => {
  it("is the right-hand part when the ground lies further down the map to the right", () => {
    const row = { atLeft: 0, perPixel: 1 }; // 0 units down the map at the left, 960 at the right
    expect(spanFrom(row, 300, WIDTH)).toEqual({ x: 300, length: 660 });
  });

  it("is the left-hand part when the ground lies further down the map to the left", () => {
    const row = { atLeft: 960, perPixel: -1 };
    expect(spanFrom(row, 300, WIDTH)).toEqual({ x: 0, length: 660 });
  });

  it("is the whole row when all of it is past the line, and nothing when none of it is", () => {
    expect(spanFrom({ atLeft: 5000, perPixel: 0.5 }, 300, WIDTH)).toEqual({ x: 0, length: WIDTH });
    expect(spanFrom({ atLeft: 0, perPixel: 0.1 }, 300, WIDTH)).toBe(null); // reaches only 96 at the right
    expect(spanFrom({ atLeft: 400, perPixel: 0 }, 300, WIDTH)).toEqual({ x: 0, length: WIDTH }); // looking straight along the shore
    expect(spanFrom({ atLeft: 200, perPixel: 0 }, 300, WIDTH)).toBe(null);
  });

  it("never reaches outside the screen", () => {
    for (const row of [{ atLeft: -1e6, perPixel: 5000 }, { atLeft: 1e6, perPixel: -5000 }, { atLeft: 1e6, perPixel: -1 }, { atLeft: 299, perPixel: 1e-9 }]) {
      const span = spanFrom(row, 300, WIDTH);
      if (span !== null) {
        expect(span.x).toBeGreaterThanOrEqual(0);
        expect(span.x + span.length).toBeLessThanOrEqual(WIDTH);
      }
    }
  });
});

describe("the beach and sea of the Nova lap", () => {
  const shore = NOVA_LAP_LOOK.shore;
  const mapBottom = NOVA_LAP.rows * NOVA_LAP.tileSize;

  it("lies wholly past the bottom of the map: it can never cover ground a kart drives on", () => {
    for (const band of shore.bands) {
      expect(band.from).toBeGreaterThanOrEqual(mapBottom);
    }
  });

  it("goes from the land out: sand first, then the surf, then the water", () => {
    const bands = shoreBands(shore);
    expect(bands.map((band) => band.from)).toEqual(shore.bands.map((band) => band.from));
    expect(bands[0].water).not.toBe(true);
    expect(bands.at(-1).water).toBe(true);
    const firstWater = bands.findIndex((band) => band.water === true);
    expect(bands.slice(firstWater).every((band) => band.water === true)).toBe(true); // no sand out in the sea
  });

  it("has a beach of a believable width: 30 to 120 metres from the edge of the map to the water", () => {
    const water = shore.bands.find((band) => band.water === true);
    const metres = (water.from - mapBottom) / NOVA_LAP_UNITS_PER_METRE;
    expect(metres).toBeGreaterThanOrEqual(30);
    expect(metres).toBeLessThanOrEqual(120);
  });

  it("paints the far sea the same blue as the sea on the horizon", () => {
    const horizonSea = NOVA_LAP_LOOK.far.find((band) => band.kind === "sea");
    expect(shoreBands(shore).at(-1).colour).toBe(horizonSea.colour);
  });

  it("uses only real colours, and keeps the water over the haze from 0 to 1", () => {
    for (const band of shore.bands) {
      expect(band.colour).toMatch(/^#[0-9a-f]{6}$/i);
    }
    expect(shore.throughHaze).toBeGreaterThanOrEqual(0);
    expect(shore.throughHaze).toBeLessThanOrEqual(1);
  });

  it("does not change the order of the bands it was given", () => {
    const given = { bands: [{ from: 9, colour: "#000000" }, { from: 3, colour: "#ffffff" }] };
    shoreBands(given);
    expect(given.bands.map((band) => band.from)).toEqual([9, 3]);
  });

  it("is only on the Nova lap: the other tracks have no sea past their edge", () => {
    for (const [name, track] of Object.entries(TRACKS)) {
      expect(lookOfTrack(track).shore !== undefined, name).toBe(name === "nova-lap");
    }
  });
});
