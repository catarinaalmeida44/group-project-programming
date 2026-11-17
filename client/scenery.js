// Scenery: buildings with real fronts, roofs to drive under, railings, low walls.
//
// buildings.js stands every wall square up as a plain block. That is enough
// for a circuit, but not for a place people know: the Nova campus has a glass
// front with a banner, halls with long bands of windows, a wooden ceiling
// over the atrium, an underpass. This file is the arithmetic for all of that.
// Like buildings.js it only works out WHERE things land on the screen.
// Nothing here paints: that is scenery-paint.js.
//
// A track's look can list:
//   blocks   boxes. Each has a rectangle on the map, a height where it starts
//            ("base", 0 for the ground) and a height where it ends ("top"),
//            both in metres. A box that starts above the ground is a roof or
//            a bridge: karts drive under it and see its underside.
//   fences   thin upright things, drawn from both sides: a railing, a row of
//            letters, a low wall along a slanting edge
//
// Two steps, as in buildings.js:
//   createScenery(track, model)        once: cuts every side of every box into
//                                      strips one square wide, and every roof
//                                      and underside into pieces one square big
//   sceneryInView(scenery, kart, ...)  for every picture: the strips and pieces
//                                      that can be seen, as shapes on the screen
//
// WHY ONE SQUARE AT A TIME
// draw.js paints the furthest things first, so nearer things cover them, and
// it knows what is furthest from the square a thing stands on. A whole wall
// is in many squares at once, so it is cut up.
//
// WHICH WAY A WALL IS READ
// Every side has a picture (a "front", made in wall-art.js). "u" is how far
// along the wall a strip is, in units, measured the way you read the wall
// when you stand outside the box and look at it: from its left end.

import { CHASE, SCREEN, chaseNumbers, seenFromKart } from "./camera.js";
import { nearestInSightLine } from "./buildings.js";

/** Nothing is drawn larger than this many pixels for one unit of track (the same limit as buildings.js). */
const LARGEST_SCALE = 120;
/** For deciding what hides the kart from the camera (the same numbers as buildings.js). */
const KART_TALL = 10;
const KART_MIDDLE = 6;
/** Further ahead than this, the small parts of a ceiling (its beams) are not drawn. */
const DETAIL_TO = 420;
/** Further ahead than this, the underside of a roof is not drawn: from so far it is a thin line at most. */
const UNDER_TO = 760;
/** A wall square this near to scenery (in squares, from its middle) counts as having scenery. */
const WITHIN_SQUARES = 1.2;

/**
 * The four sides of a box, each read from its left end as seen from outside.
 * "from" and "to" pick corners of the rectangle [left, top, right, bottom].
 */
const SIDES = [
  { facing: "north", from: (r) => [r[2], r[1]], to: (r) => [r[0], r[1]], outward: [0, -1] },
  { facing: "east", from: (r) => [r[2], r[3]], to: (r) => [r[2], r[1]], outward: [1, 0] },
  { facing: "south", from: (r) => [r[0], r[3]], to: (r) => [r[2], r[3]], outward: [0, 1] },
  { facing: "west", from: (r) => [r[0], r[1]], to: (r) => [r[0], r[3]], outward: [-1, 0] },
];

/**
 * Checks the scenery of a track and cuts it into strips and pieces.
 *   model.blocks        [{ rect, base, top, faces, roof, soffit, ... }], see nova-lap-buildings.js
 *   model.fences        [{ from, to, base, top, art, ... }]
 *   model.unitsPerMetre how many units of track one metre is
 * Stops with an error that says what is wrong if a box does not fit the map.
 */
