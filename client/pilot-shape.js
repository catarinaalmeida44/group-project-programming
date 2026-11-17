// A pilot standing beside their kart, with their real face, who can move:
// stand holding the helmet, dance, or put the helmet down and cross arms.
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
// HOW THE PILOT MOVES
// A "pose" says where the hands and elbows are, where the helmet is, and
// how far the body is lifted (a bounce) and moved sideways (a sway).
// poseAt() gives the pose of a movement at a moment in time, and
// blendPoses() goes smoothly from one pose to another. pilotParts() builds
// the pilot in a pose. The feet always stay on the ground.
//
// THE HEAD
// The head is a ball in the colour of the person's hair. The face is an
// oval inside it, a little below the middle, with the photo in it. The
// pictures in client/faces are cut from the hairline to the chin and from
// cheek to cheek, all the same shape, so every face fills its oval.

import { kartParts, box, bar, shade } from "./kart-shape.js";

const SHOE = "#1b1f24";
const GLOVE = "#1b1f24";
const VISOR = "#16202b";

/** How big the head is. A little big for the body, like a toy figure, so the face can be seen. */
export const HEAD_RADIUS = 4.5;

/** The oval of the face inside the head, as shares of the head's radius: how wide, how tall, how far below the middle. */
// The oval has the same shape as the pictures (216 by 252 pixels), so a face is not squeezed.
export const FACE_OVAL = Object.freeze({ across: 0.69, tall: 0.805, below: 0.14 });

/** The parts of the kart that belong to the driver. In the scene the driver stands outside, so these are left out. */
export const DRIVER_PARTS = Object.freeze(["left leg", "right leg", "body", "left arm", "right arm", "left glove", "right glove", "helmet"]);

// The body, standing still, before any bounce or sway.
const HIP_Z = 9.4;
const SHOULDER_Z = 15.8;
const SHOULDER_Y = 3.6;
const NECK_TOP = 17.6;
const ANKLE = 1.2;
const HELMET_RADIUS = 3.05;
/** Where the helmet sits relative to the hand that holds it: resting on top of it. */
const ON_THE_HAND = [0.4, 0.5, HELMET_RADIUS + 0.2];
/** Where the helmet is put down when the pilot crosses arms: on the ground in front of the right foot. */
const ON_THE_GROUND = [6.4, 3.6, HELMET_RADIUS];

/** The kinds of movement poseAt() knows. */
export const MOVES = Object.freeze(["hold", "dance", "crossed"]);

/** How many dance steps (bounces) a second. */
export const DANCE_BEATS_PER_SECOND = 2.2;

/**
 * The pose of a movement at a moment, "seconds" after it began.
 *   "hold"     standing, the left arm down, the helmet on the right hand.
 *              Breathing: the body rises and falls a tiny bit.
 *   "dance"    bouncing on the beat and swaying, pumping the left fist
 *              and lifting the helmet up and down on the right hand
 *   "crossed"  the helmet on the ground, both arms crossed on the chest
 * Gives { lift, sway, leftElbow, leftHand, rightElbow, rightHand, helmet }:
 * the points are where they are in the pilot's own directions, with the
 * lift and the sway already in them.
 */
export function poseAt(move, seconds) {
  const breath = 0.07 * (1 + Math.sin((seconds * Math.PI * 2) / 3.2));
  if (move === "dance") {
    const beat = seconds * Math.PI * 2 * DANCE_BEATS_PER_SECOND;
    const lift = 0.75 * Math.abs(Math.sin(beat / 2)); // up on every beat, never below standing
    const sway = 0.9 * Math.sin(beat / 4); //             side to side, every two beats
    const pump = Math.sin(beat / 2);
    const rightHand = [2.3, 5.1 + sway, 13.6 + lift - 1.8 * pump];
    return withBody(lift, sway, {
      leftElbow: [0.9, -4.5, 13.1],
      leftHand: [2.0, -4.6, 16.0 + 1.6 * pump],
      rightElbow: [0.9, 4.6, 12.6],
      rightHand,
      helmet: plus(rightHand, ON_THE_HAND),
    });
  }
  if (move === "crossed") {
    return withBody(breath, 0, {
      leftElbow: [1.9, -4.1, 12.3],
      leftHand: [2.9, 2.5, 13.5],
      rightElbow: [1.9, 4.1, 12.0],
      rightHand: [3.0, -2.5, 12.9],
      helmet: [...ON_THE_GROUND],
      helmetOnGround: true,
    });
  }
  // "hold", and anything unknown
  const rightHand = [3.4, 5.3, 11.2 + breath];
  return withBody(breath, 0, {
    leftElbow: [0.2, -4.1, 12.4],
    leftHand: [0.5, -4.5, 9.0],
    rightElbow: [0.6, 5.0, 11.8],
    rightHand,
    helmet: plus(rightHand, ON_THE_HAND),
  });
}

