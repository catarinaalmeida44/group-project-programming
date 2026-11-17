// A pilot standing beside their kart, with their own real head from the
// photo, who can move: stand, dance their own dance, or cross arms.
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
// THE HEAD
// The head is the person's own head, cut out of their photo (the pictures
// in client/heads: hair, face and ears, with the background made
// see-through). It is painted straight on, like a cut-out. When the pilot
// spins round, the back of the head is painted in the colour of the hair.
//
// HOW THE PILOT MOVES
// A "pose" says where the hands go and which way the elbows bend, how far
// the body bounces up and sways, leans, jumps and spins, and how far apart
// the feet are. poseAt() gives the pose of a movement at a moment in time.
// blendPoses() goes smoothly from one pose to another. The arms keep their
// length: the elbow is worked out from the shoulder and the hand, as a
// real arm bends ("armWith"). A hand that is out of reach is pulled in, so
// the arm is straight.

import { kartParts, box, bar, shade } from "./kart-shape.js";

const SHOE = "#1b1f24";
const GLOVE = "#1b1f24";
const VISOR = "#16202b";
const WHEEL = "#3a4450";

/** How tall the head picture is painted, from the chin to the top of the hair. A little big, like a toy figure, so the face can be seen. */
export const HEAD_HEIGHT = 9.6;

/** The parts of the kart that belong to the driver. In the scene the driver stands outside, so these are left out. */
export const DRIVER_PARTS = Object.freeze(["left leg", "right leg", "body", "left arm", "right arm", "left glove", "right glove", "helmet"]);

// The body, standing still.
const HIP_Z = 9.4;
const SHOULDER_Z = 15.8;
const SHOULDER_Y = 3.6;
const NECK_TOP = 17.6;
const ANKLE = 1.2;
const FOOT_Y = 1.95;
const HELMET_RADIUS = 3.05;
/** The length of the upper arm and of the forearm. */
export const UPPER_ARM = 4.3;
export const FOREARM = 4.0;
/** Where the helmet lies: on the ground beside the pilot's right foot. */
export const HELMET_SPOT = Object.freeze([1.6, 7.4, HELMET_RADIUS]);

/** The dances, one for each character (see danceOf in cast-choice.js). */
export const DANCES = Object.freeze(["clap", "robot", "drive", "wave", "plane", "siu"]);
/** Every movement poseAt() knows: standing, arms crossed, and the dances. */
export const MOVES = Object.freeze(["stand", "crossed", ...DANCES]);

/** How long one round of the "siu" takes: a run, a jump with a spin, the landing, and back to standing. */
export const SIU_SECONDS = 3.4;

const TURN = Math.PI * 2;

/** A pose with nothing moving: every number at zero. The hands and elbows are filled in by each movement. */
function still(pose) {
  return { lift: 0, sway: 0, lean: 0, jump: 0, spin: 0, feetApart: 0, wheel: 0, ...pose };
}

/** The pose of standing: the left hand on the hip, the right arm down, breathing a little. */
function stand(seconds) {
  return still({
    lift: 0.07 * (1 + Math.sin((seconds * TURN) / 3.2)),
    leftHand: [0.9, -3.7, 10.3],
    leftBend: [-0.5, -1, 0.3],
    rightHand: [0.4, 4.6, 8.7],
    rightBend: [-1, 0.3, 0],
  });
}

/**
 * The pose of a movement at a moment, "seconds" after it began.
 *   "stand"    the left hand on the hip, breathing
 *   "crossed"  both arms crossed on the chest
 *   "clap"     clapping on the beat, bouncing (Dean)
 *   "robot"    stiff robot arms, turning in steps (Professor Ricardo Pereira)
 *   "drive"    pretending to drive: hands on a wheel, leaning into the bends (Ró Versos)
 *   "wave"     both arms up, waving from side to side (Cici Boss)
 *   "plane"    arms out like the wings of a plane, banking left and right (FranFon)
 *   "siu"      a little run, a jump with a full turn, and landing with the
 *              arms spread down and the feet apart (PCP)
 * Anything else is standing.
 */
