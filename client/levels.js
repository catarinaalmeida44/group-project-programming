// Two levels of ground in the race view: the ground of the track, and a part
// that lies lower (on the Nova lap: the wide stairs, the lower plaza in front
// of the Grand Auditorium, and the path past the beach tunnel, which rises
// back up to the west). Only the picture: karts drive on it exactly as on
// any road (the rules in shared/ know nothing about it).
//
// A track's look can say "levels" (see nova-lap-look.js):
//   drop   how far below the ground the lowest part is, in metres
//   areas  rectangles of the map, [left, top, right, bottom] in squares, each
//          with how deep it is as a share of the drop: "from" at its first
//          edge and "to" at its last, along "x" (west to east) or "y" (north
//          to south), in "steps" equal steps. An area with no "along" is
//          flat, at "to".
//
// This file turns that into:
//   strips  flat pieces of ground, each at one depth: every step of the
//           stairs is one, the lower plaza is one. ground.js paints each at
//           its depth, the deepest first.
//   walls   the upright faces where two strips (or a strip and the ground
//           round it) meet at different depths: the front of every step,
//           and the stone walls round the sunken part. draw.js paints the
//           ones that face the camera.
// and answers "how deep is the ground here?" (depthAt), for the karts and
// everything else that stands on it.
//
// All depths are in units below the ground of the track: 0 is the ground,
// and a bigger number is deeper.

import { cutAtSquares } from "./scenery.js";

/**
 * Reads the levels of a look. Gives null when the look has none (every
 * track but the Nova lap). "unitsPerMetre" turns metres into units.
 * Refuses, with a clear error, levels that make no sense.
 */
export function readLevels(look, tileSize, unitsPerMetre) {
  const levels = look?.levels;
  if (levels === undefined || levels === null) {
    return null;
  }
  const { drop, areas } = levels;
  if (!(drop > 0) || !(unitsPerMetre > 0)) {
    throw new Error("Levels: the drop must be a number of metres above zero");
  }
  if (!Array.isArray(areas) || areas.length === 0) {
    throw new Error("Levels: there must be a list of areas");
  }
  const dropUnits = drop * unitsPerMetre;
  const strips = [];
  areas.forEach((area, number) => {
    const { rect, from = area.to, to, along, steps = 1 } = area ?? {};
    if (!Array.isArray(rect) || rect.length !== 4 || !rect.every(Number.isFinite) || !(rect[2] > rect[0]) || !(rect[3] > rect[1])) {
      throw new Error(`Levels: area ${number} needs a rectangle [left, top, right, bottom]`);
    }
    if (![from, to].every((share) => share >= 0 && share <= 1)) {
      throw new Error(`Levels: area ${number} needs depths from 0 to 1`);
    }
    if (along !== undefined && along !== "x" && along !== "y") {
      throw new Error(`Levels: area ${number} goes along "x" or "y", or is flat`);
    }
    if (!Number.isInteger(steps) || steps < 1) {
      throw new Error(`Levels: area ${number} needs a whole number of steps`);
    }
    const [left, top, right, bottom] = rect.map((squares) => squares * tileSize);
    if (along === undefined) {
      strips.push({ left, top, right, bottom, depth: to * dropUnits });
      return;
    }
    // Step i of n is at the depth the area reaches at the end of that step,
    // so the last step is exactly at "to", where the next area may begin.
    for (let i = 0; i < steps; i++) {
      const share = from + ((to - from) * (i + 1)) / steps;
      const depth = share * dropUnits;
      if (along === "x") {
        const width = (right - left) / steps;
        strips.push({ left: left + i * width, top, right: left + (i + 1) * width, bottom, depth });
      } else {
        const height = (bottom - top) / steps;
        strips.push({ left, top: top + i * height, right, bottom: top + (i + 1) * height, depth });
      }
    }
  });
  strips.sort((a, b) => b.depth - a.depth); // the deepest first: the order they are painted in
  return { drop: dropUnits, strips, walls: wallsOf(strips, tileSize / 2) };
}

/** How deep the ground is at a spot, in units: 0 outside the sunken part, or when there are no levels. */
export function depthAt(levels, x, y) {
  if (levels === null) {
    return 0;
  }
  for (const strip of levels.strips) {
    if (x >= strip.left && x < strip.right && y >= strip.top && y < strip.bottom) {
      return strip.depth;
    }
  }
  return 0;
}

/** The rectangle round all the strips, in units, or null when there are none. */
export function sunkenBounds(levels) {
  if (levels === null || levels.strips.length === 0) {
    return null;
  }
  return {
    left: Math.min(...levels.strips.map((strip) => strip.left)),
    top: Math.min(...levels.strips.map((strip) => strip.top)),
    right: Math.max(...levels.strips.map((strip) => strip.right)),
    bottom: Math.max(...levels.strips.map((strip) => strip.bottom)),
  };
}

/**
 * The upright faces where the ground changes depth. Each is a line on the
 * map from "a" to "b", with the depth of its top edge and of its bottom
 * edge, and "toward": the direction (a unit step on the map) from its line
 * towards the deeper side. That is the side the face looks at.
 *
 * Worked out on a fine grid ("cell" units), then the pieces in one line
 * with the same depths are joined into long faces.
 */
