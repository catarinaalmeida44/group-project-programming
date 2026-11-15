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

import { CHASE, SCREEN, chaseNumbers, chasePoint, seenFromKart } from "./camera.js";

/**
 * Checks the storeys of a track and lists the sides and roofs of its buildings,
 * in units. Gives null for a track without storeys (such as the test oval), so
 * that its walls stay flat. Stops with an error that says what is wrong if the
 * storeys do not fit the track.
 */
export function createBuildings(track, storeys, { barrierHeight = 0 } = {}) {
  const hasStoreys = storeys !== null && storeys !== undefined;
  if (!hasStoreys && !(barrierHeight > 0)) {
    return null;
  }
  let unitsPerStorey = 0;
  let rows = null;
  if (hasStoreys) {
    const { storeyMetres, squareMetres } = storeys;
    rows = storeys.rows;
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
    unitsPerStorey = (storeys.storeyMetres / storeys.squareMetres) * track.tileSize;
  }

  const size = track.tileSize;
  const inside = (c, r) => r >= 0 && c >= 0 && r < track.rows && c < track.columns;
  const isWall = (c, r) => inside(c, r) && track.map[r][c] === "#";
  const storeysAt = (c, r) => (rows !== null && inside(c, r) ? Number(rows[r][c]) : 0);
  // A wall without storeys that touches open ground is where a kart would
  // bounce off thin air. With a barrier height it becomes a low barrier
  // there, so the edge of the track can be seen. Walls further in stay flat.
  const touchesOpenGround = (c, r) =>
    [[0, -1], [0, 1], [-1, 0], [1, 0], [-1, -1], [1, -1], [-1, 1], [1, 1]].some(
      ([dc, dr]) => inside(c + dc, r + dr) && !isWall(c + dc, r + dr),
    );
  const isBarrier = (c, r) => barrierHeight > 0 && isWall(c, r) && storeysAt(c, r) === 0 && touchesOpenGround(c, r);
  // Height in units of a square. Outside the map counts as flat.
  const heightAt = (c, r) => {
    if (!inside(c, r)) {
      return 0;
    }
    return storeysAt(c, r) > 0 ? storeysAt(c, r) * unitsPerStorey : isBarrier(c, r) ? barrierHeight : 0;
  };

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
      // What draw.js needs to choose colours and paint windows: which square
      // this is, and whether it is a building or a low barrier.
      const about = { column: c, row: r, style: storeysAt(c, r) > 0 ? "building" : "barrier" };
      roofs.push({
        corners: [[left, top], [right, top], [right, bottom], [left, bottom]],
        middle: [left + size / 2, top + size / 2],
        height,
        ...about,
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
          sides.push({ facing, from, to, outward, bottom: below, top: height, ...about });
        }
      }
    }
  }
  return { unitsPerStorey, sides, roofs };
}

/**
 * Nothing is drawn larger than this many pixels for one unit of track. A
 * wall right beside the camera's eye would otherwise be drawn without end.
 */
const LARGEST_SCALE = 120;

/**
 * For deciding what hides the kart from the camera: how tall the kart is,
 * and half the width of the strip down its middle that must stay in view,
 * in units. The strip is narrower than the kart on purpose. A kart that
 * touches a wall has its middle 10 units from it, so a wall BESIDE the kart
 * is never taken for one that stands in the way.
 */
const KART_TALL = 10;
const KART_MIDDLE = 6;

/**
 * The sides and roofs that can be seen from behind this kart, as shapes on the
 * screen: { kind: "side" or "roof", facing, ahead, points }. "ahead" is how
 * far ahead of the kart the piece is, so the furthest can be painted first
 * and nearer ones cover it. Gives an empty list when there are no buildings.
 *
 * "points" is the outline to fill, in pixels, with nothing below the bottom
 * of the screen. A side also has "corners": its four true corners (foot,
 * foot, top, top), which may lie below the screen. draw.js uses them to put
 * the windows at the right heights.
 *
 * HOW NEAR A PIECE IS STILL SHOWN
 * A wall beside the camera is seen long after the ground at its foot has
 * left the bottom of the screen: the taller the wall, the longer. So each
 * piece is cut where its TOP leaves the screen, not where its foot does.
 * (Cutting every wall at its foot made buildings beside the kart end early,
 * with a gap between the wall and the edge of the screen.)
 *
 * WHAT IS LEFT OUT
 * A wall between the camera and the kart that is tall enough to hide the
 * kart is not drawn, as if the camera could see through it. The rest of the
 * same straight wall is left out with it, as far as it lies behind the
 * kart, so that no loose slabs of it are left standing at the sides of the
 * picture. A wall beside the kart never counts as standing in the way, so
 * it stays whole.
 */