export function poseAt(move, seconds) {
  const t = seconds;
  switch (move) {
    case "crossed":
      return still({
        lift: stand(t).lift,
        leftHand: [2.9, 2.4, 13.4],
        leftBend: [0.2, -1, -0.4],
        rightHand: [3.0, -2.4, 12.9],
        rightBend: [0.2, 1, -0.4],
      });
    case "clap": {
      const beats = t * 2.2;
      const open = 0.5 * (1 + Math.cos(beats * TURN)); // 0 when the hands meet, on every beat
      return still({
        lift: 0.6 * Math.abs(Math.sin(beats * Math.PI)),
        sway: 0.6 * Math.sin((beats * Math.PI) / 2),
        leftHand: [4.4, -(0.45 + 2.6 * open), 13.6],
        leftBend: [0, -1, -1],
        rightHand: [4.4, 0.45 + 2.6 * open, 13.6],
        rightBend: [0, 1, -1],
      });
    }
    case "robot": {
      // Stiff moves: every 0.4 seconds the arms swap, quickly, then hold.
      const step = Math.floor(t / 0.4);
      const share = easeInOut((t - step * 0.4) / 0.14);
      const up = [1.2, 4.7, 19.6];
      const ahead = [5.9, 3.9, 12.6];
      const flip = ([x, y, z]) => [x, -y, z];
      const a = step % 2 === 0 ? { left: flip(up), right: ahead } : { left: flip(ahead), right: up };
      const b = step % 2 === 0 ? { left: flip(ahead), right: up } : { left: flip(up), right: ahead };
      const turnA = step % 2 === 0 ? 0.22 : -0.22;
      return still({
        spin: turnA + (-turnA - turnA) * share,
        leftHand: mixPoint(a.left, b.left, share),
        leftBend: [0, -0.4, -1],
        rightHand: mixPoint(a.right, b.right, share),
        rightBend: [0, 0.4, -1],
      });
    }
    case "drive": {
      // Hands on a wheel in front of the chest, turning it; leaning into the bend; the road is bumpy.
      const steer = 0.9 * Math.sin(t * 2.4) + 0.25 * Math.sin(t * 6.1);
      const r = 2.3;
      const middle = [5.2, 0, 13.6];
      return still({
        lift: 0.22 * Math.abs(Math.sin(t * 9)),
        lean: -0.16 * Math.sin(t * 2.4),
        feetApart: 0.6,
        wheel: 1, // a steering wheel between the hands, so it is clear what the pilot pretends
        leftHand: [middle[0], middle[1] - r * Math.cos(steer), middle[2] - r * Math.sin(steer)],
        leftBend: [0, -1, -1],
        rightHand: [middle[0], middle[1] + r * Math.cos(steer), middle[2] + r * Math.sin(steer)],
        rightBend: [0, 1, -1],
      });
    }
    case "wave": {
      const wave = Math.sin(t * TURN * 0.9);
      return still({
        lift: 0.4 * Math.abs(Math.sin(t * TURN * 0.9)),
        sway: 0.9 * wave,
        lean: 0.1 * wave,
        leftHand: [0.6, -5.6 + 1.8 * wave, 22.4],
        leftBend: [0, -1, 0],
        rightHand: [0.6, 5.6 + 1.8 * wave, 22.4],
        rightBend: [0, 1, 0],
      });
    }
    case "plane":
      return still({
        lift: 0.3 * Math.abs(Math.sin(t * 3.4)),
        sway: 0.5 * Math.sin(t * 1.7),
        lean: 0.35 * Math.sin(t * 1.7),
        spin: 0.3 * Math.sin(t * 0.85),
        leftHand: [0.8, -12, 15.4], // out of reach on purpose: the arm is straight
        leftBend: [-1, 0, 0],
        rightHand: [0.8, 12, 15.4],
        rightBend: [-1, 0, 0],
      });
    case "siu":
      return siuAt(t);
    default:
      return stand(t);
  }
}

