// A pilot standing beside their kart, helmet in hand, with their real face.
//
// This is the picture of a character when choosing one (and later on the
// podium). In the race the pilot sits in the kart with the helmet on, and
// no face is shown: that is kart-shape.js.
//
// Like kart-shape.js, this file only describes shapes, with the same
// building blocks (box, bar) and the same units: x forwards (the way the
// pilot looks), y to the pilot's right, z up, in units of track. A kart is
// about 22 units long and 16 high. kart-paint.js paints the scene.
//
// The head is a ball with the photo on it. The photo is always painted
// straight on, in the middle of the head, facing the camera: the pictures
// in client/faces are cut so that the face fills them, centred.

import { kartParts, box, bar, shade } from "./kart-shape.js";

const SHOE = "#1b1f24";
const GLOVE = "#1b1f24";
const VISOR = "#16202b";

/** How big the head is. A little big for the body, like a toy figure, so the face can be seen. */
export const HEAD_RADIUS = 4.2;

/** The parts of the kart that belong to the driver. In the scene the driver stands outside, so these are left out. */
export const DRIVER_PARTS = Object.freeze(["left leg", "right leg", "body", "left arm", "right arm", "left glove", "right glove", "helmet"]);

/**
 * A pilot standing on the ground, looking forwards (along x), with the
 * left arm down and the helmet held up in the right hand. Gives a list of
 * parts, as kartParts() in kart-shape.js does, plus one part with a "head":
 *   { name: "head", head: { middle, radius, rim } }
 * which kart-paint.js paints as a ball with the face on it.
 *   look  the colours of the character (kart-shape.js): the suit, the
 *         helmet with its stripe, and the kart's colour for the stripe on
 *         the suit
 */
export function pilotParts(look) {
  const { body, suit, helmet, stripe } = look;
  const suitLight = shade(suit, 1.08);
  const hipZ = 9.4;
  const shoulderZ = 15.8;
  const neckTop = 17.6;
  const leftHand = [0.5, -4.5, 9.0];
  const rightHand = [3.4, 5.3, 11.2];

  return [
    // Shoes and legs.
    { name: "left shoe", faces: box(-1.0, 2.8, -3.1, -0.8, 0, 1.3, SHOE) },
    { name: "right shoe", faces: box(-1.0, 2.8, 0.8, 3.1, 0, 1.3, SHOE) },
    { name: "left leg", faces: bar([0, -1.7, hipZ], [0.3, -1.95, 1.2], 2.1, shade(suit, 0.92)) },
    { name: "right leg", faces: bar([0, 1.7, hipZ], [0.3, 1.95, 1.2], 2.1, shade(suit, 0.92)) },

    // The body of the racing suit, with a stripe down the front in the
    // kart's colour, and a belt.
    {
      name: "suit",
      faces: box(-1.6, 1.6, -3.1, 3.1, hipZ - 0.6, shoulderZ + 0.6, suit, suitLight),
      decals: [
        {
          colour: body,
          points: [
            [1.63, -0.8, hipZ + 0.6],
            [1.63, 0.8, hipZ + 0.6],
            [1.63, 0.8, shoulderZ + 0.4],
            [1.63, -0.8, shoulderZ + 0.4],
          ],
        },
      ],
    },
    { name: "belt", faces: box(-1.7, 1.7, -3.2, 3.2, hipZ - 0.6, hipZ + 0.3, shade(suit, 0.7)) },
    { name: "collar", faces: box(-1.0, 1.0, -1.1, 1.1, shoulderZ + 0.6, neckTop, shade(suit, 0.75)) },

    // Arms: the left one hangs down, the right one holds the helmet up.
    { name: "left arm", faces: bar([0, -3.6, shoulderZ], leftHand, 1.9, suit) },
    { name: "left glove", faces: bar([leftHand[0], leftHand[1], leftHand[2] + 0.6], [leftHand[0] + 0.2, leftHand[1] - 0.1, leftHand[2] - 1.0], 2.1, GLOVE) },
    { name: "right upper arm", faces: bar([0, 3.6, shoulderZ], [0.6, 5.0, 11.8], 1.9, suit) },
    { name: "right forearm", faces: bar([0.6, 5.0, 11.8], rightHand, 1.9, suit) },
    { name: "right glove", faces: bar([rightHand[0] - 0.6, rightHand[1], rightHand[2]], [rightHand[0] + 0.8, rightHand[1] + 0.1, rightHand[2]], 2.1, GLOVE) },

    // The helmet, resting on the right hand, its visor towards the front.
    {
      name: "helmet",
      ball: { middle: [rightHand[0] + 0.4, rightHand[1] + 0.6, rightHand[2] + 3.3], radius: 3.05, colour: helmet, stripe, visor: VISOR },
    },

    // The head, with the face on it.
    {
      name: "head",
      head: { middle: [0.2, 0, neckTop + HEAD_RADIUS - 0.5], radius: HEAD_RADIUS, rim: shade(suit, 0.6) },
    },
  ];
}

/** Where the kart and the pilot stand in the scene: the kart behind and to one side, turned a little. */
export const KART_SPOT = Object.freeze({ x: -6, y: -7, turn: 0.55 });
export const PILOT_SPOT = Object.freeze({ x: 4, y: 8, turn: 0 });

/**
 * The whole scene for a character: their kart, empty, with the pilot
 * standing beside it. Gives { parts, shadows }:
 *   parts    every part of the kart and of the pilot, moved to their spots
 *   shadows  [{ x, y, across, along, turn }]: the patches of shadow on the
 *            ground under the kart and under the pilot
 */
export function pilotScene(look) {
  const kart = kartParts(look, 0).filter((part) => !DRIVER_PARTS.includes(part.name));
  return {
    parts: [...kart.map((part) => movePart(part, KART_SPOT)), ...pilotParts(look).map((part) => movePart(part, PILOT_SPOT))],
    shadows: [
      { x: KART_SPOT.x, y: KART_SPOT.y, along: 12.5, across: 9.2, turn: KART_SPOT.turn },
      { x: PILOT_SPOT.x + 0.6, y: PILOT_SPOT.y, along: 4.2, across: 5.2, turn: PILOT_SPOT.turn },
    ],
  };
}

/** A part turned round its upright line by "turn" radians, then moved to (x, y). */
export function movePart(part, { x, y, turn }) {
  const cos = Math.cos(turn);
  const sin = Math.sin(turn);
  const move = ([px, py, pz]) => [x + px * cos - py * sin, y + px * sin + py * cos, pz];
  const moved = { ...part };
  if (part.faces) {
    moved.faces = part.faces.map((face) => ({ ...face, points: face.points.map(move) }));
  }
  if (part.decals) {
    moved.decals = part.decals.map((face) => ({ ...face, points: face.points.map(move) }));
  }
  if (part.ball) {
    moved.ball = { ...part.ball, middle: move(part.ball.middle) };
  }
  if (part.head) {
    moved.head = { ...part.head, middle: move(part.head.middle) };
  }
  return moved;
}