export function createScenery(track, model) {
  const { blocks = [], fences = [], unitsPerMetre } = model;
  // A real number above zero: not a text such as "5", and not "endless".
  if (typeof unitsPerMetre !== "number" || !Number.isFinite(unitsPerMetre) || !(unitsPerMetre > 0)) {
    throw new Error("Scenery: unitsPerMetre must be a number above zero");
  }
  const size = track.tileSize;
  const strips = [];
  const flats = [];
  let group = 0;

  blocks.forEach((block, number) => {
    const { rect, base = 0, top } = block;
    const label = block.name ?? `block ${number}`;
    if (!Array.isArray(rect) || rect.length !== 4 || !(rect[2] > rect[0]) || !(rect[3] > rect[1])) {
      throw new Error(`Scenery: "${label}" needs a rect [left, top, right, bottom] with room inside`);
    }
    if (rect[0] < 0 || rect[1] < 0 || rect[2] > track.columns || rect[3] > track.rows) {
      throw new Error(`Scenery: "${label}" does not fit inside the map`);
    }
    const topEnd = block.topEnd ?? top; // a roof that slopes: "top" at one end, "topEnd" at the other
    if (!(top > base) || !(topEnd > base) || base < 0) {
      throw new Error(`Scenery: "${label}" must end higher than it starts`);
    }
    // The height of the top at a spot on the map, in units. A sloping top
    // runs along x ("slope: x": from the left edge to the right) or along y.
    const along = block.slope === "y" ? 1 : 0;
    const topAt = (x, y) => {
      if (topEnd === top) {
        return top * unitsPerMetre;
      }
      const share = ((along === 1 ? y : x) - rect[along]) / (rect[along + 2] - rect[along]);
      return (top + (topEnd - top) * share) * unitsPerMetre;
    };
    const highest = Math.max(top, topEnd) * unitsPerMetre;

    for (const side of SIDES) {
      const face = block.faces?.[side.facing] ?? block.art;
      if (face === null || face === undefined) {
        continue; // a side nobody can see, left out to save work
      }
      const art = typeof face === "string" ? { art: face } : face;
      const from = side.from(rect);
      const to = side.to(rect);
      group++;
      for (const piece of cutAtSquares(from, to)) {
        // The square the strip belongs to: the one just inside the box.
        const middleX = (piece.a[0] + piece.b[0]) / 2 - side.outward[0] * 0.01;
        const middleY = (piece.a[1] + piece.b[1]) / 2 - side.outward[1] * 0.01;
        strips.push({
          a: [piece.a[0] * size, piece.a[1] * size],
          b: [piece.b[0] * size, piece.b[1] * size],
          outward: side.outward,
          facing: side.facing,
          base: base * unitsPerMetre,
          topA: topAt(piece.a[0], piece.a[1]),
          topB: topAt(piece.b[0], piece.b[1]),
          highest,
          art: art.art,
          // How far along the picture this strip starts and ends, in units.
          uA: ((art.shift ?? 0) + piece.fromStart) * size,
          uB: ((art.shift ?? 0) + piece.toStart) * size,
          column: Math.floor(middleX),
          row: Math.floor(middleY),
          bothSides: false,
          group,
        });
      }
    }

    // The top (seen when it is lower than the camera) and the underside
    // (seen when the box starts above the ground), one piece per square.
    for (const square of squaresUnder(rect)) {
      if (block.roof !== null && topEnd === top) {
        addFlat(square, "top", top * unitsPerMetre, block.roof ?? "roof");
      }
      if (base > 0 && block.soffit !== null) {
        addFlat(square, "under", base * unitsPerMetre, block.soffit ?? "plain");
      }
    }
  });

  /**
   * One square of a top or an underside, in the colour of its style. A
   * style can have "parts": stripes that repeat in every square, such as
   * the beams of a wooden ceiling. Each part is [left, top, right, bottom]
   * as shares of one square, and becomes a small piece of its own.
   */
  function addFlat(square, kind, height, styleName) {
    const style = model.flatStyles?.[styleName] ?? { colour: "#c9ccce" };
    const toUnits = (corners) => corners.map(([x, y]) => [x * size, y * size]);
    const about = { kind, height, column: square.column, row: square.row };
    flats.push({ ...about, corners: toUnits(square.corners), colour: style.colour, detail: false });
    const [[left, top], , [right, bottom]] = square.corners;
    for (const part of style.parts ?? []) {
      const x0 = Math.max(left, square.column + part.rect[0]);
      const y0 = Math.max(top, square.row + part.rect[1]);
      const x1 = Math.min(right, square.column + part.rect[2]);
      const y1 = Math.min(bottom, square.row + part.rect[3]);
      if (x1 - x0 > 1e-9 && y1 - y0 > 1e-9) {
        flats.push({ ...about, corners: toUnits([[x0, y0], [x1, y0], [x1, y1], [x0, y1]]), colour: part.colour, detail: true });
      }
    }
  }

  fences.forEach((fence, number) => {
    const { from, to, base = 0, top, art } = fence;
    const label = fence.name ?? `fence ${number}`;
    if (!Array.isArray(from) || !Array.isArray(to) || !(top > base) || typeof art !== "string") {
      throw new Error(`Scenery: "${label}" needs from, to, an art and a top above its base`);
    }
    const length = Math.hypot(to[0] - from[0], to[1] - from[1]);
    if (!(length > 0)) {
      throw new Error(`Scenery: "${label}" has no length`);
    }
    // A fence is "read" from the side on which "from" is its left end.
    const outward = [-(to[1] - from[1]) / length, (to[0] - from[0]) / length];
    group++;
    for (const piece of cutAtSquares(from, to)) {
      strips.push({
        a: [piece.a[0] * size, piece.a[1] * size],
        b: [piece.b[0] * size, piece.b[1] * size],
        outward,
        facing: "fence",
        base: base * unitsPerMetre,
        topA: top * unitsPerMetre,
        topB: top * unitsPerMetre,
        highest: top * unitsPerMetre,
        art,
        uA: ((fence.shift ?? 0) + piece.fromStart) * size,
        uB: ((fence.shift ?? 0) + piece.toStart) * size,
        column: Math.floor((piece.a[0] + piece.b[0]) / 2 + (fence.lean?.[0] ?? 0) * 0.01),
        row: Math.floor((piece.a[1] + piece.b[1]) / 2 + (fence.lean?.[1] ?? 0) * 0.01),
        bothSides: true,
        group,
      });
    }
  });

  return { strips, flats, unitsPerMetre };
}