/** The famous jump and landing, in four parts, each flowing into the next. */
function siuAt(seconds) {
  const u = ((seconds % SIU_SECONDS) + SIU_SECONDS) % SIU_SECONDS;
  const run = (time) => {
    const pump = Math.sin(time * TURN * 2.5);
    return still({
      lift: 0.6 * Math.abs(pump),
      leftHand: [2.8, -4.2, 13 + 1.6 * pump],
      leftBend: [-1, 0, -0.3],
      rightHand: [2.8, 4.2, 13 - 1.6 * pump],
      rightBend: [-1, 0, -0.3],
    });
  };
  const flying = (share) =>
    still({
      jump: 4.2 * Math.sin(Math.PI * share),
      spin: share >= 1 ? 0 : TURN * easeInOut(share), // a whole turn; at the end it faces the front again
      feetApart: 0.3,
      leftHand: [1.0, -5.2, 21.2],
      leftBend: [0, -1, 0],
      rightHand: [1.0, 5.2, 21.2],
      rightBend: [0, 1, 0],
    });
  const landed = still({
    feetApart: 2.2,
    leftHand: [1.4, -9.2, 10.4],
    leftBend: [0, -0.4, 1],
    rightHand: [1.4, 9.2, 10.4],
    rightBend: [0, 0.4, 1],
  });
  if (u < 0.9) {
    return blendPoses(stand(seconds), run(u), easeInOut(u / 0.2));
  }
  if (u < 1.65) {
    const share = (u - 0.9) / 0.75;
    return blendPoses(run(0.9), flying(share), easeInOut(share / 0.4));
  }
  if (u < 2.75) {
    return blendPoses(flying(1), landed, easeInOut((u - 1.65) / 0.3));
  }
  return blendPoses(landed, stand(seconds), easeInOut((u - 2.75) / 0.65));
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
  return {
    lift: mix(from.lift, to.lift),
    sway: mix(from.sway, to.sway),
    lean: mix(from.lean, to.lean),
    jump: mix(from.jump, to.jump),
    spin: mix(from.spin, to.spin),
    feetApart: mix(from.feetApart, to.feetApart),
    wheel: mix(from.wheel, to.wheel),
    leftHand: mixPoint(from.leftHand, to.leftHand, s),
    leftBend: mixPoint(from.leftBend, to.leftBend, s),
    rightHand: mixPoint(from.rightHand, to.rightHand, s),
    rightBend: mixPoint(from.rightBend, to.rightBend, s),
  };
}

/** A smooth start and a smooth stop for a share from 0 to 1, so a change of pose does not jerk. */
export function easeInOut(share) {
  const s = Math.min(Math.max(share, 0), 1);
  return s * s * (3 - 2 * s);
}

/** How long the chosen pilot dances, crosses arms, holds, and starts again. In seconds. */
export const CHOSEN_TIMES = Object.freeze({ dance: SIU_SECONDS, cross: 0.5, hold: 2.4, uncross: 0.5 });

/**
 * The pose of the chosen pilot, shown big, "seconds" after the choice:
 * their own dance, then arms crossed for a moment, then the dance again,
 * round and round.
 */
export function chosenPose(dance, seconds) {
  const { dance: dancing, cross, hold, uncross } = CHOSEN_TIMES;
  const round = dancing + cross + hold + uncross;
  const t = Math.max(0, seconds);
  const u = t % round;
  const start = t - u; // when this round began
  if (u < dancing) {
    return poseAt(dance, u);
  }
  if (u < dancing + cross) {
    return blendPoses(poseAt(dance, dancing), poseAt("crossed", t), easeInOut((u - dancing) / cross));
  }
  if (u < dancing + cross + hold) {
    return poseAt("crossed", t);
  }
  // Uncrossing flows into the start of the next round of the dance.
  return blendPoses(poseAt("crossed", t), poseAt(dance, 0), easeInOut((u - dancing - cross - hold) / uncross));
}

/**
 * The pose of a pilot on a small card. "dancing" goes from 0 (standing) to
 * 1 (dancing their own dance): the card raises it while the mouse is over
 * it and lowers it when the mouse leaves, so the dance starts and stops
 * smoothly.
 */
export function cardPose(dance, seconds, dancing) {
  return blendPoses(poseAt("stand", seconds), poseAt(dance, seconds), easeInOut(dancing));
}

/**
 * An arm that keeps its length: from the shoulder to the hand, bending at
 * the elbow towards "bend". Gives { elbow, hand }. A hand out of reach is
 * pulled in along the same line, so the arm is straight; a hand too close
 * is pushed out a little.
 */
export function armWith(shoulder, hand, bend) {
  const reach = UPPER_ARM + FOREARM - 0.01;
  const shortest = Math.abs(UPPER_ARM - FOREARM) + 0.01;
  let along = minus(hand, shoulder);
  let length = Math.hypot(...along);
  if (length === 0) {
    along = [0, 0, -1];
    length = 1;
  }
  const unit = along.map((value) => value / length);
  const used = Math.min(Math.max(length, shortest), reach);
  const reached = plus(shoulder, unit.map((value) => value * used));
  // How far along the line the elbow is, and how far out from it (the sums of a triangle with three known sides).
  const a = (UPPER_ARM ** 2 - FOREARM ** 2 + used ** 2) / (2 * used);
  const out = Math.sqrt(Math.max(0, UPPER_ARM ** 2 - a ** 2));
  // The bend direction, made square to the arm's line.
  const dot = bend[0] * unit[0] + bend[1] * unit[1] + bend[2] * unit[2];
  let side = minus(bend, unit.map((value) => value * dot));
  let sideLength = Math.hypot(...side);
  if (sideLength < 1e-6) {
    side = Math.abs(unit[2]) < 0.9 ? [0, 0, -1] : [-1, 0, 0];
    sideLength = 1;
  }
  const elbow = plus(shoulder, plus(unit.map((value) => value * a), side.map((value) => (value / sideLength) * out)));
  return { elbow, hand: reached };
}

