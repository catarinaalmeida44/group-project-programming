// The shape of a kart and its driver, in three dimensions.
//
// Until now a kart was four flat pictures: from behind, from the front and
// from each side. A turning kart jumped from one picture to the next. Here
// the kart is a small model instead: boxes, wedges and wheels with real
// positions in space. kart-paint.js can then draw it from any direction, so
// a kart turns smoothly, and the same model is used in all three views.
//
// This file only describes the shape. It paints nothing, so it can be tested.
//
// THE NUMBERS
// Everything is measured in units of track from the middle of the kart on
// the ground: x forwards, y to the driver's right, z up. A kart is about
// 22 units long, 17 wide and 16 high, a little larger than the circle the
// driving rules use for walls (shared/race.js), as the wheels stick out.
//
// A LOOK
// The colours come from a "look": which colour the kart's body is, the
// driver's suit, the helmet and so on. Changing the look changes the kart,
// which is what makes custom characters possible later.

/** The looks karts get by their starting place, so every player in a room has a different one. */
export const LOOKS = [
  { name: "red", body: "#e23d3d", trim: "#f4f6f8", suit: "#f4f6f8", helmet: "#e23d3d", stripe: "#f4f6f8" },
  { name: "blue", body: "#2f7fe0", trim: "#ffd23f", suit: "#1c2f5a", helmet: "#f4f6f8", stripe: "#2f7fe0" },
  { name: "yellow", body: "#f0c330", trim: "#1d2733", suit: "#1d2733", helmet: "#f0c330", stripe: "#1d2733" },
  { name: "green", body: "#3fb563", trim: "#f4f6f8", suit: "#f4f6f8", helmet: "#3fb563", stripe: "#f0c330" },
  { name: "purple", body: "#9a55d6", trim: "#ffd23f", suit: "#2a1f4a", helmet: "#ffd23f", stripe: "#9a55d6" },
  { name: "orange", body: "#ef8a2b", trim: "#1d2733", suit: "#f4f6f8", helmet: "#1d2733", stripe: "#ef8a2b" },
  { name: "teal", body: "#2fc4c4", trim: "#f4f6f8", suit: "#124a55", helmet: "#f4f6f8", stripe: "#2fc4c4" },
  { name: "pink", body: "#e667a8", trim: "#f4f6f8", suit: "#f4f6f8", helmet: "#e667a8", stripe: "#2a1f4a" },
];

// The parts every kart has in the same colour.
const TYRE = "#1b1f24";
const HUB = "#c9d0d8";
const FRAME = "#2c343d"; // the floor, the seat and the engine
const METAL = "#aab3bd"; // bumpers and exhaust pipes
const GLOVE = "#1b1f24";
const VISOR = "#16202b";

/** How many flat sides a wheel is made of. More is rounder and slower to draw. */
const WHEEL_SIDES = 10;

/**
 * The look of a kart: the one it carries, or the one that goes with its
 * starting place. A kart with neither gets the first look.
 */
export function lookOf(kart) {
  if (isLook(kart?.look)) {
    return kart.look;
  }
  const place = Number.isInteger(kart?.place) && kart.place >= 0 ? kart.place : 0;
  return LOOKS[place % LOOKS.length];
}

/** Is this a usable look? Every colour must be a text such as "#e23d3d". Anything else is not trusted. */
export function isLook(look) {
  if (look === null || typeof look !== "object") {
    return false;
  }
  return ["body", "trim", "suit", "helmet", "stripe"].every(
    (part) => typeof look[part] === "string" && /^#[0-9a-fA-F]{6}$/.test(look[part]),
  );
}

// ---------------------------------------------------------------------------
// Building blocks. Each gives a list of flat faces. A face is
// { points, colour }: its corners in space, in order, and its colour.
// The corners of every face are listed in the order that makes normalOf()
// (at the bottom of this file) point out of the block. kart-paint.js relies
// on that to leave out the faces that point away from the camera.
// ---------------------------------------------------------------------------

/**
 * A block with a rectangle at the back and a rectangle at the front, which
 * may differ in size: a box when they are the same, a wedge when they are not.
 * Each end is [x, yLeft, yRight, zBottom, zTop].
 */