/**
 * The squares that have scenery standing on them: a Set of "column row".
 * draw.js uses it so that a wall with a real front does not get a plain
 * barrier as well.
 */
export function squaresWithScenery(scenery, tileSize) {
  const squares = new Set();
  for (const strip of scenery.strips) {
    if (strip.base !== 0) {
      continue; // a roof overhead does not show where a wall is
    }
    // In squares: the two ends of the strip, and every square whose middle
    // is hardly more than one square from the line between them. (A fence
    // along a slanting edge runs through the corners of the wall squares
    // beside it, so "the square it stands on" would miss some of them.)
    const ax = strip.a[0] / tileSize;
    const ay = strip.a[1] / tileSize;
    const bx = strip.b[0] / tileSize;
    const by = strip.b[1] / tileSize;
    const lengthSquared = (bx - ax) ** 2 + (by - ay) ** 2;
    for (let row = Math.floor(Math.min(ay, by) - 1); row <= Math.floor(Math.max(ay, by) + 1); row++) {
      for (let column = Math.floor(Math.min(ax, bx) - 1); column <= Math.floor(Math.max(ax, bx) + 1); column++) {
        const x = column + 0.5;
        const y = row + 0.5;
        const along = lengthSquared > 0 ? Math.min(1, Math.max(0, ((x - ax) * (bx - ax) + (y - ay) * (by - ay)) / lengthSquared)) : 0;
        if (Math.hypot(x - (ax + along * (bx - ax)), y - (ay + along * (by - ay))) <= WITHIN_SQUARES) {
          squares.add(`${column} ${row}`);
        }
      }
    }
  }
  return squares;
}

/**
 * Cuts the straight line from one point to another (both in squares) where
 * it crosses the lines between squares. Gives the pieces in order, each with
 * its two ends and how far from the start it begins and ends, in squares.
 */
export function cutAtSquares(from, to) {
  const length = Math.hypot(to[0] - from[0], to[1] - from[1]);
  const shares = new Set([0, 1]); // how far along the line each cut is, from 0 to 1
  for (const axis of [0, 1]) {
    const start = from[axis];
    const end = to[axis];
    if (start === end) {
      continue;
    }
    const low = Math.min(start, end);
    const high = Math.max(start, end);
    for (let line = Math.floor(low) + 1; line < high; line++) {
      shares.add((line - start) / (end - start));
    }
  }
  const cuts = [...shares].sort((a, b) => a - b);
  const at = (share) => [from[0] + (to[0] - from[0]) * share, from[1] + (to[1] - from[1]) * share];
  const pieces = [];
  for (let i = 0; i + 1 < cuts.length; i++) {
    if (cuts[i + 1] - cuts[i] > 1e-9) {
      pieces.push({ a: at(cuts[i]), b: at(cuts[i + 1]), fromStart: cuts[i] * length, toStart: cuts[i + 1] * length });
    }
  }
  return pieces;
}