/**
 * A pilot standing on the ground, looking forwards (along x), in a pose.
 * Gives a list of parts, as kartParts() in kart-shape.js does, plus one
 * part with a "head":
 *   { name: "head", head: { middle, height, hair, facing } }
 * "facing" is the direction the face looks, which turns with the pilot.
 * kart-paint.js paints the head picture there.
 *   look  the colours of the character (kart-shape.js): the suit, the
 *         helmet with its stripe, and the kart's colour for the stripe on
 *         the suit
 *   hair  the colour of the hair, for the back of the head
 *   pose  from poseAt() or blendPoses(). Left out: standing
 */
export function pilotParts(look, hair = "#2b2420", pose = poseAt("stand", 0)) {
  const { body, suit, helmet, stripe } = look;
  const { lift, sway, lean, jump, spin, feetApart } = pose;
  const suitLight = shade(suit, 1.08);
  const hipZ = HIP_Z + lift;
  const shoulderZ = SHOULDER_Z + lift;
  const neckTop = NECK_TOP + lift;
  const hip = [0, sway * 0.5, hipZ];

  // Lean: the upper body tips sideways round the hips. Then the whole
  // pilot spins round their upright line and jumps.
  const leanCos = Math.cos(lean);
  const leanSin = Math.sin(lean);
  const leanPoint = ([x, y, z]) => {
    const dy = y - hip[1];
    const dz = z - hip[2];
    return [x, hip[1] + dy * leanCos + dz * leanSin, hip[2] - dy * leanSin + dz * leanCos];
  };
  const spinCos = Math.cos(spin);
  const spinSin = Math.sin(spin);
  const spinJump = ([x, y, z]) => [x * spinCos - y * spinSin, x * spinSin + y * spinCos, z + jump];
  const upper = (point) => spinJump(leanPoint(point));
  const lower = spinJump;

  const leftShoulder = [0, -SHOULDER_Y + sway, shoulderZ];
  const rightShoulder = [0, SHOULDER_Y + sway, shoulderZ];
  const moveHand = ([x, y, z]) => [x, y + sway, z + lift];
  const left = armWith(leftShoulder, moveHand(pose.leftHand), pose.leftBend);
  const right = armWith(rightShoulder, moveHand(pose.rightHand), pose.rightBend);
  const leftFoot = [0.3, -(FOOT_Y + feetApart), ANKLE];
  const rightFoot = [0.3, FOOT_Y + feetApart, ANKLE];

  const upperParts = [
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
    { name: "collar", faces: box(-1.0, 1.0, -1.1 + sway, 1.1 + sway, shoulderZ + 0.6, neckTop, shade(suit, 0.75)) },
    // Arms and gloves.
    { name: "left upper arm", faces: bar(leftShoulder, left.elbow, 1.9, suit) },
    { name: "left forearm", faces: bar(left.elbow, left.hand, 1.8, suit) },
    { name: "left glove", faces: bar(towards(left.hand, left.elbow, 0.5), towards(left.hand, left.elbow, -1.0), 2.1, GLOVE) },
    { name: "right upper arm", faces: bar(rightShoulder, right.elbow, 1.9, suit) },
    { name: "right forearm", faces: bar(right.elbow, right.hand, 1.8, suit) },
    { name: "right glove", faces: bar(towards(right.hand, right.elbow, 0.5), towards(right.hand, right.elbow, -1.0), 2.1, GLOVE) },
    // The steering wheel of the "drive" dance: a ring held by both hands, with a bar across.
    ...(pose.wheel > 0.5 ? steeringWheel(left.hand, right.hand) : []),
  ].map((part) => mapPart(part, upper));

  const lowerParts = [
    // Shoes and legs: the legs reach from the feet up to the hips.
    { name: "left shoe", faces: box(-1.0, 2.8, leftFoot[1] - 1.15, leftFoot[1] + 1.15, 0, 1.3, SHOE) },
    { name: "right shoe", faces: box(-1.0, 2.8, rightFoot[1] - 1.15, rightFoot[1] + 1.15, 0, 1.3, SHOE) },
    { name: "left leg", faces: bar([0, -1.7 + hip[1], hipZ], leftFoot, 2.1, shade(suit, 0.92)) },
    { name: "right leg", faces: bar([0, 1.7 + hip[1], hipZ], rightFoot, 2.1, shade(suit, 0.92)) },
  ].map((part) => mapPart(part, lower));

  // The head sits on the collar, and turns with the body.
  const headMiddle = upper([0.2, sway, neckTop + HEAD_HEIGHT / 2 - 0.9]);
  const facingTip = upper([1.2, sway, neckTop + HEAD_HEIGHT / 2 - 0.9]);
  const facing = minus(facingTip, headMiddle);

  return [
    ...lowerParts,
    ...upperParts,
    // The helmet lies on the ground, in front of the pilot.
    { name: "helmet", ball: { middle: [...HELMET_SPOT], radius: HELMET_RADIUS, colour: helmet, stripe, visor: VISOR } },
    { name: "head", head: { middle: headMiddle, height: HEAD_HEIGHT, hair, facing } },
  ];
}