export function block(back, front, colour, topColour = colour) {
  const [xb, yb0, yb1, zb0, zb1] = back;
  const [xf, yf0, yf1, zf0, zf1] = front;
  // The eight corners: b/f = back/front, l/r = left/right, d/u = down/up.
  const bld = [xb, yb0, zb0];
  const brd = [xb, yb1, zb0];
  const blu = [xb, yb0, zb1];
  const bru = [xb, yb1, zb1];
  const fld = [xf, yf0, zf0];
  const frd = [xf, yf1, zf0];
  const flu = [xf, yf0, zf1];
  const fru = [xf, yf1, zf1];
  return [
    { points: [blu, flu, fru, bru], colour: topColour }, // top
    { points: [bld, brd, frd, fld], colour }, //            bottom
    { points: [bld, blu, bru, brd], colour }, //            back
    { points: [fld, frd, fru, flu], colour }, //            front
    { points: [bld, fld, flu, blu], colour }, //            left
    { points: [brd, bru, fru, frd], colour }, //            right
  ];
}

/** A plain box from its lowest corner to its highest: x back to front, y left to right, z bottom to top. */
export function box(x0, x1, y0, y1, z0, z1, colour, topColour = colour) {
  return block([x0, y0, y1, z0, z1], [x1, y0, y1, z0, z1], colour, topColour);
}

/**
 * A straight bar from one point to another, square in section, "thick" units
 * across. Used for arms, legs and struts, which do not run along an axis.
 */
export function bar(from, to, thick, colour) {
  const along = unit([to[0] - from[0], to[1] - from[1], to[2] - from[2]]);
  // Two directions at right angles to the bar and to each other.
  const helper = Math.abs(along[2]) < 0.9 ? [0, 0, 1] : [1, 0, 0];
  const side = unit(cross(helper, along));
  const up = cross(along, side);
  const half = thick / 2;
  const corner = (point, s, u) => [
    point[0] + side[0] * s * half + up[0] * u * half,
    point[1] + side[1] * s * half + up[1] * u * half,
    point[2] + side[2] * s * half + up[2] * u * half,
  ];
  const a = [corner(from, -1, -1), corner(from, 1, -1), corner(from, 1, 1), corner(from, -1, 1)];
  const b = [corner(to, -1, -1), corner(to, 1, -1), corner(to, 1, 1), corner(to, -1, 1)];
  return [
    { points: [a[3], a[2], a[1], a[0]], colour }, // the end at "from"
    { points: [b[0], b[1], b[2], b[3]], colour }, // the end at "to"
    { points: [a[0], a[1], b[1], b[0]], colour },
    { points: [a[1], a[2], b[2], b[1]], colour },
    { points: [a[2], a[3], b[3], b[2]], colour },
    { points: [a[3], a[0], b[0], b[3]], colour },
  ];
}

/**
 * A wheel: a short round drum lying on its side, with its middle at
 * (x, y, radius) so that it stands on the ground. "turn" swings it round
 * like a steered front wheel, in radians.
 * Gives { faces, decals }: the decals are the two lighter hubs, which are
 * painted on top of the round sides.
 */
export function wheel(x, y, radius, width, turn = 0) {
  const faces = [];
  const decals = [];
  const ring = (side) => {
    const points = [];
    for (let i = 0; i < WHEEL_SIDES; i++) {
      const angle = (i / WHEEL_SIDES) * Math.PI * 2;
      points.push([Math.cos(angle) * radius, side * (width / 2), radius + Math.sin(angle) * radius]);
    }
    return points;
  };
  const left = ring(-1);
  const right = ring(1);
  // The tread: one flat face between each pair of neighbouring corners.
  for (let i = 0; i < WHEEL_SIDES; i++) {
    const next = (i + 1) % WHEEL_SIDES;
    faces.push({ points: [left[i], right[i], right[next], left[next]], colour: TYRE });
  }
  // The two round sides, and a lighter hub in the middle of each.
  faces.push({ points: [...left], colour: TYRE });
  faces.push({ points: [...right].reverse(), colour: TYRE });
  const hub = (side) =>
    ring(side).map(([px, py, pz]) => [px * 0.55, py + side * 0.15, radius + (pz - radius) * 0.55]);
  decals.push({ points: hub(-1), colour: HUB });
  decals.push({ points: hub(1).reverse(), colour: HUB });

  // Swing the wheel round its own middle, then move it to its place.
  const cos = Math.cos(turn);
  const sin = Math.sin(turn);
  const placed = (list) =>
    list.map((face) => ({
      colour: face.colour,
      points: face.points.map(([px, py, pz]) => [x + px * cos - py * sin, y + px * sin + py * cos, pz]),
    }));
  return { faces: placed(faces), decals: placed(decals) };
}

// ---------------------------------------------------------------------------
// The kart
// ---------------------------------------------------------------------------

