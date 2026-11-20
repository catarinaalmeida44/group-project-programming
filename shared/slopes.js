// Slopes: parts of a track that go downhill one way (and so uphill the other).
//
// The game is flat: the ground is drawn flat and nothing has a height. A
// slope only changes how a kart drives there, so that going down feels
// fast and going up feels slow. (Added on 19-20 November 2026, at the
// team's request, for the wide stairs and the path past the beach tunnel on
// the Nova lap.)
//
// A track can list slopes (track.js checks them). Each one is a rectangle of
// squares, the direction that is DOWNHILL ("north", "south", "east" or
// "west"), and how steep it is, from just above 0 (hardly) to 1 (as steep as
// the stairs).
//
// ON A SLOPE, TWO THINGS CHANGE
// 1. The top speed (slopeShare). Pointing straight downhill, a kart's top
//    speed is higher by SLOPE_TOP_SPEED times the steepness; pointing
//    straight uphill, lower by as much; across the slope, unchanged; and in
//    between, a share of it. race.js hands this to the driving rules as a
//    "boost" on the ground, the same way the extra speed after a ramp is.
// 2. A pull downhill (pullDownhill). Every step the kart gains a little
//    speed in the downhill direction, whichever way it points. So a kart
//    going up without gas slows down faster than on the flat. A kart that
//    stops on a steep slope (the stairs) rolls down; on a gentle one it
//    stays put, because the pull is weaker than the friction that slows a
//    coasting kart (COAST_SLOWDOWN in physics.js), as a real kart would.
//
// A kart in the air (ramps.js) is not on the slope: nothing here touches it.
// Nor does a slope ever touch a kart's laps or clock.
//
// The browser and the server both use this file, so a race online and a
// race in practice go up and down the same way.

import { STEP_SECONDS } from "./physics.js";

// ---------------------------------------------------------------------------
// NUMBERS TO TUNE BY PLAYTESTING
// ---------------------------------------------------------------------------

/** On the steepest slope (1), pointing straight down, the top speed is this share higher (and pointing up, this share lower). */
export const SLOPE_TOP_SPEED = 0.25;
/** On the steepest slope (1), the speed gained each second in the downhill direction, in units per second. */
export const SLOPE_PULL = 160;

// ---------------------------------------------------------------------------

/** The downhill direction of each name, as an angle (0 is east, and y grows southwards, as everywhere in the rules). */
export const DOWNHILL = Object.freeze({ east: 0, south: Math.PI / 2, west: Math.PI, north: -Math.PI / 2 });

/**
 * Reads the slopes of a track description and gives back the list the
 * rules use. Refuses, with a clear error, anything that is not a proper
 * slope. "insideMap(column, row)" says whether a square is on the map.
 */
export function readSlopes(slopes, tileSize, insideMap) {
  if (slopes === undefined) {
    return [];
  }
  if (!Array.isArray(slopes)) {
    throw new Error("Track: slopes must be a list");
  }
  return slopes.map((slope, number) => {
    const { column, row, columns, rows, downhill, steepness } = slope ?? {};
    const whole = (value) => Number.isInteger(value);
    if (!whole(column) || !whole(row) || !whole(columns) || !whole(rows) || columns < 1 || rows < 1) {
      throw new Error(`Track: slope ${number} needs a column, a row, and how many columns and rows it covers`);
    }
    if (!insideMap(column, row) || !insideMap(column + columns - 1, row + rows - 1)) {
      throw new Error(`Track: slope ${number} must be inside the map`);
    }
    if (!Object.hasOwn(DOWNHILL, downhill)) {
      throw new Error(`Track: slope ${number} needs the direction that is downhill: north, south, east or west`);
    }
    if (typeof steepness !== "number" || !(steepness > 0) || !(steepness <= 1)) {
      throw new Error(`Track: slope ${number} needs a steepness above 0 and at most 1`);
    }
    return Object.freeze({
      name: typeof slope.name === "string" ? slope.name : `slope ${number}`,
      angle: DOWNHILL[downhill],
      steepness,
      left: column * tileSize,
      top: row * tileSize,
      right: (column + columns) * tileSize,
      bottom: (row + rows) * tileSize,
    });
  });
}

/** The slope under a spot of the track, or null on the flat. */
export function slopeAt(track, x, y) {
  for (const slope of track.slopes ?? []) {
    if (x >= slope.left && x < slope.right && y >= slope.top && y < slope.bottom) {
      return slope;
    }
  }
  return null;
}

/**
 * How far a direction points downhill on a slope: 1 straight down, -1
 * straight up, 0 across, multiplied by how steep the slope is. 0 on the
 * flat (no slope).
 */
export function downhillShare(slope, angle) {
  return slope === null ? 0 : slope.steepness * Math.cos(angle - slope.angle);
}

/** The number a kart's top speed is multiplied by on this slope, pointing this way. 1 on the flat. */
export function slopeShare(slope, angle) {
  return 1 + SLOPE_TOP_SPEED * downhillShare(slope, angle);
}

/** A kart one step later with the pull of the slope added to its speed. On the flat it is the same kart. */
export function pullDownhill(kart, slope) {
  if (slope === null) {
    return kart;
  }
  const gain = SLOPE_PULL * slope.steepness * STEP_SECONDS;
  return { ...kart, vx: kart.vx + Math.cos(slope.angle) * gain, vy: kart.vy + Math.sin(slope.angle) * gain };
}
