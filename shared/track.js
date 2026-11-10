// A track: the ground the karts drive on.
//
// A track is drawn with letters, one letter for each square of ground.
// A square is called a "tile".
//
//     #   wall   (karts bounce off it)
//     .   road
//     ,   grass  (slower)
//
// A track also has:
//   - a start position
//   - checkpoints: invisible rectangles across the road. The first one is the
//     finish line. A lap only counts if the kart went through all of them,
//     in order (see laps.js).
//
// This file checks that a track is drawn correctly, answers "what is the
// ground at this spot?", and makes karts bounce off walls.

import { clamp } from "./numbers.js";
import { ROAD, GRASS } from "./surfaces.js";

const TILE_KINDS = { "#": "wall", ".": "road", ",": "grass" };

/** A head-on hit sends the kart back at this share of its speed. */
export const WALL_BOUNCE = 0.5;

/**
 * Checks a track description and turns it into a track the game can use.
 * Stops with an error that says what is wrong if the description is bad.
 * Positions in the description are in tiles; the track that comes out uses
 * units (pixels), like the karts.
 */
export function createTrack(description) {
  const { name, tileSize, laps, map, start, checkpoints } = description;

  if (typeof tileSize !== "number" || !(tileSize > 0)) {
    throw new Error("Track: tileSize must be a number above zero");
  }
  if (!Number.isInteger(laps) || laps < 1) {
    throw new Error("Track: laps must be a whole number, 1 or more");
  }
  if (!Array.isArray(map) || map.length === 0 || typeof map[0] !== "string" || map[0] === "") {
    throw new Error("Track: map must be a list of rows of letters");
  }
  const columns = map[0].length;
  map.forEach((row, rowNumber) => {
    if (typeof row !== "string" || row.length !== columns) {
      throw new Error(`Track: row ${rowNumber} of the map is not as long as row 0`);
    }
    for (const letter of row) {
      if (!(letter in TILE_KINDS)) {
        throw new Error(`Track: row ${rowNumber} of the map has an unknown letter "${letter}"`);
      }
    }
  });

  const track = {
    name,
    tileSize,
    laps,
    map,
    columns,
    rows: map.length,
    width: columns * tileSize,
    height: map.length * tileSize,
  };

  // The start position: the middle of the start tile.
  if (!start || !isTileInside(track, start.column, start.row)) {
    throw new Error("Track: the start must be on a tile inside the map");
  }
  if (typeof start.angle !== "number" || Number.isNaN(start.angle)) {
    throw new Error("Track: the start needs an angle (the direction the kart points)");
  }
  track.start = {
    x: (start.column + 0.5) * tileSize,
    y: (start.row + 0.5) * tileSize,
    angle: start.angle,
  };
  if (tileKindAt(track, track.start.x, track.start.y) === "wall") {
    throw new Error("Track: the start is inside a wall");
  }

  // The checkpoints. The first one is the finish line. With fewer than three,
  // a kart could go a little way, turn round and come back to complete a "lap".
  if (!Array.isArray(checkpoints) || checkpoints.length < 3) {
    throw new Error("Track: there must be a finish line and at least two more checkpoints");
  }
  track.checkpoints = checkpoints.map((checkpoint, number) => {
    const { column, row, columns: wide, rows: tall } = checkpoint;
    const lastColumn = column + wide - 1;
    const lastRow = row + tall - 1;
    if (
      !Number.isInteger(wide) ||
      !Number.isInteger(tall) ||
      wide < 1 ||
      tall < 1 ||
      !isTileInside(track, column, row) ||
      !isTileInside(track, lastColumn, lastRow)
    ) {
      throw new Error(`Track: checkpoint ${number} does not fit inside the map`);
    }
    let hasOpenGround = false;
    for (let r = row; r <= lastRow; r++) {
      for (let c = column; c <= lastColumn; c++) {
        if (map[r][c] !== "#") {
          hasOpenGround = true;
        }
      }
    }
    if (!hasOpenGround) {
      throw new Error(`Track: checkpoint ${number} is entirely inside walls, so no kart can reach it`);
    }
    return {
      name: checkpoint.name,
      left: column * tileSize,
      top: row * tileSize,
      right: (lastColumn + 1) * tileSize,
      bottom: (lastRow + 1) * tileSize,
    };
  });

  return track;
}

function isTileInside(track, column, row) {
  return (
    Number.isInteger(column) &&
    Number.isInteger(row) &&
    column >= 0 &&
    row >= 0 &&
    column < track.columns &&
    row < track.rows
  );
}

/** The kind of tile in a column and row: "wall", "road" or "grass". Outside the map is wall. */
function tileKind(track, column, row) {
  if (column < 0 || row < 0 || column >= track.columns || row >= track.rows) {
    return "wall";
  }
  return TILE_KINDS[track.map[row][column]];
}

