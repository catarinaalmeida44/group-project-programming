// Buildings that stand up in the view behind the kart.
//
// The driving rules know nothing about height: a wall is a wall. This file is
// only about the picture. A track can come with the number of storeys of each
// square (for example shared/tracks/campus-loop-storeys.js). Every wall square
// with storeys becomes a block: upright sides and a flat roof. They are placed
// on the screen with the same camera arithmetic that stands the karts up
// (chasePoint in camera.js): further ahead means higher up and smaller.
//
// Two steps:
//   createBuildings(track, storeys)  once, when the page opens: checks the
//                                    storeys and lists every side and roof
//   buildingsInView(buildings, kart) for every picture: the sides and roofs
//                                    that can be seen, as shapes on the screen,
//                                    each with how far ahead it is, so that
//                                    draw.js can paint the furthest first
//
// Nothing here paints. That is draw.js.

import { CHASE, SCREEN, chaseNumbers, chaseRow, chasePoint, seenFromKart } from "./camera.js";

/**
 * Checks the storeys of a track and lists the sides and roofs of its buildings,
 * in units. Gives null for a track without storeys (such as the test oval), so
 * that its walls stay flat. Stops with an error that says what is wrong if the
 * storeys do not fit the track.
 */
export function createBuildings(track, storeys) {
  if (storeys === null || storeys === undefined) {
    return null;
  }
  const { storeyMetres, squareMetres, rows } = storeys;
  if (!isPositiveNumber(storeyMetres) || !isPositiveNumber(squareMetres)) {
    throw new Error("Buildings: storeyMetres and squareMetres must be numbers above zero");
  }
  if (!Array.isArray(rows) || rows.length !== track.rows) {
    throw new Error(`Buildings: there must be one row of storeys for each of the ${track.rows} rows of the map`);
  }
  rows.forEach((row, r) => {
    if (typeof row !== "string" || row.length !== track.columns) {
      throw new Error(`Buildings: row ${r} of the storeys is not as long as the map`);
    }
    for (let c = 0; c < row.length; c++) {
      if (!/^[0-9]$/.test(row[c])) {
        throw new Error(`Buildings: row ${r} has "${row[c]}", which is not a number of storeys from 0 to 9`);
      }
      if (row[c] !== "0" && track.map[r][c] !== "#") {
        throw new Error(`Buildings: row ${r}, column ${c} has storeys but is not a wall`);
      }
    }
  });

  const size = track.tileSize;
  const unitsPerStorey = (storeyMetres / squareMetres) * size;
  // Height in units of a square. Outside the map counts as flat.
  const heightAt = (c, r) =>
    r < 0 || c < 0 || r >= track.rows || c >= track.columns ? 0 : Number(rows[r][c]) * unitsPerStorey;

  const sides = [];
  const roofs = [];
  for (let r = 0; r < track.rows; r++) {
    for (let c = 0; c < track.columns; c++) {
      const height = heightAt(c, r);
      if (height === 0) {
        continue;
      }
      const left = c * size;
      const right = (c + 1) * size;
      const top = r * size;
      const bottom = (r + 1) * size;
      roofs.push({
        corners: [[left, top], [right, top], [right, bottom], [left, bottom]],
        middle: [left + size / 2, top + size / 2],
        height,
      });
      // A side stands wherever the square next door is lower. It goes from
      // the height of that neighbour up to the height of this square.
      // "outward" is the direction the side faces, on the map.
      const neighbours = [
        { facing: "north", from: [left, top], to: [right, top], outward: [0, -1], below: heightAt(c, r - 1) },
        { facing: "east", from: [right, top], to: [right, bottom], outward: [1, 0], below: heightAt(c + 1, r) },
        { facing: "south", from: [right, bottom], to: [left, bottom], outward: [0, 1], below: heightAt(c, r + 1) },
        { facing: "west", from: [left, bottom], to: [left, top], outward: [-1, 0], below: heightAt(c - 1, r) },
      ];
      for (const { facing, from, to, outward, below } of neighbours) {
        if (below < height) {
          sides.push({ facing, from, to, outward, bottom: below, top: height });
        }
      }
    }
  }
  return { unitsPerStorey, sides, roofs };
}