/**
 * The whole kart with its driver, as a list of parts. A part is:
 *   { name, faces }          a solid piece made of flat faces
 *   { ..., decals }          faces painted flat on top of that piece, such
 *                            as the number plate on the nose
 *   { ..., low: true }       a piece that lies under everything else (the
 *                            floor): it is painted first
 *   { name, ball }           the helmet. A ball has no flat faces, so it is
 *                            described by its middle and its size and
 *                            painted as a shaded circle
 *
 *   look   the colours (see LOOKS)
 *   steer  from -1 (hard left) to 1 (hard right): the front wheels and the
 *          steering wheel turn, and the driver leans into the bend
 */
export function kartParts(look, steer = 0) {
  const turn = clampSteer(steer);
  const wheelTurn = turn * 0.42; // radians
  const lean = turn * 0.7; //       the driver's shoulders and head shift this many units sideways
  const { body, trim, suit, helmet, stripe } = look;

  // Where the driver's hands hold the steering wheel. They move with it.
  const handSpread = 2.1;
  const wheelX = 2.2;
  const wheelZ = 8.1;
  const leftHand = [wheelX, -handSpread * Math.cos(turn * 0.6), wheelZ - handSpread * Math.sin(turn * 0.6)];
  const rightHand = [wheelX, handSpread * Math.cos(turn * 0.6), wheelZ + handSpread * Math.sin(turn * 0.6)];

  // The top of the nose slopes down from the driver to the front. This is
  // how high it is at a distance x from the middle of the kart.
  const NOSE = { back: 3.4, front: 11.0, highAtBack: 5.6, highAtFront: 3.3 };
  const noseTop = (x) =>
    NOSE.highAtBack + ((NOSE.highAtFront - NOSE.highAtBack) * (x - NOSE.back)) / (NOSE.front - NOSE.back);
  const plateBack = 6.6;
  const plateFront = 9.8;

  return [
    // The frame: a flat floor, and the axles that hold the wheels.
    { name: "floor", low: true, faces: box(-9.4, 9.2, -4.3, 4.3, 1.3, 2.3, FRAME) },
    { name: "back axle", low: true, faces: box(-7.0, -5.8, -6.0, 6.0, 2.8, 3.9, FRAME) },
    { name: "front axle", low: true, faces: box(6.5, 7.5, -5.6, 5.6, 2.4, 3.3, FRAME) },

    // Wheels: the back ones are bigger and wider.
    { name: "back left wheel", ...wheel(-6.4, -6.9, 3.4, 3.6) },
    { name: "back right wheel", ...wheel(-6.4, 6.9, 3.4, 3.6) },
    { name: "front left wheel", ...wheel(7.0, -6.6, 2.9, 2.9, wheelTurn) },
    { name: "front right wheel", ...wheel(7.0, 6.6, 2.9, 2.9, wheelTurn) },

    // The body, in the kart's own colour: a nose that slopes down to the
    // front with a plate on it, a pod on each side, and a wing at each end.
    {
      name: "nose",
      faces: block(
        [NOSE.back, -3.5, 3.5, 2.3, NOSE.highAtBack],
        [NOSE.front, -2.3, 2.3, 2.3, NOSE.highAtFront],
        body,
        shade(body, 1.12),
      ),
      decals: [
        {
          colour: trim,
          points: [
            [plateBack, -1.7, noseTop(plateBack) + 0.03],
            [plateFront, -1.45, noseTop(plateFront) + 0.03],
            [plateFront, 1.45, noseTop(plateFront) + 0.03],
            [plateBack, 1.7, noseTop(plateBack) + 0.03],
          ],
        },
      ],
    },
    { name: "left pod", faces: block([-3.2, -6.3, -4.3, 2.3, 4.6], [3.6, -5.9, -4.3, 2.3, 3.4], body, shade(body, 1.12)) },
    { name: "right pod", faces: block([-3.2, 4.3, 6.3, 2.3, 4.6], [3.6, 4.3, 5.9, 2.3, 3.4], body, shade(body, 1.12)) },
    { name: "front wing", faces: box(10.4, 12.0, -6.9, 6.9, 1.3, 2.2, trim) },
    { name: "left wing post", faces: box(-10.0, -9.2, -3.4, -2.6, 5.4, 9.6, FRAME) },
    { name: "right wing post", faces: box(-10.0, -9.2, 2.6, 3.4, 5.4, 9.6, FRAME) },
    {
      name: "back wing",
      faces: box(-11.2, -8.2, -7.1, 7.1, 9.6, 10.4, body, shade(body, 1.15)),
      // A stripe across the back edge of the wing, which is the part of a
      // kart you see most: you spend the race looking at backs.
      decals: [
        {
          colour: trim,
          points: [
            [-11.23, -6.3, 9.78],
            [-11.23, -6.3, 10.22],
            [-11.23, 6.3, 10.22],
            [-11.23, 6.3, 9.78],
          ],
        },
      ],
    },

    // The engine behind the seat, with two exhaust pipes and a bumper.
    { name: "engine", faces: box(-9.6, -6.0, -3.6, 3.6, 2.3, 5.6, FRAME) },
    { name: "left exhaust", faces: box(-11.4, -9.4, -2.7, -1.5, 3.3, 4.5, METAL) },
    { name: "right exhaust", faces: box(-11.4, -9.4, 1.5, 2.7, 3.3, 4.5, METAL) },
    { name: "back bumper", faces: box(-10.9, -10.1, -6.4, 6.4, 1.6, 2.6, METAL) },

    // The seat, the steering column and the steering wheel.
    { name: "seat back", faces: block([-6.0, -3.3, 3.3, 2.3, 9.4], [-4.7, -3.3, 3.3, 2.3, 8.8], FRAME) },
    { name: "steering column", faces: bar([4.6, 0, 5.0], [wheelX + 0.3, 0, wheelZ - 0.2], 0.9, FRAME) },
    { name: "steering wheel", faces: bar(leftHand, rightHand, 1.0, FRAME) },

    // The driver: legs into the nose, body, arms to the wheel, and the helmet.
    { name: "left leg", faces: bar([-3.2, -1.7, 4.0], [3.6, -2.0, 5.4], 2.2, suit) },
    { name: "right leg", faces: bar([-3.2, 1.7, 4.0], [3.6, 2.0, 5.4], 2.2, suit) },
    {
      name: "body",
      faces: block([-4.7, -2.4 + lean * 0.4, 2.4 + lean * 0.4, 3.2, 11.4], [-1.9, -3.0 + lean, 3.0 + lean, 3.2, 11.4], suit, shade(suit, 1.08)),
    },
    { name: "left arm", faces: bar([-3.0, -3.3 + lean, 10.4], leftHand, 1.7, suit) },
    { name: "right arm", faces: bar([-3.0, 3.3 + lean, 10.4], rightHand, 1.7, suit) },
    { name: "left glove", faces: bar([leftHand[0] - 0.9, leftHand[1], leftHand[2] + 0.3], [leftHand[0] + 0.5, leftHand[1], leftHand[2]], 1.9, GLOVE) },
    { name: "right glove", faces: bar([rightHand[0] - 0.9, rightHand[1], rightHand[2] + 0.3], [rightHand[0] + 0.5, rightHand[1], rightHand[2]], 1.9, GLOVE) },
    {
      name: "helmet",
      ball: { middle: [-3.1, lean * 1.3, 13.7], radius: 3.05, colour: helmet, stripe, visor: VISOR },
    },
  ];
}