/** The kind of ground at a position: "wall", "road" or "grass". Outside the map is wall. */
export function tileKindAt(track, x, y) {
  return tileKind(track, Math.floor(x / track.tileSize), Math.floor(y / track.tileSize));
}

/** The ground the driving rules should use at a position (see surfaces.js). */
export function surfaceAt(track, x, y) {
  return tileKindAt(track, x, y) === "grass" ? GRASS : ROAD;
}

/** Is this position inside checkpoint number "number"? (Number 0 is the finish line.) */
export function isInsideCheckpoint(track, number, x, y) {
  const checkpoint = track.checkpoints[number];
  return (
    checkpoint !== undefined &&
    x >= checkpoint.left &&
    x < checkpoint.right &&
    y >= checkpoint.top &&
    y < checkpoint.bottom
  );
}

/**
 * Keeps a kart out of the walls. The kart is treated as a circle.
 * If the circle overlaps a wall, the kart is pushed back out and bounces:
 *   - the part of its speed going INTO the wall is turned round and halved
 *   - the part of its speed going ALONG the wall is kept
 * So a head-on hit sends the kart back at half speed, and a scrape along a
 * wall costs very little. Gives back a new kart; the one given is not changed.
 */
export function bounceOffWalls(track, kart, radius) {
  let { x, y, vx, vy } = kart;
  let touched = false;

  // A kart can touch more than one wall at once (in a corner), so look
  // again after each push. Four looks are plenty.
  for (let look = 0; look < 4; look++) {
    const hit = deepestWallHit(track, x, y, radius);
    if (hit === null) {
      break;
    }
    touched = true;

    // Push the kart straight out of the wall.
    x += hit.awayX * hit.depth;
    y += hit.awayY * hit.depth;

    // "intoWall" is negative when the kart is moving into the wall.
    const intoWall = vx * hit.awayX + vy * hit.awayY;
    if (intoWall < 0) {
      vx -= (1 + WALL_BOUNCE) * intoWall * hit.awayX;
      vy -= (1 + WALL_BOUNCE) * intoWall * hit.awayY;
    }
  }

  return touched ? { ...kart, x, y, vx, vy } : kart;
}

/**
 * Finds the wall tile that a circle overlaps the most.
 * Gives { awayX, awayY, depth }: the direction that leads straight out of the
 * wall, and how far the circle has to move to be clear of it. Gives null if
 * the circle touches no wall.
 */
function deepestWallHit(track, x, y, radius) {
  const size = track.tileSize;
  const firstColumn = Math.floor((x - radius) / size);
  const lastColumn = Math.floor((x + radius) / size);
  const firstRow = Math.floor((y - radius) / size);
  const lastRow = Math.floor((y + radius) / size);

  let deepest = null;
  for (let row = firstRow; row <= lastRow; row++) {
    for (let column = firstColumn; column <= lastColumn; column++) {
      if (tileKind(track, column, row) !== "wall") {
        continue;
      }
      const left = column * size;
      const top = row * size;

      // The point of this wall tile that is closest to the middle of the circle.
      const nearX = clamp(x, left, left + size);
      const nearY = clamp(y, top, top + size);
      const distance = Math.hypot(x - nearX, y - nearY);
      if (distance >= radius) {
        continue; // not touching this tile
      }

      let hit;
      if (distance > 0) {
        hit = {
          awayX: (x - nearX) / distance,
          awayY: (y - nearY) / distance,
          depth: radius - distance,
        };
      } else {
        // The middle of the kart is inside the wall tile itself. This should
        // not happen at driving speeds; it is a safety net.
        hit = wayOutOfTile(track, column, row, x, y, radius);
      }
      if (deepest === null || hit.depth > deepest.depth) {
        deepest = hit;
      }
    }
  }
  return deepest;
}

/** For a kart whose middle is inside a wall tile: the shortest way out, towards open ground if there is any. */
function wayOutOfTile(track, column, row, x, y, radius) {
  const size = track.tileSize;
  const left = column * size;
  const top = row * size;
  const ways = [
    { awayX: -1, awayY: 0, depth: x - left + radius, open: tileKind(track, column - 1, row) !== "wall" },
    { awayX: 1, awayY: 0, depth: left + size - x + radius, open: tileKind(track, column + 1, row) !== "wall" },
    { awayX: 0, awayY: -1, depth: y - top + radius, open: tileKind(track, column, row - 1) !== "wall" },
    { awayX: 0, awayY: 1, depth: top + size - y + radius, open: tileKind(track, column, row + 1) !== "wall" },
  ];
  const openWays = ways.filter((way) => way.open);
  const candidates = openWays.length > 0 ? openWays : ways;
  return candidates.reduce((best, way) => (way.depth < best.depth ? way : best));
}