/**
 * Moves the arm points of a pose with the body's lift and sway, so the
 * arms go up and sideways with the shoulders. The helmet goes with the
 * hand that holds it, but not when it lies on the ground.
 */
function withBody(lift, sway, arms) {
  const move = ([x, y, z]) => [x, y + sway, z + lift];
  return {
    lift,
    sway,
    leftElbow: move(arms.leftElbow),
    leftHand: move(arms.leftHand),
    rightElbow: move(arms.rightElbow),
    rightHand: move(arms.rightHand),
    helmet: arms.helmetOnGround ? arms.helmet : move(arms.helmet),
  };
}

/** A pose part of the way from "from" to "to": share 0 is "from", share 1 is "to". */
export function blendPoses(from, to, share) {
  const s = Math.min(Math.max(share, 0), 1);
  // At the two ends the pose is exactly that pose, not a near copy with tiny rounding differences.
  if (s === 0) {
    return from;
  }
  if (s === 1) {
    return to;
  }
  const mix = (a, b) => a + (b - a) * s;
  const mixPoint = (a, b) => [mix(a[0], b[0]), mix(a[1], b[1]), mix(a[2], b[2])];
  return {
    lift: mix(from.lift, to.lift),
    sway: mix(from.sway, to.sway),
    leftElbow: mixPoint(from.leftElbow, to.leftElbow),
    leftHand: mixPoint(from.leftHand, to.leftHand),
    rightElbow: mixPoint(from.rightElbow, to.rightElbow),
    rightHand: mixPoint(from.rightHand, to.rightHand),
    helmet: mixPoint(from.helmet, to.helmet),
  };
}

/** How long the chosen pilot dances before putting the helmet down, and how long crossing the arms takes, in seconds. */
export const CHOSEN_DANCE_SECONDS = 1.8;
export const CROSSING_SECONDS = 0.5;
/** How long a pilot takes to start or stop dancing when the mouse arrives or leaves, in seconds. */
export const START_DANCING_SECONDS = 0.25;

/**
 * The pose of the pilot who has just been chosen, "seconds" after the
 * choice: a short dance, then the helmet goes down and the arms cross,
 * and they stay like that.
 */
export function chosenPose(seconds) {
  const t = Math.max(0, seconds);
  if (t < CHOSEN_DANCE_SECONDS) {
    return blendPoses(poseAt("hold", t), poseAt("dance", t), easeInOut(t / START_DANCING_SECONDS));
  }
  const crossing = easeInOut((t - CHOSEN_DANCE_SECONDS) / CROSSING_SECONDS);
  return blendPoses(poseAt("dance", t), poseAt("crossed", t), crossing);
}

/**
 * The pose of a pilot on a small card. "dancing" goes from 0 (standing,
 * holding the helmet) to 1 (dancing): the card raises it while the mouse
 * is over it and lowers it when the mouse leaves, so the dance starts and
 * stops smoothly.
 */
export function cardPose(seconds, dancing) {
  return blendPoses(poseAt("hold", seconds), poseAt("dance", seconds), easeInOut(dancing));
}

/** A smooth start and a smooth stop for a share from 0 to 1, so a change of pose does not jerk. */
export function easeInOut(share) {
  const s = Math.min(Math.max(share, 0), 1);
  return s * s * (3 - 2 * s);
}

/**
 * A pilot standing on the ground, looking forwards (along x), in a pose.
 * Gives a list of parts, as kartParts() in kart-shape.js does, plus one
 * part with a "head":
 *   { name: "head", head: { middle, radius, hair } }
 * which kart-paint.js paints as a ball of hair with the face in it.
 *   look  the colours of the character (kart-shape.js): the suit, the
 *         helmet with its stripe, and the kart's colour for the stripe on
 *         the suit
 *   hair  the colour of the hair, such as "#2b2420"
 *   pose  from poseAt() or blendPoses(). Left out: standing, holding the helmet
 */