/** The lowest and highest point of the kart, the widest and the longest: for tests and for the shadow. */
export function sizeOfKart(look = LOOKS[0]) {
  const size = { length: 0, width: 0, height: 0 };
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const part of kartParts(look, 0)) {
    const points = part.faces
      ? part.faces.flatMap((face) => face.points)
      : [
          [part.ball.middle[0], part.ball.middle[1], part.ball.middle[2] + part.ball.radius],
          [part.ball.middle[0], part.ball.middle[1], part.ball.middle[2] - part.ball.radius],
        ];
    for (const [x, y, z] of points) {
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
      size.height = Math.max(size.height, z);
    }
  }
  size.length = maxX - minX;
  size.width = maxY - minY;
  return size;
}

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

function clampSteer(steer) {
  return typeof steer === "number" && Number.isFinite(steer) ? Math.min(Math.max(steer, -1), 1) : 0;
}

function cross(a, b) {
  return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
}

function unit(v) {
  const length = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / length, v[1] / length, v[2] / length];
}

/** The direction a face points: straight out of it, by the order of its corners. */
export function normalOf(face) {
  const [a, b, c] = face.points;
  return unit(cross([b[0] - a[0], b[1] - a[1], b[2] - a[2]], [c[0] - a[0], c[1] - a[1], c[2] - a[2]]));
}

/**
 * A colour made lighter or darker: 1 leaves it as it is, 0.5 is half as
 * bright, 1.2 a little brighter. The colour is a text such as "#e23d3d".
 */
export function shade(colour, amount) {
  const part = (start) => {
    const value = Math.round(parseInt(colour.slice(start, start + 2), 16) * amount);
    return Math.min(255, Math.max(0, value)).toString(16).padStart(2, "0");
  };
  return `#${part(1)}${part(3)}${part(5)}`;
}