function wallsOf(strips, cell) {
  const levels = { strips };
  const bounds = sunkenBounds(levels);
  const columns = Math.round((bounds.right - bounds.left) / cell) + 2;
  const rows = Math.round((bounds.bottom - bounds.top) / cell) + 2;
  const x0 = bounds.left - cell;
  const y0 = bounds.top - cell;
  const depth = (column, row) => depthAt(levels, x0 + (column + 0.5) * cell, y0 + (row + 0.5) * cell);
  const pieces = [];
  for (let row = 0; row < rows; row++) {
    for (let column = 0; column < columns; column++) {
      const here = depth(column, row);
      // The edge with the square to the east, and with the square to the south.
      if (column + 1 < columns) {
        const east = depth(column + 1, row);
        if (east !== here) {
          const x = x0 + (column + 1) * cell;
          pieces.push({ a: { x, y: y0 + row * cell }, b: { x, y: y0 + (row + 1) * cell }, top: Math.min(here, east), bottom: Math.max(here, east), toward: { x: east > here ? 1 : -1, y: 0 } });
        }
      }
      if (row + 1 < rows) {
        const south = depth(column, row + 1);
        if (south !== here) {
          const y = y0 + (row + 1) * cell;
          pieces.push({ a: { x: x0 + column * cell, y }, b: { x: x0 + (column + 1) * cell, y }, top: Math.min(here, south), bottom: Math.max(here, south), toward: { x: 0, y: south > here ? 1 : -1 } });
        }
      }
    }
  }
  return joined(pieces);
}

/** Joins pieces that continue each other in one line, with the same depths and facing the same way. */
function joined(pieces) {
  const key = (piece) => `${piece.toward.x},${piece.toward.y},${piece.top},${piece.bottom},${piece.toward.x !== 0 ? piece.a.x : piece.a.y}`;
  const groups = new Map();
  for (const piece of pieces) {
    const k = key(piece);
    if (!groups.has(k)) {
      groups.set(k, []);
    }
    groups.get(k).push(piece);
  }
  const walls = [];
  for (const group of groups.values()) {
    const vertical = group[0].toward.x !== 0; // the line runs north to south
    group.sort((p, q) => (vertical ? p.a.y - q.a.y : p.a.x - q.a.x));
    let current = { ...group[0] };
    for (const piece of group.slice(1)) {
      const touches = vertical ? Math.abs(piece.a.y - current.b.y) < 1e-6 : Math.abs(piece.a.x - current.b.x) < 1e-6;
      if (touches) {
        current = { ...current, b: piece.b };
      } else {
        walls.push(current);
        current = { ...piece };
      }
    }
    walls.push(current);
  }
  return walls;
}

/**
 * Sorts the scenery of a track (its blocks and fences, scenery.js) by the
 * level each piece stands on, so that draw.js can draw each group at its
 * own depth. "rules" come from the look's levels ("scenery" there), one per
 * piece that does not stand on the ground of the track, found by its name:
 *   { name, depth }   it stands this share of the drop down (1: at the bottom)
 *   { name, follow }  a fence that stands on the ground along its line,
 *                     whatever its depth there: it is cut at the squares, and
 *                     each piece stands on the ground found "follow" squares
 *                     to one side of it, [x, y] (a railing on the edge of a
 *                     path follows the path, not the drop beside it)
 * Gives [{ depth, blocks, fences }], the ground of the track (depth 0)
 * first. A rule whose name matches no piece is refused: a typing mistake
 * would otherwise go unnoticed.
 */
export function sceneryByLevel(blocks, fences, rules, levels, tileSize) {
  const groups = new Map([[0, { depth: 0, blocks: [], fences: [] }]]);
  const groupAt = (depth) => {
    if (!groups.has(depth)) {
      groups.set(depth, { depth, blocks: [], fences: [] });
    }
    return groups.get(depth);
  };
  const byName = new Map((levels === null ? [] : (rules ?? [])).map((rule) => [rule.name, rule]));
  const used = new Set();
  for (const block of blocks) {
    const rule = byName.get(block.name);
    if (rule === undefined) {
      groupAt(0).blocks.push(block);
      continue;
    }
    used.add(rule.name);
    groupAt(ruleDepth(rule, levels)).blocks.push(block);
  }
  for (const fence of fences) {
    const rule = byName.get(fence.name);
    if (rule === undefined) {
      groupAt(0).fences.push(fence);
      continue;
    }
    used.add(rule.name);
    if (rule.follow === undefined) {
      groupAt(ruleDepth(rule, levels)).fences.push(fence);
      continue;
    }
    cutAtSquares(fence.from, fence.to).forEach((piece, number) => {
      const middle = [(piece.a[0] + piece.b[0]) / 2 + rule.follow[0], (piece.a[1] + piece.b[1]) / 2 + rule.follow[1]];
      const depth = depthAt(levels, middle[0] * tileSize, middle[1] * tileSize);
      groupAt(depth).fences.push({ ...fence, name: `${fence.name}, piece ${number + 1}`, from: piece.a, to: piece.b });
    });
  }
  for (const name of byName.keys()) {
    if (!used.has(name)) {
      throw new Error(`Levels: there is no scenery called "${name}"`);
    }
  }
  return [...groups.values()];
}

function ruleDepth(rule, levels) {
  if (!(rule.depth >= 0 && rule.depth <= 1)) {
    throw new Error(`Levels: "${rule.name}" needs a depth from 0 to 1, or "follow"`);
  }
  return rule.depth * levels.drop;
}

/** Does this face look towards a point on the map (the camera's eye)? Only those are painted. */
export function faces(wall, point) {
  return (point.x - wall.a.x) * wall.toward.x + (point.y - wall.a.y) * wall.toward.y > 0;
}