export function pilotParts(look, hair = "#2b2420", pose = poseAt("hold", 0)) {
  const { body, suit, helmet, stripe } = look;
  const { lift, sway } = pose;
  const up = (z) => z + lift;
  const suitLight = shade(suit, 1.08);
  const hipZ = up(HIP_Z);
  const shoulderZ = up(SHOULDER_Z);
  const hipSway = sway * 0.5; // the hips move less than the shoulders
  const leftShoulder = [0, -SHOULDER_Y + sway, shoulderZ];
  const rightShoulder = [0, SHOULDER_Y + sway, shoulderZ];
  const { leftElbow, leftHand, rightElbow, rightHand } = pose;

  return [
    // Shoes stay on the ground; the legs reach from them up to the hips.
    { name: "left shoe", faces: box(-1.0, 2.8, -3.1, -0.8, 0, 1.3, SHOE) },
    { name: "right shoe", faces: box(-1.0, 2.8, 0.8, 3.1, 0, 1.3, SHOE) },
    { name: "left leg", faces: bar([0, -1.7 + hipSway, hipZ], [0.3, -1.95, ANKLE], 2.1, shade(suit, 0.92)) },
    { name: "right leg", faces: bar([0, 1.7 + hipSway, hipZ], [0.3, 1.95, ANKLE], 2.1, shade(suit, 0.92)) },

    // The body of the racing suit, with a stripe down the front in the
    // kart's colour, a belt and a collar.
    {
      name: "suit",
      faces: box(-1.6, 1.6, -3.1 + sway, 3.1 + sway, hipZ - 0.6, shoulderZ + 0.6, suit, suitLight),
      decals: [
        {
          colour: body,
          points: [
            [1.63, -0.8 + sway, hipZ + 0.6],
            [1.63, 0.8 + sway, hipZ + 0.6],
            [1.63, 0.8 + sway, shoulderZ + 0.4],
            [1.63, -0.8 + sway, shoulderZ + 0.4],
          ],
        },
      ],
    },
    { name: "belt", faces: box(-1.7, 1.7, -3.2 + sway, 3.2 + sway, hipZ - 0.6, hipZ + 0.3, shade(suit, 0.7)) },
    { name: "collar", faces: box(-1.0, 1.0, -1.1 + sway, 1.1 + sway, shoulderZ + 0.6, up(NECK_TOP), shade(suit, 0.75)) },

    // Arms, each an upper arm and a forearm, and gloves.
    { name: "left upper arm", faces: bar(leftShoulder, leftElbow, 1.9, suit) },
    { name: "left forearm", faces: bar(leftElbow, leftHand, 1.8, suit) },
    { name: "left glove", faces: bar(towards(leftHand, leftElbow, 0.5), towards(leftHand, leftElbow, -1.0), 2.1, GLOVE) },
    { name: "right upper arm", faces: bar(rightShoulder, rightElbow, 1.9, suit) },
    { name: "right forearm", faces: bar(rightElbow, rightHand, 1.8, suit) },
    { name: "right glove", faces: bar(towards(rightHand, rightElbow, 0.5), towards(rightHand, rightElbow, -1.0), 2.1, GLOVE) },

    // The helmet: on the right hand, or on the ground.
    {
      name: "helmet",
      ball: { middle: [...pose.helmet], radius: HELMET_RADIUS, colour: helmet, stripe, visor: VISOR },
    },

    // The head: hair all round, the face in it.
    {
      name: "head",
      head: { middle: [0.2, sway, up(NECK_TOP) + HEAD_RADIUS - 0.7], radius: HEAD_RADIUS, hair },
    },
  ];
}

/** Where the kart and the pilot stand in the scene: the kart behind and to one side, turned a little. */
export const KART_SPOT = Object.freeze({ x: -6, y: -7, turn: 0.55 });
export const PILOT_SPOT = Object.freeze({ x: 4, y: 8, turn: 0 });

/** The empty kart of a look: the kart without the seated driver. */
export function emptyKartParts(look) {
  return kartParts(look, 0).filter((part) => !DRIVER_PARTS.includes(part.name));
}

/**
 * The whole scene for a character: their kart, empty, with the pilot
 * standing beside it in a pose. Gives { kart, pilot, shadows }:
 *   kart     the parts of the kart, moved to its spot
 *   pilot    the parts of the pilot, moved to their spot
 *   shadows  [{ x, y, across, along, turn }]: the patches of shadow on the
 *            ground under the kart and under the pilot
 */
export function pilotScene(look, hair, pose) {
  return {
    kart: emptyKartParts(look).map((part) => movePart(part, KART_SPOT)),
    pilot: pilotParts(look, hair, pose).map((part) => movePart(part, PILOT_SPOT)),
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

function plus(a, b) {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}

/** The point "distance" units from "from" towards "to". A distance below zero goes the other way, away from "to". */
function towards(from, to, distance) {
  const along = [to[0] - from[0], to[1] - from[1], to[2] - from[2]];
  const length = Math.hypot(...along) || 1;
  return [from[0] + (along[0] / length) * distance, from[1] + (along[1] / length) * distance, from[2] + (along[2] / length) * distance];
}