/** The part of a rectangle (in squares) that lies in each square it touches: { column, row, corners }. */
export function squaresUnder(rect) {
  const [left, top, right, bottom] = rect;
  const squares = [];
  for (let row = Math.floor(top); row < bottom; row++) {
    for (let column = Math.floor(left); column < right; column++) {
      const x0 = Math.max(left, column);
      const x1 = Math.min(right, column + 1);
      const y0 = Math.max(top, row);
      const y1 = Math.min(bottom, row + 1);
      if (x1 - x0 > 1e-9 && y1 - y0 > 1e-9) {
        squares.push({ column, row, corners: [[x0, y0], [x1, y0], [x1, y1], [x0, y1]] });
      }
    }
  }
  return squares;
}

/**
 * The strips and pieces that can be seen from behind this kart.
 *
 * A strip comes back as { kind: "strip", a, b, ... }: "a" and "b" are its two
 * ends as seen from the kart ({ ahead, sideways }, already cut where the
 * strip passes behind the camera), with "uA" and "uB" saying which part of
 * the wall's picture lies between them. scenery-paint.js places the picture.
 *
 * A piece of roof or underside comes back as { kind: "flat", points, ... }:
 * its outline on the screen, in pixels.
 *
 * WHAT IS LEFT OUT (the same idea as in buildings.js)
 * A wall that stands between the camera and the kart, tall enough and low
 * enough to hide the kart, is not drawn: the camera looks through it. The
 * rest of the same wall is left out with it as far as it lies behind the kart.
 */