/**
 * The sides and roofs that can be seen from behind this kart, as shapes on the
 * screen: { kind: "side" or "roof", facing, ahead, points }. "points" are the
 * corners on the screen, in pixels. "ahead" is how far ahead of the kart the
 * piece is, so the furthest can be painted first and nearer ones cover it.
 * Gives an empty list when there are no buildings.
 */
export function buildingsInView(buildings, kart, settings = CHASE, screen = SCREEN) {
  if (buildings === null) {
    return [];
  }
  const { depth } = chaseNumbers(settings);
  // The camera's eye is this far behind the kart: there, things would be
  // drawn without end. A side is only seen if it faces the eye.
  const eyeAhead = -depth / settings.kartScale;
  const eye = { x: kart.x + eyeAhead * Math.cos(kart.angle), y: kart.y + eyeAhead * Math.sin(kart.angle) };
  // Ground nearer than the bottom row of the screen, or further than the top
  // row, is not on the screen. Pieces there are cut off or left out.
  const near = chaseRow(screen.height, settings).ahead;
  const far = settings.viewAhead;
  const onScreen = (points) =>
    points.some(([x]) => x >= 0) && points.some(([x]) => x <= screen.width) && points.some(([, y]) => y <= screen.height);

  const shapes = [];
  for (const side of buildings.sides) {
    const towardsEye = (eye.x - side.from[0]) * side.outward[0] + (eye.y - side.from[1]) * side.outward[1];
    if (towardsEye <= 0) {
      continue; // it faces away from the camera, so the roof and the other sides hide it
    }
    let a = seenFromKart(kart, side.from[0], side.from[1]);
    let b = seenFromKart(kart, side.to[0], side.to[1]);
    if ((a.ahead < near && b.ahead < near) || (a.ahead > far && b.ahead > far)) {
      continue;
    }
    if (a.ahead < near) {
      a = cutAt(a, b, near);
    } else if (b.ahead < near) {
      b = cutAt(b, a, near);
    }
    const pa = chasePoint(a.ahead, a.sideways, settings, screen);
    const pb = chasePoint(b.ahead, b.sideways, settings, screen);
    if (pa === null || pb === null) {
      continue;
    }
    const points = [
      [pa.x, pa.y - side.bottom * pa.scale],
      [pb.x, pb.y - side.bottom * pb.scale],
      [pb.x, pb.y - side.top * pb.scale],
      [pa.x, pa.y - side.top * pa.scale],
    ];
    if (onScreen(points)) {
      shapes.push({ kind: "side", facing: side.facing, ahead: (a.ahead + b.ahead) / 2, points });
    }
  }

  for (const roof of buildings.roofs) {
    const corners = keepAhead(
      roof.corners.map(([x, y]) => seenFromKart(kart, x, y)),
      near,
    );
    if (corners.length < 3 || corners.every((corner) => corner.ahead > far)) {
      continue;
    }
    const points = [];
    for (const corner of corners) {
      const spot = chasePoint(corner.ahead, corner.sideways, settings, screen);
      if (spot === null) {
        break;
      }
      points.push([spot.x, spot.y - roof.height * spot.scale]);
    }
    if (points.length === corners.length && onScreen(points)) {
      const middle = seenFromKart(kart, roof.middle[0], roof.middle[1]);
      shapes.push({ kind: "roof", facing: "up", ahead: middle.ahead, points });
    }
  }
  return shapes;
}

function isPositiveNumber(value) {
  return typeof value === "number" && value > 0 && Number.isFinite(value);
}

/** The point on the line from "inside" to "outside" that is exactly "ahead" units ahead of the kart. */
function cutAt(outside, inside, ahead) {
  const share = (ahead - outside.ahead) / (inside.ahead - outside.ahead);
  return { ahead, sideways: outside.sideways + share * (inside.sideways - outside.sideways) };
}

/** Cuts a flat shape (a list of corners seen from the kart) so that nothing is nearer than "near". */
function keepAhead(corners, near) {
  const kept = [];
  for (let i = 0; i < corners.length; i++) {
    const here = corners[i];
    const next = corners[(i + 1) % corners.length];
    if (here.ahead >= near) {
      kept.push(here);
    }
    if (here.ahead >= near !== next.ahead >= near) {
      kept.push(here.ahead < near ? cutAt(here, next, near) : cutAt(next, here, near));
    }
  }
  return kept;
}