export function buildingsInView(buildings, kart, settings = CHASE, screen = SCREEN) {
  if (buildings === null) {
    return [];
  }
  const { horizonY, growthPerRow, depth } = chaseNumbers(settings);
  const eyeHeight = 1 / growthPerRow; //         how high the camera's eye is, in units
  const eyeBehind = depth / settings.kartScale; // how far behind the kart it is
  // A side is only seen if it faces the eye.
  const eye = { x: kart.x - eyeBehind * Math.cos(kart.angle), y: kart.y - eyeBehind * Math.sin(kart.angle) };
  const far = settings.viewAhead;
  // How far ahead of the kart (negative: behind it) the top of something
  // this tall leaves the bottom of the screen. Something taller than the
  // eye never does: it is shown up to just in front of the eye.
  const nearFor = (height) => {
    const largest = height < eyeHeight ? Math.min(LARGEST_SCALE, (screen.height - horizonY) / (eyeHeight - height)) : LARGEST_SCALE;
    return depth * (1 / largest - 1 / settings.kartScale);
  };
  const onScreen = (points) =>
    points.length >= 3 &&
    points.some(([x]) => x >= 0) &&
    points.some(([x]) => x <= screen.width) &&
    points.some(([, y]) => y <= screen.height);
  // Would something this tall, standing along the line from a to b, hide the kart from the camera?
  const hidesKart = (a, b, height) => {
    const nearest = nearestInSightLine(a, b, eyeBehind, KART_MIDDLE);
    if (nearest === null) {
      return false; // it does not stand between the camera and the kart
    }
    // How high the line from the eye to the top of the kart is at that spot.
    const sightHeight = KART_TALL + ((eyeHeight - KART_TALL) * -nearest) / eyeBehind;
    return height > sightHeight;
  };

  // The sides that face the eye, each with its two ends as seen from the kart.
  const facing = [];
  for (const side of buildings.sides) {
    const towardsEye = (eye.x - side.from[0]) * side.outward[0] + (eye.y - side.from[1]) * side.outward[1];
    if (towardsEye > 0) {
      // (A side that faces away is hidden by the roof and the other sides.)
      facing.push({ side, a: seenFromKart(kart, side.from[0], side.from[1]), b: seenFromKart(kart, side.to[0], side.to[1]) });
    }
  }

  // Which of them are left out: every side that hides the kart, and its
  // neighbours along the same straight wall, as far as they lie behind the kart.
  const alongX = (side) => side.facing === "north" || side.facing === "south";
  const wallOf = (side) => `${side.facing} ${alongX(side) ? side.row : side.column}`; // one straight wall
  const placeIn = (side) => (alongX(side) ? side.column : side.row); //                  where along that wall
  const behindKart = new Map(); // straight wall -> (place along it -> side), for the sides behind the kart
  for (const { side, a, b } of facing) {
    if ((a.ahead + b.ahead) / 2 < 0) {
      if (!behindKart.has(wallOf(side))) {
        behindKart.set(wallOf(side), new Map());
      }
      behindKart.get(wallOf(side)).set(placeIn(side), side);
    }
  }
  const leftOut = new Set(); //         sides
  const squaresLeftOut = new Set(); //  "column row" of the squares they belong to
  const leaveOut = (side) => {
    leftOut.add(side);
    squaresLeftOut.add(`${side.column} ${side.row}`);
  };
  for (const { side, a, b } of facing) {
    if (hidesKart(a, b, side.top)) {
      leaveOut(side);
      const wall = behindKart.get(wallOf(side));
      for (const step of [-1, 1]) {
        for (let place = placeIn(side) + step; wall?.has(place); place += step) {
          leaveOut(wall.get(place));
        }
      }
    }
  }

  const shapes = [];
  for (const each of facing) {
    const { side } = each;
    let { a, b } = each;
    const near = nearFor(side.top);
    if ((a.ahead < near && b.ahead < near) || (a.ahead > far && b.ahead > far)) {
      continue;
    }
    if (leftOut.has(side)) {
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
    const corners = [
      [pa.x, pa.y - side.bottom * pa.scale],
      [pb.x, pb.y - side.bottom * pb.scale],
      [pb.x, pb.y - side.top * pb.scale],
      [pa.x, pa.y - side.top * pa.scale],
    ];
    const points = keepAbove(corners, screen.height);
    if (onScreen(points)) {
      shapes.push({
        kind: "side",
        facing: side.facing,
        ahead: (a.ahead + b.ahead) / 2,
        points,
        corners,
        column: side.column,
        row: side.row,
        style: side.style,
        bottom: side.bottom,
        top: side.top,
      });
    }
  }

  // A roof higher than the camera's eye is seen from below, which means it
  // is not seen at all: the sides of the building hide it.
  for (const roof of buildings.roofs) {
    if (roof.height >= eyeHeight) {
      continue;
    }
    const seen = roof.corners.map(([x, y]) => seenFromKart(kart, x, y));
    if (
      squaresLeftOut.has(`${roof.column} ${roof.row}`) ||
      seen.some((corner, i) => hidesKart(corner, seen[(i + 1) % seen.length], roof.height))
    ) {
      continue; // the camera looks through this square: its sides are left out too
    }
    const corners = keepAhead(seen, nearFor(roof.height));
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
      shapes.push({
        kind: "roof",
        facing: "up",
        ahead: middle.ahead,
        points,
        column: roof.column,
        row: roof.row,
        style: roof.style,
      });
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

/**
 * Does the line from a to b pass between the camera and the kart? Both are
 * given as seen from the kart: { ahead, sideways }. The space between the
 * two is a narrow triangle on the ground: its tip at the camera's eye,
 * "eyeBehind" units behind the kart, and as wide as the kart at the kart.
 *
 * Gives null if the line stays outside that triangle. Otherwise it gives
 * how far ahead of the kart the line is where it comes nearest to the kart
 * inside the triangle: a number from -eyeBehind (at the eye) to 0 (at the kart).
 */
export function nearestInSightLine(a, b, eyeBehind, halfWidth) {
  // The triangle is where these three sums are all zero or less. Each one
  // changes in a straight line along the way from a to b.
  const sums = [
    (point) => point.ahead, //                                                     not ahead of the kart
    (point) => point.sideways * eyeBehind - halfWidth * (point.ahead + eyeBehind), // not right of the triangle
    (point) => -point.sideways * eyeBehind - halfWidth * (point.ahead + eyeBehind), // not left of it
  ];
  // The part of the line inside the triangle, as shares of the way from a (0) to b (1).
  let from = 0;
  let to = 1;
  for (const sum of sums) {
    const atA = sum(a);
    const atB = sum(b);
    if (atA > 0 && atB > 0) {
      return null;
    }
    if (atA > 0) {
      from = Math.max(from, atA / (atA - atB));
    } else if (atB > 0) {
      to = Math.min(to, atA / (atA - atB));
    }
  }
  if (!(from < to)) {
    return null;
  }
  const aheadAt = (share) => a.ahead + (b.ahead - a.ahead) * share;
  return Math.max(aheadAt(from), aheadAt(to));
}

/** Cuts a shape on the screen (a list of [x, y] corners) so that nothing is below the row "bottom". */
function keepAbove(points, bottom) {
  const kept = [];
  for (let i = 0; i < points.length; i++) {
    const here = points[i];
    const next = points[(i + 1) % points.length];
    if (here[1] <= bottom) {
      kept.push(here);
    }
    if (here[1] <= bottom !== next[1] <= bottom) {
      const share = (bottom - here[1]) / (next[1] - here[1]);
      kept.push([here[0] + (next[0] - here[0]) * share, bottom]);
    }
  }
  return kept;
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