/**
 * A steering wheel held by two hands: a ring through both hands, standing
 * upright in front of the pilot, with a bar from one hand to the other, so
 * it can be seen turning.
 */
export function steeringWheel(leftHand, rightHand) {
  const middle = mixPoint(leftHand, rightHand, 0.5);
  const half = minus(rightHand, middle);
  const radius = Math.hypot(half[1], half[2]) || 1;
  const sides = 12;
  const ring = [];
  for (let i = 0; i < sides; i++) {
    const a = (i / sides) * TURN;
    const b = ((i + 1) / sides) * TURN;
    const at = (angle) => [middle[0], middle[1] + Math.cos(angle) * radius, middle[2] + Math.sin(angle) * radius];
    ring.push(...bar(at(a), at(b), 0.75, WHEEL));
  }
  return [
    { name: "steering wheel", faces: ring },
    { name: "steering wheel bar", faces: bar(leftHand, rightHand, 0.6, WHEEL) },
  ];
}

/** Where the kart and the pilot stand in the scene: the kart behind and to one side, turned a little. */
export const KART_SPOT = Object.freeze({ x: -6, y: -7, turn: 0.55 });
export const PILOT_SPOT = Object.freeze({ x: 4, y: 8, turn: 0 });
/** Where the pilot stands when shown alone, without the kart (on the cards). */
export const ALONE_SPOT = Object.freeze({ x: 0, y: 0, turn: 0 });

/** The empty kart of a look: the kart without the seated driver. */
export function emptyKartParts(look) {
  return kartParts(look, 0).filter((part) => !DRIVER_PARTS.includes(part.name));
}

/**
 * A scene for a character. Gives { kart, pilot, shadows }:
 *   kart     the parts of the empty kart, moved to its spot, or none when "withKart" is false
 *   pilot    the parts of the pilot, moved to their spot
 *   shadows  [{ x, y, across, along, turn }]: the patches of shadow on the ground
 */
export function pilotScene(look, hair, pose, withKart = true) {
  const spot = withKart ? PILOT_SPOT : ALONE_SPOT;
  const shadows = [{ x: spot.x + 0.6, y: spot.y, along: 4.4, across: 5.4 + (pose?.feetApart ?? 0), turn: 0 }];
  if (withKart) {
    shadows.unshift({ x: KART_SPOT.x, y: KART_SPOT.y, along: 12.5, across: 9.2, turn: KART_SPOT.turn });
  }
  return {
    kart: withKart ? emptyKartParts(look).map((part) => movePart(part, KART_SPOT)) : [],
    pilot: pilotParts(look, hair, pose).map((part) => movePart(part, spot)),
    shadows,
  };
}

/** A part turned round its upright line by "turn" radians, then moved to (x, y). */
export function movePart(part, { x, y, turn }) {
  const cos = Math.cos(turn);
  const sin = Math.sin(turn);
  const moved = mapPart(part, ([px, py, pz]) => [x + px * cos - py * sin, y + px * sin + py * cos, pz]);
  if (part.head) {
    const [fx, fy, fz] = part.head.facing;
    moved.head.facing = [fx * cos - fy * sin, fx * sin + fy * cos, fz];
  }
  return moved;
}

/** A part with every point moved by "move": its corners, the middle of a ball or a head. */
function mapPart(part, move) {
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

function minus(a, b) {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

function mixPoint(a, b, share) {
  return [a[0] + (b[0] - a[0]) * share, a[1] + (b[1] - a[1]) * share, a[2] + (b[2] - a[2]) * share];
}

/** The point "distance" units from "from" towards "to". A distance below zero goes the other way, away from "to". */
function towards(from, to, distance) {
  const along = minus(to, from);
  const length = Math.hypot(...along) || 1;
  return [from[0] + (along[0] / length) * distance, from[1] + (along[1] / length) * distance, from[2] + (along[2] / length) * distance];
}