export function sceneryInView(scenery, kart, settings = CHASE, screen = SCREEN) {
  if (scenery === null || scenery === undefined) {
    return [];
  }
  const { horizonY, growthPerRow, depth } = chaseNumbers(settings);
  const eyeHeight = 1 / growthPerRow;
  const eyeBehind = depth / settings.kartScale;
  const eye = { x: kart.x - eyeBehind * Math.cos(kart.angle), y: kart.y - eyeBehind * Math.sin(kart.angle) };
  const far = settings.viewAhead;
  // Nothing nearer to the camera's eye than this is drawn.
  const near = depth * (1 / LARGEST_SCALE - 1 / settings.kartScale);
  const scaleAt = (ahead) => 1 / (1 / settings.kartScale + ahead / depth);
  const middle = screen.width / 2;

  // Does something from "bottom" to "top" (units above the ground), standing
  // along the line from a to b, hide the kart from the camera?
  const hidesKart = (a, b, bottom, top) => {
    const nearest = nearestInSightLine(a, b, eyeBehind, KART_MIDDLE);
    if (nearest === null) {
      return false;
    }
    // The line of sight from the eye to the kart: from the road up to the
    // top of the kart at one end, at the height of the eye at the other.
    const share = -nearest / eyeBehind; // 0 at the kart, 1 at the eye
    const sightTop = KART_TALL + (eyeHeight - KART_TALL) * share;
    const sightBottom = eyeHeight * share;
    return top > sightBottom + 1 && bottom < sightTop - 1;
  };

  // First round: which strips face the camera, and which walls hide the kart.
  const seen = [];
  const hiding = new Set(); // the walls (groups of strips) that hide the kart
  for (const strip of scenery.strips) {
    if (!strip.bothSides) {
      const towardsEye = (eye.x - strip.a[0]) * strip.outward[0] + (eye.y - strip.a[1]) * strip.outward[1];
      if (towardsEye <= 0) {
        continue; // it faces away
      }
    }
    const a = seenFromKart(kart, strip.a[0], strip.a[1]);
    const b = seenFromKart(kart, strip.b[0], strip.b[1]);
    if ((a.ahead < near && b.ahead < near) || (a.ahead > far && b.ahead > far)) {
      continue;
    }
    if (hidesKart(a, b, strip.base, Math.max(strip.topA, strip.topB))) {
      hiding.add(strip.group);
    }
    seen.push({ strip, a, b });
  }

  const shapes = [];
  for (const each of seen) {
    const { strip } = each;
    let { a, b } = each;
    let { uA, uB, topA, topB } = strip;
    if (hiding.has(strip.group) && (a.ahead + b.ahead) / 2 < 12) {
      continue; // this wall hides the kart: left out as far as it lies behind the kart
    }
    // Cut the strip where it passes behind the camera.
    if (a.ahead < near) {
      const share = (near - a.ahead) / (b.ahead - a.ahead);
      a = { ahead: near, sideways: a.sideways + share * (b.sideways - a.sideways) };
      uA += share * (uB - uA);
      topA += share * (topB - topA);
    } else if (b.ahead < near) {
      const share = (near - b.ahead) / (a.ahead - b.ahead);
      b = { ahead: near, sideways: b.sideways + share * (a.sideways - b.sideways) };
      uB += share * (uA - uB);
      topB += share * (topA - topB);
    }
    // Is any of it on the screen? Its two ends, at their feet and at their tops.
    const scaleA = scaleAt(a.ahead);
    const scaleB = scaleAt(b.ahead);
    const xA = middle + a.sideways * scaleA;
    const xB = middle + b.sideways * scaleB;
    if ((xA < 0 && xB < 0) || (xA > screen.width && xB > screen.width)) {
      continue;
    }
    const highestOnScreen = Math.min(horizonY + scaleA * (eyeHeight - topA), horizonY + scaleB * (eyeHeight - topB));
    const lowestOnScreen = Math.max(horizonY + scaleA * (eyeHeight - strip.base), horizonY + scaleB * (eyeHeight - strip.base));
    if (highestOnScreen > screen.height || lowestOnScreen < 0) {
      continue;
    }
    shapes.push({
      kind: "strip",
      a,
      b,
      uA,
      uB,
      topA,
      topB,
      base: strip.base,
      highest: strip.highest,
      art: strip.art,
      facing: strip.facing,
      // Seen from behind (a fence only), the picture is the wrong way round. That is right for a railing or letters.
      ahead: (a.ahead + b.ahead) / 2,
      column: strip.column,
      row: strip.row,
    });
  }

  for (const flat of scenery.flats) {
    // A top is seen from above, an underside from below.
    if (flat.kind === "top" ? flat.height >= eyeHeight : flat.height <= eyeHeight) {
      continue;
    }
    const corners = flat.corners.map(([x, y]) => seenFromKart(kart, x, y));
    if (corners.every((corner) => corner.ahead < near) || corners.every((corner) => corner.ahead > far)) {
      continue;
    }
    if (corners[0].ahead > (flat.detail ? DETAIL_TO : flat.kind === "under" ? UNDER_TO : far)) {
      continue; // too far away to tell a beam from the ceiling, or to see a ceiling at all
    }
    const kept = keepAhead(corners, near);
    if (kept.length < 3) {
      continue;
    }
    const points = kept.map((corner) => {
      const scale = scaleAt(corner.ahead);
      return [middle + corner.sideways * scale, horizonY + scale * (eyeHeight - flat.height)];
    });
    if (
      points.every(([x]) => x < 0) ||
      points.every(([x]) => x > screen.width) ||
      points.every(([, y]) => y > screen.height) ||
      points.every(([, y]) => y < 0)
    ) {
      continue;
    }
    shapes.push({
      kind: "flat",
      under: flat.kind === "under",
      colour: flat.colour,
      points,
      ahead: corners.reduce((sum, corner) => sum + corner.ahead, 0) / corners.length,
      column: flat.column,
      row: flat.row,
    });
  }
  return shapes;
}

/** Cuts a flat shape (corners as seen from the kart) so that nothing is nearer than "near". */
function keepAhead(corners, near) {
  const kept = [];
  for (let i = 0; i < corners.length; i++) {
    const here = corners[i];
    const next = corners[(i + 1) % corners.length];
    if (here.ahead >= near) {
      kept.push(here);
    }
    if (here.ahead >= near !== next.ahead >= near) {
      const share = (near - here.ahead) / (next.ahead - here.ahead);
      kept.push({ ahead: near, sideways: here.sideways + share * (next.sideways - here.sideways) });
    }
  }
  return kept;
}
